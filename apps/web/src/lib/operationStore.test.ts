import { describe, expect, it } from "vitest";

import {
  listOperations,
  sanitizeError,
  saveOperation,
  type OperationRecord,
} from "./operationStore";

describe("privacy-safe operation storage", () => {
  it("persists only the public recovery allowlist", () => {
    const unsafeInput = {
      id: "veilsave:deposit:0xabc",
      kind: "deposit",
      publicId: "0xabc",
      txHash: "0xabc",
      expectedState: "callback-processed",
      chainId: 11155111,
      wallet: "0x1111111111111111111111111111111111111111",
      lastCheckedAt: 1,
      retryable: true,
      createdAt: 1,
      amount: "500.000000",
      inputProof: "secret-proof",
      decryptedValue: "500000000",
    } as unknown as OperationRecord;

    saveOperation(unsafeInput);

    const raw = window.localStorage.getItem("veilsave.operations.v1") ?? "";
    expect(raw).not.toContain("500.000000");
    expect(raw).not.toContain("secret-proof");
    expect(raw).not.toContain("decryptedValue");
    expect(listOperations()).toEqual([
      expect.objectContaining({
        kind: "deposit",
        txHash: "0xabc",
        chainId: 11155111,
        wallet: "0x1111111111111111111111111111111111111111",
      }),
    ]);
  });

  it("drops records with unknown operation kinds or malformed wallet context", () => {
    window.localStorage.setItem(
      "veilsave.operations.v1",
      JSON.stringify([
        {
          id: "veilsave:unknown:1",
          kind: "unknown",
          lastCheckedAt: 1,
          retryable: true,
          createdAt: 1,
        },
        {
          id: "veilsave:deposit:2",
          kind: "deposit",
          wallet: "not-an-address",
          lastCheckedAt: 2,
          retryable: true,
          createdAt: 2,
        },
      ]),
    );

    expect(listOperations()).toEqual([]);
  });

  it("prioritizes a wallet RPC failure over nested rejection text", () => {
    const message = sanitizeError(
      new Error(
        "RPC Request failed. method: eth_getTransactionCount Details: chain is not available on free plan. User rejected the request.",
      ),
    );
    expect(message).toMatch(/wallet's Sepolia RPC/i);
    expect(message).toMatch(/No transaction was submitted/i);
    expect(message).not.toMatch(/wallet request was rejected/i);
  });

  it("reports an actual wallet rejection without raw request details", () => {
    expect(sanitizeError(new Error("User rejected the request. Request Arguments: secret"))).toBe(
      "The wallet request was rejected. No transaction was submitted.",
    );
  });
});
