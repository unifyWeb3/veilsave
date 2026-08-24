import { Link, useNavigate } from "react-router-dom";

import { Badge, Button, EvidenceRow, Icon, PrivacyCallout, SlotGrid, StatusPill, StrategyBadge, Wordmark } from "../design/Primitives";
import { useDeployment } from "../providers/DeploymentProvider";
import { EpochStatus, SlotStatus, epochStatusLabels } from "../protocol/types";
import { useProtocolSnapshot } from "../protocol/useProtocolSnapshot";

const ZERO_BYTES32 = `0x${"0".repeat(64)}`;

export function LandingPage() {
  const navigate = useNavigate();
  const deployment = useDeployment();
  const snapshot = useProtocolSnapshot();
  const data = snapshot.data;
  const occupied = data?.slots.filter((slot) => slot.status !== SlotStatus.Free).length ?? 0;
  const slots = data?.slots.map((slot) => slot.status === SlotStatus.Free ? "empty" : data.epoch.winnerFinalized && slot.owner.toLowerCase() === data.epoch.finalizedWinner.toLowerCase() ? "drawn" : "filled") ?? Array.from({ length: 16 }, () => "empty" as const);
  const manifestReady = deployment.status === "ready";
  const strategyMode = deployment.manifest?.strategy.mode === "LIVE_STRATEGY" ? "live" : "test";
  const epochLabel = data ? epochStatusLabels[data.epoch.status] : deployment.status === "error" ? "Unavailable" : "Checking";

  return (
    <div className="landing">
      <header className="public-header"><Link to="/" aria-label="VeilSave home"><Wordmark size={19} /></Link><nav className="public-nav" aria-label="Public navigation"><a href="#how">How it works</a><a href="#draw">The draw</a><Link to="/privacy">Privacy</Link><a href="#faq">FAQ</a></nav><div className="public-actions"><Button iconAfter="arrow-right" onClick={() => navigate("/app")}>Open console</Button></div></header>

      <main>
        <section className="landing-hero vs-field">
          <div className="landing-hero-grid">
            <div>
              <StatusPill tone={deployment.status === "ready" ? "verified" : deployment.status === "error" ? "critical" : "pending"} pulse={deployment.status === "loading"}>{deployment.status === "ready" ? `Live on Sepolia · ${epochLabel}` : deployment.status === "error" ? "Sepolia deployment unavailable" : "Checking Sepolia deployment"}</StatusPill>
              <h1>Private money. <span>Public</span> fairness.</h1>
              <p>Save cUSDT in one of sixteen slots. Your balance, weight, withdrawal amount, and prize stay encrypted while the randomness and authenticated draw trail remain public.</p>
              <div className="landing-hero-actions"><Button size="lg" iconAfter="arrow-right" onClick={() => navigate("/app")}>Open the console</Button><Button tone="secondary" size="lg" icon="shield-check" onClick={() => navigate(data ? `/app/draws/${data.currentEpochId.toString()}` : "/app")}>See the evidence</Button></div>
              <div className="landing-note"><StrategyBadge mode={strategyMode} /><span><Icon name="circle-dot" size={12} /> {strategyMode === "live" ? "A validated public strategy adapter is active; individual balances remain encrypted." : "Prizes in this release are donation-funded. No APY or organic-yield claim."}</span></div>
            </div>

            <div className="vs-panel landing-field-panel">
              <div className="landing-field-header"><div><div className="vs-label">Pool {data ? `· epoch ${data.currentEpochId.toString()}` : "· Sepolia"}</div><strong>{occupied}<span className="muted"> / 16 slots</span></strong></div><Badge tone="private" icon="lock">Amounts encrypted</Badge></div>
              <SlotGrid slots={slots} size="lg" caption={null} />
              <div className="landing-boundary"><span style={{ color: "var(--text-private)" }}>Encrypted</span><hr /><span style={{ color: "var(--text-verified)" }}>Public</span></div>
              <div className="landing-evidence">
                <EvidenceRow label="Freeze commitment" kind="hash" value={data && data.epoch.snapshotCommitment !== ZERO_BYTES32 ? short(data.epoch.snapshotCommitment) : "Awaiting epoch freeze"} verified={Boolean(data && data.epoch.snapshotCommitment !== ZERO_BYTES32)} />
                <EvidenceRow label="VRF request" value={data && data.epoch.requestId !== 0n ? data.epoch.requestId.toString() : "Awaiting request"} verified={Boolean(data && data.epoch.requestId !== 0n)} />
                <EvidenceRow label="Winner finalization" kind="address" value={data?.epoch.winnerFinalized ? short(data.epoch.finalizedWinner) : data?.epoch.status === EpochStatus.Abandoned ? "Terminal · no reroll" : "Pending"} verified={Boolean(data?.epoch.winnerFinalized)} />
              </div>
            </div>
          </div>
        </section>

        <section className="landing-strip" aria-label="Public pool state"><div className="landing-strip-inner"><PublicFact label="Epoch" value={data ? data.currentEpochId.toString() : "—"} meta={epochLabel} /><PublicFact label="Eligibility closes" value={data?.epoch.closesAt ? formatDate(data.epoch.closesAt) : "—"} meta="UTC shown in console" /><PublicFact label="Slots taken" value={`${occupied} / 16`} meta={`${16 - occupied} open`} /><PublicFact label="Last terminal epoch" value={data ? data.lastTerminalEpochId.toString() : "—"} meta={manifestReady ? "canonical pool read" : "awaiting validation"} /></div></section>

        <section id="how" className="landing-band landing-band--deep"><h2>Save without publishing your amount.</h2><p>Reserve one public slot, encrypt a six-decimal cUSDT amount in your browser, and deposit. New savings mature after one complete epoch; principal remains withdrawable.</p><div className="landing-facts"><Fact icon="lock" title="Amounts stay sealed">Principal, eligible weight, pending weight, withdrawal claims, and prizes remain encrypted.</Fact><Fact icon="dices" title="One weekly winner">The winner is selected proportionally over sixteen encrypted eligible weights using stored Chainlink VRF randomness.</Fact><Fact icon="arrow-up-from-line" title="Principal first">Available confidential liquidity pays immediately; any private remainder enters strict request-time FIFO.</Fact></div></section>

        <section id="draw" className="landing-band"><h2>The draw is inspectable without exposing balances.</h2><p>Anyone can follow the epoch freeze, VRF request and fulfillment, separate FHE draw transaction, winner proof, finality delay, and public winner address.</p><div className="landing-facts"><Fact icon="file-check" title="Frozen inputs">The slot snapshot is committed before randomness is requested and cannot be edited afterward.</Fact><Fact icon="shield-check" title="Authenticated result">The public winner proof is bound to the epoch, request, encrypted handle, and frozen state.</Fact><Fact icon="key-round" title="Winner-only prize">Only the finalized winner receives permission to decrypt the prize amount locally.</Fact></div></section>

        <section id="privacy" className="landing-band landing-band--deep"><PrivacyCallout /></section>

        <section id="faq" className="landing-band"><h2>Clear boundaries, not privacy theatre.</h2><p>VeilSave provides confidential financial amounts, not anonymity. Wallet addresses, transactions, timing, slot occupancy, aggregate strategy settlements, and the finalized winner remain public.</p><div className="landing-hero-actions"><Button size="lg" iconAfter="arrow-right" onClick={() => navigate("/app")}>Open the console</Button><Button tone="secondary" size="lg" onClick={() => navigate("/privacy")}>Read the privacy boundary</Button></div></section>
      </main>

      <footer className="landing-footer"><Wordmark tone="muted" /> · Ethereum Sepolia · 16 fixed slots · {strategyMode === "live" ? "LIVE STRATEGY YIELD" : "TEST YIELD"}</footer>
    </div>
  );
}

function PublicFact({ label, value, meta }: { label: string; value: string; meta: string }) { return <div className="landing-strip-item"><div className="vs-label">{label}</div><strong>{value}</strong><span>{meta}</span></div>; }
function Fact({ icon, title, children }: { icon: "lock" | "dices" | "arrow-up-from-line" | "file-check" | "shield-check" | "key-round"; title: string; children: string }) { return <div className="landing-fact"><Icon name={icon} size={17} style={{ color: "var(--text-private)", marginBottom: 12 }} /><strong>{title}</strong><span>{children}</span></div>; }
function short(value: string): string { return `${value.slice(0, 10)}…${value.slice(-8)}`; }
function formatDate(value: bigint): string { return new Date(Number(value) * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
