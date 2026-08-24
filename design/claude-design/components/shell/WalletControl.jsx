import React from "react";
import { Icon } from "../core/Icon.jsx";
import { Button } from "../core/Button.jsx";

/**
 * Wallet and network control. Network identity is always visible; a wrong chain blocks
 * writes and says so in place rather than failing at signature time.
 */
export function WalletControl({
  state = "disconnected", address, network = "Sepolia", onConnect, onSwitch, onDisconnect, compact = false, style,
}) {
  if (state === "disconnected") {
    return <Button tone="primary" size={compact ? "sm" : "md"} icon="wallet" onClick={onConnect} style={style}>Connect wallet</Button>;
  }
  if (state === "connecting") {
    return <Button tone="secondary" size={compact ? "sm" : "md"} busy disabled style={style}>Requesting access…</Button>;
  }
  if (state === "wrongNetwork") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, ...style }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 34, padding: "0 10px", borderRadius: "var(--r-md)", background: "var(--wash-critical)", border: "1px solid var(--border-critical)", color: "var(--text-critical)", font: "var(--type-micro)", letterSpacing: "var(--tr-label)", textTransform: "uppercase" }}>
          <Icon name="triangle-alert" size={12} /> Wrong network
        </span>
        <Button tone="secondary" size="sm" onClick={onSwitch}>Switch to {network}</Button>
      </div>
    );
  }
  const short = address ? address.slice(0, 6) + "…" + address.slice(-4) : "";
  return (
    <button
      type="button"
      onClick={onDisconnect}
      style={{
        display: "inline-flex", alignItems: "center", gap: 9, height: compact ? 32 : 36, padding: "0 10px",
        borderRadius: "var(--r-md)", background: "var(--surface-inset)", border: "1px solid var(--border-hairline)",
        cursor: "pointer", color: "var(--text-primary)", ...style,
      }}
    >
      <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 1, background: "var(--teal-500)", flex: "none" }} />
      <span className="vs-mono" style={{ color: "var(--text-primary)" }}>{short}</span>
      <span style={{ font: "var(--type-micro)", letterSpacing: "var(--tr-label)", textTransform: "uppercase", color: "var(--text-muted)", paddingLeft: 2, borderLeft: "1px solid var(--border-hairline)", marginLeft: 2, paddingInlineStart: 8 }}>{network}</span>
    </button>
  );
}
