import { describe, expect, it } from "vitest";

import { parseSettlementPublicId } from "./recovery";

describe("settlement recovery references", () => {
  it("parses canonical settlement IDs and operation suffixes", () => {
    expect(parseSettlementPublicId("12")).toBe(12n);
    expect(parseSettlementPublicId("12:aggregate")).toBe(12n);
    expect(parseSettlementPublicId("12:execute")).toBe(12n);
    expect(parseSettlementPublicId("12:retry")).toBe(12n);
  });

  it("rejects transaction hashes, unknown suffixes, and zero", () => {
    expect(parseSettlementPublicId("0xabc")).toBeNull();
    expect(parseSettlementPublicId("12:unknown")).toBeNull();
    expect(parseSettlementPublicId("0")).toBeNull();
  });
});
