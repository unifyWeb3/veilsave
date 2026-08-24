import React from "react";

const vsProgTones = { private: "var(--periwinkle-500)", verified: "var(--teal-500)", pending: "var(--amber-500)", neutral: "var(--ink-600)" };

/** Horizontal progress rail. `indeterminate` uses the SCAN pattern (a travelling band) instead of a spinner. */
export function ProgressTrack({ value = 0, tone = "private", indeterminate = false, height = 3, label, style }) {
  const c = vsProgTones[tone] || vsProgTones.private;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={indeterminate ? undefined : Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{ position: "relative", height, width: "100%", background: "var(--slot-empty)", borderRadius: "var(--r-pill)", overflow: "hidden", ...style }}
    >
      {indeterminate ? (
        <span style={{ position: "absolute", inset: 0, width: "40%", background: `linear-gradient(90deg, transparent, ${c}, transparent)`, animation: "vs-scan 1.5s var(--ease-mechanical) infinite" }} />
      ) : (
        <span style={{ display: "block", height: "100%", width: Math.max(0, Math.min(100, value)) + "%", background: c, borderRadius: "var(--r-pill)", transition: "width var(--dur-epoch) var(--ease-mechanical)" }} />
      )}
    </div>
  );
}
