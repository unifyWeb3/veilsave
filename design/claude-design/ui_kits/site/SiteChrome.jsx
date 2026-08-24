(() => {
const V = () => window.VeilSaveDesignSystem_484fa6;

/* Local media-query hook: the design system's own useIsNarrow is not exposed on the
   window namespace (lowercase export), so kits carry their own one-liner. */
const vsNarrow = (q) => {
  const [n, setN] = React.useState(() => window.matchMedia(q).matches);
  React.useEffect(() => {
    const m = window.matchMedia(q), on = () => setN(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [q]);
  return n;
};

/* Enter-on-scroll. Visible-first: content renders shown, and only elements measured
   below the fold are pulled back and animated in. Nothing can be left hidden by a
   throttled observer, a print pass or a screenshot. Reduced motion is handled at the
   token layer, which collapses every duration to 1ms. */
function VSReveal({ children, delay = 0, style }) {
  const ref = React.useRef(null);
  const [on, setOn] = React.useState(true);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver !== "function") return;
    const r = el.getBoundingClientRect();
    if (r.top <= (window.innerHeight || 0) * 0.92) return;
    setOn(false);
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setOn(true); io.disconnect(); }
    }, { rootMargin: "0px 0px -6% 0px" });
    io.observe(el);
    const fallback = setTimeout(() => setOn(true), 4000);
    return () => { io.disconnect(); clearTimeout(fallback); };
  }, []);
  return (
    <div ref={ref} style={{
      opacity: on ? 1 : 0, transform: on ? "none" : "translateY(12px)",
      transition: `opacity var(--dur-slow) var(--ease-entrance) ${delay}ms, transform var(--dur-slow) var(--ease-entrance) ${delay}ms`,
      ...style,
    }}>{children}</div>
  );
}

function SiteHeader({ onEnter }) {
  const { Wordmark, Button } = V();
  const narrow = vsNarrow("(max-width: 860px)");
  const [lifted, setLifted] = React.useState(false);
  React.useEffect(() => {
    const on = () => setLifted(window.scrollY > 8);
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const links = [["How it works", "#how"], ["The draw", "#draw"], ["Privacy", "#privacy"], ["FAQ", "#faq"]];
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: "var(--z-nav)", display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 20, padding: narrow ? "12px 20px" : "16px 40px",
      borderBottom: `1px solid ${lifted ? "var(--border-hairline)" : "transparent"}`,
      background: lifted ? "color-mix(in oklab, var(--surface-page) 84%, transparent)" : "transparent",
      backdropFilter: lifted ? "blur(12px)" : "none",
      transition: "background var(--dur-base) var(--ease-standard), border-color var(--dur-base) var(--ease-standard)",
    }}>
      <Wordmark size={narrow ? 16 : 18} />
      {!narrow ? (
        <nav style={{ display: "flex", gap: 28 }}>
          {links.map(([l, h]) => (
            <a key={h} href={h} style={{ font: "var(--type-body-sm)", color: "var(--text-muted)", textDecoration: "none" }}>{l}</a>
          ))}
        </nav>
      ) : null}
      <Button tone="primary" size={narrow ? "sm" : "md"} iconAfter="arrow-right" onClick={onEnter}>Open console</Button>
    </header>
  );
}

/* Full-bleed band. Rhythm on this page comes from alternating surfaces and one field
   section per screenful — never from stacking cards. */
function Band({ id, tone = "page", field = false, children, pad = "lg", style }) {
  const bg = tone === "deep" ? "var(--surface-deep)" : tone === "brand" ? "var(--surface-brand)" : tone === "base" ? "var(--surface-base)" : "var(--surface-page)";
  const pads = { sm: "clamp(40px, 5vw, 56px)", lg: "clamp(56px, 8vw, 104px)", xl: "clamp(72px, 10vw, 132px)", none: "0" };
  return (
    <section
      id={id}
      className={field ? "vs-field" : undefined}
      style={{
        position: "relative", background: bg,
        borderTop: tone === "page" ? "1px solid var(--border-hairline)" : "1px solid var(--border-hairline)",
        paddingTop: pads[pad], paddingBottom: pads[pad], ...style,
      }}
    >
      <div style={{ maxWidth: "var(--content-max)", margin: "0 auto", padding: "0 clamp(20px, 4vw, 40px)", position: "relative" }}>
        {children}
      </div>
    </section>
  );
}

/* Section opener: mono eyebrow, display statement, lead. The eyebrow is mono so the
   page's structural voice reads technical instead of uppercase-sans dashboard. */
function BandHead({ label, title, lead, aside, narrow }) {
  return (
    <VSReveal>
      <div style={{ display: "grid", gridTemplateColumns: narrow || !aside ? "1fr" : "minmax(0, 1.55fr) minmax(0, 1fr)", gap: narrow ? 20 : 56, alignItems: "end", marginBottom: narrow ? 32 : 44 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {label ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <span aria-hidden="true" style={{ width: 18, height: 1, background: "var(--periwinkle-500)" }} />
              <span className="vs-label" style={{ color: "var(--text-private)" }}>{label}</span>
            </span>
          ) : null}
          {title ? <h2 className="vs-display-1" style={{ margin: 0, maxWidth: "22ch" }}>{title}</h2> : null}
        </div>
        {lead || aside ? (
          <p className="vs-lead" style={{ margin: 0, maxWidth: aside ? "42ch" : "58ch" }}>{aside || lead}</p>
        ) : null}
      </div>
    </VSReveal>
  );
}

function SiteFooter({ onEnter }) {
  const { Wordmark, Button, StrategyBadge } = V();
  return (
    <footer style={{ borderTop: "1px solid var(--border-hairline)", background: "var(--surface-brand)", position: "relative", overflow: "hidden" }}>
      <div style={{ maxWidth: "var(--content-max)", margin: "0 auto", padding: "clamp(48px, 7vw, 80px) clamp(20px, 4vw, 40px) 40px", display: "flex", flexDirection: "column", gap: 44, position: "relative" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 32, alignItems: "flex-end", justifyContent: "space-between" }}>
          <h2 className="vs-display-2" style={{ margin: 0, maxWidth: "20ch" }}>Take a slot while epoch 42 is open.</h2>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button tone="primary" size="lg" iconAfter="arrow-right" onClick={onEnter}>Open console</Button>
            <Button tone="secondary" size="lg" icon="external-link">Contracts</Button>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-end", justifyContent: "space-between", borderTop: "1px solid var(--border-hairline)", paddingTop: 28 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: "44ch" }}>
            <Wordmark size={17} />
            <p className="vs-body-sm" style={{ margin: 0 }}>
              Confidential prize-linked savings. Sixteen slots, one weekly draw, encrypted balances, public verification.
            </p>
          </div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
            <StrategyBadge mode="test" withHint={false} />
            <span className="vs-mono-sm" style={{ color: "var(--text-faint)" }}>SEPOLIA TESTNET · MVP</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

Object.assign(window, { VSReveal, SiteHeader, Band, BandHead, SiteFooter, vsNarrow });
})();
