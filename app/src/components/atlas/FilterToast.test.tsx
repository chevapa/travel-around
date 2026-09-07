// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FilterToast } from "./FilterToast";

describe("FilterToast", () => {
  it("shows the message", () => {
    render(<FilterToast message='Filtered by "castle"' />);
    expect(screen.getByText('Filtered by "castle"')).toBeInTheDocument();
  });

  it("shows no reset control when onReset is absent", () => {
    render(<FilterToast message="Filtered by HR" />);
    expect(screen.queryByText("Reset")).toBeNull();
  });

  it("calls onReset when the reset control is clicked", async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    render(<FilterToast message="Filtered by HR" onReset={onReset} />);
    await user.click(screen.getByText("Reset"));
    expect(onReset).toHaveBeenCalled();
  });

  it("announces itself to assistive tech as a status region", () => {
    render(<FilterToast message="Filtered by HR" />);
    expect(screen.getByRole("status")).toHaveTextContent("Filtered by HR");
  });
});
