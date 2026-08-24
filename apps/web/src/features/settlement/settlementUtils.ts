import { MAX_UINT64 } from "../transactions/transactionUtils";

export function publicSettlementUint64(value: unknown): bigint {
  let parsed: bigint;
  if (typeof value === "bigint") parsed = value;
  else if (typeof value === "number" && Number.isSafeInteger(value)) parsed = BigInt(value);
  else if (typeof value === "string" && /^\d+$/.test(value.trim())) parsed = BigInt(value.trim());
  else throw new Error("The aggregate proof did not return a uint64 value.");

  if (parsed < 0n || parsed > MAX_UINT64) {
    throw new Error("The aggregate proof exceeded the uint64 settlement boundary.");
  }
  return parsed;
}
