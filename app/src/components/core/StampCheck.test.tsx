// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { StampCheck } from "./StampCheck";

// Task 3 acceptance check: "StampCheck is fully keyboard-driven, and
// exposes role=checkbox + aria-checked." Also the CRIT 02 fix (AUDIT.md):
// unchecked is the empty box, never a faded label.
function Controlled({ initial = false }: { initial?: boolean }) {
  const [checked, setChecked] = useState(initial);
  return <StampCheck checked={checked} onChange={setChecked} aria-label="Printed and loved" />;
}

describe("StampCheck", () => {
  it("exposes role=checkbox and aria-checked", () => {
    render(<StampCheck checked aria-label="test" />);
    const box = screen.getByRole("checkbox", { name: "test" });
    expect(box).toHaveAttribute("aria-checked", "true");
  });

  it("toggles on click", async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    const box = screen.getByRole("checkbox");
    expect(box).toHaveAttribute("aria-checked", "false");
    await user.click(box);
    expect(box).toHaveAttribute("aria-checked", "true");
  });

  it("toggles on Space", async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    const box = screen.getByRole("checkbox");
    box.focus();
    await user.keyboard(" ");
    expect(box).toHaveAttribute("aria-checked", "true");
  });

  it("toggles on Enter", async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    const box = screen.getByRole("checkbox");
    box.focus();
    await user.keyboard("{Enter}");
    expect(box).toHaveAttribute("aria-checked", "true");
  });

  it("is reachable by Tab (tabIndex=0)", () => {
    render(<StampCheck checked={false} aria-label="test" />);
    expect(screen.getByRole("checkbox")).toHaveAttribute("tabIndex", "0");
  });

  it("renders no visible tick when unchecked — the empty box IS the unchecked state", () => {
    render(<StampCheck checked={false} aria-label="test" />);
    expect(screen.getByRole("checkbox").textContent).toBe("");
  });

  it("calls onChange with the next value, not the current one", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StampCheck checked={false} onChange={onChange} aria-label="test" />);
    await user.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
