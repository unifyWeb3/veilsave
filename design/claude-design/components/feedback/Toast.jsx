import React from "react";
import { Icon } from "../core/Icon.jsx";

const vsToastTones = {
  neutral: { icon: "info", accent: "var(--ink-600)" },
  private: { icon: "lock", accent: "var(--periwinkle-500)" },
  verified: { icon: "circle-check", accent: "var(--teal-500)" },
  pending: { icon: "hourglass", accent: "var(--amber-500)" },
  critical: { icon: "circle-alert", accent: "var(--red-500)" },
};

/**
 * Transient confirmation. Carries protocol facts only — a transaction reference, a state
 * change, a failure reason. Never a plaintext amount, never a revealed value.
 */
export function Toast({ tone = "neutral", title, children, hash, onDismiss, style }) {
  const t = vsToastTones[tone] || vsToastTones.neutral;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "flex", alignItems: "flex-start", gap: 11, width: "min(360px, calc(100vw - 32px))",
        padding: "13px 14px", borderRadius: "var(--r-md)", background: "var(--surface-overlay)",
        border: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-overlay)",
        animation: "vs-settle var(--dur-base) var(--ease-entrance)", ...style,
      }}
    >
      <span style={{ display: "flex", color: t.accent, flex: "none", paddingTop: 1 }}><Icon name={t.icon} size={15} strokeWidth={1.8} /></span>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 }}>
        <span style={{ font: "var(--type-title-3)", color: "var(--text-primary)" }}>{title}</span>
        {children ? <span style={{ font: "var(--type-body-sm)", color: "var(--text-secondary)" }}>{children}</span> : null}
        {hash ? <span className="vs-mono-sm" style={{ color: "var(--text-faint)" }}>{hash.slice(0, 14)}…</span> : null}
      </div>
      {onDismiss ? (
        <button type="button" onClick={onDismiss} aria-label="Dismiss" style={{ background: "none", border: 0, cursor: "pointer", color: "var(--text-muted)", padding: 2, flex: "none" }}>
          <Icon name="x" size={13} />
        </button>
      ) : null}
    </div>
  );
}
