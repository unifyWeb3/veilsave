import React from "react";
import { Icon } from "../core/Icon.jsx";

/**
 * The public/private boundary, stated plainly. Two columns, no hedging: what stays
 * encrypted, and what anyone can see. Never claims anonymity.
 */
export function PrivacyCallout({
  title = "What stays private, what stays public",
  privateItems = ["Savings amount", "Eligible weight and odds", "Withdrawal amount", "Prize amount"],
  publicItems = ["Wallet address", "Transaction timing", "Slot occupancy", "Winner address after finalization"],
  limitation = "Balances and odds stay hidden. Anyone can inspect the randomness and authenticated execution trail, but cannot recompute the weighted result from plaintext balances.",
  compact = false, style,
}) {
  const col = (heading, items, tone) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0, flex: "1 1 200px" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "var(--type-micro)", letterSpacing: "var(--tr-label)", textTransform: "uppercase", color: tone === "private" ? "var(--text-private)" : "var(--text-secondary)" }}>
        <Icon name={tone === "private" ? "lock" : "eye"} size={12} strokeWidth={1.8} />
        {heading}
      </span>
      <ul style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {items.map((it) => (
          <li key={it} style={{ display: "flex", gap: 8, alignItems: "baseline", font: "var(--type-body-sm)", color: "var(--text-secondary)" }}>
            <span aria-hidden="true" style={{ width: 3, height: 3, marginTop: 8, borderRadius: 1, flex: "none", background: tone === "private" ? "var(--periwinkle-500)" : "var(--ink-500)" }} />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: compact ? 14 : 18, border: "1px solid var(--border-hairline)", borderRadius: "var(--r-lg)", padding: compact ? 16 : 22, background: "var(--surface-base)", ...style }}>
      {title ? <h3 className="vs-title-2" style={{ margin: 0 }}>{title}</h3> : null}
      <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
        {col("Encrypted", privateItems, "private")}
        {col("Public", publicItems, "public")}
      </div>
      {limitation ? (
        <p style={{ font: "var(--type-body-sm)", color: "var(--text-muted)", borderTop: "1px solid var(--border-hairline)", paddingTop: 14, margin: 0, maxWidth: "var(--measure-prose)" }}>{limitation}</p>
      ) : null}
    </section>
  );
}
