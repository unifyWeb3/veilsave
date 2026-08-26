export type OperationKind =
  | "asset-wrap"
  | "slot-reservation"
  | "deposit"
  | "withdrawal"
  | "draw"
  | "winner-proof"
  | "prize-reveal"
  | "settlement";

const OPERATION_KINDS: ReadonlySet<string> = new Set<OperationKind>([
  "asset-wrap",
  "slot-reservation",
  "deposit",
  "withdrawal",
  "draw",
  "winner-proof",
  "prize-reveal",
  "settlement",
]);

export interface OperationRecord {
  id: string;
  kind: OperationKind;
  chainId?: number;
  wallet?: `0x${string}`;
  publicId?: string;
  epochId?: string;
  txHash?: `0x${string}`;
  replacementHash?: `0x${string}`;
  expectedState?: string;
  lastCheckedBlock?: string;
  lastCheckedAt: number;
  retryable: boolean;
  createdAt: number;
}

const STORAGE_KEY = "veilsave.operations.v1";
const listeners = new Set<() => void>();

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readRecords(): OperationRecord[] {
  if (!canUseStorage()) return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is OperationRecord => {
      if (typeof item !== "object" || item === null) return false;
      const record = item as Partial<OperationRecord>;
      return (
        typeof record.id === "string" &&
        typeof record.kind === "string" &&
        OPERATION_KINDS.has(record.kind) &&
        typeof record.lastCheckedAt === "number" &&
        Number.isFinite(record.lastCheckedAt) &&
        typeof record.retryable === "boolean" &&
        typeof record.createdAt === "number" &&
        Number.isFinite(record.createdAt) &&
        (record.chainId === undefined ||
          (typeof record.chainId === "number" && Number.isSafeInteger(record.chainId))) &&
        (record.wallet === undefined || /^0x[0-9a-fA-F]{40}$/.test(record.wallet))
      );
    });
  } catch {
    return [];
  }
}

function writeRecords(records: OperationRecord[]): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(records.slice(0, 50).map(publicFieldsOnly)),
  );
  for (const listener of listeners) listener();
}

function publicFieldsOnly(record: OperationRecord): OperationRecord {
  return {
    id: record.id,
    kind: record.kind,
    chainId: record.chainId,
    wallet: record.wallet,
    publicId: record.publicId,
    epochId: record.epochId,
    txHash: record.txHash,
    replacementHash: record.replacementHash,
    expectedState: record.expectedState,
    lastCheckedBlock: record.lastCheckedBlock,
    lastCheckedAt: record.lastCheckedAt,
    retryable: record.retryable,
    createdAt: record.createdAt,
  };
}

export function findOperation(id: string): OperationRecord | undefined {
  return readRecords().find((item) => item.id === id);
}

export function listOperations(): OperationRecord[] {
  return readRecords().sort((a, b) => b.lastCheckedAt - a.lastCheckedAt);
}

export function saveOperation(record: OperationRecord): void {
  const records = readRecords().filter((item) => item.id !== record.id);
  writeRecords([record, ...records]);
}

export function updateOperation(id: string, patch: Partial<OperationRecord>): void {
  const records = readRecords();
  const index = records.findIndex((item) => item.id === id);
  if (index < 0) return;
  const current = records[index];
  if (!current) return;
  records[index] = { ...current, ...patch, lastCheckedAt: Date.now() };
  writeRecords(records);
}

export function removeOperation(id: string): void {
  writeRecords(readRecords().filter((item) => item.id !== id));
}

export function subscribeOperations(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function sanitizeError(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    const message = error.message;
    if (
      /RPC Request failed/i.test(message) ||
      /chain is not available on free plan/i.test(message) ||
      /eth_getTransactionCount/i.test(message)
    ) {
      return "The wallet's Sepolia RPC could not prepare the transaction. Change the wallet's Sepolia RPC endpoint, then retry. No transaction was submitted.";
    }
    if (/User rejected|User denied|rejected the request/i.test(message)) {
      return "The wallet request was rejected. No transaction was submitted.";
    }
    return message
      .replace(/0x[0-9a-fA-F]{64,}/g, "[redacted]")
      .replace(
        /(?:amount|value|balance|proof|ciphertext|handle)\s*[:=]\s*[^\s,;]+/gi,
        "$1: [redacted]",
      );
  }
  return "The operation could not be completed. No confidential value was stored.";
}
