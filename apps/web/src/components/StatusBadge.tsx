import type { ReactNode } from "react";

export function StatusBadge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "positive" | "warning" | "danger" | "accent";
  children: ReactNode;
}) {
  return <span className={`status-badge status-badge--${tone}`}>{children}</span>;
}
