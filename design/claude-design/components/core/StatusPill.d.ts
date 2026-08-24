import type { ReactNode, CSSProperties } from "react";

export type StatusTone = "neutral" | "private" | "verified" | "pending" | "critical" | "terminal";

/**
 * Live protocol status with three redundant cues: colour, glyph and word.
 * @startingPoint section="Protocol" subtitle="Status vocabulary for every protocol state" viewport="700x150"
 */
export interface StatusPillProps {
  children?: ReactNode;
  tone?: StatusTone;
  /** Override the tone's default glyph. */
  icon?: string;
  /** Waiting on an external dependency (VRF, KMS, ACL) — breathes instead of spinning. */
  pulse?: boolean;
  style?: CSSProperties;
}
export declare function StatusPill(props: StatusPillProps): JSX.Element;
