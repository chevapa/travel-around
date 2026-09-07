// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { markOnboardingSeen } from "./lib/onboardingStorage";

// Issue 141: Recommend is the default landing screen once onboarding is
// done (CLAUDE.md §2 — the user opens the app with a question, not a map
// to browse), with a fast, obvious path to and from The Atlas (CLAUDE.md
// §7). Issue 59: a first-time-only onboarding pass sits in front of both.
describe("App — screen switching (issues 59, 141)", () => {
  beforeEach(() => {
    localStorage.clear();
    // No real network calls for any card's Wikipedia photo lookup.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) } as Response));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows onboarding first, for a browser that's never seen it", () => {
    render(<App />);
    expect(screen.getByText("Where to today?")).toBeInTheDocument();
    expect(screen.getByText("How far?")).toBeInTheDocument();
  });

  it("skips straight to onboarding's 'Skip →' and lands on Recommend", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText("Skip →"));
    expect(screen.queryByText("How far?")).toBeNull();
    expect(screen.getByText("★ Let's go!")).toBeInTheDocument();
  });

  it("opens the chosen frame's card on The Atlas after onboarding's 'Let's go →'", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText("Show place →"));
    const name = screen.getByRole("heading", { level: 2 }).textContent;
    await user.click(screen.getByText("Let's go →"));
    expect(screen.getByText("The Atlas")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3 }).textContent).toBe(name);
  });

  it("lands on Recommend by default once onboarding has already been seen", () => {
    markOnboardingSeen();
    render(<App />);
    expect(screen.getByText("Where to today?")).toBeInTheDocument();
    expect(screen.queryByText("How far?")).toBeNull();
  });

  it("switches to The Atlas via 'View on map', and back via 'Recommend'", async () => {
    markOnboardingSeen();
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText("View on map →"));
    expect(screen.getByText("The Atlas")).toBeInTheDocument();
    expect(screen.queryByText("Where to today?")).toBeNull();

    await user.click(screen.getByText("Recommend"));
    expect(screen.getByText("Where to today?")).toBeInTheDocument();
    expect(screen.queryByText("The Atlas")).toBeNull();
  });

  it("does not keep re-opening the onboarding pick on a later, unrelated visit to The Atlas", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText("Show place →"));
    await user.click(screen.getByText("Let's go →"));
    // First visit: the picked frame's card is open.
    expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
    await user.click(screen.getByLabelText("Close frame"));
    await user.click(screen.getByText("Recommend"));
    await user.click(screen.getByText("View on map →"));
    // Re-entering Atlas later must not force that same card open again.
    expect(screen.queryByRole("heading", { level: 3 })).toBeNull();
  });
});
