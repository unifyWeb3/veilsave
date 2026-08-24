import type { ReactNode, CSSProperties } from "react";

/**
 * Six-decimal cUSDT entry. Rejects >6 decimals locally before encryption.
 * @startingPoint section="Flows" subtitle="Six-decimal cUSDT amount entry" viewport="700x220"
 */
export interface AmountFieldProps {
  value: string;
  onChange?: (next: string) => void;
  label?: string;
  unit?: string;
  /** Confidential available balance, already revealed by the user. Omit while masked. */
  max?: string;
  maxLabel?: string;
  onMax?: () => void;
  error?: string;
  helper?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  id?: string;
  style?: CSSProperties;
}
export declare function AmountField(props: AmountFieldProps): JSX.Element;
