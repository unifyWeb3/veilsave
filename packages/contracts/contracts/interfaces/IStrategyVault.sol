// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";

interface IStrategyVault is IERC20 {
    function asset() external view returns (address);

    function deposit(uint256 assets, address receiver) external returns (uint256 shares);

    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) external returns (uint256 shares);

    function redeem(
        uint256 shares,
        address receiver,
        address owner
    ) external returns (uint256 assets);

    function maxWithdraw(address owner) external view returns (uint256 assets);

    function totalAssets() external view returns (uint256 assets);

    function yieldMode() external view returns (uint8 mode);

    function strategyId() external view returns (bytes32 id);
}
