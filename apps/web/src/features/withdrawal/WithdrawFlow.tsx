import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useChainId, usePublicClient, useWalletClient } from "wagmi";
import { parseEventLogs, type Address, type Hex, type TransactionReceipt } from "viem";

import { SEPOLIA_CHAIN_ID } from "@veilsave/shared";

import { WalletControl } from "../../components/WalletControl";
import { poolAbi } from "../../config/abis";
import {
  AmountField,
  Badge,
  Button,
  Icon,
  PrivacyCallout,
  RecoveryBanner,
  Sheet,
  StateBlock,
  StatusPill,
  StatusStepper,
  shortenMiddle,
  type StatusStep,
} from "../../design/Primitives";
import { sanitizeError, updateOperation, type OperationRecord } from "../../lib/operationStore";
import { invalidatePrivateValues } from "../../lib/privacy";
import { useDeployment } from "../../providers/DeploymentProvider";
import { useZama } from "../../providers/ZamaProvider";
import { SlotStatus, WithdrawalStatus, withdrawalStatusLabels } from "../../protocol/types";
import { useProtocolSnapshot } from "../../protocol/useProtocolSnapshot";
import {
  parseCusdtAmount,
  publicBoolean,
  recordSubmittedOperation,
} from "../transactions/transactionUtils";
import { canonicalWithdrawalStage, parseWithdrawalPublicId } from "./recovery";

const ZERO_HANDLE = `0x${"0".repeat(64)}` as Hex;
const CONFIRMATIONS = 2;

type WithdrawalStage =
  | "editing"
  | "encrypting"
  | "signing"
  | "confirming"
  | "routing-proof"
  | "routing-signing"
  | "routing-confirming"
  | "service-signing"
  | "service-confirming"
  | "completion-proof"
  | "completion-signing"
  | "completion-confirming"
  | "immediate"
  | "queued"
  | "complete"
  | "uncertain"
  | "failed";

type PendingKind = "request" | "routing" | "service" | "completion";

interface WithdrawalPublicState {
  slot: number;
  owner: Address;
  createdAt: bigint;
  fifoSequence: bigint;
  settlementId: bigint;
  version: number;
  status: WithdrawalStatus;
  routingHandle: Hex;
  completionHandle: Hex;
}

export function WithdrawFlow({
  open,
  onClose,
  recoveryRecord,
}: {
  open: boolean;
  onClose: () => void;
  recoveryRecord?: OperationRecord | null;
}) {
  const { address } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const deployment = useDeployment();
  const zama = useZama();
  const snapshot = useProtocolSnapshot();
  const publicClient = usePublicClient({ chainId: deployment.runtime.chainId });
  const [amount, setAmount] = useState("");
  const [closing, setClosing] = useState(false);
  const [stage, setStage] = useState<WithdrawalStage>("editing");
  const [error, setError] = useState<string | null>(null);
  const [withdrawalId, setWithdrawalId] = useState<bigint | null>(null);
  const [ticket, setTicket] = useState<WithdrawalPublicState | null>(null);
  const [requestHash, setRequestHash] = useState<Hex | null>(null);
  const [pendingHash, setPendingHash] = useState<Hex | null>(null);
  const [pendingKind, setPendingKind] = useState<PendingKind | null>(null);
  const [lastAction, setLastAction] = useState<
    "request" | "routing" | "service" | "completion" | null
  >(null);
  const loadedRecoveryId = useRef<string | null>(null);

  const manifest = deployment.manifest;
  const poolAddress = manifest?.contracts.confidentialPrizePool.address as Address | undefined;
  const position = snapshot.data?.position;
  const slot = position?.occupied ? snapshot.data?.slots[position.slot] : undefined;
  const activeWithdrawalId = slot?.activeWithdrawalId ?? 0n;
  const parsedAmount = useMemo(() => parseCusdtAmount(amount), [amount]);
  const walletReady = Boolean(address && walletClient && chainId === SEPOLIA_CHAIN_ID);

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

  const readWithdrawal = useCallback(
    async (id: bigint): Promise<WithdrawalPublicState> => {
      if (!publicClient || !poolAddress)
        throw new Error("The canonical withdrawal reader is unavailable.");
      const result = await publicClient.readContract({
        address: poolAddress,
        abi: poolAbi,
        functionName: "withdrawalPublic",
        args: [id],
      });
      return {
        slot: Number(result[0]),
        owner: result[1],
        createdAt: result[2],
        fifoSequence: result[3],
        settlementId: result[4],
        version: Number(result[5]),
        status: Number(result[6]) as WithdrawalStatus,
        routingHandle: result[7],
        completionHandle: result[8],
      };
    },
    [poolAddress, publicClient],
  );

  const applyTerminalRoute = useCallback(
    async (id: bigint, state: WithdrawalPublicState) => {
      setWithdrawalId(id);
      setTicket(state);
      setPendingHash(null);
      setPendingKind(null);
      const canonicalStage = canonicalWithdrawalStage(state.status);
      if (canonicalStage) {
        setStage(canonicalStage);
      } else {
        throw new Error(
          `Withdrawal remains ${withdrawalStatusLabels[state.status] ?? "in an unknown state"}.`,
        );
      }
      await snapshot.refetch();
    },
    [snapshot],
  );

  const fail = useCallback(
    (cause: unknown, action: "request" | "routing" | "service" | "completion", hash?: Hex) => {
      setError(sanitizeError(cause));
      setLastAction(action);
      setStage(hash ? "uncertain" : "failed");
    },
    [],
  );

  const resolveRouting = useCallback(
    async (id: bigint) => {
      setError(null);
      setLastAction("routing");
      if (!address || !walletClient || !poolAddress) {
        fail(
          new Error("Wallet, verified pool, or Zama public decryption is unavailable."),
          "routing",
        );
        return;
      }
      let routingHash: Hex | undefined;
      try {
        const current = await readWithdrawal(id);
        if (current.owner.toLowerCase() !== address.toLowerCase()) {
          throw new Error("The withdrawal ticket is not bound to the connected wallet.");
        }
        if (current.status !== WithdrawalStatus.RoutingPending) {
          await applyTerminalRoute(id, current);
          return;
        }
        if (current.routingHandle === ZERO_HANDLE)
          throw new Error("The routing handle is not ready.");
        setWithdrawalId(id);
        setTicket(current);
        setStage("routing-proof");
        const zamaClient = zama.client ?? (await zama.ensureReady());
        const reveal = await zamaClient.publicDecrypt([current.routingHandle]);
        const hasRemainder = publicBoolean(reveal.clearValues[current.routingHandle]);
        setStage("routing-signing");
        const hash = await walletClient.writeContract({
          account: address,
          address: poolAddress,
          abi: poolAbi,
          functionName: "finalizeWithdrawalRouting",
          args: [id, hasRemainder, reveal.decryptionProof],
        });
        routingHash = hash;
        setPendingHash(hash);
        setPendingKind("routing");
        recordSubmittedOperation(
          "withdrawal",
          `${id.toString()}:routing`,
          hash,
          "withdrawal-routed",
          { chainId, wallet: address },
        );
        setStage("routing-confirming");
        const receipt = await waitForReceipt(hash);
        if (receipt.status !== "success")
          throw new Error(
            "Withdrawal routing finalization reverted. The original ticket remains intact.",
          );
        updateOperation(`veilsave:withdrawal:${id.toString()}:routing`, {
          expectedState: "withdrawal-routed",
          retryable: false,
        });
        const routed = await readWithdrawal(id);
        invalidatePrivateValues();
        await applyTerminalRoute(id, routed);
      } catch (cause) {
        fail(cause, "routing", routingHash);
      }
    },
    [
      address,
      applyTerminalRoute,
      chainId,
      fail,
      poolAddress,
      readWithdrawal,
      waitForReceipt,
      walletClient,
      zama.client,
      zama.ensureReady,
    ],
  );

  const resolveCompletion = useCallback(
    async (id: bigint) => {
      setError(null);
      setLastAction("completion");
      if (!address || !walletClient || !poolAddress) {
        fail(
          new Error("Wallet, verified pool, or Zama public decryption is unavailable."),
          "completion",
        );
        return;
      }
      let completionHash: Hex | undefined;
      try {
        const current = await readWithdrawal(id);
        if (current.owner.toLowerCase() !== address.toLowerCase())
          throw new Error("The withdrawal ticket is not bound to the connected wallet.");
        if (current.status !== WithdrawalStatus.PayoutStatusPending) {
          await applyTerminalRoute(id, current);
          return;
        }
        if (current.completionHandle === ZERO_HANDLE)
          throw new Error("The completion handle is not ready.");
        setWithdrawalId(id);
        setTicket(current);
        setStage("completion-proof");
        const zamaClient = zama.client ?? (await zama.ensureReady());
        const reveal = await zamaClient.publicDecrypt([current.completionHandle]);
        const complete = publicBoolean(reveal.clearValues[current.completionHandle]);
        setStage("completion-signing");
        const hash = await walletClient.writeContract({
          account: address,
          address: poolAddress,
          abi: poolAbi,
          functionName: "finalizeWithdrawalCompletion",
          args: [id, complete, reveal.decryptionProof],
        });
        completionHash = hash;
        setPendingHash(hash);
        setPendingKind("completion");
        recordSubmittedOperation(
          "withdrawal",
          `${id.toString()}:completion`,
          hash,
          "withdrawal-completed",
          { chainId, wallet: address },
        );
        setStage("completion-confirming");
        const receipt = await waitForReceipt(hash);
        if (receipt.status !== "success")
          throw new Error(
            "Withdrawal completion finalization reverted. The remaining claim stays queued.",
          );
        updateOperation(`veilsave:withdrawal:${id.toString()}:completion`, {
          expectedState: "withdrawal-completed",
          retryable: false,
        });
        const completed = await readWithdrawal(id);
        invalidatePrivateValues();
        await applyTerminalRoute(id, completed);
      } catch (cause) {
        fail(cause, "completion", completionHash);
      }
    },
    [
      address,
      applyTerminalRoute,
      chainId,
      fail,
      poolAddress,
      readWithdrawal,
      waitForReceipt,
      walletClient,
      zama.client,
      zama.ensureReady,
    ],
  );

  const serviceHead = useCallback(
    async (id: bigint) => {
      setError(null);
      setLastAction("service");
      if (!walletReady || !address || !walletClient || !poolAddress) {
        fail(
          new Error("Connect the slot-owning Sepolia wallet before servicing the FIFO head."),
          "service",
        );
        return;
      }
      if (snapshot.data?.fifoHeadId !== id) {
        fail(
          new Error(
            "This ticket is not the current FIFO head. Earlier requests must be serviced first.",
          ),
          "service",
        );
        return;
      }
      let serviceHash: Hex | undefined;
      try {
        setStage("service-signing");
        const hash = await walletClient.writeContract({
          account: address,
          address: poolAddress,
          abi: poolAbi,
          functionName: "serviceFifoHead",
        });
        serviceHash = hash;
        setPendingHash(hash);
        setPendingKind("service");
        recordSubmittedOperation(
          "withdrawal",
          `${id.toString()}:service`,
          hash,
          "completion-proof",
          { chainId, wallet: address },
        );
        setStage("service-confirming");
        const receipt = await waitForReceipt(hash);
        if (receipt.status !== "success")
          throw new Error("FIFO service reverted. The queued claim remains intact.");
        updateOperation(`veilsave:withdrawal:${id.toString()}:service`, {
          expectedState: "completion-proof",
          retryable: false,
        });
        const serviced = await readWithdrawal(id);
        setTicket(serviced);
        setStage(
          serviced.status === WithdrawalStatus.PayoutStatusPending ? "completion-proof" : "queued",
        );
        setPendingHash(null);
        setPendingKind(null);
        await snapshot.refetch();
      } catch (cause) {
        fail(cause, "service", serviceHash);
      }
    },
    [
      address,
      chainId,
      fail,
      poolAddress,
      readWithdrawal,
      snapshot,
      waitForReceipt,
      walletClient,
      walletReady,
    ],
  );

  const confirmRequest = useCallback(
    async (hash: Hex) => {
      try {
        setStage("confirming");
        const receipt = await waitForReceipt(hash);
        if (receipt.status !== "success")
          throw new Error(
            "The withdrawal request reverted. A retry must create a fresh encrypted proof.",
          );
        const events = parseEventLogs({
          abi: poolAbi,
          logs: receipt.logs,
          eventName: "WithdrawalRequested",
          strict: false,
        });
        const requested = events.find((event) => event.eventName === "WithdrawalRequested");
        if (!requested)
          throw new Error("The receipt did not contain the expected withdrawal request event.");
        const args = requested.args as { requestId?: bigint; owner?: Address };
        if (
          args.requestId === undefined ||
          !address ||
          args.owner?.toLowerCase() !== address.toLowerCase()
        ) {
          throw new Error("The withdrawal event was not bound to the connected wallet.");
        }
        setWithdrawalId(args.requestId);
        updateOperation(`veilsave:withdrawal:${hash}`, {
          publicId: args.requestId.toString(),
          expectedState: "routing-proof",
          retryable: true,
        });
        invalidatePrivateValues();
        await snapshot.refetch();
        await resolveRouting(args.requestId);
      } catch (cause) {
        fail(cause, "request", hash);
      }
    },
    [address, fail, resolveRouting, snapshot, waitForReceipt],
  );

  useEffect(() => {
    if (!open || !recoveryRecord || loadedRecoveryId.current === recoveryRecord.id) return;
    loadedRecoveryId.current = recoveryRecord.id;
    setError(null);
    if (recoveryRecord.chainId !== undefined && recoveryRecord.chainId !== chainId) {
      setError(
        "This recovery record belongs to a different network. Switch to Sepolia before checking it.",
      );
      setStage("failed");
      return;
    }
    if (
      recoveryRecord.wallet &&
      (!address || recoveryRecord.wallet.toLowerCase() !== address.toLowerCase())
    ) {
      setError("Connect the wallet that owns this withdrawal ticket before resuming it.");
      setStage("failed");
      return;
    }
    const hash = recoveryRecord.replacementHash ?? recoveryRecord.txHash;
    const ticketId = parseWithdrawalPublicId(recoveryRecord.publicId);
    if (ticketId !== null) {
      setWithdrawalId(ticketId);
      setPendingHash(hash ?? null);
      if (recoveryRecord.expectedState === "withdrawal-completed") setPendingKind("completion");
      else if (recoveryRecord.expectedState === "completion-proof") setPendingKind("service");
      else setPendingKind("routing");
      void (async () => {
        try {
          const state = await readWithdrawal(ticketId);
          if (!address || state.owner.toLowerCase() !== address.toLowerCase()) {
            throw new Error(
              "The canonical withdrawal ticket is not bound to the connected wallet.",
            );
          }
          if (state.status === WithdrawalStatus.RoutingPending) {
            await resolveRouting(ticketId);
          } else {
            await applyTerminalRoute(ticketId, state);
          }
        } catch (cause) {
          fail(
            cause,
            recoveryRecord.expectedState === "withdrawal-completed"
              ? "completion"
              : recoveryRecord.expectedState === "completion-proof"
                ? "service"
                : "routing",
            hash,
          );
        }
      })();
      return;
    }
    if (!hash) {
      setError("This recovery record has no transaction hash or withdrawal ticket ID.");
      setStage("failed");
      return;
    }
    setPendingHash(hash);
    setPendingKind("request");
    setLastAction("request");
    void confirmRequest(hash);
  }, [
    address,
    applyTerminalRoute,
    chainId,
    confirmRequest,
    fail,
    open,
    readWithdrawal,
    recoveryRecord,
    resolveRouting,
    waitForReceipt,
  ]);

  const requestWithdrawal = useCallback(async () => {
    setError(null);
    setLastAction("request");
    const value = closing ? 0n : parsedAmount.value;
    if (!closing && (!value || parsedAmount.error)) {
      fail(new Error(parsedAmount.error ?? "Enter an amount to withdraw."), "request");
      return;
    }
    if (!walletReady || !address || !walletClient || !poolAddress) {
      fail(new Error("Wallet, deployment, or Zama encryption is not ready."), "request");
      return;
    }
    if (!position?.occupied || !slot || slot.status === SlotStatus.Closing) {
      fail(new Error("An active savings slot is required for this withdrawal."), "request");
      return;
    }
    if (slot.activeWithdrawalId !== 0n) {
      fail(
        new Error(
          "This slot already has an active withdrawal ticket. Resume that ticket instead of creating another.",
        ),
        "routing",
      );
      return;
    }
    try {
      let encrypted = { handle: ZERO_HANDLE, inputProof: "0x" as Hex };
      if (!closing) {
        setStage("encrypting");
        const zamaClient = zama.client ?? (await zama.ensureReady());
        encrypted = await zamaClient.encryptUint64(poolAddress, address, value!);
      }
      setStage("signing");
      const hash = await walletClient.writeContract({
        account: address,
        address: poolAddress,
        abi: poolAbi,
        functionName: "requestWithdrawal",
        args: [encrypted.handle, encrypted.inputProof, closing],
      });
      setAmount("");
      setRequestHash(hash);
      setPendingHash(hash);
      setPendingKind("request");
      recordSubmittedOperation("withdrawal", hash, hash, "routing-proof", {
        chainId,
        wallet: address,
      });
      await confirmRequest(hash);
    } catch (cause) {
      fail(cause, "request");
    }
  }, [
    address,
    chainId,
    closing,
    confirmRequest,
    fail,
    parsedAmount,
    poolAddress,
    position?.occupied,
    slot,
    walletClient,
    walletReady,
    zama.client,
    zama.ensureReady,
  ]);

  const resumePending = useCallback(async () => {
    setError(null);
    if (withdrawalId !== null) {
      if (pendingKind === "completion" || ticket?.status === WithdrawalStatus.PayoutStatusPending)
        await resolveCompletion(withdrawalId);
      else if (pendingKind === "service") await serviceHead(withdrawalId);
      else await resolveRouting(withdrawalId);
      return;
    }
    if (pendingKind === "request" && pendingHash) {
      await confirmRequest(pendingHash);
      return;
    }
    if (activeWithdrawalId !== 0n) {
      if (pendingKind === "completion") await resolveCompletion(activeWithdrawalId);
      else if (pendingKind === "service") await serviceHead(activeWithdrawalId);
      else await resolveRouting(activeWithdrawalId);
    }
  }, [
    activeWithdrawalId,
    confirmRequest,
    pendingHash,
    pendingKind,
    resolveCompletion,
    resolveRouting,
    serviceHead,
    ticket?.status,
    withdrawalId,
  ]);

  const retry = useCallback(() => {
    if (stage === "uncertain" || lastAction === "routing" || activeWithdrawalId !== 0n) {
      void resumePending();
    } else {
      void requestWithdrawal();
    }
  }, [activeWithdrawalId, lastAction, requestWithdrawal, resumePending, stage]);

  const amountError = amount ? parsedAmount.error : null;
  const busy = [
    "encrypting",
    "signing",
    "confirming",
    "routing-proof",
    "routing-signing",
    "routing-confirming",
    "service-signing",
    "service-confirming",
    "completion-proof",
    "completion-signing",
    "completion-confirming",
  ].includes(stage);
  const activeExisting = activeWithdrawalId !== 0n && withdrawalId === null && stage === "editing";
  const title =
    stage === "immediate" || stage === "complete"
      ? "Withdrawal complete"
      : stage === "queued"
        ? "Withdrawal queued"
        : "Withdraw principal";
  const footer =
    stage === "immediate" ||
    stage === "queued" ||
    stage === "completion-proof" ||
    stage === "complete" ? (
      <Button size="lg" block onClick={onClose}>
        Done
      </Button>
    ) : stage === "failed" || stage === "uncertain" || activeExisting ? (
      <Button size="lg" block icon="refresh-cw" onClick={retry}>
        {activeExisting
          ? "Resume active ticket"
          : stage === "uncertain"
            ? "Check existing request"
            : "Retry safely"}
      </Button>
    ) : (
      <Button
        size="lg"
        block
        icon="lock"
        busy={busy}
        disabled={
          !walletReady ||
          !position?.occupied ||
          (!closing && (!parsedAmount.value || Boolean(parsedAmount.error)))
        }
        onClick={() => void requestWithdrawal()}
      >
        {closing ? "Withdraw all and close slot" : "Request withdrawal"}
      </Button>
    );

  return (
    <Sheet
      open={open}
      eyebrow="Withdraw"
      title={title}
      onClose={onClose}
      footer={footer}
      fullHeight
    >
      {!walletReady ? (
        <>
          <StateBlock kind="unavailable" title="Sepolia wallet required">
            Connect the slot-owning wallet on Sepolia before preparing a confidential withdrawal.
          </StateBlock>
          <WalletControl />
        </>
      ) : null}
      {!position?.occupied && !snapshot.isLoading ? (
        <StateBlock kind="empty" title="No savings slot">
          A withdrawal can only be requested by the current owner of an occupied slot.
        </StateBlock>
      ) : null}
      {activeExisting ? (
        <RecoveryBanner
          tone="info"
          title={`Withdrawal ${activeWithdrawalId.toString()} is already active`}
        >
          One slot can have only one active ticket. Resume its public routing or settlement state;
          do not create a duplicate request.
        </RecoveryBanner>
      ) : null}

      {stage === "editing" && position?.occupied && !activeExisting ? (
        <>
          {!closing ? (
            <AmountField
              value={amount}
              onChange={setAmount}
              label="Amount to withdraw"
              error={amountError}
              helper="Encrypted locally. The immediate-versus-FIFO route remains unknown until its authenticated public boolean resolves."
              autoFocus
            />
          ) : (
            <StateBlock kind="waiting" title="Full principal exit">
              The contract ignores an external amount and uses the stored encrypted principal. The
              slot enters closing state until its ticket and epoch references are terminal.
            </StateBlock>
          )}
          <label className="vs-choice-row">
            <input
              type="checkbox"
              checked={closing}
              onChange={(event) => setClosing(event.target.checked)}
            />
            <span>
              <strong>Withdraw all and close this slot</strong>
              <small>
                The refundable public bond can be released only after the withdrawal and referenced
                epoch are terminal.
              </small>
            </span>
          </label>
          <div className="vs-flow-facts">
            <div>
              <span>Slot</span>
              <Badge icon="grid-2x2">Slot {String(position.slot + 1).padStart(2, "0")}</Badge>
            </div>
            <div>
              <span>Routing</span>
              <strong>Privately determined onchain</strong>
            </div>
            <p>
              Available confidential liquidity pays first. Any encrypted remainder receives an
              immutable request-time FIFO sequence.
            </p>
          </div>
        </>
      ) : null}

      {busy ? (
        <>
          <StatusPill tone="private" pulse>
            {stage.startsWith("routing")
              ? "Routing remains unknown"
              : stage.startsWith("service")
                ? "Servicing FIFO head"
                : stage.startsWith("completion")
                  ? "Confirming remaining claim"
                  : "Withdrawal request in progress"}
          </StatusPill>
          <StatusStepper steps={withdrawalSteps(stage, closing)} />
          <p className="vs-flow-note">
            The request amount is never used to predict the route in the browser. Only the pool’s
            authenticated encrypted routing result decides immediate settlement or FIFO.
          </p>
        </>
      ) : null}

      {stage === "failed" || stage === "uncertain" ? (
        <StateBlock
          kind={stage === "uncertain" ? "waiting" : "failed"}
          title={
            stage === "uncertain"
              ? "Existing request needs a state check"
              : "Withdrawal action paused"
          }
          safety={
            withdrawalId !== null || pendingHash
              ? "The existing public request or transaction reference is preserved. Retry will not create a second ticket."
              : "A new encrypted proof is created only when no request was submitted."
          }
        >
          {error}
          {pendingHash
            ? ` Transaction ${shortenMiddle(pendingHash, 10, 8)} is the recovery reference.`
            : ""}
        </StateBlock>
      ) : null}

      {stage === "immediate" ? (
        <>
          <div className="vs-result-line">
            <span>
              <Icon name="check" size={16} />
            </span>
            <div>
              <strong>Settled immediately</strong>
              <code>
                {requestHash
                  ? shortenMiddle(requestHash, 12, 8)
                  : withdrawalId !== null
                    ? `Withdrawal ${withdrawalId.toString()}`
                    : "Confirmed"}
              </code>
            </div>
          </div>
          <StatusStepper steps={withdrawalSteps(stage, closing)} />
          <p className="vs-flow-note">
            Confidential liquidity covered the request. The amount was not published, and the
            transfer returned cUSDT directly to the slot owner.
          </p>
        </>
      ) : null}

      {stage === "complete" ? (
        <>
          <div className="vs-result-line">
            <span>
              <Icon name="check" size={16} />
            </span>
            <div>
              <strong>Queued withdrawal completed</strong>
              <code>
                {withdrawalId !== null ? `Withdrawal ${withdrawalId.toString()}` : "Confirmed"}
              </code>
            </div>
          </div>
          <StatusStepper steps={withdrawalSteps(stage, closing)} />
          <p className="vs-flow-note">
            The FIFO ticket reached terminal completion after confidential claim liquidity became
            available. The amount remained encrypted.
          </p>
        </>
      ) : null}

      {stage === "queued" || stage === "completion-proof" ? (
        <>
          <RecoveryBanner
            tone="info"
            title={
              stage === "completion-proof"
                ? "Payout recorded, proof pending"
                : "FIFO is a normal protocol state"
            }
          >
            The unpaid encrypted remainder keeps its immutable request-time order. Strategy
            redemption, confidential rewrap, and queue service are permissionless and retryable.
          </RecoveryBanner>
          <section className="vs-ticket-panel">
            <div>
              <span>Withdrawal</span>
              <strong>{withdrawalId?.toString() ?? "—"}</strong>
            </div>
            <div>
              <span>FIFO sequence</span>
              <strong>{ticket?.fifoSequence.toString() ?? "—"}</strong>
            </div>
            <div>
              <span>Settlement</span>
              <strong>
                {ticket?.settlementId ? ticket.settlementId.toString() : "Not assigned"}
              </strong>
            </div>
            <div>
              <span>Status</span>
              <StatusPill tone={stage === "completion-proof" ? "private" : "pending"}>
                {stage === "completion-proof" ? "Completion proof" : "Queued"}
              </StatusPill>
            </div>
          </section>
          {stage === "completion-proof" ? (
            <Button
              block
              icon="key-round"
              onClick={() => withdrawalId !== null && void resolveCompletion(withdrawalId)}
            >
              Confirm encrypted remainder
            </Button>
          ) : (
            <Button
              block
              tone="secondary"
              icon="arrow-right"
              disabled={withdrawalId === null || snapshot.data?.fifoHeadId !== withdrawalId}
              onClick={() => withdrawalId !== null && void serviceHead(withdrawalId)}
            >
              Service current FIFO head
            </Button>
          )}
          <p className="vs-flow-note">
            If strategy redemption fails, this ticket remains intact and does not lose its
            request-time order. No public amount is shown.
          </p>
        </>
      ) : null}

      <PrivacyCallout
        compact
        limitation="The request transaction, ticket ID, FIFO sequence, and settlement timing are public. The requested and unpaid amounts remain encrypted."
      />
    </Sheet>
  );
}

function withdrawalSteps(stage: WithdrawalStage, closing: boolean): StatusStep[] {
  const requestDone = [
    "routing-proof",
    "routing-signing",
    "routing-confirming",
    "immediate",
    "queued",
    "complete",
  ].includes(stage);
  const routeDone = stage === "immediate" || stage === "queued" || stage === "complete";
  return [
    {
      label: closing ? "Stored encrypted principal selected" : "Encrypted in your browser",
      status: stage === "encrypting" ? "active" : stage === "editing" ? "future" : "done",
    },
    {
      label: "Request submitted",
      status:
        stage === "signing"
          ? "active"
          : stage === "confirming"
            ? "active"
            : requestDone
              ? "done"
              : "future",
      detail: "The slot receives one stable withdrawal ticket.",
    },
    {
      label: "Routing proof",
      status:
        stage === "routing-proof" || stage === "routing-signing" || stage === "routing-confirming"
          ? "active"
          : routeDone
            ? "done"
            : "future",
      detail:
        "The authenticated public boolean reveals only whether an encrypted remainder exists.",
    },
    {
      label:
        stage === "queued" || stage === "complete"
          ? "Strict FIFO settlement"
          : "Confidential transfer",
      status: routeDone ? "done" : "future",
      meta:
        stage === "queued"
          ? "QUEUED"
          : stage === "complete"
            ? "COMPLETE"
            : stage === "immediate"
              ? "SETTLED"
              : undefined,
    },
  ];
}
