import { describe, expect, it } from "vitest";
import { keccak256, type PublicClient } from "viem";

import type { VeilSaveDeploymentManifest } from "@veilsave/shared";

import { validateManifest, verifyManifestCode } from "./manifest";

const ADDRESS = "0x1111111111111111111111111111111111111111" as const;
const HASH = `0x${"1".repeat(64)}` as const;

function manifest(): VeilSaveDeploymentManifest {
  const contract = {
    address: ADDRESS,
    deploymentTransaction: HASH,
    runtimeCodeHash: keccak256("0x6000"),
    verifiedSourceUrl: "https://sepolia.etherscan.io/address/0x1#code",
  };
  return {
    schemaVersion: 1,
    product: "VeilSave",
    releaseVersion: "0.1.0",
    sourceCommit: "abcdef1",
    status: "ACTIVE" as VeilSaveDeploymentManifest["status"],
    chainId: 11155111,
    deploymentBlock: 1,
    contracts: {
      timelockController: { ...contract },
      confidentialPrizePool: { ...contract },
      poolVrfAdapter: { ...contract },
      settlementController: { ...contract },
      deterministicTestYieldVault: { ...contract },
    },
    external: {
      confidentialToken: ADDRESS,
      underlyingToken: ADDRESS,
      confidentialWrapper: ADDRESS,
      acl: ADDRESS,
      fheExecutor: ADDRESS,
      kmsVerifier: ADDRESS,
      inputVerifier: ADDRESS,
      inputVerificationVerifier: ADDRESS,
      decryptionVerifier: ADDRESS,
      gatewayChainId: 10901,
      relayerUrl: "https://relayer.testnet.zama.org",
      vrfCoordinator: ADDRESS,
      vrfWrapper: ADDRESS,
      runtimeCodeHashes: {
        confidentialToken: keccak256("0x6000"),
        underlyingToken: keccak256("0x6000"),
        acl: keccak256("0x6000"),
        fheExecutor: keccak256("0x6000"),
        kmsVerifier: keccak256("0x6000"),
        inputVerifier: keccak256("0x6000"),
        vrfCoordinator: keccak256("0x6000"),
        vrfWrapper: keccak256("0x6000"),
      },
      proxyImplementations: {
        confidentialToken: { address: ADDRESS, runtimeCodeHash: keccak256("0x6000") },
        acl: { address: ADDRESS, runtimeCodeHash: keccak256("0x6000") },
        fheExecutor: { address: ADDRESS, runtimeCodeHash: keccak256("0x6000") },
        kmsVerifier: { address: ADDRESS, runtimeCodeHash: keccak256("0x6000") },
        inputVerifier: { address: ADDRESS, runtimeCodeHash: keccak256("0x6000") },
      },
    },
    asset: { symbol: "cUSDT", decimals: 6, wrapperRate: "1" },
    strategy: {
      address: ADDRESS,
      asset: ADDRESS,
      id: "test-vault-v1",
      mode: "TEST_YIELD" as VeilSaveDeploymentManifest["strategy"]["mode"],
      deploymentBlock: 1,
    },
    vrf: { confirmations: 3, callbackGasLimit: 100_000, words: 1 },
    pool: {
      participantCapacity: 16,
      epochDurationSeconds: 604800,
      slotBondWei: "1000000000000000",
      winnerFinalityDelayBlocks: 96,
      strategyTimelockSeconds: 86400,
    },
    governance: {
      safe: ADDRESS,
      safeRuntimeCodeHash: keccak256("0x6000"),
      safeSingleton: { address: ADDRESS, runtimeCodeHash: keccak256("0x6000") },
      timelock: ADDRESS,
      guardian: ADDRESS,
      timelockOpenExecutor: true,
      timelockSelfAdmin: true,
    },
    evidence: {
      hcuReportSha256: HASH,
      aclValidationSha256: HASH,
      gasReportSha256: HASH,
      aclValidatedAt: "2026-08-18T00:00:00.000Z",
    },
  };
}

describe("deployment manifest validation", () => {
  it("accepts the fixed 16-slot active manifest", () => {
    expect(validateManifest(manifest()).pool.participantCapacity).toBe(16);
  });

  it("rejects capacity and schema drift", () => {
    const capacityDrift = structuredClone(manifest()) as unknown as Record<string, unknown>;
    (capacityDrift.pool as Record<string, unknown>).participantCapacity = 32;
    expect(() => validateManifest(capacityDrift)).toThrow(/capacity is not 16/i);

    const schemaDrift = structuredClone(manifest()) as unknown as Record<string, unknown>;
    schemaDrift.schemaVersion = 2;
    expect(() => validateManifest(schemaDrift)).toThrow(/unsupported deployment manifest schema/i);
  });

  it("rejects runtime bytecode that differs from the manifest", async () => {
    const publicClient = {
      getBytecode: async () => "0x6001",
      getStorageAt: async () => `0x${"0".repeat(24)}${ADDRESS.slice(2)}`,
    } as unknown as PublicClient;
    await expect(verifyManifestCode(publicClient, manifest())).rejects.toThrow(
      /bytecode does not match/i,
    );
  });

  it("verifies app, dependency, proxy implementation, and Safe singleton code", async () => {
    const publicClient = {
      getBytecode: async () => "0x6000",
      getStorageAt: async () => `0x${"0".repeat(24)}${ADDRESS.slice(2)}`,
    } as unknown as PublicClient;
    const checks = await verifyManifestCode(publicClient, manifest());
    expect(checks).toHaveLength(20);
    expect(checks.every((check) => check.ok)).toBe(true);
  });
});
