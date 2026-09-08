import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount, useChainId, usePublicClient, useWalletClient } from "wagmi";
import {
  encodeAbiParameters,
  formatUnits,
  parseEventLogs,
  type Address,
  type Hex,
  type TransactionReceipt,
} from "viem";

import { SEPOLIA_CHAIN_ID } from "@veilsave/shared";

import { ConfidentialValue } from "../../components/ConfidentialValue";
import { WalletControl } from "../../components/WalletControl";
import { poolAbi, tokenAbi, underlyingTokenAbi } from "../../config/abis";
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
import { parseCusdtAmount, recordSubmittedOperation } from "../transactions/transactionUtils";
import { useUserDecryptor } from "../../hooks/useUserDecryptor";
import { sanitizeError, updateOperation, type OperationRecord } from "../../lib/operationStore";
import { invalidatePrivateValues, usePrivateValue } from "../../lib/privacy";
import { useDeployment } from "../../providers/DeploymentProvider";
import { useZama } from "../../providers/ZamaProvider";
import { EpochStatus, SlotStatus } from "../../protocol/types";
import { useProtocolSnapshot } from "../../protocol/useProtocolSnapshot";

const ZERO_HANDLE = `0x${"0".repeat(64)}` as Hex;
const CONFIRMATIONS = 2;

type DepositStage =
  | "editing"
  | "reserving"
  | "approving"
  | "wrapping"
  | "encrypting"
  | "signing"
  | "confirming"
  | "verifying"
  | "success"
  | "uncertain"
  | "failed";

type PendingKind = "reserve" | "approve" | "wrap" | "deposit";

export function DepositFlow({
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
  const { decryptHandle } = useUserDecryptor();
  const [amount, setAmount] = useState("");
  const [stage, setStage] = useState<DepositStage>("editing");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingHash, setPendingHash] = useState<Hex | null>(null);
  const [pendingKind, setPendingKind] = useState<PendingKind | null>(null);
  const [lastAction, setLastAction] = useState<"reserve" | "wrap" | "deposit" | null>(null);
  const [confirmedHash, setConfirmedHash] = useState<Hex | null>(null);
  const [pendingEpoch, setPendingEpoch] = useState<bigint | null>(null);
  const loadedRecoveryId = useRef<string | null>(null);

  const manifest = deployment.manifest;
  const poolAddress = manifest?.contracts.confidentialPrizePool.address as Address | undefined;
  const tokenAddress = manifest?.external.confidentialToken as Address | undefined;
  const underlyingAddress = manifest?.external.underlyingToken as Address | undefined;
  const position = snapshot.data?.position;
  const slot = position?.occupied ? snapshot.data?.slots[position.slot] : undefined;
  const parsedAmount = useMemo(() => parseCusdtAmount(amount), [amount]);
  const walletReady = Boolean(address && walletClient && chainId === SEPOLIA_CHAIN_ID);
  const reservationPaused = Boolean((snapshot.data?.pauseMask ?? 0) & 1);
  const depositsPaused = Boolean((snapshot.data?.pauseMask ?? 0) & 2);

  const asset = useQuery({
    queryKey: ["veilsave", "asset-readiness", manifest?.sourceCommit, address],
    enabled: Boolean(
      publicClient && address && tokenAddress && underlyingAddress && deployment.status === "ready",
    ),
    staleTime: 6_000,
    queryFn: async () => {
      if (!publicClient || !address || !tokenAddress || !underlyingAddress) {
        throw new Error("Asset client is unavailable");
      }
      const [publicBalance, allowance, confidentialHandle] = await Promise.all([
        publicClient.readContract({
          address: underlyingAddress,
          abi: underlyingTokenAbi,
          functionName: "balanceOf",
          args: [address],
        }),
        publicClient.readContract({
          address: underlyingAddress,
          abi: underlyingTokenAbi,
          functionName: "allowance",
          args: [address, tokenAddress],
        }),
        publicClient.readContract({
          address: tokenAddress,
          abi: tokenAbi,
          functionName: "confidentialBalanceOf",
          args: [address],
        }),
      ]);
      return { publicBalance, allowance, confidentialHandle: confidentialHandle || ZERO_HANDLE };
    },
  });

  const confidentialBalance = usePrivateValue({
    identityKey:
      address && tokenAddress && asset.data?.confidentialHandle
        ? `${chainId}:${address}:${tokenAddress}:${asset.data.confidentialHandle}`
        : undefined,
    decrypt: async () => {
      if (!tokenAddress || !asset.data?.confidentialHandle)
        throw new Error("The cUSDT balance handle is unavailable.");
      if (asset.data.confidentialHandle === ZERO_HANDLE) return 0n;
      return decryptHandle(asset.data.confidentialHandle, tokenAddress);
    },
  });

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

  const fail = useCallback((cause: unknown, action: "reserve" | "wrap" | "deposit", hash?: Hex) => {
    setError(sanitizeError(cause));
    setLastAction(action);
    setStage(hash ? "uncertain" : "failed");
  }, []);

  const confirmReservation = useCallback(
    async (hash: Hex) => {
      try {
        setStage("confirming");
        const receipt = await waitForReceipt(hash);
        if (receipt.status !== "success")
          throw new Error("Slot reservation reverted. No slot was assigned.");
        const events = parseEventLogs({
          abi: poolAbi,
          logs: receipt.logs,
          eventName: "SlotReserved",
          strict: false,
        });
        const reserved = events.find((event) => event.eventName === "SlotReserved");
        if (!reserved)
          throw new Error("The receipt did not contain the expected slot reservation event.");
        updateOperation(`veilsave:slot-reservation:${hash}`, {
          expectedState: "slot-reserved",
          retryable: false,
        });
        await snapshot.refetch();
        setPendingHash(null);
        setPendingKind(null);
        setNotice(
          "Slot reserved. The 0.001 Sepolia ETH bond remains public and refundable after a safe slot close.",
        );
        setStage("editing");
      } catch (cause) {
        fail(cause, "reserve", hash);
      }
    },
    [fail, snapshot, waitForReceipt],
  );

  const reserveSlot = useCallback(async () => {
    setError(null);
    setNotice(null);
    setLastAction("reserve");
    if (!walletReady || !address || !walletClient || !poolAddress || !manifest) {
      fail(new Error("Connect a Sepolia wallet and wait for the verified deployment."), "reserve");
      return;
    }
    try {
      setStage("reserving");
      const hash = await walletClient.writeContract({
        account: address,
        address: poolAddress,
        abi: poolAbi,
        functionName: "reserveSlot",
        value: BigInt(manifest.pool.slotBondWei),
      });
      setPendingHash(hash);
      setPendingKind("reserve");
      recordSubmittedOperation("slot-reservation", hash, hash, "slot-reserved", {
        chainId,
        wallet: address,
      });
      await confirmReservation(hash);
    } catch (cause) {
      fail(cause, "reserve");
    }
  }, [
    address,
    chainId,
    confirmReservation,
    fail,
    manifest,
    poolAddress,
    walletClient,
    walletReady,
  ]);

  const confirmWrap = useCallback(
    async (hash: Hex) => {
      try {
        setStage("confirming");
        const receipt = await waitForReceipt(hash);
        if (receipt.status !== "success")
          throw new Error(
            "The cUSDT wrap reverted. Public underlying remains in your wallet unless an earlier approval succeeded.",
          );
        updateOperation(`veilsave:asset-wrap:${hash}`, {
          expectedState: "cusdt-ready",
          retryable: false,
        });
        await asset.refetch();
        confidentialBalance.markStale();
        invalidatePrivateValues();
        setPendingHash(null);
        setPendingKind(null);
        setNotice(
          "cUSDT prepared. The wrap amount and transaction are public; the resulting cUSDT balance is confidential.",
        );
        setStage("editing");
      } catch (cause) {
        fail(cause, "wrap", hash);
      }
    },
    [asset, confidentialBalance, fail, waitForReceipt],
  );

  const submitWrap = useCallback(
    async (value: bigint) => {
      if (!walletReady || !address || !walletClient || !tokenAddress) {
        fail(new Error("Connect a Sepolia wallet before wrapping cUSDT."), "wrap");
        return;
      }
      try {
        setStage("wrapping");
        const hash = await walletClient.writeContract({
          account: address,
          address: tokenAddress,
          abi: tokenAbi,
          functionName: "wrap",
          args: [address, value],
        });
        setPendingHash(hash);
        setPendingKind("wrap");
        recordSubmittedOperation("asset-wrap", hash, hash, "cusdt-ready", {
          chainId,
          wallet: address,
        });
        await confirmWrap(hash);
      } catch (cause) {
        fail(cause, "wrap");
      }
    },
    [address, chainId, confirmWrap, fail, tokenAddress, walletClient, walletReady],
  );

  const prepareCusdt = useCallback(async () => {
    setError(null);
    setNotice(null);
    setLastAction("wrap");
    const value = parsedAmount.value;
    if (!value || parsedAmount.error) {
      fail(new Error(parsedAmount.error ?? "Enter an amount to wrap."), "wrap");
      return;
    }
    if (!asset.data || !underlyingAddress || !tokenAddress || !address || !walletClient) {
      fail(
        new Error("Public asset readiness is unavailable. Retry the canonical asset read."),
        "wrap",
      );
      return;
    }
    if (asset.data.publicBalance < value) {
      fail(
        new Error("The public underlying balance is lower than the entered wrap amount."),
        "wrap",
      );
      return;
    }
    try {
      if (asset.data.allowance < value) {
        setStage("approving");
        const approvalHash = await walletClient.writeContract({
          account: address,
          address: underlyingAddress,
          abi: underlyingTokenAbi,
          functionName: "approve",
          args: [tokenAddress, value],
        });
        setPendingHash(approvalHash);
        setPendingKind("approve");
        recordSubmittedOperation("asset-wrap", approvalHash, approvalHash, "underlying-approved", {
          chainId,
          wallet: address,
        });
        try {
          const receipt = await waitForReceipt(approvalHash);
          if (receipt.status !== "success")
            throw new Error("The public underlying approval reverted.");
          updateOperation(`veilsave:asset-wrap:${approvalHash}`, {
            expectedState: "underlying-approved",
            retryable: false,
          });
        } catch (cause) {
          fail(cause, "wrap", approvalHash);
          return;
        }
      }
      await submitWrap(value);
    } catch (cause) {
      fail(cause, "wrap");
    }
  }, [
    address,
    asset.data,
    chainId,
    fail,
    parsedAmount,
    submitWrap,
    tokenAddress,
    underlyingAddress,
    waitForReceipt,
    walletClient,
  ]);

  const confirmDeposit = useCallback(
    async (hash: Hex, previousPrincipalHandle?: Hex) => {
      try {
        setStage("confirming");
        const receipt = await waitForReceipt(hash);
        if (receipt.status !== "success")
          throw new Error(
            "The confidential deposit transaction reverted. A retry must create a fresh encrypted proof.",
          );
        setStage("verifying");
        const events = parseEventLogs({
          abi: poolAbi,
          logs: receipt.logs,
          eventName: "DepositProcessed",
          strict: false,
        });
        const processed = events.find((event) => event.eventName === "DepositProcessed");
        if (!processed)
          throw new Error("The transaction confirmed without the expected pool callback event.");
        const args = processed.args as { owner?: Address; pendingEpoch?: bigint };
        if (!address || args.owner?.toLowerCase() !== address.toLowerCase()) {
          throw new Error("The callback event was not bound to the connected wallet.");
        }
        const refreshedSnapshot = await snapshot.refetch();
        await asset.refetch();
        if (
          previousPrincipalHandle &&
          refreshedSnapshot.data?.position?.principalHandle?.toLowerCase() ===
            previousPrincipalHandle.toLowerCase()
        ) {
          throw new Error(
            "The pool callback was rejected and your principal did not change. Your cUSDT transfer was refunded.",
          );
        }
        updateOperation(`veilsave:deposit:${hash}`, {
          expectedState: "callback-processed",
          epochId: args.pendingEpoch?.toString(),
          retryable: false,
        });
        confidentialBalance.markStale();
        invalidatePrivateValues();
        setPendingEpoch(args.pendingEpoch ?? null);
        setConfirmedHash(hash);
        setPendingHash(null);
        setPendingKind(null);
        setAmount("");
        setStage("success");
      } catch (cause) {
        fail(cause, "deposit", hash);
      }
    },
    [address, asset, confidentialBalance, fail, snapshot, waitForReceipt],
  );

  useEffect(() => {
    if (!open || !recoveryRecord || loadedRecoveryId.current === recoveryRecord.id) return;
    loadedRecoveryId.current = recoveryRecord.id;
    setError(null);
    setNotice(null);
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
      setError(
        "Connect the wallet that submitted this operation before checking its canonical state.",
      );
      setStage("failed");
      return;
    }
    const hash = recoveryRecord.replacementHash ?? recoveryRecord.txHash;
    if (!hash) {
      setError("This recovery record has no public transaction reference.");
      setStage("failed");
      return;
    }
    setPendingHash(hash);
    if (recoveryRecord.kind === "slot-reservation") {
      setPendingKind("reserve");
      setLastAction("reserve");
      void confirmReservation(hash);
    } else if (recoveryRecord.kind === "deposit") {
      setPendingKind("deposit");
      setLastAction("deposit");
      void confirmDeposit(hash);
    } else if (recoveryRecord.kind === "asset-wrap") {
      setPendingKind(recoveryRecord.expectedState === "underlying-approved" ? "approve" : "wrap");
      setLastAction("wrap");
      if (recoveryRecord.expectedState === "underlying-approved") {
        void waitForReceipt(hash)
          .then((receipt) => {
            if (receipt.status !== "success")
              throw new Error("The public underlying approval reverted.");
            updateOperation(recoveryRecord.id, {
              retryable: false,
              lastCheckedBlock: receipt.blockNumber.toString(),
            });
            setPendingHash(null);
            setPendingKind(null);
            setNotice(
              "The public approval confirmed. Re-enter an amount to continue wrapping cUSDT; no amount was stored in the browser.",
            );
            setStage("editing");
          })
          .catch((cause) => fail(cause, "wrap", hash));
      } else {
        void confirmWrap(hash);
      }
    }
  }, [
    address,
    chainId,
    confirmDeposit,
    confirmReservation,
    confirmWrap,
    fail,
    open,
    recoveryRecord,
    waitForReceipt,
  ]);

  const submitDeposit = useCallback(async () => {
    setError(null);
    setNotice(null);
    setLastAction("deposit");
    const value = parsedAmount.value;
    if (!value || parsedAmount.error) {
      fail(new Error(parsedAmount.error ?? "Enter an amount to deposit."), "deposit");
      return;
    }
    if (
      !walletReady ||
      !address ||
      !walletClient ||
      !publicClient ||
      !poolAddress ||
      !tokenAddress
    ) {
      fail(new Error("Wallet, deployment, RPC, or Zama encryption is not ready."), "deposit");
      return;
    }
    if (!position?.occupied || slot?.status === SlotStatus.Closing) {
      fail(new Error("Reserve an active slot before depositing."), "deposit");
      return;
    }
    try {
      setStage("encrypting");
      const zamaClient = zama.client ?? (await zama.ensureReady());
      const [encrypted, route] = await Promise.all([
        zamaClient.encryptUint64(tokenAddress, address, value),
        publicClient.readContract({
          address: poolAddress,
          abi: poolAbi,
          functionName: "DEPOSIT_ROUTE",
        }),
      ]);
      const routeData = encodeAbiParameters([{ type: "bytes4" }], [route]);
      setStage("signing");
      const hash = await walletClient.writeContract({
        account: address,
        address: tokenAddress,
        abi: tokenAbi,
        functionName: "confidentialTransferAndCall",
        args: [poolAddress, encrypted.handle, encrypted.inputProof, routeData],
      });
      setAmount("");
      setPendingHash(hash);
      setPendingKind("deposit");
      recordSubmittedOperation("deposit", hash, hash, "callback-processed", {
        chainId,
        wallet: address,
      });
      await confirmDeposit(hash, position?.principalHandle ?? ZERO_HANDLE);
    } catch (cause) {
      fail(cause, "deposit");
    }
  }, [
    address,
    chainId,
    confirmDeposit,
    fail,
    parsedAmount,
    poolAddress,
    position?.principalHandle,
    position?.occupied,
    publicClient,
    slot?.status,
    tokenAddress,
    walletClient,
    walletReady,
    zama.client,
    zama.ensureReady,
  ]);

  const resumePending = useCallback(async () => {
    if (!pendingHash || !pendingKind) return;
    setError(null);
    if (pendingKind === "reserve") await confirmReservation(pendingHash);
    else if (pendingKind === "wrap") await confirmWrap(pendingHash);
    else if (pendingKind === "deposit") await confirmDeposit(pendingHash);
    else {
      const value = parsedAmount.value;
      try {
        const receipt = await waitForReceipt(pendingHash);
        if (receipt.status !== "success")
          throw new Error("The public underlying approval reverted.");
        if (!value)
          throw new Error("Re-enter the wrap amount after confirming the approval transaction.");
        await submitWrap(value);
      } catch (cause) {
        fail(cause, "wrap", pendingHash);
      }
    }
  }, [
    confirmDeposit,
    confirmReservation,
    confirmWrap,
    fail,
    parsedAmount.value,
    pendingHash,
    pendingKind,
    submitWrap,
    waitForReceipt,
  ]);

  const retry = useCallback(() => {
    if (stage === "uncertain" && pendingHash) {
      void resumePending();
    } else if (lastAction === "reserve") {
      void reserveSlot();
    } else if (lastAction === "wrap") {
      void prepareCusdt();
    } else if (lastAction === "deposit") {
      void submitDeposit();
    }
  }, [lastAction, pendingHash, prepareCusdt, reserveSlot, resumePending, stage, submitDeposit]);

  const firstEligibleEpoch = snapshot.data
    ? snapshot.data.currentEpochId + (snapshot.data.epoch.status === EpochStatus.Open ? 1n : 2n)
    : null;
  const occupiedCount =
    snapshot.data?.slots.filter((item) => item.status !== SlotStatus.Free).length ?? 0;
  const busy = !["editing", "success", "failed", "uncertain"].includes(stage);
  const publicBalance = asset.data ? formatUnits(asset.data.publicBalance, 6) : null;
  const amountError = amount ? parsedAmount.error : null;

  const steps = depositSteps(stage);
  const title = stage === "success" ? "Deposit processed" : "Save cUSDT";
  const footer =
    stage === "success" ? (
      <Button size="lg" block onClick={onClose}>
        Done
      </Button>
    ) : stage === "failed" || stage === "uncertain" ? (
      <Button size="lg" block icon="refresh-cw" onClick={retry}>
        {stage === "uncertain" ? "Check transaction" : "Retry safely"}
      </Button>
    ) : position?.occupied ? (
      <Button
        size="lg"
        block
        icon="lock"
        busy={busy}
        disabled={
          !walletReady ||
          depositsPaused ||
          !parsedAmount.value ||
          Boolean(parsedAmount.error) ||
          zama.status !== "ready"
        }
        onClick={() => void submitDeposit()}
      >
        Encrypt and deposit
      </Button>
    ) : (
      <Button
        size="lg"
        block
        icon="grid-2x2"
        busy={stage === "reserving" || stage === "confirming"}
        disabled={!walletReady || reservationPaused || occupiedCount >= 16}
        onClick={() => void reserveSlot()}
      >
        Reserve a slot · 0.001 Sepolia ETH
      </Button>
    );

  return (
    <Sheet open={open} eyebrow="Deposit" title={title} onClose={onClose} footer={footer} fullHeight>
      {!walletReady ? (
        <>
          <StateBlock kind="unavailable" title="Sepolia wallet required">
            Transaction controls remain disabled until the wallet is connected to Sepolia.
          </StateBlock>
          <WalletControl />
        </>
      ) : null}
      {snapshot.isError ? (
        <StateBlock
          kind="offline"
          title="Pool state unavailable"
          actionLabel="Retry RPC read"
          onAction={() => void snapshot.refetch()}
        >
          A deposit cannot be prepared until the slot and epoch state are read canonically.
        </StateBlock>
      ) : null}
      {reservationPaused && !position?.occupied ? (
        <RecoveryBanner tone="paused" title="Slot reservation is paused">
          Existing positions and withdrawals remain available. A new slot cannot be reserved until
          the timelocked pause is cleared.
        </RecoveryBanner>
      ) : null}
      {depositsPaused && position?.occupied ? (
        <RecoveryBanner tone="paused" title="New deposits are paused">
          Your existing principal remains confidential and withdrawable. cUSDT preparation is still
          available, but the pool deposit control is disabled.
        </RecoveryBanner>
      ) : null}

      {!position?.occupied && !busy && stage !== "failed" && stage !== "uncertain" ? (
        occupiedCount >= 16 ? (
          <StateBlock kind="unavailable" title="All 16 slots are occupied">
            VeilSave cannot accept another participant until a safely closed slot is released.
          </StateBlock>
        ) : (
          <StateBlock
            kind="empty"
            title="Reserve one public slot"
            safety="The bond is separate from confidential principal."
          >
            The slot owner and 0.001 Sepolia ETH refundable bond are public. Savings amounts remain
            encrypted.
          </StateBlock>
        )
      ) : null}

      {position?.occupied && stage === "editing" ? (
        <>
          {notice ? (
            <StatusPill tone="verified" icon="check">
              {notice}
            </StatusPill>
          ) : null}
          <div className="vs-asset-readiness">
            <div>
              <Icon name="wallet" size={15} />
              <span>cUSDT in your wallet</span>
            </div>
            <ConfidentialValue
              label="Wallet balance"
              status={confidentialBalance.status}
              value={confidentialBalance.value}
              onReveal={() => void confidentialBalance.reveal()}
              onRemask={confidentialBalance.remask}
              onRetry={() => void confidentialBalance.reveal()}
              error={confidentialBalance.error}
              hint="Optional reveal"
            />
          </div>
          <AmountField
            value={amount}
            onChange={setAmount}
            error={amountError}
            helper="Encrypted locally before the confidential transfer is submitted."
            autoFocus
          />
          <section className="vs-preparation-panel" aria-labelledby="prepare-cusdt-title">
            <div>
              <div className="vs-label">Need cUSDT?</div>
              <h3 id="prepare-cusdt-title">Wrap public test USDT</h3>
              <p>
                The entered wrap amount, approval, and wrap transaction are public. The resulting
                cUSDT balance is confidential.
              </p>
            </div>
            <div className="vs-preparation-meta">
              <span>Public balance</span>
              <strong>
                {asset.isLoading
                  ? "Reading…"
                  : publicBalance
                    ? `${publicBalance} USDT`
                    : "Unavailable"}
              </strong>
            </div>
            <Button
              tone="secondary"
              icon="arrow-down-to-line"
              disabled={
                !parsedAmount.value ||
                Boolean(parsedAmount.error) ||
                asset.isLoading ||
                asset.isError
              }
              onClick={() => void prepareCusdt()}
            >
              Wrap entered amount
            </Button>
          </section>
          <div className="vs-flow-facts">
            <div>
              <span>Slot</span>
              <Badge icon="grid-2x2">
                {position ? `Slot ${String(position.slot + 1).padStart(2, "0")}` : "Reserved"}
              </Badge>
            </div>
            <div>
              <span>First eligible</span>
              <strong>
                {firstEligibleEpoch
                  ? `Epoch ${firstEligibleEpoch.toString()}`
                  : "Pending canonical read"}
              </strong>
            </div>
            <p>
              A deposit joins pending weight and participates only after one complete epoch.
              Principal remains withdrawable.
            </p>
          </div>
        </>
      ) : null}

      {busy ? (
        <>
          <StatusPill tone="private" pulse>
            {stage === "reserving"
              ? "Reserving slot"
              : stage === "approving" || stage === "wrapping"
                ? "Preparing cUSDT"
                : "Deposit in progress"}
          </StatusPill>
          <StatusStepper steps={steps} />
          <p className="vs-flow-note">
            You may close this sheet after a transaction hash exists. Only public operation metadata
            is kept for recovery.
          </p>
        </>
      ) : null}

      {stage === "failed" || stage === "uncertain" ? (
        <StateBlock
          kind={stage === "uncertain" ? "waiting" : "failed"}
          title={stage === "uncertain" ? "Receipt state is uncertain" : "Action did not complete"}
          safety={
            pendingHash
              ? "Do not resubmit the confidential action until this transaction is checked."
              : "A retry creates fresh encryption when required."
          }
        >
          {error}
          {pendingHash
            ? ` Transaction ${shortenMiddle(pendingHash, 10, 8)} remains the recovery reference.`
            : ""}
        </StateBlock>
      ) : null}

      {stage === "success" ? (
        <>
          <div className="vs-result-line">
            <span>
              <Icon name="check" size={16} />
            </span>
            <div>
              <strong>Confidential callback processed</strong>
              <code>{confirmedHash ? shortenMiddle(confirmedHash, 12, 8) : "Confirmed"}</code>
            </div>
          </div>
          <StatusStepper steps={steps} />
          <p className="vs-flow-note">
            The pool processed the ERC-7984 callback for your slot. The amount is not public;
            explicitly reveal your refreshed principal or pending weight when you want to verify the
            private result.{pendingEpoch ? ` It targets epoch ${pendingEpoch.toString()}.` : ""}
          </p>
        </>
      ) : null}

      <PrivacyCallout
        compact
        limitation="The wrap boundary is public. The VeilSave deposit amount, principal, and weight remain encrypted."
      />
    </Sheet>
  );
}

function depositSteps(stage: DepositStage): StatusStep[] {
  const order: DepositStage[] = ["encrypting", "signing", "confirming", "verifying", "success"];
  const index = order.indexOf(stage);
  const status = (step: number): StatusStep["status"] =>
    stage === "failed"
      ? "failed"
      : stage === "uncertain" && step === 2
        ? "active"
        : index > step || stage === "success"
          ? "done"
          : index === step
            ? "active"
            : "future";
  return [
    { label: "Encrypted in your browser", status: status(0), meta: "FHE INPUT PROOF" },
    {
      label: "Approve in your wallet",
      status: status(1),
      detail: "Nothing is submitted until the wallet approves the confidential token call.",
    },
    {
      label: "Confirming on Sepolia",
      status: status(2),
      detail: `${CONFIRMATIONS} confirmations are required before callback verification.`,
    },
    {
      label: "Token callback accounting",
      status: status(3),
      detail: "The pool event and canonical slot state are checked without exposing the amount.",
    },
  ];
}
