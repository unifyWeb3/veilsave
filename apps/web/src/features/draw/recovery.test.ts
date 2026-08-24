import { describe, expect, it } from "vitest";

import { parseDrawRecoveryPublicId } from "./recovery";

describe("draw recovery references", () => {
  it("parses every persisted draw, winner, and prize action", () => {
    expect(parseDrawRecoveryPublicId("7:freeze")).toEqual({ epochId: 7n, action: "freeze" });
    expect(parseDrawRecoveryPublicId("7:finalize-winner")).toEqual({
      epochId: 7n,
      action: "finalize-winner",
    });
    expect(parseDrawRecoveryPublicId("7:claim-prize")).toEqual({
      epochId: 7n,
      action: "claim-prize",
    });
  });

  it("rejects unknown actions and non-positive epoch IDs", () => {
    expect(parseDrawRecoveryPublicId("0:freeze")).toBeNull();
    expect(parseDrawRecoveryPublicId("7:reroll")).toBeNull();
    expect(parseDrawRecoveryPublicId("0xabc")).toBeNull();
  });
});
