import type { ReactNode, CSSProperties } from "react";

export type StateKind = "empty" | "waiting" | "loading" | "unavailable" | "offline" | "paused" | "terminal" | "failed";

/**
 * Empty, waiting, unavailable and terminal placeholder. States what happened, whether funds
 * are affected, and the one next action.
 * @startingPoint section="States" subtitle="Empty, waiting, unavailable, terminal" viewport="700x260"
 */
export interface StateBlockProps {
  kind?: StateKind;
  title: string;
  children?: ReactNode;
  /** Reassurance line, e.g. "Your principal is unaffected." Rendered with a shield glyph. */
  safety?: string;
  meta?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  compact?: boolean;
  style?: CSSProperties;
}
export declare function StateBlock(props: StateBlockProps): JSX.Element;
