import type { ReactNode, CSSProperties } from "react";

import type { OperationStep } from "./StatusStepper";
export type TicketState =
  | "queued" | "settlementRequested" | "ready" | "partial" | "claimable" | "claimed" | "retryable";

/**
 * The FIFO withdrawal ticket. One active ticket per slot; queue states read as progress.
 * @startingPoint section="Flows" subtitle="FIFO withdrawal ticket and settlement" viewport="700x320"
 */
export interface TicketPanelProps {
  state?: TicketState;
  position?: number;
  total?: number;
  requestedAt?: string;
  steps?: OperationStep[];
  onClaim?: () => void;
  onRetry?: () => void;
  children?: ReactNode;
  style?: CSSProperties;
}
export declare function TicketPanel(props: TicketPanelProps): JSX.Element;
