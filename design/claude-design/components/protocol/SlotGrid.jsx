import React from "react";

const vsSlotFill = {
  empty: { background: "transparent", border: "1px solid var(--slot-empty)" },
  filled: { background: "transparent", border: "1px solid var(--slot-filled)" },
  mine: { background: "var(--wash-private)", border: "1px solid var(--slot-mine)" },
  drawn: { background: "var(--slot-drawn)", border: "1px solid var(--slot-drawn)" },
};

/**
 * The 16 public slots, laid out 4×4 — the fixed capacity of the pool, and the brand's
 * SLOTS mark used as live product data. Occupancy is public; the amount in a slot is not.
 */
export function SlotGrid({ slots = [], size = "md", caption, legend = false, style }) {
  const cell = size === "sm" ? 9 : size === "lg" ? 26 : 16;
  const gap = size === "sm" ? 3 : size === "lg" ? 7 : 5;
  const filled = slots.filter((s) => s !== "empty").length;
  const cells = Array.from({ length: 16 }, (_, i) => slots[i] || "empty");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, ...style }}>
      <div
        role="img"
        aria-label={`${filled} of 16 slots occupied`}
        style={{ display: "grid", gridTemplateColumns: `repeat(4, ${cell}px)`, gap, width: "max-content" }}
      >
        {cells.map((s, i) => (
          <span
            key={i}
            style={{
              width: cell, height: cell, borderRadius: size === "sm" ? 1 : "var(--r-xs)",
              transition: "background var(--dur-base) var(--ease-standard), border-color var(--dur-base) var(--ease-standard)",
              animation: s === "drawn" ? "vs-halo var(--dur-epoch) var(--ease-standard)" : undefined,
              ...(vsSlotFill[s] || vsSlotFill.empty),
            }}
          />
        ))}
      </div>
      {caption !== null ? (
        <span style={{ font: "var(--type-micro)", letterSpacing: "var(--tr-label)", textTransform: "uppercase", color: "var(--text-muted)" }}>
          {caption || <><span className="vs-num" style={{ color: "var(--text-primary)" }}>{filled}</span> / 16 slots occupied</>}
        </span>
      ) : null}
      {legend ? (
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {[["mine", "Your slot"], ["filled", "Occupied"], ["empty", "Open"], ["drawn", "Drawn"]].map(([k, l]) => (
            <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "var(--type-micro)", letterSpacing: "var(--tr-label)", textTransform: "uppercase", color: "var(--text-muted)" }}>
              <span style={{ width: 9, height: 9, borderRadius: 1, ...(vsSlotFill[k]) }} /> {l}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
