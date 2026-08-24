(() => {
  const V = () => window.VeilSaveDesignSystem_484fa6;

  const VS_EPOCHS = [
    { id: 41, winner: "0x8f21c4…04c7", state: "finalized", drawn: "MAR 2 · 09:04", verdict: "verified" },
    { id: 40, winner: "0x41b7d0…9e12", state: "finalized", drawn: "FEB 24 · 09:02", verdict: "verified" },
    { id: 39, winner: "—", state: "timedOut", drawn: "FEB 17 · 09:00", verdict: "failed" },
    { id: 38, winner: "0xcc0a51…7b40", state: "finalized", drawn: "FEB 10 · 09:03", verdict: "verified" },
  ];

  function EpochRow({ e, onOpen }) {
    const { StatusPill, IconButton, Badge } = V();
    return (
      <li
        onClick={() => onOpen(e.id)}
        style={{ display: "grid", gridTemplateColumns: "84px 1fr auto auto", alignItems: "center", gap: 16, padding: "14px 4px", borderBottom: "1px solid var(--border-hairline)", cursor: "pointer" }}
      >
        <Badge mono>E{e.id}</Badge>
        <span className="vs-mono" style={{ color: e.winner === "—" ? "var(--text-faint)" : "var(--text-secondary)" }}>{e.winner}</span>
        <span className="vs-mono-sm" style={{ color: "var(--text-faint)" }}>{e.drawn}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {e.state === "timedOut"
            ? <StatusPill tone="terminal">Timed out</StatusPill>
            : <StatusPill tone="verified">Authenticated</StatusPill>}
          <IconButton name="chevron-right" size="sm" label={`Open epoch ${e.id}`} />
        </span>
      </li>
    );
  }

  function EpochDetail({ id, onBack, narrow }) {
    const { EpochTimeline, ProofBlock, EvidenceRow, Button, SlotGrid, StatusPill, PrivacyCallout } = V();
    const timedOut = id === 39;
    const slots = window.VS_MOCK.pool.slots.map((s, i) => (i === 10 && !timedOut ? "drawn" : s === "mine" ? "filled" : s));
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <Button tone="ghost" size="sm" icon="chevron-left" onClick={onBack}>All draws</Button>
          {timedOut ? <StatusPill tone="terminal">Terminal — no reroll</StatusPill> : <StatusPill tone="verified">Winner finalized</StatusPill>}
        </div>
        <Section label={`Epoch ${id}`} title={timedOut ? "Randomness never arrived" : "Winner 0x8f21c4…04c7"} description={timedOut ? "The VRF request was not fulfilled within the deadline. A timed-out epoch is terminal: weights stay frozen, no winner is selected, and no reroll is possible." : "Public evidence in protocol order. Expand any block to inspect the machine values."}>
          <EpochTimeline steps={window.VS_MOCK.epochSteps[timedOut ? "timedOut" : "finalized"]} orientation={narrow ? "vertical" : "horizontal"} />
        </Section>
        <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "minmax(0, 1.5fr) minmax(0, 1fr)", gap: narrow ? 28 : 40, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <ProofBlock title="Freeze" verdict="verified" summary="Eligibility snapshot taken before the randomness request.">
              <EvidenceRow label="Freeze block" value="5 812 004" kind="plain" verified />
              <EvidenceRow label="Snapshot commitment" value="0x63d1a70cf4e829bb51" kind="handle" verified note="Commitment reference — not a balance." />
              <EvidenceRow label="Eligible slots" value="11 of 16" kind="plain" verified />
            </ProofBlock>
            <ProofBlock title="Randomness" verdict={timedOut ? "failed" : "verified"} verdictLabel={timedOut ? "Not fulfilled" : undefined} summary="Chainlink VRF request bound to this epoch.">
              <EvidenceRow label="Request id" value="0x9f2c41a8b7e5d0c3" verified={!timedOut} />
              <EvidenceRow label="Requested in" value="0x18ba90c4de7712fa03" href="#" verified={!timedOut} />
              {timedOut
                ? <EvidenceRow label="Fulfilment" value="No callback before deadline" kind="plain" />
                : <><EvidenceRow label="Fulfilment tx" value="0x41ba7730c92f18ee0a4b" href="#" verified />
                  <EvidenceRow label="Stored random word" value="0xb70e…41c9" kind="handle" verified /></>}
            </ProofBlock>
            {!timedOut ? <>
              <ProofBlock title="Encrypted draw" verdict="verified" summary="A separate transaction selects the winner over encrypted weights." defaultOpen={!narrow}>
                <EvidenceRow label="Draw tx" value="0x77a1cd0e4b8830fa19" href="#" verified />
                <EvidenceRow label="Winner handle" value="0x7ab34e91c05f" kind="handle" verified note="Ciphertext reference — not an amount." />
                <EvidenceRow label="Weights source" value="Frozen snapshot, unchanged since the request" kind="plain" verified />
              </ProofBlock>
              <ProofBlock title="Winner proof and finality" verdict="verified" summary="Authenticated public decryption of the winner address only."
                footnote="Balances and odds stay hidden. Anyone can inspect the randomness and authenticated execution trail, but cannot recompute the weighted result from plaintext balances."
                defaultOpen={!narrow}>
                <EvidenceRow label="KMS proof" value="0xd41c90aa7b6e5528" verified />
                <EvidenceRow label="Binds" value="Epoch · request id · winner handle · state · address" kind="plain" verified />
                <EvidenceRow label="Finality delay" value="96 blocks after reveal" kind="plain" verified />
                <EvidenceRow label="Winner address" value="0x8f21c4b70a5519d3ff9a4004c7" kind="address" href="#" verified />
              </ProofBlock>
            </> : null}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <Section label="Slots at freeze" title={timedOut ? "No slot drawn" : "Drawn slot 11"} gap={14}>
              <SlotGrid slots={slots} size="lg" legend />
            </Section>
            <PrivacyCallout compact title="Boundary" limitation={null} />
          </div>
        </div>
      </div>
    );
  }

  function DrawsVerify({ narrow }) {
    const { Tabs, EpochTimeline, ProgressTrack, StatusPill, EpochNodeLegend } = V();
    const [tab, setTab] = React.useState("current");
    const [open, setOpen] = React.useState(null);
    if (open) return <EpochDetail id={open} onBack={() => setOpen(null)} narrow={narrow} />;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <Tabs items={[{ id: "current", label: "Current draw" }, { id: "history", label: "History", count: 41 }]} value={tab} onChange={setTab} />
        {tab === "current" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
            <Section label={`Epoch ${window.VS_MOCK.epoch.id}`} title="Randomness requested" description="Weights were frozen before the request and cannot change. The draw runs over encrypted weights once the random word is stored.">
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <StatusPill tone="pending" pulse>Awaiting Chainlink fulfilment</StatusPill>
                <span className="vs-mono-sm" style={{ color: "var(--text-faint)" }}>REQ 0x9f2c41a8b7e5d0c3</span>
              </div>
              <ProgressTrack value={window.VS_MOCK.epoch.elapsed} tone="private" label="Epoch elapsed" />
              <EpochTimeline steps={window.VS_MOCK.epochSteps.vrfRequested} orientation={narrow ? "vertical" : "horizontal"} />
              <EpochNodeLegend />
            </Section>
          </div>
        ) : (
          <Section label="Public record" title="All draws" description="Every epoch keeps its evidence. Winner addresses are public; prize amounts are not.">
            <ul>{VS_EPOCHS.map((e) => <EpochRow key={e.id} e={e} onOpen={setOpen} />)}</ul>
          </Section>
        )}
      </div>
    );
  }

  Object.assign(window, { DrawsVerify, EpochDetail });
})();
