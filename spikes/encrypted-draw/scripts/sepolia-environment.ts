import * as hre from "hardhat";

const ZAMA_SEPOLIA = {
  acl: "0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D",
  coprocessor: "0x92C920834Ec8941d2C77D188936E1f7A6f49c127",
  kmsVerifier: "0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A",
  inputVerifier: "0xBBC1fFCdc7C316aAAd72E807D9b0272BE8F84DA0",
  hcuLimit: "0x594BB474275918AF9609814E68C61B1587c5F838",
} as const;

async function main(): Promise<void> {
  await hre.fhevm.initializeCLIApi();
  const [signer] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();
  const balance = await hre.ethers.provider.getBalance(signer.address);
  const latestBlock = await hre.ethers.provider.getBlock("latest");
  const feeData = await hre.ethers.provider.getFeeData();

  const codePresence: Record<string, boolean> = {};
  for (const [name, address] of Object.entries(ZAMA_SEPOLIA)) {
    codePresence[name] = (await hre.ethers.provider.getCode(address)) !== "0x";
  }

  console.log(
    JSON.stringify(
      {
        network: hre.network.name,
        chainId: network.chainId.toString(),
        walletAddress: signer.address,
        walletBalanceWei: balance.toString(),
        walletBalanceEth: hre.ethers.formatEther(balance),
        latestBlock: latestBlock?.number ?? null,
        latestBlockTimestamp: latestBlock?.timestamp ?? null,
        gasPriceWei: feeData.gasPrice?.toString() ?? null,
        maxFeePerGasWei: feeData.maxFeePerGas?.toString() ?? null,
        pluginMockMode: hre.fhevm.isMock,
        rpcProviderClass: "configured JSON-RPC; secret URL suppressed",
        zamaContracts: ZAMA_SEPOLIA,
        zamaContractCodePresent: codePresence,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
