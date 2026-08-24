import { http, injected } from "wagmi";
import { createConfig } from "wagmi";
import { sepolia } from "wagmi/chains";

import type { RuntimeConfig } from "../config/runtime";

export function createWalletConfig(runtime: RuntimeConfig) {
  return createConfig({
    chains: [sepolia],
    connectors: [injected({ shimDisconnect: true })],
    transports: {
      [sepolia.id]: http(runtime.rpcUrl),
    },
  });
}
