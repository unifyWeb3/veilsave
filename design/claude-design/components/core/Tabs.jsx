import React from "react";

/** Underlined tab set for sibling views (current draw vs history, evidence vs summary). Keyboard: arrow keys move, Enter selects. */
export function Tabs({ items = [], value, onChange, style }) {
  return (
    <div role="tablist" style={{ display: "flex", gap: 2, borderBottom: "1px solid var(--border-hairline)", ...style }}>
      {items.map((it) => {
        const active = it.id === value;
        return (
          <button
            key={it.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange && onChange(it.id)}
            style={{
              position: "relative", background: "none", border: 0, cursor: "pointer",
              padding: "0 12px", height: 40, display: "inline-flex", alignItems: "center", gap: 7,
              font: "var(--type-body-sm)", fontWeight: active ? 600 : 400,
              color: active ? "var(--text-primary)" : "var(--text-muted)",
              transition: "color var(--dur-fast) var(--ease-standard)",
            }}
          >
            {it.label}
            {it.count != null ? <span className="vs-num" style={{ font: "var(--type-micro)", color: "var(--text-faint)" }}>{it.count}</span> : null}
            <span
              aria-hidden="true"
              style={{
                position: "absolute", left: 0, right: 0, bottom: -1, height: 2, borderRadius: "1px 1px 0 0",
                background: active ? "var(--periwinkle-500)" : "transparent",
                transformOrigin: "left", animation: active ? "vs-attest var(--dur-base) var(--ease-standard)" : undefined,
              }}
            />
          </button>
        );
      })}
    </div>
  );
}
