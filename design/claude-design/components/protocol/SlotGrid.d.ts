import type { ReactNode, CSSProperties } from "react";

export type SlotState = "empty" | "filled" | "mine" | "drawn";

/**
 * The 16 fixed public slots, 4x4. Occupancy is public; the amount in a slot is not.
 * @startingPoint section="Protocol" subtitle="Fixed 16-slot occupancy indicator" viewport="700x180"
 */
export interface SlotGridProps {
  /** Up to 16 entries; missing entries render as empty. */
  slots: SlotState[];
  size?: "sm" | "md" | "lg";
  /** Pass null to suppress the caption. */
  caption?: ReactNode;
  legend?: boolean;
  style?: CSSProperties;
}
export declare function SlotGrid(props: SlotGridProps): JSX.Element;
