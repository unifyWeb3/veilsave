import { useCallback } from "react";
import { useAccount, useWalletClient } from "wagmi";
import type { Address, Hex } from "viem";

import { useZama } from "../providers/ZamaProvider";

export function useUserDecryptor() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const zama = useZama();

  const decryptHandle = useCallback(
    async (handle: Hex, contractAddress: Address): Promise<bigint> => {
      if (!address || !walletClient) {
        throw new Error("Connect the Sepolia wallet before requesting a private reveal.");
      }
      const client = zama.client ?? (await zama.ensureReady());
      const startTimestamp = Math.floor(Date.now() / 1000);
      const request = client.createUserDecryptRequest(
        [handle],
        [contractAddress],
        address,
        startTimestamp,
        1,
      );
      const typed = request.typedData as {
        domain: Record<string, unknown>;
        types: Record<string, unknown>;
        primaryType: string;
        message: Record<string, unknown>;
      };
      const signature = await (
        walletClient.signTypedData as unknown as (args: Record<string, unknown>) => Promise<Hex>
      )({ account: address, ...typed });
      const result = await request.complete(signature);
      const clear = result[handle];
      if (typeof clear === "bigint") return clear;
      if (typeof clear === "number" || typeof clear === "string") return BigInt(clear);
      throw new Error("Zama returned an unusable private value");
    },
    [address, walletClient, zama.client, zama.ensureReady],
  );

  return {
    address,
    decryptHandle,
    ready: Boolean(address && walletClient),
    zamaStatus: zama.status,
    zamaError: zama.error,
    retryZama: zama.retry,
  };
}
