import { describe, expect, it } from "vitest";

import { parseCusdtAmount, publicAddress, publicBoolean, publicDecryptValue } from "./transactionUtils";

describe("transaction input helpers", () => {
  it("accepts six-decimal uint64 amounts and rejects unsafe inputs", () => {
    expect(parseCusdtAmount("1.234567")).toEqual({ value: 1_234_567n, error: null });
    expect(parseCusdtAmount("1.2345678").error).toMatch(/six decimals/i);
    expect(parseCusdtAmount("0").error).toMatch(/greater than zero/i);
    expect(parseCusdtAmount("18446744073709.551616").error).toMatch(/uint64/i);
  });

  it("normalizes authenticated public booleans without truthy-string mistakes", () => {
    expect(publicBoolean(false)).toBe(false);
    expect(publicBoolean("false")).toBe(false);
    expect(publicBoolean("0x00")).toBe(false);
    expect(publicBoolean(1n)).toBe(true);
    expect(publicBoolean("0x01")).toBe(true);
  });

  it("decodes authenticated winner addresses and matches handles case-insensitively", () => {
    const handle = `0x${"a".repeat(64)}` as const;
    const winner = "0x1111111111111111111111111111111111111111" as const;
    const values = { [handle.toUpperCase()]: winner } as unknown as Readonly<Record<`0x${string}`, unknown>>;
    expect(publicAddress(publicDecryptValue(values, handle))).toBe(winner);
  });

  it("rejects malformed winner values and responses without the expected handle", () => {
    const handle = `0x${"b".repeat(64)}` as const;
    expect(() => publicAddress("not-an-address")).toThrow(/valid address/i);
    expect(() => publicDecryptValue({}, handle)).toThrow(/expected handle/i);
  });
});
