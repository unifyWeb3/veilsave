import type { ReactNode, CSSProperties } from "react";

/**
 * Centred dialog on desktop, bottom sheet below 768px. Deposit and withdrawal flows live here.
 * @startingPoint section="Flows" subtitle="Dialog on desktop, bottom sheet on mobile" viewport="700x420"
 */
export interface SheetProps {
  open: boolean;
  title: string;
  eyebrow?: string;
  onClose?: () => void;
  children?: ReactNode;
  footer?: ReactNode;
  width?: number;
  /** Full-height sheet on mobile — used for multi-step flows. */
  fullHeight?: boolean;
}
export declare function Sheet(props: SheetProps): JSX.Element | null;
export declare function useIsNarrow(query?: string): boolean;
