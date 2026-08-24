// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {euint64} from "@fhevm/solidity/lib/FHE.sol";

interface IConfidentialPrizePoolSettlement {
    function pause(uint8 scopes) external;

    function onInvestmentSettlementFinalized(uint64 settlementId) external;

    function onSettlementLiquidityReturned(
        uint64 settlementId,
        uint8 route,
        euint64 actualWrapped
    ) external;
}
