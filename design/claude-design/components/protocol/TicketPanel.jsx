import React from "react";
import { Icon } from "../core/Icon.jsx";
import { Button } from "../core/Button.jsx";
import { StatusPill } from "../core/StatusPill.jsx";
import { StatusStepper } from "./StatusStepper.jsx";

const vsTicketState = {
  queued: { tone: "private", label: "In queue", copy: "Your withdrawal is queued in request order. Principal stays yours while it waits." },
  settlementRequested: { tone: "pending", label: "Settlement requested", copy: "The controller is redeeming from the strategy and rewrapping to confidential balance." },
  ready: { tone: "pending", label: "Funding allocated", copy: "Liquidity has been allocated to earlier tickets. Yours is next in line." },
  partial: { tone: "pending", label: "Partly funded", copy: "Part of your request was funded. The unpaid encrypted remainder keeps its original queue position." },
  claimable: { tone: "verified", label: "Ready to claim", copy: "Funding is available. Claim moves it to your wallet as a confidential transfer." },
  claimed: { tone: "neutral", label: "Claimed", copy: "This ticket is settled. The amount stayed encrypted throughout." },
  retryable: { tone: "pending", label: "Retry available", copy: "Strategy redemption did not complete. The ticket is unchanged and the call can be retried by anyone." },
};

/**
 * The FIFO withdrawal ticket: one active ticket per slot, position fixed at request time.
 * Queue states read as progress, never as errors.
 */
export function TicketPanel({
  state = "queued", position, total, requestedAt, steps, onClaim, onRetry, children, style,
}) {
  const s = vsTicketState[state] || vsTicketState.queued;
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 16, border: "1px solid var(--border-hairline)", borderRadius: "var(--r-lg)", background: "var(--surface-raised)", padding: 20, boxShadow: "var(--sheen-top)", ...style }}>
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <span className="vs-label" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Icon name="ticket" size={12} /> Withdrawal ticket
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            {position != null ? (
              <>
                <span className="vs-num-2">{position}</span>
                <span style={{ font: "var(--type-body-sm)", color: "var(--text-muted)" }}>of {total} in queue</span>
              </>
            ) : (
              <span className="vs-title-2">{s.label}</span>
            )}
          </div>
        </div>
        <StatusPill tone={s.tone} pulse={state === "settlementRequested"}>{s.label}</StatusPill>
      </header>
      <p style={{ font: "var(--type-body-sm)", color: "var(--text-secondary)", margin: 0, maxWidth: "var(--measure-prose)" }}>{s.copy}</p>
      {steps && steps.length ? <StatusStepper steps={steps} /> : null}
      {children}
      <footer style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {state === "claimable" ? <Button tone="primary" size="md" icon="arrow-down-to-line" onClick={onClaim}>Claim withdrawal</Button> : null}
        {state === "retryable" ? <Button tone="secondary" size="md" icon="refresh-cw" onClick={onRetry}>Retry settlement</Button> : null}
        {requestedAt ? <span className="vs-mono-sm" style={{ color: "var(--text-faint)" }}>REQUESTED {requestedAt}</span> : null}
      </footer>
    </section>
  );
}
