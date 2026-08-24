import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import type { Address, Hex } from "viem";

import { poolAbi, vrfAbi } from "../config/abis";
import { useDeployment } from "../providers/DeploymentProvider";
import type { PublicEventLog } from "./eventRange";

export interface EpochEvidence {
  freezeTx?: Hex;
  requestTx?: Hex;
  vrfFulfillmentTx?: Hex;
  syncTx?: Hex;
  drawTx?: Hex;
  winnerTx?: Hex;
  noWinnerTx?: Hex;
  abandonedTx?: Hex;
  terminalTx?: Hex;
  prizeClaimTx?: Hex;
}

function lastTransactionHash(logs: readonly { transactionHash?: Hex | null }[]): Hex | undefined {
  return logs.at(-1)?.transactionHash ?? undefined;
}

export function useEpochEvidence(epochId: bigint | undefined) {
  const { manifest, status: deploymentStatus } = useDeployment();
  const publicClient = usePublicClient({ chainId: manifest?.chainId ?? 11155111 });

  return useQuery({
    queryKey: ["veilsave", "epoch-evidence", manifest?.sourceCommit, epochId?.toString()],
    enabled: Boolean(
      publicClient && manifest && deploymentStatus === "ready" && epochId !== undefined,
    ),
    staleTime: 15_000,
    refetchInterval: 30_000,
    queryFn: async (): Promise<EpochEvidence> => {
      if (!publicClient || !manifest || epochId === undefined)
        throw new Error("Epoch evidence client is unavailable");
      const pool = manifest.contracts.confidentialPrizePool.address as Address;
      const vrf = manifest.contracts.poolVrfAdapter.address as Address;
      const readEvents = (address: Address, abi: unknown, eventName: string) =>
        (publicClient as unknown as {
          getContractEvents: (parameters: Record<string, unknown>) => Promise<readonly unknown[]>;
        }).getContractEvents({
          address,
          abi,
          eventName,
          args: { epochId },
          fromBlock: BigInt(manifest.deploymentBlock),
        }) as Promise<
          readonly PublicEventLog[]
        >;

      const [
        frozen,
        requested,
        synchronized,
        drawn,
        winner,
        noWinner,
        abandoned,
        terminal,
        claimed,
        fulfilled,
      ] = await Promise.all([
        readEvents(pool, poolAbi, "EpochFrozen"),
        readEvents(pool, poolAbi, "EpochRandomnessRequested"),
        readEvents(pool, poolAbi, "EpochRandomnessSynchronized"),
        readEvents(pool, poolAbi, "EncryptedDrawExecuted"),
        readEvents(pool, poolAbi, "WinnerFinalized"),
        readEvents(pool, poolAbi, "EpochNoWinner"),
        readEvents(pool, poolAbi, "EpochAbandoned"),
        readEvents(pool, poolAbi, "EpochTerminal"),
        readEvents(pool, poolAbi, "PrizeClaimProcessed"),
        readEvents(vrf, vrfAbi, "VrfFulfilled"),
      ]);

      return {
        freezeTx: lastTransactionHash(frozen),
        requestTx: lastTransactionHash(requested),
        vrfFulfillmentTx: lastTransactionHash(fulfilled),
        syncTx: lastTransactionHash(synchronized),
        drawTx: lastTransactionHash(drawn),
        winnerTx: lastTransactionHash(winner),
        noWinnerTx: lastTransactionHash(noWinner),
        abandonedTx: lastTransactionHash(abandoned),
        terminalTx: lastTransactionHash(terminal),
        prizeClaimTx: lastTransactionHash(claimed),
      };
    },
  });
}
