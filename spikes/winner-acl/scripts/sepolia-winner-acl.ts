import { mkdirSync, writeFileSync } from "node:fs";
import { setDefaultResultOrder } from "node:dns";
import { AbiCoder, Contract, ContractTransactionReceipt, ZeroAddress, keccak256, parseEther } from "ethers";
import { FhevmType } from "@fhevm/hardhat-plugin";
import * as hre from "hardhat";

const PRIZE = 424_242n;

setDefaultResultOrder("ipv4first");

type DecryptAttempt = {
  role: string;
  address: string;
  rejected: boolean;
  error: string | null;
};

const compactError = (error: unknown): string => {
  const value = error instanceof Error ? error.message : String(error);
  return value.split("\n", 1)[0].slice(0, 240);
};

async function initializeWithRetry(): Promise<{ attempts: number; latencyMs: number; transientErrors: string[] }> {
  const started = Date.now();
  const transientErrors: string[] = [];
  for (let attempt = 1; attempt <= 8; ++attempt) {
    try {
      await hre.fhevm.initializeCLIApi();
      return { attempts: attempt, latencyMs: Date.now() - started, transientErrors };
    } catch (error) {
      transientErrors.push(compactError(error));
      if (attempt < 8) await new Promise((resolve) => setTimeout(resolve, 15_000));
    }
  }
  throw new Error(`FHE CLI initialization failed after 8 attempts: ${transientErrors.at(-1)}`);
}

async function encryptWithRetry(
  input: ReturnType<typeof hre.fhevm.createEncryptedInput>,
): Promise<{ encrypted: Awaited<ReturnType<typeof input.encrypt>>; attempts: number; transientErrors: string[] }> {
  const transientErrors: string[] = [];
  for (let attempt = 1; attempt <= 8; ++attempt) {
    try {
      return { encrypted: await input.encrypt(), attempts: attempt, transientErrors };
    } catch (error) {
      transientErrors.push(compactError(error));
      if (attempt < 8) await new Promise((resolve) => setTimeout(resolve, 15_000));
    }
  }
  throw new Error(`Encrypted input failed after 8 attempts: ${transientErrors.at(-1)}`);
}

async function prepareEpoch(
  contract: Contract,
  controller: Awaited<ReturnType<typeof hre.ethers.getSigners>>[number],
  epochId: number,
  winner: string,
  prize: bigint,
): Promise<{
  receipt: ContractTransactionReceipt;
  winnerHandle: string;
  prizeHandle: string;
  encryptionAttempts: number;
  encryptionErrors: string[];
}> {
  const contractAddress = await contract.getAddress();
  const input = hre.fhevm.createEncryptedInput(contractAddress, controller.address);
  input.addAddress(winner).add64(prize);
  const encryptedResult = await encryptWithRetry(input);
  const encrypted = encryptedResult.encrypted;
  const receipt = (await (
    await contract.prepareEpoch(epochId, encrypted.handles[0], encrypted.handles[1], encrypted.inputProof)
  ).wait()) as ContractTransactionReceipt;
  return {
    receipt,
    winnerHandle: await contract.encryptedWinner(epochId),
    prizeHandle: await contract.encryptedPrize(epochId),
    encryptionAttempts: encryptedResult.attempts,
    encryptionErrors: encryptedResult.transientErrors,
  };
}

async function waitForPublicDecrypt(handle: string): Promise<{
  result: Awaited<ReturnType<typeof hre.fhevm.publicDecrypt>>;
  attempts: number;
  latencyMs: number;
}> {
  const started = Date.now();
  let lastError: unknown;
  for (let attempt = 1; attempt <= 12; ++attempt) {
    try {
      return {
        result: await hre.fhevm.publicDecrypt([handle]),
        attempts: attempt,
        latencyMs: Date.now() - started,
      };
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 15_000));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function attemptUserDecrypt(
  role: string,
  signer: Awaited<ReturnType<typeof hre.ethers.getSigners>>[number],
  prizeHandle: string,
  contractAddress: string,
): Promise<DecryptAttempt> {
  try {
    await hre.fhevm.userDecryptEuint(FhevmType.euint64, prizeHandle, contractAddress, signer);
    return { role, address: signer.address, rejected: false, error: null };
  } catch (error) {
    return { role, address: signer.address, rejected: true, error: compactError(error) };
  }
}

async function waitForWinnerDecrypt(
  signer: Awaited<ReturnType<typeof hre.ethers.getSigners>>[number],
  prizeHandle: string,
  contractAddress: string,
): Promise<{ value: bigint; attempts: number; latencyMs: number }> {
  const started = Date.now();
  let lastError: unknown;
  for (let attempt = 1; attempt <= 12; ++attempt) {
    try {
      return {
        value: await hre.fhevm.userDecryptEuint(
          FhevmType.euint64,
          prizeHandle,
          contractAddress,
          signer,
        ),
        attempts: attempt,
        latencyMs: Date.now() - started,
      };
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 15_000));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function expectStaticRevert(action: () => Promise<unknown>): Promise<string> {
  try {
    await action();
  } catch (error) {
    return compactError(error);
  }
  throw new Error("expected static call to revert");
}

async function main(): Promise<void> {
  const initialization = await initializeWithRetry();
  const [controller, winner, participant, arbitrary, keeper] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();
  if (network.chainId !== 11155111n) throw new Error(`expected Sepolia, got ${network.chainId}`);

  // The disposable Hardhat mnemonic funds only account zero on this RPC. Fund the
  // distinct public finalizer once so this spike exercises permissionless proof
  // submission from a non-admin account. This is test setup, not protocol logic.
  const keeperBalanceBefore = await hre.ethers.provider.getBalance(keeper.address);
  let funding: { hash: string; gasUsed: string; amountWei: string } | null = null;
  if (keeperBalanceBefore < parseEther("0.005")) {
    const fundingTx = await controller.sendTransaction({
      to: keeper.address,
      value: parseEther("0.01"),
    });
    const fundingReceipt = (await fundingTx.wait()) as ContractTransactionReceipt;
    funding = {
      hash: fundingReceipt.hash,
      gasUsed: fundingReceipt.gasUsed.toString(),
      amountWei: parseEther("0.01").toString(),
    };
  }

  const factory = await hre.ethers.getContractFactory("WinnerRevealAclSpike", controller);
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  await hre.fhevm.assertCoprocessorInitialized(contract, "WinnerRevealAclSpike");
  const contractAddress = await contract.getAddress();
  const deploymentReceipt = (await contract.deploymentTransaction()?.wait()) as ContractTransactionReceipt;

  const epochOne = await prepareEpoch(contract, controller, 1, winner.address, PRIZE);
  const epochTwo = await prepareEpoch(contract, controller, 2, participant.address, 17n);
  const revealOne = await waitForPublicDecrypt(epochOne.winnerHandle);
  const revealTwo = await waitForPublicDecrypt(epochTwo.winnerHandle);

  const forgedCleartext = AbiCoder.defaultAbiCoder().encode(["address"], [arbitrary.address]);
  const wrongCleartextError = await expectStaticRevert(() =>
    contract.finalizeWinner.staticCall(1, forgedCleartext, revealOne.result.decryptionProof),
  );
  const wrongHandleError = await expectStaticRevert(() =>
    contract.finalizeWinner.staticCall(
      1,
      revealTwo.result.abiEncodedClearValues,
      revealTwo.result.decryptionProof,
    ),
  );
  const wrongEpochError = await expectStaticRevert(() =>
    contract.finalizeWinner.staticCall(
      999,
      revealOne.result.abiEncodedClearValues,
      revealOne.result.decryptionProof,
    ),
  );

  const beforeGrant = await attemptUserDecrypt(
    "winner-before-grant",
    winner,
    epochOne.prizeHandle,
    contractAddress,
  );
  if (!beforeGrant.rejected) throw new Error("winner decrypted prize before ACL grant");

  const finalizedAt = Date.now();
  const keeperContract = contract.connect(keeper) as Contract;
  const finalizeReceipt = (await (
    await keeperContract.finalizeWinner(
      1,
      revealOne.result.abiEncodedClearValues,
      revealOne.result.decryptionProof,
    )
  ).wait()) as ContractTransactionReceipt;

  const replayError = await expectStaticRevert(() =>
    contract.finalizeWinner.staticCall(
      1,
      revealOne.result.abiEncodedClearValues,
      revealOne.result.decryptionProof,
    ),
  );

  const winnerDecrypt = await waitForWinnerDecrypt(
    winner,
    epochOne.prizeHandle,
    contractAddress,
  );
  if (winnerDecrypt.value !== PRIZE) {
    throw new Error(`winner prize mismatch: ${winnerDecrypt.value}`);
  }

  const unauthorized = await Promise.all([
    attemptUserDecrypt("admin", controller, epochOne.prizeHandle, contractAddress),
    attemptUserDecrypt("participant", participant, epochOne.prizeHandle, contractAddress),
    attemptUserDecrypt("arbitrary", arbitrary, epochOne.prizeHandle, contractAddress),
    attemptUserDecrypt("keeper", keeper, epochOne.prizeHandle, contractAddress),
  ]);
  if (unauthorized.some((attempt) => !attempt.rejected)) {
    throw new Error("an unauthorized role decrypted the prize");
  }

  const publicPrizeError = await expectStaticRevert(() =>
    hre.fhevm.publicDecryptEuint(FhevmType.euint64, epochOne.prizeHandle),
  );

  const epochZero = await prepareEpoch(contract, controller, 3, ZeroAddress, 123n);
  const revealZero = await waitForPublicDecrypt(epochZero.winnerHandle);
  const zeroFinalizeReceipt = (await (
    await keeperContract.finalizeWinner(
      3,
      revealZero.result.abiEncodedClearValues,
      revealZero.result.decryptionProof,
    )
  ).wait()) as ContractTransactionReceipt;

  const latestBlock = await hre.ethers.provider.getBlock("latest");
  const evidence = {
    status: "PASS",
    network: "sepolia",
    chainId: network.chainId.toString(),
    walletAddress: controller.address,
    roles: {
      controller: controller.address,
      winner: winner.address,
      participant: participant.address,
      arbitrary: arbitrary.address,
      keeper: keeper.address,
    },
    contractAddress,
    deployment: {
      hash: deploymentReceipt.hash,
      blockNumber: deploymentReceipt.blockNumber,
      gasUsed: deploymentReceipt.gasUsed.toString(),
    },
    funding,
    epochOne: {
      winnerHandle: epochOne.winnerHandle,
      prizeHandle: epochOne.prizeHandle,
      prepare: {
        hash: epochOne.receipt.hash,
        blockNumber: epochOne.receipt.blockNumber,
        gasUsed: epochOne.receipt.gasUsed.toString(),
        encryptionAttempts: epochOne.encryptionAttempts,
        encryptionErrors: epochOne.encryptionErrors,
      },
      publicReveal: {
        clearWinner: revealOne.result.clearValues[epochOne.winnerHandle as `0x${string}`],
        proofHash: keccak256(revealOne.result.decryptionProof),
        proofBytes: (revealOne.result.decryptionProof.length - 2) / 2,
        attempts: revealOne.attempts,
        latencyMs: revealOne.latencyMs,
      },
      finalize: {
        submitter: keeper.address,
        hash: finalizeReceipt.hash,
        blockNumber: finalizeReceipt.blockNumber,
        gasUsed: finalizeReceipt.gasUsed.toString(),
      },
      finalizedWinner: await contract.finalizedWinner(1),
      statusValue: (await contract.status(1)).toString(),
      winnerDecrypt: {
        value: winnerDecrypt.value.toString(),
        attempts: winnerDecrypt.attempts,
        latencyMsFromFinalizationSubmission: Date.now() - finalizedAt,
        latencyMsFromFinalizationReceipt: winnerDecrypt.latencyMs,
      },
      acl: {
        contract: await contract.isPrizeAllowed(1, contractAddress),
        winner: await contract.isPrizeAllowed(1, winner.address),
        admin: await contract.isPrizeAllowed(1, controller.address),
        participant: await contract.isPrizeAllowed(1, participant.address),
        arbitrary: await contract.isPrizeAllowed(1, arbitrary.address),
        keeper: await contract.isPrizeAllowed(1, keeper.address),
        prizePubliclyDecryptable: await contract.isPrizePubliclyDecryptable(1),
      },
    },
    negativeTests: {
      beforeGrant,
      wrongCleartext: { rejected: true, error: wrongCleartextError },
      wrongHandle: { rejected: true, error: wrongHandleError },
      wrongEpoch: { rejected: true, error: wrongEpochError },
      replay: { rejected: true, error: replayError },
      publicPrize: { rejected: true, error: publicPrizeError },
      unauthorized,
    },
    zeroWinner: {
      prepareHash: epochZero.receipt.hash,
      encryptionAttempts: epochZero.encryptionAttempts,
      encryptionErrors: epochZero.encryptionErrors,
      finalizeHash: zeroFinalizeReceipt.hash,
      finalizeBlockNumber: zeroFinalizeReceipt.blockNumber,
      statusValue: (await contract.status(3)).toString(),
      finalizedWinner: await contract.finalizedWinner(3),
      participantAllowed: await contract.isPrizeAllowed(3, participant.address),
      prizePubliclyDecryptable: await contract.isPrizePubliclyDecryptable(3),
    },
    latestBlock: latestBlock?.number ?? null,
    latestBlockTimestamp: latestBlock?.timestamp ?? null,
    timestamp: new Date().toISOString(),
  };

  mkdirSync("winner-acl/evidence", { recursive: true });
  writeFileSync(
    "winner-acl/evidence/sepolia-winner-acl.json",
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  console.log(JSON.stringify(evidence, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
