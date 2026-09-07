// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

// Issue 141: Recommend is the default landing screen (CLAUDE.md §2 — the
// user opens the app with a question, not a map to browse), with a fast,
// obvious path to and from The Atlas (CLAUDE.md §7).
describe("App — screen switching (issue 141)", () => {
  beforeEach(() => {
    // No real network calls for the recommendation card's Wikipedia photo lookup.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) } as Response));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lands on the Recommend screen by default", () => {
    render(<App />);
    expect(screen.getByText("Where to today?")).toBeInTheDocument();
  });

  it("switches to The Atlas via 'View on map', and back via 'Recommend'", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText("View on map →"));
    expect(screen.getByText("The Atlas")).toBeInTheDocument();
    expect(screen.queryByText("Where to today?")).toBeNull();

    await user.click(screen.getByText("Recommend"));
    expect(screen.getByText("Where to today?")).toBeInTheDocument();
    expect(screen.queryByText("The Atlas")).toBeNull();
  });
});
