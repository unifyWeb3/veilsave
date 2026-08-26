import { describe, expect, it } from "vitest";

import { lifecycleGasLimit, VRF_REQUEST_GAS_LIMIT } from "./transactionOptions";

describe("draw lifecycle transaction options", () => {
  it("uses the validated explicit gas bound only for the Sepolia VRF request", () => {
    expect(lifecycleGasLimit("request-vrf")).toBe(VRF_REQUEST_GAS_LIMIT);
    expect(VRF_REQUEST_GAS_LIMIT).toBe(500_000n);
  });

  it("does not apply the VRF gas override to the FHE draw or other lifecycle writes", () => {
    expect(lifecycleGasLimit("execute-draw")).toBeUndefined();
    expect(lifecycleGasLimit("freeze")).toBeUndefined();
    expect(lifecycleGasLimit("finalize-winner")).toBeUndefined();
  });
});
