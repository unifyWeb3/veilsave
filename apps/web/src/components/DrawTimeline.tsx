import { EvidenceRow, Icon, ProofBlock, StatusPill, shortenMiddle } from "../design/Primitives";
import { EpochStatus, epochStatusLabels } from "../protocol/types";
import type { EpochEvidence } from "../protocol/useEpochEvidence";
import type { EpochSnapshot } from "../protocol/useProtocolSnapshot";

const ZERO_BYTES32 = `0x${"0".repeat(64)}`;

interface TimelineStep {
  label: string;
  reached: boolean;
  active: boolean;
  terminal?: boolean;
  meta?: string;
  detail?: string;
}

function timeline(epoch: EpochSnapshot): TimelineStep[] {
  const status = epoch.status;
  const abandoned = status === EpochStatus.Abandoned;
  const opened = epoch.openedAt !== 0n;
  const frozen = epoch.frozenAt !== 0n || epoch.snapshotCommitment !== ZERO_BYTES32;
  const requested = epoch.requestId !== 0n;
  const fulfilled = epoch.vrfFulfilled || epoch.fulfilledAt !== 0n;
  const drawn = epoch.encryptedWinner !== ZERO_BYTES32;
  const terminal = status === EpochStatus.Terminal || abandoned;
  const noWinner =
    terminal &&
    (!epoch.winnerFinalized ||
      epoch.finalizedWinner === "0x0000000000000000000000000000000000000000");
  return [
    {
      label: "Open",
      reached: opened,
      active: status === EpochStatus.Open,
      meta: opened ? dateTime(epoch.openedAt) : undefined,
      detail:
        status === EpochStatus.Open
          ? "Deposits made now mature after one complete epoch."
          : undefined,
    },
    {
      label: "Eligibility frozen",
      reached: frozen,
      active: status === EpochStatus.Frozen,
      meta: frozen && epoch.frozenSlotCount ? `${epoch.frozenSlotCount} frozen slots` : undefined,
      detail:
        status === EpochStatus.Frozen
          ? "Frozen weights cannot change. Randomness may now be requested permissionlessly."
          : undefined,
    },
    {
      label: "Randomness requested",
      reached: requested,
      active: status === EpochStatus.RandomnessRequested,
      meta: requested ? `REQ ${shortenMiddle(epoch.requestId.toString(), 8, 5)}` : undefined,
      detail:
        status === EpochStatus.RandomnessRequested
          ? "Chainlink VRF holds the request. The callback stores the random word only."
          : undefined,
    },
    {
      label: "Randomness fulfilled",
      reached: fulfilled,
      active: status === EpochStatus.DrawReady,
      meta: fulfilled ? "WORD STORED" : undefined,
      detail:
        status === EpochStatus.DrawReady
          ? "The random word is stored. The separate encrypted draw transaction is ready."
          : undefined,
    },
    {
      label: "Encrypted draw",
      reached: drawn,
      active: status === EpochStatus.RevealPending,
      meta: drawn ? (noWinner ? "OUTCOME HANDLE" : "WINNER HANDLE") : undefined,
      detail:
        status === EpochStatus.RevealPending
          ? "The weighted result was selected over encrypted weights. Winner proof and finality are pending."
          : undefined,
    },
    {
      label: noWinner ? "Terminal" : "Winner finalized",
      reached: terminal,
      active: terminal,
      terminal: abandoned || noWinner,
      meta:
        epoch.winnerFinalized &&
        epoch.finalizedWinner !== "0x0000000000000000000000000000000000000000"
          ? shortenMiddle(epoch.finalizedWinner, 8, 6)
          : terminal
            ? "TERMINAL · NO REROLL"
            : undefined,
      detail: terminal
        ? noWinner
          ? "This epoch ended without a winner. It cannot be rerolled."
          : "The winner is final for this epoch and cannot be changed."
        : undefined,
    },
  ];
}

export function DrawTimeline({
  epoch,
  compact = false,
  evidence,
  evidencePending = false,
  evidenceError = false,
  explorerUrl,
}: {
  epoch: EpochSnapshot;
  compact?: boolean;
  evidence?: EpochEvidence;
  evidencePending?: boolean;
  evidenceError?: boolean;
  explorerUrl?: string;
}) {
  const steps = timeline(epoch);
  const terminal = epoch.status === EpochStatus.Terminal || epoch.status === EpochStatus.Abandoned;
  const abandoned = epoch.status === EpochStatus.Abandoned;
  const frozen = epoch.frozenAt !== 0n || epoch.snapshotCommitment !== ZERO_BYTES32;
  const requested = epoch.requestId !== 0n;
  const fulfilled = epoch.vrfFulfilled || epoch.fulfilledAt !== 0n;
  const drawn = epoch.encryptedWinner !== ZERO_BYTES32;
  const winnerReady =
    epoch.winnerFinalized && epoch.finalizedWinner !== "0x0000000000000000000000000000000000000000";
  const noWinner = terminal && !winnerReady;
  const finalityDone = winnerReady || noWinner;
  const finalityTx = evidence?.winnerTx ?? (noWinner ? evidence?.noWinnerTx : undefined);
  const txHref = (hash?: `0x${string}`) =>
    hash && explorerUrl ? `${explorerUrl}/tx/${hash}` : undefined;
  const proofVerdict = (
    reached: boolean,
    hash: `0x${string}` | undefined,
    failed = false,
  ): "verified" | "pending" | "failed" | "none" =>
    failed ? "failed" : !reached ? "none" : hash ? "verified" : "pending";
  return (
    <section className="vs-panel vs-draw-panel" aria-labelledby="draw-status-title">
      <div className="vs-panel-heading">
        <div>
          <div className="vs-label">Public lifecycle</div>
          <h3 id="draw-status-title">Epoch {epoch.id.toString()}</h3>
        </div>
        <StatusPill
          tone={
            epoch.status === EpochStatus.Abandoned ? "terminal" : terminal ? "verified" : "private"
          }
          pulse={!terminal && epoch.status !== EpochStatus.Open}
        >
          {epochStatusLabels[epoch.status]}
        </StatusPill>
      </div>
      <div className="vs-panel-body">
        <ol className="vs-epoch-timeline">
          {steps.map((step) => (
            <li
              key={step.label}
              className={`vs-epoch-step${step.reached ? " vs-epoch-step--done" : ""}${step.active ? " vs-epoch-step--active" : ""}${step.terminal ? " vs-epoch-step--terminal" : ""}`}
            >
              <span className="vs-epoch-node">
                <Icon
                  name={step.terminal ? "ban" : step.reached ? "check" : "circle-dot"}
                  size={13}
                  strokeWidth={2}
                />
              </span>
              <div className="vs-epoch-copy">
                <strong>{step.label}</strong>
                {step.meta ? <span>{step.meta}</span> : null}
                {step.detail ? <p>{step.detail}</p> : null}
              </div>
            </li>
          ))}
        </ol>
        {!compact ? (
          <div className="vs-proof-stack">
            <ProofBlock
              title="Freeze"
              verdict={proofVerdict(frozen, evidence?.freezeTx)}
              summary="Eligibility snapshot taken before the randomness request."
            >
              <EvidenceRow
                label="Freeze transaction"
                value={
                  evidence?.freezeTx
                    ? shortenMiddle(evidence.freezeTx, 12, 8)
                    : frozen
                      ? "Awaiting event evidence"
                      : "Not frozen"
                }
                href={txHref(evidence?.freezeTx)}
                verified={Boolean(evidence?.freezeTx)}
              />
              <EvidenceRow
                label="Snapshot commitment"
                kind="handle"
                value={frozen ? shortenMiddle(epoch.snapshotCommitment, 12, 8) : "Awaiting freeze"}
                verified={frozen}
                note="Commitment reference — not a balance."
              />
              <EvidenceRow
                label="Eligible slots"
                value={frozen ? `${epoch.frozenSlotCount} of 16` : "Not frozen"}
                verified={frozen}
              />
            </ProofBlock>
            <ProofBlock
              title="Randomness"
              verdict={proofVerdict(
                fulfilled,
                evidence?.vrfFulfillmentTx,
                abandoned && requested && !fulfilled,
              )}
              verdictLabel={abandoned && requested && !fulfilled ? "Not fulfilled" : undefined}
              summary="Chainlink VRF request bound to this epoch."
            >
              <EvidenceRow
                label="Request id"
                value={requested ? epoch.requestId.toString() : "Not requested"}
                verified={requested}
              />
              <EvidenceRow
                label="Request transaction"
                value={
                  evidence?.requestTx
                    ? shortenMiddle(evidence.requestTx, 12, 8)
                    : requested
                      ? "Awaiting event evidence"
                      : "Not requested"
                }
                href={txHref(evidence?.requestTx)}
                verified={Boolean(evidence?.requestTx)}
              />
              <EvidenceRow
                label="Fulfillment transaction"
                value={
                  evidence?.vrfFulfillmentTx
                    ? shortenMiddle(evidence.vrfFulfillmentTx, 12, 8)
                    : fulfilled
                      ? "Awaiting event evidence"
                      : abandoned && requested
                        ? "No callback before deadline"
                        : "Awaiting fulfillment"
                }
                href={txHref(evidence?.vrfFulfillmentTx)}
                verified={Boolean(evidence?.vrfFulfillmentTx)}
              />
              {fulfilled ? (
                <EvidenceRow
                  label="Stored random word"
                  value={shortenMiddle(epoch.randomWord.toString(), 12, 8)}
                  kind="handle"
                  verified
                  note="Public VRF output; it does not reveal encrypted weights."
                />
              ) : null}
              {evidence?.syncTx ? (
                <EvidenceRow
                  label="Randomness sync"
                  value={shortenMiddle(evidence.syncTx, 12, 8)}
                  href={txHref(evidence.syncTx)}
                  verified
                />
              ) : null}
            </ProofBlock>
            <ProofBlock
              title="Encrypted draw"
              verdict={proofVerdict(drawn, evidence?.drawTx)}
              summary="A separate transaction selects the winner over encrypted weights."
              defaultOpen={!compact}
            >
              <EvidenceRow
                label="Draw transaction"
                value={
                  evidence?.drawTx
                    ? shortenMiddle(evidence.drawTx, 12, 8)
                    : drawn
                      ? "Awaiting event evidence"
                      : "Draw not executed"
                }
                href={txHref(evidence?.drawTx)}
                verified={Boolean(evidence?.drawTx)}
              />
              <EvidenceRow
                label={noWinner ? "Outcome handle" : "Winner handle"}
                value={drawn ? shortenMiddle(epoch.encryptedWinner, 12, 8) : "Draw not executed"}
                kind="handle"
                verified={drawn}
                note={
                  noWinner
                    ? "Draw-output reference — decrypts to the zero address: no winner."
                    : "Ciphertext reference — not an amount."
                }
              />
              <EvidenceRow
                label="Weights source"
                value={
                  drawn ? "Frozen snapshot, unchanged since the request" : "Pending frozen snapshot"
                }
                verified={drawn}
              />
            </ProofBlock>
            <ProofBlock
              title={noWinner ? "Outcome proof and finality" : "Winner proof and finality"}
              verdict={proofVerdict(
                finalityDone,
                finalityTx,
                abandoned || (terminal && !finalityDone),
              )}
              verdictLabel={abandoned || (terminal && !finalityDone) ? "Terminal" : undefined}
              summary={
                noWinner
                  ? "Authenticated public decryption of the draw outcome (the zero address — no winner)."
                  : "Authenticated public decryption of the winner address only."
              }
              footnote="Balances and odds remain hidden. The public can verify the randomness and authenticated execution trail, but cannot independently recompute the weighted result from plaintext balances."
              defaultOpen={!compact}
            >
              <EvidenceRow
                label={noWinner ? "No-winner finalization" : "Winner finalization"}
                value={
                  finalityTx
                    ? shortenMiddle(finalityTx, 12, 8)
                    : winnerReady
                      ? "Awaiting event evidence"
                      : abandoned || noWinner
                        ? "No winner · terminal"
                        : "Awaiting proof and finality"
                }
                href={txHref(finalityTx)}
                verified={Boolean(finalityTx)}
              />
              <EvidenceRow
                label="Binds"
                value={
                  noWinner
                    ? "Epoch · request id · outcome handle · state · address"
                    : "Epoch · request id · winner handle · state · address"
                }
                verified={finalityDone}
              />
              <EvidenceRow
                label="ACL availability"
                value={
                  drawn ? `After block ${epoch.aclGrantNotBeforeBlock.toString()}` : "Not available"
                }
                verified={winnerReady}
              />
              <EvidenceRow
                label={noWinner ? "Outcome" : "Winner address"}
                value={
                  winnerReady
                    ? shortenMiddle(epoch.finalizedWinner, 10, 8)
                    : abandoned || noWinner
                      ? "No winner · terminal"
                      : "Awaiting proof and finality"
                }
                kind="address"
                verified={winnerReady}
              />
              {evidence?.terminalTx ? (
                <EvidenceRow
                  label="Terminal transaction"
                  value={shortenMiddle(evidence.terminalTx, 12, 8)}
                  href={txHref(evidence.terminalTx)}
                  verified
                />
              ) : null}
            </ProofBlock>
            {evidencePending ? (
              <p className="vs-evidence-status">
                Transaction references are being refreshed from Sepolia. Canonical state remains
                authoritative.
              </p>
            ) : null}
            {evidenceError ? (
              <p className="vs-evidence-status vs-evidence-status--error">
                The RPC did not return event-linked references. Retry to restore explorer links; no
                private values are exposed.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function dateTime(value: bigint): string {
  if (value === 0n) return "Not set";
  if (value > BigInt(Math.floor(Number.MAX_SAFE_INTEGER / 1000))) return "Timestamp unavailable";
  return new Date(Number(value) * 1000).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}
