import type { VeilSaveDeploymentManifest } from "@veilsave/shared";
import { getAddress, isAddress, keccak256, type Address, type Hex, type PublicClient } from "viem";

const EIP1967_IMPLEMENTATION_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc" as const;
const SAFE_SINGLETON_SLOT = `0x${"0".repeat(64)}` as const;

const REQUIRED_CONTRACT_KEYS = [
  "timelockController",
  "confidentialPrizePool",
  "poolVrfAdapter",
  "settlementController",
  "deterministicTestYieldVault",
] as const;

const EXTERNAL_CODE_KEYS = [
  "confidentialToken",
  "underlyingToken",
  "acl",
  "fheExecutor",
  "kmsVerifier",
  "inputVerifier",
  "vrfCoordinator",
  "vrfWrapper",
] as const;

const PROXY_IMPLEMENTATION_KEYS = [
  "confidentialToken",
  "acl",
  "fheExecutor",
  "kmsVerifier",
  "inputVerifier",
] as const;

type UnknownRecord = Record<string, unknown>;

function record(value: unknown, label: string): UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} is malformed`);
  }
  return value as UnknownRecord;
}

function stringValue(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(`${label} is malformed`);
  return value;
}

function addressValue(value: unknown, label: string): `0x${string}` {
  const address = stringValue(value, label);
  if (!isAddress(address)) throw new Error(`${label} is not an address`);
  return address as `0x${string}`;
}

function integerValue(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new Error(`${label} is malformed`);
  }
  return value;
}

function hashValue(value: unknown, label: string): `0x${string}` {
  const hash = stringValue(value, label);
  if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) throw new Error(`${label} is malformed`);
  return hash as `0x${string}`;
}

function validateContractDeployment(value: unknown, label: string) {
  const item = record(value, label);
  addressValue(item.address, `${label}.address`);
  stringValue(item.deploymentTransaction, `${label}.deploymentTransaction`);
  hashValue(item.deploymentTransaction, `${label}.deploymentTransaction`);
  hashValue(item.runtimeCodeHash, `${label}.runtimeCodeHash`);
  stringValue(item.verifiedSourceUrl, `${label}.verifiedSourceUrl`);
}

function validateRuntimeCodeReference(value: unknown, label: string) {
  const item = record(value, label);
  addressValue(item.address, `${label}.address`);
  hashValue(item.runtimeCodeHash, `${label}.runtimeCodeHash`);
}

function storageAddress(value: Hex | undefined, label: string): Address {
  if (!value || value.length !== 66) throw new Error(`${label} storage value is unavailable`);
  const address = getAddress(`0x${value.slice(-40)}`);
  if (/^0x0{40}$/i.test(address)) throw new Error(`${label} storage address is zero`);
  return address;
}

export function validateManifest(input: unknown): VeilSaveDeploymentManifest {
  const manifest = record(input, "deployment manifest");
  if (manifest.schemaVersion !== 1) throw new Error("Unsupported deployment manifest schema");
  if (manifest.product !== "VeilSave") throw new Error("Manifest product mismatch");
  if (manifest.status !== "ACTIVE") throw new Error("Deployment manifest is not active");
  if (manifest.chainId !== 11155111) throw new Error("Manifest chain mismatch");
  stringValue(manifest.releaseVersion, "manifest.releaseVersion");
  stringValue(manifest.sourceCommit, "manifest.sourceCommit");
  if (integerValue(manifest.deploymentBlock, "manifest.deploymentBlock") < 1) {
    throw new Error("Manifest deployment block is invalid");
  }

  const asset = record(manifest.asset, "manifest.asset");
  if (asset.symbol !== "cUSDT" || asset.decimals !== 6 || asset.wrapperRate !== "1") {
    throw new Error("Manifest cUSDT configuration is unsupported");
  }
  const pool = record(manifest.pool, "manifest.pool");
  if (pool.participantCapacity !== 16) throw new Error("Manifest participant capacity is not 16");
  if (
    pool.epochDurationSeconds !== 604_800 ||
    pool.slotBondWei !== "1000000000000000" ||
    pool.winnerFinalityDelayBlocks !== 96 ||
    pool.strategyTimelockSeconds !== 86_400
  ) {
    throw new Error("Manifest pool configuration differs from the frozen release");
  }

  const contracts = record(manifest.contracts, "manifest.contracts");
  for (const key of REQUIRED_CONTRACT_KEYS)
    validateContractDeployment(contracts[key], `contracts.${key}`);

  const external = record(manifest.external, "manifest.external");
  for (const key of [
    "confidentialToken",
    "underlyingToken",
    "confidentialWrapper",
    "acl",
    "fheExecutor",
    "kmsVerifier",
    "inputVerifier",
    "inputVerificationVerifier",
    "decryptionVerifier",
    "vrfCoordinator",
    "vrfWrapper",
  ]) {
    addressValue(external[key], `external.${key}`);
  }
  integerValue(external.gatewayChainId, "external.gatewayChainId");
  stringValue(external.relayerUrl, "external.relayerUrl");
  const externalCodeHashes = record(external.runtimeCodeHashes, "external.runtimeCodeHashes");
  for (const key of EXTERNAL_CODE_KEYS) {
    hashValue(externalCodeHashes[key], `external.runtimeCodeHashes.${key}`);
  }
  const proxyImplementations = record(
    external.proxyImplementations,
    "external.proxyImplementations",
  );
  for (const key of PROXY_IMPLEMENTATION_KEYS) {
    validateRuntimeCodeReference(proxyImplementations[key], `external.proxyImplementations.${key}`);
  }

  const strategy = record(manifest.strategy, "manifest.strategy");
  addressValue(strategy.address, "strategy.address");
  addressValue(strategy.asset, "strategy.asset");
  stringValue(strategy.id, "strategy.id");
  if (strategy.mode !== "TEST_YIELD" && strategy.mode !== "LIVE_STRATEGY") {
    throw new Error("Manifest strategy mode is unsupported");
  }
  if (integerValue(strategy.deploymentBlock, "strategy.deploymentBlock") < 1) {
    throw new Error("Manifest strategy deployment block is invalid");
  }

  const vrf = record(manifest.vrf, "manifest.vrf");
  if (vrf.confirmations !== 3 || vrf.callbackGasLimit !== 100_000 || vrf.words !== 1) {
    throw new Error("Manifest VRF configuration differs from the frozen release");
  }

  const governance = record(manifest.governance, "manifest.governance");
  addressValue(governance.safe, "governance.safe");
  hashValue(governance.safeRuntimeCodeHash, "governance.safeRuntimeCodeHash");
  validateRuntimeCodeReference(governance.safeSingleton, "governance.safeSingleton");
  const timelock = addressValue(governance.timelock, "governance.timelock");
  addressValue(governance.guardian, "governance.guardian");
  if (governance.timelockOpenExecutor !== true || governance.timelockSelfAdmin !== true) {
    throw new Error("Manifest timelock governance differs from the frozen release");
  }
  if (
    timelock.toLowerCase() !==
    String(
      record(contracts.timelockController, "contracts.timelockController").address,
    ).toLowerCase()
  ) {
    throw new Error("Manifest timelock address differs from its contract deployment");
  }

  const evidence = record(manifest.evidence, "manifest.evidence");
  hashValue(evidence.hcuReportSha256, "evidence.hcuReportSha256");
  hashValue(evidence.aclValidationSha256, "evidence.aclValidationSha256");
  hashValue(evidence.gasReportSha256, "evidence.gasReportSha256");
  stringValue(evidence.aclValidatedAt, "evidence.aclValidatedAt");

  return input as VeilSaveDeploymentManifest;
}

export async function fetchDeploymentManifest(url: string): Promise<VeilSaveDeploymentManifest> {
  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store" });
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : "network request failed";
    throw new Error(
      `Deployment manifest download failed (RPC/manifest endpoint): ${url} — ${detail}`,
    );
  }
  if (!response.ok) throw new Error(`Deployment manifest request failed (${response.status})`);
  return validateManifest(await response.json());
}

export interface CodeHashCheck {
  label: string;
  address: Address;
  expected: `0x${string}`;
  actual: `0x${string}`;
  ok: boolean;
}

export async function verifyManifestCode(
  publicClient: PublicClient,
  manifest: Pick<VeilSaveDeploymentManifest, "contracts" | "external" | "governance">,
): Promise<CodeHashCheck[]> {
  const checkContract = async (label: string, address: Address, expected: `0x${string}`) => {
    const bytecode = await publicClient.getBytecode({ address });
    if (!bytecode) throw new Error(`No runtime code found for ${label}`);
    const actual = keccak256(bytecode);
    return {
      label,
      address,
      expected,
      actual,
      ok: actual.toLowerCase() === expected.toLowerCase(),
    } as CodeHashCheck;
  };
  const checks: CodeHashCheck[] = await Promise.all(
    REQUIRED_CONTRACT_KEYS.map((key) => {
      const deployment = manifest.contracts[key];
      return checkContract(key, deployment.address as Address, deployment.runtimeCodeHash);
    }),
  );
  const externalChecks: CodeHashCheck[] = await Promise.all(
    EXTERNAL_CODE_KEYS.map((key) => {
      const address = manifest.external[key] as Address;
      return checkContract(`external.${key}`, address, manifest.external.runtimeCodeHashes[key]);
    }),
  );
  checks.push(...externalChecks);
  const implementationChecks: CodeHashCheck[] = await Promise.all(
    PROXY_IMPLEMENTATION_KEYS.map(async (key) => {
      const proxyAddress = manifest.external[key] as Address;
      const expected = manifest.external.proxyImplementations[key];
      const storage = await publicClient.getStorageAt({
        address: proxyAddress,
        slot: EIP1967_IMPLEMENTATION_SLOT,
      });
      const implementation = storageAddress(storage, `external.${key} implementation`);
      if (implementation.toLowerCase() !== expected.address.toLowerCase()) {
        throw new Error(`External ${key} proxy implementation does not match the signed manifest`);
      }
      const bytecode = await publicClient.getBytecode({ address: implementation });
      if (!bytecode) throw new Error(`No runtime code found for external ${key} implementation`);
      const actual = keccak256(bytecode);
      return {
        label: `external.${key}.implementation`,
        address: implementation,
        expected: expected.runtimeCodeHash,
        actual,
        ok: actual.toLowerCase() === expected.runtimeCodeHash.toLowerCase(),
      } as CodeHashCheck;
    }),
  );
  checks.push(...implementationChecks);
  const safeAddress = manifest.governance.safe as Address;
  const [safeBytecode, singletonStorage] = await Promise.all([
    publicClient.getBytecode({ address: safeAddress }),
    publicClient.getStorageAt({ address: safeAddress, slot: SAFE_SINGLETON_SLOT }),
  ]);
  if (!safeBytecode) throw new Error("No runtime code found for governance Safe");
  const safeActual = keccak256(safeBytecode);
  checks.push({
    label: "governance.safe",
    address: safeAddress,
    expected: manifest.governance.safeRuntimeCodeHash,
    actual: safeActual,
    ok: safeActual.toLowerCase() === manifest.governance.safeRuntimeCodeHash.toLowerCase(),
  });
  const singleton = storageAddress(singletonStorage, "governance Safe singleton");
  if (singleton.toLowerCase() !== manifest.governance.safeSingleton.address.toLowerCase()) {
    throw new Error("Governance Safe singleton does not match the signed manifest");
  }
  const singletonBytecode = await publicClient.getBytecode({ address: singleton });
  if (!singletonBytecode) throw new Error("No runtime code found for governance Safe singleton");
  const singletonActual = keccak256(singletonBytecode);
  checks.push({
    label: "governance.safe.singleton",
    address: singleton,
    expected: manifest.governance.safeSingleton.runtimeCodeHash,
    actual: singletonActual,
    ok:
      singletonActual.toLowerCase() ===
      manifest.governance.safeSingleton.runtimeCodeHash.toLowerCase(),
  });
  if (checks.some((check) => !check.ok))
    throw new Error("Deployment bytecode does not match the signed manifest");
  return checks;
}
