import type { ReactNode, CSSProperties } from "react";

export type ButtonTone = "primary" | "secondary" | "ghost" | "reveal" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

/**
 * Command control. `reveal` is reserved for confidential-value actions and never used for
 * ordinary navigation or submits.
 */
export interface ButtonProps {
  children?: ReactNode;
  tone?: ButtonTone;
  size?: ButtonSize;
  /** Lucide icon name rendered before the label. */
  icon?: string;
  iconAfter?: string;
  block?: boolean;
  /** Awaiting wallet or chain — disables and sets aria-busy. */
  busy?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
  style?: CSSProperties;
}
export declare function Button(props: ButtonProps): JSX.Element;
