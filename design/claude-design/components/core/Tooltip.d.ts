import type { ReactNode, CSSProperties } from "react";

/** Accessible explanation for unfamiliar protocol terms. Opens on hover, focus and tap. */
export interface TooltipProps {
  /** Trigger. Defaults to a question glyph. */
  children?: ReactNode;
  content: ReactNode;
  side?: "top" | "bottom";
  width?: number;
}
export declare function Tooltip(props: TooltipProps): JSX.Element;
