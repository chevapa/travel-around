// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";
import { Legend } from "./Legend";

describe("Legend", () => {
  it("labels every count — never a bare number", () => {
    render(<Legend counts={{ loved: 31, fine: 11, unprinted: 74 }} />);
    expect(screen.getByText(/Printed · loved · 31/)).toBeInTheDocument();
    expect(screen.getByText(/Printed · fine · 11/)).toBeInTheDocument();
    expect(screen.getByText(/Not printed · 74/)).toBeInTheDocument();
  });

  it("dims the other rows when one is active", () => {
    const { container } = render(<Legend active="loved" onToggle={() => {}} />);
    const rows = container.querySelectorAll('[role="button"]');
    const opacities = Array.from(rows).map((r) => (r as HTMLElement).getAttribute("style"));
    expect(opacities[0]).toContain("opacity: 1"); // loved — active
    expect(opacities[1]).toContain("opacity: 0.55"); // fine — dimmed
    expect(opacities[2]).toContain("opacity: 0.55"); // unprinted — dimmed
  });

  it("calls onToggle with the row's key on click", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<Legend onToggle={onToggle} />);
    await user.click(screen.getByText(/Not printed/));
    expect(onToggle).toHaveBeenCalledWith("unprinted");
  });

  it("is keyboard-operable when interactive (role=button, Space/Enter toggle)", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<Legend onToggle={onToggle} />);
    const rows = screen.getAllByRole("button");
    rows[0].focus();
    await user.keyboard(" ");
    expect(onToggle).toHaveBeenCalledWith("loved");
    await user.keyboard("{Enter}");
    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it("is not interactive (no role/tabIndex) when onToggle is absent — it's just a key, not a filter", () => {
    render(<Legend />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("has no axe violations, interactive or static", async () => {
    const { container: staticContainer } = render(<Legend />);
    expect(await axe(staticContainer)).toHaveNoViolations();

    const { container: interactiveContainer } = render(<Legend onToggle={() => {}} active="loved" />);
    expect(await axe(interactiveContainer)).toHaveNoViolations();
  });
});
