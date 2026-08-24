import { parseUnits } from "viem";
import { isAddress, type Address } from "viem";

import { saveOperation, type OperationKind } from "../../lib/operationStore";

export const MAX_UINT64 = (1n << 64n) - 1n;

export function parseCusdtAmount(raw: string): { value: bigint | null; error: string | null } {
  const value = raw.trim();
  if (!value) return { value: null, error: "Enter an amount." };
  if (!/^\d+(?:\.\d{0,6})?$/.test(value)) return { value: null, error: "Use a positive cUSDT amount with up to six decimals." };
  try {
    const parsed = parseUnits(value, 6);
    if (parsed <= 0n) return { value: null, error: "Amount must be greater than zero." };
    if (parsed > MAX_UINT64) return { value: null, error: "Amount exceeds the encrypted uint64 limit." };
    return { value: parsed, error: null };
  } catch {
    return { value: null, error: "Enter a valid six-decimal cUSDT amount." };
  }
}

export function operationId(kind: OperationKind, publicId: string): string {
  return `veilsave:${kind}:${publicId}`;
}

export function recordSubmittedOperation(
  kind: OperationKind,
  publicId: string,
  txHash: `0x${string}`,
  expectedState: string,
  context?: { chainId?: number; wallet?: Address; epochId?: bigint | string },
): void {
  const now = Date.now();
  saveOperation({
    id: operationId(kind, publicId),
    kind,
    chainId: context?.chainId,
    wallet: context?.wallet,
    publicId,
    epochId: context?.epochId?.toString(),
    txHash,
    expectedState,
    lastCheckedAt: now,
    retryable: true,
    createdAt: now,
  });
}

export function publicBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "bigint") return value !== 0n;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0" || normalized === "" || /^0x0*$/.test(normalized)) return false;
    try {
      return BigInt(normalized) !== 0n;
    } catch {
      return false;
    }
  }
  return false;
}

export function publicAddress(value: unknown): Address {
  if (typeof value !== "string" || !isAddress(value)) {
    throw new Error("The public winner proof did not return a valid address.");
  }
  return value as Address;
}

export function publicDecryptValue(
  clearValues: Readonly<Record<`0x${string}`, unknown>>,
  handle: `0x${string}`,
): unknown {
  const exact = clearValues[handle];
  if (exact !== undefined) return exact;
  const key = Object.keys(clearValues).find((candidate) => candidate.toLowerCase() === handle.toLowerCase());
  if (!key) throw new Error("The public decryption response did not include the expected handle.");
  return clearValues[key as `0x${string}`];
}
