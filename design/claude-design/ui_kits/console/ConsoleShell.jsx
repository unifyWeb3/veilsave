(() => {
const V = () => window.VeilSaveDesignSystem_484fa6;

const vsNarrowC = (q) => {
  const [n, setN] = React.useState(() => window.matchMedia(q).matches);
  React.useEffect(() => {
    const m = window.matchMedia(q), on = () => setN(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [q]);
  return n;
};

/* Console shell. A 236px rail above 900px, a three-destination bottom bar below it. The
   header always carries network and strategy identity, because both change what a write
   means. The field sits behind the top of the view only — enough to give the position
   band an environment, never enough to compete with a value. */
function ConsoleShell({ view, onNavigate, banner, actions, title, eyebrow, children }) {
  const { ConsoleNav, WalletControl, StrategyBadge, Wordmark, ProgressTrack } = V();
  const narrow = vsNarrowC("(max-width: 900px)");
  const nav = [
    { id: "pool", label: "Pool", icon: "grid-2x2" },
    { id: "dashboard", label: "Dashboard", icon: "vault" },
    { id: "draws", label: "Draws", icon: "dices" },
  ];
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--surface-page)" }}>
      {!narrow ? (
        <ConsoleNav
          items={nav}
          active={view}
          onNavigate={onNavigate}
          secondary={[{ id: "privacy", label: "Privacy", icon: "lock" }]}
          footer={<>
            <div style={{ display: "flex", flexDirection: "column", gap: 9, padding: "14px 8px", borderTop: "1px solid var(--border-hairline)" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                <span className="vs-micro">Epoch 42</span>
                <span className="vs-mono-sm" style={{ color: "var(--text-faint)" }}>6D LEFT</span>
              </div>
              <ProgressTrack value={68} tone="private" label="Epoch elapsed" height={2} />
              <span className="vs-mono-sm" style={{ color: "var(--text-faint)" }}>FREEZES MAR 10 · 09:00</span>
            </div>
            <StrategyBadge mode="test" size="sm" />
            <WalletControl state="connected" address={window.VS_MOCK.wallet.address} network="Sepolia" compact />
          </>}
          style={{ position: "sticky", top: 0, height: "100vh" }}
        />
      ) : null}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", position: "relative" }}>
        <div
          className="vs-field vs-field-flat"
          aria-hidden="true"
          style={{ position: "absolute", top: 0, left: 0, right: 0, height: 420, pointerEvents: "none", opacity: 0.9 }}
        />
        <header
          style={{
            position: "sticky", top: 0, zIndex: "var(--z-sticky)",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
            padding: narrow ? "12px 20px" : "16px 40px", borderBottom: "1px solid var(--border-hairline)",
            background: "color-mix(in oklab, var(--surface-page) 82%, transparent)", backdropFilter: "blur(10px)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
            {narrow ? <Wordmark size={15} /> : (
              <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                <Wordmark size={15} tone="muted" />
                <span aria-hidden="true" style={{ width: 1, height: 18, background: "var(--border-hairline)" }} />
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, minWidth: 0 }}>
                  <h1 className="vs-title-2" style={{ margin: 0 }}>{title}</h1>
                  {eyebrow ? <span className="vs-mono-sm" style={{ color: "var(--text-faint)" }}>{eyebrow}</span> : null}
                </div>
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {narrow ? <StrategyBadge mode="test" size="sm" withHint={false} /> : null}
            {narrow ? <WalletControl state="connected" address={window.VS_MOCK.wallet.address} network="Sepolia" compact /> : actions}
          </div>
        </header>
        <main style={{ flex: 1, padding: narrow ? "18px 20px 28px" : "30px 40px 72px", maxWidth: "var(--content-max)", width: "100%", position: "relative" }}>
          {banner ? <div style={{ marginBottom: 22 }}>{banner}</div> : null}
          {narrow && title ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 18 }}>
              {eyebrow ? <span className="vs-micro">{eyebrow}</span> : null}
              <h1 className="vs-title-1" style={{ margin: 0 }}>{title}</h1>
            </div>
          ) : null}
          {children}
        </main>
        {narrow ? <ConsoleNav variant="bottom" items={nav} active={view} onNavigate={onNavigate} /> : null}
      </div>
    </div>
  );
}

/* A ruled section — the console's alternative to wrapping everything in cards. Optional
   `panel` puts the body on a raised surface when the content is a diagram rather than
   a list. */
function Section({ label, title, description, actions, children, gap = 18, panel = false, style }) {
  const { SectionHead } = V();
  return (
    <section style={{ display: "flex", flexDirection: "column", gap, ...style }}>
      <SectionHead label={label} title={title} description={description} actions={actions} />
      {panel ? <div className="vs-panel-quiet" style={{ padding: 20 }}>{children}</div> : children}
    </section>
  );
}

/* Framed surface: one panel treatment with the 36px measuring lattice inside it, masked
   to the top-left. The same treatment the homepage pool field uses, so the console and
   the site read as one system. Depth comes from surface value + hairline + a low wide
   shadow — never from a floating card. */
function Frame({ children, tone = "raised", pad = 22, lattice = true, accent, style }) {
  const bg = tone === "brand"
    ? "linear-gradient(180deg, var(--surface-brand), var(--surface-raised) 64%)"
    : tone === "quiet" ? "var(--surface-base)" : "var(--surface-raised)";
  const border = accent === "private" ? "var(--border-private)" : accent === "verified" ? "var(--border-verified)" : "var(--border-hairline)";
  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: "var(--r-lg)", border: `1px solid ${border}`, background: bg, boxShadow: "var(--sheen-top), var(--shadow-panel)", padding: pad, ...style }}>
      {lattice ? (
        <span aria-hidden="true" style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "linear-gradient(to right, var(--field-grid) 1px, transparent 1px), linear-gradient(to bottom, var(--field-grid) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
          maskImage: "radial-gradient(80% 70% at 12% 0%, #000, transparent 74%)",
          WebkitMaskImage: "radial-gradient(80% 70% at 12% 0%, #000, transparent 74%)",
        }} />
      ) : null}
      <div style={{ position: "relative" }}>{children}</div>
    </div>
  );
}

Object.assign(window, { ConsoleShell, Section, Frame, vsUseIsNarrow: vsNarrowC });
})();
