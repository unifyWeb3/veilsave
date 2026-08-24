// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {FHE, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IConfidentialPrizePoolSettlement} from "./interfaces/IConfidentialPrizePoolSettlement.sol";
import {IConfidentialTokenWrapper} from "./interfaces/IConfidentialTokenWrapper.sol";
import {IStrategyVault} from "./interfaces/IStrategyVault.sol";

contract SettlementController is ReentrancyGuard, ZamaEthereumConfig {
    using SafeERC20 for IERC20;

    uint8 public constant ROUTE_PRINCIPAL_CLAIM = 1;
    uint8 public constant ROUTE_PRIZE_RESERVE = 2;

    enum SettlementKind {
        NONE,
        INVEST_PRINCIPAL,
        REDEEM_PRINCIPAL,
        HARVEST_YIELD
    }

    enum SettlementStatus {
        NONE,
        AGGREGATE_DECRYPT_PENDING,
        STRATEGY_ACTION_PENDING,
        REWRAP_PENDING,
        LIQUIDITY_RETURN_PENDING,
        FAILED_RETRYABLE,
        COMPLETED
    }

    struct Settlement {
        uint64 id;
        SettlementKind kind;
        SettlementStatus status;
        SettlementStatus retryStage;
        uint64 createdAt;
        uint64 publicCap;
        bytes32 aggregateHandle;
        uint64 clearAggregate;
        bytes32 wrapperRequestId;
        uint256 strategySharesBefore;
        uint256 publicBalanceBefore;
        uint256 publicAssetsRequested;
        uint256 publicAssetsReceived;
        bytes32 returnedHandle;
        bytes32 failureCode;
        uint32 attempt;
    }

    IConfidentialTokenWrapper public immutable confidentialToken;
    IERC20 public immutable underlying;
    address public immutable timelock;
    address public immutable pauseGuardian;

    address public pool;
    address public bootstrapAuthority;
    IStrategyVault public strategy;
    uint64 public nextSettlementId = 1;
    uint64 public activeSettlementId;
    uint256 public strategyShares;
    uint256 public deployedPrincipal;
    bool public investmentsPaused;
    bool public lossMode;

    mapping(uint64 settlementId => Settlement settlement) internal _settlements;

    error ActiveSettlement(uint64 settlementId);
    error AlreadyBound();
    error BootstrapOnly(address caller);
    error InvalidAggregateHandle();
    error InvalidConfiguration();
    error InvalidSettlementCap();
    error InvalidStrategy(address strategy);
    error InvalidStrategyReturn();
    error InvestmentNotPaused();
    error InvestmentPaused();
    error LossModeActive();
    error NoLossDetected();
    error NoYieldAvailable();
    error NotPauseGuardian(address caller);
    error NotPool(address caller);
    error NotTimelock(address caller);
    error SettlementNotFound(uint64 settlementId);
    error SettlementNotRetryable(uint64 settlementId);
    error StrategyNotDrained(uint256 shares);
    error WrongSettlement(uint64 expected, uint64 supplied);
    error WrongSettlementStatus(
        uint64 settlementId,
        SettlementStatus expected,
        SettlementStatus actual
    );

    event PoolBound(address indexed pool);
    event InvestmentPauseChanged(bool paused, address indexed caller);
    event LossModeEntered(uint256 deployedPrincipal, uint256 withdrawableAssets);
    event StrategyChanged(
        address indexed previousStrategy,
        address indexed nextStrategy,
        uint8 yieldMode,
        bytes32 strategyId
    );
    event SettlementStarted(
        uint64 indexed settlementId,
        SettlementKind kind,
        uint64 publicCap,
        bytes32 aggregateHandle
    );
    event SettlementAggregateFinalized(uint64 indexed settlementId, uint64 clearAggregate);
    event StrategyDepositCompleted(uint64 indexed settlementId, uint256 assets, uint256 shares);
    event StrategyRedemptionCompleted(
        uint64 indexed settlementId,
        uint256 requestedAssets,
        uint256 receivedAssets,
        uint256 sharesBurned
    );
    event ConfidentialLiquidityReturned(
        uint64 indexed settlementId,
        uint8 route,
        bytes32 returnedHandle
    );
    event YieldHarvested(uint64 indexed settlementId, uint256 publicAssets);
    event SettlementFailed(
        uint64 indexed settlementId,
        SettlementStatus stage,
        bytes32 failureCode,
        uint32 attempt
    );
    event SettlementRetried(uint64 indexed settlementId, uint32 attempt);
    event SettlementCompleted(uint64 indexed settlementId);

    constructor(
        IConfidentialTokenWrapper confidentialToken_,
        IERC20 underlying_,
        IStrategyVault strategy_,
        address bootstrapAuthority_,
        address timelock_,
        address pauseGuardian_
    ) {
        if (
            address(confidentialToken_) == address(0) ||
            address(underlying_) == address(0) ||
            address(strategy_) == address(0) ||
            bootstrapAuthority_ == address(0) ||
            timelock_ == address(0) ||
            pauseGuardian_ == address(0) ||
            confidentialToken_.underlying() != address(underlying_) ||
            confidentialToken_.rate() != 1 ||
            confidentialToken_.decimals() != 6 ||
            IERC20Metadata(address(underlying_)).decimals() != 6 ||
            strategy_.asset() != address(underlying_)
        ) revert InvalidConfiguration();

        confidentialToken = confidentialToken_;
        underlying = underlying_;
        strategy = strategy_;
        bootstrapAuthority = bootstrapAuthority_;
        timelock = timelock_;
        pauseGuardian = pauseGuardian_;

        underlying_.forceApprove(address(confidentialToken_), type(uint256).max);
        underlying_.forceApprove(address(strategy_), type(uint256).max);
    }

    modifier onlyPool() {
        if (msg.sender != pool) revert NotPool(msg.sender);
        _;
    }

    function bindPool(address pool_) external {
        if (msg.sender != bootstrapAuthority) revert BootstrapOnly(msg.sender);
        if (pool != address(0) || pool_ == address(0)) revert AlreadyBound();
        pool = pool_;
        bootstrapAuthority = address(0);
        emit PoolBound(pool_);
    }

    function pauseInvestments() external {
        if (msg.sender != pauseGuardian) revert NotPauseGuardian(msg.sender);
        investmentsPaused = true;
        emit InvestmentPauseChanged(true, msg.sender);
    }

    function unpauseInvestments() external {
        if (msg.sender != timelock) revert NotTimelock(msg.sender);
        investmentsPaused = false;
        emit InvestmentPauseChanged(false, msg.sender);
    }

    function startInvestment(
        bytes32 unwrapRequestId,
        euint64 actualAmount,
        uint64 publicCap
    ) external onlyPool returns (uint64 settlementId) {
        if (investmentsPaused) revert InvestmentPaused();
        if (lossMode) revert LossModeActive();
        if (publicCap == 0) revert InvalidSettlementCap();
        if (
            unwrapRequestId == bytes32(0) ||
            euint64.unwrap(actualAmount) != unwrapRequestId ||
            euint64.unwrap(confidentialToken.unwrapAmount(unwrapRequestId)) != unwrapRequestId
        ) revert InvalidAggregateHandle();

        settlementId = _newSettlement(
            SettlementKind.INVEST_PRINCIPAL,
            SettlementStatus.AGGREGATE_DECRYPT_PENDING,
            publicCap,
            unwrapRequestId
        );
        Settlement storage settlement = _settlements[settlementId];
        settlement.wrapperRequestId = unwrapRequestId;
        settlement.publicBalanceBefore = underlying.balanceOf(address(this));
        settlement.strategySharesBefore = strategy.balanceOf(address(this));
    }

    function startPrincipalRedemption(
        euint64 aggregateAmount,
        uint64 publicCap
    ) external onlyPool returns (uint64 settlementId) {
        if (publicCap == 0) revert InvalidSettlementCap();
        settlementId = _newSettlement(
            SettlementKind.REDEEM_PRINCIPAL,
            SettlementStatus.AGGREGATE_DECRYPT_PENDING,
            publicCap,
            euint64.unwrap(aggregateAmount)
        );
        FHE.allowThis(aggregateAmount);
    }

    function startYieldHarvest(uint64 publicCap) external onlyPool returns (uint64 settlementId) {
        if (publicCap == 0) revert InvalidSettlementCap();
        if (lossMode) revert LossModeActive();

        uint256 grossAssets = strategy.maxWithdraw(address(this));
        if (grossAssets <= deployedPrincipal) revert NoYieldAvailable();
        uint256 harvestable = grossAssets - deployedPrincipal;
        if (harvestable > publicCap) harvestable = publicCap;
        if (harvestable > type(uint64).max) harvestable = type(uint64).max;

        uint256 inferredSupply = confidentialToken.inferredTotalSupply();
        uint256 maximumSupply = confidentialToken.maxTotalSupply();
        uint256 remainingCapacity = maximumSupply > inferredSupply
            ? maximumSupply - inferredSupply
            : 0;
        if (harvestable > remainingCapacity) harvestable = remainingCapacity;
        if (harvestable == 0) revert NoYieldAvailable();

        settlementId = _newSettlement(
            SettlementKind.HARVEST_YIELD,
            SettlementStatus.STRATEGY_ACTION_PENDING,
            publicCap,
            bytes32(0)
        );
        _settlements[settlementId].publicAssetsRequested = harvestable;
        _settlements[settlementId].strategySharesBefore = strategy.balanceOf(address(this));
    }

    function finalizeInvestmentAggregate(
        uint64 settlementId,
        uint64 clearAmount,
        bytes calldata proof
    ) external nonReentrant {
        Settlement storage settlement = _active(settlementId);
        if (settlement.status != SettlementStatus.AGGREGATE_DECRYPT_PENDING) {
            revert WrongSettlementStatus(
                settlementId,
                SettlementStatus.AGGREGATE_DECRYPT_PENDING,
                settlement.status
            );
        }
        if (settlement.kind != SettlementKind.INVEST_PRINCIPAL) {
            revert WrongSettlementStatus(
                settlementId,
                SettlementStatus.STRATEGY_ACTION_PENDING,
                settlement.status
            );
        }

        confidentialToken.finalizeUnwrap(settlement.wrapperRequestId, clearAmount, proof);
        uint256 balanceAfter = underlying.balanceOf(address(this));
        if (balanceAfter < settlement.publicBalanceBefore) revert InvalidStrategyReturn();
        uint256 received = balanceAfter - settlement.publicBalanceBefore;
        if (received != uint256(clearAmount)) revert InvalidStrategyReturn();

        settlement.clearAggregate = clearAmount;
        settlement.publicAssetsRequested = received;
        settlement.publicAssetsReceived = received;
        settlement.status = SettlementStatus.STRATEGY_ACTION_PENDING;
        emit SettlementAggregateFinalized(settlementId, clearAmount);
        _attemptInvestment(settlement);
    }

    function finalizePrincipalRedemption(
        uint64 settlementId,
        uint64 clearAmount,
        bytes calldata proof
    ) external nonReentrant {
        Settlement storage settlement = _active(settlementId);
        if (
            settlement.kind != SettlementKind.REDEEM_PRINCIPAL ||
            settlement.status != SettlementStatus.AGGREGATE_DECRYPT_PENDING
        ) {
            revert WrongSettlementStatus(
                settlementId,
                SettlementStatus.AGGREGATE_DECRYPT_PENDING,
                settlement.status
            );
        }

        bytes32[] memory handles = new bytes32[](1);
        handles[0] = settlement.aggregateHandle;
        FHE.checkSignatures(handles, abi.encode(clearAmount), proof);

        settlement.clearAggregate = clearAmount;
        settlement.publicAssetsRequested = clearAmount > settlement.publicCap
            ? settlement.publicCap
            : clearAmount;
        settlement.status = SettlementStatus.STRATEGY_ACTION_PENDING;
        emit SettlementAggregateFinalized(settlementId, clearAmount);
        _attemptRedemption(settlement, false);
    }

    function executeSettlement(uint64 settlementId) external nonReentrant {
        Settlement storage settlement = _active(settlementId);
        if (settlement.status == SettlementStatus.FAILED_RETRYABLE) {
            unchecked {
                ++settlement.attempt;
            }
            settlement.status = settlement.retryStage;
            emit SettlementRetried(settlementId, settlement.attempt);
        }

        if (settlement.kind == SettlementKind.INVEST_PRINCIPAL) {
            if (settlement.status != SettlementStatus.STRATEGY_ACTION_PENDING) {
                revert SettlementNotRetryable(settlementId);
            }
            _attemptInvestment(settlement);
            return;
        }

        if (settlement.kind == SettlementKind.REDEEM_PRINCIPAL) {
            if (settlement.status == SettlementStatus.STRATEGY_ACTION_PENDING) {
                _attemptRedemption(settlement, false);
                return;
            }
            if (settlement.status == SettlementStatus.REWRAP_PENDING) {
                _attemptRewrap(settlement, ROUTE_PRINCIPAL_CLAIM);
                return;
            }
            revert SettlementNotRetryable(settlementId);
        }

        if (settlement.kind == SettlementKind.HARVEST_YIELD) {
            if (settlement.status == SettlementStatus.STRATEGY_ACTION_PENDING) {
                _attemptRedemption(settlement, true);
                return;
            }
            if (settlement.status == SettlementStatus.REWRAP_PENDING) {
                _attemptRewrap(settlement, ROUTE_PRIZE_RESERVE);
                return;
            }
        }

        revert SettlementNotRetryable(settlementId);
    }

    function retrySettlement(uint64 settlementId) external {
        if (_settlements[settlementId].status != SettlementStatus.FAILED_RETRYABLE) {
            revert SettlementNotRetryable(settlementId);
        }
        this.executeSettlement(settlementId);
    }

    function enterLossMode() external {
        uint256 withdrawable = strategy.maxWithdraw(address(this));
        if (withdrawable >= deployedPrincipal) revert NoLossDetected();
        lossMode = true;
        investmentsPaused = true;
        IConfidentialPrizePoolSettlement(pool).pause(type(uint8).max >> 4);
        emit LossModeEntered(deployedPrincipal, withdrawable);
    }

    function setStrategy(IStrategyVault nextStrategy) external {
        if (msg.sender != timelock) revert NotTimelock(msg.sender);
        if (!investmentsPaused) revert InvestmentNotPaused();
        if (activeSettlementId != 0) revert ActiveSettlement(activeSettlementId);
        uint256 oldShares = strategy.balanceOf(address(this));
        if (oldShares != 0 || strategyShares != 0 || deployedPrincipal != 0) {
            revert StrategyNotDrained(oldShares);
        }
        if (
            address(nextStrategy) == address(0) ||
            nextStrategy.asset() != address(underlying)
        ) revert InvalidStrategy(address(nextStrategy));

        address previous = address(strategy);
        underlying.forceApprove(previous, 0);
        strategy = nextStrategy;
        underlying.forceApprove(address(nextStrategy), type(uint256).max);
        emit StrategyChanged(
            previous,
            address(nextStrategy),
            nextStrategy.yieldMode(),
            nextStrategy.strategyId()
        );
    }

    function returnHandle(uint64 settlementId) external view returns (bytes32) {
        return _settlements[settlementId].returnedHandle;
    }

    function settlementPublic(
        uint64 settlementId
    )
        external
        view
        returns (
            SettlementKind kind,
            SettlementStatus status,
            SettlementStatus retryStage,
            uint64 createdAt,
            uint64 publicCap,
            bytes32 aggregateHandle,
            uint64 clearAggregate,
            bytes32 wrapperRequestId,
            uint256 publicAssetsRequested,
            uint256 publicAssetsReceived,
            bytes32 returnedHandle,
            bytes32 failureCode,
            uint32 attempt
        )
    {
        Settlement storage settlement = _settlements[settlementId];
        if (settlement.id == 0) revert SettlementNotFound(settlementId);
        return (
            settlement.kind,
            settlement.status,
            settlement.retryStage,
            settlement.createdAt,
            settlement.publicCap,
            settlement.aggregateHandle,
            settlement.clearAggregate,
            settlement.wrapperRequestId,
            settlement.publicAssetsRequested,
            settlement.publicAssetsReceived,
            settlement.returnedHandle,
            settlement.failureCode,
            settlement.attempt
        );
    }

    function _newSettlement(
        SettlementKind kind,
        SettlementStatus status,
        uint64 publicCap,
        bytes32 aggregateHandle
    ) internal returns (uint64 settlementId) {
        if (pool == address(0)) revert InvalidConfiguration();
        if (activeSettlementId != 0) revert ActiveSettlement(activeSettlementId);
        settlementId = nextSettlementId++;
        activeSettlementId = settlementId;
        Settlement storage settlement = _settlements[settlementId];
        settlement.id = settlementId;
        settlement.kind = kind;
        settlement.status = status;
        settlement.createdAt = uint64(block.timestamp);
        settlement.publicCap = publicCap;
        settlement.aggregateHandle = aggregateHandle;
        emit SettlementStarted(settlementId, kind, publicCap, aggregateHandle);
    }

    function _active(uint64 settlementId) internal view returns (Settlement storage settlement) {
        if (activeSettlementId != settlementId) {
            revert WrongSettlement(activeSettlementId, settlementId);
        }
        settlement = _settlements[settlementId];
        if (settlement.id == 0) revert SettlementNotFound(settlementId);
    }

    function _attemptInvestment(Settlement storage settlement) internal {
        uint256 assets = settlement.publicAssetsReceived;
        if (assets == 0) {
            IConfidentialPrizePoolSettlement(pool).onInvestmentSettlementFinalized(settlement.id);
            _complete(settlement);
            return;
        }

        uint256 sharesBefore = strategy.balanceOf(address(this));
        try strategy.deposit(assets, address(this)) returns (uint256) {
            uint256 sharesAfter = strategy.balanceOf(address(this));
            if (sharesAfter <= sharesBefore) revert InvalidStrategyReturn();
            uint256 sharesReceived = sharesAfter - sharesBefore;
            strategyShares = sharesAfter;
            deployedPrincipal += assets;
            emit StrategyDepositCompleted(settlement.id, assets, sharesReceived);
        } catch (bytes memory reason) {
            _fail(settlement, SettlementStatus.STRATEGY_ACTION_PENDING, reason);
            return;
        }

        IConfidentialPrizePoolSettlement(pool).onInvestmentSettlementFinalized(settlement.id);
        _complete(settlement);
    }

    function _attemptRedemption(Settlement storage settlement, bool harvest) internal {
        uint256 requested = settlement.publicAssetsRequested;
        uint256 maximum = strategy.maxWithdraw(address(this));
        if (requested > maximum) requested = maximum;
        if (requested == 0) {
            settlement.status = SettlementStatus.REWRAP_PENDING;
            _attemptRewrap(
                settlement,
                harvest ? ROUTE_PRIZE_RESERVE : ROUTE_PRINCIPAL_CLAIM
            );
            return;
        }

        uint256 balanceBefore = underlying.balanceOf(address(this));
        uint256 sharesBefore = strategy.balanceOf(address(this));
        try strategy.withdraw(requested, address(this), address(this)) returns (uint256) {
            uint256 balanceAfter = underlying.balanceOf(address(this));
            uint256 sharesAfter = strategy.balanceOf(address(this));
            if (
                balanceAfter <= balanceBefore ||
                balanceAfter - balanceBefore > requested ||
                sharesAfter > sharesBefore
            ) revert InvalidStrategyReturn();

            uint256 received = balanceAfter - balanceBefore;
            settlement.publicAssetsRequested = requested;
            settlement.publicAssetsReceived = received;
            strategyShares = sharesAfter;
            if (!harvest) {
                deployedPrincipal = received >= deployedPrincipal
                    ? 0
                    : deployedPrincipal - received;
            }
            emit StrategyRedemptionCompleted(
                settlement.id,
                requested,
                received,
                sharesBefore - sharesAfter
            );
        } catch (bytes memory reason) {
            _fail(settlement, SettlementStatus.STRATEGY_ACTION_PENDING, reason);
            return;
        }

        settlement.status = SettlementStatus.REWRAP_PENDING;
        _attemptRewrap(
            settlement,
            harvest ? ROUTE_PRIZE_RESERVE : ROUTE_PRINCIPAL_CLAIM
        );
    }

    function _attemptRewrap(Settlement storage settlement, uint8 route) internal {
        uint256 assets = settlement.publicAssetsReceived;
        euint64 wrapped;
        try confidentialToken.wrap(pool, assets) returns (euint64 actualWrapped) {
            wrapped = actualWrapped;
        } catch (bytes memory reason) {
            _fail(settlement, SettlementStatus.REWRAP_PENDING, reason);
            return;
        }

        settlement.returnedHandle = euint64.unwrap(wrapped);
        settlement.status = SettlementStatus.LIQUIDITY_RETURN_PENDING;
        IConfidentialPrizePoolSettlement(pool).onSettlementLiquidityReturned(
            settlement.id,
            route,
            wrapped
        );
        emit ConfidentialLiquidityReturned(settlement.id, route, settlement.returnedHandle);
        if (route == ROUTE_PRIZE_RESERVE) {
            emit YieldHarvested(settlement.id, assets);
        }
        _complete(settlement);
    }

    function _fail(
        Settlement storage settlement,
        SettlementStatus retryStage,
        bytes memory reason
    ) internal {
        settlement.status = SettlementStatus.FAILED_RETRYABLE;
        settlement.retryStage = retryStage;
        settlement.failureCode = keccak256(reason);
        emit SettlementFailed(
            settlement.id,
            retryStage,
            settlement.failureCode,
            settlement.attempt
        );
    }

    function _complete(Settlement storage settlement) internal {
        settlement.status = SettlementStatus.COMPLETED;
        settlement.retryStage = SettlementStatus.NONE;
        activeSettlementId = 0;
        emit SettlementCompleted(settlement.id);
    }
}
