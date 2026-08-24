import type { ReactNode, CSSProperties } from "react";

export type BadgeTone = "neutral" | "private" | "verified" | "pending" | "critical";

/** Static identity metadata (network, epoch, slot). For live protocol status use StatusPill. */
export interface BadgeProps {
  children?: ReactNode;
  tone?: BadgeTone;
  icon?: string;
  /** Set for machine values — renders IBM Plex Mono. */
  mono?: boolean;
  style?: CSSProperties;
}
export declare function Badge(props: BadgeProps): JSX.Element;
