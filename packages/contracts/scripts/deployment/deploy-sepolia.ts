import fs from "node:fs/promises";
import path from "node:path";

import { Contract, ZeroAddress, getAddress, keccak256, parseEther } from "ethers";
import * as hre from "hardhat";

const SEPOLIA_CHAIN_ID = 11155111n;
const REQUIRED_TIMELOCK_DELAY = 86_400n;
const REQUIRED_GATEWAY_CHAIN_ID = 10_901;
const COMPILED_ZAMA_EXECUTOR = getAddress("0x92C920834Ec8941d2C77D188936E1f7A6f49c127");
const COMPILED_ZAMA_KMS_VERIFIER = getAddress("0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A");
const COMPILED_ZAMA_ACL = getAddress("0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D");
const COMPILED_ZAMA_INPUT_VERIFIER = getAddress("0xBBC1fFCdc7C316aAAd72E807D9b0272BE8F84DA0");
const COMPILED_ZAMA_INPUT_VERIFICATION = getAddress("0x483b9dE06E4E4C7D35CCf5837A1668487406D955");
const COMPILED_ZAMA_DECRYPTION_VERIFIER = getAddress("0x5D8BD78e2ea6bbE41f26dFe9fdaEAa349e077478");
const DEFAULT_ZAMA_RELAYER_URL = "https://relayer.testnet.zama.org";

type DeploymentRecord = {
  address: string;
  deploymentTransaction: string;
  deploymentBlock: number;
  runtimeCodeHash: string;
  runtimeBytes: number;
  constructorArguments: unknown[];
};

type PackageManifest = {
  packageManager?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

function requiredAddress(name: string): string {
  try {
    return getAddress(required(name));
  } catch {
    throw new Error(`${name} must be a valid EVM address`);
  }
}

function requiredBigInt(name: string): bigint {
  const value = required(name);
  try {
    return BigInt(value);
  } catch {
    throw new Error(`${name} must be an integer`);
  }
}

async function requireCode(label: string, address: string): Promise<void> {
  const code = await hre.ethers.provider.getCode(address);
  if (code === "0x") throw new Error(`${label} has no runtime code at ${address}`);
}

async function deploymentRecord(
  contract: any,
  constructorArguments: unknown[],
): Promise<DeploymentRecord> {
  await contract.waitForDeployment();
  const transaction = contract.deploymentTransaction();
  if (!transaction) throw new Error("Deployment transaction is unavailable");
  const receipt = await transaction.wait();
  if (!receipt) throw new Error(`Deployment receipt is unavailable for ${transaction.hash}`);
  const address = getAddress(await contract.getAddress());
  const code = await hre.ethers.provider.getCode(address);
  if (code === "0x") throw new Error(`Deployment produced no runtime code at ${address}`);
  return {
    address,
    deploymentTransaction: transaction.hash,
    deploymentBlock: receipt.blockNumber,
    runtimeCodeHash: keccak256(code),
    runtimeBytes: (code.length - 2) / 2,
    constructorArguments,
  };
}

async function writeJson(file: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(
    file,
    `${JSON.stringify(value, (_, item) => (typeof item === "bigint" ? item.toString() : item), 2)}\n`,
    "utf8",
  );
}

async function readPackageManifest(file: string): Promise<PackageManifest> {
  return JSON.parse(await fs.readFile(file, "utf8")) as PackageManifest;
}

async function main(): Promise<void> {
  const network = await hre.ethers.provider.getNetwork();
  if (network.chainId !== SEPOLIA_CHAIN_ID) {
    throw new Error(`Refusing deployment on chain ${network.chainId}; expected Sepolia 11155111`);
  }

  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) throw new Error("No deployer signer is configured");
  const deployerAddress = getAddress(deployer.address);
  const deployerBalance = await hre.ethers.provider.getBalance(deployerAddress);
  const minimumBalance = BigInt(process.env.MIN_DEPLOYER_BALANCE_WEI ?? parseEther("0.05"));
  if (deployerBalance < minimumBalance) {
    throw new Error(
      `Deployer balance is below MIN_DEPLOYER_BALANCE_WEI (${minimumBalance.toString()} wei)`,
    );
  }

  const releaseVersion = required("RELEASE_VERSION");
  const sourceCommit = required("SOURCE_COMMIT");
  if (!/^[0-9a-fA-F]{7,64}$/.test(sourceCommit)) {
    throw new Error("SOURCE_COMMIT must be a 7-64 character hexadecimal commit identifier");
  }
  const safe = requiredAddress("SAFE_ADDRESS");
  const confidentialToken = requiredAddress("SEPOLIA_CUSDT_ADDRESS");
  const underlying = requiredAddress("SEPOLIA_UNDERLYING_ADDRESS");
  const confidentialWrapper = requiredAddress("SEPOLIA_CONFIDENTIAL_WRAPPER_ADDRESS");
  const zamaAcl = requiredAddress("SEPOLIA_ZAMA_ACL_ADDRESS");
  const fheExecutor = requiredAddress("SEPOLIA_FHE_EXECUTOR_ADDRESS");
  const kmsVerifier = requiredAddress("SEPOLIA_KMS_VERIFIER_ADDRESS");
  const inputVerifier = requiredAddress("SEPOLIA_INPUT_VERIFIER_ADDRESS");
  const inputVerificationVerifier = requiredAddress("SEPOLIA_ZAMA_INPUT_VERIFICATION_ADDRESS");
  const decryptionVerifier = requiredAddress("SEPOLIA_ZAMA_DECRYPTION_VERIFIER_ADDRESS");
  const gatewayChainId = Number(
    process.env.SEPOLIA_ZAMA_GATEWAY_CHAIN_ID ?? REQUIRED_GATEWAY_CHAIN_ID,
  );
  const relayerUrl = process.env.SEPOLIA_ZAMA_RELAYER_URL?.trim() ?? DEFAULT_ZAMA_RELAYER_URL;
  const vrfCoordinator = requiredAddress("SEPOLIA_VRF_COORDINATOR_ADDRESS");
  const vrfWrapper = requiredAddress("SEPOLIA_VRF_WRAPPER_ADDRESS");
  const timelockDelay = requiredBigInt("TIMELOCK_MIN_DELAY_SECONDS");
  if (timelockDelay !== REQUIRED_TIMELOCK_DELAY) {
    throw new Error(`TIMELOCK_MIN_DELAY_SECONDS must equal ${REQUIRED_TIMELOCK_DELAY}`);
  }
  if (confidentialWrapper !== confidentialToken) {
    throw new Error("The validated ERC-7984 cUSDT token must also be the configured wrapper");
  }
  if (fheExecutor !== COMPILED_ZAMA_EXECUTOR || kmsVerifier !== COMPILED_ZAMA_KMS_VERIFIER) {
    throw new Error(
      "Zama executor/KMS inputs do not match @fhevm/solidity 0.11.1 compiled Sepolia configuration",
    );
  }
  if (
    zamaAcl !== COMPILED_ZAMA_ACL ||
    inputVerifier !== COMPILED_ZAMA_INPUT_VERIFIER ||
    inputVerificationVerifier !== COMPILED_ZAMA_INPUT_VERIFICATION ||
    decryptionVerifier !== COMPILED_ZAMA_DECRYPTION_VERIFIER ||
    gatewayChainId !== REQUIRED_GATEWAY_CHAIN_ID ||
    relayerUrl !== DEFAULT_ZAMA_RELAYER_URL
  ) {
    throw new Error(
      "Zama ACL, verifier, gateway, or relayer inputs do not match the validated Sepolia SDK configuration",
    );
  }

  for (const [label, address] of [
    ["Safe", safe],
    ["cUSDT wrapper", confidentialToken],
    ["public underlying", underlying],
    ["Zama ACL", zamaAcl],
    ["Zama FHE executor", fheExecutor],
    ["Zama KMS verifier", kmsVerifier],
    ["Zama input verifier", inputVerifier],
    ["Chainlink VRF coordinator", vrfCoordinator],
    ["Chainlink VRF wrapper", vrfWrapper],
  ] as const) {
    await requireCode(label, address);
  }

  // These are EIP-712 verifier-domain addresses from the pinned Zama SDK,
  // not callable contracts. Their exact SDK values are checked above; bytecode
  // is intentionally not required at these addresses.

  const safeContract: any = new Contract(
    safe,
    [
      "function getThreshold() view returns (uint256)",
      "function getOwners() view returns (address[])",
    ],
    hre.ethers.provider,
  );
  const safeThreshold = await safeContract.getThreshold();
  const safeOwners = (await safeContract.getOwners()) as string[];
  if (safeThreshold !== 2n || safeOwners.length !== 3) {
    throw new Error("SAFE_ADDRESS must be a deployed Sepolia 2-of-3 Safe");
  }
  const normalizedSafeOwners = safeOwners.map((owner) => getAddress(owner));
  if (
    normalizedSafeOwners.some((owner) => owner === ZeroAddress) ||
    new Set(normalizedSafeOwners).size !== 3
  ) {
    throw new Error("SAFE_ADDRESS must have three distinct non-zero owners");
  }

  const token: any = new Contract(
    confidentialToken,
    [
      "function underlying() view returns (address)",
      "function decimals() view returns (uint8)",
      "function rate() view returns (uint256)",
      "function confidentialProtocolId() view returns (uint256)",
    ],
    hre.ethers.provider,
  );
  const underlyingToken: any = new Contract(
    underlying,
    ["function decimals() view returns (uint8)"],
    hre.ethers.provider,
  );
  const executor: any = new Contract(
    fheExecutor,
    ["function getInputVerifierAddress() view returns (address)"],
    hre.ethers.provider,
  );
  const wrapper: any = new Contract(
    vrfWrapper,
    [
      "function link() view returns (address)",
      "function calculateRequestPriceNative(uint32,uint32) view returns (uint256)",
      "function estimateRequestPriceNative(uint32,uint32,uint256) view returns (uint256)",
    ],
    hre.ethers.provider,
  );

  if (getAddress(await token.underlying()) !== underlying) {
    throw new Error("cUSDT underlying does not match SEPOLIA_UNDERLYING_ADDRESS");
  }
  if ((await token.decimals()) !== 6n || (await underlyingToken.decimals()) !== 6n) {
    throw new Error("cUSDT and public underlying must both use six decimals");
  }
  if ((await token.rate()) !== 1n) throw new Error("cUSDT wrapper rate must equal one");
  if ((await token.confidentialProtocolId()) !== 10001n) {
    throw new Error("cUSDT does not report the Sepolia confidential protocol ID 10001");
  }
  if (getAddress(await executor.getInputVerifierAddress()) !== inputVerifier) {
    throw new Error("Zama executor input-verifier getter does not match configured input verifier");
  }
  await wrapper.link();
  // Chainlink's live quote reads tx.gasprice. A bare eth_call supplies zero,
  // which can make a healthy wrapper appear to quote zero. Use the current
  // Sepolia gas price for both the explicit estimator and the simulated quote.
  const feeData = await hre.ethers.provider.getFeeData();
  const requestGasPrice = feeData.gasPrice;
  if (!requestGasPrice || requestGasPrice <= 0n) {
    throw new Error("Sepolia RPC did not provide a positive gas price for VRF preflight");
  }
  const estimatedNativeQuote = await wrapper.estimateRequestPriceNative(
    100_000,
    1,
    requestGasPrice,
  );
  const nativeQuote = await wrapper.calculateRequestPriceNative(100_000, 1, {
    gasPrice: requestGasPrice,
  });
  if (estimatedNativeQuote <= 0n || nativeQuote <= 0n) {
    throw new Error("Chainlink VRF wrapper returned a non-positive native request quote");
  }

  const poolArtifact = await hre.artifacts.readArtifact("ConfidentialPrizePool");
  const poolRuntimeBytes = (poolArtifact.deployedBytecode.length - 2) / 2;
  if (poolRuntimeBytes > 24_576) {
    throw new Error(
      `ConfidentialPrizePool runtime is ${poolRuntimeBytes} bytes; EIP-170 permits 24576`,
    );
  }

  const timelockArguments = [timelockDelay, [safe], [ZeroAddress], ZeroAddress];
  const timelock = await (
    await hre.ethers.getContractFactory(
      "@openzeppelin/contracts/governance/TimelockController.sol:TimelockController",
      deployer,
    )
  ).deploy(...timelockArguments);
  const timelockRecord = await deploymentRecord(timelock, timelockArguments);

  const strategyId = keccak256(Buffer.from(`VEILSAVE_TEST_YIELD_V1:${releaseVersion}`, "utf8"));
  const strategyArguments = [underlying, timelockRecord.address, safe, strategyId];
  const strategy = await (
    await hre.ethers.getContractFactory("DeterministicTestYieldVault", deployer)
  ).deploy(...strategyArguments);
  const strategyRecord = await deploymentRecord(strategy, strategyArguments);

  const controllerArguments = [
    confidentialToken,
    underlying,
    strategyRecord.address,
    safe,
    timelockRecord.address,
    safe,
  ];
  const controller = await (
    await hre.ethers.getContractFactory("SettlementController", deployer)
  ).deploy(...controllerArguments);
  const controllerRecord = await deploymentRecord(controller, controllerArguments);

  const vrfArguments = [vrfWrapper, safe, timelockRecord.address];
  const vrf: any = await (
    await hre.ethers.getContractFactory("PoolVrfAdapter", deployer)
  ).deploy(...vrfArguments);
  const vrfRecord = await deploymentRecord(vrf, vrfArguments);

  const poolDependencies = {
    confidentialToken,
    vrfAdapter: vrfRecord.address,
    settlementController: controllerRecord.address,
    bootstrapAuthority: safe,
    timelock: timelockRecord.address,
    pauseGuardian: safe,
  };
  const poolConfiguration = {
    epochDuration: 604_800,
    requestTimeout: 86_400,
    fulfillmentTimeout: 86_400,
    drawTimeout: 86_400,
    winnerAclDelayBlocks: 96,
    slotBondWei: "1000000000000000",
    liquidityTargetBps: 2_000,
  };
  const poolArguments = [poolDependencies, poolConfiguration];
  const pool = await (
    await hre.ethers.getContractFactory("ConfidentialPrizePool", deployer)
  ).deploy(...poolArguments);
  const poolRecord = await deploymentRecord(pool, poolArguments);

  const fundingWei = BigInt(process.env.VRF_INITIAL_FUNDING_WEI ?? "0");
  let fundingTransaction: string | null = null;
  if (fundingWei > 0n) {
    const transaction = await vrf.fund({ value: fundingWei });
    await transaction.wait();
    fundingTransaction = transaction.hash;
  }

  const safeTransactions = [
    {
      description: "Bind ConfidentialPrizePool into SettlementController",
      to: controllerRecord.address,
      value: "0",
      data: controller.interface.encodeFunctionData("bindPool", [poolRecord.address]),
    },
    {
      description: "Bind ConfidentialPrizePool into PoolVrfAdapter",
      to: vrfRecord.address,
      value: "0",
      data: vrf.interface.encodeFunctionData("bindPool", [poolRecord.address]),
    },
    {
      description: "Activate ConfidentialPrizePool and erase bootstrap authority",
      to: poolRecord.address,
      value: "0",
      data: pool.interface.encodeFunctionData("activate"),
    },
  ];

  const createdAt = new Date().toISOString();
  const [rootPackage, contractsPackage] = await Promise.all([
    readPackageManifest(path.resolve(__dirname, "../../../../package.json")),
    readPackageManifest(path.resolve(__dirname, "../../package.json")),
  ]);
  const dependencyVersions = {
    hardhat: contractsPackage.devDependencies?.hardhat,
    hardhatVerify: contractsPackage.devDependencies?.["@nomicfoundation/hardhat-verify"],
    fhevmSolidity: contractsPackage.dependencies?.["@fhevm/solidity"],
    fhevmHardhatPlugin: contractsPackage.devDependencies?.["@fhevm/hardhat-plugin"],
    fhevmMockUtils: contractsPackage.devDependencies?.["@fhevm/mock-utils"],
    zamaRelayerSdk: contractsPackage.devDependencies?.["@zama-fhe/relayer-sdk"],
    openzeppelinConfidentialContracts:
      contractsPackage.dependencies?.["@openzeppelin/confidential-contracts"],
    openzeppelinContracts: contractsPackage.dependencies?.["@openzeppelin/contracts"],
    ethers: contractsPackage.devDependencies?.ethers,
  };
  for (const [name, version] of Object.entries(dependencyVersions)) {
    if (!version) throw new Error(`Deployment metadata cannot resolve dependency ${name}`);
  }
  const defaultDirectory = path.resolve(
    __dirname,
    "../../../../deployments/sepolia",
    createdAt.replaceAll(":", "-").replaceAll(".", "-"),
  );
  const outputDirectory = path.resolve(process.env.DEPLOYMENT_OUTPUT_DIR ?? defaultDirectory);
  const draft = {
    schemaVersion: 1,
    product: "VeilSave",
    status: "AWAITING_SAFE_BOOTSTRAP",
    releaseVersion,
    sourceCommit,
    createdAt,
    chainId: Number(SEPOLIA_CHAIN_ID),
    build: {
      nodeVersion: process.version,
      packageManager: rootPackage.packageManager,
      solidityCompilerVersion: "0.8.27",
      evmTarget: "cancun",
      optimizer: {
        enabled: true,
        runs: 1,
        viaIR: true,
        bytecodeHash: "none",
      },
      dependencies: dependencyVersions,
    },
    sourceVerification: {
      provider: "Etherscan Sepolia",
      status: "PENDING",
      reportFile: "source-verification.json",
      requiredContracts: [
        "timelockController",
        "deterministicTestYieldVault",
        "settlementController",
        "poolVrfAdapter",
        "confidentialPrizePool",
      ],
    },
    deployer: deployerAddress,
    deployerBalanceBeforeWei: deployerBalance.toString(),
    external: {
      confidentialToken,
      underlyingToken: underlying,
      confidentialWrapper,
      acl: zamaAcl,
      fheExecutor,
      kmsVerifier,
      inputVerifier,
      inputVerificationVerifier,
      decryptionVerifier,
      gatewayChainId,
      relayerUrl,
      vrfCoordinator,
      vrfWrapper,
    },
    governance: {
      safe,
      guardian: safe,
      timelock: timelockRecord.address,
      timelockDelaySeconds: timelockDelay.toString(),
      openExecutor: true,
      selfAdmin: true,
    },
    configuration: {
      participantCapacity: 16,
      epochDurationSeconds: 604_800,
      requestTimeoutSeconds: 86_400,
      fulfillmentTimeoutSeconds: 86_400,
      drawTimeoutSeconds: 86_400,
      slotBondWei: "1000000000000000",
      winnerFinalityDelayBlocks: 96,
      liquidityTargetBps: 2_000,
      vrfConfirmations: 3,
      vrfCallbackGasLimit: 100_000,
      vrfWords: 1,
      strategyMode: "TEST_YIELD",
      strategyId,
    },
    contracts: {
      timelockController: timelockRecord,
      deterministicTestYieldVault: strategyRecord,
      settlementController: controllerRecord,
      poolVrfAdapter: vrfRecord,
      confidentialPrizePool: poolRecord,
    },
    vrfFunding: { amountWei: fundingWei.toString(), transaction: fundingTransaction },
    safeBootstrapTransactions: safeTransactions,
  };

  const safeBatch = {
    version: "1.0",
    chainId: SEPOLIA_CHAIN_ID.toString(),
    createdAt: Date.now(),
    meta: {
      name: `VeilSave ${releaseVersion} bootstrap`,
      description: "Reviewed one-time bind/bind/activate batch. Execute in this exact order.",
      txBuilderVersion: "1.18.0",
      createdFromSafeAddress: safe,
      createdFromOwnerAddress: "",
      checksum: "",
    },
    transactions: safeTransactions.map(({ to, value, data }) => ({
      to,
      value,
      data,
      contractMethod: null,
      contractInputsValues: null,
    })),
  };

  await writeJson(path.join(outputDirectory, "deployment-draft.json"), draft);
  await writeJson(path.join(outputDirectory, "safe-bootstrap-batch.json"), safeBatch);

  console.log(`VeilSave Sepolia contracts deployed; Safe bootstrap is still required.`);
  console.log(`Deployment draft: ${path.join(outputDirectory, "deployment-draft.json")}`);
  console.log(`Safe batch: ${path.join(outputDirectory, "safe-bootstrap-batch.json")}`);
  console.log(`ConfidentialPrizePool runtime: ${poolRecord.runtimeBytes} bytes`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
