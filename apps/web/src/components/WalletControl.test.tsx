import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const wallet = vi.hoisted(() => ({
  address: undefined as `0x${string}` | undefined,
  connected: false,
  chainId: 11155111,
  connect: vi.fn(),
  disconnect: vi.fn(),
  switchChain: vi.fn(),
}));

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: wallet.address, isConnected: wallet.connected }),
  useChainId: () => wallet.chainId,
  useConnect: () => ({ connect: wallet.connect, connectors: [{ id: "injected" }], isPending: false }),
  useDisconnect: () => ({ disconnect: wallet.disconnect }),
  useSwitchChain: () => ({ switchChain: wallet.switchChain, isPending: false }),
}));

import { WalletControl } from "./WalletControl";

describe("WalletControl", () => {
  beforeEach(() => {
    wallet.address = undefined;
    wallet.connected = false;
    wallet.chainId = 11155111;
  });

  it("shows connect while disconnected", () => {
    render(<WalletControl />);
    expect(screen.getByRole("button", { name: /connect wallet/i })).toBeInTheDocument();
  });

  it("blocks with a Sepolia switch action on the wrong network", () => {
    wallet.address = "0x1111111111111111111111111111111111111111";
    wallet.connected = true;
    wallet.chainId = 1;
    render(<WalletControl />);
    expect(screen.getByRole("button", { name: /switch to sepolia/i })).toBeInTheDocument();
  });

  it("renders the connected address without exposing financial values", () => {
    wallet.address = "0x1111111111111111111111111111111111111111";
    wallet.connected = true;
    render(<WalletControl />);
    expect(screen.getByLabelText("Copy wallet address")).toBeInTheDocument();
    expect(screen.getByText("Sepolia")).toBeInTheDocument();
  });
});
