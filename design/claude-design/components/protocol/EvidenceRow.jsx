import React from "react";
import { Icon } from "../core/Icon.jsx";
import { IconButton } from "../core/IconButton.jsx";

function middleTruncate(v, head = 10, tail = 8) {
  if (!v || v.length <= head + tail + 1) return v;
  return v.slice(0, head) + "…" + v.slice(-tail);
}

/**
 * One piece of public evidence: what it is, its machine value, and how to check it.
 * Ciphertext handles are public metadata — labelled as references, never as amounts.
 */
export function EvidenceRow({
  label, value, kind = "hash", href, verified = false, note, truncate = true, onCopy, style,
}) {
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    if (navigator.clipboard && value) navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 1400);
    if (onCopy) onCopy(value);
  };
  const display = truncate && kind !== "plain" ? middleTruncate(String(value ?? "")) : value;
  return (
    <div
      style={{
        display: "grid", gridTemplateColumns: "minmax(120px, 200px) 1fr auto", alignItems: "center",
        gap: 14, padding: "11px 0", borderBottom: "1px solid var(--border-hairline)", minWidth: 0, ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
        {verified ? <Icon name="check" size={12} strokeWidth={2.2} style={{ color: "var(--teal-500)" }} label="Verified" /> : <span aria-hidden="true" style={{ width: 12 }} />}
        <span style={{ font: "var(--type-micro)", letterSpacing: "var(--tr-label)", textTransform: "uppercase", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
        <span
          className={kind === "plain" ? "vs-body-sm" : "vs-mono"}
          title={kind === "plain" ? undefined : String(value ?? "")}
          style={{ color: kind === "plain" ? "var(--text-primary)" : "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
        >
          {display}
          {kind !== "plain" ? <span className="vs-sr">{value}</span> : null}
        </span>
        {note ? <span style={{ font: "var(--type-micro)", color: "var(--text-faint)", letterSpacing: 0, textTransform: "none" }}>{note}</span> : null}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 2, flex: "none" }}>
        {kind !== "plain" && value ? <IconButton name={copied ? "check" : "copy"} size="sm" label={copied ? "Copied" : `Copy ${label}`} onClick={copy} /> : null}
        {href ? <IconButton name="external-link" size="sm" label={`Open ${label} in block explorer`} onClick={() => window.open(href, "_blank", "noopener")} /> : null}
      </div>
    </div>
  );
}
