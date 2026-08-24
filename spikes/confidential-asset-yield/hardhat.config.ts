import "@fhevm/hardhat-plugin";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-ethers";

import path from "node:path";
import type { HardhatUserConfig } from "hardhat/config";
import { vars } from "hardhat/config";

const mnemonic = vars.get("MNEMONIC", "test test test test test test test test test test test junk");
const infuraApiKey = vars.get("INFURA_API_KEY", "");
const sepoliaUrl = process.env.SEPOLIA_RPC_URL || (infuraApiKey
  ? `https://sepolia.infura.io/v3/${infuraApiKey}`
  : "https://1rpc.io/sepolia");

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: { accounts: { mnemonic }, chainId: 31337 },
    sepolia: {
      accounts: { mnemonic, path: "m/44'/60'/0'/0/", count: 10 },
      chainId: 11155111,
      url: sepoliaUrl,
    },
  },
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
