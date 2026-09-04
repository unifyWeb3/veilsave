import { DeploymentStatus, StrategyMode, type VeilSaveDeploymentManifest } from "@veilsave/shared";

/**
 * Audited Sepolia candidate read model.
 *
 * This is NOT an ACTIVE release manifest. It exists so the console can display
 * genuine public Sepolia state before the create-only release command issues
 * the ACTIVE manifest after epoch 2. Every address and runtime code hash below
 * was verified against live Sepolia chain state (see docs/release) and is
 * re-verified in the browser at runtime by `verifyManifestCode` before any
 * read is enabled. Transaction controls never unlock from this artifact:
 * writes require `status === "ready"`, which only a fetched, schema-valid
 * ACTIVE manifest with matching runtime bytecode can produce.
 *
 * Source: deployments/sepolia/2026-08-26T14-47-13-829Z (deployment-draft.json,
 * post-deploy-audit.json, source-verification.json). `sourceCommit` names the
 * audited source revision that produced the deployed bytecode.
 */
export type CandidateReadModel = Omit<VeilSaveDeploymentManifest, "status" | "evidence"> & {
  status: DeploymentStatus.Rehearsal;
  evidence: null;
};

export const SEPOLIA_CANDIDATE_READ_MODEL: CandidateReadModel = {
  schemaVersion: 1,
  product: "VeilSave",
  releaseVersion: "0.1.0",
  sourceCommit: "ba56718",
  status: DeploymentStatus.Rehearsal,
  chainId: 11155111,
  deploymentBlock: 11571533,
  contracts: {
    timelockController: {
      address: "0x6aE428EE7f575720A7d696e566193A7484A8ff84",
      deploymentTransaction: "0xffdf0cd43600531eb92af66373ffb994942dc3484eb28fd3dc54001d672c3de1",
      runtimeCodeHash: "0x55b4aa2e389f3dea87705315083756984234bc74a579bebcc96ebd0609f542be",
      verifiedSourceUrl:
        "https://sepolia.etherscan.io/address/0x6aE428EE7f575720A7d696e566193A7484A8ff84#code",
    },
    confidentialPrizePool: {
      address: "0x6e543f7e6f3175824a2C36E37c09829200195D4d",
      deploymentTransaction: "0x26413275407a550146e2e5b51f18600141723526873e9352936dee3633982e88",
      runtimeCodeHash: "0x96729278491e3925da9fd819df77f1d193135c9de4926046d294ad2cba35028f",
      verifiedSourceUrl:
        "https://sepolia.etherscan.io/address/0x6e543f7e6f3175824a2C36E37c09829200195D4d#code",
    },
    poolVrfAdapter: {
      address: "0x23bD336d4E42Aa70DAea529C0EB75Ca98e3CeeEC",
      deploymentTransaction: "0x1325363c3bb05f3c040d00c51d7632a78fc9584a054237f6320aac18ab79c85a",
      runtimeCodeHash: "0x7d0efe4bb6ac0353bd987138f5f7adfba2c0f464fc3949578937a615929c910f",
      verifiedSourceUrl:
        "https://sepolia.etherscan.io/address/0x23bD336d4E42Aa70DAea529C0EB75Ca98e3CeeEC#code",
    },
    settlementController: {
      address: "0x8CF1984Aa1F3eE119aDCa5901DD58C28fb19589c",
      deploymentTransaction: "0xfb4c46482483869d513c8535ea3825e68bbc56e51d93e4f398253bdf53ad4ce2",
      runtimeCodeHash: "0x90b4f70711e9031fa2dc952b01dab62fab53dfda08d80c14eae7956b82bbec2d",
      verifiedSourceUrl:
        "https://sepolia.etherscan.io/address/0x8CF1984Aa1F3eE119aDCa5901DD58C28fb19589c#code",
    },
    deterministicTestYieldVault: {
      address: "0x70d70205a992aE5e02e628EEcD8AE54Ce65Da529",
      deploymentTransaction: "0x8bb868f5be8236713c204328dad6bb66475de0f2e294eaf5007e8536be65420f",
      runtimeCodeHash: "0x509c31d274de8c70f8a90bbd025152f5d548d135beba313a33e18db378eed7de",
      verifiedSourceUrl:
        "https://sepolia.etherscan.io/address/0x70d70205a992aE5e02e628EEcD8AE54Ce65Da529#code",
    },
  },
  external: {
    confidentialToken: "0x4E7B06D78965594eB5EF5414c357ca21E1554491",
    underlyingToken: "0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0",
    confidentialWrapper: "0x4E7B06D78965594eB5EF5414c357ca21E1554491",
    acl: "0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D",
    fheExecutor: "0x92C920834Ec8941d2C77D188936E1f7A6f49c127",
    kmsVerifier: "0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A",
    inputVerifier: "0xBBC1fFCdc7C316aAAd72E807D9b0272BE8F84DA0",
    inputVerificationVerifier: "0x483b9dE06E4E4C7D35CCf5837A1668487406D955",
    decryptionVerifier: "0x5D8BD78e2ea6bbE41f26dFe9fdaEAa349e077478",
    gatewayChainId: 10901,
    relayerUrl: "https://relayer.testnet.zama.org",
    vrfCoordinator: "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B",
    vrfWrapper: "0x195f15F2d49d693cE265b4fB0fdDbE15b1850Cc1",
    runtimeCodeHashes: {
      confidentialToken: "0x864cc9ad53b338b82da1f7cab85ab0b3d5c8861acb422b6fec63cf36234f36a6",
      underlyingToken: "0x8af98e1e713811b600f06c8c7ae4834e974efc30de6eebdb746e0aaa39718269",
      acl: "0x864cc9ad53b338b82da1f7cab85ab0b3d5c8861acb422b6fec63cf36234f36a6",
      fheExecutor: "0x864cc9ad53b338b82da1f7cab85ab0b3d5c8861acb422b6fec63cf36234f36a6",
      kmsVerifier: "0x864cc9ad53b338b82da1f7cab85ab0b3d5c8861acb422b6fec63cf36234f36a6",
      inputVerifier: "0x864cc9ad53b338b82da1f7cab85ab0b3d5c8861acb422b6fec63cf36234f36a6",
      vrfCoordinator: "0x5e22d4163e7c1b059a946f0600759a4d38eb3e04592d0e359def022cec36bdbc",
      vrfWrapper: "0x079cd722dd7b8789bdb5f313d032e4f8fe66bb75e93f07acd6ec33b50d1dc42b",
    },
    proxyImplementations: {
      confidentialToken: {
        address: "0xAe37b998d453E1FaBE85DD46cf04295ca4A3af04",
        runtimeCodeHash: "0x9db9008ab50ad9be8181aa629fb2afec2294a1f641b3e5c4f80bee68a05f8491",
      },
      acl: {
        address: "0xF4f793e6a2eF47DE60A94c0bC412292da5F7aB98",
        runtimeCodeHash: "0xff97165836a1171bfb656f8fd3727958c92860f4f6b06ef9a2e83ec01e51acb8",
      },
      fheExecutor: {
        address: "0x0cfB37566E0CEEBaF9eE244225aEe14cECD4d170",
        runtimeCodeHash: "0xa1686b73959ada4b036e0a65173fe8b9e437f22c961c5ce9c5dff7e27cc516be",
      },
      kmsVerifier: {
        address: "0xe90451e8Cc1c96faA5D59b4386ef5145F2d55ed0",
        runtimeCodeHash: "0xf1f402f9b25b5c4c9f61d9038e631cf4d1fc5fce1408ec3661b709b372988bf1",
      },
      inputVerifier: {
        address: "0xFcb7F9B69b169678e3fA2798FB0db49534834766",
        runtimeCodeHash: "0x129960744a0869e2febf708f515cfd402e104325d5d742b622b666a976c67cf3",
      },
    },
  },
  asset: {
    symbol: "cUSDT",
    decimals: 6,
    wrapperRate: "1",
  },
  strategy: {
    address: "0x70d70205a992aE5e02e628EEcD8AE54Ce65Da529",
    asset: "0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0",
    id: "0x42125bb3f4e2cd81ac8a71378e59ae7e230ff85849b64a6a47db9e7d818a32d5",
    mode: StrategyMode.TestYield,
    deploymentBlock: 11571534,
  },
  vrf: {
    confirmations: 3,
    callbackGasLimit: 100000,
    words: 1,
  },
  pool: {
    participantCapacity: 16,
    epochDurationSeconds: 604800,
    slotBondWei: "1000000000000000",
    winnerFinalityDelayBlocks: 96,
    strategyTimelockSeconds: 86400,
  },
  governance: {
    safe: "0x429F46ADdDe54E4b05493C87d121efb75e3e9711",
    safeRuntimeCodeHash: "0xd7d408ebcd99b2b70be43e20253d6d92a8ea8fab29bd3be7f55b10032331fb4c",
    safeSingleton: {
      address: "0x29fcB43b46531BcA003ddC8FCB67FFE91900C762",
      runtimeCodeHash: "0xb1f926978a0f44a2c0ec8fe822418ae969bd8c3f18d61e5103100339894f81ff",
    },
    timelock: "0x6aE428EE7f575720A7d696e566193A7484A8ff84",
    guardian: "0x429F46ADdDe54E4b05493C87d121efb75e3e9711",
    timelockOpenExecutor: true,
    timelockSelfAdmin: true,
  },
  evidence: null,
};

function isAddress(value: unknown): value is `0x${string}` {
  return typeof value === "string" && /^0x[0-9a-fA-F]{40}$/.test(value);
}

function isHash(value: unknown): value is `0x${string}` {
  return typeof value === "string" && /^0x[0-9a-fA-F]{64}$/.test(value);
}

/**
 * Structural guard for the bundled candidate. This never grants transaction
 * authority; it only confirms the artifact is the rehearsal-shaped read model
 * before runtime bytecode verification decides whether reads may proceed.
 */
export function validateCandidateReadModel(input: unknown): CandidateReadModel {
  const model = input as Record<string, unknown>;
  if (typeof model !== "object" || model === null)
    throw new Error("Candidate read model is malformed");
  if (model.product !== "VeilSave") throw new Error("Candidate product mismatch");
  if (model.status !== DeploymentStatus.Rehearsal)
    throw new Error("Candidate read model must stay REHEARSAL; it can never be ACTIVE");
  if (model.chainId !== 11155111) throw new Error("Candidate chain mismatch");
  if (model.evidence !== null && model.evidence !== undefined)
    throw new Error("Candidate read model must not carry release evidence");
  const contracts = model.contracts as Record<string, Record<string, unknown> | undefined>;
  for (const key of [
    "timelockController",
    "confidentialPrizePool",
    "poolVrfAdapter",
    "settlementController",
    "deterministicTestYieldVault",
  ]) {
    const entry = contracts?.[key];
    if (!entry || !isAddress(entry.address) || !isHash(entry.runtimeCodeHash)) {
      throw new Error(`Candidate contract ${key} is malformed`);
    }
  }
  const pool = model.pool as Record<string, unknown> | undefined;
  if (
    pool?.participantCapacity !== 16 ||
    pool?.epochDurationSeconds !== 604_800 ||
    pool?.slotBondWei !== "1000000000000000" ||
    pool?.winnerFinalityDelayBlocks !== 96 ||
    pool?.strategyTimelockSeconds !== 86_400
  ) {
    throw new Error("Candidate pool configuration differs from the frozen release");
  }
  const strategy = model.strategy as Record<string, unknown> | undefined;
  if (strategy?.mode !== StrategyMode.TestYield && strategy?.mode !== StrategyMode.LiveStrategy) {
    throw new Error("Candidate strategy mode is unsupported");
  }
  return input as CandidateReadModel;
}
