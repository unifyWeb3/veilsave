import React from "react";
import { Icon } from "../core/Icon.jsx";
import { StatusPill } from "../core/StatusPill.jsx";

const vsResult = {
  winner: {
    icon: "badge-check", tone: "verified", pill: "Winner finalized",
    title: "This slot won the epoch",
    copy: "The winner address is public after finalization. The prize amount stays encrypted until you reveal it locally.",
  },
  nonWinner: {
    icon: "circle-check", tone: "neutral", pill: "Not this epoch",
    title: "Your principal is untouched",
    copy: "You were eligible and remain eligible for the next epoch. No amount was moved.",
  },
  zeroWinner: {
    icon: "ban", tone: "terminal", pill: "No winner",
    title: "No eligible weight in this epoch",
    copy: "Total eligible weight was zero, so the epoch closed without a winner. This is a valid terminal result.",
  },
  pending: {
    icon: "hourglass", tone: "pending", pill: "Awaiting finalization",
    title: "The result is not final yet",
    copy: "The draw executed. The winner address becomes public after the proof is authenticated and the finality delay passes.",
  },
  unavailable: {
    icon: "cloud-off", tone: "neutral", pill: "Result unavailable",
    title: "The result could not be read",
    copy: "Chain data for this epoch could not be loaded. Nothing about your position has changed.",
  },
};

/**
 * The epoch outcome for the connected wallet. Winner state is the only place teal appears
 * at display scale; the win is signalled by weight and stillness, not celebration.
 */
export function ResultState({ variant = "nonWinner", epoch, address, children, style }) {
  const r = vsResult[variant] || vsResult.nonWinner;
  const isWinner = variant === "winner";
  return (
    <section
      style={{
        display: "flex", flexDirection: "column", gap: 16, padding: isWinner ? 24 : 20,
        borderRadius: "var(--r-lg)", position: "relative", overflow: "hidden",
        background: isWinner ? "var(--wash-verified)" : "var(--surface-raised)",
        border: `1px solid ${isWinner ? "var(--border-verified)" : "var(--border-hairline)"}`,
        boxShadow: "var(--sheen-top)", ...style,
      }}
    >
      {isWinner ? (
        <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 80% at 6% 0%, rgba(47,191,160,0.13), transparent 62%)", pointerEvents: "none" }} />
      ) : null}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: "var(--r-sm)", flex: "none",
              background: isWinner ? "var(--teal-500)" : "var(--wash-neutral)",
              color: isWinner ? "var(--ink-050)" : "var(--text-muted)",
              animation: isWinner ? "vs-halo var(--dur-epoch) var(--ease-standard) 2" : undefined,
            }}
          >
            <Icon name={r.icon} size={16} strokeWidth={2} />
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <h3 className="vs-title-2" style={{ margin: 0 }}>{r.title}</h3>
            {epoch ? <span className="vs-mono-sm" style={{ color: "var(--text-faint)" }}>EPOCH {epoch}</span> : null}
          </div>
        </div>
        <StatusPill tone={r.tone} pulse={variant === "pending"}>{r.pill}</StatusPill>
      </header>
      <p style={{ font: "var(--type-body-sm)", color: "var(--text-secondary)", margin: 0, maxWidth: "var(--measure-prose)", position: "relative" }}>{r.copy}</p>
      {address ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
          <span className="vs-label">Winner</span>
          <span className="vs-mono" style={{ color: "var(--text-primary)" }}>{address}</span>
        </div>
      ) : null}
      {children ? <div style={{ position: "relative" }}>{children}</div> : null}
    </section>
  );
}
