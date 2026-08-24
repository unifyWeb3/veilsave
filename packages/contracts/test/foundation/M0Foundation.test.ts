import { expect } from "chai";
import hre from "hardhat";

describe("M0 repository foundation", function () {
  it("uses the frozen local chain configuration", function () {
    expect(hre.network.name).to.equal("hardhat");
    expect(hre.network.config.chainId).to.equal(31337);
  });

  it("loads the FHEVM mock runtime", async function () {
    expect(hre.fhevm).to.not.equal(undefined);
    expect(await hre.fhevm.isMock).to.equal(true);
  });
});
