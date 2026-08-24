import React from "react";
import { Icon } from "../core/Icon.jsx";
import { StatusPill } from "../core/StatusPill.jsx";

/**
 * A framed group of evidence with a verification verdict. Ordinary users read the verdict;
 * technical users expand the trail. Collapsed by default on mobile.
 */
export function ProofBlock({
  title, verdict = "verified", verdictLabel, summary, children,
  collapsible = true, defaultOpen = true, footnote, style,
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const tone = verdict === "verified" ? "verified" : verdict === "pending" ? "pending" : verdict === "failed" ? "critical" : "neutral";
  const label = verdictLabel || (verdict === "verified" ? "Authenticated" : verdict === "pending" ? "Awaiting proof" : verdict === "failed" ? "Unverified" : "No evidence yet");
  return (
    <section style={{ border: "1px solid var(--border-hairline)", borderRadius: "var(--r-lg)", background: "var(--surface-raised)", boxShadow: "var(--sheen-top)", ...style }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 18px", borderBottom: open ? "1px solid var(--border-hairline)" : "none" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <h3 className="vs-title-3" style={{ margin: 0 }}>{title}</h3>
          {summary ? <span style={{ font: "var(--type-body-sm)", color: "var(--text-muted)" }}>{summary}</span> : null}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
          <StatusPill tone={tone} pulse={verdict === "pending"}>{label}</StatusPill>
          {collapsible ? (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: 0, cursor: "pointer", color: "var(--text-muted)", font: "var(--type-micro)", letterSpacing: "var(--tr-label)", textTransform: "uppercase", padding: "6px 2px" }}
            >
              {open ? "Hide" : "Evidence"}
              <Icon name={open ? "chevron-down" : "chevron-right"} size={13} />
            </button>
          ) : null}
        </div>
      </header>
      {open ? (
        <div style={{ padding: "6px 18px 4px", animation: "vs-settle var(--dur-base) var(--ease-entrance)" }}>
          {children}
          {footnote ? <p style={{ font: "var(--type-body-sm)", color: "var(--text-muted)", padding: "14px 0 12px", margin: 0, maxWidth: "var(--measure-prose)" }}>{footnote}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
