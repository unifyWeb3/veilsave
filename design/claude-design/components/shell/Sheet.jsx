import React from "react";
import { Icon } from "../core/Icon.jsx";

export function useIsNarrow(query = "(max-width: 767px)") {
  const [narrow, setNarrow] = React.useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  React.useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setNarrow(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return narrow;
}

/**
 * The one overlay in the system: a centred dialog on desktop, a bottom sheet below 768px.
 * Deposit and withdrawal flows live here. Escape closes, focus is trapped at the edges,
 * and the scrim never hides the value the user is acting on.
 */
export function Sheet({ open, title, eyebrow, onClose, children, footer, width = 460, fullHeight = false }) {
  const narrow = useIsNarrow();
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose && onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: "var(--z-overlay)", display: "flex", alignItems: narrow ? "flex-end" : "center", justifyContent: "center", padding: narrow ? 0 : 24 }}
    >
      <div
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "var(--surface-scrim)", backdropFilter: "blur(3px)", animation: "vs-decrypt var(--dur-base) var(--ease-standard)" }}
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          position: "relative", width: narrow ? "100%" : width, maxWidth: "100%",
          maxHeight: narrow ? (fullHeight ? "100dvh" : "92dvh") : "88vh",
          height: narrow && fullHeight ? "100dvh" : undefined,
          display: "flex", flexDirection: "column",
          background: "var(--surface-overlay)", border: "1px solid var(--border-subtle)",
          borderRadius: narrow ? "var(--r-lg) var(--r-lg) 0 0" : "var(--r-lg)",
          boxShadow: narrow ? "var(--shadow-sheet)" : "var(--shadow-overlay)",
          animation: `${narrow ? "vs-settle" : "vs-decrypt"} var(--dur-slow) var(--ease-entrance)`,
        }}
      >
        <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "18px 20px 14px", borderBottom: "1px solid var(--border-hairline)", flex: "none" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
            {eyebrow ? <span className="vs-label">{eyebrow}</span> : null}
            <h2 className="vs-title-2" style={{ margin: 0 }}>{title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ width: 32, height: 32, display: "grid", placeItems: "center", background: "none", border: 0, borderRadius: "var(--r-sm)", cursor: "pointer", color: "var(--text-muted)", flex: "none" }}>
            <Icon name="x" size={15} />
          </button>
        </header>
        <div style={{ padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 18, flex: 1 }}>{children}</div>
        {footer ? (
          <footer style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px 20px calc(16px + env(safe-area-inset-bottom))", borderTop: "1px solid var(--border-hairline)", background: "var(--surface-base)", flex: "none" }}>
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
