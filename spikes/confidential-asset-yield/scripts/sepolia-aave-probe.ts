import { mkdirSync, writeFileSync } from "node:fs";
import { Contract } from "ethers";
import * as hre from "hardhat";

const POOL = "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951";
const USDT = "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0";
const AUSDT = "0xAF0F6e8b0Dc5c913bbF4d14c22B4E78Dd14310B6";
const FAUCET = "0xC959483DBa39aa9E78757139af0e9a2EDEb3f42D";
const TEST_WALLET = "0x5FE738227ab4219bc317812a938dEf57489d444a";

const ERC20_ABI = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
];
const ATOKEN_ABI = [...ERC20_ABI, "function UNDERLYING_ASSET_ADDRESS() view returns (address)"];
const POOL_ABI = ["function getReserveNormalizedIncome(address asset) view returns (uint256)"];
const FAUCET_ABI = [
  "function isPermissioned() view returns (bool)",
  "function isMintable(address asset) view returns (bool)",
  "function getMaximumMintAmount() view returns (uint256)",
];

async function optionalRead<T>(read: () => Promise<T>): Promise<T | null> {
  try {
    return await read();
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const provider = hre.ethers.provider;
  const network = await provider.getNetwork();
  if (network.chainId !== 11155111n) throw new Error(`expected Sepolia, got ${network.chainId}`);

  const pool = new Contract(POOL, POOL_ABI, provider);
  const usdt = new Contract(USDT, ERC20_ABI, provider);
  const aUsdt = new Contract(AUSDT, ATOKEN_ABI, provider);
  const faucet = new Contract(FAUCET, FAUCET_ABI, provider);

  const [poolCode, usdtCode, aUsdtCode, faucetCode] = await Promise.all([
    provider.getCode(POOL),
    provider.getCode(USDT),
    provider.getCode(AUSDT),
    provider.getCode(FAUCET),
  ]);
  const [
    symbol,
    decimals,
    walletBalance,
    availableLiquidity,
    aTokenSupply,
    underlying,
    normalizedIncome,
  ] =
    await Promise.all([
      usdt.symbol(),
      usdt.decimals(),
      usdt.balanceOf(TEST_WALLET),
      usdt.balanceOf(AUSDT),
      aUsdt.totalSupply(),
      aUsdt.UNDERLYING_ASSET_ADDRESS(),
      pool.getReserveNormalizedIncome(USDT),
    ]);
  const [faucetPermissioned, faucetMintable, faucetMaximumWholeTokens] = await Promise.all([
    optionalRead<boolean>(() => faucet.isPermissioned()),
    optionalRead<boolean>(() => faucet.isMintable(USDT)),
    optionalRead<bigint>(() => faucet.getMaximumMintAmount()),
  ]);

  const addressesValid =
    poolCode !== "0x" &&
    usdtCode !== "0x" &&
    aUsdtCode !== "0x" &&
    String(underlying).toLowerCase() === USDT.toLowerCase() &&
    Number(decimals) === 6;
  const evidence = {
    status: addressesValid ? "PASS WITH CONDITIONS" : "FAIL",
    network: "sepolia",
    chainId: network.chainId.toString(),
    rpcProviderClass: "public JSON-RPC override or configured endpoint; no URL or secret recorded",
    walletAddress: TEST_WALLET,
    timestamp: new Date().toISOString(),
    addresses: { pool: POOL, usdt: USDT, aUsdt: AUSDT, faucet: FAUCET },
    codePresent: { pool: poolCode !== "0x", usdt: usdtCode !== "0x", aUsdt: aUsdtCode !== "0x", faucet: faucetCode !== "0x" },
    observations: {
      symbol,
      decimals: Number(decimals),
      aTokenUnderlying: underlying,
      normalizedIncomeRay: normalizedIncome.toString(),
      aTokenTotalSupply: aTokenSupply.toString(),
      availableUnderlyingAtAToken: availableLiquidity.toString(),
      testWalletUsdtBalance: walletBalance.toString(),
      faucet: {
        permissioned: faucetPermissioned,
        usdtMintable: faucetMintable,
        maximumWholeTokens: faucetMaximumWholeTokens?.toString() ?? null,
        currentPeripheryInterfaceFullySupported:
          faucetPermissioned !== null && faucetMintable !== null && faucetMaximumWholeTokens !== null,
      },
    },
    writeRoute: BigInt(walletBalance) > 0n
      ? "READY TO ATTEMPT"
      : faucetPermissioned === false && faucetMintable === true
        ? "READY TO MINT TEST USDT THEN ATTEMPT"
        : "BLOCKED: test wallet has no USDT and faucet is unavailable to this caller",
    limitations: [
      "This read-only probe does not prove supply, withdraw, or interest accrual.",
      "A positive normalized income or reserve balance does not guarantee non-zero yield during a demo window.",
      "The local adapter test uses sponsored mock accrual and is not organic yield evidence.",
    ],
  };

  mkdirSync("confidential-asset-yield/evidence", { recursive: true });
  writeFileSync(
    "confidential-asset-yield/evidence/sepolia-aave-probe.json",
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  console.log(JSON.stringify(evidence, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
