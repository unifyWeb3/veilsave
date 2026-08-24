import type { ReactNode, CSSProperties } from "react";

export type ConfidentialState =
  | "masked" | "revealing" | "aclPending" | "revealed" | "stale" | "unavailable" | "error";

/**
 * The confidential-value primitive: one encrypted figure with its own independent reveal.
 * Redaction is always six marks — the length of a value is itself private.
 * @startingPoint section="Confidential" subtitle="Masked, revealing, revealed and failure states" viewport="700x260"
 */
export interface ConfidentialValueProps {
  state?: ConfidentialState;
  /** Formatted plaintext, only supplied for revealed/stale. */
  value?: string;
  unit?: string;
  size?: "row" | "md" | "lg" | "xl";
  label?: string;
  /** Overrides the state's default status line. */
  note?: string;
  hideActions?: boolean;
  onReveal?: () => void;
  onHide?: () => void;
  onRetry?: () => void;
  style?: CSSProperties;
}
export declare function ConfidentialValue(props: ConfidentialValueProps): JSX.Element;
