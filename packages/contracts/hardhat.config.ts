import "@fhevm/hardhat-plugin";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import "hardhat-gas-reporter";

import path from "node:path";
import type { HardhatUserConfig } from "hardhat/config";

const sepoliaRpcUrl = process.env.SEPOLIA_RPC_URL ?? "http://127.0.0.1:8545";
const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY ?? "",
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      chainId: 31337,
    },
    sepolia: {
      accounts: deployerPrivateKey ? [deployerPrivateKey] : [],
      chainId: 11155111,
      url: sepoliaRpcUrl,
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
      optimizer: { enabled: true, runs: 1 },
      evmVersion: "cancun",
      viaIR: true,
    },
  },
};

export default config;
