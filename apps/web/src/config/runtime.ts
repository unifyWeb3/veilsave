import { SEPOLIA_CHAIN_ID } from "@veilsave/shared";

export interface RuntimeConfig {
  chainId: typeof SEPOLIA_CHAIN_ID;
  rpcUrl: string;
  manifestUrl: string;
  explorerUrl: string;
}

export interface RuntimeConfigResult {
  config: RuntimeConfig | null;
  error: string | null;
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} is not configured`);
  }
  return value.trim();
}

export function readRuntimeConfig(env: Record<string, unknown> = import.meta.env): RuntimeConfigResult {
  try {
    const chainId = Number(env.VITE_CHAIN_ID ?? SEPOLIA_CHAIN_ID);
    if (chainId !== SEPOLIA_CHAIN_ID) {
      throw new Error(`This release only supports Ethereum Sepolia (${SEPOLIA_CHAIN_ID})`);
    }

    return {
      config: {
        chainId: SEPOLIA_CHAIN_ID,
        rpcUrl: requiredString(env.VITE_RPC_URL, "VITE_RPC_URL"),
        manifestUrl: requiredString(env.VITE_DEPLOYMENT_MANIFEST_URL, "VITE_DEPLOYMENT_MANIFEST_URL"),
        explorerUrl: requiredString(
          env.VITE_BLOCK_EXPLORER_URL ?? "https://sepolia.etherscan.io",
          "VITE_BLOCK_EXPLORER_URL",
        ).replace(/\/$/, ""),
      },
      error: null,
    };
  } catch (error) {
    return {
      config: null,
      error: error instanceof Error ? error.message : "Runtime configuration is unavailable",
    };
  }
}
