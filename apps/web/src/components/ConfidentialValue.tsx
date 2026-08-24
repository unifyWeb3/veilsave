import type { ReactNode } from "react";

import type { ConfidentialValueStatus } from "../lib/privacy";
import { Button, Icon, ProgressTrack, formatSix } from "../design/Primitives";

function statusCopy(status: ConfidentialValueStatus): string {
  switch (status) {
    case "permit-required": return "Encrypted · reveal requires a scoped permit";
    case "permit-signing": return "Confirming private access";
    case "decrypting": return "Preparing secure reveal…";
    case "revealed": return "Visible in this session only";
    case "stale": return "Reveal is stale · request a fresh value";
    case "unavailable": return "Private value unavailable";
    case "error-retryable": return "Reveal failed · retry available";
    case "remasked": return "Remasked locally";
    default: return "Private value hidden";
  }
}

export function ConfidentialValue({
  label,
  status,
  value,
  unit = "cUSDT",
  onReveal,
  onRemask,
  onRetry,
  error,
  hint,
}: {
  label: string;
  status: ConfidentialValueStatus;
  value: bigint | null;
  unit?: string;
  onReveal: () => void;
  onRemask: () => void;
  onRetry?: () => void;
  error?: string | null;
  hint?: ReactNode;
}) {
  const isRevealed = status === "revealed" && value !== null;
  const busy = status === "permit-signing" || status === "decrypting";
  const action = status === "error-retryable" ? onRetry ?? onReveal : onReveal;
  return (
    <div className="vs-value-row" data-testid={`confidential-${label}`}>
      <div className="vs-value-row-head"><span>{label}</span>{hint ? <span className="vs-value-hint">{hint}</span> : null}</div>
      <div className="vs-private-amount" aria-live="polite" aria-label={isRevealed ? `${label} revealed locally` : `${label} private value hidden`}>
        {isRevealed ? <strong>{formatSix(value)} {unit}</strong> : <><span aria-hidden="true">••••••</span><strong className="sr-only">Private value hidden</strong><em>{unit}</em></>}
        {isRevealed ? <Button tone="ghost" size="sm" icon="eye-off" onClick={onRemask}>Hide</Button> : <Button tone="reveal" size="sm" icon={status === "error-retryable" ? "refresh-cw" : "eye"} busy={busy} disabled={status === "unavailable"} onClick={action}>{status === "error-retryable" ? "Retry" : "Reveal"}</Button>}
      </div>
      {busy ? <ProgressTrack indeterminate tone="private" label={statusCopy(status)} style={{ maxWidth: 190 }} /> : null}
      <div className={`vs-private-status vs-private-status--${status}`}>{statusCopy(status)}</div>
      {error ? <div className="field-error">{error}</div> : null}
    </div>
  );
}
