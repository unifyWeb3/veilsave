import React from "react";
import { ConfidentialValue } from "./ConfidentialValue.jsx";
import { Icon } from "../core/Icon.jsx";

/** A labelled confidential figure with supporting context — the unit of the dashboard position block. */
export function FinancialMetric({
  label, hint, state = "masked", value, unit = "cUSDT", size = "lg",
  footnote, footnoteTone = "muted", onReveal, onHide, onRetry, align = "start", style,
}) {
  const tones = { muted: "var(--text-muted)", private: "var(--text-private)", verified: "var(--text-verified)", pending: "var(--text-pending)", critical: "var(--text-critical)" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: align === "end" ? "flex-end" : "flex-start", minWidth: 0, ...style }}>
      {label ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span className="vs-label">{label}</span>
          {hint ? <span title={hint} style={{ display: "flex", color: "var(--text-faint)" }}><Icon name="circle-question-mark" size={12} label={hint} /></span> : null}
        </div>
      ) : null}
      <ConfidentialValue state={state} value={value} unit={unit} size={size} onReveal={onReveal} onHide={onHide} onRetry={onRetry} />
      {footnote ? (
        <span style={{ font: "var(--type-body-sm)", color: tones[footnoteTone] || tones.muted, maxWidth: 320 }}>{footnote}</span>
      ) : null}
    </div>
  );
}
