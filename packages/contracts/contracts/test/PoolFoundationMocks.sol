// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {
    FHE,
    eaddress,
    euint64,
    externalEaddress,
    externalEuint64
} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";
import {ERC7984ERC20Wrapper} from "@openzeppelin/confidential-contracts/token/ERC7984/extensions/ERC7984ERC20Wrapper.sol";

import {ConfidentialPrizePool} from "../ConfidentialPrizePool.sol";
import {DeterministicTestYieldVault} from "../DeterministicTestYieldVault.sol";

contract MockSixDecimalAsset is ERC20 {
    constructor() ERC20("Mock USDT", "mUSDT") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract MockWrongDecimalAsset is ERC20 {
    constructor() ERC20("Wrong Decimal Asset", "WDA") {}

    function decimals() public pure override returns (uint8) {
        return 18;
    }
}

contract TestConfidentialUSDT is ERC7984ERC20Wrapper, ZamaEthereumConfig {
    constructor(IERC20 underlying_)
        ERC7984("Test Confidential USDT", "cUSDT", "")
        ERC7984ERC20Wrapper(underlying_)
    {}
}

contract TestWrongDecimalConfidentialToken is ERC7984ERC20Wrapper, ZamaEthereumConfig {
    constructor(IERC20 underlying_)
        ERC7984("Wrong Confidential Asset", "cWRONG", "")
        ERC7984ERC20Wrapper(underlying_)
    {}
}

contract MockPoolVrfBinding {
    address public pool;
    address public immutable timelock;
    address public bootstrapAuthority;

    error AlreadyBound();
    error BootstrapOnly();

    constructor(address bootstrapAuthority_, address timelock_) {
        bootstrapAuthority = bootstrapAuthority_;
        timelock = timelock_;
    }

    function bindPool(address pool_) external {
        if (msg.sender != bootstrapAuthority) revert BootstrapOnly();
        if (pool != address(0) || pool_ == address(0)) revert AlreadyBound();
        pool = pool_;
        bootstrapAuthority = address(0);
    }
}

contract MockSettlementBinding {
    address public pool;
    address public immutable confidentialToken;
    address public immutable underlying;
    address public immutable timelock;
    address public immutable pauseGuardian;
    address public bootstrapAuthority;
    bool public lossMode;

    error AlreadyBound();
    error BootstrapOnly();

    constructor(
        address bootstrapAuthority_,
        address confidentialToken_,
        address underlying_,
        address timelock_,
        address pauseGuardian_
    ) {
        bootstrapAuthority = bootstrapAuthority_;
        confidentialToken = confidentialToken_;
        underlying = underlying_;
        timelock = timelock_;
        pauseGuardian = pauseGuardian_;
    }

    function bindPool(address pool_) external {
        if (msg.sender != bootstrapAuthority) revert BootstrapOnly();
        if (pool != address(0) || pool_ == address(0)) revert AlreadyBound();
        pool = pool_;
        bootstrapAuthority = address(0);
    }
}

contract TestLossyYieldVault is DeterministicTestYieldVault {
    constructor(
        IERC20 asset_,
        address timelock_,
        address pauseGuardian_,
        bytes32 strategyId_
    ) DeterministicTestYieldVault(asset_, timelock_, pauseGuardian_, strategyId_) {}

    function forceLoss(address recipient, uint256 assets) external {
        require(IERC20(asset()).transfer(recipient, assets));
    }
}

contract ReentrantTestYieldVault is ERC4626 {
    address public controller;
    bytes32 public immutable strategyId;
    bool public reentryAttempted;
    bool public reentrySucceeded;

    constructor(
        IERC20 asset_,
        bytes32 strategyId_
    ) ERC20("VeilSave Reentrancy Test Share", "vsREENTRANT") ERC4626(asset_) {
        strategyId = strategyId_;
    }

    function setController(address controller_) external {
        require(controller == address(0));
        controller = controller_;
    }

    function yieldMode() external pure returns (uint8) {
        return 0;
    }

    function _deposit(
        address caller,
        address receiver,
        uint256 assets,
        uint256 shares
    ) internal override {
        if (!reentryAttempted && controller != address(0)) {
            reentryAttempted = true;
            (reentrySucceeded, ) = controller.call(
                abi.encodeWithSignature("executeSettlement(uint64)", 1)
            );
        }
        super._deposit(caller, receiver, assets, shares);
    }
}

contract ReentrantSlotOwner {
    ConfidentialPrizePool public immutable pool;
    bool public reentryAttempted;
    bool public reentrySucceeded;

    constructor(ConfidentialPrizePool pool_) {
        pool = pool_;
    }

    function reserve() external payable {
        pool.reserveSlot{value: msg.value}();
    }

    function release(uint8 slot) external {
        pool.releaseSlot(slot);
    }

    receive() external payable {
        reentryAttempted = true;
        (reentrySucceeded, ) = address(pool).call{value: msg.value}(
            abi.encodeWithSignature("reserveSlot()")
        );
    }
}

contract ConfidentialPrizePoolHarness is ConfidentialPrizePool {
    constructor(
        Dependencies memory dependencies,
        Configuration memory configuration
    ) ConfidentialPrizePool(dependencies, configuration) {}

    function accountingHandles()
        external
        view
        returns (
            euint64 totalPrincipalLiability,
            euint64 principalLiquidity,
            euint64 principalInFlight,
            euint64 claimLiquidity,
            euint64 queuedPrincipal,
            euint64 prizeReserve
        )
    {
        return (
            _totalPrincipalLiability,
            _confidentialPrincipalLiquidity,
            _principalInFlight,
            _confidentialClaimLiquidity,
            _totalQueuedPrincipal,
            _prizeReserve
        );
    }

    function testMoveAllPrincipalLiquidityToInFlight() external {
        euint64 liquidity = _normalized(_confidentialPrincipalLiquidity);
        _principalInFlight = liquidity;
        _confidentialPrincipalLiquidity = _newPoolZero();
        FHE.allowThis(_principalInFlight);
    }

    function testReturnPrincipalClaimLiquidity(uint64 clearAmount) external {
        euint64 inFlight = _normalized(_principalInFlight);
        euint64 returned = FHE.min(inFlight, FHE.asEuint64(clearAmount));
        _principalInFlight = FHE.sub(inFlight, returned);
        _confidentialClaimLiquidity = FHE.add(
            _normalized(_confidentialClaimLiquidity),
            returned
        );
        FHE.allowThis(_principalInFlight);
        FHE.allowThis(_confidentialClaimLiquidity);
    }

    function testPrepareDraw(
        address[PARTICIPANT_CAPACITY] calldata owners,
        externalEuint64[PARTICIPANT_CAPACITY] calldata encryptedWeights,
        bytes calldata inputProof,
        uint256 randomWord
    ) external {
        Epoch storage epoch = _epochs[currentEpochId];
        for (uint8 index = 0; index < PARTICIPANT_CAPACITY; ++index) {
            euint64 weight = FHE.fromExternal(encryptedWeights[index], inputProof);
            if (owners[index] == address(0)) weight = FHE.asEuint64(0);
            epoch.slotOwners[index] = owners[index];
            epoch.weightSnapshot[index] = weight;
            FHE.allowThis(weight);
        }
        epoch.randomWord = randomWord;
        epoch.drawDeadline = uint64(block.timestamp) + drawTimeout;
        epoch.status = EpochStatus.DRAW_READY;
    }

    function testSetEpochPrize(
        uint64 epochId,
        externalEuint64 encryptedPrize,
        bytes calldata inputProof
    ) external {
        Epoch storage epoch = _epochs[epochId];
        epoch.epochPrize = FHE.fromExternal(encryptedPrize, inputProof);
        FHE.allowThis(epoch.epochPrize);
    }

    function testPrepareReveal(
        uint64 epochId,
        address[PARTICIPANT_CAPACITY] calldata owners,
        externalEaddress encryptedWinner,
        bytes calldata inputProof
    ) external {
        Epoch storage epoch = _epochs[epochId];
        for (uint8 index = 0; index < PARTICIPANT_CAPACITY; ++index) {
            epoch.slotOwners[index] = owners[index];
        }
        epoch.encryptedWinner = FHE.fromExternal(encryptedWinner, inputProof);
        epoch.aclGrantNotBeforeBlock = uint64(block.number) + winnerAclDelayBlocks;
        epoch.status = EpochStatus.REVEAL_PENDING;
        FHE.allowThis(epoch.encryptedWinner);
        FHE.makePubliclyDecryptable(epoch.encryptedWinner);
    }

    function testPrizeAllowed(uint64 epochId, address account) external view returns (bool) {
        return FHE.isAllowed(_epochs[epochId].epochPrize, account);
    }

    function testPrizePubliclyDecryptable(uint64 epochId) external view returns (bool) {
        return FHE.isPubliclyDecryptable(_epochs[epochId].epochPrize);
    }
}
