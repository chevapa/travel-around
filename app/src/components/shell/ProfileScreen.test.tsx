// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";
import type { ExplorationStats } from "../../model/stats";
import { ProfileScreen } from "./ProfileScreen";

const STATS: ExplorationStats = {
  total: 10,
  explored: 4,
  loved: 3,
  fine: 1,
  unprinted: 6,
  wantReturn: 2,
  percent: 40,
  countryBreakdown: [
    { code: "hr", total: 6, explored: 4, percent: 67 },
    { code: "mk", total: 4, explored: 0, percent: 0 },
  ],
};

describe("ProfileScreen", () => {
  it("shows the overall percent and the explored/total counts", () => {
    render(<ProfileScreen stats={STATS} />);
    expect(screen.getByText("40%")).toBeInTheDocument();
    expect(screen.getByText("4 of 10 frames explored")).toBeInTheDocument();
  });

  it("shows a stat tile for each state, plus want-to-return", () => {
    render(<ProfileScreen stats={STATS} />);
    expect(screen.getByText("3")).toBeInTheDocument(); // loved
    expect(screen.getByText("Visited · loved")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument(); // fine
    expect(screen.getByText("6")).toBeInTheDocument(); // unprinted
    expect(screen.getByText("2")).toBeInTheDocument(); // wantReturn
    expect(screen.getByText("Want to return")).toBeInTheDocument();
  });

  it("shows a country breakdown row for the country given, even at 0%", () => {
    render(<ProfileScreen stats={STATS} />);
    expect(screen.getByText("HR")).toBeInTheDocument();
    expect(screen.getByText("67%")).toBeInTheDocument();
    expect(screen.getByText("MK")).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("shows no country section at all when the breakdown is empty", () => {
    render(<ProfileScreen stats={{ ...STATS, countryBreakdown: [] }} />);
    expect(screen.queryByText("By country")).toBeNull();
  });

  it("shows no close control when onClose is absent", () => {
    render(<ProfileScreen stats={STATS} />);
    expect(screen.queryByLabelText("Close profile")).toBeNull();
  });

  it("calls onClose when the close control is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ProfileScreen stats={STATS} onClose={onClose} />);
    await user.click(screen.getByLabelText("Close profile"));
    expect(onClose).toHaveBeenCalled();
  });

  it("has no axe violations", async () => {
    const { container } = render(<ProfileScreen stats={STATS} onClose={() => {}} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
