import fs from "node:fs/promises";
import path from "node:path";

import * as hre from "hardhat";

type ContractRecord = {
  address: string;
  constructorArguments: unknown[];
};

type Draft = {
  chainId: number;
  contracts: Record<string, ContractRecord>;
};

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

async function main(): Promise<void> {
  required("ETHERSCAN_API_KEY");
  const draftPath = path.resolve(required("DEPLOYMENT_DRAFT_PATH"));
  const draft = JSON.parse(await fs.readFile(draftPath, "utf8")) as Draft;
  const network = await hre.ethers.provider.getNetwork();
  if (network.chainId !== 11155111n || draft.chainId !== 11155111) {
    throw new Error("Source verification is restricted to the recorded Sepolia deployment");
  }

  const targets = [
    {
      key: "timelockController",
      contract: "@openzeppelin/contracts/governance/TimelockController.sol:TimelockController",
    },
    {
      key: "deterministicTestYieldVault",
      contract: "contracts/DeterministicTestYieldVault.sol:DeterministicTestYieldVault",
    },
    {
      key: "settlementController",
      contract: "contracts/SettlementController.sol:SettlementController",
    },
    {
      key: "poolVrfAdapter",
      contract: "contracts/PoolVrfAdapter.sol:PoolVrfAdapter",
    },
    {
      key: "confidentialPrizePool",
      contract: "contracts/ConfidentialPrizePool.sol:ConfidentialPrizePool",
    },
  ] as const;

  const results: Array<{
    contract: string;
    address: string;
    verifiedSourceUrl: string;
  }> = [];
  for (const target of targets) {
    const record = draft.contracts[target.key];
    if (!record) throw new Error(`Deployment draft is missing ${target.key}`);
    await hre.run("verify:verify", {
      address: record.address,
      constructorArguments: record.constructorArguments,
      contract: target.contract,
    });
    results.push({
      contract: target.key,
      address: record.address,
      verifiedSourceUrl: `https://sepolia.etherscan.io/address/${record.address}#code`,
    });
  }

  const report = {
    schemaVersion: 1,
    product: "VeilSave",
    chainId: 11155111,
    verifiedAt: new Date().toISOString(),
    status: "PASS",
    contracts: results,
  };
  const reportPath = path.join(path.dirname(draftPath), "source-verification.json");
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Source verification passed: ${reportPath}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
