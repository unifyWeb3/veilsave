import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createConfig, http, WagmiProvider } from "wagmi";
import { sepolia } from "wagmi/chains";

import { DeploymentStatus } from "@veilsave/shared";

import type { RuntimeConfig } from "../config/runtime";
import { SEPOLIA_CANDIDATE_READ_MODEL } from "../config/candidate";
import { DeploymentProvider, useDeployment } from "./DeploymentProvider";

const mockVerifyManifestCode = vi.fn();

vi.mock("../config/manifest", async (importOriginal) => {
  const original = await importOriginal<typeof import("../config/manifest")>();
  return {
    ...original,
    verifyManifestCode: (...args: unknown[]) => mockVerifyManifestCode(...args),
  };
});

const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [],
  transports: { [sepolia.id]: http("https://example.invalid") },
});

const runtime: RuntimeConfig = {
  chainId: 11155111,
  rpcUrl: "https://example.invalid",
  manifestUrl: "https://example.invalid/veilsave-sepolia.json",
  explorerUrl: "https://sepolia.etherscan.io",
};

function renderProvider() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  let latest: ReturnType<typeof useDeployment> | null = null;
  function Probe() {
    latest = useDeployment();
    return null;
  }
  render(
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <DeploymentProvider runtime={runtime}>
          <Probe />
        </DeploymentProvider>
      </QueryClientProvider>
    </WagmiProvider>,
  );
  return {
    latest: () => {
      if (!latest) throw new Error("DeploymentProvider did not render");
      return latest;
    },
  };
}

function stubFetch(handler: () => Promise<unknown>) {
  const fetchMock = vi.fn().mockImplementation(() => handler());
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const activeFixture = () => ({
  ...SEPOLIA_CANDIDATE_READ_MODEL,
  status: "ACTIVE",
  evidence: {
    hcuReportSha256: `0x${"1".repeat(64)}`,
    aclValidationSha256: `0x${"2".repeat(64)}`,
    gasReportSha256: `0x${"3".repeat(64)}`,
    aclValidatedAt: "2026-09-04T14:03:01.067Z",
  },
});

const codeChecksOk = [
  {
    label: "confidentialPrizePool",
    address: "0x6e543f7e6f3175824a2C36E37c09829200195D4d",
    expected: "0x0",
    actual: "0x0",
    ok: true,
  },
];

describe("DeploymentProvider manifest gate", () => {
  it("initializes read-only from the candidate without fetching the future ACTIVE manifest", async () => {
    const fetchMock = stubFetch(async () => ({ ok: false, status: 404, json: async () => ({}) }));
    mockVerifyManifestCode.mockResolvedValue(codeChecksOk);
    try {
      const handle = renderProvider();
      await vi.waitFor(() => expect(handle.latest().status).toBe("read-only"), {
        timeout: 10_000,
      });
      expect(handle.latest().status).not.toBe("ready");
      expect(handle.latest().source).toBe("candidate");
      expect(handle.latest().manifest?.status).toBe(DeploymentStatus.Rehearsal);
      expect(handle.latest().error).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
      expect(mockVerifyManifestCode).toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("keeps read-only when write readiness finds no ACTIVE manifest", async () => {
    stubFetch(async () => ({ ok: false, status: 404, json: async () => ({}) }));
    mockVerifyManifestCode.mockResolvedValue(codeChecksOk);
    try {
      const handle = renderProvider();
      await vi.waitFor(() => expect(handle.latest().status).toBe("read-only"), {
        timeout: 10_000,
      });
      await expect(handle.latest().ensureTransactionReady()).resolves.toBe(false);
      expect(handle.latest().status).toBe("read-only");
      expect(handle.latest().manifest?.status).toBe(DeploymentStatus.Rehearsal);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("promotes to ready only for a fetched ACTIVE manifest with verified bytecode", async () => {
    stubFetch(async () => ({ ok: true, status: 200, json: async () => activeFixture() }));
    mockVerifyManifestCode.mockResolvedValue(codeChecksOk);
    try {
      const handle = renderProvider();
      await vi.waitFor(() => expect(handle.latest().status).toBe("read-only"), {
        timeout: 10_000,
      });
      await expect(handle.latest().ensureTransactionReady()).resolves.toBe(true);
      await vi.waitFor(() => expect(handle.latest().status).toBe("ready"), {
        timeout: 10_000,
      });
      expect(handle.latest().source).toBe("active");
      expect(handle.latest().manifest?.status).toBe("ACTIVE");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("fails closed on bytecode mismatch: stays read-only, never ready", async () => {
    stubFetch(async () => ({ ok: true, status: 200, json: async () => activeFixture() }));
    mockVerifyManifestCode.mockImplementation(async (_client: unknown, manifest: unknown) =>
      (manifest as { status?: unknown }).status === "ACTIVE"
        ? Promise.reject(new Error("Deployment bytecode does not match"))
        : codeChecksOk,
    );
    try {
      const handle = renderProvider();
      await vi.waitFor(() => expect(handle.latest().status).toBe("read-only"), {
        timeout: 10_000,
      });
      // A tampered ACTIVE manifest must never promote, while verified reads stay up.
      await expect(handle.latest().ensureTransactionReady()).resolves.toBe(false);
      expect(handle.latest().status).toBe("read-only");
      expect(handle.latest().source).toBe("candidate");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("reports error when candidate verification fails and never touches writes", async () => {
    const fetchMock = stubFetch(async () => ({ ok: false, status: 404, json: async () => ({}) }));
    mockVerifyManifestCode.mockRejectedValue(new Error("Deployment bytecode does not match"));
    try {
      const handle = renderProvider();
      await vi.waitFor(() => expect(handle.latest().status).toBe("error"), {
        timeout: 10_000,
      });
      expect(handle.latest().manifest).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
