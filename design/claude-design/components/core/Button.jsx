import React from "react";
import { Icon } from "./Icon.jsx";

const vsBtnSizes = {
  sm: { height: 30, padding: "0 10px", font: "var(--type-body-sm)", gap: 6, radius: "var(--r-sm)" },
  md: { height: 38, padding: "0 14px", font: "var(--type-body-sm)", gap: 7, radius: "var(--r-md)" },
  lg: { height: 46, padding: "0 20px", font: "var(--type-title-3)", gap: 8, radius: "var(--r-md)" },
};

const vsBtnTones = {
  primary: { background: "var(--action-primary-bg)", color: "var(--action-primary-fg)", border: "1px solid transparent" },
  secondary: { background: "var(--action-secondary-bg)", color: "var(--action-secondary-fg)", border: "1px solid var(--action-secondary-border)" },
  ghost: { background: "transparent", color: "var(--action-ghost-fg)", border: "1px solid transparent" },
  reveal: { background: "var(--wash-private)", color: "var(--action-reveal-fg)", border: "1px solid var(--action-reveal-border)" },
  danger: { background: "transparent", color: "var(--action-danger-fg)", border: "1px solid var(--border-critical)" },
};

/** Primary command control. Tone carries intent; `reveal` is reserved for confidential-value actions. */
export function Button({
  children, tone = "primary", size = "md", icon, iconAfter, block = false,
  busy = false, disabled = false, type = "button", style, ...rest
}) {
  const s = vsBtnSizes[size] || vsBtnSizes.md;
  const t = vsBtnTones[tone] || vsBtnTones.primary;
  const off = disabled || busy;
  return (
    <button
      type={type}
      disabled={off}
      aria-busy={busy || undefined}
      className="vs-btn"
      style={{
        display: block ? "flex" : "inline-flex", width: block ? "100%" : undefined,
        alignItems: "center", justifyContent: "center", gap: s.gap,
        height: s.height, minHeight: s.height, padding: s.padding, borderRadius: s.radius,
        font: s.font, fontWeight: 500, letterSpacing: "-0.01em", whiteSpace: "nowrap",
        cursor: off ? "not-allowed" : "pointer",
        transition: "background var(--dur-fast) var(--ease-standard), color var(--dur-fast) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard), transform var(--dur-instant) var(--ease-standard)",
        ...t,
        ...(off ? { background: tone === "primary" ? "var(--action-disabled-bg)" : "transparent", color: "var(--action-disabled-fg)", borderColor: tone === "primary" ? "transparent" : "var(--border-hairline)" } : null),
        ...style,
      }}
      {...rest}
    >
      {busy ? <span aria-hidden="true" style={{ width: 14, height: 14, display: "block", position: "relative", overflow: "hidden", borderRadius: 1, background: "currentColor", opacity: 0.28 }} /> : icon ? <Icon name={icon} size={size === "lg" ? 17 : 15} /> : null}
      {children}
      {iconAfter ? <Icon name={iconAfter} size={size === "lg" ? 17 : 15} /> : null}
    </button>
  );
}
