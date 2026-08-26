import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, useChainId, usePublicClient, useWalletClient } from "wagmi";
import { zeroAddress, type Address, type Hex, type TransactionReceipt } from "viem";

import { SEPOLIA_CHAIN_ID } from "@veilsave/shared";

import { ConfidentialValue } from "../../components/ConfidentialValue";
import { WalletControl } from "../../components/WalletControl";
import { poolAbi } from "../../config/abis";
import {
  Badge,
  Button,
  EvidenceRow,
  ProofBlock,
  RecoveryBanner,
  StateBlock,
  StatusPill,
  StatusStepper,
  shortenMiddle,
  type StatusStep,
} from "../../design/Primitives";
import { useUserDecryptor } from "../../hooks/useUserDecryptor";
import { operationId, recordSubmittedOperation } from "../transactions/transactionUtils";
import { publicAddress, publicDecryptValue } from "../transactions/transactionUtils";
import { sanitizeError, updateOperation, type OperationKind } from "../../lib/operationStore";
import { invalidatePrivateValues, usePrivateValue } from "../../lib/privacy";
import { useDeployment } from "../../providers/DeploymentProvider";
import { useZama } from "../../providers/ZamaProvider";
import { EpochStatus } from "../../protocol/types";
import type { EpochSnapshot } from "../../protocol/useProtocolSnapshot";
import { useEpochEvidence } from "../../protocol/useEpochEvidence";
import type { OperationRecord } from "../../lib/operationStore";
import { parseDrawRecoveryPublicId } from "./recovery";
import { lifecycleGasLimit } from "./transactionOptions";

const ZERO_HANDLE = `0x${"0".repeat(64)}` as Hex;
const CONFIRMATIONS = 2;

type ActionKey =
  | "freeze"
  | "request-vrf"
  | "sync-vrf"
  | "execute-draw"
  | "finalize-winner"
  | "abandon-unrequested"
  | "abandon-unfulfilled"
  | "abandon-unexecuted"
  | "claim-prize"
  | "open-next";

type ActionStage =
  | "idle"
  | "decrypting"
  | "signing"
  | "confirming"
  | "success"
  | "uncertain"
  | "failed";

interface ContractAction {
  key: ActionKey;
  label: string;
  functionName:
    | "freezeEpoch"
    | "requestEpochRandomness"
    | "syncEpochRandomness"
    | "executeEncryptedDraw"
    | "abandonUnrequestedEpoch"
    | "abandonUnfulfilledEpoch"
    | "abandonUnexecutedEpoch"
    | "claimPrize"
    | "openNextEpoch";
  args: readonly [bigint] | readonly [];
  kind: OperationKind;
  expectedState: string;
  danger?: boolean;
}

export function DrawLifecycle({
  epoch,
  isCurrent,
  observedBlock,
  onRefresh,
  recoveryRecord,
}: {
  epoch: EpochSnapshot;
  isCurrent: boolean;
  observedBlock?: bigint;
  onRefresh: () => Promise<unknown> | void;
  recoveryRecord?: OperationRecord | null;
}) {
  const { address } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient({ chainId: SEPOLIA_CHAIN_ID });
  const deployment = useDeployment();
  const zama = useZama();
  const evidence = useEpochEvidence(epoch.id);
  const { decryptHandle } = useUserDecryptor();
  const [stage, setStage] = useState<ActionStage>("idle");
  const [activeAction, setActiveAction] = useState<ActionKey | null>(null);
  const [pendingHash, setPendingHash] = useState<Hex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);
  const [recoveryBlocksWrites, setRecoveryBlocksWrites] = useState(false);

  const poolAddress = deployment.manifest?.contracts.confidentialPrizePool.address as
    | Address
    | undefined;
  const walletReady = Boolean(address && walletClient && chainId === SEPOLIA_CHAIN_ID);
  const currentTime = BigInt(Math.floor(Date.now() / 1000));
  const prizeClaimed = Boolean(evidence.data?.prizeClaimTx);
  const isWinner = Boolean(
    address &&
      epoch.winnerFinalized &&
      epoch.finalizedWinner.toLowerCase() === address.toLowerCase(),
  );

  const prize = usePrivateValue({
    identityKey:
      isWinner && epoch.prizeHandle !== ZERO_HANDLE && poolAddress
        ? `${chainId}:${address}:${poolAddress}:${epoch.id.toString()}:${epoch.prizeHandle}`
        : undefined,
    decrypt: async () => {
      if (!poolAddress || epoch.prizeHandle === ZERO_HANDLE)
        throw new Error("The private prize handle is not ready.");
      return decryptHandle(epoch.prizeHandle, poolAddress);
    },
  });

  useEffect(() => {
    setStage("idle");
    setActiveAction(null);
    setPendingHash(null);
    setError(null);
    setRecoveryNotice(null);
    setRecoveryBlocksWrites(false);
  }, [epoch.id, epoch.status, epoch.winnerFinalized]);

  useEffect(() => {
    if (!recoveryRecord) return;
    const reference = parseDrawRecoveryPublicId(recoveryRecord.publicId);
    if (!reference || reference.epochId !== epoch.id) return;
    if (recoveryRecord.chainId !== undefined && recoveryRecord.chainId !== chainId) {
      setRecoveryNotice(
        "This draw record belongs to another network. Switch to Sepolia before retrying it.",
      );
      setRecoveryBlocksWrites(true);
      return;
    }
    let cancelled = false;
    const canonicalDone =
      reference.action === "freeze"
        ? epoch.status !== EpochStatus.Open
        : reference.action === "request-vrf"
          ? epoch.requestId !== 0n
          : reference.action === "sync-vrf"
            ? epoch.status >= EpochStatus.DrawReady
            : reference.action === "execute-draw"
              ? epoch.status >= EpochStatus.RevealPending
              : reference.action === "finalize-winner"
                ? epoch.winnerFinalized
                : reference.action === "claim-prize"
                  ? Boolean(evidence.data?.prizeClaimTx)
                  : reference.action === "open-next"
                    ? !isCurrent
                    : epoch.status === EpochStatus.Abandoned;
    if (canonicalDone) {
      updateOperation(recoveryRecord.id, {
        retryable: false,
        expectedState: "canonical-state-advanced",
      });
      setRecoveryNotice(
        "The recorded action is already reflected in canonical epoch state. No duplicate transaction is needed.",
      );
      setRecoveryBlocksWrites(false);
      return;
    }
    const hash = recoveryRecord.replacementHash ?? recoveryRecord.txHash;
    if (!hash || !publicClient) {
      setRecoveryNotice(
        "The action is recorded, but its public transaction reference is not available yet.",
      );
      setRecoveryBlocksWrites(true);
      return;
    }
    void (async () => {
      try {
        const receipt = await publicClient.getTransactionReceipt({ hash });
        if (cancelled) return;
        updateOperation(recoveryRecord.id, {
          retryable: receipt.status !== "success",
          expectedState:
            receipt.status === "success" ? "transaction-confirmed" : "transaction-reverted",
          lastCheckedBlock: receipt.blockNumber.toString(),
        });
        setRecoveryNotice(
          receipt.status === "success"
            ? "The recorded transaction is confirmed; the epoch read is still catching up. Refresh before retrying."
            : "The recorded transaction reverted. The canonical epoch remains unchanged and the action can be retried.",
        );
        setRecoveryBlocksWrites(receipt.status === "success");
      } catch {
        if (!cancelled) {
          setRecoveryNotice(
            "The recorded transaction is still pending or unavailable. Do not submit a duplicate action until it is checked.",
          );
          setRecoveryBlocksWrites(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    chainId,
    epoch.id,
    epoch.requestId,
    epoch.status,
    epoch.winnerFinalized,
    evidence.data?.prizeClaimTx,
    isCurrent,
    publicClient,
    recoveryRecord,
  ]);

  const refresh = useCallback(async () => {
    await Promise.all([Promise.resolve(onRefresh()), evidence.refetch()]);
  }, [evidence, onRefresh]);

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

  const completeReceipt = useCallback(
    async (
      action:
        | ContractAction
        | { key: "finalize-winner"; kind: OperationKind; expectedState: string },
      hash: Hex,
    ) => {
      setStage("confirming");
      const receipt = await waitForReceipt(hash);
      if (receipt.status !== "success")
        throw new Error(
          "The lifecycle transaction reverted. Canonical epoch state was not advanced.",
        );
      updateOperation(operationId(action.kind, `${epoch.id.toString()}:${action.key}`), {
        expectedState: action.expectedState,
        retryable: false,
        lastCheckedBlock: receipt.blockNumber.toString(),
      });
      invalidatePrivateValues();
      await refresh();
      setPendingHash(null);
      setStage("success");
    },
    [epoch.id, refresh, waitForReceipt],
  );

  const fail = useCallback((cause: unknown, action: ActionKey, hash?: Hex) => {
    setActiveAction(action);
    setPendingHash(hash ?? null);
    setError(sanitizeError(cause));
    setStage(hash ? "uncertain" : "failed");
  }, []);

  const runContractAction = useCallback(
    async (action: ContractAction) => {
      setError(null);
      setActiveAction(action.key);
      if (!walletReady || !address || !walletClient || !poolAddress) {
        fail(
          new Error(
            "Connect a Sepolia wallet before submitting this permissionless lifecycle action.",
          ),
          action.key,
        );
        return;
      }
      let hash: Hex | undefined;
      try {
        setStage("signing");
        const gas = lifecycleGasLimit(action.key);
        hash = await walletClient.writeContract({
          account: address,
          address: poolAddress,
          abi: poolAbi,
          functionName: action.functionName,
          args: action.args,
          ...(gas === undefined ? {} : { gas }),
        } as Parameters<typeof walletClient.writeContract>[0]);
        setPendingHash(hash);
        recordSubmittedOperation(
          action.kind,
          `${epoch.id.toString()}:${action.key}`,
          hash,
          action.expectedState,
          { chainId, wallet: address, epochId: epoch.id },
        );
        await completeReceipt(action, hash);
      } catch (cause) {
        fail(cause, action.key, hash);
      }
    },
    [address, chainId, completeReceipt, epoch.id, fail, poolAddress, walletClient, walletReady],
  );

  const finalizeWinner = useCallback(async () => {
    const key: ActionKey = "finalize-winner";
    setError(null);
    setActiveAction(key);
    if (!walletReady || !address || !walletClient || !poolAddress) {
      fail(
        new Error(
          "A Sepolia wallet and Zama public-decryption service are required to authenticate the winner.",
        ),
        key,
      );
      return;
    }
    if (epoch.encryptedWinner === ZERO_HANDLE) {
      fail(new Error("The encrypted winner handle is not available."), key);
      return;
    }
    let hash: Hex | undefined;
    try {
      setStage("decrypting");
      const zamaClient = zama.client ?? (await zama.ensureReady());
      const reveal = await zamaClient.publicDecrypt([epoch.encryptedWinner]);
      const clearWinner = publicAddress(
        publicDecryptValue(reveal.clearValues, epoch.encryptedWinner),
      );
      setStage("signing");
      hash = await walletClient.writeContract({
        account: address,
        address: poolAddress,
        abi: poolAbi,
        functionName: "finalizeWinner",
        args: [epoch.id, clearWinner, reveal.decryptionProof],
      });
      setPendingHash(hash);
      recordSubmittedOperation(
        "winner-proof",
        `${epoch.id.toString()}:${key}`,
        hash,
        "winner-finalized",
        { chainId, wallet: address, epochId: epoch.id },
      );
      await completeReceipt({ key, kind: "winner-proof", expectedState: "winner-finalized" }, hash);
    } catch (cause) {
      fail(cause, key, hash);
    }
  }, [
    address,
    chainId,
    completeReceipt,
    epoch.encryptedWinner,
    epoch.id,
    fail,
    poolAddress,
    walletClient,
    walletReady,
    zama.client,
    zama.ensureReady,
  ]);

  const checkPending = useCallback(async () => {
    if (!pendingHash || !activeAction) return;
    setError(null);
    try {
      const kind =
        activeAction === "finalize-winner"
          ? "winner-proof"
          : activeAction === "claim-prize"
            ? "prize-reveal"
            : "draw";
      await completeReceipt(
        { key: activeAction as "finalize-winner", kind, expectedState: "canonical-state-advanced" },
        pendingHash,
      );
    } catch (cause) {
      fail(cause, activeAction, pendingHash);
    }
  }, [activeAction, completeReceipt, fail, pendingHash]);

  const primaryAction = useMemo(
    () => nextContractAction(epoch, isCurrent, currentTime),
    [currentTime, epoch, isCurrent],
  );
  const aclReady = observedBlock !== undefined && observedBlock >= epoch.aclGrantNotBeforeBlock;
  const busy = stage === "decrypting" || stage === "signing" || stage === "confirming";
  const steps = actionSteps(activeAction, stage);
  const explorerUrl = deployment.runtime.explorerUrl;

  return (
    <div className="vs-draw-control-grid">
      <section
        className="vs-panel vs-panel--quiet vs-lifecycle-panel"
        aria-labelledby="lifecycle-actions-title"
      >
        <div className="vs-panel-heading">
          <div>
            <div className="vs-label">Permissionless progression</div>
            <h3 id="lifecycle-actions-title">Canonical next action</h3>
          </div>
          <Badge tone="neutral" icon="shield-check">
            No operator chooses the winner
          </Badge>
        </div>
        <div className="vs-panel-body">
          {recoveryNotice ? (
            <RecoveryBanner
              tone="info"
              title="Draw recovery checked"
              actionLabel="Refresh canonical state"
              onAction={() => void refresh()}
            >
              {recoveryNotice}
            </RecoveryBanner>
          ) : null}
          {!isCurrent ? (
            <StateBlock kind="empty" title="Historical epoch is read-only" compact>
              The public evidence remains inspectable. A completed or abandoned epoch cannot be
              rerolled.
            </StateBlock>
          ) : null}
          {isCurrent && epoch.status === EpochStatus.Open && currentTime < epoch.closesAt ? (
            <StateBlock kind="waiting" title="Epoch remains open" compact>
              Eligibility freezes after {formatTimestamp(epoch.closesAt)}. Deposits made now enter
              pending weight and do not alter the current eligible snapshot.
            </StateBlock>
          ) : null}
          {isCurrent &&
          epoch.status === EpochStatus.RandomnessRequested &&
          !epoch.vrfFulfilled &&
          currentTime <= epoch.fulfillmentDeadline ? (
            <StateBlock
              kind="waiting"
              title="Chainlink fulfillment pending"
              compact
              actionLabel="Refresh VRF status"
              onAction={() => void refresh()}
            >
              The callback will store the random word in the VRF adapter only. It will not execute
              the encrypted draw.
            </StateBlock>
          ) : null}
          {isCurrent && epoch.status === EpochStatus.RevealPending && !aclReady ? (
            <StateBlock
              kind="waiting"
              title="Winner finality delay"
              compact
              actionLabel="Refresh block"
              onAction={() => void refresh()}
            >
              Public decryption can be finalized at block {epoch.aclGrantNotBeforeBlock.toString()}.
              Current observed block: {observedBlock?.toString() ?? "unavailable"}.
            </StateBlock>
          ) : null}
          {primaryAction ? (
            <div className="vs-lifecycle-command">
              <div>
                <StatusPill
                  tone={primaryAction.danger ? "terminal" : "private"}
                  pulse={!primaryAction.danger}
                >
                  {primaryAction.label}
                </StatusPill>
                <p>{actionExplanation(primaryAction.key)}</p>
              </div>
              <Button
                tone={primaryAction.danger ? "danger" : "primary"}
                icon={primaryAction.danger ? "ban" : "arrow-right"}
                busy={busy && activeAction === primaryAction.key}
                disabled={!walletReady || busy || recoveryBlocksWrites}
                onClick={() => void runContractAction(primaryAction)}
              >
                {primaryAction.label}
              </Button>
            </div>
          ) : null}
          {isCurrent && epoch.status === EpochStatus.RevealPending && aclReady ? (
            <div className="vs-lifecycle-command">
              <div>
                <StatusPill tone="private" pulse>
                  Authenticated public reveal
                </StatusPill>
                <p>
                  The Zama proof must bind this epoch, request, winner handle, state, and clear
                  winner address before the pool grants prize access.
                </p>
              </div>
              <Button
                tone="reveal"
                icon="key-round"
                busy={busy && activeAction === "finalize-winner"}
                disabled={!walletReady || busy || recoveryBlocksWrites}
                onClick={() => void finalizeWinner()}
              >
                Authenticate winner
              </Button>
            </div>
          ) : null}
          {!walletReady && isCurrent ? <WalletControl /> : null}
          {busy ? <StatusStepper steps={steps} /> : null}
          {stage === "success" ? (
            <RecoveryBanner
              title="Canonical state advanced"
              actionLabel="Refresh evidence"
              onAction={() => void refresh()}
            >
              The transaction reached the expected contract state. Public evidence may take one RPC
              refresh to appear.
            </RecoveryBanner>
          ) : null}
          {stage === "failed" || stage === "uncertain" ? (
            <StateBlock
              kind={stage === "uncertain" ? "waiting" : "failed"}
              title={
                stage === "uncertain"
                  ? "Receipt state is uncertain"
                  : "Lifecycle action did not complete"
              }
              safety={
                pendingHash
                  ? "Do not submit a replacement action until this transaction is checked."
                  : "The contract state is unchanged; this action may be retried safely."
              }
              actionLabel={
                stage === "uncertain"
                  ? "Check transaction"
                  : primaryAction?.key === activeAction
                    ? "Retry action"
                    : activeAction === "finalize-winner"
                      ? "Retry winner proof"
                      : undefined
              }
              onAction={
                stage === "uncertain"
                  ? () => void checkPending()
                  : primaryAction?.key === activeAction
                    ? () => void runContractAction(primaryAction)
                    : activeAction === "finalize-winner"
                      ? () => void finalizeWinner()
                      : undefined
              }
            >
              {error}
              {pendingHash
                ? ` Transaction ${shortenMiddle(pendingHash, 12, 8)} is the recovery reference.`
                : ""}
            </StateBlock>
          ) : null}
        </div>
      </section>

      <section className="vs-panel vs-prize-panel" aria-labelledby="prize-panel-title">
        <div className="vs-panel-heading">
          <div>
            <div className="vs-label">Prize</div>
            <h3 id="prize-panel-title">Epoch {epoch.id.toString()} result</h3>
          </div>
          {epoch.winnerFinalized ? (
            <StatusPill tone="verified" icon="badge-check">
              Winner finalized
            </StatusPill>
          ) : (
            <StatusPill tone="pending">Not finalized</StatusPill>
          )}
        </div>
        <div className="vs-panel-body">
          {epoch.status < EpochStatus.Terminal ? (
            <StateBlock kind="waiting" title="Prize access is not ready" compact>
              The prize amount remains encrypted. Only the finalized winner will receive decryption
              permission.
            </StateBlock>
          ) : null}
          {epoch.status === EpochStatus.Abandoned ||
          (epoch.status === EpochStatus.Terminal &&
            epoch.finalizedWinner.toLowerCase() === zeroAddress) ? (
            <StateBlock kind="terminal" title="No winner · terminal" compact>
              This epoch cannot be rerolled. Its prize reserve follows the contract's frozen
              rollover rules.
            </StateBlock>
          ) : null}
          {epoch.winnerFinalized &&
          epoch.finalizedWinner.toLowerCase() !== zeroAddress &&
          !isWinner ? (
            <StateBlock
              kind="empty"
              title="Draw complete"
              safety="Your principal remains confidential and withdrawable."
              compact
            >
              The public winner is {shortenMiddle(epoch.finalizedWinner, 10, 8)}. Prize amount and
              every non-winner balance remain private.
            </StateBlock>
          ) : null}
          {isWinner ? (
            <div className="vs-winner-stack">
              <div className="vs-result-line">
                <span>
                  <span aria-hidden="true">✓</span>
                </span>
                <div>
                  <strong>Your wallet is the finalized winner</strong>
                  <code>{shortenMiddle(epoch.finalizedWinner, 12, 8)}</code>
                </div>
              </div>
              <ConfidentialValue
                label="Your prize"
                status={prize.status}
                value={prize.value}
                onReveal={() => void prize.reveal()}
                onRemask={prize.remask}
                onRetry={() => void prize.reveal()}
                error={prize.error}
                hint={prizeClaimed ? "Claimed" : "Winner-only access"}
              />
              {prize.status === "error-retryable" ? (
                <RecoveryBanner
                  tone="info"
                  title="Winner access may still be propagating"
                  actionLabel="Retry private reveal"
                  onAction={() => void prize.reveal()}
                >
                  The winner ACL is finalized onchain, but relayer/KMS availability and ACL
                  propagation are asynchronous. No other wallet receives prize access.
                </RecoveryBanner>
              ) : null}
              <div className="vs-actions">
                <Button
                  icon="arrow-down-to-line"
                  disabled={!walletReady || busy || prizeClaimed || recoveryBlocksWrites}
                  busy={busy && activeAction === "claim-prize"}
                  onClick={() =>
                    void runContractAction({
                      key: "claim-prize",
                      label: "Claim prize",
                      functionName: "claimPrize",
                      args: [epoch.id],
                      kind: "prize-reveal",
                      expectedState: "prize-claimed",
                    })
                  }
                >
                  {prizeClaimed ? "Prize claimed" : "Claim prize"}
                </Button>
                {prizeClaimed && evidence.data?.prizeClaimTx ? (
                  <Button
                    tone="ghost"
                    iconAfter="external-link"
                    onClick={() =>
                      window.open(
                        `${explorerUrl}/tx/${evidence.data?.prizeClaimTx}`,
                        "_blank",
                        "noopener,noreferrer",
                      )
                    }
                  >
                    Claim transaction
                  </Button>
                ) : null}
              </div>
              <p className="vs-flow-note">
                Revealing is optional and local to this session. Claiming transfers the encrypted
                prize to your confidential wallet balance without publishing the amount.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      {evidence.isError ? (
        <RecoveryBanner
          tone="network"
          title="Event evidence unavailable"
          actionLabel="Retry evidence"
          onAction={() => void evidence.refetch()}
        >
          Canonical state remains readable, but the RPC did not return the event-linked transaction
          trail.
        </RecoveryBanner>
      ) : null}
      {pendingHash ? (
        <ProofBlock
          title="Pending transaction"
          verdict={stage === "uncertain" ? "pending" : "none"}
          summary="Public recovery reference for the active lifecycle action."
        >
          <EvidenceRow
            label="Transaction"
            kind="hash"
            value={shortenMiddle(pendingHash, 14, 10)}
            href={`${explorerUrl}/tx/${pendingHash}`}
          />
        </ProofBlock>
      ) : null}
    </div>
  );
}

function nextContractAction(
  epoch: EpochSnapshot,
  isCurrent: boolean,
  now: bigint,
): ContractAction | null {
  if (!isCurrent) return null;
  if (epoch.status === EpochStatus.Open && now >= epoch.closesAt) {
    return action("freeze", "Freeze eligibility", "freezeEpoch", [epoch.id], "snapshot-frozen");
  }
  if (epoch.status === EpochStatus.Frozen) {
    if (now > epoch.requestDeadline)
      return action(
        "abandon-unrequested",
        "End timed-out epoch",
        "abandonUnrequestedEpoch",
        [epoch.id],
        "epoch-abandoned",
        true,
      );
    return action(
      "request-vrf",
      "Request Chainlink VRF",
      "requestEpochRandomness",
      [epoch.id],
      "vrf-requested",
    );
  }
  if (epoch.status === EpochStatus.RandomnessRequested) {
    if (epoch.vrfFulfilled)
      return action(
        "sync-vrf",
        "Sync fulfilled randomness",
        "syncEpochRandomness",
        [epoch.id],
        "draw-ready",
      );
    if (now > epoch.fulfillmentDeadline)
      return action(
        "abandon-unfulfilled",
        "End timed-out epoch",
        "abandonUnfulfilledEpoch",
        [epoch.id],
        "epoch-abandoned",
        true,
      );
    return null;
  }
  if (epoch.status === EpochStatus.DrawReady) {
    if (now > epoch.drawDeadline)
      return action(
        "abandon-unexecuted",
        "End timed-out epoch",
        "abandonUnexecutedEpoch",
        [epoch.id],
        "epoch-abandoned",
        true,
      );
    return action(
      "execute-draw",
      "Execute encrypted draw",
      "executeEncryptedDraw",
      [epoch.id],
      "winner-reveal-pending",
    );
  }
  if (epoch.status === EpochStatus.Terminal || epoch.status === EpochStatus.Abandoned) {
    return action("open-next", "Open next epoch", "openNextEpoch", [], "next-epoch-open");
  }
  return null;
}

function action(
  key: ContractAction["key"],
  label: string,
  functionName: ContractAction["functionName"],
  args: ContractAction["args"],
  expectedState: string,
  danger = false,
): ContractAction {
  return { key, label, functionName, args, kind: "draw", expectedState, danger };
}

function actionExplanation(key: ActionKey): string {
  const copy: Record<ActionKey, string> = {
    freeze:
      "Takes the fixed 16-slot encrypted eligibility snapshot. Draw inputs cannot change after this transaction.",
    "request-vrf":
      "Creates the epoch-bound Chainlink VRF request. The callback stores randomness only.",
    "sync-vrf":
      "Copies the already fulfilled random word into the frozen epoch without running any FHE draw work.",
    "execute-draw":
      "Runs only the validated 16-slot encrypted weighted draw in a separate transaction.",
    "finalize-winner":
      "Authenticates the publicly decryptable winner handle and grants prize access only to that winner.",
    "abandon-unrequested":
      "Closes the expired epoch without a reroll. Frozen inputs cannot be reused for another random result.",
    "abandon-unfulfilled":
      "Closes the expired VRF request without a reroll. A new epoch must open with new timing.",
    "abandon-unexecuted":
      "Closes the expired draw window without a reroll. The stored random word cannot be retried selectively.",
    "claim-prize":
      "Transfers the encrypted prize to the finalized winner's confidential token balance.",
    "open-next":
      "Opens the next seven-day epoch after the previous epoch reached a terminal state.",
  };
  return copy[key];
}

function actionSteps(actionKey: ActionKey | null, stage: ActionStage): StatusStep[] {
  const first =
    actionKey === "finalize-winner"
      ? "Request authenticated public decryption"
      : "Prepare canonical contract call";
  return [
    {
      label: first,
      status:
        stage === "decrypting" || stage === "signing"
          ? "active"
          : stage === "confirming" || stage === "success"
            ? "done"
            : "future",
    },
    {
      label: "Wallet signature",
      status:
        stage === "signing"
          ? "active"
          : stage === "confirming" || stage === "success"
            ? "done"
            : "future",
    },
    {
      label: `${CONFIRMATIONS} Sepolia confirmations`,
      status: stage === "confirming" ? "active" : stage === "success" ? "done" : "future",
    },
    { label: "Canonical state refresh", status: stage === "success" ? "done" : "future" },
  ];
}

function formatTimestamp(value: bigint): string {
  if (value === 0n) return "the configured close time";
  return new Date(Number(value) * 1000).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}
