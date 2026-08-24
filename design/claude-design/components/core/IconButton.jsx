import React from "react";
import { Icon } from "./Icon.jsx";

/** Square icon-only control. Always pass `label` — it becomes the accessible name and the tooltip text. */
export function IconButton({ name, label, size = "md", tone = "ghost", disabled = false, active = false, style, ...rest }) {
  const box = size === "sm" ? 28 : size === "lg" ? 44 : 34;
  const tones = {
    ghost: { background: active ? "var(--wash-neutral)" : "transparent", color: active ? "var(--text-primary)" : "var(--text-muted)", border: "1px solid transparent" },
    outline: { background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" },
    private: { background: "var(--wash-private)", color: "var(--text-private)", border: "1px solid var(--border-private)" },
  };
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      className="vs-iconbtn"
      style={{
        width: box, height: box, minWidth: box, display: "inline-flex", alignItems: "center", justifyContent: "center",
        borderRadius: "var(--r-sm)", cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transition: "background var(--dur-fast) var(--ease-standard), color var(--dur-fast) var(--ease-standard)",
        ...(tones[tone] || tones.ghost), ...style,
      }}
      {...rest}
    >
      <Icon name={name} size={size === "sm" ? 14 : size === "lg" ? 19 : 16} />
    </button>
  );
}
