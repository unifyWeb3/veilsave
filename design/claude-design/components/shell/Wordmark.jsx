import React from "react";

/**
 * The VeilSave lockup. No vector mark was supplied with the brand material, so the
 * wordmark is type-set: Instrument Sans, 600, tightened, with `veil` at reduced emphasis
 * so the eye lands on `Save`. The optional epoch glyph is the supplied EPOCH mark.
 */
export function Wordmark({ size = 17, mark = false, tone = "primary", style }) {
  const color = tone === "muted" ? "var(--text-secondary)" : "var(--text-primary)";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 9, ...style }}>
      {mark ? (
        <span
          aria-hidden="true"
          style={{
            width: size + 5, height: size + 5, borderRadius: "var(--r-xs)", flex: "none",
            display: "grid", placeItems: "center", border: "1px solid var(--border-private)", background: "var(--wash-private)",
          }}
        >
          <span style={{ width: 3, height: 3, borderRadius: 1, background: "var(--teal-500)", boxShadow: "0 0 0 3px var(--wash-verified)" }} />
        </span>
      ) : null}
      <span style={{ font: `600 ${size}px/1 var(--font-sans)`, letterSpacing: "var(--tr-wordmark)", color, whiteSpace: "nowrap" }}>
        <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>veil</span>Save
      </span>
    </span>
  );
}
