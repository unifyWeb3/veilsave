import { FhevmType } from "@fhevm/hardhat-plugin";
import { expect } from "chai";
import { AbiCoder, Contract, ZeroHash } from "ethers";
import * as hre from "hardhat";

type Fixture = {
  asset: Contract;
  token: Contract;
  strategy: Contract;
  pool: Contract;
  controller: any;
  alice: any;
  bob: any;
  sponsor: any;
};

async function deployFixture(): Promise<Fixture> {
  const [controller, alice, bob, sponsor] = await hre.ethers.getSigners();
  const asset = await (await hre.ethers.getContractFactory("WithdrawalPublicAsset", controller)).deploy();
  await asset.waitForDeployment();
  const token = await (
    await hre.ethers.getContractFactory("WithdrawalConfidentialToken", controller)
  ).deploy(await asset.getAddress());
  await token.waitForDeployment();
  const strategy = await (
    await hre.ethers.getContractFactory("RetryableYieldVault", controller)
  ).deploy(await asset.getAddress());
  await strategy.waitForDeployment();
  const pool = await (
    await hre.ethers.getContractFactory("WithdrawalSettlementSpike", controller)
  ).deploy(await token.getAddress(), await asset.getAddress(), await strategy.getAddress());
  await pool.waitForDeployment();
  await hre.fhevm.assertCoprocessorInitialized(pool, "WithdrawalSettlementSpike");
  await hre.fhevm.assertCoprocessorInitialized(token, "WithdrawalConfidentialToken");

  for (const signer of [alice, bob, sponsor]) {
    await (await asset.mint(signer.address, 2_000_000n)).wait();
    await (await (asset.connect(signer) as Contract).approve(await token.getAddress(), 2_000_000n)).wait();
    await (await (token.connect(signer) as Contract).wrap(signer.address, 2_000_000n)).wait();
  }
  return { asset, token, strategy, pool, controller, alice, bob, sponsor };
}

async function encryptedInput(contract: Contract, signer: any, amount: bigint) {
  const input = hre.fhevm.createEncryptedInput(await contract.getAddress(), signer.address);
  input.add64(amount);
  return input.encrypt();
}

async function deposit(f: Fixture, signer: any, amount: bigint, kind = 0): Promise<void> {
  const input = await encryptedInput(f.token, signer, amount);
  const data = AbiCoder.defaultAbiCoder().encode(["uint8"], [kind]);
  const signerToken = f.token.connect(signer) as Contract;
  await (
    await signerToken
      ["confidentialTransferAndCall(address,bytes32,bytes,bytes)"](
        await f.pool.getAddress(),
        input.handles[0],
        input.inputProof,
        data,
      )
  ).wait();
}

async function withdraw(f: Fixture, signer: any, amount: bigint): Promise<void> {
  const input = await encryptedInput(f.pool, signer, amount);
  await (await (f.pool.connect(signer) as Contract).requestWithdrawal(input.handles[0], input.inputProof)).wait();
}

async function debug64(handle: string): Promise<bigint> {
  if (handle === ZeroHash) return 0n;
  return hre.fhevm.debugger.decryptEuint(FhevmType.euint64, handle);
}

async function state(f: Fixture, account: string) {
  return {
    principal: await debug64(await f.pool.principal(account)),
    weight: await debug64(await f.pool.drawWeight(account)),
    queued: await debug64(await f.pool.queued(account)),
    principalLiquidity: await debug64(await f.pool.principalLiquidity()),
    prizeReserve: await debug64(await f.pool.prizeReserve()),
    totalQueued: await debug64(await f.pool.totalQueued()),
    claimLiquidity: await debug64(await f.pool.claimLiquidity()),
  };
}

async function investAll(f: Fixture, clearAmount: bigint): Promise<void> {
  await (await f.pool.dispatchAllPrincipalLiquidity()).wait();
  const requestId = await f.pool.activeInvestmentRequestId();
  const reveal = await hre.fhevm.publicDecrypt([await f.token.unwrapAmount(requestId)]);
  await (await f.pool.finalizeInvestment(clearAmount, reveal.decryptionProof)).wait();
}

async function settle(f: Fixture, cap: bigint, clearAmount: bigint): Promise<void> {
  await (await f.pool.startSettlement(cap)).wait();
  const handle = await f.pool.activeSettlementAmount();
  const reveal = await hre.fhevm.publicDecrypt([handle]);
  await (await f.pool.finalizeSettlement(clearAmount, reveal.decryptionProof)).wait();
}

describe("WithdrawalSettlementSpike", function () {
  this.timeout(900_000);

  it("pays immediately from confidential principal liquidity and caps an over-request", async function () {
    const f = await deployFixture();
    await deposit(f, f.alice, 500_000n);
    const before = await debug64(await f.token.confidentialBalanceOf(f.alice.address));
    await withdraw(f, f.alice, 800_000n);
    const after = await debug64(await f.token.confidentialBalanceOf(f.alice.address));
    const values = await state(f, f.alice.address);
    expect(after - before).to.equal(500_000n);
    expect(values.principal).to.equal(0n);
    expect(values.weight).to.equal(0n);
    expect(values.queued).to.equal(0n);
    expect(values.principalLiquidity).to.equal(0n);
    expect(values.weight).to.be.lessThanOrEqual(values.principal);
  });

  it("queues multiple encrypted withdrawals, settles an aggregate, and pays correct users", async function () {
    const f = await deployFixture();
    await deposit(f, f.alice, 300_000n);
    await deposit(f, f.bob, 200_000n);
    await investAll(f, 500_000n);
    await withdraw(f, f.alice, 180_000n);
    await withdraw(f, f.bob, 120_000n);
    expect((await state(f, f.alice.address)).queued).to.equal(180_000n);
    expect((await state(f, f.bob.address)).queued).to.equal(120_000n);
    expect((await state(f, f.alice.address)).totalQueued).to.equal(300_000n);

    await settle(f, 300_000n, 300_000n);
    expect((await state(f, f.alice.address)).claimLiquidity).to.equal(300_000n);
    const aliceBefore = await debug64(await f.token.confidentialBalanceOf(f.alice.address));
    const bobBefore = await debug64(await f.token.confidentialBalanceOf(f.bob.address));
    await (await (f.pool.connect(f.alice) as Contract).claim()).wait();
    await (await (f.pool.connect(f.bob) as Contract).claim()).wait();
    expect((await debug64(await f.token.confidentialBalanceOf(f.alice.address))) - aliceBefore).to.equal(180_000n);
    expect((await debug64(await f.token.confidentialBalanceOf(f.bob.address))) - bobBefore).to.equal(120_000n);
    expect((await state(f, f.alice.address)).totalQueued).to.equal(0n);
    expect((await state(f, f.alice.address)).claimLiquidity).to.equal(0n);
  });

  it("supports partial settlement and preserves every unpaid encrypted claim", async function () {
    const f = await deployFixture();
    await deposit(f, f.alice, 200_000n);
    await deposit(f, f.bob, 100_000n);
    await investAll(f, 300_000n);
    await withdraw(f, f.alice, 150_000n);
    await withdraw(f, f.bob, 100_000n);
    await settle(f, 100_000n, 100_000n);
    await (await (f.pool.connect(f.alice) as Contract).claim()).wait();
    let alice = await state(f, f.alice.address);
    let bob = await state(f, f.bob.address);
    expect(alice.queued).to.equal(50_000n);
    expect(bob.queued).to.equal(100_000n);
    expect(alice.totalQueued).to.equal(150_000n);
    expect(alice.claimLiquidity).to.equal(0n);

    await settle(f, 150_000n, 150_000n);
    await (await (f.pool.connect(f.alice) as Contract).claim()).wait();
    await (await (f.pool.connect(f.bob) as Contract).claim()).wait();
    alice = await state(f, f.alice.address);
    bob = await state(f, f.bob.address);
    expect(alice.queued).to.equal(0n);
    expect(bob.queued).to.equal(0n);
    expect(alice.totalQueued).to.equal(0n);
  });

  it("retries the same settlement after strategy failure without burning the claim", async function () {
    const f = await deployFixture();
    await deposit(f, f.alice, 250_000n);
    await investAll(f, 250_000n);
    await withdraw(f, f.alice, 200_000n);
    await (await f.pool.startSettlement(200_000n)).wait();
    const handle = await f.pool.activeSettlementAmount();
    const reveal = await hre.fhevm.publicDecrypt([handle]);
    await (await f.strategy.setWithdrawalsPaused(true)).wait();
    await expect(f.pool.finalizeSettlement(200_000n, reveal.decryptionProof)).to.be.reverted;
    expect(await f.pool.activeSettlementAmount()).to.equal(handle);
    expect((await state(f, f.alice.address)).queued).to.equal(200_000n);
    expect((await state(f, f.alice.address)).totalQueued).to.equal(200_000n);

    await (await f.strategy.setWithdrawalsPaused(false)).wait();
    await (await f.pool.finalizeSettlement(200_000n, reveal.decryptionProof)).wait();
    await (await (f.pool.connect(f.alice) as Contract).claim()).wait();
    expect((await state(f, f.alice.address)).queued).to.equal(0n);
  });

  it("never uses the encrypted prize reserve to satisfy principal debt", async function () {
    const f = await deployFixture();
    await deposit(f, f.alice, 100_000n);
    await investAll(f, 100_000n);
    await deposit(f, f.sponsor, 500_000n, 1);
    await withdraw(f, f.alice, 100_000n);
    const values = await state(f, f.alice.address);
    expect(values.principalLiquidity).to.equal(0n);
    expect(values.prizeReserve).to.equal(500_000n);
    expect(values.queued).to.equal(100_000n);
    expect(values.claimLiquidity).to.equal(0n);
  });

  it("cannot pay a queued request twice", async function () {
    const f = await deployFixture();
    await deposit(f, f.alice, 100_000n);
    await investAll(f, 100_000n);
    await withdraw(f, f.alice, 100_000n);
    await settle(f, 100_000n, 100_000n);
    await (await (f.pool.connect(f.alice) as Contract).claim()).wait();
    const once = await debug64(await f.token.confidentialBalanceOf(f.alice.address));
    await (await (f.pool.connect(f.alice) as Contract).claim()).wait();
    const twice = await debug64(await f.token.confidentialBalanceOf(f.alice.address));
    expect(twice).to.equal(once);
    expect((await state(f, f.alice.address)).queued).to.equal(0n);
    expect((await state(f, f.alice.address)).totalQueued).to.equal(0n);
  });

  it("pauses new deposits without trapping an existing principal withdrawal", async function () {
    const f = await deployFixture();
    await deposit(f, f.alice, 100_000n);
    await (await f.pool.setDepositsPaused(true)).wait();
    await deposit(f, f.bob, 50_000n);
    expect(await f.pool.principal(f.bob.address)).to.equal(ZeroHash);
    await withdraw(f, f.alice, 100_000n);
    const alice = await state(f, f.alice.address);
    expect(alice.principal).to.equal(0n);
    expect(alice.queued).to.equal(0n);
  });
});
