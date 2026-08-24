import type { ReactNode, CSSProperties } from "react";

/** Section opener — eyebrow, title, description, trailing controls, hairline. Sections are ruled, not carded. */
export interface SectionHeadProps {
  label?: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
  rule?: boolean;
  style?: CSSProperties;
}
export declare function SectionHead(props: SectionHeadProps): JSX.Element;
