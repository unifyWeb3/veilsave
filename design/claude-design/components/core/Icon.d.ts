import type { ReactNode, CSSProperties } from "react";

export type IconName = string;

/** Lucide outline glyph, 24x24, 1.5px stroke. The only icon system in VeilSave. */
export interface IconProps {
  /** File name from assets/icons without extension, e.g. "shield-check". */
  name: IconName;
  size?: number;
  strokeWidth?: number;
  /** Accessible name. Omit for decorative glyphs (renders aria-hidden). */
  label?: string;
  style?: CSSProperties;
}
export declare const ICONS: Record<string, string>;
export declare function Icon(props: IconProps): JSX.Element | null;
