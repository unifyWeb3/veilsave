import "@fhevm/hardhat-plugin";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-ethers";

import path from "node:path";
import type { HardhatUserConfig } from "hardhat/config";
import { vars } from "hardhat/config";

const mnemonic = vars.get("MNEMONIC", "test test test test test test test test test test test junk");

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: { hardhat: { accounts: { mnemonic }, chainId: 31337 } },
  paths: {
    root: __dirname,
    sources: path.join(__dirname, "contracts"),
    tests: path.join(__dirname, "test"),
    cache: path.join(__dirname, "cache"),
    artifacts: path.join(__dirname, "artifacts"),
  },
  solidity: {
    version: "0.8.27",
    settings: {
      metadata: { bytecodeHash: "none" },
      optimizer: { enabled: true, runs: 800 },
      evmVersion: "cancun",
      viaIR: true,
    },
  },
};

export default config;
