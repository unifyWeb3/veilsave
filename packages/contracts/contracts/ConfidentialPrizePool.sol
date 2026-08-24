// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {
    FHE,
    eaddress,
    ebool,
    euint64,
    euint128,
    externalEuint64
} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC7984Receiver} from "@openzeppelin/confidential-contracts/interfaces/IERC7984Receiver.sol";
import {FHESafeMath} from "@openzeppelin/confidential-contracts/utils/FHESafeMath.sol";

import {IConfidentialTokenWrapper} from "./interfaces/IConfidentialTokenWrapper.sol";
import {IPoolVrfAdapter} from "./interfaces/IPoolVrfAdapter.sol";
import {ISettlementController} from "./interfaces/ISettlementController.sol";

contract ConfidentialPrizePool is IERC7984Receiver, ReentrancyGuard, ZamaEthereumConfig {
    uint8 public constant PARTICIPANT_CAPACITY = 16;
    uint16 private constant BPS_DENOMINATOR = 10_000;

    bytes4 public constant DEPOSIT_ROUTE = bytes4(keccak256("VEILSAVE_DEPOSIT_V1"));

    uint8 public constant PAUSE_SLOT_RESERVATION = 1 << 0;
    uint8 public constant PAUSE_DEPOSITS = 1 << 1;
    uint8 public constant PAUSE_EPOCH_OPEN = 1 << 2;
    uint8 public constant PAUSE_INVESTMENT = 1 << 3;
    uint8 public constant ALL_PAUSE_SCOPES =
        PAUSE_SLOT_RESERVATION | PAUSE_DEPOSITS | PAUSE_EPOCH_OPEN | PAUSE_INVESTMENT;

    uint64 public constant epochDuration = 7 days;
    uint64 public constant requestTimeout = 24 hours;
    uint64 public constant fulfillmentTimeout = 24 hours;
    uint64 public constant drawTimeout = 24 hours;
    uint64 public constant winnerAclDelayBlocks = 96;
    uint96 public constant slotBondWei = 0.001 ether;
    uint16 public constant liquidityTargetBps = 2_000;

    enum SlotStatus {
        FREE,
        RESERVED,
        ACTIVE,
        CLOSING
    }

    enum EpochStatus {
        NONE,
        OPEN,
        FROZEN,
        RANDOMNESS_REQUESTED,
        DRAW_READY,
        REVEAL_PENDING,
        TERMINAL,
        ABANDONED
    }

    enum EpochOutcome {
        UNRESOLVED,
        WINNER,
        NO_ELIGIBLE_WEIGHT,
        ABANDONED_TIMEOUT
    }

    enum AbandonReason {
        REQUEST_TIMEOUT,
        FULFILLMENT_TIMEOUT,
        DRAW_TIMEOUT
    }

    enum WithdrawalStatus {
        NONE,
        ROUTING_PENDING,
        QUEUED,
        PAYOUT_STATUS_PENDING,
        IMMEDIATE_SETTLED,
        CLAIMED
    }

    enum WithdrawalRoute {
        IMMEDIATE,
        QUEUED
    }

    enum SettlementKind {
        NONE,
        INVEST_PRINCIPAL,
        REDEEM_PRINCIPAL,
        HARVEST_YIELD
    }

    enum LiquidityRoute {
        NONE,
        PRINCIPAL_CLAIM,
        PRIZE_RESERVE
    }

    struct Dependencies {
        address confidentialToken;
        address vrfAdapter;
        address settlementController;
        address bootstrapAuthority;
        address timelock;
        address pauseGuardian;
    }

    struct Configuration {
        uint64 epochDuration;
        uint64 requestTimeout;
        uint64 fulfillmentTimeout;
        uint64 drawTimeout;
        uint64 winnerAclDelayBlocks;
        uint96 slotBondWei;
        uint16 liquidityTargetBps;
    }

    struct Slot {
        address owner;
        SlotStatus status;
        uint96 bondWei;
        uint64 activeWithdrawalId;
        uint64 lastReferencedEpoch;
        euint64 principal;
        euint64 eligibleWeight;
        euint64 pendingWeight;
    }

    struct Epoch {
        uint64 id;
        EpochStatus status;
        uint64 openedAt;
        uint64 closesAt;
        uint64 frozenAt;
        uint64 requestDeadline;
        uint64 fulfillmentDeadline;
        uint64 drawDeadline;
        uint64 terminalAt;
        uint8 frozenSlotCount;
        bytes32 snapshotCommitment;
        address[PARTICIPANT_CAPACITY] slotOwners;
        euint64[PARTICIPANT_CAPACITY] weightSnapshot;
        uint256 vrfRequestId;
        uint256 randomWord;
        uint64 randomFulfilledAt;
        eaddress encryptedWinner;
        uint64 aclGrantNotBeforeBlock;
        address finalizedWinner;
        euint64 epochPrize;
        EpochOutcome outcome;
    }

    struct WithdrawalTicket {
        uint64 id;
        uint8 slot;
        address owner;
        uint64 createdAt;
        uint64 fifoSequence;
        uint64 settlementId;
        uint32 version;
        WithdrawalStatus status;
        euint64 requestedAllowed;
        euint64 remainingClaim;
        ebool routingHasRemainder;
        ebool completionIsZero;
    }

    IConfidentialTokenWrapper public immutable confidentialToken;
    IPoolVrfAdapter public immutable vrfAdapter;
    ISettlementController public immutable settlementController;
    address public immutable underlying;
    address public immutable timelock;
    address public immutable pauseGuardian;

    address public bootstrapAuthority;
    bool public active;
    uint8 public pauseMask;
    uint64 public currentEpochId;
    uint64 public lastTerminalEpochId;
    uint64 public nextWithdrawalId = 1;
    uint64 public nextFifoSequence = 1;
    uint64 public activeSettlementId;

    SettlementKind internal _activeSettlementKind;
    LiquidityRoute internal _activeSettlementRoute;
    bytes32 internal _activeSettlementAggregateHandle;

    Slot[PARTICIPANT_CAPACITY] internal _slots;
    mapping(address owner => uint8 slotPlusOne) internal _slotByOwner;
    mapping(uint64 epochId => Epoch epoch) internal _epochs;
    mapping(uint64 withdrawalId => WithdrawalTicket ticket) internal _withdrawals;
    euint64 internal _totalPrincipalLiability;
    euint64 internal _confidentialPrincipalLiquidity;
    euint64 internal _principalInFlight;
    euint64 internal _confidentialClaimLiquidity;
    euint64 internal _totalQueuedPrincipal;
    euint64 internal _prizeReserve;

    error BootstrapOnly();
    error DependencyBindingMismatch();
    error InvalidAssetConfiguration();
    error InvalidConfiguration();
    error InvalidPauseScopes();
    error InvalidSlot();
    error NoAvailableSlot();
    error NotActive();
    error NotPauseGuardian();
    error NotTimelock();
    error PauseScopeActive();
    error SlotAlreadyOwned();
    error SlotNotOwned();
    error WrongEpoch();
    error WrongEpochState();
    error WrongSlotBond();
    error EpochCloseNotReached();
    error EpochRequestDeadlineNotReached();
    error EpochRequestDeadlineExpired();
    error EpochFulfillmentDeadlineNotReached();
    error EpochDrawDeadlineNotReached();
    error EpochDrawDeadlineExpired();
    error InvalidVrfFulfillment();
    error TimelyFulfillmentExists();
    error ActiveWithdrawalExists();
    error NoFifoWithdrawal();
    error OlderWithdrawalRoutingPending();
    error WithdrawalNotFound();
    error WithdrawalNotFifoHead();
    error WrongWithdrawalState();
    error ActiveSettlement();
    error InvalidSettlementCap();
    error NotSettlementController();
    error SettlementReturnHandleMismatch();
    error WrongLiquidityRoute();
    error WrongSettlement();
    error WinnerAclDelayNotReached();
    error WinnerNotFrozenParticipant();
    error NotFinalizedWinner();
    error BondReturnFailed();

    event PoolActivated(address indexed bootstrapAuthority, uint64 indexed firstEpochId);
    event PauseScopesAdded(uint8 indexed scopes, uint8 newMask);
    event PauseScopesRemoved(uint8 indexed scopes, uint8 newMask);
    event SlotReserved(address indexed owner, uint8 indexed slot);
    event SlotClosing(address indexed owner, uint8 indexed slot, uint64 indexed withdrawalId);
    event SlotReleased(address indexed owner, uint8 indexed slot, uint96 bondWei);
    event DepositProcessed(address indexed owner, uint8 indexed slot, uint64 indexed pendingEpoch);
    event EpochOpened(uint64 indexed epochId, uint64 openedAt, uint64 closesAt);
    event EpochFrozen(
        uint64 indexed epochId,
        bytes32 indexed snapshotCommitment,
        uint8 frozenSlotCount,
        uint64 requestDeadline
    );
    event EpochAbandoned(uint64 indexed epochId, AbandonReason reason);
    event EpochTerminal(uint64 indexed epochId, EpochOutcome outcome);
    event EpochRandomnessRequested(
        uint64 indexed epochId,
        uint256 indexed requestId,
        uint64 fulfillmentDeadline
    );
    event EpochRandomnessSynchronized(
        uint64 indexed epochId,
        uint256 indexed requestId,
        uint256 randomWord,
        uint64 drawDeadline
    );
    event EncryptedDrawExecuted(
        uint64 indexed epochId,
        bytes32 indexed winnerHandle,
        uint64 aclGrantNotBeforeBlock
    );
    event WinnerFinalized(uint64 indexed epochId, address indexed winner);
    event EpochNoWinner(uint64 indexed epochId);
    event EpochPrizeAuthorized(uint64 indexed epochId, address indexed winner);
    event PrizeClaimProcessed(uint64 indexed epochId, address indexed winner);
    event WithdrawalRequested(uint64 indexed requestId, uint8 indexed slot, address indexed owner);
    event WithdrawalRoutingProofReady(
        uint64 indexed requestId,
        bytes32 indexed booleanHandle,
        uint32 version
    );
    event WithdrawalRouted(
        uint64 indexed requestId,
        WithdrawalRoute route,
        uint64 fifoSequence
    );
    event WithdrawalPayoutProcessed(uint64 indexed requestId, uint32 version);
    event WithdrawalCompletionProofReady(
        uint64 indexed requestId,
        bytes32 indexed booleanHandle,
        uint32 version
    );
    event WithdrawalCompleted(uint64 indexed requestId, address indexed owner);

    constructor(Dependencies memory dependencies, Configuration memory configuration) {
        if (
            dependencies.confidentialToken == address(0) ||
            dependencies.vrfAdapter == address(0) ||
            dependencies.settlementController == address(0) ||
            dependencies.bootstrapAuthority == address(0) ||
            dependencies.timelock == address(0) ||
            dependencies.pauseGuardian == address(0)
        ) revert InvalidConfiguration();

        if (
            configuration.epochDuration != epochDuration ||
            configuration.requestTimeout != requestTimeout ||
            configuration.fulfillmentTimeout != fulfillmentTimeout ||
            configuration.drawTimeout != drawTimeout ||
            configuration.winnerAclDelayBlocks != winnerAclDelayBlocks ||
            configuration.slotBondWei != slotBondWei ||
            configuration.liquidityTargetBps != liquidityTargetBps
        ) revert InvalidConfiguration();

        IConfidentialTokenWrapper token = IConfidentialTokenWrapper(dependencies.confidentialToken);
        address underlying_ = token.underlying();
        if (
            token.decimals() != 6 ||
            token.rate() != 1 ||
            underlying_ == address(0) ||
            IERC20Metadata(underlying_).decimals() != 6
        ) revert InvalidAssetConfiguration();

        confidentialToken = token;
        vrfAdapter = IPoolVrfAdapter(dependencies.vrfAdapter);
        settlementController = ISettlementController(dependencies.settlementController);
        underlying = underlying_;
        bootstrapAuthority = dependencies.bootstrapAuthority;
        timelock = dependencies.timelock;
        pauseGuardian = dependencies.pauseGuardian;

    }

    modifier onlyActive() {
        if (!active) revert NotActive();
        _;
    }

    function activate() external nonReentrant {
        address authority = bootstrapAuthority;
        if (msg.sender != authority) revert BootstrapOnly();

        if (vrfAdapter.pool() != address(this) || vrfAdapter.timelock() != timelock) {
            revert DependencyBindingMismatch();
        }
        if (
            settlementController.pool() != address(this) ||
            settlementController.confidentialToken() != address(confidentialToken) ||
            settlementController.underlying() != underlying ||
            settlementController.timelock() != timelock ||
            settlementController.pauseGuardian() != pauseGuardian
        ) revert DependencyBindingMismatch();

        _totalPrincipalLiability = _newPoolZero();
        _confidentialPrincipalLiquidity = _newPoolZero();
        _principalInFlight = _newPoolZero();
        _confidentialClaimLiquidity = _newPoolZero();
        _totalQueuedPrincipal = _newPoolZero();
        _prizeReserve = _newPoolZero();

        active = true;
        bootstrapAuthority = address(0);
        _openEpoch(1);
        emit PoolActivated(authority, 1);
    }

    function pause(uint8 scopes) external {
        if (
            msg.sender != pauseGuardian &&
            (msg.sender != address(settlementController) || scopes != ALL_PAUSE_SCOPES)
        ) revert NotPauseGuardian();
        if (scopes == 0 || scopes & ~ALL_PAUSE_SCOPES != 0) revert InvalidPauseScopes();
        pauseMask |= scopes;
        emit PauseScopesAdded(scopes, pauseMask);
    }

    function unpause(uint8 scopes) external {
        if (msg.sender != timelock) revert NotTimelock();
        if (settlementController.lossMode()) revert PauseScopeActive();
        if (scopes == 0 || scopes & ~ALL_PAUSE_SCOPES != 0) revert InvalidPauseScopes();
        pauseMask &= ~scopes;
        emit PauseScopesRemoved(scopes, pauseMask);
    }

    function reserveSlot() external payable onlyActive nonReentrant returns (uint8 slot) {
        _requireScopeOpen(PAUSE_SLOT_RESERVATION);
        if (msg.value != slotBondWei) revert WrongSlotBond();
        if (_slotByOwner[msg.sender] != 0) revert SlotAlreadyOwned();

        for (uint8 index = 0; index < PARTICIPANT_CAPACITY; ++index) {
            if (_slots[index].status == SlotStatus.FREE) {
                Slot storage available = _slots[index];
                available.owner = msg.sender;
                available.status = SlotStatus.RESERVED;
                available.bondWei = slotBondWei;
                _slotByOwner[msg.sender] = index + 1;
                emit SlotReserved(msg.sender, index);
                return index;
            }
        }

        revert NoAvailableSlot();
    }

    function onConfidentialTransferReceived(
        address,
        address from,
        euint64 amount,
        bytes calldata data
    ) external nonReentrant returns (ebool accepted) {
        if (msg.sender != address(confidentialToken)) revert InvalidAssetConfiguration();
        if (!_isDepositRoute(data)) return _rejectedTransfer();
        if (!active || pauseMask & PAUSE_DEPOSITS != 0) return _rejectedTransfer();

        uint8 slotPlusOne = _slotByOwner[from];
        if (slotPlusOne == 0) return _rejectedTransfer();

        uint8 slotIndex = slotPlusOne - 1;
        Slot storage slot = _slots[slotIndex];
        if (slot.status == SlotStatus.CLOSING || slot.owner != from) return _rejectedTransfer();

        if (slot.status == SlotStatus.RESERVED) slot.status = SlotStatus.ACTIVE;

        euint64 oldPrincipal = _normalized(slot.principal);
        euint64 oldPending = _normalized(slot.pendingWeight);
        euint64 oldLiability = _normalized(_totalPrincipalLiability);
        euint64 oldLiquidity = _normalized(_confidentialPrincipalLiquidity);

        (ebool principalOk, euint64 principalNext) = FHESafeMath.tryIncrease(oldPrincipal, amount);
        (ebool pendingOk, euint64 pendingNext) = FHESafeMath.tryIncrease(oldPending, amount);
        (ebool liabilityOk, euint64 liabilityNext) = FHESafeMath.tryIncrease(oldLiability, amount);
        (ebool liquidityOk, euint64 liquidityNext) = FHESafeMath.tryIncrease(oldLiquidity, amount);

        accepted = FHE.gt(amount, FHE.asEuint64(0));
        accepted = FHE.and(accepted, principalOk);
        accepted = FHE.and(accepted, pendingOk);
        accepted = FHE.and(accepted, liabilityOk);
        accepted = FHE.and(accepted, liquidityOk);

        slot.principal = FHE.select(accepted, principalNext, oldPrincipal);
        slot.pendingWeight = FHE.select(accepted, pendingNext, oldPending);
        _totalPrincipalLiability = FHE.select(accepted, liabilityNext, oldLiability);
        _confidentialPrincipalLiquidity = FHE.select(accepted, liquidityNext, oldLiquidity);

        _allowOwner(slot.principal, from);
        _allowOwner(slot.pendingWeight, from);
        FHE.allowThis(_totalPrincipalLiability);
        FHE.allowThis(_confidentialPrincipalLiquidity);
        FHE.allowTransient(accepted, msg.sender);

        emit DepositProcessed(from, slotIndex, _pendingEpochForDeposit());
    }

    function freezeEpoch(uint64 epochId) external onlyActive {
        if (epochId != currentEpochId) revert WrongEpoch();
        Epoch storage epoch = _epochs[epochId];
        if (epoch.status != EpochStatus.OPEN) {
            revert WrongEpochState();
        }
        if (block.timestamp < epoch.closesAt) revert EpochCloseNotReached();

        epoch.status = EpochStatus.FROZEN;
        epoch.frozenAt = uint64(block.timestamp);
        epoch.requestDeadline = uint64(block.timestamp) + requestTimeout;

        address[PARTICIPANT_CAPACITY] memory owners;
        bytes32[PARTICIPANT_CAPACITY] memory snapshotHandles;
        uint8 frozenSlotCount;

        for (uint8 index = 0; index < PARTICIPANT_CAPACITY; ++index) {
            Slot storage slot = _slots[index];
            address owner = slot.owner;
            owners[index] = owner;
            epoch.slotOwners[index] = owner;

            euint64 weight = owner == address(0) ? FHE.asEuint64(0) : _normalized(slot.eligibleWeight);
            FHE.allowThis(weight);
            epoch.weightSnapshot[index] = weight;
            snapshotHandles[index] = euint64.unwrap(weight);

            if (owner != address(0)) {
                ++frozenSlotCount;
                slot.lastReferencedEpoch = epochId;
            }
        }

        epoch.frozenSlotCount = frozenSlotCount;
        epoch.snapshotCommitment = keccak256(
            abi.encode(
                block.chainid,
                address(this),
                epochId,
                owners,
                snapshotHandles,
                epoch.closesAt,
                lastTerminalEpochId
            )
        );

        epoch.epochPrize = _normalized(_prizeReserve);
        FHE.allowThis(epoch.epochPrize);
        _prizeReserve = _newPoolZero();

        for (uint8 index = 0; index < PARTICIPANT_CAPACITY; ++index) {
            Slot storage slot = _slots[index];
            if (slot.owner == address(0)) continue;

            euint64 eligible = _normalized(slot.eligibleWeight);
            euint64 pending = _normalized(slot.pendingWeight);
            slot.eligibleWeight = FHE.add(eligible, pending);
            slot.pendingWeight = FHE.asEuint64(0);
            _allowOwner(slot.eligibleWeight, slot.owner);
            _allowOwner(slot.pendingWeight, slot.owner);
        }

        emit EpochFrozen(epochId, epoch.snapshotCommitment, frozenSlotCount, epoch.requestDeadline);
    }

    function abandonUnrequestedEpoch(uint64 epochId) external onlyActive {
        if (epochId != currentEpochId) revert WrongEpoch();
        Epoch storage epoch = _epochs[epochId];
        if (epoch.status != EpochStatus.FROZEN) {
            revert WrongEpochState();
        }
        if (block.timestamp < epoch.requestDeadline) {
            revert EpochRequestDeadlineNotReached();
        }

        _abandonEpoch(epoch, AbandonReason.REQUEST_TIMEOUT);
    }

    function requestEpochRandomness(uint64 epochId) external onlyActive returns (uint256 requestId) {
        if (epochId != currentEpochId) revert WrongEpoch();
        Epoch storage epoch = _epochs[epochId];
        if (epoch.status != EpochStatus.FROZEN) {
            revert WrongEpochState();
        }
        if (block.timestamp > epoch.requestDeadline) {
            revert EpochRequestDeadlineExpired();
        }

        requestId = vrfAdapter.requestRandomness(epochId, epoch.snapshotCommitment);
        if (requestId == 0) revert InvalidVrfFulfillment();
        epoch.vrfRequestId = requestId;
        epoch.fulfillmentDeadline = uint64(block.timestamp) + fulfillmentTimeout;
        epoch.status = EpochStatus.RANDOMNESS_REQUESTED;
        emit EpochRandomnessRequested(epochId, requestId, epoch.fulfillmentDeadline);
    }

    function syncEpochRandomness(uint64 epochId) external onlyActive {
        if (epochId != currentEpochId) revert WrongEpoch();
        Epoch storage epoch = _epochs[epochId];
        if (epoch.status != EpochStatus.RANDOMNESS_REQUESTED) {
            revert WrongEpochState();
        }

        IPoolVrfAdapter.Fulfillment memory fulfillment = vrfAdapter.getFulfillment(epoch.vrfRequestId);
        if (
            !fulfillment.fulfilled ||
            fulfillment.epochId != epochId ||
            fulfillment.snapshotCommitment != epoch.snapshotCommitment ||
            fulfillment.fulfilledAt > epoch.fulfillmentDeadline
        ) revert InvalidVrfFulfillment();

        uint64 drawDeadline = fulfillment.fulfilledAt + drawTimeout;
        if (block.timestamp > drawDeadline) revert EpochDrawDeadlineExpired();
        epoch.randomWord = fulfillment.randomWord;
        epoch.randomFulfilledAt = fulfillment.fulfilledAt;
        epoch.drawDeadline = drawDeadline;
        epoch.status = EpochStatus.DRAW_READY;
        emit EpochRandomnessSynchronized(
            epochId,
            epoch.vrfRequestId,
            fulfillment.randomWord,
            drawDeadline
        );
    }

    function abandonUnfulfilledEpoch(uint64 epochId) external onlyActive {
        if (epochId != currentEpochId) revert WrongEpoch();
        Epoch storage epoch = _epochs[epochId];
        if (epoch.status != EpochStatus.RANDOMNESS_REQUESTED) {
            revert WrongEpochState();
        }
        if (block.timestamp <= epoch.fulfillmentDeadline) {
            revert EpochFulfillmentDeadlineNotReached();
        }

        IPoolVrfAdapter.Fulfillment memory fulfillment = vrfAdapter.getFulfillment(epoch.vrfRequestId);
        if (fulfillment.fulfilled && fulfillment.fulfilledAt <= epoch.fulfillmentDeadline) {
            revert TimelyFulfillmentExists();
        }
        _abandonEpoch(epoch, AbandonReason.FULFILLMENT_TIMEOUT);
    }

    function abandonUnexecutedEpoch(uint64 epochId) external onlyActive {
        if (epochId != currentEpochId) revert WrongEpoch();
        Epoch storage epoch = _epochs[epochId];
        uint64 deadline;

        if (epoch.status == EpochStatus.RANDOMNESS_REQUESTED) {
            IPoolVrfAdapter.Fulfillment memory fulfillment = vrfAdapter.getFulfillment(
                epoch.vrfRequestId
            );
            if (
                !fulfillment.fulfilled ||
                fulfillment.fulfilledAt > epoch.fulfillmentDeadline
            ) revert InvalidVrfFulfillment();
            deadline = fulfillment.fulfilledAt + drawTimeout;
        } else if (epoch.status == EpochStatus.DRAW_READY) {
            deadline = epoch.drawDeadline;
        } else {
            revert WrongEpochState();
        }

        if (block.timestamp <= deadline) revert EpochDrawDeadlineNotReached();
        _abandonEpoch(epoch, AbandonReason.DRAW_TIMEOUT);
    }

    function executeEncryptedDraw(uint64 epochId) external onlyActive {
        if (epochId != currentEpochId) revert WrongEpoch();
        Epoch storage epoch = _epochs[epochId];
        if (epoch.status != EpochStatus.DRAW_READY) {
            revert WrongEpochState();
        }
        if (block.timestamp > epoch.drawDeadline) {
            revert EpochDrawDeadlineExpired();
        }

        euint128[PARTICIPANT_CAPACITY] memory wideWeights;
        for (uint256 index = 0; index < PARTICIPANT_CAPACITY; ++index) {
            euint64 weight = epoch.slotOwners[index] == address(0)
                ? FHE.asEuint64(0)
                : epoch.weightSnapshot[index];
            wideWeights[index] = FHE.asEuint128(weight);
        }

        for (uint256 stride = 1; stride < PARTICIPANT_CAPACITY; stride <<= 1) {
            uint256 step = stride << 1;
            for (uint256 index = 0; index < PARTICIPANT_CAPACITY; index += step) {
                wideWeights[index] = FHE.add(
                    wideWeights[index],
                    wideWeights[index + stride]
                );
            }
        }

        euint128 wideTotal = wideWeights[0];
        ebool overflow = FHE.gt(wideTotal, uint128(type(uint64).max));
        euint64 zero = FHE.asEuint64(0);
        euint64 safeTotal = FHE.select(overflow, zero, FHE.asEuint64(wideTotal));

        euint64[PARTICIPANT_CAPACITY] memory prefixes;
        for (uint256 index = 0; index < PARTICIPANT_CAPACITY; ++index) {
            euint64 weight = epoch.slotOwners[index] == address(0)
                ? zero
                : epoch.weightSnapshot[index];
            prefixes[index] = FHE.select(overflow, zero, weight);
        }

        for (
            uint256 blockSize = 2;
            blockSize <= PARTICIPANT_CAPACITY;
            blockSize <<= 1
        ) {
            uint256 half = blockSize >> 1;
            for (
                uint256 blockStart = 0;
                blockStart < PARTICIPANT_CAPACITY;
                blockStart += blockSize
            ) {
                euint64 leftTotal = prefixes[blockStart + half - 1];
                for (
                    uint256 index = blockStart + half;
                    index < blockStart + blockSize;
                    ++index
                ) {
                    prefixes[index] = FHE.add(prefixes[index], leftTotal);
                }
            }
        }

        uint64 randomScalar = uint64(epoch.randomWord);
        euint128 product = FHE.mul(FHE.asEuint128(safeTotal), uint128(randomScalar));
        euint64 threshold = FHE.asEuint64(FHE.shr(product, 64));
        eaddress winner = FHE.asEaddress(address(0));
        ebool previousCross = FHE.asEbool(false);

        for (uint256 index = 0; index < PARTICIPANT_CAPACITY; ++index) {
            ebool cross = FHE.lt(threshold, prefixes[index]);
            ebool match_ = index == 0
                ? cross
                : FHE.and(cross, FHE.not(previousCross));
            winner = FHE.select(match_, FHE.asEaddress(epoch.slotOwners[index]), winner);
            previousCross = cross;
        }

        epoch.encryptedWinner = winner;
        epoch.aclGrantNotBeforeBlock = uint64(block.number) + winnerAclDelayBlocks;
        epoch.status = EpochStatus.REVEAL_PENDING;
        FHE.allowThis(epoch.encryptedWinner);
        FHE.makePubliclyDecryptable(epoch.encryptedWinner);

        emit EncryptedDrawExecuted(
            epochId,
            eaddress.unwrap(winner),
            epoch.aclGrantNotBeforeBlock
        );
    }

    function finalizeWinner(
        uint64 epochId,
        address clearWinner,
        bytes calldata proof
    ) external onlyActive {
        Epoch storage epoch = _epochs[epochId];
        if (epoch.status != EpochStatus.REVEAL_PENDING) {
            revert WrongEpochState();
        }
        if (block.number < epoch.aclGrantNotBeforeBlock) {
            revert WinnerAclDelayNotReached();
        }

        bytes32[] memory handles = new bytes32[](1);
        handles[0] = eaddress.unwrap(epoch.encryptedWinner);
        FHE.checkSignatures(handles, abi.encode(clearWinner), proof);

        epoch.finalizedWinner = clearWinner;
        epoch.terminalAt = uint64(block.timestamp);
        epoch.status = EpochStatus.TERMINAL;
        lastTerminalEpochId = epochId;

        if (clearWinner == address(0)) {
            _rollEpochPrize(epoch);
            epoch.outcome = EpochOutcome.NO_ELIGIBLE_WEIGHT;
            emit EpochNoWinner(epochId);
            emit EpochTerminal(epochId, EpochOutcome.NO_ELIGIBLE_WEIGHT);
            return;
        }

        bool participant;
        for (uint8 index = 0; index < PARTICIPANT_CAPACITY; ++index) {
            if (epoch.slotOwners[index] == clearWinner) {
                participant = true;
                break;
            }
        }
        if (!participant) revert WinnerNotFrozenParticipant();

        FHE.allow(epoch.epochPrize, clearWinner);
        epoch.outcome = EpochOutcome.WINNER;
        emit WinnerFinalized(epochId, clearWinner);
        emit EpochPrizeAuthorized(epochId, clearWinner);
        emit EpochTerminal(epochId, EpochOutcome.WINNER);
    }

    function claimPrize(uint64 epochId) external onlyActive nonReentrant {
        Epoch storage epoch = _epochs[epochId];
        if (
            epoch.status != EpochStatus.TERMINAL ||
            epoch.outcome != EpochOutcome.WINNER ||
            epoch.finalizedWinner != msg.sender
        ) revert NotFinalizedWinner();

        euint64 prize = _normalized(epoch.epochPrize);
        FHE.allowTransient(prize, address(confidentialToken));
        euint64 sent = confidentialToken.confidentialTransfer(msg.sender, prize);
        epoch.epochPrize = FHE.sub(prize, sent);
        FHE.allowThis(epoch.epochPrize);
        FHE.allow(epoch.epochPrize, msg.sender);
        emit PrizeClaimProcessed(epochId, msg.sender);
    }

    function openNextEpoch() external onlyActive {
        _requireScopeOpen(PAUSE_EPOCH_OPEN);
        EpochStatus status = _epochs[currentEpochId].status;
        if (status != EpochStatus.TERMINAL && status != EpochStatus.ABANDONED) {
            revert WrongEpochState();
        }
        _openEpoch(currentEpochId + 1);
    }

    function requestWithdrawal(
        externalEuint64 requestedInput,
        bytes calldata inputProof,
        bool closing
    ) external onlyActive nonReentrant returns (uint64 withdrawalId) {
        uint8 slotPlusOne = _slotByOwner[msg.sender];
        if (slotPlusOne == 0) revert SlotNotOwned();

        uint8 slotIndex = slotPlusOne - 1;
        Slot storage slot = _slots[slotIndex];
        if (slot.activeWithdrawalId != 0) revert ActiveWithdrawalExists();
        if (slot.status == SlotStatus.CLOSING) revert WrongWithdrawalState();
        euint64 requested = closing
            ? _normalized(slot.principal)
            : FHE.fromExternal(requestedInput, inputProof);
        if (closing) slot.status = SlotStatus.CLOSING;

        (euint64 allowed, euint64 remaining) = _debitAndPayImmediate(
            slot,
            msg.sender,
            requested
        );

        withdrawalId = nextWithdrawalId++;
        uint64 fifoSequence = nextFifoSequence++;
        WithdrawalTicket storage ticket = _withdrawals[withdrawalId];
        ticket.id = withdrawalId;
        ticket.slot = slotIndex;
        ticket.owner = msg.sender;
        ticket.createdAt = uint64(block.timestamp);
        ticket.fifoSequence = fifoSequence;
        ticket.version = 1;
        ticket.status = WithdrawalStatus.ROUTING_PENDING;
        ticket.requestedAllowed = allowed;
        ticket.remainingClaim = remaining;

        ebool hasRemainder = FHE.gt(remaining, FHE.asEuint64(0));
        FHE.allowThis(hasRemainder);
        FHE.makePubliclyDecryptable(hasRemainder);
        ticket.routingHasRemainder = hasRemainder;

        _allowOwner(ticket.requestedAllowed, msg.sender);
        _allowOwner(ticket.remainingClaim, msg.sender);
        slot.activeWithdrawalId = withdrawalId;

        emit WithdrawalRequested(withdrawalId, slotIndex, msg.sender);
        emit WithdrawalRoutingProofReady(withdrawalId, ebool.unwrap(hasRemainder), 1);
        if (closing) emit SlotClosing(msg.sender, slotIndex, withdrawalId);
    }

    function releaseSlot(uint8 slotIndex) external onlyActive nonReentrant {
        if (slotIndex >= PARTICIPANT_CAPACITY) revert InvalidSlot();
        Slot storage slot = _slots[slotIndex];
        if (slot.owner != msg.sender) revert SlotNotOwned();
        if (slot.status != SlotStatus.RESERVED && slot.status != SlotStatus.CLOSING) {
            revert WrongWithdrawalState();
        }
        if (slot.activeWithdrawalId != 0) revert ActiveWithdrawalExists();

        uint64 referencedEpoch = slot.lastReferencedEpoch;
        if (referencedEpoch != 0) {
            EpochStatus status = _epochs[referencedEpoch].status;
            if (status != EpochStatus.TERMINAL && status != EpochStatus.ABANDONED) {
                revert WrongEpochState();
            }
        }

        address owner = slot.owner;
        uint96 bond = slot.bondWei;
        delete _slotByOwner[owner];
        delete _slots[slotIndex];
        (bool success, ) = payable(owner).call{value: bond}("");
        if (!success) revert BondReturnFailed();
        emit SlotReleased(owner, slotIndex, bond);
    }

    function finalizeWithdrawalRouting(
        uint64 withdrawalId,
        bool hasRemainder,
        bytes calldata proof
    ) external onlyActive {
        WithdrawalTicket storage ticket = _withdrawal(withdrawalId);
        if (ticket.status != WithdrawalStatus.ROUTING_PENDING) {
            revert WrongWithdrawalState();
        }

        _verifyPublicBool(ticket.routingHasRemainder, hasRemainder, proof);
        if (hasRemainder) {
            ticket.status = WithdrawalStatus.QUEUED;
            emit WithdrawalRouted(withdrawalId, WithdrawalRoute.QUEUED, ticket.fifoSequence);
            return;
        }

        ticket.status = WithdrawalStatus.IMMEDIATE_SETTLED;
        _clearActiveWithdrawal(ticket);
        emit WithdrawalRouted(withdrawalId, WithdrawalRoute.IMMEDIATE, ticket.fifoSequence);
        emit WithdrawalCompleted(withdrawalId, ticket.owner);
    }

    function serviceFifoHead() external onlyActive nonReentrant returns (uint64 withdrawalId) {
        withdrawalId = _fifoHeadId();
        if (withdrawalId == 0) revert NoFifoWithdrawal();

        WithdrawalTicket storage ticket = _withdrawals[withdrawalId];
        if (ticket.status == WithdrawalStatus.ROUTING_PENDING) {
            revert OlderWithdrawalRoutingPending();
        }
        if (ticket.status != WithdrawalStatus.QUEUED) {
            revert WrongWithdrawalState();
        }

        euint64 claim = _normalized(ticket.remainingClaim);
        euint64 liquidity = _normalized(_confidentialClaimLiquidity);
        euint64 payableAmount = FHE.min(claim, liquidity);
        FHE.allowTransient(payableAmount, address(confidentialToken));
        euint64 sent = confidentialToken.confidentialTransfer(ticket.owner, payableAmount);

        ticket.remainingClaim = FHE.sub(claim, sent);
        _totalQueuedPrincipal = FHE.sub(_normalized(_totalQueuedPrincipal), sent);
        _confidentialClaimLiquidity = FHE.sub(liquidity, sent);
        _totalPrincipalLiability = FHE.sub(_normalized(_totalPrincipalLiability), sent);
        _allowOwner(ticket.remainingClaim, ticket.owner);
        FHE.allowThis(_totalQueuedPrincipal);
        FHE.allowThis(_confidentialClaimLiquidity);
        FHE.allowThis(_totalPrincipalLiability);

        unchecked {
            ++ticket.version;
        }
        ebool complete = FHE.eq(ticket.remainingClaim, FHE.asEuint64(0));
        FHE.allowThis(complete);
        FHE.makePubliclyDecryptable(complete);
        ticket.completionIsZero = complete;
        ticket.status = WithdrawalStatus.PAYOUT_STATUS_PENDING;

        emit WithdrawalPayoutProcessed(withdrawalId, ticket.version);
        emit WithdrawalCompletionProofReady(
            withdrawalId,
            ebool.unwrap(complete),
            ticket.version
        );
    }

    function finalizeWithdrawalCompletion(
        uint64 withdrawalId,
        bool complete,
        bytes calldata proof
    ) external onlyActive {
        WithdrawalTicket storage ticket = _withdrawal(withdrawalId);
        if (ticket.status != WithdrawalStatus.PAYOUT_STATUS_PENDING) {
            revert WrongWithdrawalState();
        }

        uint64 head = _fifoHeadId();
        if (head != withdrawalId) revert WithdrawalNotFifoHead();
        _verifyPublicBool(ticket.completionIsZero, complete, proof);

        if (complete) {
            ticket.status = WithdrawalStatus.CLAIMED;
            _clearActiveWithdrawal(ticket);
            emit WithdrawalCompleted(withdrawalId, ticket.owner);
            return;
        }

        ticket.status = WithdrawalStatus.QUEUED;
        emit WithdrawalRouted(withdrawalId, WithdrawalRoute.QUEUED, ticket.fifoSequence);
    }

    function beginInvestmentSettlement(
        uint64 publicCap
    ) external onlyActive nonReentrant returns (uint64 settlementId) {
        _requireScopeOpen(PAUSE_INVESTMENT);
        _requireNoActiveSettlement();
        if (publicCap == 0) revert InvalidSettlementCap();

        euint64 liability = _normalized(_totalPrincipalLiability);
        euint128 targetWide = FHE.div(
            FHE.mul(FHE.asEuint128(liability), uint128(liquidityTargetBps)),
            uint128(BPS_DENOMINATOR)
        );
        euint64 target = FHE.asEuint64(targetWide);
        euint64 liquidity = _normalized(_confidentialPrincipalLiquidity);
        ebool aboveTarget = FHE.gt(liquidity, target);
        euint64 excess = FHE.select(
            aboveTarget,
            FHE.sub(liquidity, target),
            FHE.asEuint64(0)
        );
        euint64 requested = FHE.min(excess, FHE.asEuint64(publicCap));
        FHE.allowTransient(requested, address(confidentialToken));
        bytes32 wrapperRequestId = confidentialToken.unwrap(
            address(this),
            address(settlementController),
            requested
        );
        euint64 actualAmount = confidentialToken.unwrapAmount(wrapperRequestId);
        FHE.allowThis(actualAmount);
        FHE.allow(actualAmount, address(settlementController));

        settlementId = settlementController.startInvestment(
            wrapperRequestId,
            actualAmount,
            publicCap
        );
        _confidentialPrincipalLiquidity = FHE.sub(liquidity, actualAmount);
        _principalInFlight = FHE.add(_normalized(_principalInFlight), actualAmount);
        FHE.allowThis(_confidentialPrincipalLiquidity);
        FHE.allowThis(_principalInFlight);

        _startPoolSettlement(
            settlementId,
            SettlementKind.INVEST_PRINCIPAL,
            LiquidityRoute.NONE,
            euint64.unwrap(actualAmount)
        );
    }

    function beginWithdrawalSettlement(
        uint64 publicCap
    ) external onlyActive returns (uint64 settlementId) {
        _requireNoActiveSettlement();
        if (publicCap == 0) revert InvalidSettlementCap();

        uint64 headId = _fifoHeadId();
        if (headId == 0) revert NoFifoWithdrawal();
        WithdrawalStatus headStatus = _withdrawals[headId].status;
        if (headStatus == WithdrawalStatus.ROUTING_PENDING) {
            revert OlderWithdrawalRoutingPending();
        }
        if (headStatus != WithdrawalStatus.QUEUED) revert WrongWithdrawalState();

        euint64 queued = _normalized(_totalQueuedPrincipal);
        euint64 claimLiquidity = _normalized(_confidentialClaimLiquidity);
        ebool shortfallExists = FHE.gt(queued, claimLiquidity);
        euint64 shortfall = FHE.select(
            shortfallExists,
            FHE.sub(queued, claimLiquidity),
            FHE.asEuint64(0)
        );
        euint64 aggregate = FHE.min(shortfall, FHE.asEuint64(publicCap));
        FHE.allowThis(aggregate);
        FHE.allow(aggregate, address(settlementController));
        FHE.makePubliclyDecryptable(aggregate);
        settlementId = settlementController.startPrincipalRedemption(aggregate, publicCap);
        _startPoolSettlement(
            settlementId,
            SettlementKind.REDEEM_PRINCIPAL,
            LiquidityRoute.PRINCIPAL_CLAIM,
            euint64.unwrap(aggregate)
        );
    }

    function beginYieldHarvest(
        uint64 publicCap
    ) external onlyActive returns (uint64 settlementId) {
        _requireNoActiveSettlement();
        if (publicCap == 0) revert InvalidSettlementCap();
        settlementId = settlementController.startYieldHarvest(publicCap);
        _startPoolSettlement(
            settlementId,
            SettlementKind.HARVEST_YIELD,
            LiquidityRoute.PRIZE_RESERVE,
            bytes32(0)
        );
    }

    function onInvestmentSettlementFinalized(uint64 settlementId) external onlyActive {
        _requireSettlementController();
        _requireActivePoolSettlement(settlementId);
        if (_activeSettlementKind != SettlementKind.INVEST_PRINCIPAL) {
            revert WrongSettlement();
        }

        euint64 amount = euint64.wrap(_activeSettlementAggregateHandle);
        _principalInFlight = FHE.sub(_normalized(_principalInFlight), amount);
        FHE.allowThis(_principalInFlight);
        _completePoolSettlement();
    }

    function onSettlementLiquidityReturned(
        uint64 settlementId,
        uint8 routeValue,
        euint64 actualWrapped
    ) external onlyActive nonReentrant {
        _requireSettlementController();
        _requireActivePoolSettlement(settlementId);
        LiquidityRoute route = LiquidityRoute(routeValue);
        if (route != _activeSettlementRoute) revert WrongLiquidityRoute();

        bytes32 expectedHandle = settlementController.returnHandle(settlementId);
        bytes32 suppliedHandle = euint64.unwrap(actualWrapped);
        if (expectedHandle != suppliedHandle) {
            revert SettlementReturnHandleMismatch();
        }

        if (route == LiquidityRoute.PRINCIPAL_CLAIM) {
            _confidentialClaimLiquidity = FHE.add(
                _normalized(_confidentialClaimLiquidity),
                actualWrapped
            );
            FHE.allowThis(_confidentialClaimLiquidity);
        } else if (route == LiquidityRoute.PRIZE_RESERVE) {
            _prizeReserve = FHE.add(_normalized(_prizeReserve), actualWrapped);
            FHE.allowThis(_prizeReserve);
        } else {
            revert WrongLiquidityRoute();
        }

        _completePoolSettlement();
    }

    function slotOf(address owner) external view returns (bool occupied, uint8 slot) {
        uint8 slotPlusOne = _slotByOwner[owner];
        return slotPlusOne == 0 ? (false, 0) : (true, slotPlusOne - 1);
    }

    function slotPublic(
        uint8 slot
    ) external view returns (address owner, SlotStatus status, uint96 bondWei, uint64 activeWithdrawalId, uint64 lastReferencedEpoch) {
        if (slot >= PARTICIPANT_CAPACITY) revert InvalidSlot();
        Slot storage record = _slots[slot];
        return (record.owner, record.status, record.bondWei, record.activeWithdrawalId, record.lastReferencedEpoch);
    }

    function principalHandle(address owner) external view returns (euint64) {
        uint8 slotPlusOne = _slotByOwner[owner];
        if (slotPlusOne == 0) return euint64.wrap(bytes32(0));
        return _slots[slotPlusOne - 1].principal;
    }

    function weightHandles(address owner) external view returns (euint64 eligible, euint64 pending) {
        uint8 slotPlusOne = _slotByOwner[owner];
        if (slotPlusOne == 0) return (euint64.wrap(bytes32(0)), euint64.wrap(bytes32(0)));
        Slot storage slot = _slots[slotPlusOne - 1];
        return (slot.eligibleWeight, slot.pendingWeight);
    }

    function epochPublic(
        uint64 epochId
    )
        external
        view
        returns (
            EpochStatus status,
            uint64 openedAt,
            uint64 closesAt,
            uint64 frozenAt,
            uint64 requestDeadline,
            uint8 frozenSlotCount,
            bytes32 snapshotCommitment
        )
    {
        Epoch storage epoch = _epochs[epochId];
        return (
            epoch.status,
            epoch.openedAt,
            epoch.closesAt,
            epoch.frozenAt,
            epoch.requestDeadline,
            epoch.frozenSlotCount,
            epoch.snapshotCommitment
        );
    }

    function epochSlotOwner(uint64 epochId, uint8 slot) external view returns (address) {
        if (slot >= PARTICIPANT_CAPACITY) revert InvalidSlot();
        return _epochs[epochId].slotOwners[slot];
    }

    function epochWeightHandle(uint64 epochId, uint8 slot) external view returns (euint64) {
        if (slot >= PARTICIPANT_CAPACITY) revert InvalidSlot();
        return _epochs[epochId].weightSnapshot[slot];
    }

    function epochRandomness(
        uint64 epochId
    )
        external
        view
        returns (
            uint256 requestId,
            uint64 fulfillmentDeadline,
            uint256 randomWord,
            uint64 fulfilledAt,
            uint64 drawDeadline
        )
    {
        Epoch storage epoch = _epochs[epochId];
        return (
            epoch.vrfRequestId,
            epoch.fulfillmentDeadline,
            epoch.randomWord,
            epoch.randomFulfilledAt,
            epoch.drawDeadline
        );
    }

    function epochWinner(
        uint64 epochId
    )
        external
        view
        returns (
            eaddress encryptedWinner,
            uint64 aclGrantNotBeforeBlock,
            address finalizedWinner,
            bool winnerFinalized
        )
    {
        Epoch storage epoch = _epochs[epochId];
        return (
            epoch.encryptedWinner,
            epoch.aclGrantNotBeforeBlock,
            epoch.finalizedWinner,
            epoch.status == EpochStatus.TERMINAL
        );
    }

    function prizeHandle(uint64 epochId) external view returns (euint64) {
        return _epochs[epochId].epochPrize;
    }

    function withdrawalHandle(uint64 withdrawalId) external view returns (euint64) {
        return _withdrawals[withdrawalId].remainingClaim;
    }

    function withdrawalPublic(
        uint64 withdrawalId
    )
        external
        view
        returns (
            uint8 slot,
            address owner,
            uint64 createdAt,
            uint64 fifoSequence,
            uint64 settlementId,
            uint32 version,
            WithdrawalStatus status,
            bytes32 routingHandle,
            bytes32 completionHandle
        )
    {
        WithdrawalTicket storage ticket = _withdrawals[withdrawalId];
        if (ticket.id == 0) revert WithdrawalNotFound();
        return (
            ticket.slot,
            ticket.owner,
            ticket.createdAt,
            ticket.fifoSequence,
            ticket.settlementId,
            ticket.version,
            ticket.status,
            ebool.unwrap(ticket.routingHasRemainder),
            ebool.unwrap(ticket.completionIsZero)
        );
    }

    function fifoHead() external view returns (uint64 withdrawalId, WithdrawalStatus status) {
        withdrawalId = _fifoHeadId();
        status = withdrawalId == 0
            ? WithdrawalStatus.NONE
            : _withdrawals[withdrawalId].status;
    }

    function _openEpoch(uint64 epochId) internal {
        Epoch storage epoch = _epochs[epochId];
        if (epoch.status != EpochStatus.NONE) {
            revert WrongEpochState();
        }

        uint64 openedAt = uint64(block.timestamp);
        epoch.id = epochId;
        epoch.status = EpochStatus.OPEN;
        epoch.openedAt = openedAt;
        epoch.closesAt = openedAt + epochDuration;
        currentEpochId = epochId;
        emit EpochOpened(epochId, openedAt, epoch.closesAt);
    }

    function _rollEpochPrize(Epoch storage epoch) internal {
        euint64 reserve = _normalized(_prizeReserve);
        euint64 prize = _normalized(epoch.epochPrize);
        (ebool reserveOk, euint64 reserveNext) = FHESafeMath.tryIncrease(reserve, prize);
        _prizeReserve = FHE.select(reserveOk, reserveNext, reserve);
        FHE.allowThis(_prizeReserve);

        euint64 zero = _newPoolZero();
        epoch.epochPrize = FHE.select(reserveOk, zero, prize);
        FHE.allowThis(epoch.epochPrize);
    }

    function _abandonEpoch(Epoch storage epoch, AbandonReason reason) internal {
        _rollEpochPrize(epoch);
        epoch.status = EpochStatus.ABANDONED;
        epoch.terminalAt = uint64(block.timestamp);
        epoch.outcome = EpochOutcome.ABANDONED_TIMEOUT;
        lastTerminalEpochId = epoch.id;
        emit EpochAbandoned(epoch.id, reason);
        emit EpochTerminal(epoch.id, EpochOutcome.ABANDONED_TIMEOUT);
    }

    function _debitAndPayImmediate(
        Slot storage slot,
        address owner,
        euint64 requested
    ) internal returns (euint64 allowed, euint64 remaining) {
        euint64 principal = _normalized(slot.principal);
        euint64 eligible = _normalized(slot.eligibleWeight);
        euint64 pending = _normalized(slot.pendingWeight);
        euint64 principalLiquidity = _normalized(_confidentialPrincipalLiquidity);

        allowed = FHE.min(requested, principal);
        euint64 immediate = FHE.min(allowed, principalLiquidity);
        FHE.allowTransient(immediate, address(confidentialToken));
        euint64 sent = confidentialToken.confidentialTransfer(owner, immediate);
        remaining = FHE.sub(allowed, sent);

        euint64 eligibleReduction = FHE.min(allowed, eligible);
        euint64 pendingReduction = FHE.min(FHE.sub(allowed, eligibleReduction), pending);
        slot.principal = FHE.sub(principal, allowed);
        slot.eligibleWeight = FHE.sub(eligible, eligibleReduction);
        slot.pendingWeight = FHE.sub(pending, pendingReduction);
        _confidentialPrincipalLiquidity = FHE.sub(principalLiquidity, sent);
        _totalPrincipalLiability = FHE.sub(_normalized(_totalPrincipalLiability), sent);
        _totalQueuedPrincipal = FHE.add(_normalized(_totalQueuedPrincipal), remaining);

        _allowOwner(slot.principal, owner);
        _allowOwner(slot.eligibleWeight, owner);
        _allowOwner(slot.pendingWeight, owner);
        FHE.allowThis(_confidentialPrincipalLiquidity);
        FHE.allowThis(_totalPrincipalLiability);
        FHE.allowThis(_totalQueuedPrincipal);
    }

    function _withdrawal(
        uint64 withdrawalId
    ) internal view returns (WithdrawalTicket storage ticket) {
        ticket = _withdrawals[withdrawalId];
        if (ticket.id == 0) revert WithdrawalNotFound();
    }

    function _fifoHeadId() internal view returns (uint64 headId) {
        uint64 headSequence = type(uint64).max;
        for (uint8 index = 0; index < PARTICIPANT_CAPACITY; ++index) {
            uint64 withdrawalId = _slots[index].activeWithdrawalId;
            if (withdrawalId == 0) continue;
            WithdrawalTicket storage ticket = _withdrawals[withdrawalId];
            if (ticket.fifoSequence < headSequence) {
                headSequence = ticket.fifoSequence;
                headId = withdrawalId;
            }
        }
    }

    function _clearActiveWithdrawal(WithdrawalTicket storage ticket) internal {
        Slot storage slot = _slots[ticket.slot];
        if (slot.activeWithdrawalId == ticket.id) slot.activeWithdrawalId = 0;
    }

    function _verifyPublicBool(ebool handle, bool clearValue, bytes calldata proof) internal {
        bytes32[] memory handles = new bytes32[](1);
        handles[0] = ebool.unwrap(handle);
        FHE.checkSignatures(handles, abi.encode(clearValue), proof);
    }

    function _startPoolSettlement(
        uint64 settlementId,
        SettlementKind kind,
        LiquidityRoute route,
        bytes32 aggregateHandle
    ) internal {
        if (settlementId == 0 || activeSettlementId != 0) revert WrongSettlement();
        activeSettlementId = settlementId;
        _activeSettlementKind = kind;
        _activeSettlementRoute = route;
        _activeSettlementAggregateHandle = aggregateHandle;
    }

    function _requireActivePoolSettlement(uint64 settlementId) internal view {
        if (activeSettlementId != settlementId) revert WrongSettlement();
    }

    function _completePoolSettlement() internal {
        activeSettlementId = 0;
    }

    function _requireNoActiveSettlement() internal view {
        if (activeSettlementId != 0) revert ActiveSettlement();
    }

    function _requireSettlementController() internal view {
        if (msg.sender != address(settlementController)) {
            revert NotSettlementController();
        }
    }

    function _pendingEpochForDeposit() internal view returns (uint64) {
        EpochStatus status = _epochs[currentEpochId].status;
        return status == EpochStatus.OPEN ? currentEpochId + 1 : currentEpochId + 2;
    }

    function _isDepositRoute(bytes calldata data) internal pure returns (bool) {
        return data.length == 32 && abi.decode(data, (bytes4)) == DEPOSIT_ROUTE;
    }

    function _rejectedTransfer() internal returns (ebool rejected) {
        rejected = FHE.asEbool(false);
        FHE.allowTransient(rejected, msg.sender);
    }

    function _normalized(euint64 value) internal returns (euint64) {
        return FHE.isInitialized(value) ? value : FHE.asEuint64(0);
    }

    function _newPoolZero() internal returns (euint64 zero) {
        zero = FHE.asEuint64(0);
        FHE.allowThis(zero);
    }

    function _allowOwner(euint64 value, address owner) internal {
        FHE.allowThis(value);
        FHE.allow(value, owner);
    }

    function _requireScopeOpen(uint8 scope) internal view {
        if (pauseMask & scope != 0) revert PauseScopeActive();
    }
}
