import { describe, expect, it, vi } from "vitest";

import { readEventRanges } from "./eventRange";

describe("readEventRanges", () => {
  it("splits an inclusive range without gaps or overlap", async () => {
    const reader = vi.fn(async (fromBlock: bigint, toBlock: bigint) => [`${fromBlock}-${toBlock}`]);

    await expect(readEventRanges(10n, 25n, reader, 7n)).resolves.toEqual([
      "10-16",
      "17-23",
      "24-25",
    ]);
    expect(reader).toHaveBeenCalledTimes(3);
  });

  it("returns no ranges when the deployment is above the current block", async () => {
    const reader = vi.fn();

    await expect(readEventRanges(12n, 11n, reader)).resolves.toEqual([]);
    expect(reader).not.toHaveBeenCalled();
  });

  it("rejects invalid ranges before touching the provider", async () => {
    const reader = vi.fn();

    await expect(readEventRanges(-1n, 2n, reader)).rejects.toThrow(/cannot be negative/i);
    await expect(readEventRanges(1n, 2n, reader, 0n)).rejects.toThrow(/must be positive/i);
    expect(reader).not.toHaveBeenCalled();
  });
});
