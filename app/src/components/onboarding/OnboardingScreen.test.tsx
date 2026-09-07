// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Frame } from "../../model/frame";
import { OnboardingScreen } from "./OnboardingScreen";

const FRAMES: Frame[] = [
  { id: "near-castle", name: "Near Castle", state: "unprinted", lat: 0, lon: 0, driveMinutes: 40, distanceKm: 40, tags: ["castle"] },
  { id: "near-beach", name: "Near Beach", state: "unprinted", lat: 0, lon: 0, driveMinutes: 50, distanceKm: 50, tags: ["beach"] },
  { id: "far-castle", name: "Far Castle", state: "unprinted", lat: 0, lon: 0, driveMinutes: 150, distanceKm: 150, tags: ["castle"] },
  { id: "loved-castle", name: "Loved Castle", state: "loved", lat: 0, lon: 0, driveMinutes: 30, distanceKm: 30, tags: ["castle"] },
];

describe("OnboardingScreen", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) } as Response));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the questionnaire first, not a result", () => {
    render(<OnboardingScreen frames={FRAMES} onLetsGo={() => {}} onSkip={() => {}} />);
    expect(screen.getByText("How far?")).toBeInTheDocument();
    expect(screen.getByText("What do you want?")).toBeInTheDocument();
    expect(screen.queryByText("Today")).toBeNull();
  });

  it("reveals a matching unprinted place after 'Show place →', never a loved one", async () => {
    const user = userEvent.setup();
    render(<OnboardingScreen frames={FRAMES} onLetsGo={() => {}} onSkip={() => {}} />);
    await user.click(screen.getByText("castle")); // mood
    await user.click(screen.getByText("Show place →"));
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Near Castle" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Loved Castle" })).toBeNull();
  });

  it("respects the chosen distance bucket", async () => {
    const user = userEvent.setup();
    render(<OnboardingScreen frames={FRAMES} onLetsGo={() => {}} onSkip={() => {}} />);
    await user.click(screen.getByText("Up to 1h")); // excludes Far Castle (150 min)
    await user.click(screen.getByText("castle"));
    await user.click(screen.getByText("Show place →"));
    expect(screen.getByRole("heading", { name: "Near Castle" })).toBeInTheDocument();
  });

  it("falls back to the wider pool rather than a dead end when the mood has no match in range", async () => {
    const user = userEvent.setup();
    const noWater = FRAMES.filter((f) => f.id !== "far-castle");
    render(<OnboardingScreen frames={noWater} onLetsGo={() => {}} onSkip={() => {}} />);
    await user.click(screen.getByText("water")); // no frame has this tag at all
    await user.click(screen.getByText("Show place →"));
    // Falls back to the distance-only pool (mid, default) rather than showing nothing.
    expect(screen.getByText("Today")).toBeInTheDocument();
  });

  it("disables 'Show place →' when literally nothing is available", () => {
    render(<OnboardingScreen frames={[]} onLetsGo={() => {}} onSkip={() => {}} />);
    expect(screen.getByText("Show place →").closest("button")).toBeDisabled();
    expect(screen.getByText(/No unvisited places fit that yet/)).toBeInTheDocument();
  });

  it("calls onLetsGo with the revealed frame's id", async () => {
    const user = userEvent.setup();
    const onLetsGo = vi.fn();
    render(<OnboardingScreen frames={FRAMES} onLetsGo={onLetsGo} onSkip={() => {}} />);
    await user.click(screen.getByText("castle"));
    await user.click(screen.getByText("Show place →"));
    await user.click(screen.getByText("Let's go →"));
    expect(onLetsGo).toHaveBeenCalledWith("near-castle");
  });

  it("calls onSkip when 'Skip →' is clicked", async () => {
    const user = userEvent.setup();
    const onSkip = vi.fn();
    render(<OnboardingScreen frames={FRAMES} onLetsGo={() => {}} onSkip={onSkip} />);
    await user.click(screen.getByText("Skip →"));
    expect(onSkip).toHaveBeenCalled();
  });
});
