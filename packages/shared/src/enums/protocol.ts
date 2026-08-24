export const PARTICIPANT_CAPACITY = 16 as const;
export const SEPOLIA_CHAIN_ID = 11155111 as const;
export const EPOCH_DURATION_SECONDS = 7 * 24 * 60 * 60;
export const STRATEGY_TIMELOCK_SECONDS = 24 * 60 * 60;

export enum StrategyMode {
  TestYield = "TEST_YIELD",
  LiveStrategy = "LIVE_STRATEGY",
}

export enum DeploymentStatus {
  Unconfigured = "UNCONFIGURED",
  Rehearsal = "REHEARSAL",
  Active = "ACTIVE",
}
