// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {euint64} from "@fhevm/solidity/lib/FHE.sol";
import {IERC7984ERC20Wrapper} from "@openzeppelin/confidential-contracts/interfaces/IERC7984ERC20Wrapper.sol";

interface IConfidentialTokenWrapper is IERC7984ERC20Wrapper {
    function unwrap(address from, address to, euint64 amount) external returns (bytes32 requestId);

    function maxTotalSupply() external view returns (uint256);

    function inferredTotalSupply() external view returns (uint256);
}
