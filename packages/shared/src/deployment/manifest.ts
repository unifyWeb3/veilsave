import type { DeploymentStatus, StrategyMode } from "../enums/protocol";

export type Hex = `0x${string}`;
export type Address = `0x${string}`;

export interface ContractDeployment {
  address: Address;
  deploymentTransaction: Hex;
  runtimeCodeHash: Hex;
  verifiedSourceUrl: string;
}

export interface VeilSaveDeploymentManifest {
  schemaVersion: 1;
  product: "VeilSave";
  releaseVersion: string;
  sourceCommit: string;
  status: DeploymentStatus;
  chainId: 11155111;
  deploymentBlock: number;
  contracts: {
    confidentialPrizePool: ContractDeployment;
    poolVrfAdapter: ContractDeployment;
    settlementController: ContractDeployment;
    deterministicTestYieldVault: ContractDeployment;
  };
  external: {
    confidentialToken: Address;
    underlyingToken: Address;
    confidentialWrapper: Address;
    acl: Address;
    fheExecutor: Address;
    kmsVerifier: Address;
    inputVerifier: Address;
    inputVerificationVerifier: Address;
    decryptionVerifier: Address;
    gatewayChainId: number;
    relayerUrl: string;
    vrfCoordinator: Address;
    vrfWrapper: Address;
  };
  asset: {
    symbol: "cUSDT";
    decimals: 6;
    wrapperRate: "1";
  };
  strategy: {
    address: Address;
    asset: Address;
    id: string;
    mode: StrategyMode;
    deploymentBlock: number;
  };
  vrf: {
    confirmations: number;
    callbackGasLimit: number;
    words: 1;
  };
  pool: {
    participantCapacity: 16;
    epochDurationSeconds: 604800;
    slotBondWei: "1000000000000000";
    winnerFinalityDelayBlocks: 96;
    strategyTimelockSeconds: 86400;
  };
  governance: {
    safe: Address;
    timelock: Address;
    guardian: Address;
    timelockOpenExecutor: true;
    timelockSelfAdmin: true;
  };
  evidence: {
    hcuReportSha256: Hex;
    aclValidationSha256: Hex;
    gasReportSha256: Hex;
    aclValidatedAt: string;
  };
}
