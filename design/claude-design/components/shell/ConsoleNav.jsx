import React from "react";
import { Icon } from "../core/Icon.jsx";
import { Wordmark } from "./Wordmark.jsx";

/**
 * Console navigation. A 232px rail on desktop; a three-destination bottom bar at 44px+
 * targets on mobile, matching the frozen route set (Pool, Dashboard, Draws).
 * Deposit and Withdraw are commands inside the dashboard, never navigation.
 */
export function ConsoleNav({ items = [], active, onNavigate, variant = "rail", footer, secondary = [], style }) {
  if (variant === "bottom") {
    return (
      <nav
        aria-label="Primary"
        style={{
          position: "sticky", bottom: 0, zIndex: "var(--z-nav)", display: "grid",
          gridTemplateColumns: `repeat(${items.length}, 1fr)`, height: "var(--shell-bottom-nav)",
          background: "var(--surface-base)", borderTop: "1px solid var(--border-subtle)", ...style,
        }}
      >
        {items.map((it) => {
          const on = it.id === active;
          return (
            <button
              key={it.id}
              type="button"
              aria-current={on ? "page" : undefined}
              onClick={() => onNavigate && onNavigate(it.id)}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, minHeight: 44, background: "none", border: 0, cursor: "pointer", color: on ? "var(--text-primary)" : "var(--text-muted)", position: "relative" }}
            >
              {on ? <span aria-hidden="true" style={{ position: "absolute", top: 0, left: "28%", right: "28%", height: 2, background: "var(--periwinkle-500)", borderRadius: "0 0 1px 1px" }} /> : null}
              <Icon name={it.icon} size={17} strokeWidth={on ? 2 : 1.5} />
              <span style={{ font: "var(--type-micro)", letterSpacing: "var(--tr-label)", textTransform: "uppercase" }}>{it.label}</span>
            </button>
          );
        })}
      </nav>
    );
  }
  return (
    <nav
      aria-label="Primary"
      style={{
        width: "var(--shell-nav)", flex: "none", display: "flex", flexDirection: "column",
        gap: 26, padding: "22px 16px", borderRight: "1px solid var(--border-hairline)",
        background: "var(--surface-base)", ...style,
      }}
    >
      <div style={{ padding: "0 6px" }}><Wordmark mark size={16} /></div>
      <ul style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {items.map((it) => {
          const on = it.id === active;
          return (
            <li key={it.id}>
              <button
                type="button"
                aria-current={on ? "page" : undefined}
                onClick={() => onNavigate && onNavigate(it.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%", height: 34, padding: "0 8px",
                  borderRadius: "var(--r-sm)", border: 0, cursor: "pointer", textAlign: "left",
                  background: on ? "var(--wash-private)" : "transparent",
                  color: on ? "var(--text-primary)" : "var(--text-muted)",
                  font: "var(--type-body-sm)", fontWeight: on ? 600 : 400,
                  transition: "background var(--dur-fast) var(--ease-standard), color var(--dur-fast) var(--ease-standard)",
                  position: "relative",
                }}
              >
                {on ? <span aria-hidden="true" style={{ position: "absolute", left: -16, top: 8, bottom: 8, width: 2, background: "var(--periwinkle-500)", borderRadius: "0 1px 1px 0" }} /> : null}
                <Icon name={it.icon} size={15} />
                {it.label}
                {it.badge ? <span style={{ marginLeft: "auto", font: "var(--type-micro)", letterSpacing: "var(--tr-label)", textTransform: "uppercase", color: "var(--text-verified)" }}>{it.badge}</span> : null}
              </button>
            </li>
          );
        })}
      </ul>
      {secondary.length ? (
        <ul style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: -12 }}>
          {secondary.map((it) => (
            <li key={it.id}>
              <button
                type="button"
                onClick={() => onNavigate && onNavigate(it.id)}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", height: 30, padding: "0 8px", borderRadius: "var(--r-sm)", border: 0, background: "transparent", cursor: "pointer", color: "var(--text-faint)", font: "var(--type-body-sm)", textAlign: "left" }}
              >
                <Icon name={it.icon} size={14} />
                {it.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 12 }}>{footer}</div>
    </nav>
  );
}
