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
    expect(
      screen.getByText(
        "Balances and odds remain hidden. The public can verify the randomness and authenticated execution trail, but cannot independently recompute the weighted result from plaintext balances.",
      ),
    ).toBeInTheDocument();
  });

  it("labels a terminal zero-winner epoch as outcome, never as winner", () => {
    const epoch: EpochSnapshot = {
      id: 1n,
      status: EpochStatus.Terminal,
      openedAt: 1n,
      closesAt: 2n,
      frozenAt: 3n,
      requestDeadline: 4n,
      frozenSlotCount: 2,
      snapshotCommitment: `0x${"ab".repeat(32)}`,
      requestId: 101598922990784706611885201372562388386219001989045154348585444616748394704164n,
      fulfillmentDeadline: 5n,
      vrfFulfilled: true,
      vrfFulfilledAt: 6n,
      vrfFulfilledBlock: 7n,
      randomWord: 88461112456373531647739938463615544495329127272595597028404404701203376358546n,
      fulfilledAt: 6n,
      drawDeadline: 8n,
      encryptedWinner: "0x6282993c2944b115876fa748e21731244c3eb0fa1cff0000000000aa36a70700",
      prizeHandle: ZERO,
      aclGrantNotBeforeBlock: 11633869n,
      finalizedWinner: "0x0000000000000000000000000000000000000000",
      winnerFinalized: true,
    };

    render(
      <DrawTimeline
        epoch={epoch}
        evidence={{ noWinnerTx: `0x${"cd".repeat(32)}` }}
        explorerUrl="https://sepolia.etherscan.io"
      />,
    );
    expect(screen.getByText("OUTCOME HANDLE")).toBeInTheDocument();
    expect(screen.getByText("Outcome handle")).toBeInTheDocument();
    expect(
      screen.getByText("Draw-output reference — decrypts to the zero address: no winner."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Winner handle")).not.toBeInTheDocument();
    expect(screen.queryByText("Winner address")).not.toBeInTheDocument();
    expect(screen.getAllByText("No winner · terminal").length).toBeGreaterThan(0);
    expect(
      screen.queryByText("0x0000000000000000000000000000000000000000"),
    ).not.toBeInTheDocument();
  });
});
