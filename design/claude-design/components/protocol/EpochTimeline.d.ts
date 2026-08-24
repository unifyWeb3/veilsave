import type { ReactNode, CSSProperties } from "react";

export type NodeState = "done" | "active" | "waiting" | "future" | "failed" | "terminal";
export interface EpochStep {
  id?: string;
  label: string;
  state: NodeState;
  /** Machine metadata — block, tx reference, timestamp. Rendered in mono. */
  meta?: string;
  /** Prose. Only rendered for active, waiting and failed nodes. */
  detail?: string;
}

/**
 * The public epoch lifecycle in protocol order: OPEN, FROZEN, VRF requested, VRF fulfilled,
 * draw executed, reveal pending, finality delay, winner finalized.
 * @startingPoint section="Protocol" subtitle="Epoch lifecycle in protocol order" viewport="700x200"
 */
export interface EpochTimelineProps {
  steps: EpochStep[];
  /** Horizontal on desktop; switch to vertical below 768px. */
  orientation?: "horizontal" | "vertical";
  style?: CSSProperties;
}
export declare const VS_NODE: Record<NodeState, { color: string; ring: string; icon: string; label: string }>;
export declare function EpochTimeline(props: EpochTimelineProps): JSX.Element;
export declare function EpochNodeLegend(props: { style?: CSSProperties }): JSX.Element;
