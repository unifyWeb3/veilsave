// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {LinkTokenInterface} from "./LinkTokenInterface.sol";
import {IVRFV2PlusWrapper} from "./IVRFV2PlusWrapper.sol";

abstract contract VRFV2PlusWrapperConsumerBase {
    error OnlyVRFWrapperCanFulfill(address have, address want);

    LinkTokenInterface internal immutable i_linkToken;
    IVRFV2PlusWrapper public immutable i_vrfV2PlusWrapper;

    constructor(address vrfV2PlusWrapperAddress) {
        IVRFV2PlusWrapper wrapper = IVRFV2PlusWrapper(vrfV2PlusWrapperAddress);
        i_linkToken = LinkTokenInterface(wrapper.link());
        i_vrfV2PlusWrapper = wrapper;
    }

    function requestRandomnessPayInNative(
        uint32 callbackGasLimit,
        uint16 requestConfirmations,
        uint32 numWords,
        bytes memory extraArgs
    ) internal returns (uint256 requestId, uint256 requestPrice) {
        requestPrice = i_vrfV2PlusWrapper.calculateRequestPriceNative(
            callbackGasLimit,
            numWords
        );
        requestId = i_vrfV2PlusWrapper.requestRandomWordsInNative{value: requestPrice}(
            callbackGasLimit,
            requestConfirmations,
            numWords,
            extraArgs
        );
    }

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal virtual;

    function rawFulfillRandomWords(uint256 requestId, uint256[] memory randomWords) external {
        address wrapper = address(i_vrfV2PlusWrapper);
        if (msg.sender != wrapper) revert OnlyVRFWrapperCanFulfill(msg.sender, wrapper);
        fulfillRandomWords(requestId, randomWords);
    }
}
