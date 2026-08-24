import React from "react";
import { Icon } from "../core/Icon.jsx";
import { Tooltip } from "../core/Tooltip.jsx";

/**
 * Strategy identity. TEST YIELD is the default and must never sit next to an APY or any
 * implied return. LIVE STRATEGY YIELD appears only after a validated adapter replacement.
 */
export function StrategyBadge({ mode = "test", size = "md", withHint = true, style }) {
  const test = mode === "test";
  const label = test ? "TEST YIELD" : "LIVE STRATEGY YIELD";
  const hint = test
    ? "Prizes in this release are funded by donations into a deterministic test vault. No organic strategy return, no APY."
    : "A replacement strategy adapter has been deployed and validated through the frozen governance process.";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, ...style }}>
      <span
        style={{
          display: "inline-flex", alignItems: "center", gap: 6, height: size === "sm" ? 21 : 24, padding: "0 8px",
          borderRadius: "var(--r-xs)", border: `1px solid ${test ? "var(--border-pending)" : "var(--border-verified)"}`,
          background: test ? "var(--wash-pending)" : "var(--wash-verified)",
          color: test ? "var(--text-pending)" : "var(--text-verified)",
          font: "var(--type-micro)", letterSpacing: "var(--tr-label)", textTransform: "uppercase", whiteSpace: "nowrap",
        }}
      >
        <Icon name={test ? "circle-dot" : "shield-check"} size={11} strokeWidth={1.9} />
        {label}
      </span>
      {withHint ? <span style={{ color: "var(--text-faint)" }}><Tooltip content={hint} /></span> : null}
    </span>
  );
}
