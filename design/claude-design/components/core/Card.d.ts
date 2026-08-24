import type { ReactNode, CSSProperties } from "react";

export type CardTone = "base" | "inset" | "quiet" | "private" | "verified";

/** Frame for a repeated record, dialog body or framed tool. Never a page section, never nested. */
export interface CardProps {
  children?: ReactNode;
  tone?: CardTone;
  pad?: number;
  interactive?: boolean;
  as?: keyof JSX.IntrinsicElements;
  style?: CSSProperties;
}
export declare function Card(props: CardProps): JSX.Element;
