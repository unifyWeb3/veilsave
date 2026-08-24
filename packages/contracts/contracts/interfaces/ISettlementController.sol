// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {euint64} from "@fhevm/solidity/lib/FHE.sol";

interface ISettlementController {
    function pool() external view returns (address);

    function confidentialToken() external view returns (address);

    function underlying() external view returns (address);

    function timelock() external view returns (address);

    function pauseGuardian() external view returns (address);

    function lossMode() external view returns (bool);

    function startInvestment(
        bytes32 unwrapRequestId,
        euint64 actualAmount,
        uint64 publicCap
    ) external returns (uint64 settlementId);

    function startPrincipalRedemption(
        euint64 aggregateAmount,
        uint64 publicCap
    ) external returns (uint64 settlementId);

    function startYieldHarvest(uint64 publicCap) external returns (uint64 settlementId);

    function executeSettlement(uint64 settlementId) external;

    function returnHandle(uint64 settlementId) external view returns (bytes32);
}
