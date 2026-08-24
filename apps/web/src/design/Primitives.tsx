import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  BadgeCheck,
  Ban,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleDot,
  CloudOff,
  Copy,
  Dices,
  Eye,
  EyeOff,
  ExternalLink,
  FileCheck,
  Grid2X2,
  Hash,
  Hourglass,
  Info,
  KeyRound,
  Layers,
  Lock,
  Menu,
  Pause,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  TriangleAlert,
  Vault,
  Wallet,
  WifiOff,
  X,
  type LucideIcon,
} from "lucide-react";

export type IconName =
  | "arrow-down-to-line"
  | "arrow-right"
  | "arrow-up-from-line"
  | "badge-check"
  | "ban"
  | "check"
  | "chevron-left"
  | "chevron-right"
  | "circle-alert"
  | "circle-check"
  | "circle-dot"
  | "cloud-off"
  | "copy"
  | "dices"
  | "eye"
  | "eye-off"
  | "external-link"
  | "file-check"
  | "grid-2x2"
  | "hash"
  | "hourglass"
  | "info"
  | "key-round"
  | "layers"
  | "lock"
  | "menu"
  | "pause"
  | "refresh-cw"
  | "scan-line"
  | "shield-check"
  | "triangle-alert"
  | "vault"
  | "wallet"
  | "wifi-off"
  | "x";

const iconMap: Record<IconName, LucideIcon> = {
  "arrow-down-to-line": ArrowDownToLine,
  "arrow-right": ArrowRight,
  "arrow-up-from-line": ArrowUpFromLine,
  "badge-check": BadgeCheck,
  ban: Ban,
  check: Check,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  "circle-alert": CircleAlert,
  "circle-check": CircleCheck,
  "circle-dot": CircleDot,
  "cloud-off": CloudOff,
  copy: Copy,
  dices: Dices,
  eye: Eye,
  "eye-off": EyeOff,
  "external-link": ExternalLink,
  "file-check": FileCheck,
  "grid-2x2": Grid2X2,
  hash: Hash,
  hourglass: Hourglass,
  info: Info,
  "key-round": KeyRound,
  layers: Layers,
  lock: Lock,
  menu: Menu,
  pause: Pause,
  "refresh-cw": RefreshCw,
  "scan-line": ScanLine,
  "shield-check": ShieldCheck,
  "triangle-alert": TriangleAlert,
  vault: Vault,
  wallet: Wallet,
  "wifi-off": WifiOff,
  x: X,
};

export function Icon({ name, size = 16, strokeWidth = 1.6, label, style }: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  label?: string;
  style?: CSSProperties;
}) {
  const Glyph = iconMap[name];
  return <Glyph size={size} strokeWidth={strokeWidth} aria-hidden={label ? undefined : true} aria-label={label} style={style} />;
}

export function Wordmark({ size = 18, mark = false, tone = "primary", style }: {
  size?: number;
  mark?: boolean;
  tone?: "primary" | "muted";
  style?: CSSProperties;
}) {
  return (
    <span className="vs-wordmark" style={{ fontSize: size, color: tone === "muted" ? "var(--text-secondary)" : "var(--text-primary)", ...style }}>
      {mark ? <span className="vs-wordmark-mark" aria-hidden="true"><span /></span> : null}
      <span><span className="vs-wordmark-veil">veil</span>Save</span>
    </span>
  );
}

export function Button({
  children, tone = "primary", size = "md", icon, iconAfter, block = false, busy = false, disabled = false, type = "button", onClick, style,
}: {
  children: ReactNode;
  tone?: "primary" | "secondary" | "ghost" | "reveal" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: IconName;
  iconAfter?: IconName;
  block?: boolean;
  busy?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
  style?: CSSProperties;
}) {
  return (
    <button
      type={type}
      className={`vs-button vs-button--${tone} vs-button--${size}`}
      style={{ width: block ? "100%" : undefined, ...style }}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      onClick={onClick}
    >
      {busy ? <Icon name="scan-line" size={size === "sm" ? 13 : 15} /> : icon ? <Icon name={icon} size={size === "sm" ? 13 : 15} /> : null}
      <span>{busy ? "Working…" : children}</span>
      {!busy && iconAfter ? <Icon name={iconAfter} size={size === "sm" ? 13 : 15} /> : null}
    </button>
  );
}

export function StatusPill({ children, tone = "neutral", icon, pulse = false, style }: {
  children: ReactNode;
  tone?: "neutral" | "private" | "verified" | "pending" | "critical" | "terminal";
  icon?: IconName;
  pulse?: boolean;
  style?: CSSProperties;
}) {
  const defaultIcon: Record<string, IconName> = { private: "lock", verified: "check", pending: "hourglass", critical: "circle-alert", terminal: "ban", neutral: "circle-dot" };
  return <span className={`vs-status vs-status--${tone}`} style={style}>{<span className={pulse ? "vs-status-pulse" : undefined}><Icon name={icon ?? defaultIcon[tone] ?? "circle-dot"} size={12} strokeWidth={1.9} /></span>}<span>{children}</span></span>;
}

export function Badge({ children, tone = "neutral", icon, mono = false, style }: {
  children: ReactNode;
  tone?: "neutral" | "private" | "verified" | "pending" | "critical";
  icon?: IconName;
  mono?: boolean;
  style?: CSSProperties;
}) {
  return <span className={`vs-badge vs-badge--${tone}${mono ? " vs-badge--mono" : ""}`} style={style}>{icon ? <Icon name={icon} size={12} /> : null}{children}</span>;
}

export function StrategyBadge({ mode = "test", withHint = true, style }: { mode?: "test" | "live"; withHint?: boolean; style?: CSSProperties }) {
  const isTest = mode === "test";
  return <span className="vs-strategy" style={style}><Badge tone={isTest ? "pending" : "verified"} icon={isTest ? "circle-dot" : "shield-check"}>{isTest ? "TEST YIELD" : "LIVE STRATEGY YIELD"}</Badge>{withHint ? <span className="vs-strategy-hint" title={isTest ? "Prizes in this release are funded by deterministic test-vault donations. No organic strategy return or APY." : "A validated strategy adapter is active."}>?</span> : null}</span>;
}

export function ProgressTrack({ value, tone = "private", indeterminate = false, label, style }: { value?: number; tone?: "private" | "verified" | "pending" | "neutral"; indeterminate?: boolean; label?: string; style?: CSSProperties }) {
  return <div className={`vs-progress vs-progress--${tone}`} role={indeterminate ? "status" : "progressbar"} aria-label={label} aria-valuenow={indeterminate ? undefined : value} aria-valuemin={indeterminate ? undefined : 0} aria-valuemax={indeterminate ? undefined : 100} style={style}><span className={indeterminate ? "vs-progress-indeterminate" : undefined} style={!indeterminate ? { width: `${Math.max(0, Math.min(100, value ?? 0))}%` } : undefined} /></div>;
}

export function SectionHead({ label, title, description, actions, rule = true, style }: { label?: string; title: string; description?: string; actions?: ReactNode; rule?: boolean; style?: CSSProperties }) {
  return <div className={`vs-section-head${rule ? " vs-section-head--rule" : ""}`} style={style}><div><div className="vs-label">{label}</div><h2>{title}</h2>{description ? <p>{description}</p> : null}</div>{actions ? <div className="vs-section-actions">{actions}</div> : null}</div>;
}

export function PrivacyCallout({ title = "What stays private, what stays public", compact = false, limitation = "Balances and odds stay hidden. Anyone can inspect the randomness and authenticated execution trail, but cannot recompute the weighted result from plaintext balances.", privateItems = ["Savings amount", "Eligible and pending weight", "Withdrawal amount", "Prize amount"], publicItems = ["Wallet address and transactions", "Epoch timing and occupied slots", "VRF and draw evidence", "Winner address after finalization", "Aggregate strategy settlement"], style }: { title?: string; compact?: boolean; limitation?: string | null; privateItems?: string[]; publicItems?: string[]; style?: CSSProperties }) {
  const column = (heading: string, items: string[], tone: "private" | "public") => <div className="vs-privacy-column"><div className={`vs-label vs-label--${tone}`}><Icon name={tone === "private" ? "lock" : "eye"} size={12} />{heading}</div><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></div>;
  return <section className={`vs-privacy-callout${compact ? " vs-privacy-callout--compact" : ""}`} style={style}><h3>{title}</h3><div className="vs-privacy-columns">{column("Encrypted", privateItems, "private")}{column("Public", publicItems, "public")}</div>{limitation ? <p className="vs-privacy-limitation">{limitation}</p> : null}</section>;
}

export type SlotState = "empty" | "filled" | "mine" | "drawn";
export function SlotGrid({ slots, size = "md", caption, legend = false, style }: { slots: SlotState[]; size?: "sm" | "md" | "lg"; caption?: ReactNode; legend?: boolean; style?: CSSProperties }) {
  const normalized = Array.from({ length: 16 }, (_, index) => slots[index] ?? "empty");
  return <figure className={`vs-slot-figure vs-slot-figure--${size}`} style={style}><div className="vs-slot-grid" role="img" aria-label={`16 public slots; ${normalized.filter((slot) => slot !== "empty").length} occupied. Amounts remain encrypted.`}>{normalized.map((slot, index) => <span key={index} className={`vs-slot vs-slot--${slot}`} aria-hidden="true">{slot !== "empty" ? <span>••••</span> : null}</span>)}</div>{caption !== undefined ? <figcaption>{caption}</figcaption> : null}{legend ? <div className="vs-slot-legend"><span><i className="vs-slot-key vs-slot-key--mine" />Your slot</span><span><i className="vs-slot-key vs-slot-key--filled" />Occupied</span><span><i className="vs-slot-key vs-slot-key--drawn" />Drawn</span></div> : null}</figure>;
}

export function EvidenceRow({ label, value, kind = "plain", verified = false, href, note, onCopy, style }: { label: string; value: string; kind?: "hash" | "address" | "handle" | "plain"; verified?: boolean; href?: string; note?: string; onCopy?: () => void; style?: CSSProperties }) {
  return <div className="vs-evidence-row" style={style}><div className="vs-evidence-label">{verified ? <Icon name="check" size={12} strokeWidth={2} /> : null}{label}</div><div className={`vs-evidence-value vs-evidence-value--${kind}`}><span title={value}>{value}</span>{href ? <a href={href} target="_blank" rel="noreferrer" aria-label={`${label} on explorer`}><Icon name="chevron-right" size={13} /></a> : null}{onCopy ? <button type="button" aria-label={`Copy ${label}`} onClick={onCopy}><Icon name="copy" size={13} /></button> : null}</div>{note ? <div className="vs-evidence-note">{note}</div> : null}</div>;
}

export function ProofBlock({ title, verdict = "none", verdictLabel, summary, children, footnote, defaultOpen = false, style }: { title: string; verdict?: "verified" | "pending" | "failed" | "none"; verdictLabel?: string; summary: string; children?: ReactNode; footnote?: string; defaultOpen?: boolean; style?: CSSProperties }) {
  return <details className={`vs-proof vs-proof--${verdict}`} open={defaultOpen} style={style}><summary><span><strong>{title}</strong><span>{summary}</span></span><StatusPill tone={verdict === "verified" ? "verified" : verdict === "pending" ? "pending" : verdict === "failed" ? "critical" : "neutral"}>{verdictLabel ?? (verdict === "verified" ? "Verified" : verdict === "pending" ? "Pending" : verdict === "failed" ? "Failed" : "Unreviewed")}</StatusPill></summary><div className="vs-proof-body">{children}{footnote ? <p>{footnote}</p> : null}</div></details>;
}

export function StateBlock({ kind = "empty", title, children, safety, actionLabel, onAction, secondaryLabel, onSecondary, compact = false, style }: { kind?: "empty" | "waiting" | "loading" | "unavailable" | "offline" | "paused" | "terminal" | "failed"; title: string; children?: ReactNode; safety?: string; actionLabel?: string; onAction?: () => void; secondaryLabel?: string; onSecondary?: () => void; compact?: boolean; style?: CSSProperties }) {
  const map: Record<string, IconName> = { empty: "vault", waiting: "hourglass", loading: "scan-line", unavailable: "cloud-off", offline: "wifi-off", paused: "pause", terminal: "ban", failed: "circle-alert" };
  const tone = kind === "failed" || kind === "offline" ? "critical" : kind === "waiting" || kind === "paused" ? "pending" : kind === "loading" ? "private" : "neutral";
  return <section className={`vs-state-block vs-state-block--${tone}${compact ? " vs-state-block--compact" : ""}`} style={style}><span className="vs-state-icon"><Icon name={map[kind] ?? "info"} size={17} /></span><div><h3>{title}</h3>{children ? <p>{children}</p> : null}</div>{kind === "loading" ? <ProgressTrack indeterminate tone="private" label={title} /> : null}{safety ? <div className="vs-safety"><Icon name="shield-check" size={13} />{safety}</div> : null}<div className="vs-state-actions">{actionLabel ? <Button tone="secondary" size="sm" onClick={onAction}>{actionLabel}</Button> : null}{secondaryLabel ? <Button tone="ghost" size="sm" onClick={onSecondary}>{secondaryLabel}</Button> : null}</div></section>;
}

export function RecoveryBanner({ tone = "info", title, children, actionLabel, onAction, secondaryLabel, onSecondary, style }: { tone?: "info" | "network" | "paused" | "critical"; title: string; children: ReactNode; actionLabel?: string; onAction?: () => void; secondaryLabel?: string; onSecondary?: () => void; style?: CSSProperties }) {
  const icon: Record<string, IconName> = { info: "info", network: "triangle-alert", paused: "pause", critical: "circle-alert" };
  return <section className={`vs-recovery vs-recovery--${tone}`} role={tone === "critical" || tone === "network" ? "alert" : "status"} style={style}><Icon name={icon[tone] ?? "info"} size={17} /><div><strong>{title}</strong><p>{children}</p><div className="vs-recovery-actions">{actionLabel ? <Button tone="secondary" size="sm" onClick={onAction}>{actionLabel}</Button> : null}{secondaryLabel ? <Button tone="ghost" size="sm" onClick={onSecondary}>{secondaryLabel}</Button> : null}</div></div></section>;
}

export function AmountField({
  value,
  onChange,
  label = "Amount",
  unit = "cUSDT",
  max,
  onMax,
  error,
  helper,
  disabled = false,
  autoFocus = false,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  unit?: string;
  max?: string;
  onMax?: () => void;
  error?: string | null;
  helper?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  id?: string;
}) {
  const generatedId = useId();
  const inputId = id ?? `vs-amount-${generatedId.replace(/:/g, "")}`;
  const decimals = (value.split(".")[1] ?? "").length;
  const localError = error ?? (decimals > 6 ? "cUSDT supports six decimal places." : null);
  const [focused, setFocused] = useState(false);

  return (
    <div className="vs-amount-field">
      <div className="vs-amount-label-row">
        <label htmlFor={inputId} className="vs-label">{label}</label>
        {max ? <span className="vs-amount-max"><Icon name="lock" size={11} />Available {max}{onMax ? <button type="button" onClick={onMax}>Max</button> : null}</span> : null}
      </div>
      <div className={`vs-amount-input${focused ? " is-focused" : ""}${localError ? " has-error" : ""}${disabled ? " is-disabled" : ""}`}>
        <input
          id={inputId}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.000000"
          value={value}
          disabled={disabled}
          autoFocus={autoFocus}
          aria-invalid={localError ? true : undefined}
          aria-describedby={localError ? `${inputId}-error` : helper ? `${inputId}-help` : undefined}
          onChange={(event) => {
            const sanitized = event.target.value.replace(/[^0-9.]/g, "");
            const [whole = "", ...fractionParts] = sanitized.split(".");
            onChange(fractionParts.length ? `${whole}.${fractionParts.join("")}` : whole);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        <span>{unit}</span>
      </div>
      {localError ? <span id={`${inputId}-error`} className="vs-field-message vs-field-message--error" role="alert"><Icon name="circle-alert" size={13} />{localError}</span> : helper ? <span id={`${inputId}-help`} className="vs-field-message"><Icon name="lock" size={13} />{helper}</span> : null}
    </div>
  );
}

export interface StatusStep {
  label: string;
  status: "done" | "active" | "future" | "failed";
  meta?: string;
  detail?: string;
}

export function StatusStepper({ steps }: { steps: StatusStep[] }) {
  return (
    <ol className="vs-status-stepper">
      {steps.map((step) => (
        <li key={step.label} className={`vs-status-step vs-status-step--${step.status}`}>
          <span className="vs-status-step-node"><Icon name={step.status === "done" ? "check" : step.status === "failed" ? "circle-alert" : step.status === "active" ? "circle-dot" : "hourglass"} size={13} strokeWidth={2} /></span>
          <div><strong>{step.label}</strong>{step.meta ? <span>{step.meta}</span> : null}{step.detail ? <p>{step.detail}</p> : null}</div>
        </li>
      ))}
    </ol>
  );
}

export function ConsoleNav({ active, onNavigate, variant = "rail", items, secondary = [], footer }: { active: string; onNavigate: (id: string) => void; variant?: "rail" | "bottom"; items: Array<{ id: string; label: string; icon: IconName }>; secondary?: Array<{ id: string; label: string; icon: IconName }>; footer?: ReactNode }) {
  return <nav className={`vs-console-nav vs-console-nav--${variant}`} aria-label="Primary"><div className="vs-console-nav-brand"><Wordmark mark size={16} /></div><ul>{items.map((item) => <li key={item.id}><button type="button" aria-current={active === item.id ? "page" : undefined} className={active === item.id ? "is-active" : undefined} onClick={() => onNavigate(item.id)}><Icon name={item.icon} size={16} /><span>{item.label}</span></button></li>)}</ul>{secondary.length ? <ul className="vs-console-nav-secondary">{secondary.map((item) => <li key={item.id}><button type="button" aria-current={active === item.id ? "page" : undefined} className={active === item.id ? "is-active" : undefined} onClick={() => onNavigate(item.id)}><Icon name={item.icon} size={15} /><span>{item.label}</span></button></li>)}</ul> : null}<div className="vs-console-nav-footer">{footer}</div></nav>;
}

export function Sheet({ open, title, eyebrow, onClose, children, footer, width = 460, fullHeight = false }: { open: boolean; title: string; eyebrow?: string; onClose: () => void; children?: ReactNode; footer?: ReactNode; width?: number; fullHeight?: boolean }) {
  const titleId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = dialogRef.current;
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])') ?? []);
    focusable()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [onClose, open]);
  if (!open) return null;
  return <div className="vs-sheet-backdrop" role="presentation"><button className="vs-sheet-scrim" type="button" aria-label="Close dialog" onClick={onClose} /><section ref={dialogRef} className={`vs-sheet${fullHeight ? " vs-sheet--full" : ""}`} style={{ "--vs-sheet-width": `${width}px` } as CSSProperties} role="dialog" aria-modal="true" aria-labelledby={titleId}><header><div>{eyebrow ? <div className="vs-label">{eyebrow}</div> : null}<h2 id={titleId}>{title}</h2></div><button type="button" className="vs-icon-button" onClick={onClose} aria-label="Close"><Icon name="x" size={16} /></button></header><div className="vs-sheet-body">{children}</div>{footer ? <footer>{footer}</footer> : null}</section></div>;
}

export function formatSix(value: bigint): string {
  const whole = value / 1_000_000n;
  const fraction = (value % 1_000_000n).toString().padStart(6, "0");
  return `${whole.toLocaleString("en-US")}.${fraction}`;
}

export function shortenMiddle(value: string, start = 8, end = 6): string {
  if (value.length <= start + end + 1) return value;
  return `${value.slice(0, start)}…${value.slice(-end)}`;
}
