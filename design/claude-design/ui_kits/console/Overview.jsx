(() => {
  const V = () => window.VeilSaveDesignSystem_484fa6;

  /* Independent per-value reveal. Revealing principal never reveals the prize:
     each key owns its own state machine. */
  function useReveals() {
    const [map, setMap] = React.useState({});
    const set = (k, v) => setMap((m) => ({ ...m, [k]: v }));
    const reveal = (k, delay = 1300) => {
      set(k, "revealing");
      setTimeout(() => set(k, "revealed"), delay);
    };
    return { state: (k, fallback = "masked") => map[k] || fallback, reveal, hide: (k) => set(k, "masked"), set };
  }

  /* ── The position band ──────────────────────────────────────────────────────────
     The dashboard's anchor: one encrypted figure at display scale, the slot it occupies,
     the two weights that decide eligibility, and the two commands. It is a single framed
     surface rather than four cards, so the eye lands on the value and the structure
     reads as one position rather than a scatter of metrics. */
  function PositionBlock({ scenario, reveals, onDeposit, onWithdraw, narrow }) {
    const { FinancialMetric, ConfidentialValue, Button, Icon, SlotGrid, StateBlock } = V();
    const p = window.VS_MOCK.position;

    if (scenario === "empty") {
      return (
        <StateBlock kind="empty" title="No savings yet" actionLabel="Deposit cUSDT" onAction={onDeposit} secondaryLabel="How privacy works">
          Fifteen of the sixteen slots are taken. Deposit cUSDT to claim one — your amount is encrypted in this browser before it is submitted.
        </StateBlock>
      );
    }

    const down = scenario === "rpcDown";
    return (
      <Frame tone="brand" accent="private" pad={narrow ? 20 : 28}>
        <div style={{ display: "flex", flexDirection: "column", gap: narrow ? 22 : 26 }}>
          <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "minmax(0, 1fr) auto", gap: narrow ? 22 : 32, alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span className="vs-label">Your position</span>
                <span aria-hidden="true" style={{ width: 14, height: 1, background: "var(--border-subtle)" }} />
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "var(--type-micro)", letterSpacing: "var(--tr-label)", textTransform: "uppercase", color: "var(--text-private)", whiteSpace: "nowrap" }}>
                  <Icon name="grid-2x2" size={11} strokeWidth={1.9} /> Slot 07 of 16
                </span>
              </div>
              <ConfidentialValue
                size="xl"
                state={down ? "unavailable" : reveals.state("savings")}
                value={p.savings}
                onReveal={() => reveals.reveal("savings")}
                onHide={() => reveals.hide("savings")}
                onRetry={() => reveals.set("savings", "masked")}
              />
              <p style={{ display: "flex", alignItems: "center", gap: 8, margin: 0, font: "var(--type-body-sm)", color: down ? "var(--text-pending)" : "var(--text-muted)" }}>
                <Icon name={down ? "cloud-off" : "shield-check"} size={13} style={{ flex: "none", color: down ? "var(--text-pending)" : "var(--text-verified)" }} />
                {down ? "Chain reads are failing. Your principal is unaffected." : "Principal stays withdrawable at all times."}
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: narrow ? "row" : "column", gap: 10, width: narrow ? "100%" : 168 }}>
              <Button tone="primary" size={narrow ? "lg" : "md"} icon="arrow-down-to-line" onClick={onDeposit} block>Deposit</Button>
              <Button tone="secondary" size={narrow ? "lg" : "md"} icon="arrow-up-from-line" onClick={onWithdraw} block>Withdraw</Button>
            </div>
          </div>

          <div style={{
            display: "grid", gridTemplateColumns: narrow ? "1fr" : "minmax(0, 1fr) minmax(0, 1fr) auto",
            gap: narrow ? 20 : 32, paddingTop: narrow ? 20 : 22, borderTop: "1px solid var(--border-hairline)", alignItems: "start",
          }}>
            <FinancialMetric
              label="Eligible weight" hint="Weight already frozen into the current epoch. Odds are never shown." size="md"
              state={reveals.state("eligible")} value={p.eligible}
              onReveal={() => reveals.reveal("eligible")} onHide={() => reveals.hide("eligible")}
              footnote="Counted in epoch 42." footnoteTone="verified"
            />
            <FinancialMetric
              label="Pending weight" hint="Deposited during the open epoch. It becomes eligible at the next maturity." size="md"
              state={reveals.state("pending")} value={p.pending}
              onReveal={() => reveals.reveal("pending")} onHide={() => reveals.hide("pending")}
              footnote={`Eligible from epoch ${p.eligibleFrom}.`} footnoteTone="pending"
            />
            {!narrow ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 9, alignItems: "flex-end" }}>
                <span className="vs-micro">Pool</span>
                <SlotGrid size="sm" slots={window.VS_MOCK.pool.slots} caption={null} />
                <span className="vs-mono-sm" style={{ color: "var(--text-faint)" }}>12 / 16 TAKEN</span>
              </div>
            ) : null}
          </div>

          <p style={{ display: "flex", alignItems: "center", gap: 8, font: "var(--type-body-sm)", color: "var(--text-muted)", margin: 0, borderTop: "1px solid var(--border-hairline)", paddingTop: 16 }}>
            <Icon name="lock" size={13} style={{ color: "var(--text-private)", flex: "none" }} />
            Amounts and weights are encrypted. Your wallet address and transaction timing remain public.
          </p>
        </div>
      </Frame>
    );
  }

  function EpochPanel({ narrow, onVerify }) {
    const { EpochTimeline, ProgressTrack, Button, StatusPill } = V();
    const e = window.VS_MOCK.epoch;
    return (
      <Section
        label="Current epoch"
        title={`Epoch ${e.id}`}
        actions={!narrow ? <Button tone="ghost" size="sm" iconAfter="arrow-right" onClick={onVerify}>Evidence</Button> : null}
      >
        <Frame tone="raised" pad={narrow ? 18 : 22}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
              <StatusPill tone="pending" pulse>Awaiting randomness</StatusPill>
              <span className="vs-mono-sm" style={{ color: "var(--text-faint)" }}>FROZEN AT BLOCK {e.block}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <ProgressTrack value={e.elapsed} tone="private" label="Epoch elapsed" />
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span className="vs-mono-sm" style={{ color: "var(--text-faint)" }}>OPENED MAR 3 · 09:00</span>
                <span className="vs-mono-sm" style={{ color: "var(--text-faint)" }}>FREEZES MAR 10 · 09:00</span>
              </div>
            </div>
            <div style={{ borderTop: "1px solid var(--border-hairline)", paddingTop: 20 }}>
              <EpochTimeline steps={window.VS_MOCK.epochSteps[e.state]} orientation={narrow ? "vertical" : "horizontal"} />
            </div>
          </div>
        </Frame>
        {narrow ? <Button tone="secondary" size="md" block iconAfter="arrow-right" onClick={onVerify}>View draw evidence</Button> : null}
      </Section>
    );
  }

  function PoolPanel() {
    const { SlotGrid, StrategyBadge } = V();
    return (
      <Section label="Pool" title="16 slots" gap={16}>
        <Frame tone="raised" pad={20}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <SlotGrid slots={window.VS_MOCK.pool.slots} legend />
            <div style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid var(--border-hairline)", paddingTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span className="vs-label">Prize funding</span>
                <StrategyBadge mode="test" size="sm" />
              </div>
              <span style={{ font: "var(--type-body-sm)", color: "var(--text-muted)" }}>
                One prize per weekly epoch, funded by donations into a deterministic test vault.
              </span>
            </div>
          </div>
        </Frame>
      </Section>
    );
  }

  function ActivityPanel() {
    const { ActivityItem } = V();
    return (
      <Section label="Recent activity" title="Privacy-safe log" gap={8}>
        <ul>
          {window.VS_MOCK.activity.map((a, i) => <ActivityItem key={i} {...a} />)}
        </ul>
        <span style={{ font: "var(--type-body-sm)", color: "var(--text-faint)", paddingTop: 4 }}>
          Amounts never appear here, in notifications, or in the page title.
        </span>
      </Section>
    );
  }

  function Overview({ scenario = "default", onDeposit, onWithdraw, onVerify, narrow }) {
    const { TicketPanel, QueueItem } = V();
    const reveals = useReveals();
    const showTicket = scenario === "queued" || scenario === "default";
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
        <PositionBlock scenario={scenario} reveals={reveals} onDeposit={onDeposit} onWithdraw={onWithdraw} narrow={narrow} />
        <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "minmax(0, 1.25fr) minmax(0, 0.9fr)", gap: narrow ? 40 : 48, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 40, minWidth: 0 }}>
            <EpochPanel narrow={narrow} onVerify={onVerify} />
            <PrizePanel reveals={reveals} scenario={scenario} />
            {showTicket ? (
              <Section label="Withdrawal" title="Your ticket" gap={16}>
                <TicketPanel
                  state={scenario === "queued" ? "claimable" : "queued"}
                  position={2} total={3} requestedAt="MAR 2 · 16:08"
                  steps={[
                    { label: "Request accepted", kind: "submitted", status: "done", meta: "0x2be0…cc" },
                    { label: "Routing proof", kind: "dependency", status: "done", meta: "IMMEDIATE LIQUIDITY SHORT" },
                    { label: "Strategy redemption", kind: "dependency", status: scenario === "queued" ? "done" : "active", detail: "The controller is redeeming from the strategy and rewrapping to confidential balance." },
                    { label: "Confidential claim", kind: "fulfilled", status: scenario === "queued" ? "active" : "future" },
                  ]}
                />
                <ul style={{ display: "grid", gap: 8 }}>
                  {window.VS_MOCK.queue.map((q) => <QueueItem key={q.position} {...q} total={3} />)}
                </ul>
              </Section>
            ) : null}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 40, minWidth: 0 }}>
            <PoolPanel />
            <ActivityPanel />
          </div>
        </div>
      </div>
    );
  }

  Object.assign(window, { Overview, useReveals });
})();
