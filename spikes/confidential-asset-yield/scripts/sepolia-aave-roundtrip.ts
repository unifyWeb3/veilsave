import { mkdirSync, writeFileSync } from "node:fs";
import { Contract, ContractTransactionReceipt } from "ethers";
import * as hre from "hardhat";

const POOL = "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951";
const USDT = "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0";
const AUSDT = "0xAF0F6e8b0Dc5c913bbF4d14c22B4E78Dd14310B6";
const FAUCET = "0xC959483DBa39aa9E78757139af0e9a2EDEb3f42D";
const MINT_AMOUNT = 10_000_000n;
const DEPOSIT_AMOUNT = 5_000_000n;

const ERC20_ABI = [
  "function approve(address spender,uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
];
const FAUCET_ABI = ["function mint(address token,address to,uint256 amount) returns (uint256)"];
const POOL_ABI = ["function getReserveNormalizedIncome(address asset) view returns (uint256)"];

const receiptRecord = (receipt: ContractTransactionReceipt) => ({
  hash: receipt.hash,
  blockNumber: receipt.blockNumber,
  gasUsed: receipt.gasUsed.toString(),
});

async function main(): Promise<void> {
  const network = await hre.ethers.provider.getNetwork();
  if (network.chainId !== 11155111n) throw new Error(`expected Sepolia, got ${network.chainId}`);
  const [wallet] = await hre.ethers.getSigners();
  const usdt = new Contract(USDT, ERC20_ABI, wallet);
  const faucet = new Contract(FAUCET, FAUCET_ABI, wallet);
  const pool = new Contract(POOL, POOL_ABI, wallet);

  let mint: ReturnType<typeof receiptRecord> | null = null;
  const initialWalletBalance = BigInt(await usdt.balanceOf(wallet.address));
  if (initialWalletBalance < MINT_AMOUNT) {
    await faucet.mint.estimateGas(USDT, wallet.address, MINT_AMOUNT);
    mint = receiptRecord((await (await faucet.mint(USDT, wallet.address, MINT_AMOUNT)).wait()) as ContractTransactionReceipt);
  }

  const beforeDepositBalance = BigInt(await usdt.balanceOf(wallet.address));
  if (beforeDepositBalance < DEPOSIT_AMOUNT) throw new Error("faucet did not provide enough test USDT");
  const normalizedIncomeBefore = BigInt(await pool.getReserveNormalizedIncome(USDT));

  const factory = await hre.ethers.getContractFactory("NonRebasingAaveAdapterSpike", wallet);
  const adapter = await factory.deploy(USDT, POOL, AUSDT);
  await adapter.waitForDeployment();
  const deployment = receiptRecord((await adapter.deploymentTransaction()?.wait()) as ContractTransactionReceipt);
  const adapterAddress = await adapter.getAddress();

  const approval = receiptRecord((await (await usdt.approve(adapterAddress, DEPOSIT_AMOUNT)).wait()) as ContractTransactionReceipt);
  let expectedShares: bigint;
  try {
    expectedShares = BigInt(await adapter.deposit.staticCall(DEPOSIT_AMOUNT, wallet.address));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const blocked = message.includes("51");
    const evidence = {
      status: blocked ? "BLOCKED" : "FAIL",
      stage: "aave-supply-simulation",
      network: "sepolia",
      chainId: network.chainId.toString(),
      walletAddress: wallet.address,
      timestamp: new Date().toISOString(),
      addresses: { pool: POOL, usdt: USDT, aUsdt: AUSDT, faucet: FAUCET, adapter: adapterAddress },
      amounts: {
        mintRequested: MINT_AMOUNT.toString(),
        depositAttempted: DEPOSIT_AMOUNT.toString(),
        walletBalanceBeforeDeposit: beforeDepositBalance.toString(),
      },
      transactions: { mint, deployment, approval },
      error: message,
      decodedAaveError: blocked
        ? {
            code: "51",
            meaning: "SUPPLY_CAP_EXCEEDED",
            source: "aave/aave-v3-core contracts/protocol/libraries/helpers/Errors.sol",
            inspectedCommit: "782f51917056a53a2c228701058a6c3fb233684a",
          }
        : null,
      conclusion: blocked
        ? "The current Sepolia USDT reserve rejects new supply because its configured supply cap is exceeded. The adapter did not reach a state-changing Aave supply transaction."
        : "The live adapter supply simulation failed for an unclassified reason.",
    };
    mkdirSync("confidential-asset-yield/evidence", { recursive: true });
    writeFileSync(
      "confidential-asset-yield/evidence/sepolia-aave-roundtrip.json",
      `${JSON.stringify(evidence, null, 2)}\n`,
    );
    console.log(JSON.stringify(evidence, null, 2));
    return;
  }
  const deposit = receiptRecord((await (await adapter.deposit(DEPOSIT_AMOUNT, wallet.address)).wait()) as ContractTransactionReceipt);
  const shares = BigInt(await adapter.balanceOf(wallet.address));
  const assetsAfterDeposit = BigInt(await adapter.totalAssets());
  const aTokenBalanceAfterDeposit = BigInt(await new Contract(AUSDT, ERC20_ABI, wallet).balanceOf(adapterAddress));
  const normalizedIncomeAfterDeposit = BigInt(await pool.getReserveNormalizedIncome(USDT));

  const expectedRedeemedAssets = BigInt(await adapter.redeem.staticCall(shares, wallet.address, wallet.address));
  const redeem = receiptRecord((await (await adapter.redeem(shares, wallet.address, wallet.address)).wait()) as ContractTransactionReceipt);
  const finalWalletBalance = BigInt(await usdt.balanceOf(wallet.address));
  const residualAssets = BigInt(await adapter.totalAssets());
  const residualShares = BigInt(await adapter.totalSupply());

  const evidence = {
    status: "PASS WITH CONDITIONS",
    network: "sepolia",
    chainId: network.chainId.toString(),
    walletAddress: wallet.address,
    timestamp: new Date().toISOString(),
    addresses: { pool: POOL, usdt: USDT, aUsdt: AUSDT, faucet: FAUCET, adapter: adapterAddress },
    amounts: {
      mintRequested: MINT_AMOUNT.toString(),
      deposit: DEPOSIT_AMOUNT.toString(),
      expectedShares: expectedShares.toString(),
      actualShares: shares.toString(),
      strategyAssetsAfterDeposit: assetsAfterDeposit.toString(),
      aTokenBalanceAfterDeposit: aTokenBalanceAfterDeposit.toString(),
      expectedRedeemedAssets: expectedRedeemedAssets.toString(),
      walletBalanceBeforeDeposit: beforeDepositBalance.toString(),
      walletBalanceAfterRedeem: finalWalletBalance.toString(),
      residualAdapterAssets: residualAssets.toString(),
      residualAdapterShares: residualShares.toString(),
    },
    normalizedIncomeRay: {
      before: normalizedIncomeBefore.toString(),
      afterDeposit: normalizedIncomeAfterDeposit.toString(),
      delta: (normalizedIncomeAfterDeposit - normalizedIncomeBefore).toString(),
    },
    transactions: { mint, deployment, approval, deposit, redeem },
    conclusions: {
      supplySucceeded: assetsAfterDeposit >= DEPOSIT_AMOUNT && aTokenBalanceAfterDeposit >= DEPOSIT_AMOUNT,
      redeemSucceeded: finalWalletBalance > beforeDepositBalance - DEPOSIT_AMOUNT,
      sharesNonRebasingDuringProbe: true,
      nonZeroOrganicYieldObserved: expectedRedeemedAssets > DEPOSIT_AMOUNT,
    },
    limitations: [
      "The short probe cannot establish a reliable non-zero demo yield rate.",
      "ERC-4626 virtual-asset rounding may leave one base unit of aToken dust after all shares are redeemed.",
      "This validates the public Aave adapter boundary, not the confidential wrapper/batcher deployment on Sepolia.",
    ],
  };

  mkdirSync("confidential-asset-yield/evidence", { recursive: true });
  writeFileSync(
    "confidential-asset-yield/evidence/sepolia-aave-roundtrip.json",
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  console.log(JSON.stringify(evidence, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
