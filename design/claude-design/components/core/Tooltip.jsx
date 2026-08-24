import React from "react";
import { Icon } from "./Icon.jsx";

/** Accessible explanation for unfamiliar protocol terms. Opens on hover AND focus AND tap; never the only route to information. */
export function Tooltip({ children, content, side = "top", width = 232 }) {
  const [open, setOpen] = React.useState(false);
  const id = React.useMemo(() => "vs-tip-" + Math.random().toString(36).slice(2, 8), []);
  const pos = side === "bottom"
    ? { top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" }
    : { bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" };
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <span
        tabIndex={0}
        role="button"
        aria-describedby={open ? id : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
        style={{ display: "inline-flex", alignItems: "center", gap: 4, cursor: "help", color: "inherit", borderRadius: "var(--r-xs)" }}
      >
        {children || <Icon name="circle-question-mark" size={13} label="More information" />}
      </span>
      {open ? (
        <span
          role="tooltip"
          id={id}
          style={{
            position: "absolute", ...pos, width, zIndex: "var(--z-overlay)",
            background: "var(--surface-overlay)", border: "1px solid var(--border-subtle)",
            borderRadius: "var(--r-md)", padding: "9px 11px", boxShadow: "var(--shadow-overlay)",
            font: "var(--type-body-sm)", lineHeight: 1.45, color: "var(--text-secondary)", textTransform: "none", letterSpacing: 0,
            animation: "vs-decrypt var(--dur-fast) var(--ease-entrance)",
          }}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
