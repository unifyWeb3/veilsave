import React from "react";
import { Icon } from "../core/Icon.jsx";

/** Native select in system chrome — used for public filters (epoch range, evidence view), never for protocol parameters. */
export function Select({ value, onChange, options = [], label, id = "vs-select", disabled = false, style }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7, ...style }}>
      {label ? <label htmlFor={id} className="vs-label">{label}</label> : null}
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <select
          id={id}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange && onChange(e.target.value)}
          style={{
            appearance: "none", width: "100%", height: 38, padding: "0 34px 0 12px",
            borderRadius: "var(--r-md)", background: "var(--surface-inset)",
            border: "1px solid var(--border-subtle)", color: "var(--text-primary)",
            font: "var(--type-body-sm)", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.55 : 1,
          }}
        >
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <Icon name="chevron-down" size={14} style={{ position: "absolute", right: 12, color: "var(--text-muted)", pointerEvents: "none" }} />
      </div>
    </div>
  );
}
