import { useState } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Sheet } from "./Primitives";

function SheetHarness() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open deposit
      </button>
      <Sheet open={open} title="Deposit confidential funds" onClose={() => setOpen(false)}>
        <button type="button">Review amount</button>
        <button type="button">Confirm deposit</button>
      </Sheet>
    </>
  );
}

describe("Sheet", () => {
  it("traps focus, closes with Escape, and restores the launcher focus", async () => {
    const user = userEvent.setup();
    document.body.style.overflow = "auto";
    render(<SheetHarness />);

    const launcher = screen.getByRole("button", { name: "Open deposit" });
    await user.click(launcher);

    const dialog = screen.getByRole("dialog", { name: "Deposit confidential funds" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(document.body).toHaveStyle({ overflow: "hidden" });

    const close = within(dialog).getByRole("button", { name: "Close" });
    const confirm = within(dialog).getByRole("button", { name: "Confirm deposit" });
    await waitFor(() => expect(close).toHaveFocus());

    await user.tab({ shift: true });
    expect(confirm).toHaveFocus();

    await user.tab();
    expect(close).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body).toHaveStyle({ overflow: "auto" });
    expect(launcher).toHaveFocus();
  });
});
