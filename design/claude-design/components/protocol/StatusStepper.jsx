import React from "react";
import { Icon } from "../core/Icon.jsx";
import { ProgressTrack } from "../core/ProgressTrack.jsx";

const vsOpStates = {
  draft: { tone: "var(--ink-400)", icon: "circle-dot" },
  encrypting: { tone: "var(--periwinkle-500)", icon: "lock" },
  wallet: { tone: "var(--periwinkle-500)", icon: "wallet" },
  submitted: { tone: "var(--periwinkle-500)", icon: "arrow-up-right" },
  confirming: { tone: "var(--periwinkle-500)", icon: "scan-line" },
  dependency: { tone: "var(--amber-500)", icon: "hourglass" },
  fulfilled: { tone: "var(--teal-500)", icon: "check" },
  retryable: { tone: "var(--amber-500)", icon: "refresh-cw" },
  terminal: { tone: "var(--red-500)", icon: "circle-alert" },
};

/**
 * One operation's async progress: local encryption → wallet → chain → external
 * dependency → fulfilment. Steps ahead of the current one stay quiet; the current step
 * is the only one that explains itself.
 */
export function StatusStepper({ steps = [], style }) {
  const activeIndex = steps.findIndex((s) => s.status === "active");
  return (
    <ol style={{ display: "flex", flexDirection: "column", listStyle: "none", margin: 0, padding: 0, ...style }}>
      {steps.map((s, i) => {
        const kind = vsOpStates[s.kind] || vsOpStates.draft;
        const done = s.status === "done";
        const active = s.status === "active";
        const failed = s.status === "failed";
        const last = i === steps.length - 1;
        const color = failed ? "var(--red-500)" : done ? "var(--teal-500)" : active ? kind.tone : "var(--ink-400)";
        return (
          <li key={s.id || i} style={{ display: "flex", gap: 12, minWidth: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "none", width: 18 }}>
              <span
                aria-hidden="true"
                style={{
                  width: 18, height: 18, borderRadius: "var(--r-sm)", display: "grid", placeItems: "center", flex: "none",
                  background: done ? "var(--wash-verified)" : active ? (s.kind === "dependency" ? "var(--wash-pending)" : "var(--wash-private)") : failed ? "var(--wash-critical)" : "transparent",
                  border: `1px solid ${done || active || failed ? color : "var(--border-hairline)"}`, color,
                }}
              >
                <span style={{ display: "flex", animation: active ? "vs-breathe 1.8s var(--ease-standard) infinite" : undefined }}>
                  <Icon name={done ? "check" : failed ? "circle-alert" : kind.icon} size={11} strokeWidth={2} />
                </span>
              </span>
              {!last ? <span aria-hidden="true" style={{ width: 1, flex: 1, minHeight: 14, background: done ? "var(--teal-600)" : "var(--border-subtle)" }} /> : null}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5, paddingBottom: last ? 0 : 16, minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                <span style={{ font: "var(--type-body-sm)", fontWeight: active ? 600 : 400, color: done || active || failed ? "var(--text-primary)" : "var(--text-faint)" }}>{s.label}</span>
                {s.meta ? <span className="vs-mono-sm" style={{ color: "var(--text-faint)", whiteSpace: "nowrap" }}>{s.meta}</span> : null}
              </div>
              {active && s.detail ? <span style={{ font: "var(--type-body-sm)", color: "var(--text-secondary)" }}>{s.detail}</span> : null}
              {active && s.kind !== "draft" ? <ProgressTrack indeterminate tone={s.kind === "dependency" ? "pending" : "private"} label={s.label} style={{ maxWidth: 160, marginTop: 2 }} /> : null}
              {failed && s.detail ? <span style={{ font: "var(--type-body-sm)", color: "var(--text-critical)" }}>{s.detail}</span> : null}
              {i === activeIndex && s.action ? <div style={{ marginTop: 6 }}>{s.action}</div> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
