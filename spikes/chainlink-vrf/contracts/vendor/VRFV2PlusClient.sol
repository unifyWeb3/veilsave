// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

/// @dev Copied from Chainlink contracts-v1.3.0 for isolated spike reproducibility.
library VRFV2PlusClient {
    bytes4 public constant EXTRA_ARGS_V1_TAG = bytes4(keccak256("VRF ExtraArgsV1"));

    struct ExtraArgsV1 {
        bool nativePayment;
    }

    function _argsToBytes(ExtraArgsV1 memory extraArgs) internal pure returns (bytes memory) {
        return abi.encodeWithSelector(EXTRA_ARGS_V1_TAG, extraArgs);
    }
}
