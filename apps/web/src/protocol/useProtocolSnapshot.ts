import { useQuery } from "@tanstack/react-query";
import { useAccount, usePublicClient } from "wagmi";
import type { Address, Hex } from "viem";

import { poolAbi, settlementAbi, vrfAbi } from "../config/abis";
import { useDeployment } from "../providers/DeploymentProvider";
import { EpochStatus, SlotStatus } from "./types";

export interface SlotSnapshot {
  index: number;
  owner: Address;
  status: SlotStatus;
  bondWei: bigint;
  activeWithdrawalId: bigint;
  lastReferencedEpoch: bigint;
}

export interface EpochSnapshot {
  id: bigint;
  status: EpochStatus;
  openedAt: bigint;
  closesAt: bigint;
  frozenAt: bigint;
  requestDeadline: bigint;
  frozenSlotCount: number;
  snapshotCommitment: Hex;
  requestId: bigint;
  fulfillmentDeadline: bigint;
  vrfFulfilled: boolean;
  vrfFulfilledAt: bigint;
  vrfFulfilledBlock: bigint;
  randomWord: bigint;
  fulfilledAt: bigint;
  drawDeadline: bigint;
  encryptedWinner: Hex;
  prizeHandle: Hex;
  aclGrantNotBeforeBlock: bigint;
  finalizedWinner: Address;
  winnerFinalized: boolean;
}

export interface PositionSnapshot {
  occupied: boolean;
  slot: number;
  principalHandle: Hex;
  eligibleHandle: Hex;
  pendingHandle: Hex;
}

export interface WithdrawalSnapshot {
  id: bigint;
  slot: number;
  owner: Address;
  createdAt: bigint;
  fifoSequence: bigint;
  settlementId: bigint;
  version: number;
  status: number;
  routingHandle: Hex;
  completionHandle: Hex;
}

export interface SettlementSnapshot {
  id: bigint;
  kind: number;
  status: number;
  retryStage: number;
  createdAt: bigint;
  publicCap: bigint;
  aggregateHandle: Hex;
  clearAggregate: bigint;
  wrapperRequestId: Hex;
  publicAssetsRequested: bigint;
  publicAssetsReceived: bigint;
  returnedHandle: Hex;
  failureCode: Hex;
  attempt: number;
}

export interface ProtocolSnapshot {
  blockNumber: bigint;
  active: boolean;
  pauseMask: number;
  currentEpochId: bigint;
  lastTerminalEpochId: bigint;
  activeSettlementId: bigint;
  fifoHeadId: bigint;
  fifoHeadStatus: number;
  slots: SlotSnapshot[];
  epoch: EpochSnapshot;
  position: PositionSnapshot | null;
  withdrawal: WithdrawalSnapshot | null;
  settlement: SettlementSnapshot | null;
  strategy: {
    investmentsPaused: boolean;
    lossMode: boolean;
    activeSettlementId: bigint;
  };
  vrf: {
    pendingRequestCount: bigint;
  };
}

const ZERO_HANDLE = `0x${"0".repeat(64)}` as Hex;

async function readEpochSnapshot(
  publicClient: NonNullable<ReturnType<typeof usePublicClient>>,
  pool: Address,
  vrf: Address,
  epochId: bigint,
): Promise<EpochSnapshot> {
  const [epochPublic, epochRandomness, epochWinner, prizeHandle] = await Promise.all([
    publicClient.readContract({
      address: pool,
      abi: poolAbi,
      functionName: "epochPublic",
      args: [epochId],
    }),
    publicClient.readContract({
      address: pool,
      abi: poolAbi,
      functionName: "epochRandomness",
      args: [epochId],
    }),
    publicClient.readContract({
      address: pool,
      abi: poolAbi,
      functionName: "epochWinner",
      args: [epochId],
    }),
    publicClient.readContract({
      address: pool,
      abi: poolAbi,
      functionName: "prizeHandle",
      args: [epochId],
    }),
  ]);

  let vrfFulfilled = false;
  let vrfFulfilledAt = 0n;
  let vrfFulfilledBlock = 0n;
  if (epochRandomness[0] !== 0n) {
    const fulfillment = await publicClient.readContract({
      address: vrf,
      abi: vrfAbi,
      functionName: "getFulfillment",
      args: [epochRandomness[0]],
    });
    vrfFulfilled = Boolean(
      fulfillment[5] &&
        fulfillment[0] === epochId &&
        fulfillment[1].toLowerCase() === epochPublic[6].toLowerCase(),
    );
    vrfFulfilledAt = fulfillment[3];
    vrfFulfilledBlock = fulfillment[4];
  }

  return {
    id: epochId,
    status: Number(epochPublic[0]) as EpochStatus,
    openedAt: epochPublic[1],
    closesAt: epochPublic[2],
    frozenAt: epochPublic[3],
    requestDeadline: epochPublic[4],
    frozenSlotCount: Number(epochPublic[5]),
    snapshotCommitment: epochPublic[6],
    requestId: epochRandomness[0],
    fulfillmentDeadline: epochRandomness[1],
    vrfFulfilled,
    vrfFulfilledAt,
    vrfFulfilledBlock,
    randomWord: epochRandomness[2],
    fulfilledAt: epochRandomness[3],
    drawDeadline: epochRandomness[4],
    encryptedWinner: epochWinner[0],
    prizeHandle,
    aclGrantNotBeforeBlock: epochWinner[1],
    finalizedWinner: epochWinner[2],
    winnerFinalized: epochWinner[3],
  };
}

export function useEpochSnapshot(epochId: bigint | undefined) {
  const { manifest, status: deploymentStatus, runtime } = useDeployment();
  const publicClient = usePublicClient({ chainId: runtime.chainId });

  return useQuery({
    queryKey: ["veilsave", "epoch-snapshot", manifest?.sourceCommit, epochId?.toString()],
    enabled: Boolean(
      publicClient && manifest && deploymentStatus === "ready" && epochId !== undefined,
    ),
    staleTime: 6_000,
    refetchInterval: 12_000,
    queryFn: async (): Promise<EpochSnapshot> => {
      if (!publicClient || !manifest || epochId === undefined) {
        throw new Error("Epoch client is unavailable");
      }
      return readEpochSnapshot(
        publicClient,
        manifest.contracts.confidentialPrizePool.address as Address,
        manifest.contracts.poolVrfAdapter.address as Address,
        epochId,
      );
    },
  });
}

export function useProtocolSnapshot() {
  const { address } = useAccount();
  const { manifest, status: deploymentStatus, runtime } = useDeployment();
  const publicClient = usePublicClient({ chainId: runtime.chainId });

  return useQuery({
    queryKey: ["veilsave", "protocol-snapshot", manifest?.sourceCommit, address],
    enabled: Boolean(publicClient && manifest && deploymentStatus === "ready"),
    staleTime: 6_000,
    refetchInterval: 12_000,
    queryFn: async (): Promise<ProtocolSnapshot> => {
      if (!publicClient || !manifest) throw new Error("Protocol client is unavailable");
      const pool = manifest.contracts.confidentialPrizePool.address as Address;
      const controller = manifest.contracts.settlementController.address as Address;
      const vrf = manifest.contracts.poolVrfAdapter.address as Address;

      const [
        blockNumber,
        active,
        pauseMask,
        currentEpochId,
        lastTerminalEpochId,
        activeSettlementId,
        fifoHead,
      ] = await Promise.all([
        publicClient.getBlockNumber(),
        publicClient.readContract({ address: pool, abi: poolAbi, functionName: "active" }),
        publicClient.readContract({ address: pool, abi: poolAbi, functionName: "pauseMask" }),
        publicClient.readContract({ address: pool, abi: poolAbi, functionName: "currentEpochId" }),
        publicClient.readContract({
          address: pool,
          abi: poolAbi,
          functionName: "lastTerminalEpochId",
        }),
        publicClient.readContract({
          address: pool,
          abi: poolAbi,
          functionName: "activeSettlementId",
        }),
        publicClient.readContract({ address: pool, abi: poolAbi, functionName: "fifoHead" }),
      ]);

      const [epoch, strategyPaused, lossMode, controllerSettlementId, pendingRequestCount] =
        await Promise.all([
          readEpochSnapshot(publicClient, pool, vrf, currentEpochId),
          publicClient.readContract({
            address: controller,
            abi: settlementAbi,
            functionName: "investmentsPaused",
          }),
          publicClient.readContract({
            address: controller,
            abi: settlementAbi,
            functionName: "lossMode",
          }),
          publicClient.readContract({
            address: controller,
            abi: settlementAbi,
            functionName: "activeSettlementId",
          }),
          publicClient.readContract({
            address: vrf,
            abi: vrfAbi,
            functionName: "pendingRequestCount",
          }),
        ]);
      const activeSettlement =
        controllerSettlementId === 0n
          ? null
          : await publicClient.readContract({
              address: controller,
              abi: settlementAbi,
              functionName: "settlementPublic",
              args: [controllerSettlementId],
            });

      const slots = await Promise.all(
        Array.from({ length: 16 }, async (_, index): Promise<SlotSnapshot> => {
          const result = await publicClient.readContract({
            address: pool,
            abi: poolAbi,
            functionName: "slotPublic",
            args: [index],
          });
          return {
            index,
            owner: result[0],
            status: Number(result[1]) as SlotStatus,
            bondWei: result[2],
            activeWithdrawalId: result[3],
            lastReferencedEpoch: result[4],
          };
        }),
      );

      let position: PositionSnapshot | null = null;
      let withdrawal: WithdrawalSnapshot | null = null;
      if (address) {
        const [slotOf, principalHandle, weights] = await Promise.all([
          publicClient.readContract({
            address: pool,
            abi: poolAbi,
            functionName: "slotOf",
            args: [address],
          }),
          publicClient.readContract({
            address: pool,
            abi: poolAbi,
            functionName: "principalHandle",
            args: [address],
          }),
          publicClient.readContract({
            address: pool,
            abi: poolAbi,
            functionName: "weightHandles",
            args: [address],
          }),
        ]);
        position = {
          occupied: slotOf[0],
          slot: Number(slotOf[1]),
          principalHandle: principalHandle || ZERO_HANDLE,
          eligibleHandle: weights[0] || ZERO_HANDLE,
          pendingHandle: weights[1] || ZERO_HANDLE,
        };
        const activeWithdrawalId = slots[position.slot]?.activeWithdrawalId ?? 0n;
        if (position.occupied && activeWithdrawalId !== 0n) {
          const result = await publicClient.readContract({
            address: pool,
            abi: poolAbi,
            functionName: "withdrawalPublic",
            args: [activeWithdrawalId],
          });
          withdrawal = {
            id: activeWithdrawalId,
            slot: Number(result[0]),
            owner: result[1],
            createdAt: result[2],
            fifoSequence: result[3],
            settlementId: result[4],
            version: Number(result[5]),
            status: Number(result[6]),
            routingHandle: result[7],
            completionHandle: result[8],
          };
        }
      }

      const settlement = activeSettlement
        ? {
            id: controllerSettlementId,
            kind: Number(activeSettlement[0]),
            status: Number(activeSettlement[1]),
            retryStage: Number(activeSettlement[2]),
            createdAt: activeSettlement[3],
            publicCap: activeSettlement[4],
            aggregateHandle: activeSettlement[5],
            clearAggregate: activeSettlement[6],
            wrapperRequestId: activeSettlement[7],
            publicAssetsRequested: activeSettlement[8],
            publicAssetsReceived: activeSettlement[9],
            returnedHandle: activeSettlement[10],
            failureCode: activeSettlement[11],
            attempt: Number(activeSettlement[12]),
          }
        : null;

      return {
        blockNumber,
        active,
        pauseMask: Number(pauseMask),
        currentEpochId,
        lastTerminalEpochId,
        activeSettlementId,
        fifoHeadId: fifoHead[0],
        fifoHeadStatus: Number(fifoHead[1]),
        slots,
        epoch,
        position,
        withdrawal,
        settlement,
        strategy: {
          investmentsPaused: strategyPaused,
          lossMode,
          activeSettlementId: controllerSettlementId,
        },
        vrf: { pendingRequestCount },
      };
    },
  });
}
