import type { ReactNode, CSSProperties } from "react";

/** The VeilSave lockup, type-set. No vector mark was supplied with the brand material. */
export interface WordmarkProps {
  size?: number;
  /** Render the small epoch glyph before the word. */
  mark?: boolean;
  tone?: "primary" | "muted";
  style?: CSSProperties;
}
export declare function Wordmark(props: WordmarkProps): JSX.Element;
