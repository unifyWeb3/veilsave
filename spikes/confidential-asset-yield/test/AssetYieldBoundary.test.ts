import { FhevmType } from "@fhevm/hardhat-plugin";
import { expect } from "chai";
import { AbiCoder, Contract, ContractTransactionReceipt, ZeroHash } from "ethers";
import * as hre from "hardhat";

type Fixture = {
  asset: Contract;
  token: Contract;
  vault: Contract;
  boundary: Contract;
  user: any;
  outsider: any;
};

async function deployFixture(): Promise<Fixture> {
  const [controller, user, outsider] = await hre.ethers.getSigners();
  const asset = await (await hre.ethers.getContractFactory("MockPublicAsset", controller)).deploy();
  await asset.waitForDeployment();
  const token = await (
    await hre.ethers.getContractFactory("SpikeConfidentialToken", controller)
  ).deploy(await asset.getAddress());
  await token.waitForDeployment();
  const vault = await (
    await hre.ethers.getContractFactory("SponsoredYieldVault", controller)
  ).deploy(await asset.getAddress());
  await vault.waitForDeployment();
  const boundary = await (
    await hre.ethers.getContractFactory("AssetYieldBoundarySpike", controller)
  ).deploy(await token.getAddress(), await asset.getAddress(), await vault.getAddress());
  await boundary.waitForDeployment();
  await hre.fhevm.assertCoprocessorInitialized(boundary, "AssetYieldBoundarySpike");

  await (await asset.mint(user.address, 1_000_000n)).wait();
  await (await asset.mint(controller.address, 1_000_000n)).wait();
  await (await (asset.connect(user) as Contract).approve(await token.getAddress(), 1_000_000n)).wait();
  await (await (token.connect(user) as Contract).wrap(user.address, 1_000_000n)).wait();

  return { asset, token, vault, boundary, user, outsider };
}

async function encryptForToken(token: Contract, user: any, amount: bigint) {
  const input = hre.fhevm.createEncryptedInput(await token.getAddress(), user.address);
  input.add64(amount);
  return input.encrypt();
}

async function transferAndCall(fixture: Fixture, amount: bigint, data = "0x") {
  const { token, boundary, user } = fixture;
  const encrypted = await encryptForToken(token, user, amount);
  const userToken = token.connect(user) as Contract;
  const tx = await userToken
    ["confidentialTransferAndCall(address,bytes32,bytes,bytes)"](
      await boundary.getAddress(),
      encrypted.handles[0],
      encrypted.inputProof,
      data,
    );
  return (await tx.wait()) as ContractTransactionReceipt;
}

async function decryptPrincipal(fixture: Fixture, account: string, signer: any): Promise<bigint> {
  const handle = await fixture.boundary.principal(account);
  return hre.fhevm.userDecryptEuint(
    FhevmType.euint64,
    handle,
    await fixture.boundary.getAddress(),
    signer,
  );
}

async function decryptAggregate(fixture: Fixture): Promise<bigint> {
  const handle = await fixture.boundary.aggregate();
  return hre.fhevm.debugger.decryptEuint(FhevmType.euint64, handle);
}

describe("AssetYieldBoundarySpike", function () {
  this.timeout(900_000);

  it("uses the actual callback amount and does not credit an over-request", async function () {
    const fixture = await deployFixture();
    const { token, boundary, user } = fixture;

    await transferAndCall(fixture, 250_000n);
    expect(await decryptPrincipal(fixture, user.address, user)).to.equal(250_000n);
    expect(await decryptAggregate(fixture)).to.equal(250_000n);
    expect(await hre.fhevm.debugger.decryptEuint(FhevmType.euint64, await token.confidentialBalanceOf(await boundary.getAddress()))).to.equal(250_000n);

    await transferAndCall(fixture, 900_000n);
    expect(await decryptPrincipal(fixture, user.address, user)).to.equal(250_000n);
    expect(await decryptAggregate(fixture)).to.equal(250_000n);
  });

  it("refunds a callback rejection without changing encrypted accounting", async function () {
    const fixture = await deployFixture();
    const { token, boundary, user } = fixture;
    const before = await hre.fhevm.debugger.decryptEuint(
      FhevmType.euint64,
      await token.confidentialBalanceOf(user.address),
    );
    const reject = AbiCoder.defaultAbiCoder().encode(["bool"], [false]);
    await transferAndCall(fixture, 100_000n, reject);
    expect(await hre.fhevm.debugger.decryptEuint(FhevmType.euint64, await token.confidentialBalanceOf(user.address))).to.equal(before);
    expect(await boundary.principal(user.address)).to.equal(ZeroHash);
    expect(await boundary.aggregate()).to.equal(ZeroHash);
    expect(await hre.fhevm.debugger.decryptEuint(FhevmType.euint64, await token.confidentialBalanceOf(await boundary.getAddress()))).to.equal(0n);
  });

  it("grants principal decryption to the depositor but not an arbitrary observer", async function () {
    const fixture = await deployFixture();
    const { boundary, user, outsider } = fixture;
    await transferAndCall(fixture, 100_000n);
    expect(await fixture.boundary.principalAllowed(user.address, user.address)).to.equal(true);
    expect(await fixture.boundary.principalAllowed(user.address, outsider.address)).to.equal(false);
    let rejected = false;
    try {
      await decryptPrincipal(fixture, user.address, outsider);
    } catch {
      rejected = true;
    }
    expect(rejected).to.equal(true);
  });

  it("publicly settles only the aggregate, then enters the public strategy", async function () {
    const fixture = await deployFixture();
    const { asset, boundary, token, vault, user } = fixture;
    await transferAndCall(fixture, 300_000n);
    const dispatchReceipt = (await (await boundary.dispatchAggregate()).wait()) as ContractTransactionReceipt;
    const requestId = await boundary.activeUnwrapRequestId();
    expect(requestId).to.not.equal(ZeroHash);
    expect(await boundary.aggregatePubliclyDecryptable()).to.equal(true);
    expect(await decryptAggregate(fixture)).to.equal(0n);

    const unwrapHandle = await token.unwrapAmount(requestId);
    const reveal = await hre.fhevm.publicDecrypt([unwrapHandle]);
    const shares = await boundary.finalizeAggregate.staticCall(300_000n, reveal.decryptionProof);
    await (await boundary.finalizeAggregate(300_000n, reveal.decryptionProof)).wait();

    expect(shares).to.be.greaterThan(0n);
    expect(await vault.balanceOf(await boundary.getAddress())).to.equal(shares);
    expect(await vault.totalAssets()).to.equal(300_000n);
    expect(await asset.balanceOf(await boundary.getAddress())).to.equal(0n);
    expect(dispatchReceipt.hash).to.match(/^0x[0-9a-f]{64}$/);
    expect(await boundary.activeUnwrapRequestId()).to.equal(ZeroHash);
    expect(await hre.fhevm.debugger.decryptEuint(FhevmType.euint64, await token.confidentialBalanceOf(await boundary.getAddress()))).to.equal(0n);
    expect(await decryptPrincipal(fixture, user.address, user)).to.equal(300_000n);
  });

  it("rejects a wrong public cleartext and allows retry with the same proof", async function () {
    const fixture = await deployFixture();
    const { boundary, token } = fixture;
    await transferAndCall(fixture, 200_000n);
    await (await boundary.dispatchAggregate()).wait();
    const requestId = await boundary.activeUnwrapRequestId();
    const reveal = await hre.fhevm.publicDecrypt([await token.unwrapAmount(requestId)]);
    await expect(boundary.finalizeAggregate(199_999n, reveal.decryptionProof)).to.be.reverted;
    expect(await boundary.activeUnwrapRequestId()).to.equal(requestId);
    await (await boundary.finalizeAggregate(200_000n, reveal.decryptionProof)).wait();
    expect(await boundary.activeUnwrapRequestId()).to.equal(ZeroHash);
  });

  it("round-trips sponsored strategy value back into confidential custody", async function () {
    const fixture = await deployFixture();
    const { asset, boundary, token, vault, user } = fixture;
    await transferAndCall(fixture, 400_000n);
    await (await boundary.dispatchAggregate()).wait();
    const requestId = await boundary.activeUnwrapRequestId();
    const reveal = await hre.fhevm.publicDecrypt([await token.unwrapAmount(requestId)]);
    await (await boundary.finalizeAggregate(400_000n, reveal.decryptionProof)).wait();

    await (await asset.mint(user.address, 50_000n)).wait();
    await (await (asset.connect(user) as Contract).approve(await vault.getAddress(), 50_000n)).wait();
    await (await (vault.connect(user) as Contract).sponsorYield(50_000n)).wait();
    expect(await vault.totalAssets()).to.equal(450_000n);

    await (await boundary.redeemAndRewrap()).wait();
    expect(await boundary.strategyShares()).to.equal(0n);
    expect(await asset.balanceOf(await boundary.getAddress())).to.equal(0n);
    expect(await hre.fhevm.debugger.decryptEuint(FhevmType.euint64, await token.confidentialBalanceOf(await boundary.getAddress()))).to.be.greaterThan(400_000n);
    expect(await hre.fhevm.debugger.decryptEuint(FhevmType.euint64, await boundary.lastRewrapped())).to.be.greaterThan(400_000n);
  });
});

describe("NonRebasingAaveAdapterSpike", function () {
  this.timeout(900_000);

  it("keeps shares fixed while an aToken-style balance accrues", async function () {
    const [admin, user] = await hre.ethers.getSigners();
    const asset = await (await hre.ethers.getContractFactory("MockPublicAsset", admin)).deploy();
    await asset.waitForDeployment();
    const pool = await (await hre.ethers.getContractFactory("MockAavePool", admin)).deploy(await asset.getAddress());
    await pool.waitForDeployment();
    const aToken = await (await hre.ethers.getContractFactory("MockAToken", admin)).deploy(await pool.getAddress());
    await aToken.waitForDeployment();
    await (await pool.setAToken(await aToken.getAddress())).wait();
    const adapter = await (
      await hre.ethers.getContractFactory("NonRebasingAaveAdapterSpike", admin)
    ).deploy(await asset.getAddress(), await pool.getAddress(), await aToken.getAddress());
    await adapter.waitForDeployment();

    await (await asset.mint(user.address, 1_000_000n)).wait();
    await (await (asset.connect(user) as Contract).approve(await adapter.getAddress(), 1_000_000n)).wait();
    const userAdapter = adapter.connect(user) as Contract;
    const shares = await userAdapter.deposit.staticCall(1_000_000n, user.address);
    await (await userAdapter.deposit(1_000_000n, user.address)).wait();
    expect(shares).to.equal(1_000_000n);
    expect(await adapter.totalAssets()).to.equal(1_000_000n);
    expect(await adapter.totalSupply()).to.equal(shares);

    await (await pool.accrueSponsoredYield(await adapter.getAddress(), 100_000n)).wait();
    expect(await adapter.totalAssets()).to.equal(1_100_000n);
    expect(await adapter.totalSupply()).to.equal(shares);
    expect(await adapter.convertToAssets(shares)).to.be.greaterThan(1_000_000n);

    const before = await asset.balanceOf(user.address);
    await (await userAdapter.redeem(shares, user.address, user.address)).wait();
    expect(await asset.balanceOf(user.address)).to.be.greaterThan(before);
    expect(await adapter.totalSupply()).to.equal(0n);
    expect(await adapter.totalAssets()).to.be.lessThanOrEqual(1n);
  });
});
