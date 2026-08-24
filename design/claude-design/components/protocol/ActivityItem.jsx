import React from "react";
import { Icon } from "../core/Icon.jsx";
import { IconButton } from "../core/IconButton.jsx";

const vsActivityKinds = {
  deposit: { icon: "arrow-down-to-line", tone: "var(--periwinkle-400)", label: "Deposit" },
  withdrawRequest: { icon: "arrow-up-from-line", tone: "var(--periwinkle-400)", label: "Withdrawal requested" },
  claim: { icon: "circle-check", tone: "var(--teal-400)", label: "Claim" },
  reveal: { icon: "key-round", tone: "var(--periwinkle-400)", label: "Local reveal" },
  draw: { icon: "dices", tone: "var(--text-secondary)", label: "Draw" },
  prize: { icon: "badge-check", tone: "var(--teal-400)", label: "Prize" },
  failed: { icon: "circle-alert", tone: "var(--red-400)", label: "Failed" },
};

/**
 * A privacy-safe activity row. Records what happened and when — never an amount.
 * Local-only actions (reveals) are marked as such and are never written to chain.
 */
export function ActivityItem({ kind = "deposit", title, epoch, time, hash, status, local = false, style }) {
  const k = vsActivityKinds[kind] || vsActivityKinds.deposit;
  return (
    <li style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--border-hairline)", minWidth: 0, ...style }}>
      <span style={{ width: 26, height: 26, borderRadius: "var(--r-sm)", display: "grid", placeItems: "center", background: "var(--surface-inset)", color: k.tone, flex: "none" }}>
        <Icon name={k.icon} size={13} />
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
        <span style={{ font: "var(--type-body-sm)", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {title || k.label}
          {local ? <span style={{ font: "var(--type-micro)", letterSpacing: "var(--tr-label)", textTransform: "uppercase", color: "var(--text-faint)", marginLeft: 8 }}>Local only</span> : null}
        </span>
        <span className="vs-mono-sm" style={{ color: "var(--text-faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {epoch ? `E${epoch} · ` : ""}{time}{hash ? ` · ${hash.slice(0, 10)}…` : ""}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, flex: "none" }}>
        {status ? <span style={{ font: "var(--type-micro)", letterSpacing: "var(--tr-label)", textTransform: "uppercase", color: "var(--text-muted)" }}>{status}</span> : null}
        {hash ? <IconButton name="external-link" size="sm" label="Open transaction in block explorer" /> : null}
      </div>
    </li>
  );
}
