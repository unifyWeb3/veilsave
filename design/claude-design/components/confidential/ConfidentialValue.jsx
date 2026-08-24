import React from "react";
import { Icon } from "../core/Icon.jsx";
import { Button } from "../core/Button.jsx";
import { ProgressTrack } from "../core/ProgressTrack.jsx";

const vsCvSizes = {
  row: { font: "var(--type-num-4)", dot: "0.54em", gap: "0.17em" },
  md: { font: "var(--type-num-3)", dot: "0.52em", gap: "0.16em" },
  lg: { font: "var(--type-num-2)", dot: "0.5em", gap: "0.15em" },
  xl: { font: "var(--type-num-1)", dot: "0.48em", gap: "0.14em" },
};

/* Redaction is always six marks regardless of the true digit count: the length of a
   value is itself private. The seal rule underneath says "a value exists and is sealed"
   rather than "a value is missing". */
function Redaction({ size }) {
  const s = vsCvSizes[size] || vsCvSizes.md;
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-flex", alignItems: "center", gap: s.gap, letterSpacing: 0,
        color: "var(--text-private)", fontSize: s.dot, lineHeight: 1,
        borderBottom: "1px solid var(--border-private)", paddingBottom: "0.42em", marginBottom: "-0.1em",
      }}
    >
      {"••••••".split("").map((d, i) => <span key={i}>{d}</span>)}
    </span>
  );
}

const vsCvCopy = {
  masked: { note: "Encrypted", tone: "private", icon: "lock" },
  revealing: { note: "Preparing secure reveal…", tone: "private", icon: "key-round" },
  aclPending: { note: "Private access is being confirmed", tone: "pending", icon: "hourglass" },
  revealed: { note: "Visible in this session only", tone: "neutral", icon: "eye" },
  stale: { note: "Value may be out of date", tone: "pending", icon: "clock" },
  unavailable: { note: "Private value unavailable", tone: "neutral", icon: "cloud-off" },
  error: { note: "Reveal failed", tone: "critical", icon: "circle-alert" },
};

/**
 * The confidential-value primitive: one encrypted figure, one independent reveal.
 * Revealing one value never reveals another — every instance owns its own state.
 */
export function ConfidentialValue({
  state = "masked", value, unit = "cUSDT", size = "md", label,
  onReveal, onHide, onRetry, note, hideActions = false, style,
}) {
  const s = vsCvSizes[size] || vsCvSizes.md;
  const meta = vsCvCopy[state] || vsCvCopy.masked;
  const showsValue = state === "revealed" || state === "stale";
  const isBig = size === "xl" || size === "lg";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: isBig ? 12 : 7, minWidth: 0, ...style }}>
      {label ? <span className="vs-label">{label}</span> : null}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, minHeight: isBig ? 44 : 24, flexWrap: "wrap" }}>
        <span
          className="vs-num"
          style={{ font: s.font, fontVariantNumeric: "tabular-nums", color: "var(--text-primary)", display: "inline-flex", alignItems: "baseline", letterSpacing: "var(--tr-display)" }}
        >
          {showsValue
            ? <span style={{ animation: "vs-decrypt var(--dur-deliberate) var(--ease-entrance)", opacity: state === "stale" ? 0.72 : 1 }}>{value}</span>
            : state === "unavailable" || state === "error"
              ? <span style={{ color: "var(--text-faint)" }}>—</span>
              : <Redaction size={size} />}
        </span>
        {showsValue || state === "masked" || state === "revealing" || state === "aclPending" ? (
          <span style={{ font: isBig ? "var(--type-body-sm)" : "var(--type-micro)", color: "var(--text-muted)", letterSpacing: "0.03em" }}>{unit}</span>
        ) : null}
        {state === "revealed" && !hideActions ? (
          <button
            type="button"
            onClick={onHide}
            style={{ display: "inline-flex", alignItems: "center", gap: 5, marginLeft: 2, background: "none", border: 0, cursor: "pointer", color: "var(--text-muted)", font: "var(--type-micro)", letterSpacing: "var(--tr-label)", textTransform: "uppercase", padding: "4px 2px" }}
          >
            <Icon name="eye-off" size={12} /> Hide
          </button>
        ) : null}
      </div>

      {state === "revealing" ? <ProgressTrack indeterminate tone="private" label="Preparing secure reveal" style={{ maxWidth: 180 }} /> : null}

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span
          style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            font: "var(--type-micro)", letterSpacing: "var(--tr-label)", textTransform: "uppercase",
            color: meta.tone === "private" ? "var(--text-private)" : meta.tone === "pending" ? "var(--text-pending)" : meta.tone === "critical" ? "var(--text-critical)" : "var(--text-muted)",
          }}
        >
          <span style={{ display: "flex", animation: state === "revealing" || state === "aclPending" ? "vs-breathe 1.8s var(--ease-standard) infinite" : undefined }}>
            <Icon name={meta.icon} size={12} strokeWidth={1.8} />
          </span>
          {note || meta.note}
        </span>
        {!hideActions && state === "masked" ? (
          <Button tone="reveal" size="sm" icon="eye" onClick={onReveal}>Reveal</Button>
        ) : null}
        {!hideActions && (state === "error" || state === "unavailable") ? (
          <Button tone="secondary" size="sm" icon="refresh-cw" onClick={onRetry}>Retry</Button>
        ) : null}
        {!hideActions && state === "stale" ? (
          <Button tone="ghost" size="sm" icon="refresh-cw" onClick={onRetry}>Refresh</Button>
        ) : null}
      </div>
    </div>
  );
}
