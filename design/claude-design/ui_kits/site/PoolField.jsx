(() => {
const V = () => window.VeilSaveDesignSystem_484fa6;

/* ── The pool field ───────────────────────────────────────────────────────────────
   The hero's visual system, and the product's whole thesis in one diagram:

     above the boundary   16 encrypted slots — masked values, one of them yours
     the boundary itself  a labelled hairline: ENCRYPTED above, PUBLIC below
     below the boundary   the evidence that prints as the epoch executes

   It runs the real lifecycle on a slow loop (open → frozen → requested → fulfilled →
   drawn → finalized). Nothing here is decorative: every cell is a slot, every row is a
   piece of evidence, and the one teal cell is the drawn slot. Under reduced motion it
   holds the finalized state instead of cycling. */

const PHASES = [
  { id: "open", label: "Open", note: "Deposits accepted · amounts encrypted in the browser" },
  { id: "frozen", label: "Eligibility frozen", note: "Weights sealed · they cannot change after this point" },
  { id: "requested", label: "Randomness requested", note: "Chainlink VRF request published on-chain" },
  { id: "fulfilled", label: "Randomness fulfilled", note: "Random word stored · nothing decrypted" },
  { id: "drawn", label: "Encrypted draw", note: "Winner selected over encrypted weights" },
  { id: "finalized", label: "Winner finalized", note: "Winner address public · prize amount still private" },
];

const EVIDENCE = [
  { k: "VRF REQUEST", v: "0x9f2c41a8b7e5d0c3", at: 2 },
  { k: "DRAW TX", v: "0x77a1cd0e4b8830fa19", at: 4 },
  { k: "WINNER PROOF", v: "0xd41c90aa7b6e5528", at: 5 },
];

const MINE = 5;
const DRAWN = 10;
const FILLED = [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 14, 15];

function usePhase() {
  const reduced = React.useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const [i, setI] = React.useState(reduced ? 5 : 0);
  React.useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => setI((n) => (n + 1) % (PHASES.length + 1)), 2600);
    return () => clearInterval(t);
  }, [reduced]);
  return Math.min(i, PHASES.length - 1);
}

function Slot({ index, phase, cell }) {
  const filled = FILLED.includes(index);
  const mine = index === MINE;
  const drawn = index === DRAWN && phase >= 4;
  const frozen = phase >= 1;
  const dim = phase >= 4 && !drawn;

  const border = drawn ? "var(--teal-500)" : mine ? "var(--slot-mine)" : filled ? "var(--slot-filled)" : "var(--slot-empty)";
  const bg = drawn ? "rgba(47,191,160,0.16)" : mine ? "var(--wash-private)" : filled ? "rgba(124,131,255,0.05)" : "transparent";

  return (
    <div
      style={{
        position: "relative", width: cell, height: cell, borderRadius: "var(--r-sm)",
        border: `1px solid ${border}`, background: bg,
        display: "grid", placeItems: "center", overflow: "hidden",
        opacity: dim ? 0.34 : 1,
        transition: "opacity var(--dur-epoch) var(--ease-mechanical), border-color var(--dur-epoch) var(--ease-mechanical), background var(--dur-epoch) var(--ease-mechanical)",
        boxShadow: drawn ? "var(--glow-verified)" : undefined,
        animation: drawn && phase === 4 ? "vs-halo var(--dur-epoch) var(--ease-standard) 2" : undefined,
      }}
    >
      {filled ? (
        <span
          className="vs-mono-sm"
          style={{
            color: drawn ? "var(--teal-300)" : "var(--periwinkle-400)", fontSize: 11, letterSpacing: "0.1em",
            animation: phase === 1 ? `vs-encrypt var(--dur-deliberate) var(--ease-standard) ${(index % 4) * 60}ms both` : undefined,
          }}
        >
          {drawn && phase >= 5 ? "WON" : "••••"}
        </span>
      ) : null}
      {mine && !drawn ? (
        <span aria-hidden="true" style={{ position: "absolute", top: 4, right: 4, width: 3, height: 3, borderRadius: 1, background: "var(--periwinkle-400)" }} />
      ) : null}
      {frozen && filled && !drawn ? (
        <span aria-hidden="true" style={{ position: "absolute", inset: 0, borderTop: "1px solid rgba(124,131,255,0.18)", animation: "vs-attest var(--dur-deliberate) var(--ease-mechanical) both" }} />
      ) : null}
    </div>
  );
}

function EpochAxis({ phase }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        {PHASES.map((p, i) => {
          const done = i < phase;
          const now = i === phase;
          const color = done ? "var(--teal-600)" : now ? "var(--periwinkle-500)" : "var(--border-subtle)";
          return (
            <React.Fragment key={p.id}>
              <span
                aria-hidden="true"
                style={{
                  width: now ? 8 : 6, height: now ? 8 : 6, flex: "none", borderRadius: "var(--r-xs)",
                  background: done || now ? color : "transparent",
                  border: done || now ? "none" : `1px solid ${color}`,
                  boxShadow: now ? "0 0 0 4px var(--wash-private)" : undefined,
                  transition: "all var(--dur-base) var(--ease-mechanical)",
                }}
              />
              {i < PHASES.length - 1 ? (
                <span aria-hidden="true" style={{ flex: 1, height: 1, background: i < phase ? "var(--teal-600)" : "var(--border-hairline)", transition: "background var(--dur-epoch) var(--ease-mechanical)" }} />
              ) : null}
            </React.Fragment>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, minHeight: 30 }}>
        <span className="vs-label" style={{ color: "var(--text-primary)", whiteSpace: "nowrap" }}>{PHASES[phase].label}</span>
        <span className="vs-body-sm" style={{ color: "var(--text-muted)", minWidth: 0 }}>{PHASES[phase].note}</span>
      </div>
    </div>
  );
}

function Boundary({ phase }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span className="vs-micro" style={{ color: "var(--text-private)", whiteSpace: "nowrap" }}>Encrypted</span>
      <span style={{ position: "relative", flex: 1, height: 1, background: "var(--border-hairline)", overflow: "hidden" }}>
        <span
          aria-hidden="true"
          style={{
            position: "absolute", inset: 0, width: "38%",
            background: "linear-gradient(90deg, transparent, var(--periwinkle-500), transparent)",
            animation: phase >= 1 && phase <= 4 ? "vs-scan 2.4s var(--ease-mechanical) infinite" : "none",
            opacity: phase >= 1 && phase <= 4 ? 1 : 0,
          }}
        />
      </span>
      <span className="vs-micro" style={{ color: "var(--text-verified)", whiteSpace: "nowrap" }}>Public</span>
    </div>
  );
}

function PoolField({ compact = false }) {
  const { Icon } = V();
  const phase = usePhase();
  const cell = compact ? 46 : 60;
  const gap = compact ? 8 : 10;

  return (
    <div
      className="vs-panel"
      style={{
        display: "flex", flexDirection: "column", gap: compact ? 18 : 22,
        padding: compact ? 20 : 26, position: "relative", overflow: "hidden",
        background: "linear-gradient(180deg, var(--surface-brand), var(--surface-raised) 62%)",
      }}
      role="img"
      aria-label={`VeilSave epoch lifecycle: ${PHASES[phase].label}. ${PHASES[phase].note}. Twelve of sixteen slots occupied, amounts encrypted.`}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "linear-gradient(to right, var(--field-grid) 1px, transparent 1px), linear-gradient(to bottom, var(--field-grid) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
          maskImage: "radial-gradient(90% 80% at 20% 10%, #000, transparent 76%)",
          WebkitMaskImage: "radial-gradient(90% 80% at 20% 10%, #000, transparent 76%)",
        }}
      />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap", position: "relative" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span className="vs-label" style={{ whiteSpace: "nowrap" }}>Pool · epoch 42</span>
          <span className="vs-num-3" style={{ color: "var(--text-primary)", whiteSpace: "nowrap" }}>12<span style={{ color: "var(--text-faint)" }}> / 16</span> <span className="vs-body-sm" style={{ color: "var(--text-muted)" }}>slots</span></span>
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", font: "var(--type-micro)", letterSpacing: "var(--tr-label)", textTransform: "uppercase", color: "var(--text-private)", border: "1px solid var(--border-private)", borderRadius: "var(--r-pill)", padding: "4px 9px", background: "var(--wash-private)" }}>
          <Icon name="lock" size={11} strokeWidth={1.9} /> Encrypted
        </span>
      </div>

      <div style={{ position: "relative", display: "grid", gridTemplateColumns: `repeat(4, ${cell}px)`, gap, justifyContent: "center" }}>
        {Array.from({ length: 16 }, (_, i) => <Slot key={i} index={i} phase={phase} cell={cell} />)}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, position: "relative" }}>
        <Boundary phase={phase} />
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {EVIDENCE.map((e) => {
            const on = phase >= e.at;
            return (
              <div key={e.k} style={{ display: "grid", gridTemplateColumns: "14px 108px 1fr", alignItems: "center", gap: 10, opacity: on ? 1 : 0.28, transition: "opacity var(--dur-base) var(--ease-standard)" }}>
                <span style={{ display: "flex", color: on ? "var(--teal-400)" : "var(--text-faint)" }}>
                  <Icon name={on ? "check" : "circle-dot"} size={12} strokeWidth={2} />
                </span>
                <span className="vs-micro" style={{ color: "var(--text-muted)" }}>{e.k}</span>
                <span className="vs-mono-sm" style={{ color: on ? "var(--text-secondary)" : "var(--text-faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", animation: on ? "vs-attest var(--dur-deliberate) var(--ease-mechanical) both" : "none" }}>
                  {on ? e.v : "awaiting"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--border-hairline)", paddingTop: 16, position: "relative" }}>
        <EpochAxis phase={phase} />
      </div>
    </div>
  );
}

Object.assign(window, { PoolField });
})();
