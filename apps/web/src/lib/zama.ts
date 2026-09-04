import { bytesToHex } from "viem";

import type { VeilSaveDeploymentManifest } from "@veilsave/shared";
import type {
  FhevmInstance,
  HandleContractPair,
  PublicDecryptResults,
} from "@zama-fhe/relayer-sdk/web";

import type { RuntimeConfig } from "../config/runtime";

export type ZamaStatus = "idle" | "loading" | "ready" | "unavailable" | "error";

export interface EncryptedInput {
  handle: `0x${string}`;
  inputProof: `0x${string}`;
}

export interface ZamaClient {
  instance: FhevmInstance;
  encryptUint64(
    contractAddress: `0x${string}`,
    userAddress: `0x${string}`,
    value: bigint,
  ): Promise<EncryptedInput>;
  publicDecrypt(handles: `0x${string}`[]): Promise<PublicDecryptResults>;
  createUserDecryptRequest(
    handles: `0x${string}`[],
    contractAddresses: `0x${string}`[],
    userAddress: `0x${string}`,
    startTimestamp: number,
    durationDays: number,
  ): UserDecryptRequest;
}

export interface UserDecryptRequest {
  handles: `0x${string}`[];
  contractAddresses: `0x${string}`[];
  startTimestamp: number;
  durationDays: number;
  userAddress: `0x${string}`;
  keypair: { publicKey: string; privateKey: string };
  typedData: Record<string, unknown>;
  complete(signature: string): Promise<Readonly<Record<string, unknown>>>;
}

function assertSepoliaConfig(
  manifest: Pick<VeilSaveDeploymentManifest, "external">,
  sdk: typeof import("@zama-fhe/relayer-sdk/web"),
) {
  const expected = sdk.SepoliaConfig;
  const checks: Array<[string, string, string]> = [
    ["aclContractAddress", manifest.external.acl, expected.aclContractAddress],
    ["kmsContractAddress", manifest.external.kmsVerifier, expected.kmsContractAddress],
    [
      "inputVerifierContractAddress",
      manifest.external.inputVerifier,
      expected.inputVerifierContractAddress,
    ],
    [
      "verifyingContractAddressInputVerification",
      manifest.external.inputVerificationVerifier,
      expected.verifyingContractAddressInputVerification,
    ],
    [
      "verifyingContractAddressDecryption",
      manifest.external.decryptionVerifier,
      expected.verifyingContractAddressDecryption,
    ],
  ];
  for (const [label, actual, expectedValue] of checks) {
    if (actual.toLowerCase() !== expectedValue.toLowerCase()) {
      throw new Error(`Zama ${label} does not match the installed SDK configuration`);
    }
  }
  if (manifest.external.gatewayChainId !== expected.gatewayChainId) {
    throw new Error("Zama gateway chain does not match the installed SDK configuration");
  }
}

export async function loadZamaClient(
  runtime: RuntimeConfig,
  manifest: Pick<VeilSaveDeploymentManifest, "external">,
): Promise<ZamaClient> {
  if (typeof window === "undefined") throw new Error("Zama SDK requires a browser context");
  const sdk = await import("@zama-fhe/relayer-sdk/web");
  assertSepoliaConfig(manifest, sdk);
  const initialized = await sdk.initSDK({
    thread: Math.min(4, navigator.hardwareConcurrency || 1),
  });
  if (!initialized) throw new Error("Zama local encryption runtime could not initialize");

  const instance = await sdk.createInstance({
    ...sdk.SepoliaConfig,
    network: runtime.rpcUrl,
    relayerUrl: manifest.external.relayerUrl,
  });

  return {
    instance,
    async encryptUint64(contractAddress, userAddress, value) {
      const input = instance.createEncryptedInput(contractAddress, userAddress);
      input.add64(value);
      const encrypted = await input.encrypt();
      const handle = encrypted.handles[0];
      if (!handle) throw new Error("Zama returned no encrypted handle");
      return { handle: bytesToHex(handle), inputProof: bytesToHex(encrypted.inputProof) };
    },
    async publicDecrypt(handles) {
      return instance.publicDecrypt(handles);
    },
    createUserDecryptRequest(
      handles,
      contractAddresses,
      userAddress,
      startTimestamp,
      durationDays,
    ) {
      const keypair = instance.generateKeypair();
      const typed = instance.createEIP712(
        keypair.publicKey,
        contractAddresses,
        startTimestamp,
        durationDays,
      );
      return {
        handles,
        contractAddresses,
        userAddress,
        startTimestamp,
        durationDays,
        keypair,
        typedData: typed as unknown as Record<string, unknown>,
        async complete(signature) {
          const result = await instance.userDecrypt(
            handles.map(
              (handle, index): HandleContractPair => ({
                handle,
                contractAddress: contractAddresses[index]!,
              }),
            ),
            keypair.privateKey,
            keypair.publicKey,
            signature,
            contractAddresses,
            userAddress,
            startTimestamp,
            durationDays,
          );
          return result;
        },
      };
    },
  };
}
