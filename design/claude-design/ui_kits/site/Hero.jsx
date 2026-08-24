(() => {
const V = () => window.VeilSaveDesignSystem_484fa6;

/* The hero is a visual system, not a headline over a background: the statement sits
   beside the live pool field, and the strip underneath carries the same protocol state
   the console shows. A first-time visitor sees the product working before they read a
   word about FHE. */
function Hero({ onEnter, narrow }) {
  const { Button, StrategyBadge, Icon } = V();
  return (
    <section className="vs-field" style={{ position: "relative", borderBottom: "1px solid var(--border-hairline)" }}>
      <div style={{
        maxWidth: "var(--content-max)", margin: "0 auto", width: "100%",
        padding: narrow ? "40px 20px 48px" : "clamp(56px, 7vw, 96px) 40px clamp(48px, 6vw, 72px)",
        display: "grid", gridTemplateColumns: narrow ? "1fr" : "minmax(0, 1.02fr) minmax(0, 0.98fr)",
        gap: narrow ? 40 : "clamp(40px, 5vw, 72px)", alignItems: "center",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 28, minWidth: 0 }}>
          <VSReveal>
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 10, alignSelf: "flex-start", padding: "5px 11px 5px 8px", borderRadius: "var(--r-pill)", border: "1px solid var(--border-hairline)", background: "var(--wash-neutral)" }}>
                <span aria-hidden="true" style={{ width: 5, height: 5, borderRadius: 1, background: "var(--teal-500)", animation: "vs-breathe 2.4s var(--ease-standard) infinite" }} />
                <span className="vs-micro" style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>Live on Sepolia · epoch 42 open</span>
              </span>
              <h1 className="vs-display-0" style={{ margin: 0, maxWidth: "15ch" }}>
                Private money.<br />
                <span style={{ color: "var(--text-verified)" }}>Public</span> fairness.
              </h1>
              <p className="vs-lead" style={{ margin: 0, maxWidth: "46ch" }}>
                Save cUSDT in one of sixteen slots. Your balance, weight and prize stay encrypted end to end — while the randomness and the winner proof stay open for anyone to check.
              </p>
            </div>
          </VSReveal>
          <VSReveal delay={80}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Button tone="primary" size="lg" iconAfter="arrow-right" onClick={onEnter}>Open the console</Button>
              <Button tone="secondary" size="lg" icon="shield-check">See the evidence</Button>
            </div>
          </VSReveal>
          <VSReveal delay={140}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", paddingTop: 2 }}>
              <StrategyBadge mode="test" />
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7, font: "var(--type-body-sm)", color: "var(--text-muted)" }}>
                <Icon name="circle-dot" size={12} /> No APY, no projections — prizes are donation-funded in this release.
              </span>
            </div>
          </VSReveal>
        </div>

        <VSReveal delay={120} style={{ minWidth: 0 }}>
          <PoolField compact={narrow} />
        </VSReveal>
      </div>

      <ProtocolStrip narrow={narrow} />
    </section>
  );
}

/* The live strip: the same four facts the console shows in its header, stated publicly.
   It is the seam between marketing site and product — and it is real protocol state,
   not a stat band. */
function ProtocolStrip({ narrow }) {
  const items = [
    ["Epoch", "42", "opened MAR 3 · 09:00"],
    ["Eligibility freezes", "MAR 10", "09:00 UTC"],
    ["Slots taken", "12 / 16", "four open"],
    ["Last verified draw", "E41", "winner 0x8f21c4…04c7"],
  ];
  return (
    <div style={{ borderTop: "1px solid var(--border-hairline)", background: "color-mix(in oklab, var(--surface-brand) 70%, transparent)" }}>
      <dl style={{
        maxWidth: "var(--content-max)", margin: "0 auto", padding: narrow ? "4px 20px" : "0 40px",
        display: "grid", gridTemplateColumns: narrow ? "1fr 1fr" : "repeat(4, 1fr)", gap: 0,
      }}>
        {items.map(([k, v, meta], i) => (
          <div key={k} style={{
            display: "flex", flexDirection: "column", gap: 5, padding: narrow ? "16px 0" : "22px 28px 22px 0",
            borderLeft: i === 0 || (narrow && i % 2 === 0) ? "none" : "1px solid var(--border-hairline)",
            paddingLeft: i === 0 || (narrow && i % 2 === 0) ? 0 : narrow ? 16 : 28,
          }}>
            <dt className="vs-micro">{k}</dt>
            <dd style={{ margin: 0, display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              <span className="vs-num-4" style={{ color: "var(--text-primary)" }}>{v}</span>
              <span className="vs-mono-sm" style={{ color: "var(--text-faint)" }}>{meta}</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

Object.assign(window, { Hero, ProtocolStrip });
})();
