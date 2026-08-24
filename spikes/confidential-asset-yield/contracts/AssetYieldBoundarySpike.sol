// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {FHE, ebool, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC7984Receiver} from "@openzeppelin/confidential-contracts/interfaces/IERC7984Receiver.sol";
import {FHESafeMath} from "@openzeppelin/confidential-contracts/utils/FHESafeMath.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";
import {ERC7984ERC20Wrapper} from "@openzeppelin/confidential-contracts/token/ERC7984/extensions/ERC7984ERC20Wrapper.sol";

/// @notice Disposable public six-decimal asset used to validate the wrapper boundary.
contract MockPublicAsset is ERC20 {
    constructor() ERC20("Mock Public Dollar", "mUSD") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @notice Thin application-owned ERC-7984 wrapper used only by this spike.
contract SpikeConfidentialToken is ERC7984ERC20Wrapper, ZamaEthereumConfig {
    constructor(IERC20 underlying_)
        ERC7984("Spike Confidential Dollar", "scUSD", "")
        ERC7984ERC20Wrapper(underlying_)
    {}
}

/// @notice Deterministic public ERC-4626 fallback. Sponsor transfers are explicitly labeled, not yield generation.
contract SponsoredYieldVault is ERC4626 {
    using SafeERC20 for IERC20;

    event SponsoredYieldAdded(address indexed sponsor, uint256 assets);

    constructor(IERC20 asset_) ERC20("Sponsored Test Vault Share", "stVS") ERC4626(asset_) {}

    function sponsorYield(uint256 assets) external {
        IERC20(asset()).safeTransferFrom(msg.sender, address(this), assets);
        emit SponsoredYieldAdded(msg.sender, assets);
    }
}

interface IAavePoolLike {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
}

interface IMintableAToken {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
}

/// @notice Public adapter whose shares do not rebase while its Aave-style aToken balance accrues.
contract NonRebasingAaveAdapterSpike is ERC4626 {
    using SafeERC20 for IERC20;

    IAavePoolLike public immutable pool;
    IERC20 public immutable aToken;

    constructor(IERC20 asset_, IAavePoolLike pool_, IERC20 aToken_)
        ERC20("Aave Strategy Share", "aSTRAT")
        ERC4626(asset_)
    {
        pool = pool_;
        aToken = aToken_;
        IERC20(asset_).forceApprove(address(pool_), type(uint256).max);
    }

    function totalAssets() public view override returns (uint256) {
        return aToken.balanceOf(address(this));
    }

    function _deposit(address caller, address receiver, uint256 assets, uint256 shares) internal override {
        IERC20(asset()).safeTransferFrom(caller, address(this), assets);
        pool.supply(asset(), assets, address(this), 0);
        _mint(receiver, shares);
        emit Deposit(caller, receiver, assets, shares);
    }

    function _withdraw(
        address caller,
        address receiver,
        address owner,
        uint256 assets,
        uint256 shares
    ) internal override {
        if (caller != owner) _spendAllowance(owner, caller, shares);
        _burn(owner, shares);
        uint256 withdrawn = pool.withdraw(asset(), assets, receiver);
        require(withdrawn == assets, "adapter-underpaid");
        emit Withdraw(caller, receiver, owner, assets, shares);
    }
}

/// @notice Minimal Aave-like pool for local adapter validation.
contract MockAavePool is IAavePoolLike {
    using SafeERC20 for IERC20;

    IERC20 public immutable asset;
    IMintableAToken public aToken;
    address public immutable admin;

    error Unauthorized();
    error WrongAsset(address asset);

    constructor(IERC20 asset_) {
        asset = asset_;
        admin = msg.sender;
    }

    function setAToken(IMintableAToken aToken_) external {
        if (msg.sender != admin || address(aToken) != address(0)) revert Unauthorized();
        aToken = aToken_;
    }

    function supply(address asset_, uint256 amount, address onBehalfOf, uint16) external override {
        if (asset_ != address(asset)) revert WrongAsset(asset_);
        asset.safeTransferFrom(msg.sender, address(this), amount);
        aToken.mint(onBehalfOf, amount);
    }

    function withdraw(address asset_, uint256 amount, address to) external override returns (uint256) {
        if (asset_ != address(asset)) revert WrongAsset(asset_);
        aToken.burn(msg.sender, amount);
        asset.safeTransfer(to, amount);
        return amount;
    }

    /// @dev Simulates accrued interest funded by the mock market, not organic yield.
    function accrueSponsoredYield(address beneficiary, uint256 amount) external {
        if (msg.sender != admin) revert Unauthorized();
        MockPublicAsset(address(asset)).mint(address(this), amount);
        aToken.mint(beneficiary, amount);
    }
}

contract MockAToken is ERC20, IMintableAToken {
    address public immutable pool;

    error Unauthorized();

    constructor(address pool_) ERC20("Mock Aave Interest Token", "maUSDT") {
        pool = pool_;
    }

    function mint(address to, uint256 amount) external {
        if (msg.sender != pool) revert Unauthorized();
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        if (msg.sender != pool) revert Unauthorized();
        _burn(from, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

/// @notice Minimal confidential-to-public boundary. It intentionally exposes only aggregate settlement amounts.
contract AssetYieldBoundarySpike is IERC7984Receiver, ZamaEthereumConfig {
    using SafeERC20 for IERC20;

    SpikeConfidentialToken public immutable token;
    IERC20 public immutable publicAsset;
    ERC4626 public immutable strategy;
    address public immutable controller;

    mapping(address account => euint64 principal) private _principal;
    euint64 private _aggregate;
    bytes32 public activeUnwrapRequestId;
    uint256 public strategyShares;
    euint64 public lastRewrapped;

    error UnauthorizedToken(address caller);
    error UnauthorizedController(address caller);
    error ActiveSettlement();
    error NoActiveSettlement();
    error InvalidRequest();
    error InvalidStrategyReturn();

    event DepositAccounted(address indexed account, euint64 actualAmount);
    event AggregateDispatched(bytes32 indexed unwrapRequestId, euint64 aggregateAmount);
    event AggregateFinalized(bytes32 indexed unwrapRequestId, uint64 clearAmount, uint256 strategyShares);
    event StrategyRewrapped(uint256 assets, euint64 wrappedAmount);

    constructor(SpikeConfidentialToken token_, IERC20 publicAsset_, ERC4626 strategy_) {
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

    function aggregate() external view returns (euint64) {
        return _aggregate;
    }

    function principalAllowed(address account, address viewer) external view returns (bool) {
        return FHE.isAllowed(_principal[account], viewer);
    }

    function aggregatePubliclyDecryptable() external view returns (bool) {
        bytes32 requestId = activeUnwrapRequestId;
        if (requestId == bytes32(0)) return false;
        return FHE.isPubliclyDecryptable(token.unwrapAmount(requestId));
    }

    function onConfidentialTransferReceived(
        address,
        address from,
        euint64 amount,
        bytes calldata data
    ) external returns (ebool) {
        if (msg.sender != address(token)) revert UnauthorizedToken(msg.sender);

        bool requestedAcceptance = data.length == 0 || abi.decode(data, (bool));
        if (!requestedAcceptance) {
            ebool rejected = FHE.asEbool(false);
            FHE.allowTransient(rejected, msg.sender);
            return rejected;
        }

        euint64 oldPrincipal = FHE.isInitialized(_principal[from])
            ? _principal[from]
            : FHE.asEuint64(0);
        euint64 oldAggregate = FHE.isInitialized(_aggregate) ? _aggregate : FHE.asEuint64(0);
        (ebool principalOk, euint64 principalNext) = FHESafeMath.tryIncrease(oldPrincipal, amount);
        (ebool aggregateOk, euint64 aggregateNext) = FHESafeMath.tryIncrease(oldAggregate, amount);
        ebool positive = FHE.gt(amount, FHE.asEuint64(0));
        ebool accepted = FHE.and(FHE.and(principalOk, aggregateOk), positive);

        euint64 finalPrincipal = FHE.select(accepted, principalNext, oldPrincipal);
        euint64 finalAggregate = FHE.select(accepted, aggregateNext, oldAggregate);
        euint64 joined = FHE.select(accepted, amount, FHE.asEuint64(0));

        FHE.allowThis(finalPrincipal);
        FHE.allow(finalPrincipal, from);
        FHE.allowThis(finalAggregate);
        FHE.allowThis(joined);
        FHE.allow(joined, from);
        _principal[from] = finalPrincipal;
        _aggregate = finalAggregate;

        FHE.allowTransient(accepted, msg.sender);
        emit DepositAccounted(from, joined);
        return accepted;
    }

    function dispatchAggregate() external returns (bytes32 requestId) {
        if (activeUnwrapRequestId != bytes32(0)) revert ActiveSettlement();
        euint64 amount = FHE.isInitialized(_aggregate) ? _aggregate : FHE.asEuint64(0);
        FHE.allowTransient(amount, address(token));
        requestId = token.unwrap(address(this), address(this), amount);
        activeUnwrapRequestId = requestId;
        _aggregate = FHE.asEuint64(0);
        FHE.allowThis(_aggregate);
        emit AggregateDispatched(requestId, amount);
    }

    function finalizeAggregate(uint64 clearAmount, bytes calldata proof) external returns (uint256 shares) {
        bytes32 requestId = activeUnwrapRequestId;
        if (requestId == bytes32(0)) revert NoActiveSettlement();
        token.finalizeUnwrap(requestId, clearAmount, proof);
        uint256 assets = uint256(clearAmount) * token.rate();
        shares = strategy.deposit(assets, address(this));
        strategyShares += shares;
        activeUnwrapRequestId = bytes32(0);
        emit AggregateFinalized(requestId, clearAmount, shares);
    }

    function redeemAndRewrap() external returns (euint64 wrappedAmount) {
        if (strategyShares == 0) revert InvalidStrategyReturn();
        uint256 shares = strategyShares;
        strategyShares = 0;
        uint256 assets = strategy.redeem(shares, address(this), address(this));
        wrappedAmount = token.wrap(address(this), assets);
        FHE.allowThis(wrappedAmount);
        lastRewrapped = wrappedAmount;
        emit StrategyRewrapped(assets, wrappedAmount);
    }
}
