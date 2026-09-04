import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { createConfig, http, WagmiProvider } from "wagmi";
import { sepolia } from "wagmi/chains";

import { ConsoleApp } from "./ConsoleApp";

const mockUseDeployment = vi.fn();
const mockUseProtocolSnapshot = vi.fn();
const mockUseEpochSnapshot = vi.fn();
const mockUseEpochEvidence = vi.fn();
const mockUsePublicHistory = vi.fn();

vi.mock("../providers/DeploymentProvider", () => ({
  useDeployment: () => mockUseDeployment(),
}));

vi.mock("../protocol/useProtocolSnapshot", () => ({
  useProtocolSnapshot: () => mockUseProtocolSnapshot(),
  useEpochSnapshot: (...args: unknown[]) => mockUseEpochSnapshot(...args),
}));

vi.mock("../protocol/useEpochEvidence", () => ({
  useEpochEvidence: (...args: unknown[]) => mockUseEpochEvidence(...args),
}));

vi.mock("../protocol/usePublicHistory", () => ({
  usePublicHistory: () => mockUsePublicHistory(),
}));

vi.mock("../providers/ZamaProvider", () => ({
  useZama: () => ({ status: "idle", client: null, error: null, ensureReady: vi.fn(), retry: vi.fn() }),
  ZamaProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("./WalletControl", () => ({
  WalletControl: () => <div data-testid="wallet-control" />,
}));

vi.mock("./ProtocolHealth", () => ({
  ProtocolHealth: () => <div data-testid="protocol-health" />,
}));

const queryClient = new QueryClient();
const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [],
  transports: { [sepolia.id]: http("https://example.invalid") },
});

function wrap(ui: React.ReactNode) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/app"]}>{ui}</MemoryRouter>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

function setupDeploymentError() {
  mockUseDeployment.mockReturnValue({
    manifest: null,
    codeChecks: [],
    status: "error",
    error: "Deployment manifest request failed (404)",
    retry: vi.fn(),
    runtime: {
      chainId: 11155111,
      rpcUrl: "https://example.invalid",
      manifestUrl: "https://example.invalid/veilsave-sepolia.json",
      explorerUrl: "https://sepolia.etherscan.io",
    },
  });
}

function setupOfflineSnapshot() {
  mockUseProtocolSnapshot.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: true,
    error: new Error("RPC unavailable"),
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof import("../protocol/useProtocolSnapshot").useProtocolSnapshot>);
  mockUseEpochSnapshot.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
  } as unknown as ReturnType<typeof import("../protocol/useProtocolSnapshot").useEpochSnapshot>);
  mockUseEpochEvidence.mockReturnValue({
    data: undefined,
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof import("../protocol/useEpochEvidence").useEpochEvidence>);
  mockUsePublicHistory.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof import("../protocol/usePublicHistory").usePublicHistory>);
}

describe("ConsoleApp deployment gate", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it("keeps shell, error banner, and read-only dashboard when DeploymentProvider is error", async () => {
    setupDeploymentError();
    setupOfflineSnapshot();

    render(
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/app"]}>
            <Routes>
              <Route path="/app/*" element={<ConsoleApp />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </WagmiProvider>,
    );

    // shell
    expect(screen.getByText("Sepolia · VeilSave console")).toBeInTheDocument();
    expect(screen.getAllByRole("navigation", { name: "Primary" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /Dashboard/i }).length).toBeGreaterThan(0);

    // error banner stays visible
    expect(screen.getByText("Deployment validation stopped")).toBeInTheDocument();
    expect(screen.getByText(/Deployment manifest request failed/)).toBeInTheDocument();

    // read-only dashboard still mounted (PoolOverview fallback) – shows offline not fake data
    expect(screen.getByText("Public pool state is unavailable")).toBeInTheDocument();
    expect(screen.queryByText("1.234567 cUSDT")).not.toBeInTheDocument();

    // no write enabled – no enabled Deposit/Withdraw in offline state
    expect(screen.queryByRole("button", { name: "Deposit" })).not.toBeInTheDocument();
  });

  it("keeps ConsolePrivacy renderable under deployment error", async () => {
    setupDeploymentError();
    setupOfflineSnapshot();

    render(
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/app/privacy"]}>
            <Routes>
              <Route path="/app/*" element={<ConsoleApp />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </WagmiProvider>,
    );

    expect(screen.getByText("Deployment validation stopped")).toBeInTheDocument();
    // ConsolePrivacy content
    expect(screen.getAllByRole("heading", { name: "Privacy" }).length).toBeGreaterThan(0);
    expect(screen.getByText("Confidential financial amounts, not transaction-graph anonymity.")).toBeInTheDocument();
    expect(screen.getAllByText(/What stays private, what stays public/).length).toBeGreaterThan(0);
  });

  it("does not invoke writes when deployment is error", async () => {
    setupDeploymentError();
    setupOfflineSnapshot();
    const writeSpy = vi.fn();
    render(
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/app"]}>
            <Routes>
              <Route path="/app/*" element={<ConsoleApp />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </WagmiProvider>,
    );
    // offline state has no Deposit button – no write path reachable
    expect(screen.queryByRole("button", { name: "Deposit" })).not.toBeInTheDocument();
    expect(writeSpy).not.toHaveBeenCalled();
  });

  it("hides stale operation recovery controls while deployment validation is failing", () => {
    setupDeploymentError();
    setupOfflineSnapshot();
    window.localStorage.setItem(
      "veilsave.operations.v1",
      JSON.stringify([
        {
          id: "veilsave:slot-reservation:0xabc",
          kind: "slot-reservation",
          chainId: 11155111,
          wallet: "0x1111111111111111111111111111111111111111",
          publicId: "0xabc",
          expectedState: "slot-reserved",
          lastCheckedAt: Date.now(),
          retryable: true,
          createdAt: Date.now(),
        },
      ]),
    );

    render(
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/app"]}>
            <Routes>
              <Route path="/app/*" element={<ConsoleApp />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </WagmiProvider>,
    );

    expect(screen.getByText("Deployment validation stopped")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Resume" })).not.toBeInTheDocument();
  });
});
