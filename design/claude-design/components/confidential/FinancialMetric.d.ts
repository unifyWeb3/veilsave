import type { ReactNode, CSSProperties } from "react";

import type { ConfidentialState } from "./ConfidentialValue";

/** A labelled confidential figure with context — the unit of the dashboard position block. */
export interface FinancialMetricProps {
  label: string;
  /** Short explanation shown on the label's help glyph. */
  hint?: string;
  state?: ConfidentialState;
  value?: string;
  unit?: string;
  size?: "row" | "md" | "lg" | "xl";
  footnote?: string;
  footnoteTone?: "muted" | "private" | "verified" | "pending" | "critical";
  align?: "start" | "end";
  onReveal?: () => void;
  onHide?: () => void;
  onRetry?: () => void;
  style?: CSSProperties;
}
export declare function FinancialMetric(props: FinancialMetricProps): JSX.Element;
