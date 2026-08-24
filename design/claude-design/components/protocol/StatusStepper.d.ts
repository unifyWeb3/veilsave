import type { ReactNode, CSSProperties } from "react";

export type OperationKind =
  | "draft" | "encrypting" | "wallet" | "submitted" | "confirming"
  | "dependency" | "fulfilled" | "retryable" | "terminal";
export interface OperationStep {
  id?: string;
  label: string;
  kind: OperationKind;
  status: "done" | "active" | "future" | "failed";
  meta?: string;
  /** Only shown while active or failed. */
  detail?: string;
  /** Recovery control, rendered under the active step. */
  action?: ReactNode;
}

/**
 * One operation's async progress: local encryption, wallet approval, chain confirmation,
 * external dependency, fulfilment.
 * @startingPoint section="Flows" subtitle="Async operation progress with recovery" viewport="700x300"
 */
export interface StatusStepperProps {
  steps: OperationStep[];
  style?: CSSProperties;
}
export declare function StatusStepper(props: StatusStepperProps): JSX.Element;
