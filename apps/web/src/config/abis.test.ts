import { describe, expect, it } from "vitest";

import { tokenAbi } from "./abis";

describe("confidential token ABI", () => {
  it("models ERC-7984 transfer-and-call return data as an encrypted amount", () => {
    const transferAndCall = tokenAbi.find(
      (item) => item.type === "function" && item.name === "confidentialTransferAndCall",
    );

    expect(transferAndCall?.outputs).toEqual([{ type: "bytes32" }]);
  });
});
