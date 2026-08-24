import { describe, expect, it } from "vitest";

import { readRuntimeConfig } from "./runtime";

describe("readRuntimeConfig", () => {
  it("accepts the reviewed Sepolia browser configuration", () => {
    const result = readRuntimeConfig({
      VITE_CHAIN_ID: "11155111",
      VITE_RPC_URL: "https://rpc.example",
      VITE_DEPLOYMENT_MANIFEST_URL: "https://example.test/sepolia.json",
      VITE_BLOCK_EXPLORER_URL: "https://sepolia.etherscan.io/",
    });

    expect(result.error).toBeNull();
    expect(result.config).toEqual({
      chainId: 11155111,
      rpcUrl: "https://rpc.example",
      manifestUrl: "https://example.test/sepolia.json",
      explorerUrl: "https://sepolia.etherscan.io",
    });
  });

  it("rejects a non-Sepolia chain and missing required values", () => {
    expect(readRuntimeConfig({ VITE_CHAIN_ID: "1" }).error).toMatch(/only supports Ethereum Sepolia/i);
    expect(readRuntimeConfig({ VITE_CHAIN_ID: "11155111" }).error).toMatch(/VITE_RPC_URL/i);
  });
});
