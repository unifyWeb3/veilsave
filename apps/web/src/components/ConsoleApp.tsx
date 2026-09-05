import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";

import type { OperationRecord } from "../lib/operationStore";
import { DrawTimeline } from "./DrawTimeline";
import { OperationRecovery } from "./OperationRecovery";
import { PoolOverview } from "./PoolOverview";
import { ProtocolHealth } from "./ProtocolHealth";
import { WalletControl } from "./WalletControl";
import {
  Button,
  ConsoleNav,
  EvidenceRow,
  Icon,
  PrivacyCallout,
  SectionHead,
  StateBlock,
  StatusPill,
  StrategyBadge,
} from "../design/Primitives";
import { DepositFlow } from "../features/deposit/DepositFlow";
import { DrawLifecycle } from "../features/draw/DrawLifecycle";
import { WithdrawFlow } from "../features/withdrawal/WithdrawFlow";
import { useDeployment } from "../providers/DeploymentProvider";
import { EpochStatus } from "../protocol/types";
import { useEpochEvidence } from "../protocol/useEpochEvidence";
import { usePublicHistory } from "../protocol/usePublicHistory";
import { useEpochSnapshot, useProtocolSnapshot } from "../protocol/useProtocolSnapshot";

export function ConsoleApp() {
  const deployment = useDeployment();
  const location = useLocation();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState<"deposit" | "withdraw" | null>(null);
  const openSheet = (kind: "deposit" | "withdraw") => {
    void deployment.ensureTransactionReady().then((ready) => {
      if (ready) setSheet(kind);
    });
  };
  const [recoveryRecord, setRecoveryRecord] = useState<OperationRecord | null>(null);
  const strategyMode = deployment.manifest?.strategy.mode === "LIVE_STRATEGY" ? "live" : "test";
  const writesEnabled = deployment.status === "ready";
  const path = location.pathname;
  const active = path.includes("/draws")
    ? "draws"
    : path.includes("/history")
      ? "history"
      : path.includes("/privacy")
        ? "privacy"
        : "dashboard";
  const items = [
    { id: "dashboard", label: "Dashboard", icon: "vault" as const },
    { id: "draws", label: "Draws", icon: "dices" as const },
    { id: "history", label: "History", icon: "layers" as const },
  ];
  const secondary = [{ id: "privacy", label: "Privacy", icon: "lock" as const }];
  const onNavigate = (id: string) => {
    if (id === "dashboard") navigate("/app");
    else if (id === "draws") navigate("/app/draws/current");
    else navigate(`/app/${id}`);
  };

  return (
    <div className="vs-console-frame">
      <ConsoleNav
        variant="rail"
        items={items}
        secondary={secondary}
        active={active}
        onNavigate={onNavigate}
        footer={
          <>
            <StrategyBadge mode={strategyMode} />
            <WalletControl compact />
          </>
        }
      />
      <main className="vs-console-main">
        <header className="vs-console-topbar">
          <div className="vs-console-title">
            <div className="vs-label">Sepolia · VeilSave console</div>
            <h1>
              {active === "dashboard"
                ? "Dashboard"
                : active === "draws"
                  ? "Draw verification"
                  : active === "history"
                    ? "History"
                    : "Privacy"}
            </h1>
          </div>
          <div className="vs-console-actions">
            <StrategyBadge mode={strategyMode} withHint={false} />
            <ProtocolHealth />
            <WalletControl compact />
          </div>
        </header>
        {deployment.status === "loading" ? (
          <div className="vs-console-content">
            <StateBlock kind="loading" title="Checking deployment">
              The console verifies the active Sepolia manifest and runtime bytecode before showing
              transaction controls.
            </StateBlock>
          </div>
        ) : (
          <div className="vs-console-content">
            {deployment.status === "error" ? (
              <StateBlock
                kind="failed"
                title="Deployment validation stopped"
                actionLabel="Retry validation"
                onAction={deployment.retry}
              >
                The console will not read or transact against an unverified contract configuration.{" "}
                {deployment.error}
              </StateBlock>
            ) : null}
            {deployment.status === "read-only" ? (
              <StateBlock
                kind="waiting"
                title="Read-only live inspection"
                safety="Transactions are disabled until the ACTIVE deployment manifest is published."
                actionLabel="Retry validation"
                onAction={deployment.retry}
              >
                Showing genuine Sepolia state from the bytecode-verified candidate deployment.
                Deposit, withdrawal, and claim controls unlock after release validation completes.
                Selecting a transaction re-checks release status automatically.
              </StateBlock>
            ) : null}
            {writesEnabled ? (
              <OperationRecovery
                onResume={(record) => {
                  setRecoveryRecord(record);
                  setSheet(record.kind === "withdrawal" ? "withdraw" : "deposit");
                }}
                onViewDraws={(record) => {
                  setRecoveryRecord(record);
                  const epoch =
                    record.epochId && /^[1-9][0-9]*$/.test(record.epochId)
                      ? record.epochId
                      : "current";
                  navigate(`/app/draws/${epoch}`);
                }}
                onViewSettlement={(record) => {
                  setRecoveryRecord(record);
                  navigate("/app");
                }}
              />
            ) : null}
            <Routes>
              <Route
                index
                element={
                  <PoolOverview
                    onDeposit={() => openSheet("deposit")}
                    onWithdraw={() => openSheet("withdraw")}
                    settlementRecoveryRecord={
                      recoveryRecord?.kind === "settlement" ? recoveryRecord : null
                    }
                  />
                }
              />
              <Route path="draws" element={<Navigate to="/app/draws/current" replace />} />
              <Route
                path="draws/:epochId"
                element={
                  <DrawDetail
                    recoveryRecord={recoveryRecord?.kind !== "settlement" ? recoveryRecord : null}
                  />
                }
              />
              <Route path="history" element={<HistoryPage />} />
              <Route path="privacy" element={<ConsolePrivacy />} />
              <Route path="*" element={<Navigate to="/app" replace />} />
            </Routes>
          </div>
        )}
        <ConsoleNav
          variant="bottom"
          items={items}
          active={active === "draws" ? "draws" : active === "history" ? "history" : "dashboard"}
          onNavigate={onNavigate}
        />
      </main>
      {writesEnabled && sheet === "deposit" ? (
        <DepositFlow
          open
          recoveryRecord={recoveryRecord}
          onClose={() => {
            setSheet(null);
            setRecoveryRecord(null);
          }}
        />
      ) : null}
      {writesEnabled && sheet === "withdraw" ? (
        <WithdrawFlow
          open
          recoveryRecord={recoveryRecord}
          onClose={() => {
            setSheet(null);
            setRecoveryRecord(null);
          }}
        />
      ) : null}
    </div>
  );
}

function DrawDetail({ recoveryRecord }: { recoveryRecord?: OperationRecord | null }) {
  const { epochId } = useParams();
  const snapshot = useProtocolSnapshot();
  const parsedEpochId = parseEpochId(epochId);
  const selectedEpoch = useEpochSnapshot(
    parsedEpochId.kind === "historical" ? parsedEpochId.value : undefined,
  );
  const deployment = useDeployment();
  const evidenceEpochId =
    parsedEpochId.kind === "historical"
      ? parsedEpochId.value
      : parsedEpochId.kind === "current"
        ? snapshot.data?.epoch.id
        : undefined;
  const evidence = useEpochEvidence(evidenceEpochId);
  const navigate = useNavigate();
  if (parsedEpochId.kind === "invalid")
    return (
      <StateBlock kind="failed" title="Invalid epoch">
        Use a positive numeric epoch ID or the current-epoch route.
      </StateBlock>
    );

  const usesCurrentRoute = parsedEpochId.kind === "current";
  const query = usesCurrentRoute ? snapshot : selectedEpoch;
  if (query.isLoading)
    return (
      <StateBlock kind="loading" title="Reading draw evidence">
        The public epoch lifecycle is being refreshed from Sepolia.
      </StateBlock>
    );
  if (query.isError)
    return (
      <StateBlock
        kind="offline"
        title="Draw evidence unavailable"
        safety="No protocol state was changed."
        actionLabel="Retry"
        onAction={() => void query.refetch()}
      >
        The configured RPC did not return the requested epoch evidence.
      </StateBlock>
    );

  const epoch = usesCurrentRoute ? snapshot.data?.epoch : selectedEpoch.data;
  if (!epoch || epoch.status === EpochStatus.None)
    return (
      <StateBlock
        kind="empty"
        title="Epoch not found"
        actionLabel="View current epoch"
        onAction={() => navigate("/app/draws/current")}
      >
        The pool has no canonical state for this epoch ID.
      </StateBlock>
    );

  return (
    <div className="vs-dashboard">
      <SectionHead
        label="Public verification"
        title={`Epoch ${epoch.id.toString()}`}
        description={
          usesCurrentRoute
            ? "Current epoch evidence, read directly from canonical contract state."
            : "Historical epoch evidence is read directly from the pool. This view never infers a winner from private balances."
        }
        actions={
          <Button tone="ghost" size="sm" icon="chevron-left" onClick={() => navigate("/app")}>
            Back to dashboard
          </Button>
        }
      />
      <DrawTimeline
        epoch={epoch}
        evidence={evidence.data}
        evidencePending={evidence.isLoading || evidence.isFetching}
        evidenceError={evidence.isError}
        explorerUrl={deployment.runtime.explorerUrl}
      />
      <DrawLifecycle
        epoch={epoch}
        isCurrent={snapshot.data?.currentEpochId === epoch.id}
        observedBlock={
          snapshot.data?.currentEpochId === epoch.id ? snapshot.data?.blockNumber : undefined
        }
        onRefresh={() => Promise.all([query.refetch(), snapshot.refetch()])}
        recoveryRecord={recoveryRecord}
      />
      <PrivacyCallout compact />
    </div>
  );
}

function parseEpochId(
  epochId: string | undefined,
): { kind: "current" } | { kind: "historical"; value: bigint } | { kind: "invalid" } {
  if (!epochId || epochId === "current") return { kind: "current" };
  if (!/^[1-9][0-9]*$/.test(epochId)) return { kind: "invalid" };
  try {
    return { kind: "historical", value: BigInt(epochId) };
  } catch {
    return { kind: "invalid" };
  }
}

function HistoryPage() {
  const snapshot = useProtocolSnapshot();
  const history = usePublicHistory();
  const deployment = useDeployment();
  if (snapshot.isLoading)
    return (
      <StateBlock kind="loading" title="Reading public history">
        Epoch and settlement metadata is being refreshed from Sepolia.
      </StateBlock>
    );
  if (snapshot.isError || !snapshot.data)
    return (
      <StateBlock
        kind="offline"
        title="History unavailable"
        safety="Your private values are unaffected."
        actionLabel="Retry"
        onAction={() => void snapshot.refetch()}
      >
        The configured RPC did not return current public metadata.
      </StateBlock>
    );
  const data = snapshot.data;
  return (
    <div className="vs-dashboard">
      <SectionHead
        label="Public record"
        title="History"
        description="Epoch, withdrawal, slot, and settlement metadata is public. Private balances, weights, claims, and prize amounts are not."
      />
      <section className="vs-panel">
        <div className="vs-panel-body">
          <SectionHead
            label="Latest canonical read"
            title={`Epoch ${data.currentEpochId.toString()}`}
            description="Use draw verification for the full public evidence trail."
          />
          <div className="vs-history-list">
            <div>
              <span>Status</span>
              <strong>{data.epoch.status}</strong>
            </div>
            <div>
              <span>Frozen slots</span>
              <strong>{data.epoch.frozenSlotCount} / 16</strong>
            </div>
            <div>
              <span>VRF request</span>
              <strong className="mono">
                {data.epoch.requestId === 0n ? "Not requested" : data.epoch.requestId.toString()}
              </strong>
            </div>
            <div>
              <span>Winner</span>
              <strong className="mono">
                {!data.epoch.winnerFinalized
                  ? "Pending"
                  : data.epoch.finalizedWinner === "0x0000000000000000000000000000000000000000"
                    ? "None (no winner)"
                    : data.epoch.finalizedWinner}
              </strong>
            </div>
          </div>
        </div>
      </section>
      {history.isLoading ? (
        <StateBlock kind="loading" title="Refreshing public evidence">
          The console is reading canonical events from Sepolia. Private values are excluded.
        </StateBlock>
      ) : history.isError ? (
        <StateBlock
          kind="offline"
          title="Event history unavailable"
          safety="The current canonical snapshot remains readable."
          actionLabel="Retry history"
          onAction={() => void history.refetch()}
        >
          The configured RPC did not return the public event trail.
        </StateBlock>
      ) : (
        <section className="vs-panel vs-panel--quiet">
          <div className="vs-panel-body">
            <SectionHead
              label="Event trail"
              title="Recent public protocol activity"
              description="Transaction references are public evidence only. Ciphertext handles are never rendered as financial values."
            />
            <div className="vs-history-events">
              {history.data?.map((item) => (
                <article className="vs-history-event" key={item.id}>
                  <div className="vs-history-event-marker">
                    <Icon
                      name={
                        item.status === "terminal"
                          ? "ban"
                          : item.kind === "winner"
                            ? "badge-check"
                            : item.kind === "settlement"
                              ? "layers"
                              : item.kind === "withdrawal"
                                ? "arrow-up-from-line"
                                : item.kind === "randomness"
                                  ? "dices"
                                  : "file-check"
                      }
                      size={14}
                    />
                  </div>
                  <div className="vs-history-event-content">
                    <div className="vs-history-event-heading">
                      <strong>{item.label}</strong>
                      <StatusPill
                        tone={
                          item.status === "terminal"
                            ? "terminal"
                            : item.status === "pending"
                              ? "pending"
                              : "verified"
                        }
                      >
                        {item.status === "terminal"
                          ? "Terminal"
                          : item.status === "pending"
                            ? "Retryable"
                            : "Verified"}
                      </StatusPill>
                    </div>
                    <p>{item.detail}</p>
                    <EvidenceRow
                      label="Transaction"
                      kind="hash"
                      value={item.transactionHash}
                      href={`${deployment.runtime.explorerUrl}/tx/${item.transactionHash}`}
                      verified
                    />
                  </div>
                </article>
              ))}
            </div>
            {history.data?.length === 0 ? (
              <StateBlock kind="empty" title="No public events yet" compact>
                The pool has not emitted a history event in the configured deployment range.
              </StateBlock>
            ) : null}
          </div>
        </section>
      )}
    </div>
  );
}

function ConsolePrivacy() {
  return (
    <div className="vs-dashboard">
      <SectionHead
        label="Trust and boundaries"
        title="Privacy"
        description="Confidential financial amounts, not transaction-graph anonymity."
      />
      <PrivacyCallout />
      <section className="vs-panel vs-panel--quiet">
        <div className="vs-panel-body">
          <SectionHead
            label="Verification limit"
            title="What the public can and cannot recompute"
            description="Balances and odds remain hidden. Anyone can inspect the randomness and authenticated execution trail, but cannot independently recompute the weighted result from plaintext balances."
          />
        </div>
      </section>
    </div>
  );
}
