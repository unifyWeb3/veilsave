import React from "react";
import { Icon } from "../core/Icon.jsx";
import { Button } from "../core/Button.jsx";
import { ProgressTrack } from "../core/ProgressTrack.jsx";

const vsStateKinds = {
  empty: { icon: "vault", tone: "var(--ink-500)" },
  waiting: { icon: "hourglass", tone: "var(--amber-500)" },
  loading: { icon: "scan-line", tone: "var(--periwinkle-500)" },
  unavailable: { icon: "cloud-off", tone: "var(--ink-500)" },
  offline: { icon: "wifi-off", tone: "var(--red-500)" },
  paused: { icon: "pause", tone: "var(--amber-500)" },
  terminal: { icon: "ban", tone: "var(--ink-500)" },
  failed: { icon: "circle-alert", tone: "var(--red-500)" },
};

/**
 * The empty / waiting / unavailable / terminal placeholder. Every instance states what
 * happened, whether funds are affected, and the one next action available.
 */
export function StateBlock({
  kind = "empty", title, children, actionLabel, onAction, secondaryLabel, onSecondary,
  safety, meta, compact = false, style,
}) {
  const k = vsStateKinds[kind] || vsStateKinds.empty;
  return (
    <div
      style={{
        display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12,
        padding: compact ? "20px 18px" : "34px 24px", borderRadius: "var(--r-lg)",
        border: "1px dashed var(--border-subtle)", background: "var(--surface-base)", ...style,
      }}
    >
      <span style={{ display: "grid", placeItems: "center", width: 32, height: 32, borderRadius: "var(--r-sm)", background: "var(--wash-neutral)", color: k.tone, flex: "none" }}>
        <span style={{ display: "flex", animation: kind === "waiting" || kind === "loading" ? "vs-breathe 1.8s var(--ease-standard) infinite" : undefined }}>
          <Icon name={k.icon} size={16} strokeWidth={1.7} />
        </span>
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <h3 className="vs-title-3" style={{ margin: 0 }}>{title}</h3>
        {children ? <p style={{ font: "var(--type-body-sm)", color: "var(--text-secondary)", margin: 0, maxWidth: "var(--measure-narrow)" }}>{children}</p> : null}
      </div>
      {kind === "loading" ? <ProgressTrack indeterminate tone="private" label={title} style={{ maxWidth: 180 }} /> : null}
      {safety ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "var(--type-body-sm)", color: "var(--text-verified)" }}>
          <Icon name="shield-check" size={13} /> {safety}
        </span>
      ) : null}
      {actionLabel || secondaryLabel ? (
        <div style={{ display: "flex", gap: 8, marginTop: 2, flexWrap: "wrap" }}>
          {actionLabel ? <Button tone="secondary" size="sm" onClick={onAction}>{actionLabel}</Button> : null}
          {secondaryLabel ? <Button tone="ghost" size="sm" onClick={onSecondary}>{secondaryLabel}</Button> : null}
        </div>
      ) : null}
      {meta ? <span className="vs-mono-sm" style={{ color: "var(--text-faint)" }}>{meta}</span> : null}
    </div>
  );
}
