import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { Contract, ZeroAddress, getAddress, keccak256 } from "ethers";
import * as hre from "hardhat";

const EIP1967_IMPLEMENTATION_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

type ContractKey =
  | "timelockController"
  | "confidentialPrizePool"
  | "poolVrfAdapter"
  | "settlementController"
  | "deterministicTestYieldVault";

type DeploymentRecord = {
  address: string;
  deploymentTransaction: string;
  deploymentBlock: number;
  runtimeCodeHash: string;
};

type Draft = {
  schemaVersion: 1;
  product: "VeilSave";
  releaseVersion: string;
  sourceCommit: string;
  chainId: number;
  external: {
    confidentialToken: string;
    underlyingToken: string;
    confidentialWrapper: string;
    acl: string;
    fheExecutor: string;
    kmsVerifier: string;
    inputVerifier: string;
    inputVerificationVerifier: string;
    decryptionVerifier: string;
    gatewayChainId: number;
    relayerUrl: string;
    vrfCoordinator: string;
    vrfWrapper: string;
  };
  governance: {
    safe: string;
    guardian: string;
    timelock: string;
    timelockDelaySeconds: string;
    openExecutor: boolean;
    selfAdmin: boolean;
  };
  configuration: {
    participantCapacity: number;
    epochDurationSeconds: number;
    slotBondWei: string;
    winnerFinalityDelayBlocks: number;
    vrfConfirmations: number;
    vrfCallbackGasLimit: number;
    vrfWords: number;
    strategyMode: string;
    strategyId: string;
  };
  contracts: Record<ContractKey | "timelockController", DeploymentRecord>;
};

type Audit = {
  chainId: number;
  status: string;
  codeChecks: Record<
    string,
    {
      address: string;
      runtimeCodeHash: string;
    }
  >;
  externalCodeChecks: Record<
    string,
    {
      address: string;
      runtimeCodeHash: string;
    }
  >;
  proxyImplementationChecks: Record<
    string,
    {
      proxy: string;
      implementation: string;
      runtimeCodeHash: string;
    }
  >;
  bindingsLocked: boolean;
  bootstrapAuthoritiesCleared: boolean;
  governance: {
    safe: string;
    safeRuntimeCodeHash: string;
    safeSingleton: string;
    safeSingletonRuntimeCodeHash: string;
    safeThreshold: string;
    safeOwnerCount: number;
    timelock: string;
    minDelaySeconds: string;
    safeProposer: boolean;
    safeCanceller: boolean;
    openExecutor: boolean;
    selfAdmin: boolean;
  };
  pool: {
    active: boolean;
    currentEpochId: string;
    epoch1OpenedAt: string;
    epoch1ClosesAt: string;
    participantCapacity: string;
  };
};

type Verification = {
  chainId: number;
  status: string;
  contracts: Array<{
    contract: string;
    address: string;
    verifiedSourceUrl: string;
  }>;
};

type EpochEvidence = {
  chainId: number;
  status: string;
  recordedAt: string;
  epoch: {
    id: string;
    expectedOutcome: string;
    frozenSlotCount: number;
    frozenOwnersMatchPrecheck: boolean;
    frozenWeightHandlesMatchPrecheck: boolean;
    terminal: boolean;
  };
  vrf: {
    request: ReceiptRecord;
    fulfillment: ReceiptRecord;
    callbackGasUsed: string;
    callbackStoresRandomnessOnly: boolean;
    sync: ReceiptRecord;
    confirmations: number;
    words: number;
  };
  draw: {
    transaction: ReceiptRecord;
    participantCapacity: number;
    globalHcu: number;
    maxSequentialDepthHcu: number;
    withinSafetyBudget: boolean;
    isolatedFromVrfCallback: boolean;
  };
  winner: {
    publicDecrypt: {
      clearWinner: string;
      proofHash: string;
      attempts: number;
      latencyMs: number;
    };
    earlyFinalizationRejected: boolean;
    wrongClearRejected: boolean;
    wrongHandleRejected: boolean | null;
    wrongEpochRejected: boolean;
    replayRejected: boolean;
    finalize: ReceiptRecord;
    finalizedWinner: string;
  };
  prizeAcl: {
    prizePubliclyDecryptable: boolean;
    winnerBeforeGrantRejected: boolean | null;
    winnerDecryptionPassed: boolean | null;
    nonWinnerDecryptionRejected: boolean;
    publicDecryptionRejected: boolean;
    aclPropagationAttempts: number | null;
    aclPropagationLatencyMs: number | null;
    prizeAmountRecordedPublicly: boolean;
  };
  prizeClaim: {
    transaction: ReceiptRecord;
    privateTokenReconciliation: boolean;
    prizeAmountRecordedPublicly: boolean;
  } | null;
  privacy: {
    participantPrincipalRecorded: boolean;
    participantWeightsRecorded: boolean;
    prizeAmountRecorded: boolean;
    decryptionProofRecorded: boolean;
    privateKeysRecordedPublicly: boolean;
  };
};

type ReceiptRecord = {
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
};

const CONTRACT_KEYS: ContractKey[] = [
  "timelockController",
  "confidentialPrizePool",
  "poolVrfAdapter",
  "settlementController",
  "deterministicTestYieldVault",
];
const REQUIRED_PRE_DRAW_EVIDENCE = [
  "live-deposit-evidence.json",
  "live-immediate-withdrawal-evidence.json",
  "live-second-participant-evidence.json",
  "live-test-yield-evidence.json",
  "live-fifo-withdrawal-evidence.json",
] as const;
const MAX_GLOBAL_HCU = 17_000_000;
const MAX_SEQUENTIAL_HCU = 4_000_000;
const MAX_DRAW_GAS = 3_500_000n;

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function readJson<T>(file: string): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Required release input is missing: ${path.basename(file)}`);
    }
    throw error;
  }
}

async function assertPassEvidence(file: string): Promise<void> {
  const evidence = await readJson<{ chainId?: number; status?: string }>(file);
  assert(evidence.chainId === 11155111, `${path.basename(file)} is not bound to Sepolia`);
  assert(evidence.status === "PASS", `${path.basename(file)} is not PASS`);
}

async function sha256(file: string): Promise<`0x${string}`> {
  const digest = createHash("sha256")
    .update(await fs.readFile(file))
    .digest("hex");
  return `0x${digest}`;
}

function jsonBytes(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function sha256Bytes(value: Buffer): `0x${string}` {
  return `0x${createHash("sha256").update(value).digest("hex")}`;
}

async function assertAbsent(file: string): Promise<void> {
  try {
    await fs.access(file);
    throw new Error(`Refusing to overwrite existing release artifact: ${path.basename(file)}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

function verificationUrl(report: Verification, key: ContractKey): string {
  const item = report.contracts.find((candidate) => candidate.contract === key);
  assert(item, `Source verification is missing ${key}`);
  return item.verifiedSourceUrl;
}

function contractManifest(
  draft: Draft,
  verification: Verification,
  key: ContractKey,
): Record<string, unknown> {
  const record = draft.contracts[key];
  assert(record, `Deployment draft is missing ${key}`);
  return {
    address: getAddress(record.address),
    deploymentTransaction: record.deploymentTransaction,
    runtimeCodeHash: record.runtimeCodeHash,
    verifiedSourceUrl: verificationUrl(verification, key),
  };
}

async function main(): Promise<void> {
  const draftPath = path.resolve(required("DEPLOYMENT_DRAFT_PATH"));
  const deploymentDir = path.dirname(draftPath);
  const outputPath = path.resolve(
    process.env.ACTIVE_MANIFEST_PATH?.trim() ?? path.join(deploymentDir, "manifest.json"),
  );
  const hcuReportPath = path.join(deploymentDir, "live-hcu-report.json");
  const gasReportPath = path.join(deploymentDir, "live-gas-report.json");
  const aclReportPath = path.join(deploymentDir, "live-acl-validation-report.json");
  const draft = await readJson<Draft>(draftPath);
  const audit = await readJson<Audit>(path.join(deploymentDir, "post-deploy-audit.json"));
  const verification = await readJson<Verification>(
    path.join(deploymentDir, "source-verification.json"),
  );

  assert(draft.schemaVersion === 1 && draft.product === "VeilSave", "Deployment draft is invalid");
  assert(draft.chainId === 11155111, "Deployment draft is not bound to Sepolia");
  assert(audit.chainId === 11155111 && audit.status === "PASS", "Post-deploy audit is not PASS");
  assert(
    audit.bindingsLocked && audit.bootstrapAuthoritiesCleared && audit.pool.active,
    "Deployment bindings or bootstrap authority are not release-safe",
  );
  assert(
    audit.governance.safeProposer &&
      audit.governance.safeCanceller &&
      audit.governance.openExecutor &&
      audit.governance.selfAdmin,
    "Timelock governance audit is incomplete",
  );
  assert(
    audit.governance.safeThreshold === "2" && audit.governance.safeOwnerCount === 3,
    "Safe audit is not 2-of-3",
  );
  assert(
    verification.chainId === 11155111 && verification.status === "PASS",
    "Source verification is not PASS",
  );
  assert(draft.configuration.participantCapacity === 16, "Participant capacity is not 16");
  assert(draft.configuration.epochDurationSeconds === 604_800, "Epoch duration is not seven days");
  assert(
    draft.configuration.slotBondWei === "1000000000000000",
    "Slot bond differs from the frozen value",
  );
  assert(draft.configuration.winnerFinalityDelayBlocks === 96, "Winner ACL delay is not 96 blocks");
  assert(
    draft.configuration.vrfConfirmations === 3,
    "VRF confirmations differ from the frozen value",
  );
  assert(
    draft.configuration.vrfCallbackGasLimit === 100_000,
    "VRF callback gas differs from the frozen value",
  );
  assert(draft.configuration.vrfWords === 1, "VRF word count is not one");
  assert(
    draft.configuration.strategyMode === "TEST_YIELD",
    "Release strategy must be explicitly TEST_YIELD",
  );
  assert(draft.governance.timelockDelaySeconds === "86400", "Strategy timelock is not 24 hours");
  assert(
    draft.governance.openExecutor && draft.governance.selfAdmin,
    "Draft governance flags are incomplete",
  );
  assert(
    getAddress(audit.governance.safe) === getAddress(draft.governance.safe),
    "Audited Safe differs from the deployment draft",
  );
  assert(
    getAddress(audit.governance.timelock) === getAddress(draft.governance.timelock),
    "Audited timelock differs from the deployment draft",
  );
  assert(audit.pool.participantCapacity === "16", "Audited pool capacity is not 16");
  assert(BigInt(audit.pool.currentEpochId) >= 1n, "Audited pool has no canonical epoch");
  assert(
    BigInt(audit.pool.epoch1ClosesAt) - BigInt(audit.pool.epoch1OpenedAt) === 604_800n,
    "Audited epoch 1 duration is not seven days",
  );

  for (const [key, record] of Object.entries(draft.contracts)) {
    const audited = audit.codeChecks[key];
    assert(audited, `Post-deploy audit is missing ${key}`);
    assert(
      getAddress(audited.address) === getAddress(record.address),
      `${key} audited address drifted`,
    );
    assert(
      audited.runtimeCodeHash.toLowerCase() === record.runtimeCodeHash.toLowerCase(),
      `${key} audited runtime hash drifted`,
    );
  }

  const network = await hre.ethers.provider.getNetwork();
  assert(network.chainId === 11155111n, `Refusing release manifest on chain ${network.chainId}`);
  for (const [key, record] of Object.entries(draft.contracts)) {
    const code = await hre.ethers.provider.getCode(record.address);
    assert(code !== "0x", `${key} has no current Sepolia runtime code`);
    assert(
      keccak256(code).toLowerCase() === record.runtimeCodeHash.toLowerCase(),
      `${key} current Sepolia runtime hash differs from the deployment draft`,
    );
  }

  const externalRuntimeCodeHashes: Record<string, string> = {};
  for (const key of [
    "confidentialToken",
    "underlyingToken",
    "acl",
    "fheExecutor",
    "kmsVerifier",
    "inputVerifier",
    "vrfCoordinator",
    "vrfWrapper",
  ] as const) {
    const audited = audit.externalCodeChecks[key];
    assert(audited, `Post-deploy audit is missing external ${key}`);
    assert(
      getAddress(audited.address) === getAddress(draft.external[key]),
      `Audited external ${key} address drifted`,
    );
    externalRuntimeCodeHashes[key] = audited.runtimeCodeHash;
    const code = await hre.ethers.provider.getCode(audited.address);
    assert(code !== "0x", `External ${key} has no current Sepolia runtime code`);
    assert(
      keccak256(code).toLowerCase() === audited.runtimeCodeHash.toLowerCase(),
      `External ${key} current Sepolia runtime hash differs from the audit`,
    );
  }
  const proxyImplementations: Record<string, { address: string; runtimeCodeHash: string }> = {};
  for (const key of [
    "confidentialToken",
    "acl",
    "fheExecutor",
    "kmsVerifier",
    "inputVerifier",
  ] as const) {
    const audited = audit.proxyImplementationChecks[key];
    assert(audited, `Post-deploy audit is missing ${key} proxy implementation`);
    assert(
      getAddress(audited.proxy) === getAddress(draft.external[key]),
      `${key} audited proxy address drifted`,
    );
    const implementationWord = await hre.ethers.provider.getStorage(
      audited.proxy,
      EIP1967_IMPLEMENTATION_SLOT,
    );
    const implementation = getAddress(`0x${implementationWord.slice(-40)}`);
    assert(
      implementation === getAddress(audited.implementation),
      `${key} current proxy implementation differs from the audit`,
    );
    const code = await hre.ethers.provider.getCode(implementation);
    assert(code !== "0x", `${key} current implementation has no Sepolia runtime code`);
    assert(
      keccak256(code).toLowerCase() === audited.runtimeCodeHash.toLowerCase(),
      `${key} current implementation runtime hash differs from the audit`,
    );
    proxyImplementations[key] = {
      address: implementation,
      runtimeCodeHash: audited.runtimeCodeHash,
    };
  }

  const safeAddress = getAddress(draft.governance.safe);
  const safeCode = await hre.ethers.provider.getCode(safeAddress);
  assert(safeCode !== "0x", "Governance Safe has no current Sepolia runtime code");
  assert(
    keccak256(safeCode).toLowerCase() === audit.governance.safeRuntimeCodeHash.toLowerCase(),
    "Governance Safe current Sepolia runtime hash differs from the audit",
  );
  const safeSingletonWord = await hre.ethers.provider.getStorage(safeAddress, 0n);
  const safeSingleton = getAddress(`0x${safeSingletonWord.slice(-40)}`);
  assert(
    safeSingleton === getAddress(audit.governance.safeSingleton),
    "Governance Safe singleton differs from the audit",
  );
  const safeSingletonCode = await hre.ethers.provider.getCode(safeSingleton);
  assert(safeSingletonCode !== "0x", "Governance Safe singleton has no Sepolia runtime code");
  assert(
    keccak256(safeSingletonCode).toLowerCase() ===
      audit.governance.safeSingletonRuntimeCodeHash.toLowerCase(),
    "Governance Safe singleton runtime hash differs from the audit",
  );
  const safe: any = new Contract(
    safeAddress,
    [
      "function getThreshold() view returns (uint256)",
      "function getOwners() view returns (address[])",
    ],
    hre.ethers.provider,
  );
  const safeOwners = ((await safe.getOwners()) as string[]).map(getAddress);
  assert(
    BigInt(await safe.getThreshold()) === 2n &&
      safeOwners.length === 3 &&
      safeOwners.every((owner) => owner !== ZeroAddress) &&
      new Set(safeOwners).size === 3,
    "Governance Safe is no longer a deployed Sepolia 2-of-3 Safe",
  );

  const pool: any = await hre.ethers.getContractAt(
    "ConfidentialPrizePool",
    draft.contracts.confidentialPrizePool.address,
  );
  const vrf: any = await hre.ethers.getContractAt(
    "PoolVrfAdapter",
    draft.contracts.poolVrfAdapter.address,
  );
  assert(await pool.active(), "Pool is no longer active");
  assert(
    getAddress(await pool.bootstrapAuthority()) === ZeroAddress,
    "Pool bootstrap authority reappeared",
  );
  assert(BigInt(await pool.lastTerminalEpochId()) >= 2n, "Two live epochs have not terminalized");
  assert(BigInt(await pool.currentEpochId()) >= 3n, "Epoch 3 has not opened after live acceptance");
  assert(BigInt(await pool.activeSettlementId()) === 0n, "Pool still has an active settlement");
  assert(BigInt(await vrf.pendingRequestCount()) === 0n, "VRF adapter still has a pending request");

  for (const file of REQUIRED_PRE_DRAW_EVIDENCE) {
    await assertPassEvidence(path.join(deploymentDir, file));
  }

  const epoch1Path = path.join(deploymentDir, "live-epoch-1-evidence.json");
  const epoch2Path = path.join(deploymentDir, "live-epoch-2-evidence.json");
  const epoch1 = await readJson<EpochEvidence>(epoch1Path);
  const epoch2 = await readJson<EpochEvidence>(epoch2Path);
  for (const [label, evidence] of [
    ["epoch 1", epoch1],
    ["epoch 2", epoch2],
  ] as const) {
    assert(
      evidence.chainId === 11155111 && evidence.status === "PASS",
      `${label} evidence is not PASS`,
    );
    assert(evidence.epoch.terminal, `${label} is not terminal`);
    assert(
      evidence.epoch.frozenSlotCount === 2,
      `${label} does not contain the two acceptance slots`,
    );
    assert(evidence.epoch.frozenOwnersMatchPrecheck, `${label} frozen owners were not verified`);
    assert(
      evidence.epoch.frozenWeightHandlesMatchPrecheck,
      `${label} frozen weights were not verified`,
    );
    assert(evidence.vrf.callbackStoresRandomnessOnly, `${label} callback isolation is not proven`);
    assert(
      evidence.vrf.confirmations === 3 && evidence.vrf.words === 1,
      `${label} VRF configuration drifted`,
    );
    assert(evidence.draw.participantCapacity === 16, `${label} draw capacity is not 16`);
    assert(
      evidence.draw.isolatedFromVrfCallback,
      `${label} draw is not isolated from the callback`,
    );
    assert(evidence.draw.withinSafetyBudget, `${label} draw did not pass its safety budget`);
    assert(
      evidence.draw.globalHcu <= MAX_GLOBAL_HCU,
      `${label} global HCU exceeds the release target`,
    );
    assert(
      evidence.draw.maxSequentialDepthHcu <= MAX_SEQUENTIAL_HCU,
      `${label} sequential HCU exceeds the release target`,
    );
    assert(
      evidence.winner.earlyFinalizationRejected,
      `${label} early finalization negative is missing`,
    );
    assert(evidence.winner.wrongClearRejected, `${label} wrong-clear negative is missing`);
    assert(evidence.winner.wrongEpochRejected, `${label} wrong-epoch negative is missing`);
    assert(evidence.winner.replayRejected, `${label} replay negative is missing`);
    assert(
      !evidence.prizeAcl.prizePubliclyDecryptable,
      `${label} prize became publicly decryptable`,
    );
    assert(
      evidence.prizeAcl.nonWinnerDecryptionRejected,
      `${label} unauthorized prize decryption is not rejected`,
    );
    assert(
      evidence.prizeAcl.publicDecryptionRejected,
      `${label} public prize decryption is not rejected`,
    );
    assert(
      !evidence.prizeAcl.prizeAmountRecordedPublicly,
      `${label} publicly recorded the prize amount`,
    );
    assert(
      !evidence.privacy.participantPrincipalRecorded &&
        !evidence.privacy.participantWeightsRecorded &&
        !evidence.privacy.prizeAmountRecorded &&
        !evidence.privacy.decryptionProofRecorded &&
        !evidence.privacy.privateKeysRecordedPublicly,
      `${label} evidence violates the privacy boundary`,
    );
  }
  assert(
    epoch1.epoch.expectedOutcome === "ZERO_WINNER",
    "Epoch 1 must prove the zero-weight rollover path",
  );
  assert(epoch1.prizeClaim === null, "Epoch 1 unexpectedly contains a winner prize claim");
  assert(
    epoch2.epoch.expectedOutcome === "PARTICIPANT_WINNER",
    "Epoch 2 must prove the weighted participant winner path",
  );
  assert(epoch2.winner.wrongHandleRejected === true, "Epoch 2 wrong-handle negative is missing");
  assert(
    epoch2.prizeAcl.winnerBeforeGrantRejected === true,
    "Winner decrypted before the ACL grant",
  );
  assert(
    epoch2.prizeAcl.winnerDecryptionPassed === true,
    "Winner-only prize decryption did not pass",
  );
  assert(
    epoch2.prizeClaim?.privateTokenReconciliation === true,
    "Winner prize claim did not reconcile privately",
  );
  assert(
    epoch2.prizeClaim?.prizeAmountRecordedPublicly === false,
    "Winner prize evidence exposed the amount",
  );

  const drawGas = BigInt(epoch2.draw.transaction.gasUsed);
  assert(drawGas <= MAX_DRAW_GAS, "Epoch 2 draw gas exceeds the release target");

  const sourceEvidenceSha256 = await sha256(epoch2Path);
  const hcuReport = {
    schemaVersion: 1,
    product: "VeilSave",
    status: "PASS",
    network: "ethereum-sepolia",
    chainId: 11155111,
    recordedAt: epoch2.recordedAt,
    sourceEvidence: {
      file: path.basename(epoch2Path),
      sha256: sourceEvidenceSha256,
    },
    epochId: epoch2.epoch.id,
    drawTransaction: epoch2.draw.transaction.transactionHash,
    participantCapacity: epoch2.draw.participantCapacity,
    globalHcu: epoch2.draw.globalHcu,
    maxSequentialDepthHcu: epoch2.draw.maxSequentialDepthHcu,
    targetGlobalHcu: MAX_GLOBAL_HCU,
    targetSequentialDepthHcu: MAX_SEQUENTIAL_HCU,
    globalHcuMargin: MAX_GLOBAL_HCU - epoch2.draw.globalHcu,
    sequentialDepthHcuMargin: MAX_SEQUENTIAL_HCU - epoch2.draw.maxSequentialDepthHcu,
    isolatedFromVrfCallback: epoch2.draw.isolatedFromVrfCallback,
  };
  const gasReport = {
    schemaVersion: 1,
    product: "VeilSave",
    status: "PASS",
    network: "ethereum-sepolia",
    chainId: 11155111,
    recordedAt: epoch2.recordedAt,
    sourceEvidence: {
      file: path.basename(epoch2Path),
      sha256: sourceEvidenceSha256,
    },
    epochId: epoch2.epoch.id,
    vrfRequest: epoch2.vrf.request,
    vrfCallback: {
      ...epoch2.vrf.fulfillment,
      callbackGasUsed: epoch2.vrf.callbackGasUsed,
      callbackStoresRandomnessOnly: epoch2.vrf.callbackStoresRandomnessOnly,
    },
    randomnessSynchronization: epoch2.vrf.sync,
    encryptedDraw: epoch2.draw.transaction,
    winnerFinalization: epoch2.winner.finalize,
    prizeClaim: epoch2.prizeClaim?.transaction ?? null,
    drawGasTarget: MAX_DRAW_GAS.toString(),
    drawGasWithinTarget: true,
  };
  const aclReport = {
    schemaVersion: 1,
    product: "VeilSave",
    status: "PASS",
    network: "ethereum-sepolia",
    chainId: 11155111,
    recordedAt: epoch2.recordedAt,
    sourceEvidence: {
      file: path.basename(epoch2Path),
      sha256: sourceEvidenceSha256,
    },
    epochId: epoch2.epoch.id,
    winnerHandlePubliclyDecryptable: true,
    winnerAddress: epoch2.winner.finalizedWinner,
    winnerProofHash: epoch2.winner.publicDecrypt.proofHash,
    publicDecryptAttempts: epoch2.winner.publicDecrypt.attempts,
    publicDecryptLatencyMs: epoch2.winner.publicDecrypt.latencyMs,
    finalization: epoch2.winner.finalize,
    earlyFinalizationRejected: epoch2.winner.earlyFinalizationRejected,
    wrongClearRejected: epoch2.winner.wrongClearRejected,
    wrongHandleRejected: epoch2.winner.wrongHandleRejected,
    wrongEpochRejected: epoch2.winner.wrongEpochRejected,
    replayRejected: epoch2.winner.replayRejected,
    winnerBeforeGrantRejected: epoch2.prizeAcl.winnerBeforeGrantRejected,
    winnerDecryptionPassed: epoch2.prizeAcl.winnerDecryptionPassed,
    nonWinnerDecryptionRejected: epoch2.prizeAcl.nonWinnerDecryptionRejected,
    publicPrizeDecryptionRejected: epoch2.prizeAcl.publicDecryptionRejected,
    prizePubliclyDecryptable: epoch2.prizeAcl.prizePubliclyDecryptable,
    aclPropagationAttempts: epoch2.prizeAcl.aclPropagationAttempts,
    aclPropagationLatencyMs: epoch2.prizeAcl.aclPropagationLatencyMs,
    privatePrizeClaimReconciled: epoch2.prizeClaim?.privateTokenReconciliation ?? false,
    prizeAmountRecordedPublicly: false,
    decryptionProofRecorded: false,
  };
  const hcuReportBytes = jsonBytes(hcuReport);
  const gasReportBytes = jsonBytes(gasReport);
  const aclReportBytes = jsonBytes(aclReport);

  const verificationAddresses = new Map(
    verification.contracts.map((item) => [item.contract, getAddress(item.address)]),
  );
  for (const key of CONTRACT_KEYS) {
    assert(
      verificationAddresses.get(key) === getAddress(draft.contracts[key].address),
      `Verified ${key} address differs from the deployment draft`,
    );
  }

  const strategyRecord = draft.contracts.deterministicTestYieldVault;
  const deploymentBlock = Math.min(
    ...CONTRACT_KEYS.map((key) => draft.contracts[key].deploymentBlock),
  );
  const manifest = {
    schemaVersion: 1,
    product: "VeilSave",
    releaseVersion: draft.releaseVersion,
    sourceCommit: draft.sourceCommit,
    status: "ACTIVE",
    chainId: 11155111,
    deploymentBlock,
    contracts: {
      timelockController: contractManifest(draft, verification, "timelockController"),
      confidentialPrizePool: contractManifest(draft, verification, "confidentialPrizePool"),
      poolVrfAdapter: contractManifest(draft, verification, "poolVrfAdapter"),
      settlementController: contractManifest(draft, verification, "settlementController"),
      deterministicTestYieldVault: contractManifest(
        draft,
        verification,
        "deterministicTestYieldVault",
      ),
    },
    external: {
      confidentialToken: getAddress(draft.external.confidentialToken),
      underlyingToken: getAddress(draft.external.underlyingToken),
      confidentialWrapper: getAddress(draft.external.confidentialWrapper),
      acl: getAddress(draft.external.acl),
      fheExecutor: getAddress(draft.external.fheExecutor),
      kmsVerifier: getAddress(draft.external.kmsVerifier),
      inputVerifier: getAddress(draft.external.inputVerifier),
      inputVerificationVerifier: getAddress(draft.external.inputVerificationVerifier),
      decryptionVerifier: getAddress(draft.external.decryptionVerifier),
      gatewayChainId: draft.external.gatewayChainId,
      relayerUrl: draft.external.relayerUrl,
      vrfCoordinator: getAddress(draft.external.vrfCoordinator),
      vrfWrapper: getAddress(draft.external.vrfWrapper),
      runtimeCodeHashes: externalRuntimeCodeHashes,
      proxyImplementations,
    },
    asset: {
      symbol: "cUSDT",
      decimals: 6,
      wrapperRate: "1",
    },
    strategy: {
      address: getAddress(strategyRecord.address),
      asset: getAddress(draft.external.underlyingToken),
      id: draft.configuration.strategyId,
      mode: "TEST_YIELD",
      deploymentBlock: strategyRecord.deploymentBlock,
    },
    vrf: {
      confirmations: draft.configuration.vrfConfirmations,
      callbackGasLimit: draft.configuration.vrfCallbackGasLimit,
      words: 1,
    },
    pool: {
      participantCapacity: 16,
      epochDurationSeconds: 604_800,
      slotBondWei: "1000000000000000",
      winnerFinalityDelayBlocks: 96,
      strategyTimelockSeconds: 86_400,
    },
    governance: {
      safe: getAddress(draft.governance.safe),
      safeRuntimeCodeHash: audit.governance.safeRuntimeCodeHash,
      safeSingleton: {
        address: safeSingleton,
        runtimeCodeHash: audit.governance.safeSingletonRuntimeCodeHash,
      },
      timelock: getAddress(draft.governance.timelock),
      guardian: getAddress(draft.governance.guardian),
      timelockOpenExecutor: true,
      timelockSelfAdmin: true,
    },
    evidence: {
      hcuReportSha256: sha256Bytes(hcuReportBytes),
      aclValidationSha256: sha256Bytes(aclReportBytes),
      gasReportSha256: sha256Bytes(gasReportBytes),
      aclValidatedAt: epoch2.recordedAt,
    },
  };

  await Promise.all([
    assertAbsent(hcuReportPath),
    assertAbsent(gasReportPath),
    assertAbsent(aclReportPath),
    assertAbsent(outputPath),
  ]);
  await fs.writeFile(hcuReportPath, hcuReportBytes, { flag: "wx" });
  await fs.writeFile(gasReportPath, gasReportBytes, { flag: "wx" });
  await fs.writeFile(aclReportPath, aclReportBytes, { flag: "wx" });
  await fs.writeFile(outputPath, jsonBytes(manifest), { flag: "wx" });
  console.log(`VeilSave ACTIVE manifest created: ${outputPath}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
