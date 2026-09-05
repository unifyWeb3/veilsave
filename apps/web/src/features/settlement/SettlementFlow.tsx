import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, useChainId, usePublicClient, useWalletClient } from "wagmi";
import { parseEventLogs, type Address, type Hex, type TransactionReceipt } from "viem";

import { SEPOLIA_CHAIN_ID } from "@veilsave/shared";

import {
  AmountField,
  Badge,
  Button,
  EvidenceRow,
  RecoveryBanner,
  StateBlock,
  StatusPill,
  StatusStepper,
  formatSix,
  shortenMiddle,
  type StatusStep,
} from "../../design/Primitives";
import { poolAbi, settlementAbi, tokenAbi } from "../../config/abis";
import {
  parseCusdtAmount,
  publicDecryptValue,
  recordSubmittedOperation,
} from "../transactions/transactionUtils";
import { sanitizeError, updateOperation } from "../../lib/operationStore";
import {
  canTransactDeployment,
  TRANSACTION_NOT_READY_MESSAGE,
  useDeployment,
} from "../../providers/DeploymentProvider";
import { useZama } from "../../providers/ZamaProvider";
import { SettlementStatus, WithdrawalStatus } from "../../protocol/types";
import type { ProtocolSnapshot, SettlementSnapshot } from "../../protocol/useProtocolSnapshot";
import { publicSettlementUint64 } from "./settlementUtils";
import { parseSettlementPublicId } from "./recovery";

const ZERO_HANDLE = `0x${"0".repeat(64)}` as Hex;
const CONFIRMATIONS = 2;

type SettlementAction = "start" | "aggregate-proof" | "execute" | "retry";
type Stage =
  | "editing"
  | "decrypting"
  | "signing"
  | "confirming"
  | "success"
  | "uncertain"
  | "failed";

const settlementKindLabels: Record<number, string> = {
  1: "Principal investment",
  2: "FIFO principal redemption",
  3: "TEST YIELD harvest",
};

function operationRecordId(publicId: string): string {
  return `veilsave:settlement:${publicId}`;
}

function stageLabel(status: number): string {
  const labels: Record<number, string> = {
    [SettlementStatus.AggregateDecryptPending]: "Aggregate proof pending",
    [SettlementStatus.StrategyActionPending]: "Strategy action pending",
    [SettlementStatus.RewrapPending]: "Confidential rewrap pending",
    [SettlementStatus.LiquidityReturnPending]: "Liquidity return pending",
    [SettlementStatus.FailedRetryable]: "Retry available",
    [SettlementStatus.Completed]: "Completed",
  };
  return labels[status] ?? "Unknown settlement state";
}

function settlementFromPublic(id: bigint, value: readonly unknown[]): SettlementSnapshot {
  return {
    id,
    kind: Number(value[0]),
    status: Number(value[1]),
    retryStage: Number(value[2]),
    createdAt: value[3] as bigint,
    publicCap: value[4] as bigint,
    aggregateHandle: value[5] as Hex,
    clearAggregate: value[6] as bigint,
    wrapperRequestId: value[7] as Hex,
    publicAssetsRequested: value[8] as bigint,
    publicAssetsReceived: value[9] as bigint,
    returnedHandle: value[10] as Hex,
    failureCode: value[11] as Hex,
    attempt: Number(value[12]),
  };
}

function steps(status: number, stage: Stage): StatusStep[] {
  const aggregateDone = status !== SettlementStatus.AggregateDecryptPending;
  const strategyDone = [
    SettlementStatus.RewrapPending,
    SettlementStatus.LiquidityReturnPending,
    SettlementStatus.Completed,
  ].includes(status);
  const returned = [SettlementStatus.LiquidityReturnPending, SettlementStatus.Completed].includes(
    status,
  );
  return [
    {
      label: "Aggregate stays encrypted in the pool",
      status: stage === "decrypting" ? "active" : aggregateDone ? "done" : "future",
      detail: "Only the bounded public aggregate proof crosses the strategy boundary.",
    },
    {
      label: "Strategy action",
      status:
        stage === "signing" && !aggregateDone
          ? "future"
          : strategyDone
            ? "done"
            : status === SettlementStatus.FailedRetryable
              ? "failed"
              : "active",
      detail: "The same settlement ID is reused after a retryable strategy failure.",
    },
    {
      label: "Confidential liquidity returned",
      status: returned ? "done" : "future",
      meta: status === SettlementStatus.Completed ? "CANONICAL" : undefined,
    },
  ];
}

export function SettlementFlow({
  snapshot,
  onRefresh,
  recoveryRecord,
}: {
  snapshot: ProtocolSnapshot;
  onRefresh: () => Promise<unknown> | void;
  recoveryRecord?: import("../../lib/operationStore").OperationRecord | null;
}) {
  const { address } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const deployment = useDeployment();
  const zama = useZama();
  const publicClient = usePublicClient({ chainId: deployment.runtime.chainId });
  const [cap, setCap] = useState("");
  const [stage, setStage] = useState<Stage>("editing");
  const [activeAction, setActiveAction] = useState<SettlementAction | null>(null);
  const [pendingHash, setPendingHash] = useState<Hex | null>(null);
  const [pendingOperationId, setPendingOperationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);
  const [recoveredSettlement, setRecoveredSettlement] = useState<SettlementSnapshot | null>(null);
  const [recoveryBlocksWrites, setRecoveryBlocksWrites] = useState(false);
  const recoveredRecordId = useMemo(() => recoveryRecord?.id ?? null, [recoveryRecord?.id]);

  const manifest = deployment.manifest;
  const poolAddress = manifest?.contracts.confidentialPrizePool.address as Address | undefined;
  const controllerAddress = manifest?.contracts.settlementController.address as Address | undefined;
  const tokenAddress = manifest?.external.confidentialToken as Address | undefined;
  const activeSettlement = snapshot.settlement;
  const settlement = recoveredSettlement ?? activeSettlement;
  const withdrawal = snapshot.withdrawal;
  const queuedHead =
    snapshot.fifoHeadId !== 0n && snapshot.fifoHeadStatus === WithdrawalStatus.Queued;
  const hasSettlement = Boolean(settlement);
  const isActiveSettlement = Boolean(
    settlement && snapshot.strategy.activeSettlementId === settlement.id,
  );
  const walletReady = Boolean(address && walletClient && chainId === SEPOLIA_CHAIN_ID);
  const parsedCap = useMemo(() => parseCusdtAmount(cap), [cap]);
  const busy = ["decrypting", "signing", "confirming"].includes(stage);

  const readSettlement = useCallback(
    async (id: bigint): Promise<readonly unknown[]> => {
      if (!publicClient || !controllerAddress)
        throw new Error("The settlement reader is unavailable.");
      return publicClient.readContract({
        address: controllerAddress,
        abi: settlementAbi,
        functionName: "settlementPublic",
        args: [id],
      });
    },
    [controllerAddress, publicClient],
  );

  useEffect(() => {
    setStage("editing");
    setActiveAction(null);
    setPendingHash(null);
    setPendingOperationId(null);
    setError(null);
    setRecoveryNotice(null);
    setRecoveryBlocksWrites(false);
  }, [
    activeSettlement?.id.toString(),
    activeSettlement?.status,
    snapshot.fifoHeadId.toString(),
    withdrawal?.id.toString(),
    withdrawal?.status,
  ]);

  useEffect(() => {
    setRecoveredSettlement(null);
    if (!recoveryRecord || recoveredRecordId === null) return;
    if (recoveryRecord.chainId !== undefined && recoveryRecord.chainId !== chainId) {
      setRecoveryNotice(
        "This settlement record belongs to another network. Switch to Sepolia before retrying it.",
      );
      setRecoveryBlocksWrites(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        let settlementId = parseSettlementPublicId(recoveryRecord.publicId);
        if (settlementId === null) {
          const hash = recoveryRecord.replacementHash ?? recoveryRecord.txHash;
          if (!hash || !publicClient) {
            setRecoveryBlocksWrites(true);
            setRecoveryNotice(
              "The settlement transaction is recorded but cannot be checked yet. Do not start a duplicate settlement.",
            );
            return;
          }
          try {
            const receipt = await publicClient.getTransactionReceipt({ hash });
            if (cancelled) return;
            if (receipt.status !== "success") {
              updateOperation(recoveryRecord.id, {
                expectedState: "transaction-reverted",
                retryable: true,
                lastCheckedBlock: receipt.blockNumber.toString(),
              });
              setRecoveryBlocksWrites(false);
              setRecoveryNotice(
                "The recorded settlement transaction reverted. FIFO liabilities remain unchanged and the start action may be retried.",
              );
              return;
            }
            const events = parseEventLogs({
              abi: settlementAbi,
              logs: receipt.logs,
              eventName: "SettlementStarted",
              strict: false,
            });
            const started = events.find((event) => event.eventName === "SettlementStarted");
            settlementId = started
              ? ((started.args as { settlementId?: bigint }).settlementId ?? null)
              : null;
            if (settlementId === null) {
              setRecoveryBlocksWrites(true);
              setRecoveryNotice(
                "The transaction confirmed without a recoverable settlement ID. Refresh canonical state before another write.",
              );
              return;
            }
            updateOperation(recoveryRecord.id, {
              publicId: settlementId.toString(),
              expectedState: "aggregate-proof",
              retryable: true,
              lastCheckedBlock: receipt.blockNumber.toString(),
            });
          } catch {
            if (!cancelled) {
              setRecoveryBlocksWrites(true);
              setRecoveryNotice(
                "The recorded settlement transaction is still pending or unavailable. Do not submit a duplicate start.",
              );
            }
            return;
          }
        }
        const current = await readSettlement(settlementId);
        if (cancelled) return;
        const status = Number(current[1]);
        const label = stageLabel(status);
        setRecoveredSettlement(settlementFromPublic(settlementId, current));
        setRecoveryBlocksWrites(false);
        updateOperation(recoveryRecord.id, {
          publicId: settlementId.toString(),
          expectedState: label,
          retryable:
            status === SettlementStatus.FailedRetryable || status !== SettlementStatus.Completed,
        });
        setRecoveryNotice(
          status === SettlementStatus.Completed
            ? `Settlement ${settlementId.toString()} is already complete onchain. No replacement transaction is needed.`
            : `Settlement ${settlementId.toString()} is ${label.toLowerCase()}. The canonical state above is the recovery source.`,
        );
      } catch (cause) {
        if (!cancelled) {
          setRecoveryBlocksWrites(true);
          setRecoveryNotice(sanitizeError(cause));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chainId, readSettlement, recoveredRecordId, recoveryRecord]);

  const waitForReceipt = useCallback(
    async (hash: Hex): Promise<TransactionReceipt> => {
      if (!publicClient) throw new Error("The Sepolia RPC client is unavailable.");
      return publicClient.waitForTransactionReceipt({
        hash,
        confirmations: CONFIRMATIONS,
        timeout: 180_000,
      });
    },
    [publicClient],
  );

  const finish = useCallback(
    async (hash: Hex, operationIdValue: string, settlementId?: bigint) => {
      setStage("confirming");
      const receipt = await waitForReceipt(hash);
      if (receipt.status !== "success") {
        throw new Error(
          "The settlement transaction reverted. Canonical liabilities and queue order remain unchanged.",
        );
      }
      if (settlementId !== undefined) {
        const current = await readSettlement(settlementId);
        const status = Number(current[1]);
        updateOperation(operationIdValue, {
          expectedState: stageLabel(status),
          retryable:
            status === SettlementStatus.FailedRetryable || status !== SettlementStatus.Completed,
          lastCheckedBlock: receipt.blockNumber.toString(),
        });
        if (status === SettlementStatus.FailedRetryable) {
          setError(
            "The strategy reported a retryable failure. The same settlement remains bound and safe to retry.",
          );
          setStage("failed");
        } else {
          setStage("success");
        }
      } else {
        updateOperation(operationIdValue, {
          retryable: false,
          lastCheckedBlock: receipt.blockNumber.toString(),
        });
        setStage("success");
      }
      setPendingHash(null);
      await onRefresh();
    },
    [onRefresh, readSettlement, waitForReceipt],
  );

  const fail = useCallback((cause: unknown, hash?: Hex) => {
    setError(sanitizeError(cause));
    setPendingHash(hash ?? null);
    setStage(hash ? "uncertain" : "failed");
  }, []);

  const submitStart = useCallback(async () => {
    setError(null);
    setActiveAction("start");
    if (!parsedCap.value || parsedCap.error) {
      fail(new Error(parsedCap.error ?? "Enter a public settlement cap."));
      return;
    }
    if (!walletReady || !address || !walletClient || !poolAddress) {
      fail(new Error("Connect a Sepolia wallet before starting a settlement."));
      return;
    }
    if (!canTransactDeployment(deployment.status) && !(await deployment.ensureTransactionReady())) {
      fail(new Error(TRANSACTION_NOT_READY_MESSAGE));
      return;
    }
    let hash: Hex | undefined;
    try {
      setStage("signing");
      hash = await walletClient.writeContract({
        account: address,
        address: poolAddress,
        abi: poolAbi,
        functionName: "beginWithdrawalSettlement",
        args: [parsedCap.value],
      } as Parameters<typeof walletClient.writeContract>[0]);
      const opId = operationRecordId(hash);
      setPendingHash(hash);
      setPendingOperationId(opId);
      recordSubmittedOperation("settlement", hash, hash, "settlement-started", {
        chainId,
        wallet: address,
      });
      const receipt = await waitForReceipt(hash);
      if (receipt.status !== "success")
        throw new Error("The settlement request reverted. The queued claim remains intact.");
      const events = parseEventLogs({
        abi: settlementAbi,
        logs: receipt.logs,
        eventName: "SettlementStarted",
        strict: false,
      });
      const started = events.find((event) => event.eventName === "SettlementStarted");
      const id = started ? (started.args as { settlementId?: bigint }).settlementId : undefined;
      if (id !== undefined) {
        updateOperation(opId, {
          publicId: id.toString(),
          expectedState: "aggregate-proof",
          retryable: true,
          lastCheckedBlock: receipt.blockNumber.toString(),
        });
      }
      setStage("success");
      setPendingHash(null);
      await onRefresh();
    } catch (cause) {
      fail(cause, hash);
    }
  }, [
    address,
    chainId,
    fail,
    parsedCap,
    deployment,
    onRefresh,
    poolAddress,
    waitForReceipt,
    walletClient,
    walletReady,
  ]);

  const aggregateHandle = useCallback(
    async (current: SettlementSnapshot) => {
      if (!walletReady || !address || !walletClient || !controllerAddress || !tokenAddress) {
        fail(
          new Error(
            "A Sepolia wallet and Zama public-decryption service are required for the aggregate proof.",
          ),
        );
        return;
      }
      if (current.status !== SettlementStatus.AggregateDecryptPending) {
        fail(
          new Error(
            "This settlement has already advanced. Refresh the canonical state before retrying.",
          ),
        );
        return;
      }
      let hash: Hex | undefined;
      try {
        setError(null);
        setActiveAction("aggregate-proof");
        setStage("decrypting");
        let handle = current.aggregateHandle;
        if (current.kind === 1) {
          if (current.wrapperRequestId === ZERO_HANDLE)
            throw new Error("The wrapper aggregate request is not ready.");
          handle = await publicClient!.readContract({
            address: tokenAddress,
            abi: tokenAbi,
            functionName: "unwrapAmount",
            args: [current.wrapperRequestId],
          });
        }
        if (handle === ZERO_HANDLE) throw new Error("The encrypted aggregate handle is not ready.");
        const zamaClient = zama.client ?? (await zama.ensureReady());
        const reveal = await zamaClient.publicDecrypt([handle]);
        const clearAmount = publicSettlementUint64(publicDecryptValue(reveal.clearValues, handle));
        setStage("signing");
        const functionName =
          current.kind === 1 ? "finalizeInvestmentAggregate" : "finalizePrincipalRedemption";
        hash = await walletClient.writeContract({
          account: address,
          address: controllerAddress,
          abi: settlementAbi,
          functionName,
          args: [current.id, clearAmount, reveal.decryptionProof],
        } as Parameters<typeof walletClient.writeContract>[0]);
        const opId = operationRecordId(`${current.id.toString()}:aggregate`);
        setPendingHash(hash);
        setPendingOperationId(opId);
        recordSubmittedOperation(
          "settlement",
          `${current.id.toString()}:aggregate`,
          hash,
          "strategy-action-pending",
          {
            chainId,
            wallet: address,
          },
        );
        await finish(hash, opId, current.id);
      } catch (cause) {
        fail(cause, hash);
      }
    },
    [
      address,
      chainId,
      controllerAddress,
      fail,
      finish,
      publicClient,
      tokenAddress,
      walletClient,
      walletReady,
      zama.client,
      zama.ensureReady,
    ],
  );

  const progress = useCallback(
    async (current: SettlementSnapshot, retry: boolean) => {
      if (!walletReady || !address || !walletClient || !controllerAddress) {
        fail(new Error("Connect a Sepolia wallet before progressing this settlement."));
        return;
      }
      if (
        !canTransactDeployment(deployment.status) &&
        !(await deployment.ensureTransactionReady())
      ) {
        fail(new Error(TRANSACTION_NOT_READY_MESSAGE));
        return;
      }
      let hash: Hex | undefined;
      try {
        setError(null);
        setActiveAction(retry ? "retry" : "execute");
        setStage("signing");
        hash = await walletClient.writeContract({
          account: address,
          address: controllerAddress,
          abi: settlementAbi,
          functionName: retry ? "retrySettlement" : "executeSettlement",
          args: [current.id],
        } as Parameters<typeof walletClient.writeContract>[0]);
        const opId = operationRecordId(`${current.id.toString()}:${retry ? "retry" : "execute"}`);
        setPendingHash(hash);
        setPendingOperationId(opId);
        recordSubmittedOperation(
          "settlement",
          `${current.id.toString()}:${retry ? "retry" : "execute"}`,
          hash,
          "settlement-progressed",
          {
            chainId,
            wallet: address,
          },
        );
        await finish(hash, opId, current.id);
      } catch (cause) {
        fail(cause, hash);
      }
    },
    [address, chainId, controllerAddress, deployment, fail, finish, walletClient, walletReady],
  );

  const checkPending = useCallback(async () => {
    if (!pendingHash) return;
    try {
      setError(null);
      if (settlement)
        await finish(
          pendingHash,
          pendingOperationId ?? operationRecordId(`${settlement.id}:check`),
          settlement.id,
        );
      else {
        const receipt = await waitForReceipt(pendingHash);
        if (receipt.status !== "success")
          throw new Error("The settlement transaction reverted; reread the queue before retrying.");
        setPendingHash(null);
        setStage("success");
        await onRefresh();
      }
    } catch (cause) {
      fail(cause, pendingHash);
    }
  }, [fail, finish, onRefresh, pendingHash, pendingOperationId, settlement, waitForReceipt]);

  if (!hasSettlement && !queuedHead && !recoveryRecord) return null;
  const status = settlement?.status;
  const currentSteps = settlement ? steps(settlement.status, stage) : [];

  return (
    <section
      className="vs-panel vs-panel--quiet vs-settlement-panel"
      aria-labelledby="settlement-flow-title"
    >
      <div className="vs-panel-heading">
        <div>
          <div className="vs-label">Aggregate strategy activity</div>
          <h3 id="settlement-flow-title">Settlement recovery</h3>
        </div>
        {settlement ? (
          <StatusPill
            tone={
              status === SettlementStatus.FailedRetryable
                ? "critical"
                : status === SettlementStatus.Completed
                  ? "verified"
                  : "pending"
            }
          >
            {stageLabel(status!)}
          </StatusPill>
        ) : (
          <Badge tone="private" icon="lock">
            Private claim · public progress
          </Badge>
        )}
      </div>
      <div className="vs-panel-body">
        {recoveryNotice ? (
          <RecoveryBanner tone="info" title="Settlement recovery checked">
            {recoveryNotice}
          </RecoveryBanner>
        ) : null}
        {!settlement && queuedHead ? (
          <>
            <StateBlock kind="waiting" title="FIFO head can request liquidity" compact>
              A public cap bounds the aggregate strategy redemption. The claim amount and queue
              liabilities remain encrypted.
            </StateBlock>
            <div className="vs-settlement-start">
              <AmountField
                value={cap}
                onChange={setCap}
                label="Public settlement cap"
                helper="This cap is public aggregate strategy metadata, not your private claim amount."
              />
              <Button
                icon="layers"
                disabled={
                  !walletReady ||
                  !parsedCap.value ||
                  Boolean(parsedCap.error) ||
                  busy ||
                  recoveryBlocksWrites
                }
                busy={stage === "signing" && activeAction === "start"}
                onClick={() => void submitStart()}
              >
                Start aggregate redemption
              </Button>
            </div>
          </>
        ) : null}

        {settlement ? (
          <>
            <div className="vs-history-list">
              <div>
                <span>Settlement</span>
                <strong>{settlement.id.toString()}</strong>
              </div>
              <div>
                <span>Kind</span>
                <strong>{settlementKindLabels[settlement.kind] ?? "Protocol settlement"}</strong>
              </div>
              <div>
                <span>Public cap</span>
                <strong>{formatSix(settlement.publicCap)} cUSDT</strong>
              </div>
              <div>
                <span>Attempts</span>
                <strong>{settlement.attempt.toString()}</strong>
              </div>
            </div>
            {!isActiveSettlement && status !== SettlementStatus.Completed ? (
              <StateBlock kind="waiting" title="Recorded settlement is not active" compact>
                This historical controller state is shown for recovery evidence only. Refresh the
                active settlement before submitting another progression transaction.
              </StateBlock>
            ) : null}
            {isActiveSettlement &&
            !recoveryBlocksWrites &&
            status === SettlementStatus.AggregateDecryptPending ? (
              <>
                <StateBlock kind="waiting" title="Aggregate proof is ready" compact>
                  The aggregate handle is deliberately public-decryptable for this strategy
                  boundary. Individual principal and claim values are not revealed.
                </StateBlock>
                <Button
                  icon="key-round"
                  disabled={!walletReady || busy}
                  busy={busy && activeAction === "aggregate-proof"}
                  onClick={() => void aggregateHandle(settlement)}
                >
                  Authenticate aggregate proof
                </Button>
              </>
            ) : null}
            {isActiveSettlement &&
            !recoveryBlocksWrites &&
            (status === SettlementStatus.StrategyActionPending ||
              status === SettlementStatus.RewrapPending) ? (
              <>
                <StateBlock kind="waiting" title="Settlement can be progressed" compact>
                  Anyone can execute the already-bound strategy or confidential rewrap step. No new
                  private amount is supplied by the caller.
                </StateBlock>
                <Button
                  icon="arrow-right"
                  disabled={!walletReady || busy}
                  busy={busy && activeAction === "execute"}
                  onClick={() => void progress(settlement, false)}
                >
                  Progress settlement
                </Button>
              </>
            ) : null}
            {isActiveSettlement &&
            !recoveryBlocksWrites &&
            status === SettlementStatus.FailedRetryable ? (
              <>
                <RecoveryBanner tone="network" title="Strategy action failed safely">
                  Your principal claim remains recorded. The same settlement ID and proof binding
                  are retained; retry does not debit principal again.
                </RecoveryBanner>
                <Button
                  tone="secondary"
                  icon="refresh-cw"
                  disabled={!walletReady || busy}
                  busy={busy && activeAction === "retry"}
                  onClick={() => void progress(settlement, true)}
                >
                  Retry same settlement
                </Button>
              </>
            ) : null}
            {status === SettlementStatus.LiquidityReturnPending ? (
              <StateBlock kind="waiting" title="Liquidity return is being reconciled" compact>
                Refresh the canonical pool and controller state before taking another action.
              </StateBlock>
            ) : null}
            {status === SettlementStatus.Completed ? (
              <RecoveryBanner tone="info" title="Settlement completed">
                Returned liquidity has been credited through the immutable route. The FIFO claim
                remains encrypted.
              </RecoveryBanner>
            ) : null}
            {busy ? <StatusStepper steps={currentSteps} /> : null}
            {stage === "success" ? (
              <RecoveryBanner
                tone="info"
                title="Canonical settlement state advanced"
                actionLabel="Refresh state"
                onAction={() => void onRefresh()}
              >
                The public settlement transaction confirmed. The next proof, strategy action, or
                queue-service step is shown after rereading canonical state.
              </RecoveryBanner>
            ) : null}
            {stage === "failed" || stage === "uncertain" ? (
              <StateBlock
                kind={stage === "uncertain" ? "waiting" : "failed"}
                title={
                  stage === "uncertain"
                    ? "Settlement receipt is uncertain"
                    : "Settlement action needs recovery"
                }
                safety={
                  pendingHash
                    ? "Check the existing transaction before submitting another settlement action."
                    : "The same settlement ID remains the recovery reference."
                }
                actionLabel={
                  stage === "uncertain"
                    ? "Check transaction"
                    : status === SettlementStatus.FailedRetryable
                      ? "Retry same settlement"
                      : undefined
                }
                onAction={
                  stage === "uncertain"
                    ? () => void checkPending()
                    : status === SettlementStatus.FailedRetryable
                      ? () => void progress(settlement!, true)
                      : undefined
                }
              >
                {error}
                {pendingHash
                  ? ` Transaction ${shortenMiddle(pendingHash, 12, 8)} is the recovery reference.`
                  : ""}
              </StateBlock>
            ) : null}
            {pendingHash ? (
              <EvidenceRow
                label="Transaction"
                kind="hash"
                value={shortenMiddle(pendingHash, 14, 10)}
                href={`${deployment.runtime.explorerUrl}/tx/${pendingHash}`}
              />
            ) : null}
          </>
        ) : null}
        <p className="vs-flow-note">
          Anyone may progress a bound settlement. Aggregate amount and timing are public strategy
          metadata; individual balances, claims, and prize reserve remain encrypted.
        </p>
      </div>
    </section>
  );
}
