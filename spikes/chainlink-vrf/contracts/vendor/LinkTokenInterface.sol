// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @dev Minimal subset used by Chainlink's v1.3.0 wrapper consumer base.
interface LinkTokenInterface {
    function transferAndCall(address to, uint256 value, bytes calldata data) external returns (bool success);
}
