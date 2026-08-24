import { describe, expect, it } from "vitest";

import { MAX_UINT64 } from "../transactions/transactionUtils";
import { publicSettlementUint64 } from "./settlementUtils";

describe("public settlement aggregate decoding", () => {
  it("accepts supported public-decryption uint64 shapes", () => {
    expect(publicSettlementUint64(12n)).toBe(12n);
    expect(publicSettlementUint64(12)).toBe(12n);
    expect(publicSettlementUint64("12")).toBe(12n);
    expect(publicSettlementUint64(MAX_UINT64)).toBe(MAX_UINT64);
  });

  it("rejects malformed and out-of-range aggregate values", () => {
    expect(() => publicSettlementUint64(-1n)).toThrow(/uint64/i);
    expect(() => publicSettlementUint64(MAX_UINT64 + 1n)).toThrow(/uint64/i);
    expect(() => publicSettlementUint64("1.2")).toThrow(/uint64/i);
    expect(() => publicSettlementUint64({ value: 1 })).toThrow(/uint64/i);
  });
});
