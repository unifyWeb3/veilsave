import React from "react";

const vsCardTones = {
  base: { background: "var(--surface-raised)", border: "1px solid var(--border-hairline)" },
  inset: { background: "var(--surface-inset)", border: "1px solid var(--border-hairline)" },
  quiet: { background: "transparent", border: "1px solid var(--border-hairline)" },
  private: { background: "var(--wash-private)", border: "1px solid var(--border-private)" },
  verified: { background: "var(--wash-verified)", border: "1px solid var(--border-verified)" },
};

/** Frame for a repeated record, a dialog body, or a framed tool. Never wrap a whole page section, never nest. */
export function Card({ children, tone = "base", pad = 20, interactive = false, as = "div", style, ...rest }) {
  const Tag = as;
  const t = vsCardTones[tone] || vsCardTones.base;
  return (
    <Tag
      style={{
        borderRadius: "var(--r-lg)", padding: pad, boxShadow: "var(--sheen-top)",
        transition: interactive ? "background var(--dur-fast) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard)" : undefined,
        cursor: interactive ? "pointer" : undefined, ...t, ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
