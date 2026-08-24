import React from "react";
import { Icon } from "../core/Icon.jsx";

/**
 * Six-decimal cUSDT amount entry. Validates decimals locally before anything is encrypted,
 * and states plainly that the entered amount leaves the browser encrypted.
 */
export function AmountField({
  value = "", onChange, label = "Amount", unit = "cUSDT", max, maxLabel = "Max",
  onMax, error, helper, disabled = false, autoFocus = false, id = "vs-amount", style,
}) {
  const decimals = (value.split(".")[1] || "").length;
  const localError = error || (decimals > 6 ? "cUSDT supports six decimal places." : null);
  const [focused, setFocused] = React.useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, ...style }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <label htmlFor={id} className="vs-label">{label}</label>
        {max ? (
          <span style={{ display: "flex", alignItems: "center", gap: 8, font: "var(--type-micro)", letterSpacing: "var(--tr-label)", textTransform: "uppercase", color: "var(--text-muted)" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="lock" size={11} /> Available {max}</span>
            <button type="button" onClick={onMax} style={{ background: "none", border: 0, padding: "2px 0", cursor: "pointer", color: "var(--text-private)", font: "inherit", letterSpacing: "inherit", textTransform: "inherit" }}>{maxLabel}</button>
          </span>
        ) : null}
      </div>
      <div
        style={{
          display: "flex", alignItems: "center", gap: 10, height: 56, padding: "0 16px",
          borderRadius: "var(--r-md)", background: "var(--surface-inset)",
          border: `1px solid ${localError ? "var(--border-critical)" : focused ? "var(--periwinkle-500)" : "var(--border-subtle)"}`,
          transition: "border-color var(--dur-fast) var(--ease-standard)",
          opacity: disabled ? 0.55 : 1,
        }}
      >
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.000000"
          value={value}
          disabled={disabled}
          autoFocus={autoFocus}
          aria-invalid={localError ? true : undefined}
          aria-describedby={localError ? id + "-err" : helper ? id + "-help" : undefined}
          onChange={(e) => onChange && onChange(e.target.value.replace(/[^0-9.]/g, ""))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="vs-num"
          style={{ flex: 1, minWidth: 0, background: "none", border: 0, outline: "none", font: "var(--type-num-2)", fontVariantNumeric: "tabular-nums", color: "var(--text-primary)", letterSpacing: "var(--tr-tight)" }}
        />
        <span style={{ font: "var(--type-body-sm)", color: "var(--text-muted)", letterSpacing: "0.03em", flex: "none" }}>{unit}</span>
      </div>
      {localError ? (
        <span id={id + "-err"} role="alert" style={{ display: "flex", alignItems: "center", gap: 6, font: "var(--type-body-sm)", color: "var(--text-critical)" }}>
          <Icon name="circle-alert" size={13} /> {localError}
        </span>
      ) : helper ? (
        <span id={id + "-help"} style={{ display: "flex", alignItems: "center", gap: 6, font: "var(--type-body-sm)", color: "var(--text-muted)" }}>
          <Icon name="lock" size={13} style={{ color: "var(--text-private)" }} /> {helper}
        </span>
      ) : null}
    </div>
  );
}
