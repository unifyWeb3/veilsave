// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {VRFV2PlusClient} from "./vendor/chainlink/VRFV2PlusClient.sol";
import {VRFV2PlusWrapperConsumerBase} from "./vendor/chainlink/VRFV2PlusWrapperConsumerBase.sol";

contract PoolVrfAdapter is VRFV2PlusWrapperConsumerBase {
    uint32 public constant CALLBACK_GAS_LIMIT = 100_000;
    uint16 public constant REQUEST_CONFIRMATIONS = 3;
    uint32 public constant NUM_WORDS = 1;

    enum IgnoreReason {
        UNKNOWN_REQUEST,
        DUPLICATE_FULFILLMENT,
        EMPTY_WORDS
    }

    struct RequestRecord {
        uint64 epochId;
        bytes32 snapshotCommitment;
        uint64 requestedAt;
        uint64 requestedBlock;
        uint256 randomWord;
        uint64 fulfilledAt;
        uint64 fulfilledBlock;
        bool fulfilled;
    }

    address public immutable timelock;
    address public pool;
    address public bootstrapAuthority;
    uint256 public pendingRequestCount;

    mapping(uint64 epochId => uint256 requestId) public requestForEpoch;
    mapping(uint256 requestId => RequestRecord record) internal _requests;

    error AlreadyBound();
    error BootstrapOnly(address caller);
    error EpochAlreadyRequested(uint64 epochId, uint256 requestId);
    error InvalidConfiguration();
    error NativeTransferFailed();
    error NotPool(address caller);
    error NotTimelock(address caller);
    error PendingRequests(uint256 count);

    event PoolBound(address indexed pool);
    event VrfFunded(address indexed funder, uint256 amount);
    event VrfRequestCreated(
        uint256 indexed requestId,
        uint64 indexed epochId,
        bytes32 snapshotCommitment,
        uint256 price
    );
    event VrfFulfilled(uint256 indexed requestId, uint64 indexed epochId, uint64 fulfilledAt);
    event VrfFulfillmentIgnored(
        uint256 indexed requestId,
        uint64 indexed epochId,
        IgnoreReason reason
    );
    event VrfSurplusWithdrawn(address indexed recipient, uint256 amount);

    constructor(
        address wrapper,
        address bootstrapAuthority_,
        address timelock_
    ) VRFV2PlusWrapperConsumerBase(wrapper) {
        if (
            wrapper == address(0) ||
            bootstrapAuthority_ == address(0) ||
            timelock_ == address(0)
        ) revert InvalidConfiguration();
        bootstrapAuthority = bootstrapAuthority_;
        timelock = timelock_;
    }

    receive() external payable {
        emit VrfFunded(msg.sender, msg.value);
    }

    function fund() external payable {
        emit VrfFunded(msg.sender, msg.value);
    }

    function bindPool(address pool_) external {
        if (msg.sender != bootstrapAuthority) revert BootstrapOnly(msg.sender);
        if (pool != address(0) || pool_ == address(0)) revert AlreadyBound();
        pool = pool_;
        bootstrapAuthority = address(0);
        emit PoolBound(pool_);
    }

    function requestRandomness(
        uint64 epochId,
        bytes32 snapshotCommitment
    ) external returns (uint256 requestId) {
        if (msg.sender != pool) revert NotPool(msg.sender);
        uint256 existing = requestForEpoch[epochId];
        if (existing != 0) revert EpochAlreadyRequested(epochId, existing);

        requestForEpoch[epochId] = type(uint256).max;
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

        requestForEpoch[epochId] = requestId;
        RequestRecord storage record = _requests[requestId];
        record.epochId = epochId;
        record.snapshotCommitment = snapshotCommitment;
        record.requestedAt = uint64(block.timestamp);
        record.requestedBlock = uint64(block.number);
        ++pendingRequestCount;
        emit VrfRequestCreated(requestId, epochId, snapshotCommitment, price);
    }

    function getFulfillment(
        uint256 requestId
    )
        external
        view
        returns (
            uint64 epochId,
            bytes32 snapshotCommitment,
            uint256 randomWord,
            uint64 fulfilledAt,
            uint64 fulfilledBlock,
            bool fulfilled
        )
    {
        RequestRecord storage record = _requests[requestId];
        return (
            record.epochId,
            record.snapshotCommitment,
            record.randomWord,
            record.fulfilledAt,
            record.fulfilledBlock,
            record.fulfilled
        );
    }

    function requestRecord(
        uint256 requestId
    ) external view returns (RequestRecord memory) {
        return _requests[requestId];
    }

    function withdrawSurplus(address payable recipient, uint256 amount) external {
        if (msg.sender != timelock) revert NotTimelock(msg.sender);
        if (pendingRequestCount != 0) revert PendingRequests(pendingRequestCount);
        (bool success, ) = recipient.call{value: amount}("");
        if (!success) revert NativeTransferFailed();
        emit VrfSurplusWithdrawn(recipient, amount);
    }

    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {
        RequestRecord storage record = _requests[requestId];
        if (record.epochId == 0) {
            emit VrfFulfillmentIgnored(requestId, 0, IgnoreReason.UNKNOWN_REQUEST);
            return;
        }
        if (record.fulfilled) {
            emit VrfFulfillmentIgnored(
                requestId,
                record.epochId,
                IgnoreReason.DUPLICATE_FULFILLMENT
            );
            return;
        }
        if (randomWords.length == 0) {
            emit VrfFulfillmentIgnored(requestId, record.epochId, IgnoreReason.EMPTY_WORDS);
            return;
        }

        record.randomWord = randomWords[0];
        record.fulfilledAt = uint64(block.timestamp);
        record.fulfilledBlock = uint64(block.number);
        record.fulfilled = true;
        if (pendingRequestCount != 0) --pendingRequestCount;
        emit VrfFulfilled(requestId, record.epochId, record.fulfilledAt);
    }
}
