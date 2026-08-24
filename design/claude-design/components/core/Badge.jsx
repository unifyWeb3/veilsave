import React from "react";
import { Icon } from "./Icon.jsx";

const vsBadgeTones = {
  neutral: { bg: "var(--wash-neutral)", fg: "var(--text-secondary)", bd: "var(--border-hairline)" },
  private: { bg: "var(--wash-private)", fg: "var(--text-private)", bd: "var(--border-private)" },
  verified: { bg: "var(--wash-verified)", fg: "var(--text-verified)", bd: "var(--border-verified)" },
  pending: { bg: "var(--wash-pending)", fg: "var(--text-pending)", bd: "var(--border-pending)" },
  critical: { bg: "var(--wash-critical)", fg: "var(--text-critical)", bd: "var(--border-critical)" },
};

/** Small static label for identity and metadata (network, epoch, strategy, slot). Not for live status — use StatusPill. */
export function Badge({ children, tone = "neutral", icon, mono = false, style, ...rest }) {
  const t = vsBadgeTones[tone] || vsBadgeTones.neutral;
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 5, height: 21, padding: "0 7px",
        borderRadius: "var(--r-xs)", background: t.bg, color: t.fg, border: `1px solid ${t.bd}`,
        font: mono ? "var(--type-mono-sm)" : "var(--type-micro)",
        letterSpacing: mono ? "var(--tr-mono)" : "var(--tr-label)",
        textTransform: "uppercase", whiteSpace: "nowrap", ...style,
      }}
      {...rest}
    >
      {icon ? <Icon name={icon} size={11} strokeWidth={1.75} /> : null}
      {children}
    </span>
  );
}
