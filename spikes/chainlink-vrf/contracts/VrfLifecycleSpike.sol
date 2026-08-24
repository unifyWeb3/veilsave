// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {VRFV2PlusClient} from "./vendor/VRFV2PlusClient.sol";
import {VRFV2PlusWrapperConsumerBase} from "./vendor/VRFV2PlusWrapperConsumerBase.sol";

/// @notice Disposable VRF lifecycle harness. It does not perform the FHE draw.
contract VrfLifecycleSpike is VRFV2PlusWrapperConsumerBase {
    enum EpochStatus {
        Unset,
        Frozen,
        RandomRequested,
        RandomReady,
        DrawExecuted,
        Expired
    }

    enum IgnoreReason {
        UnknownRequest,
        RequestMismatch,
        TerminalEpoch,
        EmptyWords
    }

    struct Epoch {
        bytes32 stateCommitment;
        uint256 requestId;
        uint256 randomWord;
        uint64 requestBlock;
        uint64 timeoutBlock;
        EpochStatus status;
    }

    error Unauthorized(address caller);
    error InvalidEpoch(uint64 epochId);
    error InvalidStatus(uint64 epochId, EpochStatus expected, EpochStatus actual);
    error TimeoutNotReached(uint64 epochId, uint64 timeoutBlock, uint256 currentBlock);
    error NativeTransferFailed();

    uint32 public constant CALLBACK_GAS_LIMIT = 100_000;
    uint16 public constant REQUEST_CONFIRMATIONS = 3;
    uint32 public constant NUM_WORDS = 1;
    uint64 public constant TIMEOUT_BLOCKS = 300;

    address public immutable controller;
    mapping(uint64 epochId => Epoch epoch) private _epochs;
    mapping(uint256 requestId => uint64 epochId) public epochForRequest;

    event EpochFrozen(uint64 indexed epochId, bytes32 indexed stateCommitment);
    event FrozenCommitmentUpdated(uint64 indexed epochId, bytes32 indexed stateCommitment);
    event RandomnessRequested(uint64 indexed epochId, uint256 indexed requestId, uint256 price);
    event RandomnessStored(uint64 indexed epochId, uint256 indexed requestId, uint256 randomWord);
    event FulfillmentIgnored(uint256 indexed requestId, uint64 indexed epochId, IgnoreReason reason);
    event DrawExecuted(uint64 indexed epochId, uint256 indexed requestId, bytes32 drawDigest);
    event EpochExpired(uint64 indexed epochId, uint256 indexed requestId);

    modifier onlyController() {
        if (msg.sender != controller) revert Unauthorized(msg.sender);
        _;
    }

    constructor(address wrapper) VRFV2PlusWrapperConsumerBase(wrapper) {
        controller = msg.sender;
    }

    receive() external payable {}

    function epoch(uint64 epochId) external view returns (Epoch memory) {
        return _epochs[epochId];
    }

    function freezeEpoch(uint64 epochId, bytes32 stateCommitment) external onlyController {
        if (epochId == 0) revert InvalidEpoch(epochId);
        Epoch storage current = _epochs[epochId];
        if (current.status != EpochStatus.Unset) {
            revert InvalidStatus(epochId, EpochStatus.Unset, current.status);
        }
        current.stateCommitment = stateCommitment;
        current.status = EpochStatus.Frozen;
        emit EpochFrozen(epochId, stateCommitment);
    }

    function updateFrozenCommitment(uint64 epochId, bytes32 stateCommitment) external onlyController {
        Epoch storage current = _epochs[epochId];
        if (current.status != EpochStatus.Frozen) {
            revert InvalidStatus(epochId, EpochStatus.Frozen, current.status);
        }
        current.stateCommitment = stateCommitment;
        emit FrozenCommitmentUpdated(epochId, stateCommitment);
    }

    function requestRandomness(uint64 epochId) external onlyController returns (uint256 requestId) {
        Epoch storage current = _epochs[epochId];
        if (current.status != EpochStatus.Frozen) {
            revert InvalidStatus(epochId, EpochStatus.Frozen, current.status);
        }

        bytes memory extraArgs = VRFV2PlusClient._argsToBytes(
            VRFV2PlusClient.ExtraArgsV1({nativePayment: true})
        );
        uint256 price;
        (requestId, price) = requestRandomnessPayInNative(
            CALLBACK_GAS_LIMIT,
            REQUEST_CONFIRMATIONS,
            NUM_WORDS,
            extraArgs
        );

        current.requestId = requestId;
        current.requestBlock = uint64(block.number);
        current.timeoutBlock = uint64(block.number) + TIMEOUT_BLOCKS;
        current.status = EpochStatus.RandomRequested;
        epochForRequest[requestId] = epochId;
        emit RandomnessRequested(epochId, requestId, price);
    }

    function executeDraw(uint64 epochId) external returns (bytes32 drawDigest) {
        Epoch storage current = _epochs[epochId];
        if (current.status != EpochStatus.RandomReady) {
            revert InvalidStatus(epochId, EpochStatus.RandomReady, current.status);
        }
        drawDigest = keccak256(
            abi.encode(current.stateCommitment, current.requestId, current.randomWord)
        );
        current.status = EpochStatus.DrawExecuted;
        emit DrawExecuted(epochId, current.requestId, drawDigest);
    }

    /// @dev Expiry permanently abandons the epoch. It does not enable a reroll.
    function expireEpoch(uint64 epochId) external {
        Epoch storage current = _epochs[epochId];
        if (current.status != EpochStatus.RandomRequested) {
            revert InvalidStatus(epochId, EpochStatus.RandomRequested, current.status);
        }
        if (block.number <= current.timeoutBlock) {
            revert TimeoutNotReached(epochId, current.timeoutBlock, block.number);
        }
        current.status = EpochStatus.Expired;
        emit EpochExpired(epochId, current.requestId);
    }

    function withdrawNative(address payable recipient) external onlyController {
        (bool success,) = recipient.call{value: address(this).balance}("");
        if (!success) revert NativeTransferFailed();
    }

    /// @dev Intentionally storage-only and non-reverting for known callback edge cases.
    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
        uint64 epochId = epochForRequest[requestId];
        if (epochId == 0) {
            emit FulfillmentIgnored(requestId, 0, IgnoreReason.UnknownRequest);
            return;
        }

        Epoch storage current = _epochs[epochId];
        if (current.requestId != requestId) {
            emit FulfillmentIgnored(requestId, epochId, IgnoreReason.RequestMismatch);
            return;
        }
        if (current.status != EpochStatus.RandomRequested) {
            emit FulfillmentIgnored(requestId, epochId, IgnoreReason.TerminalEpoch);
            return;
        }
        if (randomWords.length == 0) {
            emit FulfillmentIgnored(requestId, epochId, IgnoreReason.EmptyWords);
            return;
        }

        current.randomWord = randomWords[0];
        current.status = EpochStatus.RandomReady;
        emit RandomnessStored(epochId, requestId, randomWords[0]);
    }
}
