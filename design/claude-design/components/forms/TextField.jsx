import React from "react";
import { Icon } from "../core/Icon.jsx";

/** Single-line text entry for public values only — addresses, epoch numbers, hashes. Never for amounts. */
export function TextField({ value = "", onChange, label, placeholder, mono = false, icon, error, helper, id = "vs-text", disabled = false, style }) {
  const [focused, setFocused] = React.useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7, ...style }}>
      {label ? <label htmlFor={id} className="vs-label">{label}</label> : null}
      <div
        style={{
          display: "flex", alignItems: "center", gap: 9, height: 40, padding: "0 12px",
          borderRadius: "var(--r-md)", background: "var(--surface-inset)",
          border: `1px solid ${error ? "var(--border-critical)" : focused ? "var(--periwinkle-500)" : "var(--border-subtle)"}`,
          transition: "border-color var(--dur-fast) var(--ease-standard)", opacity: disabled ? 0.55 : 1,
        }}
      >
        {icon ? <Icon name={icon} size={14} style={{ color: "var(--text-faint)" }} /> : null}
        <input
          id={id}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          onChange={(e) => onChange && onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={mono ? "vs-mono" : undefined}
          style={{ flex: 1, minWidth: 0, background: "none", border: 0, outline: "none", font: mono ? "var(--type-mono)" : "var(--type-body-sm)", color: "var(--text-primary)" }}
        />
      </div>
      {error ? <span role="alert" style={{ font: "var(--type-body-sm)", color: "var(--text-critical)" }}>{error}</span> : helper ? <span style={{ font: "var(--type-body-sm)", color: "var(--text-muted)" }}>{helper}</span> : null}
    </div>
  );
}
