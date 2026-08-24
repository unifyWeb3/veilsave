import { useEffect, useState } from "react";

import { Button, Icon, RecoveryBanner, StatusPill, shortenMiddle } from "../design/Primitives";
import {
  listOperations,
  subscribeOperations,
  type OperationKind,
  type OperationRecord,
} from "../lib/operationStore";

const KIND_LABELS: Record<OperationKind, string> = {
  "asset-wrap": "cUSDT preparation",
  "slot-reservation": "Slot reservation",
  deposit: "Confidential deposit",
  withdrawal: "Withdrawal",
  draw: "Draw lifecycle",
  "winner-proof": "Winner proof",
  "prize-reveal": "Prize access",
  settlement: "Strategy settlement",
};

function stateLabel(record: OperationRecord): string {
  return record.retryable ? "Recovery available" : "Recorded";
}

function isActionable(record: OperationRecord): boolean {
  return record.retryable;
}

function publicIdLabel(record: OperationRecord): string {
  if (record.kind === "withdrawal") return `Request ${record.publicId}`;
  if (record.kind === "draw" || record.kind === "winner-proof" || record.kind === "prize-reveal") {
    return record.epochId ? `Epoch ${record.epochId}` : `Lifecycle ${record.publicId}`;
  }
  return `Reference ${shortenMiddle(record.publicId ?? "", 10, 8)}`;
}

export function OperationRecovery({
  onResume,
  onViewDraws,
  onViewSettlement,
}: {
  onResume: (record: OperationRecord) => void;
  onViewDraws: (record: OperationRecord) => void;
  onViewSettlement: (record: OperationRecord) => void;
}) {
  const [operations, setOperations] = useState<OperationRecord[]>(() => listOperations());
  useEffect(() => {
    const refresh = () => setOperations(listOperations());
    const unsubscribe = subscribeOperations(refresh);
    window.addEventListener("storage", refresh);
    return () => {
      unsubscribe();
      window.removeEventListener("storage", refresh);
    };
  }, []);
  const actionable = operations.filter(isActionable).slice(0, 4);
  if (actionable.length === 0) return null;

  return (
    <section className="vs-operation-recovery" aria-labelledby="recovery-title">
      <div className="vs-operation-recovery-heading">
        <div>
          <div className="vs-label">Browser recovery</div>
          <h2 id="recovery-title">Operations that need a check</h2>
        </div>
        <StatusPill tone="pending" icon="refresh-cw">
          Reload-safe
        </StatusPill>
      </div>
      <p className="vs-operation-recovery-intro">
        Only public transaction references are kept here. No amount, ciphertext, proof, or private
        reveal is persisted.
      </p>
      <div className="vs-operation-list">
        {actionable.map((record) => {
          const isWalletFlow =
            record.kind === "deposit" ||
            record.kind === "withdrawal" ||
            record.kind === "asset-wrap" ||
            record.kind === "slot-reservation";
          return (
            <article className="vs-operation-item" key={record.id}>
              <div className="vs-operation-item-main">
                <div className="vs-operation-item-title">
                  <Icon name={record.retryable ? "refresh-cw" : "hourglass"} size={14} />
                  <strong>{KIND_LABELS[record.kind]}</strong>
                  <StatusPill tone={record.retryable ? "pending" : "neutral"}>
                    {stateLabel(record)}
                  </StatusPill>
                </div>
                <div className="vs-operation-item-meta">
                  {record.publicId ? <span>{publicIdLabel(record)}</span> : null}
                  {record.epochId ? <span>Epoch {record.epochId}</span> : null}
                  {record.txHash ? (
                    <span className="mono">{shortenMiddle(record.txHash, 10, 8)}</span>
                  ) : null}
                </div>
              </div>
              <div className="vs-operation-item-actions">
                {isWalletFlow ? (
                  <Button
                    tone="secondary"
                    size="sm"
                    icon="refresh-cw"
                    onClick={() => onResume(record)}
                  >
                    Resume
                  </Button>
                ) : null}
                {record.kind === "draw" ||
                record.kind === "winner-proof" ||
                record.kind === "prize-reveal" ? (
                  <Button
                    tone="secondary"
                    size="sm"
                    icon="file-check"
                    onClick={() => onViewDraws(record)}
                  >
                    View draw
                  </Button>
                ) : null}
                {record.kind === "settlement" ? (
                  <Button
                    tone="secondary"
                    size="sm"
                    icon="layers"
                    onClick={() => onViewSettlement(record)}
                  >
                    Resume settlement
                  </Button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
      <RecoveryBanner tone="info" title="No duplicate writes">
        Check the existing transaction or public request before retrying. The protocol state remains
        authoritative.
      </RecoveryBanner>
    </section>
  );
}
