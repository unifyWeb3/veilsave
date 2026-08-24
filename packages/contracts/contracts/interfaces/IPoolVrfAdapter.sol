// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

interface IPoolVrfAdapter {
    struct Fulfillment {
        uint64 epochId;
        bytes32 snapshotCommitment;
        uint256 randomWord;
        uint64 fulfilledAt;
        uint64 fulfilledBlock;
        bool fulfilled;
    }

    function pool() external view returns (address);

    function timelock() external view returns (address);

    function requestRandomness(uint64 epochId, bytes32 snapshotCommitment) external returns (uint256 requestId);

    function getFulfillment(uint256 requestId) external view returns (Fulfillment memory fulfillment);
}
