// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {IVRFV2PlusWrapper} from "../vendor/chainlink/IVRFV2PlusWrapper.sol";

interface IRawVrfConsumer {
    function rawFulfillRandomWords(uint256 requestId, uint256[] memory randomWords) external;
}

contract MockVrfV2PlusWrapper is IVRFV2PlusWrapper {
    uint256 public constant PRICE = 0.001 ether;
    uint256 public override lastRequestId;
    mapping(uint256 requestId => address consumer) public consumerForRequest;

    function calculateRequestPrice(uint32, uint32) external pure override returns (uint256) {
        return PRICE;
    }

    function calculateRequestPriceNative(uint32, uint32) external pure override returns (uint256) {
        return PRICE;
    }

    function estimateRequestPrice(
        uint32,
        uint32,
        uint256
    ) external pure override returns (uint256) {
        return PRICE;
    }

    function estimateRequestPriceNative(
        uint32,
        uint32,
        uint256
    ) external pure override returns (uint256) {
        return PRICE;
    }

    function requestRandomWordsInNative(
        uint32,
        uint16,
        uint32,
        bytes calldata
    ) external payable override returns (uint256 requestId) {
        require(msg.value == PRICE, "wrong price");
        requestId = ++lastRequestId;
        consumerForRequest[requestId] = msg.sender;
    }

    function link() external pure override returns (address) {
        return address(0x1111);
    }

    function linkNativeFeed() external pure override returns (address) {
        return address(0x2222);
    }

    function fulfill(uint256 requestId, uint256[] calldata randomWords) external {
        IRawVrfConsumer(consumerForRequest[requestId]).rawFulfillRandomWords(
            requestId,
            randomWords
        );
    }

    function fulfillTo(
        address consumer,
        uint256 requestId,
        uint256[] calldata randomWords
    ) external {
        IRawVrfConsumer(consumer).rawFulfillRandomWords(requestId, randomWords);
    }
}
