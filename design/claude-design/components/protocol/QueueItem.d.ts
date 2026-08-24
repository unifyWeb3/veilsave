import type { ReactNode, CSSProperties } from "react";

export type QueueState = "queued" | "settling" | "partial" | "claimable" | "claimed" | "retryable";

/** One row of the FIFO withdrawal queue. Position is public, amount is not. */
export interface QueueItemProps {
  position: number;
  total?: number;
  state?: QueueState;
  slot?: number;
  /** Request timestamp — FIFO order is fixed at request time. */
  requested?: string;
  mine?: boolean;
  trailing?: ReactNode;
  style?: CSSProperties;
}
export declare function QueueItem(props: QueueItemProps): JSX.Element;
