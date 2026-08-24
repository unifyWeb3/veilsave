import React from "react";

/** Section opener: eyebrow label, title, optional description and trailing controls, closed by a hairline. Sections are ruled, not carded. */
export function SectionHead({ label, title, description, actions, rule = true, style }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: rule ? 14 : 0, borderBottom: rule ? "1px solid var(--border-hairline)" : undefined, ...style }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
          {label ? <span className="vs-label">{label}</span> : null}
          {title ? <h2 className="vs-title-1" style={{ margin: 0 }}>{title}</h2> : null}
        </div>
        {actions ? <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{actions}</div> : null}
      </div>
      {description ? <p className="vs-body-sm" style={{ maxWidth: "var(--measure-prose)" }}>{description}</p> : null}
    </div>
  );
}
