import { FhevmType } from "@fhevm/hardhat-plugin";
import { expect } from "chai";
import { AbiCoder, Contract, ZeroAddress } from "ethers";
import * as hre from "hardhat";

type PreparedEpoch = {
  winnerHandle: string;
  prizeHandle: string;
};

async function deploySpike(): Promise<Contract> {
  const [controller] = await hre.ethers.getSigners();
  const factory = await hre.ethers.getContractFactory("WinnerRevealAclSpike", controller);
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  await hre.fhevm.assertCoprocessorInitialized(contract, "WinnerRevealAclSpike");
  return contract;
}

async function prepareEpoch(
  contract: Contract,
  epochId: number,
  winner: string,
  prize: bigint,
): Promise<PreparedEpoch> {
  const [controller] = await hre.ethers.getSigners();
  const contractAddress = await contract.getAddress();
  const input = hre.fhevm.createEncryptedInput(contractAddress, controller.address);
  input.addAddress(winner).add64(prize);
  const encrypted = await input.encrypt();
  await (await contract.prepareEpoch(epochId, encrypted.handles[0], encrypted.handles[1], encrypted.inputProof)).wait();
  return {
    winnerHandle: await contract.encryptedWinner(epochId),
    prizeHandle: await contract.encryptedPrize(epochId),
  };
}

async function expectUserDecryptFailure(
  prizeHandle: string,
  contractAddress: string,
  signer: Awaited<ReturnType<typeof hre.ethers.getSigners>>[number],
): Promise<void> {
  let rejected = false;
  try {
    await hre.fhevm.userDecryptEuint(FhevmType.euint64, prizeHandle, contractAddress, signer);
  } catch {
    rejected = true;
  }
  expect(rejected).to.equal(true);
}

async function expectPublicDecryptFailure(prizeHandle: string): Promise<void> {
  let rejected = false;
  try {
    await hre.fhevm.publicDecryptEuint(FhevmType.euint64, prizeHandle);
  } catch {
    rejected = true;
  }
  expect(rejected).to.equal(true);
}

describe("WinnerRevealAclSpike", function () {
  this.timeout(900_000);

  it("verifies the public winner and grants prize access only to that winner", async function () {
    const [controller, winner, participant, arbitrary, keeper] = await hre.ethers.getSigners();
    const contract = await deploySpike();
    const contractAddress = await contract.getAddress();
    const prize = 424_242n;
    const prepared = await prepareEpoch(contract, 1, winner.address, prize);

    expect(await contract.isWinnerPubliclyDecryptable(1)).to.equal(true);
    expect(await contract.isPrizePubliclyDecryptable(1)).to.equal(false);
    await expectUserDecryptFailure(prepared.prizeHandle, contractAddress, winner);

    const reveal = await hre.fhevm.publicDecrypt([prepared.winnerHandle]);
    const keeperContract = contract.connect(keeper) as Contract;
    await (
      await keeperContract.finalizeWinner(1, reveal.abiEncodedClearValues, reveal.decryptionProof)
    ).wait();

    expect(await contract.status(1)).to.equal(2n);
    expect(await contract.finalizedWinner(1)).to.equal(winner.address);
    expect(await contract.isPrizeAllowed(1, contractAddress)).to.equal(true);
    expect(await contract.isPrizeAllowed(1, winner.address)).to.equal(true);
    expect(await contract.isPrizeAllowed(1, controller.address)).to.equal(false);
    expect(await contract.isPrizeAllowed(1, participant.address)).to.equal(false);
    expect(await contract.isPrizeAllowed(1, arbitrary.address)).to.equal(false);
    expect(await contract.isPrizeAllowed(1, keeper.address)).to.equal(false);

    expect(
      await hre.fhevm.userDecryptEuint(FhevmType.euint64, prepared.prizeHandle, contractAddress, winner),
    ).to.equal(prize);
    await expectUserDecryptFailure(prepared.prizeHandle, contractAddress, controller);
    await expectUserDecryptFailure(prepared.prizeHandle, contractAddress, participant);
    await expectUserDecryptFailure(prepared.prizeHandle, contractAddress, arbitrary);
    await expectUserDecryptFailure(prepared.prizeHandle, contractAddress, keeper);
    await expectPublicDecryptFailure(prepared.prizeHandle);
  });

  it("rejects a forged clear winner", async function () {
    const [, winner, forgedWinner] = await hre.ethers.getSigners();
    const contract = await deploySpike();
    const prepared = await prepareEpoch(contract, 1, winner.address, 7n);
    const reveal = await hre.fhevm.publicDecrypt([prepared.winnerHandle]);
    const forged = AbiCoder.defaultAbiCoder().encode(["address"], [forgedWinner.address]);

    await expect(contract.finalizeWinner(1, forged, reveal.decryptionProof)).to.be.reverted;
    expect(await contract.status(1)).to.equal(1n);
  });

  it("rejects a proof for another encrypted winner handle", async function () {
    const [, winnerOne, winnerTwo] = await hre.ethers.getSigners();
    const contract = await deploySpike();
    await prepareEpoch(contract, 1, winnerOne.address, 11n);
    const epochTwo = await prepareEpoch(contract, 2, winnerTwo.address, 22n);
    const revealTwo = await hre.fhevm.publicDecrypt([epochTwo.winnerHandle]);

    await expect(
      contract.finalizeWinner(1, revealTwo.abiEncodedClearValues, revealTwo.decryptionProof),
    ).to.be.reverted;
    expect(await contract.status(1)).to.equal(1n);
  });

  it("rejects a reveal assigned to an unknown epoch", async function () {
    const [, winner] = await hre.ethers.getSigners();
    const contract = await deploySpike();
    const prepared = await prepareEpoch(contract, 1, winner.address, 9n);
    const reveal = await hre.fhevm.publicDecrypt([prepared.winnerHandle]);

    await expect(
      contract.finalizeWinner(999, reveal.abiEncodedClearValues, reveal.decryptionProof),
    ).to.be.revertedWithCustomError(contract, "EpochNotRevealReady");
  });

  it("rejects replay after finalization", async function () {
    const [, winner] = await hre.ethers.getSigners();
    const contract = await deploySpike();
    const prepared = await prepareEpoch(contract, 1, winner.address, 9n);
    const reveal = await hre.fhevm.publicDecrypt([prepared.winnerHandle]);

    await (await contract.finalizeWinner(1, reveal.abiEncodedClearValues, reveal.decryptionProof)).wait();
    await expect(
      contract.finalizeWinner(1, reveal.abiEncodedClearValues, reveal.decryptionProof),
    ).to.be.revertedWithCustomError(contract, "EpochNotRevealReady");
  });

  it("finalizes a zero winner without granting prize access", async function () {
    const [, participant] = await hre.ethers.getSigners();
    const contract = await deploySpike();
    const contractAddress = await contract.getAddress();
    const prepared = await prepareEpoch(contract, 3, ZeroAddress, 123n);
    const reveal = await hre.fhevm.publicDecrypt([prepared.winnerHandle]);

    await (await contract.finalizeWinner(3, reveal.abiEncodedClearValues, reveal.decryptionProof)).wait();
    expect(await contract.status(3)).to.equal(3n);
    expect(await contract.finalizedWinner(3)).to.equal(ZeroAddress);
    expect(await contract.isPrizeAllowed(3, contractAddress)).to.equal(true);
    expect(await contract.isPrizeAllowed(3, participant.address)).to.equal(false);
    expect(await contract.isPrizeAllowed(3, ZeroAddress)).to.equal(false);
    expect(await contract.isPrizePubliclyDecryptable(3)).to.equal(false);
    await expectUserDecryptFailure(prepared.prizeHandle, contractAddress, participant);
    await expectPublicDecryptFailure(prepared.prizeHandle);
  });
});
