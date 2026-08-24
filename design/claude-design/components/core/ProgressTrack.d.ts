import type { ReactNode, CSSProperties } from "react";

/** Progress rail. `indeterminate` runs the SCAN pattern — VeilSave has no rotating spinners. */
export interface ProgressTrackProps {
  /** 0–100. Ignored when indeterminate. */
  value?: number;
  tone?: "private" | "verified" | "pending" | "neutral";
  indeterminate?: boolean;
  height?: number;
  label?: string;
  style?: CSSProperties;
}
export declare function ProgressTrack(props: ProgressTrackProps): JSX.Element;
