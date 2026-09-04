import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import type { Address, Hex } from "viem";

import { poolAbi, settlementAbi, vrfAbi } from "../config/abis";
import { canReadDeployment, useDeployment } from "../providers/DeploymentProvider";
import type { PublicEventLog } from "./eventRange";

export type PublicHistoryKind =
  | "epoch"
  | "randomness"
  | "draw"
  | "winner"
  | "withdrawal"
  | "settlement"
  | "slot";

export interface PublicHistoryEntry {
  id: string;
  kind: PublicHistoryKind;
  label: string;
  detail: string;
  blockNumber: bigint;
  transactionHash: Hex;
  epochId?: bigint;
  publicId?: bigint;
  timestamp?: bigint;
  status: "verified" | "pending" | "terminal";
}

type PublicLog = PublicEventLog;

function asLog(value: unknown): PublicLog {
  return value as PublicLog;
}

function hashOf(log: PublicLog): Hex | undefined {
  return log.transactionHash;
}

function blockOf(log: PublicLog): bigint {
  return log.blockNumber ?? 0n;
}

function idOf(log: PublicLog, suffix: string): string {
  return `${log.transactionHash ?? "unknown"}:${log.logIndex ?? 0}:${suffix}`;
}

function bigintArg(log: PublicLog, key: string): bigint | undefined {
  const value = log.args?.[key];
  return typeof value === "bigint" ? value : undefined;
}

function entry(
  log: PublicLog,
  kind: PublicHistoryKind,
  label: string,
  detail: string,
  suffix: string,
  extra: Partial<Pick<PublicHistoryEntry, "epochId" | "publicId" | "timestamp" | "status">> = {},
): PublicHistoryEntry | null {
  const transactionHash = hashOf(log);
  if (!transactionHash) return null;
  return {
    id: idOf(log, suffix),
    kind,
    label,
    detail,
    blockNumber: blockOf(log),
    transactionHash,
    status: "verified",
    ...extra,
  };
}

export function usePublicHistory(limit = 24) {
  const { manifest, status: deploymentStatus, runtime } = useDeployment();
  const publicClient = usePublicClient({ chainId: runtime.chainId });

  return useQuery({
    queryKey: ["veilsave", "public-history", manifest?.sourceCommit, limit],
    enabled: Boolean(publicClient && manifest && canReadDeployment(deploymentStatus)),
    staleTime: 15_000,
    refetchInterval: 30_000,
    queryFn: async (): Promise<PublicHistoryEntry[]> => {
      if (!publicClient || !manifest) throw new Error("Public history client is unavailable");
      const pool = manifest.contracts.confidentialPrizePool.address as Address;
      const vrf = manifest.contracts.poolVrfAdapter.address as Address;
      const controller = manifest.contracts.settlementController.address as Address;
      const readEvents = (address: Address, abi: unknown, eventName: string) =>
        (
          publicClient as unknown as {
            getContractEvents: (parameters: Record<string, unknown>) => Promise<readonly unknown[]>;
          }
        ).getContractEvents({
          address,
          abi,
          eventName,
          fromBlock: BigInt(manifest.deploymentBlock),
        });

      const [
        opened,
        frozen,
        requested,
        synced,
        drawn,
        winners,
        noWinner,
        abandoned,
        terminal,
        withdrawals,
        routed,
        completed,
        reserved,
        released,
        fulfilled,
        settlements,
        settlementDone,
        settlementFailed,
      ] = await Promise.all([
        readEvents(pool, poolAbi, "EpochOpened"),
        readEvents(pool, poolAbi, "EpochFrozen"),
        readEvents(pool, poolAbi, "EpochRandomnessRequested"),
        readEvents(pool, poolAbi, "EpochRandomnessSynchronized"),
        readEvents(pool, poolAbi, "EncryptedDrawExecuted"),
        readEvents(pool, poolAbi, "WinnerFinalized"),
        readEvents(pool, poolAbi, "EpochNoWinner"),
        readEvents(pool, poolAbi, "EpochAbandoned"),
        readEvents(pool, poolAbi, "EpochTerminal"),
        readEvents(pool, poolAbi, "WithdrawalRequested"),
        readEvents(pool, poolAbi, "WithdrawalRouted"),
        readEvents(pool, poolAbi, "WithdrawalCompleted"),
        readEvents(pool, poolAbi, "SlotReserved"),
        readEvents(pool, poolAbi, "SlotReleased"),
        readEvents(vrf, vrfAbi, "VrfFulfilled"),
        readEvents(controller, settlementAbi, "SettlementStarted"),
        readEvents(controller, settlementAbi, "SettlementCompleted"),
        readEvents(controller, settlementAbi, "SettlementFailed"),
      ]);

      const rows: Array<PublicHistoryEntry | null> = [];
      for (const raw of opened) {
        const log = asLog(raw);
        rows.push(
          entry(
            log,
            "epoch",
            "Epoch opened",
            `Epoch ${bigintArg(log, "epochId")?.toString() ?? "—"} is accepting next-epoch savings.`,
            "opened",
            { epochId: bigintArg(log, "epochId"), timestamp: bigintArg(log, "openedAt") },
          ),
        );
      }
      for (const raw of frozen) {
        const log = asLog(raw);
        rows.push(
          entry(
            log,
            "epoch",
            "Eligibility frozen",
            `${bigintArg(log, "frozenSlotCount")?.toString() ?? "0"} of 16 public slots were snapshotted.`,
            "frozen",
            { epochId: bigintArg(log, "epochId") },
          ),
        );
      }
      for (const raw of requested) {
        const log = asLog(raw);
        rows.push(
          entry(
            log,
            "randomness",
            "VRF requested",
            `Chainlink request bound to epoch ${bigintArg(log, "epochId")?.toString() ?? "—"}.`,
            "requested",
            { epochId: bigintArg(log, "epochId") },
          ),
        );
      }
      for (const raw of fulfilled) {
        const log = asLog(raw);
        rows.push(
          entry(
            log,
            "randomness",
            "VRF fulfilled",
            `The stored random word is public; encrypted weights remain private.`,
            "fulfilled",
            { epochId: bigintArg(log, "epochId") },
          ),
        );
      }
      for (const raw of synced) {
        const log = asLog(raw);
        rows.push(
          entry(
            log,
            "randomness",
            "Randomness synchronized",
            `The fulfilled word is ready for the separate FHE draw.`,
            "synced",
            { epochId: bigintArg(log, "epochId") },
          ),
        );
      }
      for (const raw of drawn) {
        const log = asLog(raw);
        rows.push(
          entry(
            log,
            "draw",
            "Encrypted draw executed",
            `The validated 16-slot draw ran over frozen encrypted weights.`,
            "drawn",
            { epochId: bigintArg(log, "epochId") },
          ),
        );
      }
      for (const raw of winners) {
        const log = asLog(raw);
        rows.push(
          entry(
            log,
            "winner",
            "Winner finalized",
            `The winner address is public; the prize amount remains encrypted.`,
            "winner",
            { epochId: bigintArg(log, "epochId") },
          ),
        );
      }
      for (const raw of noWinner) {
        const log = asLog(raw);
        rows.push(
          entry(
            log,
            "winner",
            "No winner",
            `The epoch reached a terminal no-winner result. No reroll is possible.`,
            "no-winner",
            { epochId: bigintArg(log, "epochId"), status: "terminal" },
          ),
        );
      }
      for (const raw of abandoned) {
        const log = asLog(raw);
        rows.push(
          entry(
            log,
            "epoch",
            "Epoch abandoned",
            `The timeout was terminal. Frozen inputs were not rerolled.`,
            "abandoned",
            { epochId: bigintArg(log, "epochId"), status: "terminal" },
          ),
        );
      }
      for (const raw of terminal) {
        const log = asLog(raw);
        rows.push(
          entry(
            log,
            "epoch",
            "Epoch terminal",
            `The public lifecycle reached its terminal state.`,
            "terminal",
            { epochId: bigintArg(log, "epochId"), status: "terminal" },
          ),
        );
      }
      for (const raw of withdrawals) {
        const log = asLog(raw);
        rows.push(
          entry(
            log,
            "withdrawal",
            "Withdrawal requested",
            `Request ${bigintArg(log, "requestId")?.toString() ?? "—"} is bound to one slot.`,
            "requested",
            { publicId: bigintArg(log, "requestId") },
          ),
        );
      }
      for (const raw of routed) {
        const log = asLog(raw);
        rows.push(
          entry(
            log,
            "withdrawal",
            "Withdrawal routed",
            `The immediate or FIFO route was authenticated without publishing the amount.`,
            "routed",
            { publicId: bigintArg(log, "requestId") },
          ),
        );
      }
      for (const raw of completed) {
        const log = asLog(raw);
        rows.push(
          entry(
            log,
            "withdrawal",
            "Withdrawal completed",
            `The confidential payout reached terminal completion.`,
            "completed",
            { publicId: bigintArg(log, "requestId") },
          ),
        );
      }
      for (const raw of reserved) {
        const log = asLog(raw);
        rows.push(
          entry(
            log,
            "slot",
            "Slot reserved",
            `A public slot was reserved; savings amounts remain encrypted.`,
            "reserved",
          ),
        );
      }
      for (const raw of released) {
        const log = asLog(raw);
        rows.push(
          entry(
            log,
            "slot",
            "Slot released",
            `The public slot and refundable bond reached a safe terminal state.`,
            "released",
          ),
        );
      }
      for (const raw of settlements) {
        const log = asLog(raw);
        rows.push(
          entry(
            log,
            "settlement",
            "Settlement started",
            `Aggregate strategy work is public; individual liabilities remain encrypted.`,
            "started",
            { publicId: bigintArg(log, "settlementId") },
          ),
        );
      }
      for (const raw of settlementDone) {
        const log = asLog(raw);
        rows.push(
          entry(
            log,
            "settlement",
            "Settlement completed",
            `The aggregate strategy transition completed.`,
            "completed",
            { publicId: bigintArg(log, "settlementId") },
          ),
        );
      }
      for (const raw of settlementFailed) {
        const log = asLog(raw);
        rows.push(
          entry(
            log,
            "settlement",
            "Settlement retry available",
            `The aggregate operation failed at a retryable stage; no private claim was discarded.`,
            "failed",
            { publicId: bigintArg(log, "settlementId"), status: "pending" },
          ),
        );
      }

      return rows
        .filter((row): row is PublicHistoryEntry => row !== null)
        .sort((a, b) =>
          b.blockNumber > a.blockNumber
            ? 1
            : b.blockNumber < a.blockNumber
              ? -1
              : b.id.localeCompare(a.id),
        )
        .slice(0, limit);
    },
  });
}
