import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EpochStatus } from "../protocol/types";
import type { EpochSnapshot } from "../protocol/useProtocolSnapshot";
import { DrawTimeline } from "./DrawTimeline";

const ZERO = `0x${"0".repeat(64)}` as const;

describe("DrawTimeline", () => {
  it("renders the required public-verification limitation verbatim", () => {
    const epoch: EpochSnapshot = {
      id: 1n,
      status: EpochStatus.Open,
      openedAt: 1n,
      closesAt: 2n,
      frozenAt: 0n,
      requestDeadline: 0n,
      frozenSlotCount: 0,
      snapshotCommitment: ZERO,
      requestId: 0n,
      fulfillmentDeadline: 0n,
      vrfFulfilled: false,
      vrfFulfilledAt: 0n,
      vrfFulfilledBlock: 0n,
      randomWord: 0n,
      fulfilledAt: 0n,
      drawDeadline: 0n,
      encryptedWinner: ZERO,
      prizeHandle: ZERO,
      aclGrantNotBeforeBlock: 0n,
      finalizedWinner: "0x0000000000000000000000000000000000000000",
      winnerFinalized: false,
    };

    render(<DrawTimeline epoch={epoch} />);
    expect(screen.getByText("Balances and odds remain hidden. The public can verify the randomness and authenticated execution trail, but cannot independently recompute the weighted result from plaintext balances.")).toBeInTheDocument();
  });
});
