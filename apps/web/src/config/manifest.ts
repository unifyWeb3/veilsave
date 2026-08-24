import type { VeilSaveDeploymentManifest } from "@veilsave/shared";
import { isAddress, keccak256, type Address, type PublicClient } from "viem";

const REQUIRED_CONTRACT_KEYS = [
  "confidentialPrizePool",
  "poolVrfAdapter",
  "settlementController",
  "deterministicTestYieldVault",
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

function validateContractDeployment(value: unknown, label: string) {
  const item = record(value, label);
  addressValue(item.address, `${label}.address`);
  stringValue(item.deploymentTransaction, `${label}.deploymentTransaction`);
  const hash = stringValue(item.runtimeCodeHash, `${label}.runtimeCodeHash`);
  if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) throw new Error(`${label}.runtimeCodeHash is malformed`);
  stringValue(item.verifiedSourceUrl, `${label}.verifiedSourceUrl`);
}

export function validateManifest(input: unknown): VeilSaveDeploymentManifest {
  const manifest = record(input, "deployment manifest");
  if (manifest.schemaVersion !== 1) throw new Error("Unsupported deployment manifest schema");
  if (manifest.product !== "VeilSave") throw new Error("Manifest product mismatch");
  if (manifest.status !== "ACTIVE") throw new Error("Deployment manifest is not active");
  if (manifest.chainId !== 11155111) throw new Error("Manifest chain mismatch");
  if (manifest.asset && record(manifest.asset, "manifest.asset").decimals !== 6) {
    throw new Error("Only six-decimal cUSDT is supported");
  }
  const pool = record(manifest.pool, "manifest.pool");
  if (pool.participantCapacity !== 16) throw new Error("Manifest participant capacity is not 16");

  const contracts = record(manifest.contracts, "manifest.contracts");
  for (const key of REQUIRED_CONTRACT_KEYS) validateContractDeployment(contracts[key], `contracts.${key}`);

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

  return input as VeilSaveDeploymentManifest;
}

export async function fetchDeploymentManifest(url: string): Promise<VeilSaveDeploymentManifest> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Deployment manifest request failed (${response.status})`);
  return validateManifest(await response.json());
}

export interface CodeHashCheck {
  address: Address;
  expected: `0x${string}`;
  actual: `0x${string}`;
  ok: boolean;
}

export async function verifyManifestCode(
  publicClient: PublicClient,
  manifest: VeilSaveDeploymentManifest,
): Promise<CodeHashCheck[]> {
  const checks: CodeHashCheck[] = [];
  for (const key of REQUIRED_CONTRACT_KEYS) {
    const deployment = manifest.contracts[key];
    const address = deployment.address as Address;
    const bytecode = await publicClient.getBytecode({ address });
    if (!bytecode) throw new Error(`No runtime code found for ${key}`);
    const actual = keccak256(bytecode);
    checks.push({
      address,
      expected: deployment.runtimeCodeHash,
      actual,
      ok: actual.toLowerCase() === deployment.runtimeCodeHash.toLowerCase(),
    });
  }
  if (checks.some((check) => !check.ok)) throw new Error("Deployment bytecode does not match the signed manifest");
  return checks;
}
