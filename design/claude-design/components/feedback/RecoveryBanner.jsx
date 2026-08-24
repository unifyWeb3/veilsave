import React from "react";
import { Icon } from "../core/Icon.jsx";
import { Button } from "../core/Button.jsx";

const vsBannerTones = {
  info: { bg: "var(--wash-neutral)", bd: "var(--border-subtle)", fg: "var(--text-secondary)", icon: "info", accent: "var(--ink-500)" },
  pending: { bg: "var(--wash-pending)", bd: "var(--border-pending)", fg: "var(--text-pending)", icon: "hourglass", accent: "var(--amber-500)" },
  critical: { bg: "var(--wash-critical)", bd: "var(--border-critical)", fg: "var(--text-critical)", icon: "triangle-alert", accent: "var(--red-500)" },
  paused: { bg: "var(--wash-pending)", bd: "var(--border-pending)", fg: "var(--text-pending)", icon: "pause", accent: "var(--amber-500)" },
  network: { bg: "var(--wash-critical)", bd: "var(--border-critical)", fg: "var(--text-critical)", icon: "wifi-off", accent: "var(--red-500)" },
};

/**
 * Top-of-view banner for a condition the user can act on: wrong network, paused scope,
 * stale data, a retryable recovery call. Only rendered when there is an action or a
 * material safety statement — never as decoration.
 */
export function RecoveryBanner({ tone = "info", title, children, actionLabel, onAction, secondaryLabel, onSecondary, onDismiss, scope, style }) {
  const t = vsBannerTones[tone] || vsBannerTones.info;
  return (
    <div
      role={tone === "critical" || tone === "network" ? "alert" : "status"}
      style={{
        display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 16px",
        borderRadius: "var(--r-md)", background: t.bg, border: `1px solid ${t.bd}`,
        animation: "vs-settle var(--dur-base) var(--ease-entrance)", ...style,
      }}
    >
      <span style={{ display: "flex", color: t.accent, flex: "none", paddingTop: 1 }}>
        <Icon name={t.icon} size={16} strokeWidth={1.8} />
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
          <span style={{ font: "var(--type-title-3)", color: "var(--text-primary)" }}>{title}</span>
          {scope ? <span style={{ font: "var(--type-micro)", letterSpacing: "var(--tr-label)", textTransform: "uppercase", color: t.fg, border: `1px solid ${t.bd}`, borderRadius: "var(--r-xs)", padding: "1px 6px" }}>{scope}</span> : null}
        </div>
        {children ? <p style={{ font: "var(--type-body-sm)", color: "var(--text-secondary)", margin: 0, maxWidth: "var(--measure-prose)" }}>{children}</p> : null}
        {actionLabel || secondaryLabel ? (
          <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
            {actionLabel ? <Button tone={tone === "info" ? "secondary" : "primary"} size="sm" onClick={onAction}>{actionLabel}</Button> : null}
            {secondaryLabel ? <Button tone="ghost" size="sm" onClick={onSecondary}>{secondaryLabel}</Button> : null}
          </div>
        ) : null}
      </div>
      {onDismiss ? (
        <button type="button" onClick={onDismiss} aria-label="Dismiss" style={{ background: "none", border: 0, cursor: "pointer", color: "var(--text-muted)", padding: 4, flex: "none" }}>
          <Icon name="x" size={14} />
        </button>
      ) : null}
    </div>
  );
}
