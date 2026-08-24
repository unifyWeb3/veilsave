import type { ReactNode, CSSProperties } from "react";

export type ResultVariant = "winner" | "nonWinner" | "zeroWinner" | "pending" | "unavailable";

/**
 * The epoch outcome for the connected wallet. Winner is the only display-scale use of teal.
 * @startingPoint section="Protocol" subtitle="Winner, non-winner and terminal outcomes" viewport="700x260"
 */
export interface ResultStateProps {
  variant?: ResultVariant;
  epoch?: string | number;
  /** Public winner address, only after finalization. */
  address?: string;
  /** Reveal or claim controls. */
  children?: ReactNode;
  style?: CSSProperties;
}
export declare function ResultState(props: ResultStateProps): JSX.Element;
