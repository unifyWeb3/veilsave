// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {FHE, ebool, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC7984Receiver} from "@openzeppelin/confidential-contracts/interfaces/IERC7984Receiver.sol";
import {FHESafeMath} from "@openzeppelin/confidential-contracts/utils/FHESafeMath.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";
import {ERC7984ERC20Wrapper} from "@openzeppelin/confidential-contracts/token/ERC7984/extensions/ERC7984ERC20Wrapper.sol";

contract WithdrawalPublicAsset is ERC20 {
    constructor() ERC20("Withdrawal Test Dollar", "wUSD") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract WithdrawalConfidentialToken is ERC7984ERC20Wrapper, ZamaEthereumConfig {
    constructor(IERC20 underlying_)
        ERC7984("Withdrawal Confidential Dollar", "wcUSD", "")
        ERC7984ERC20Wrapper(underlying_)
    {}
}

contract RetryableYieldVault is ERC4626 {
    bool public withdrawalsPaused;

    constructor(IERC20 asset_) ERC20("Retryable Strategy Share", "rSS") ERC4626(asset_) {}

    function setWithdrawalsPaused(bool paused) external {
        withdrawalsPaused = paused;
    }

    function maxWithdraw(address owner) public view override returns (uint256) {
        return withdrawalsPaused ? 0 : super.maxWithdraw(owner);
    }

    function maxRedeem(address owner) public view override returns (uint256) {
        return withdrawalsPaused ? 0 : super.maxRedeem(owner);
    }
}

/// @notice Disposable state machine for confidential immediate and queued principal exits.
contract WithdrawalSettlementSpike is IERC7984Receiver, ZamaEthereumConfig {
    using SafeERC20 for IERC20;

    uint8 private constant PRINCIPAL_DEPOSIT = 0;
    uint8 private constant PRIZE_DEPOSIT = 1;

    WithdrawalConfidentialToken public immutable token;
    IERC20 public immutable publicAsset;
    RetryableYieldVault public immutable strategy;
    address public immutable controller;

    mapping(address account => euint64 amount) private _principal;
    mapping(address account => euint64 amount) private _drawWeight;
    mapping(address account => euint64 amount) private _queued;
    euint64 private _principalLiquidity;
    euint64 private _prizeReserve;
    euint64 private _totalQueued;
    euint64 private _claimLiquidity;
    euint64 private _activeSettlementAmount;

    bytes32 public activeInvestmentRequestId;
    uint256 public strategyShares;
    bool public depositsPaused;

    error UnauthorizedToken(address caller);
    error UnauthorizedController(address caller);
    error ActiveInvestment();
    error NoActiveInvestment();
    error ActiveSettlement();
    error NoActiveSettlement();
    error InvalidSettlementCap();

    event PrincipalDeposited(address indexed account, euint64 actualAmount);
    event PrizeDeposited(address indexed account, euint64 actualAmount);
    event WithdrawalRequested(address indexed account, euint64 immediateAmount, euint64 queuedAmount);
    event InvestmentDispatched(bytes32 indexed unwrapRequestId, euint64 aggregateAmount);
    event InvestmentFinalized(bytes32 indexed unwrapRequestId, uint64 clearAmount, uint256 shares);
    event SettlementStarted(euint64 aggregateAmount, uint64 publicCap);
    event SettlementFinalized(uint64 clearAmount, uint256 sharesSpent, euint64 confidentialLiquidity);
    event ClaimProcessed(address indexed account, euint64 amount);

    modifier onlyController() {
        if (msg.sender != controller) revert UnauthorizedController(msg.sender);
        _;
    }

    constructor(
        WithdrawalConfidentialToken token_,
        IERC20 publicAsset_,
        RetryableYieldVault strategy_
    ) {
        token = token_;
        publicAsset = publicAsset_;
        strategy = strategy_;
        controller = msg.sender;
        publicAsset_.forceApprove(address(strategy_), type(uint256).max);
        publicAsset_.forceApprove(address(token_), type(uint256).max);
    }

    function principal(address account) external view returns (euint64) {
        return _principal[account];
    }

    function drawWeight(address account) external view returns (euint64) {
        return _drawWeight[account];
    }

    function queued(address account) external view returns (euint64) {
        return _queued[account];
    }

    function principalLiquidity() external view returns (euint64) {
        return _principalLiquidity;
    }

    function prizeReserve() external view returns (euint64) {
        return _prizeReserve;
    }

    function totalQueued() external view returns (euint64) {
        return _totalQueued;
    }

    function claimLiquidity() external view returns (euint64) {
        return _claimLiquidity;
    }

    function activeSettlementAmount() external view returns (euint64) {
        return _activeSettlementAmount;
    }

    function setDepositsPaused(bool paused) external onlyController {
        depositsPaused = paused;
    }

    function onConfidentialTransferReceived(
        address,
        address from,
        euint64 amount,
        bytes calldata data
    ) external returns (ebool) {
        if (msg.sender != address(token)) revert UnauthorizedToken(msg.sender);
        uint8 depositKind = data.length == 0 ? PRINCIPAL_DEPOSIT : abi.decode(data, (uint8));
        if (depositKind == PRINCIPAL_DEPOSIT && depositsPaused) return _returnDecision(false);
        if (depositKind == PRIZE_DEPOSIT) return _accountPrize(from, amount);
        return _accountPrincipal(from, amount);
    }

    function requestWithdrawal(externalEuint64 requestedInput, bytes calldata inputProof) external {
        euint64 requested = FHE.fromExternal(requestedInput, inputProof);
        euint64 currentPrincipal = _normalized(_principal[msg.sender]);
        euint64 currentWeight = _normalized(_drawWeight[msg.sender]);
        euint64 currentLiquidity = _normalized(_principalLiquidity);
        euint64 currentQueue = _normalized(_queued[msg.sender]);
        euint64 currentTotalQueued = _normalized(_totalQueued);

        euint64 allowed = FHE.min(requested, currentPrincipal);
        euint64 immediate = FHE.min(allowed, currentLiquidity);
        FHE.allowTransient(immediate, address(token));
        euint64 sent = token.confidentialTransfer(msg.sender, immediate);
        euint64 remaining = FHE.sub(allowed, sent);

        euint64 nextPrincipal = FHE.sub(currentPrincipal, allowed);
        euint64 weightReduction = FHE.min(allowed, currentWeight);
        euint64 nextWeight = FHE.sub(currentWeight, weightReduction);
        euint64 nextLiquidity = FHE.sub(currentLiquidity, sent);
        euint64 nextQueue = FHE.add(currentQueue, remaining);
        euint64 nextTotalQueued = FHE.add(currentTotalQueued, remaining);

        _storeUserValue(nextPrincipal, msg.sender);
        _storeUserValue(nextWeight, msg.sender);
        _storeUserValue(nextQueue, msg.sender);
        FHE.allowThis(nextLiquidity);
        FHE.allowThis(nextTotalQueued);
        _principal[msg.sender] = nextPrincipal;
        _drawWeight[msg.sender] = nextWeight;
        _queued[msg.sender] = nextQueue;
        _principalLiquidity = nextLiquidity;
        _totalQueued = nextTotalQueued;

        emit WithdrawalRequested(msg.sender, sent, remaining);
    }

    function dispatchAllPrincipalLiquidity() external returns (bytes32 requestId) {
        if (activeInvestmentRequestId != bytes32(0)) revert ActiveInvestment();
        euint64 amount = _normalized(_principalLiquidity);
        FHE.allowTransient(amount, address(token));
        requestId = token.unwrap(address(this), address(this), amount);
        activeInvestmentRequestId = requestId;
        _principalLiquidity = FHE.asEuint64(0);
        FHE.allowThis(_principalLiquidity);
        emit InvestmentDispatched(requestId, amount);
    }

    function finalizeInvestment(uint64 clearAmount, bytes calldata proof) external returns (uint256 shares) {
        bytes32 requestId = activeInvestmentRequestId;
        if (requestId == bytes32(0)) revert NoActiveInvestment();
        token.finalizeUnwrap(requestId, clearAmount, proof);
        shares = strategy.deposit(uint256(clearAmount) * token.rate(), address(this));
        strategyShares += shares;
        activeInvestmentRequestId = bytes32(0);
        emit InvestmentFinalized(requestId, clearAmount, shares);
    }

    function startSettlement(uint64 publicCap) external {
        if (publicCap == 0) revert InvalidSettlementCap();
        if (FHE.isInitialized(_activeSettlementAmount)) revert ActiveSettlement();
        euint64 settlement = FHE.min(_normalized(_totalQueued), FHE.asEuint64(publicCap));
        FHE.allowThis(settlement);
        FHE.makePubliclyDecryptable(settlement);
        _activeSettlementAmount = settlement;
        emit SettlementStarted(settlement, publicCap);
    }

    function finalizeSettlement(uint64 clearAmount, bytes calldata proof) external returns (euint64 wrapped) {
        euint64 settlement = _activeSettlementAmount;
        if (!FHE.isInitialized(settlement)) revert NoActiveSettlement();

        bytes32[] memory handles = new bytes32[](1);
        handles[0] = euint64.unwrap(settlement);
        FHE.checkSignatures(handles, abi.encode(clearAmount), proof);

        uint256 assets = uint256(clearAmount) * token.rate();
        uint256 sharesSpent = strategy.withdraw(assets, address(this), address(this));
        strategyShares -= sharesSpent;
        wrapped = token.wrap(address(this), assets);

        euint64 nextClaimLiquidity = FHE.add(_normalized(_claimLiquidity), wrapped);
        FHE.allowThis(nextClaimLiquidity);
        _claimLiquidity = nextClaimLiquidity;
        _activeSettlementAmount = euint64.wrap(bytes32(0));
        emit SettlementFinalized(clearAmount, sharesSpent, wrapped);
    }

    function claim() external returns (euint64 sent) {
        euint64 currentQueue = _normalized(_queued[msg.sender]);
        euint64 currentLiquidity = _normalized(_claimLiquidity);
        euint64 payableAmount = FHE.min(currentQueue, currentLiquidity);
        FHE.allowTransient(payableAmount, address(token));
        sent = token.confidentialTransfer(msg.sender, payableAmount);

        euint64 nextQueue = FHE.sub(currentQueue, sent);
        euint64 nextTotalQueued = FHE.sub(_normalized(_totalQueued), sent);
        euint64 nextClaimLiquidity = FHE.sub(currentLiquidity, sent);
        _storeUserValue(nextQueue, msg.sender);
        FHE.allowThis(nextTotalQueued);
        FHE.allowThis(nextClaimLiquidity);
        _queued[msg.sender] = nextQueue;
        _totalQueued = nextTotalQueued;
        _claimLiquidity = nextClaimLiquidity;
        emit ClaimProcessed(msg.sender, sent);
    }

    function _accountPrincipal(address account, euint64 amount) private returns (ebool accepted) {
        euint64 oldPrincipal = _normalized(_principal[account]);
        euint64 oldWeight = _normalized(_drawWeight[account]);
        euint64 oldLiquidity = _normalized(_principalLiquidity);
        (ebool principalOk, euint64 nextPrincipal) = FHESafeMath.tryIncrease(oldPrincipal, amount);
        (ebool weightOk, euint64 nextWeight) = FHESafeMath.tryIncrease(oldWeight, amount);
        (ebool liquidityOk, euint64 nextLiquidity) = FHESafeMath.tryIncrease(oldLiquidity, amount);
        accepted = FHE.and(FHE.and(principalOk, weightOk), FHE.and(liquidityOk, FHE.gt(amount, 0)));

        euint64 finalPrincipal = FHE.select(accepted, nextPrincipal, oldPrincipal);
        euint64 finalWeight = FHE.select(accepted, nextWeight, oldWeight);
        euint64 finalLiquidity = FHE.select(accepted, nextLiquidity, oldLiquidity);
        euint64 joined = FHE.select(accepted, amount, FHE.asEuint64(0));
        _storeUserValue(finalPrincipal, account);
        _storeUserValue(finalWeight, account);
        FHE.allowThis(finalLiquidity);
        _principal[account] = finalPrincipal;
        _drawWeight[account] = finalWeight;
        _principalLiquidity = finalLiquidity;
        FHE.allowThis(joined);
        FHE.allow(joined, account);
        FHE.allowTransient(accepted, msg.sender);
        emit PrincipalDeposited(account, joined);
    }

    function _accountPrize(address account, euint64 amount) private returns (ebool accepted) {
        euint64 oldReserve = _normalized(_prizeReserve);
        (ebool reserveOk, euint64 nextReserve) = FHESafeMath.tryIncrease(oldReserve, amount);
        accepted = FHE.and(reserveOk, FHE.gt(amount, 0));
        euint64 finalReserve = FHE.select(accepted, nextReserve, oldReserve);
        euint64 joined = FHE.select(accepted, amount, FHE.asEuint64(0));
        FHE.allowThis(finalReserve);
        FHE.allowThis(joined);
        FHE.allow(joined, account);
        _prizeReserve = finalReserve;
        FHE.allowTransient(accepted, msg.sender);
        emit PrizeDeposited(account, joined);
    }

    function _returnDecision(bool decision) private returns (ebool encryptedDecision) {
        encryptedDecision = FHE.asEbool(decision);
        FHE.allowTransient(encryptedDecision, msg.sender);
    }

    function _normalized(euint64 value) private returns (euint64) {
        return FHE.isInitialized(value) ? value : FHE.asEuint64(0);
    }

    function _storeUserValue(euint64 value, address account) private {
        FHE.allowThis(value);
        FHE.allow(value, account);
    }
}
