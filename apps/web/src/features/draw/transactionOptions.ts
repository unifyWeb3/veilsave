export const VRF_REQUEST_GAS_LIMIT = 500_000n;

export function lifecycleGasLimit(action: string): bigint | undefined {
  // The validated Sepolia direct-funding path needed this explicit bound
  // because the wallet/RPC estimator undercounted the wrapper call. No other
  // lifecycle transaction inherits it, especially the FHE draw.
  return action === "request-vrf" ? VRF_REQUEST_GAS_LIMIT : undefined;
}
