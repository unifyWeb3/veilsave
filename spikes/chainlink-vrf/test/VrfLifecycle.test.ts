import { expect } from "chai";
import { Contract, ContractTransactionReceipt, ZeroHash, keccak256, parseEther, toUtf8Bytes } from "ethers";
import * as hre from "hardhat";

const statusOf = async (contract: Contract, epochId: number): Promise<bigint> =>
  (await contract.epoch(epochId)).status as bigint;

async function deployFixture(): Promise<{ controller: any; outsider: any; wrapper: Contract; contract: Contract }> {
  const [controller, outsider] = await hre.ethers.getSigners();
  const wrapper = await (await hre.ethers.getContractFactory("MockVrfV2PlusWrapper", controller)).deploy();
  await wrapper.waitForDeployment();
  const contract = await (
    await hre.ethers.getContractFactory("VrfLifecycleSpike", controller)
  ).deploy(await wrapper.getAddress());
  await contract.waitForDeployment();
  await (
    await controller.sendTransaction({ to: await contract.getAddress(), value: parseEther("0.01") })
  ).wait();
  return { controller, outsider, wrapper, contract };
}

async function request(contract: Contract, epochId: number): Promise<bigint> {
  await (
    await contract.requestRandomness(epochId)
  ).wait();
  return (await contract.epoch(epochId)).requestId as bigint;
}

describe("VrfLifecycleSpike", function () {
  this.timeout(120_000);

  it("freezes state, requests once, stores randomness, and executes separately", async function () {
    const { contract, wrapper } = await deployFixture();
    const commitment = keccak256(toUtf8Bytes("epoch-1"));
    await (await contract.freezeEpoch(1, commitment)).wait();
    const requestId = await request(contract, 1);
    expect(await contract.epochForRequest(requestId)).to.equal(1n);

    const fulfillReceipt = (await (await wrapper.fulfill(requestId, [123n])).wait()) as ContractTransactionReceipt;
    expect(fulfillReceipt.gasUsed).to.be.lessThan(200_000n);
    const afterFulfill = await contract.epoch(1);
    expect(afterFulfill.status).to.equal(3n);
    expect(afterFulfill.randomWord).to.equal(123n);

    const drawReceipt = (await (await contract.executeDraw(1)).wait()) as ContractTransactionReceipt;
    expect(drawReceipt.hash).to.match(/^0x[0-9a-f]{64}$/);
    expect(await statusOf(contract, 1)).to.equal(4n);
  });

  it("rejects duplicate requests and post-request state mutation", async function () {
    const { contract } = await deployFixture();
    await (await contract.freezeEpoch(1, keccak256(toUtf8Bytes("a")))).wait();
    await request(contract, 1);
    await expect(contract.requestRandomness(1)).to.be.revertedWithCustomError(contract, "InvalidStatus");
    await expect(
      contract.updateFrozenCommitment(1, keccak256(toUtf8Bytes("changed"))),
    ).to.be.revertedWithCustomError(contract, "InvalidStatus");
  });

  it("binds out-of-order fulfillments to request IDs", async function () {
    const { contract, wrapper } = await deployFixture();
    await (await contract.freezeEpoch(1, keccak256(toUtf8Bytes("one")))).wait();
    await (await contract.freezeEpoch(2, keccak256(toUtf8Bytes("two")))).wait();
    const idOne = await request(contract, 1);
    const idTwo = await request(contract, 2);

    await (await wrapper.fulfill(idTwo, [222n])).wait();
    await (await wrapper.fulfill(idOne, [111n])).wait();
    expect((await contract.epoch(1)).randomWord).to.equal(111n);
    expect((await contract.epoch(2)).randomWord).to.equal(222n);
  });

  it("ignores unknown, duplicate, and empty callbacks without reverting", async function () {
    const { contract, wrapper } = await deployFixture();
    await (await contract.freezeEpoch(1, keccak256(toUtf8Bytes("callbacks")))).wait();
    const requestId = await request(contract, 1);

    await (await wrapper.fulfillTo(await contract.getAddress(), 999_999n, [7n])).wait();
    await (await wrapper.fulfillTo(await contract.getAddress(), requestId, [])).wait();
    expect(await statusOf(contract, 1)).to.equal(2n);

    await (await wrapper.fulfill(requestId, [7n])).wait();
    await (await wrapper.fulfill(requestId, [8n])).wait();
    expect((await contract.epoch(1)).randomWord).to.equal(7n);
    expect(await statusOf(contract, 1)).to.equal(3n);
  });

  it("rejects direct spoofing of the wrapper callback", async function () {
    const { contract, outsider } = await deployFixture();
    await expect(
      (contract.connect(outsider) as Contract).rawFulfillRandomWords(1, [1n]),
    ).to.be.revertedWithCustomError(contract, "OnlyVRFWrapperCanFulfill");
  });

  it("makes expiry terminal and never accepts late randomness or a reroll", async function () {
    const { contract, wrapper } = await deployFixture();
    await (await contract.freezeEpoch(1, keccak256(toUtf8Bytes("expiry")))).wait();
    const requestId = await request(contract, 1);
    const timeoutBlock = (await contract.epoch(1)).timeoutBlock as bigint;
    const current = BigInt(await hre.ethers.provider.getBlockNumber());
    const blocks = timeoutBlock - current + 1n;
    await hre.network.provider.send("hardhat_mine", [`0x${blocks.toString(16)}`]);
    await (await contract.expireEpoch(1)).wait();
    expect(await statusOf(contract, 1)).to.equal(5n);
    await (await wrapper.fulfill(requestId, [999n])).wait();
    expect((await contract.epoch(1)).randomWord).to.equal(0n);
    await expect(contract.requestRandomness(1)).to.be.revertedWithCustomError(contract, "InvalidStatus");
  });

  it("handles zero-address commitments as ordinary public state, not as a winner", async function () {
    const { contract, wrapper } = await deployFixture();
    await (await contract.freezeEpoch(1, ZeroHash)).wait();
    const requestId = await request(contract, 1);
    await (await wrapper.fulfill(requestId, [42n])).wait();
    expect(await statusOf(contract, 1)).to.equal(3n);
  });
});
