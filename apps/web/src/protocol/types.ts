export enum SlotStatus {
  Free,
  Reserved,
  Active,
  Closing,
}

export enum EpochStatus {
  None,
  Open,
  Frozen,
  RandomnessRequested,
  DrawReady,
  RevealPending,
  Terminal,
  Abandoned,
}

export enum EpochOutcome {
  Unresolved,
  Winner,
  NoEligibleWeight,
  AbandonedTimeout,
}

export enum WithdrawalStatus {
  None,
  RoutingPending,
  Queued,
  PayoutStatusPending,
  ImmediateSettled,
  Claimed,
}

export enum SettlementStatus {
  None,
  AggregateDecryptPending,
  StrategyActionPending,
  RewrapPending,
  LiquidityReturnPending,
  FailedRetryable,
  Completed,
}

export const epochStatusLabels: Record<EpochStatus, string> = {
  [EpochStatus.None]: "Not opened",
  [EpochStatus.Open]: "Open",
  [EpochStatus.Frozen]: "Frozen",
  [EpochStatus.RandomnessRequested]: "VRF requested",
  [EpochStatus.DrawReady]: "Draw ready",
  [EpochStatus.RevealPending]: "Winner proof pending",
  [EpochStatus.Terminal]: "Finalized",
  [EpochStatus.Abandoned]: "Abandoned",
};

export const slotStatusLabels: Record<SlotStatus, string> = {
  [SlotStatus.Free]: "Available",
  [SlotStatus.Reserved]: "Reserved",
  [SlotStatus.Active]: "Saving",
  [SlotStatus.Closing]: "Closing",
};

export const withdrawalStatusLabels: Record<WithdrawalStatus, string> = {
  [WithdrawalStatus.None]: "Unknown",
  [WithdrawalStatus.RoutingPending]: "Determining route privately",
  [WithdrawalStatus.Queued]: "Queued",
  [WithdrawalStatus.PayoutStatusPending]: "Payout proof pending",
  [WithdrawalStatus.ImmediateSettled]: "Immediate withdrawal complete",
  [WithdrawalStatus.Claimed]: "Claimed",
};
