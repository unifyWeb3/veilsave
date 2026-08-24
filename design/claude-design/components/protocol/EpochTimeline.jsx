import React from "react";
import { Icon } from "../core/Icon.jsx";

/* One vocabulary for every lifecycle node, reused by EpochTimeline and StatusStepper. */
export const VS_NODE = {
  done: { color: "var(--teal-500)", ring: "var(--border-verified)", icon: "check", label: "Complete" },
  active: { color: "var(--periwinkle-500)", ring: "var(--border-private)", icon: "circle-dot", label: "In progress" },
  waiting: { color: "var(--amber-500)", ring: "var(--border-pending)", icon: "hourglass", label: "Waiting on protocol" },
  future: { color: "var(--ink-400)", ring: "var(--border-hairline)", icon: "circle-dot", label: "Not started" },
  failed: { color: "var(--red-500)", ring: "var(--border-critical)", icon: "circle-alert", label: "Failed" },
  terminal: { color: "var(--ink-500)", ring: "var(--border-subtle)", icon: "ban", label: "Terminal" },
};

function Node({ state, size = 10 }) {
  const n = VS_NODE[state] || VS_NODE.future;
  const solid = state === "done" || state === "active" || state === "waiting" || state === "failed";
  return (
    <span
      aria-hidden="true"
      style={{
        width: size, height: size, borderRadius: "var(--r-xs)", flex: "none",
        background: solid ? n.color : "transparent", border: solid ? "none" : `1px solid ${n.color}`,
        boxShadow: state === "active" ? "0 0 0 4px var(--wash-private)" : state === "waiting" ? "0 0 0 4px var(--wash-pending)" : undefined,
        animation: state === "active" ? "vs-tick var(--dur-base) var(--ease-mechanical)" : undefined,
      }}
    />
  );
}

/**
 * The public epoch lifecycle, in protocol order. Horizontal on desktop, vertical below
 * the medium breakpoint. The active node is the only one that carries prose.
 */
export function EpochTimeline({ steps = [], orientation = "horizontal", style }) {
  const vertical = orientation === "vertical";
  return (
    <ol
      style={{
        display: vertical ? "flex" : "grid",
        flexDirection: vertical ? "column" : undefined,
        gridTemplateColumns: vertical ? undefined : `repeat(${steps.length}, minmax(0, 1fr))`,
        gap: vertical ? 0 : 0, listStyle: "none", margin: 0, padding: 0, ...style,
      }}
    >
      {steps.map((s, i) => {
        const n = VS_NODE[s.state] || VS_NODE.future;
        const last = i === steps.length - 1;
        const railColor = s.state === "done" ? "var(--teal-600)" : s.state === "active" ? "var(--periwinkle-600)" : "var(--border-subtle)";
        return (
          <li key={s.id || i} style={{ display: "flex", flexDirection: vertical ? "row" : "column", gap: vertical ? 12 : 10, minWidth: 0, position: "relative", paddingBottom: vertical && !last ? 18 : 0 }}>
            <div style={{ display: "flex", flexDirection: vertical ? "column" : "row", alignItems: "center", gap: 0, flex: "none", paddingTop: vertical ? 3 : 0 }}>
              <Node state={s.state} />
              {!last ? (
                <span aria-hidden="true" style={{ background: railColor, ...(vertical ? { width: 1, flex: 1, minHeight: 20, marginTop: 4 } : { height: 1, flex: 1, marginLeft: 6 }) }} />
              ) : null}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, paddingRight: vertical ? 0 : 12 }}>
              <span style={{ font: "var(--type-micro)", letterSpacing: "var(--tr-label)", textTransform: "uppercase", color: s.state === "future" ? "var(--text-faint)" : s.state === "active" ? "var(--text-private)" : "var(--text-secondary)" }}>
                {s.label}
              </span>
              {s.meta ? <span className="vs-mono-sm" style={{ color: "var(--text-faint)" }}>{s.meta}</span> : null}
              {s.detail && (s.state === "active" || s.state === "waiting" || s.state === "failed") ? (
                <span style={{ font: "var(--type-body-sm)", color: "var(--text-secondary)", maxWidth: 260, textTransform: "none", letterSpacing: 0 }}>{s.detail}</span>
              ) : null}
            </div>
            {!vertical && (s.state === "active" || s.state === "waiting") ? (
              <span aria-hidden="true" style={{ position: "absolute", top: 4, left: 0, width: 3, height: 3, borderRadius: 2, background: n.color, animation: "vs-breathe 1.8s var(--ease-standard) infinite", opacity: 0 }} />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/** Legend for the node vocabulary — used in guidelines and the verification surface. */
export function EpochNodeLegend({ style }) {
  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", ...style }}>
      {Object.keys(VS_NODE).map((k) => (
        <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "var(--type-micro)", letterSpacing: "var(--tr-label)", textTransform: "uppercase", color: "var(--text-muted)" }}>
          <Node state={k} size={8} /> {VS_NODE[k].label}
          <Icon name={VS_NODE[k].icon} size={11} style={{ color: VS_NODE[k].color }} />
        </span>
      ))}
    </div>
  );
}
