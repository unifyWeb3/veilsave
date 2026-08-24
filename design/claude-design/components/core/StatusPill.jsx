import React from "react";
import { Icon } from "./Icon.jsx";

/* Every status carries three cues: colour, glyph, and word — never colour alone. */
const vsStatusMap = {
  neutral: { fg: "var(--text-secondary)", bd: "var(--border-hairline)", bg: "var(--wash-neutral)", icon: "circle-dot" },
  private: { fg: "var(--text-private)", bd: "var(--border-private)", bg: "var(--wash-private)", icon: "lock" },
  verified: { fg: "var(--text-verified)", bd: "var(--border-verified)", bg: "var(--wash-verified)", icon: "check" },
  pending: { fg: "var(--text-pending)", bd: "var(--border-pending)", bg: "var(--wash-pending)", icon: "hourglass" },
  critical: { fg: "var(--text-critical)", bd: "var(--border-critical)", bg: "var(--wash-critical)", icon: "circle-alert" },
  terminal: { fg: "var(--text-muted)", bd: "var(--border-subtle)", bg: "transparent", icon: "ban" },
};

/** Live protocol status. `pulse` marks "waiting on an external dependency" (VRF, KMS, ACL) — never a rotating spinner. */
export function StatusPill({ children, tone = "neutral", icon, pulse = false, style, ...rest }) {
  const t = vsStatusMap[tone] || vsStatusMap.neutral;
  return (
    <span
      role="status"
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, height: 24, padding: "0 9px 0 8px",
        borderRadius: "var(--r-pill)", background: t.bg, color: t.fg, border: `1px solid ${t.bd}`,
        font: "var(--type-micro)", letterSpacing: "var(--tr-label)", textTransform: "uppercase", whiteSpace: "nowrap", ...style,
      }}
      {...rest}
    >
      <span style={{ display: "flex", animation: pulse ? "vs-breathe 1.8s var(--ease-standard) infinite" : undefined }}>
        <Icon name={icon || t.icon} size={12} strokeWidth={1.9} />
      </span>
      {children}
    </span>
  );
}
