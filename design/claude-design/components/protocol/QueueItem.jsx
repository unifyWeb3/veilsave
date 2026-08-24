import React from "react";
import { Icon } from "../core/Icon.jsx";

const vsQueueStates = {
  queued: { tone: "var(--periwinkle-500)", icon: "layers", label: "In queue" },
  settling: { tone: "var(--amber-500)", icon: "hourglass", label: "Settling" },
  partial: { tone: "var(--amber-500)", icon: "minus", label: "Partly funded" },
  claimable: { tone: "var(--teal-500)", icon: "circle-check", label: "Ready to claim" },
  claimed: { tone: "var(--ink-500)", icon: "check", label: "Claimed" },
  retryable: { tone: "var(--amber-500)", icon: "refresh-cw", label: "Retry available" },
};

/**
 * One row of the FIFO withdrawal queue. Position is fixed at request time and is public;
 * the amount is not. A queue position is a normal protocol state, not a failure.
 */
export function QueueItem({ position, total = 16, state = "queued", slot, requested, mine = false, trailing, style }) {
  const s = vsQueueStates[state] || vsQueueStates.queued;
  return (
    <li
      style={{
        display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: 14,
        padding: "12px 14px", borderRadius: "var(--r-md)", minWidth: 0,
        background: mine ? "var(--wash-private)" : "transparent",
        border: `1px solid ${mine ? "var(--border-private)" : "var(--border-hairline)"}`,
        animation: "vs-settle var(--dur-base) var(--ease-entrance)", ...style,
      }}
    >
      <span
        className="vs-num"
        style={{ width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: "var(--r-sm)", background: "var(--surface-inset)", font: "var(--type-body-sm)", color: mine ? "var(--text-private)" : "var(--text-secondary)", flex: "none" }}
      >
        {position}
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 7, font: "var(--type-body-sm)", color: "var(--text-primary)" }}>
          <Icon name={s.icon} size={13} style={{ color: s.tone }} />
          {s.label}
          {mine ? <span style={{ font: "var(--type-micro)", letterSpacing: "var(--tr-label)", textTransform: "uppercase", color: "var(--text-private)" }}>· Yours</span> : null}
        </span>
        <span className="vs-mono-sm" style={{ color: "var(--text-faint)" }}>
          {slot != null ? `SLOT ${String(slot).padStart(2, "0")}` : null}{slot != null && requested ? " · " : null}{requested}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
        {trailing || <span style={{ font: "var(--type-micro)", letterSpacing: "var(--tr-label)", textTransform: "uppercase", color: "var(--text-faint)" }}>of {total}</span>}
      </div>
    </li>
  );
}
