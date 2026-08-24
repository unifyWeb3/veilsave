import type { ReactNode, CSSProperties } from "react";

export type ActivityKind = "deposit" | "withdrawRequest" | "claim" | "reveal" | "draw" | "prize" | "failed";

/** Privacy-safe activity row: what happened and when, never an amount. */
export interface ActivityItemProps {
  kind?: ActivityKind;
  title?: string;
  epoch?: string | number;
  time?: string;
  /** Transaction hash. Omit for local-only records. */
  hash?: string;
  status?: string;
  /** Marks a browser-local record that was never written to chain. */
  local?: boolean;
  style?: CSSProperties;
}
export declare function ActivityItem(props: ActivityItemProps): JSX.Element;
