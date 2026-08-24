import { describe, expect, it } from "vitest";

import { WithdrawalStatus } from "../../protocol/types";
import { canonicalWithdrawalStage, parseWithdrawalPublicId } from "./recovery";

describe("withdrawal recovery state", () => {
  it("parses stable public ticket IDs and auxiliary operation suffixes", () => {
    expect(parseWithdrawalPublicId("12")).toBe(12n);
    expect(parseWithdrawalPublicId("12:routing")).toBe(12n);
    expect(parseWithdrawalPublicId("12:service")).toBe(12n);
    expect(parseWithdrawalPublicId("12:completion")).toBe(12n);
    expect(parseWithdrawalPublicId("0xabc")).toBeNull();
    expect(parseWithdrawalPublicId("12:unknown")).toBeNull();
  });

  it("maps canonical ticket status to the only safe recovery view", () => {
    expect(canonicalWithdrawalStage(WithdrawalStatus.ImmediateSettled)).toBe("immediate");
    expect(canonicalWithdrawalStage(WithdrawalStatus.Queued)).toBe("queued");
    expect(canonicalWithdrawalStage(WithdrawalStatus.PayoutStatusPending)).toBe("completion-proof");
    expect(canonicalWithdrawalStage(WithdrawalStatus.Claimed)).toBe("complete");
    expect(canonicalWithdrawalStage(WithdrawalStatus.RoutingPending)).toBeNull();
  });
});
