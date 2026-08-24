// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract DeterministicTestYieldVault is ERC4626 {
    using SafeERC20 for IERC20;

    uint8 public constant YIELD_MODE_TEST = 0;

    address public immutable timelock;
    address public immutable pauseGuardian;
    bytes32 public immutable strategyId;
    bool public depositsPaused;

    error DepositsPaused();
    error InvalidConfiguration();
    error NotPauseGuardian(address caller);
    error NotTimelock(address caller);
    error ZeroAssets();

    event TestYieldSponsored(address indexed sponsor, uint256 assets);
    event StrategyDepositPauseChanged(bool paused, address indexed caller);

    constructor(
        IERC20 asset_,
        address timelock_,
        address pauseGuardian_,
        bytes32 strategyId_
    ) ERC20("VeilSave TEST YIELD Share", "vsTEST") ERC4626(asset_) {
        if (
            address(asset_) == address(0) ||
            timelock_ == address(0) ||
            pauseGuardian_ == address(0) ||
            strategyId_ == bytes32(0)
        ) revert InvalidConfiguration();
        timelock = timelock_;
        pauseGuardian = pauseGuardian_;
        strategyId = strategyId_;
    }

    function yieldMode() external pure returns (uint8) {
        return YIELD_MODE_TEST;
    }

    function sponsorTestYield(uint256 assets) external {
        if (assets == 0) revert ZeroAssets();
        IERC20(asset()).safeTransferFrom(msg.sender, address(this), assets);
        emit TestYieldSponsored(msg.sender, assets);
    }

    function pauseDeposits() external {
        if (msg.sender != pauseGuardian) revert NotPauseGuardian(msg.sender);
        depositsPaused = true;
        emit StrategyDepositPauseChanged(true, msg.sender);
    }

    function unpauseDeposits() external {
        if (msg.sender != timelock) revert NotTimelock(msg.sender);
        depositsPaused = false;
        emit StrategyDepositPauseChanged(false, msg.sender);
    }

    function maxDeposit(address receiver) public view override returns (uint256) {
        return depositsPaused ? 0 : super.maxDeposit(receiver);
    }

    function maxMint(address receiver) public view override returns (uint256) {
        return depositsPaused ? 0 : super.maxMint(receiver);
    }

    function _deposit(
        address caller,
        address receiver,
        uint256 assets,
        uint256 shares
    ) internal override {
        if (depositsPaused) revert DepositsPaused();
        super._deposit(caller, receiver, assets, shares);
    }
}
