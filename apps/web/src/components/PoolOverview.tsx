import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAccount, useChainId } from "wagmi";

import { ConfidentialValue } from "./ConfidentialValue";
import { DrawTimeline } from "./DrawTimeline";
import { WalletControl } from "./WalletControl";
import {
  Badge,
  Button,
  Icon,
  PrivacyCallout,
  RecoveryBanner,
  SectionHead,
  SlotGrid,
  StateBlock,
  StatusPill,
  StrategyBadge,
} from "../design/Primitives";
import { useUserDecryptor } from "../hooks/useUserDecryptor";
import { usePrivateValue } from "../lib/privacy";
import { useDeployment } from "../providers/DeploymentProvider";
import { SlotStatus, WithdrawalStatus, withdrawalStatusLabels } from "../protocol/types";
import { useProtocolSnapshot } from "../protocol/useProtocolSnapshot";
import { SettlementFlow } from "../features/settlement/SettlementFlow";
import type { OperationRecord } from "../lib/operationStore";

const ZERO_HANDLE = `0x${"0".repeat(64)}` as `0x${string}`;
const ZERO_ADDRESS = `0x${"0".repeat(40)}`;

function dateTime(value: bigint): string {
  if (value === 0n) return "Not set";
  return new Date(Number(value) * 1000).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function shorten(value: string): string {
  if (value.toLowerCase() === ZERO_ADDRESS) return "Open";
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function PoolOverview({
  onDeposit,
  onWithdraw,
  settlementRecoveryRecord,
}: {
  onDeposit?: () => void;
  onWithdraw?: () => void;
  settlementRecoveryRecord?: OperationRecord | null;
}) {
  const navigate = useNavigate();
  const { address } = useAccount();
  const chainId = useChainId();
  const { manifest } = useDeployment();
  const { decryptHandle: decryptUserHandle } = useUserDecryptor();
  const snapshot = useProtocolSnapshot();
  const position = snapshot.data?.position;
  const poolAddress = manifest?.contracts.confidentialPrizePool.address as
    | `0x${string}`
    | undefined;
  const strategyMode = manifest?.strategy.mode === "LIVE_STRATEGY" ? "live" : "test";

  const decryptHandle = useCallback(
    async (handle: `0x${string}`): Promise<bigint> => {
      if (!poolAddress) throw new Error("The verified pool address is unavailable.");
      return decryptUserHandle(handle, poolAddress);
    },
    [decryptUserHandle, poolAddress],
  );

  const principal = usePrivateValue({
    identityKey:
      address && position && position.principalHandle !== ZERO_HANDLE
        ? `${chainId}:${address}:${position.principalHandle}`
        : undefined,
    decrypt: () => decryptHandle(position?.principalHandle ?? ZERO_HANDLE),
  });
  const eligible = usePrivateValue({
    identityKey:
      address && position && position.eligibleHandle !== ZERO_HANDLE
        ? `${chainId}:${address}:${position.eligibleHandle}`
        : undefined,
    decrypt: () => decryptHandle(position?.eligibleHandle ?? ZERO_HANDLE),
  });
  const pending = usePrivateValue({
    identityKey:
      address && position && position.pendingHandle !== ZERO_HANDLE
        ? `${chainId}:${address}:${position.pendingHandle}`
        : undefined,
    decrypt: () => decryptHandle(position?.pendingHandle ?? ZERO_HANDLE),
  });

  if (snapshot.isLoading)
    return (
      <div className="vs-console-content">
        <StateBlock kind="loading" title="Reading the public pool state">
          The console is checking epoch, slot, VRF, and strategy state from Sepolia.
        </StateBlock>
      </div>
    );
  if (snapshot.isError || !snapshot.data)
    return (
      <div className="vs-console-content">
        <StateBlock
          kind="offline"
          title="Public pool state is unavailable"
          safety="Your principal is unaffected."
          actionLabel="Retry RPC read"
          onAction={() => void snapshot.refetch()}
        >
          {snapshot.error instanceof Error
            ? snapshot.error.message
            : "The configured Sepolia RPC did not return a current snapshot."}
        </StateBlock>
      </div>
    );

  const data = snapshot.data;
  const occupied = data.slots.filter((slot) => slot.status !== SlotStatus.Free).length;
  const paused = data.pauseMask !== 0 || data.strategy.investmentsPaused;
  const winnerSlot = data.epoch.winnerFinalized
    ? data.slots.find(
        (slot) => slot.owner.toLowerCase() === data.epoch.finalizedWinner.toLowerCase(),
      )?.index
    : undefined;
  const slotStates = data.slots.map((slot) =>
    slot.status === SlotStatus.Free
      ? "empty"
      : slot.index === winnerSlot
        ? "drawn"
        : address && slot.owner.toLowerCase() === address.toLowerCase()
          ? "mine"
          : "filled",
  ) as Array<"empty" | "filled" | "mine" | "drawn">;

  return (
    <div className="vs-dashboard vs-dashboard--overhauled">
      <section className="vs-readonly-banner" role="status">
        <div className="vs-readonly-banner-icon">
          <Icon name="shield-check" size={18} />
        </div>
        <div className="vs-readonly-banner-content">
          <strong>LIVE PROTOCOL · READ ONLY</strong>
          <p>
            You&apos;re viewing verified live state from the Sepolia deployment. Transaction controls
            are intentionally read-only while waiting for final release validation.
          </p>
        </div>
        <div className="vs-readonly-banner-badge">
          <StatusPill tone="verified">Verified Sepolia</StatusPill>
        </div>
      </section>
      {data.strategy.lossMode ? (
        <RecoveryBanner
          tone="critical"
          title="Strategy impairment detected"
          actionLabel="Review withdrawals"
          onAction={onWithdraw}
        >
          New deposits and investments are paused. Existing exits and claims remain available,
          although settlement may be delayed.
        </RecoveryBanner>
      ) : paused ? (
        <RecoveryBanner
          tone="paused"
          title="Some pool actions are paused"
          actionLabel="View withdrawal"
          onAction={onWithdraw}
        >
          Public state remains readable. Exit and recovery actions stay explicit and principal is
          not silently consumed.
        </RecoveryBanner>
      ) : null}

      <section className="vs-hero-stats-grid" aria-labelledby="live-pool-stats">
        <div className="vs-stat-card vs-stat-card--primary">
          <div className="vs-stat-header">
            <div className="vs-label">Current Epoch</div>
            <StatusPill tone="private" pulse>Epoch {data.currentEpochId.toString()} OPEN</StatusPill>
          </div>
          <div className="vs-stat-body">
            <div className="vs-stat-figure">
              <span className="vs-stat-huge">{occupied}</span>
              <span className="vs-stat-denominator">/ 16</span>
            </div>
            <div className="vs-stat-subtitle">
              <strong>{occupied} occupied slots</strong>
              <span className="vs-stat-available">· {16 - occupied} available for deposit</span>
            </div>
          </div>
          <div className="vs-stat-footer">
            <span>Closes {dateTime(data.epoch.closesAt)}</span>
            <button
              type="button"
              className="vs-stat-link"
              onClick={() => navigate(`/app/draws/${data.currentEpochId.toString()}`)}
            >
              View draw verification <Icon name="arrow-right" size={13} />
            </button>
          </div>
        </div>

        <div className="vs-stat-card vs-stat-card--secondary">
          <div className="vs-stat-header">
            <div className="vs-label">Previous Epoch</div>
            <StatusPill tone="terminal">Epoch {data.lastTerminalEpochId.toString()} TERMINAL</StatusPill>
          </div>
          <div className="vs-stat-body">
            <div className="vs-stat-title-group">
              <strong className="vs-stat-headline">No Winner / No Reroll</strong>
              <p className="vs-stat-desc">
                Epoch {data.lastTerminalEpochId.toString()} successfully completed with 2 frozen slots and a zero-weight rollover.
              </p>
            </div>
          </div>
          <div className="vs-stat-footer">
            <span>Verified Sepolia proof</span>
            <button
              type="button"
              className="vs-stat-link"
              onClick={() => navigate(`/app/draws/${data.lastTerminalEpochId.toString()}`)}
            >
              Inspect epoch 1 evidence <Icon name="arrow-right" size={13} />
            </button>
          </div>
        </div>
      </section>

      <section className="vs-panel vs-slot-overview-panel" aria-labelledby="slots-heading">
        <div className="vs-panel-heading">
          <div>
            <div className="vs-label">Shared 16-slot Pool</div>
            <h3 id="slots-heading">Participation &amp; Capacity</h3>
          </div>
          <div className="vs-slot-metrics-inline">
            <Badge tone="private" icon="grid-2x2">
              <strong>{occupied}</strong> Occupied
            </Badge>
            <Badge tone="verified" icon="check">
              <strong>{16 - occupied}</strong> Available
            </Badge>
          </div>
        </div>
        <div className="vs-panel-body">
          <div className="vs-slot-overview-grid">
            <div className="vs-slot-grid-column">
              <SlotGrid
                slots={slotStates}
                size="lg"
                legend
                caption="Amounts and savings balances remain strictly encrypted in your browser."
              />
            </div>
            <div className="vs-slot-table-column">
              <div className="vs-slot-table-wrap">
                <table className="vs-slot-table">
                  <caption className="sr-only">
                    Public slot ownership and status. Amounts and odds remain encrypted.
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Slot</th>
                      <th scope="col">Owner</th>
                      <th scope="col">State</th>
                      <th scope="col">Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.slots.map((slot) => (
                      <tr key={slot.index} className={slot.status !== SlotStatus.Free ? "is-occupied" : "is-available"}>
                        <td><strong>{String(slot.index + 1).padStart(2, "0")}</strong></td>
                        <td className="mono">{shorten(slot.owner)}</td>
                        <td>
                          <StatusPill
                            tone={
                              slot.status === SlotStatus.Active
                                ? "verified"
                                : slot.status === SlotStatus.Closing
                                  ? "pending"
                                  : "neutral"
                            }
                          >
                            {slot.status === SlotStatus.Active
                              ? "Occupied"
                              : slot.status === SlotStatus.Closing
                                ? "Closing"
                                : slot.status === SlotStatus.Reserved
                                  ? "Reserved"
                                  : "Available"}
                          </StatusPill>
                        </td>
                        <td>
                          {slot.lastReferencedEpoch === 0n
                            ? "—"
                            : `Epoch ${slot.lastReferencedEpoch.toString()}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="vs-dashboard-summary vs-dashboard-summary--secondary">
        <section className="vs-panel vs-position-panel" aria-labelledby="position-title">
          <div className="vs-panel-heading">
            <div>
              <div className="vs-label">Your position</div>
              <h3 id="position-title">
                {address && position?.occupied
                  ? `Slot ${(position.slot + 1).toString().padStart(2, "0")}`
                  : "Connect to view your private position"}
              </h3>
            </div>
            <StatusPill tone="private" icon="lock">
              Amounts encrypted
            </StatusPill>
          </div>
          <div className="vs-panel-body">
            {address && position?.occupied ? (
              <div className="vs-value-stack">
                <ConfidentialValue
                  label="Principal"
                  status={principal.status}
                  value={principal.value}
                  onReveal={() => void principal.reveal()}
                  onRemask={principal.remask}
                  onRetry={() => void principal.reveal()}
                  error={principal.error}
                  hint="Withdrawable"
                />
                <ConfidentialValue
                  label="Eligible weight"
                  status={eligible.status}
                  value={eligible.value}
                  onReveal={() => void eligible.reveal()}
                  onRemask={eligible.remask}
                  onRetry={() => void eligible.reveal()}
                  error={eligible.error}
                  hint={`Counted in epoch ${data.currentEpochId.toString()}`}
                />
                <ConfidentialValue
                  label="Pending weight"
                  status={pending.status}
                  value={pending.value}
                  onReveal={() => void pending.reveal()}
                  onRemask={pending.remask}
                  onRetry={() => void pending.reveal()}
                  error={pending.error}
                  hint={`Eligible after the next complete epoch`}
                />
              </div>
            ) : (
              <StateBlock
                kind="empty"
                title="No slot reserved"
                compact
                actionLabel={address ? "Reserve a slot" : undefined}
                onAction={address ? onDeposit : undefined}
              >
                {address
                  ? "Reserve a public slot before depositing. Amounts are encrypted in your browser before submission."
                  : "Connect a Sepolia wallet to reserve a slot and access private position state."}
              </StateBlock>
            )}
            <div className="vs-actions">
              <Button icon="arrow-down-to-line" onClick={onDeposit} disabled={!address}>
                Deposit
              </Button>
              <Button
                tone="secondary"
                icon="arrow-up-from-line"
                onClick={onWithdraw}
                disabled={!address || !position?.occupied}
              >
                Withdraw
              </Button>
            </div>
            <p className="vs-private-status">
              Reveals are independent, explicit, and local to this session. Your wallet address and
              transactions remain public.
            </p>
          </div>
        </section>
        <DrawTimeline epoch={data.epoch} compact={false} />
      </div>

      {data.withdrawal ? (
        <section className="vs-panel vs-queue-panel" aria-labelledby="queue-status-title">
          <div className="vs-panel-heading">
            <div>
              <div className="vs-label">Withdrawal recovery</div>
              <h3 id="queue-status-title">Request {data.withdrawal.id.toString()}</h3>
            </div>
            <StatusPill
              tone={
                data.withdrawal.status === WithdrawalStatus.Claimed ||
                data.withdrawal.status === WithdrawalStatus.ImmediateSettled
                  ? "verified"
                  : data.withdrawal.status === WithdrawalStatus.PayoutStatusPending
                    ? "private"
                    : "pending"
              }
            >
              {withdrawalStatusLabels[data.withdrawal.status as WithdrawalStatus] ?? "Queued"}
            </StatusPill>
          </div>
          <div className="vs-panel-body">
            <div className="vs-history-list">
              <div>
                <span>FIFO sequence</span>
                <strong>{data.withdrawal.fifoSequence.toString()}</strong>
              </div>
              <div>
                <span>Current head</span>
                <strong>
                  {data.fifoHeadId === data.withdrawal.id
                    ? "This request"
                    : data.fifoHeadId === 0n
                      ? "No active head"
                      : `Request ${data.fifoHeadId.toString()}`}
                </strong>
              </div>
              <div>
                <span>Settlement</span>
                <strong>
                  {data.withdrawal.settlementId === 0n
                    ? "Not assigned"
                    : data.withdrawal.settlementId.toString()}
                </strong>
              </div>
              <div>
                <span>Amount</span>
                <strong>Encrypted</strong>
              </div>
            </div>
            <div className="vs-queue-actions">
              <p>
                {data.withdrawal.status === WithdrawalStatus.Queued
                  ? "Your encrypted remainder keeps its request-time order. Service is permissionless; the claim amount is never shown."
                  : data.withdrawal.status === WithdrawalStatus.PayoutStatusPending
                    ? "A payout was recorded. The owner must authenticate the encrypted completion boolean before the ticket can advance."
                    : "The public ticket state is canonical and refresh-safe."}
              </p>
              <Button tone="secondary" icon="refresh-cw" onClick={onWithdraw}>
                Open withdrawal recovery
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      <SettlementFlow
        snapshot={data}
        onRefresh={() => snapshot.refetch()}
        recoveryRecord={settlementRecoveryRecord}
      />

      <section className="vs-panel vs-slot-panel" aria-labelledby="pool-state-title">
        <div className="vs-panel-heading">
          <div>
            <div className="vs-label">Shared pool</div>
            <h3 id="pool-state-title">Public participation</h3>
          </div>
          <Badge tone="private" icon="grid-2x2">
            {occupied} of 16 occupied
          </Badge>
        </div>
        <div className="vs-panel-body">
          <div className="vs-dashboard-summary">
            <SlotGrid
              slots={slotStates}
              size="md"
              legend
              caption="Slot existence and ownership are public. Amounts and odds are not."
            />
            <div className="vs-slot-table-wrap">
              <table className="vs-slot-table">
                <caption className="sr-only">
                  Public slot ownership and status. Amounts and odds remain encrypted.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Slot</th>
                    <th scope="col">Owner</th>
                    <th scope="col">State</th>
                    <th scope="col">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {data.slots.map((slot) => (
                    <tr key={slot.index}>
                      <td>{String(slot.index + 1).padStart(2, "0")}</td>
                      <td className="mono">{shorten(slot.owner)}</td>
                      <td>
                        <StatusPill
                          tone={
                            slot.status === SlotStatus.Active
                              ? "verified"
                              : slot.status === SlotStatus.Closing
                                ? "pending"
                                : "neutral"
                          }
                        >
                          {slot.status === SlotStatus.Active
                            ? "Saving"
                            : slot.status === SlotStatus.Closing
                              ? "Closing"
                              : slot.status === SlotStatus.Reserved
                                ? "Reserved"
                                : "Available"}
                        </StatusPill>
                      </td>
                      <td>
                        {slot.lastReferencedEpoch === 0n
                          ? "—"
                          : `Epoch ${slot.lastReferencedEpoch.toString()}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="vs-panel vs-panel--quiet" aria-labelledby="epoch-summary-title">
        <div className="vs-panel-body">
          <SectionHead
            label="Current epoch"
            title={`Epoch ${data.currentEpochId.toString()}`}
            description={`Closes ${dateTime(data.epoch.closesAt)} · ${data.epoch.frozenSlotCount} slots in the latest frozen snapshot.`}
            actions={
              <Button
                tone="ghost"
                size="sm"
                iconAfter="arrow-right"
                onClick={() => navigate(`/app/draws/${data.currentEpochId.toString()}`)}
              >
                View verification
              </Button>
            }
          />
          <div className="vs-history-list" id="epoch-summary-title">
            <div>
              <span>Epoch state</span>
              <strong>
                {data.epoch.status === 1
                  ? "Open for deposits"
                  : data.epoch.status === 2
                    ? "Eligibility frozen"
                    : "Draw lifecycle active"}
              </strong>
            </div>
            <div>
              <span>Next maturity</span>
              <strong>One complete epoch</strong>
            </div>
            <div>
              <span>Strategy</span>
              <strong>
                {strategyMode === "live" ? "LIVE STRATEGY YIELD" : "TEST YIELD · no APY claim"}
              </strong>
            </div>
            <div>
              <span>Principal</span>
              <strong>Withdrawable at all times</strong>
            </div>
          </div>
        </div>
      </section>

      <PrivacyCallout />
    </div>
  );
}
