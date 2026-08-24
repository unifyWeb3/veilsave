import { useState } from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ConfidentialValue } from "../components/ConfidentialValue";
import { invalidatePrivateValues, usePrivateValue } from "./privacy";

function Harness({ identity, decrypt }: { identity: string; decrypt: () => Promise<bigint> }) {
  const [key, setKey] = useState(identity);
  const value = usePrivateValue({ identityKey: key, decrypt });
  return <>
    <ConfidentialValue label="Principal" status={value.status} value={value.value} onReveal={() => void value.reveal()} onRemask={value.remask} onRetry={() => void value.reveal()} error={value.error} />
    <button type="button" onClick={value.markStale}>Mark stale</button>
    <button type="button" onClick={() => setKey(`${identity}:next`)}>Change identity</button>
  </>;
}

describe("confidential value lifecycle", () => {
  it("starts masked and reveals only after an explicit action", async () => {
    const user = userEvent.setup();
    const decrypt = vi.fn(async () => 1_234_567n);
    render(<Harness identity="wallet:handle" decrypt={decrypt} />);

    expect(screen.getByLabelText("Principal private value hidden")).toBeInTheDocument();
    expect(decrypt).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Reveal" }));
    expect(await screen.findByText("1.234567 cUSDT")).toBeInTheDocument();
    expect(decrypt).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: "Hide" }));
    expect(screen.getByText("Remasked locally")).toBeInTheDocument();
  });

  it("clears plaintext when stale or when the account/handle identity changes", async () => {
    const user = userEvent.setup();
    render(<Harness identity="wallet:handle" decrypt={async () => 5_000_000n} />);
    await user.click(screen.getByRole("button", { name: "Reveal" }));
    expect(await screen.findByText("5.000000 cUSDT")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Mark stale" }));
    expect(screen.queryByText("5.000000 cUSDT")).not.toBeInTheDocument();
    expect(screen.getByText(/Reveal is stale/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Change identity" }));
    expect(screen.getByLabelText("Principal private value hidden")).toBeInTheDocument();
  });

  it("invalidates every revealed value after a state-changing operation", async () => {
    const user = userEvent.setup();
    render(<Harness identity="wallet:handle" decrypt={async () => 9_000_000n} />);
    await user.click(screen.getByRole("button", { name: "Reveal" }));
    expect(await screen.findByText("9.000000 cUSDT")).toBeInTheDocument();
    act(() => invalidatePrivateValues());
    expect(screen.queryByText("9.000000 cUSDT")).not.toBeInTheDocument();
    expect(screen.getByText(/Reveal is stale/i)).toBeInTheDocument();
  });
});
