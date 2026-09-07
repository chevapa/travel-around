// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Frame } from "../../model/frame";
import { _resetWikipediaPhotoCacheForTests } from "../../lib/wikipediaPhoto";
import { RecommendScreen } from "./RecommendScreen";

// Beta: +3 wantReturn, +1 novelty, +1 nearby (30km) = 5.
// Alpha: +1 tag affinity (shares "castle" with the loved frame), +1 novelty, +1 nearby (20km) = 3.
// -> Beta ranks first.
const FRAMES: Frame[] = [
  { id: "u1", name: "Alpha", state: "unprinted", lat: 0, lon: 0, driveMinutes: 20, distanceKm: 20, tags: ["castle"] },
  { id: "u2", name: "Beta", state: "unprinted", lat: 0, lon: 0, driveMinutes: 30, distanceKm: 30, tags: ["beach"], wantReturn: true },
  { id: "l1", name: "Loved", state: "loved", lat: 0, lon: 0, driveMinutes: 10, distanceKm: 10, tags: ["castle"] },
];

describe("RecommendScreen", () => {
  beforeEach(() => {
    _resetWikipediaPhotoCacheForTests();
    // No real network calls — every card's photo lookup resolves to "no photo found".
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) } as Response));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the highest-scored candidate first", () => {
    render(<RecommendScreen frames={FRAMES} />);
    expect(screen.getByRole("heading", { name: "Beta" })).toBeInTheDocument();
  });

  it("shows the reasons behind the top recommendation", () => {
    render(<RecommendScreen frames={FRAMES} />);
    expect(screen.getByText(/You marked this — want to return/)).toBeInTheDocument();
  });

  it("never recommends a loved or fine frame — only unprinted ones", () => {
    render(<RecommendScreen frames={FRAMES} />);
    expect(screen.queryByRole("heading", { name: "Loved" })).toBeNull();
  });

  it("moving to the next card after 'Let's go!' and counting it", async () => {
    const user = userEvent.setup();
    render(<RecommendScreen frames={FRAMES} />);
    await user.click(screen.getByText("★ Let's go!"));
    expect(screen.getByRole("heading", { name: "Alpha" })).toBeInTheDocument();
    expect(screen.getByText(/1 liked/)).toBeInTheDocument();
  });

  it("moving to the next card after 'Save for later' and counting it", async () => {
    const user = userEvent.setup();
    render(<RecommendScreen frames={FRAMES} />);
    await user.click(screen.getByText("↓ Save for later"));
    expect(screen.getByRole("heading", { name: "Alpha" })).toBeInTheDocument();
    expect(screen.getByText(/1 saved for later/)).toBeInTheDocument();
  });

  it("'Not interested' penalizes the skipped frame's tags for the rest of the session", async () => {
    const user = userEvent.setup();
    // Two unprinted castle frames, no wantReturn/loved-tag advantage — tied
    // until a skip makes "castle" an avoided tag.
    const tied: Frame[] = [
      { id: "a", name: "First", state: "unprinted", lat: 0, lon: 0, driveMinutes: 10, distanceKm: 10, tags: ["castle"] },
      { id: "b", name: "Second", state: "unprinted", lat: 0, lon: 0, driveMinutes: 10, distanceKm: 10, tags: ["view"] },
    ];
    render(<RecommendScreen frames={tied} />);
    // "First" sorts ahead of "Second" for a tie (stable sort, original order).
    expect(screen.getByRole("heading", { name: "First" })).toBeInTheDocument();
    await user.click(screen.getByText("✕ Not interested"));
    expect(screen.getByRole("heading", { name: "Second" })).toBeInTheDocument();
  });

  it("shows a completion message once every candidate has been decided", async () => {
    const user = userEvent.setup();
    const one: Frame[] = [{ id: "a", name: "Only", state: "unprinted", lat: 0, lon: 0, driveMinutes: 10, distanceKm: 10, tags: [] }];
    render(<RecommendScreen frames={one} />);
    await user.click(screen.getByText("✕ Not interested"));
    expect(screen.getByText("That's everything for now")).toBeInTheDocument();
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("disables all three actions once the deck is empty", async () => {
    const user = userEvent.setup();
    const one: Frame[] = [{ id: "a", name: "Only", state: "unprinted", lat: 0, lon: 0, driveMinutes: 10, distanceKm: 10, tags: [] }];
    render(<RecommendScreen frames={one} />);
    await user.click(screen.getByText("★ Let's go!"));
    expect(screen.getByText("★ Let's go!").closest("button")).toBeDisabled();
    expect(screen.getByText("✕ Not interested").closest("button")).toBeDisabled();
    expect(screen.getByText("↓ Save for later").closest("button")).toBeDisabled();
  });

  it("calls onViewOnMap when 'View on map' is clicked", async () => {
    const user = userEvent.setup();
    const onViewOnMap = vi.fn();
    render(<RecommendScreen frames={FRAMES} onViewOnMap={onViewOnMap} />);
    await user.click(screen.getByText("View on map →"));
    expect(onViewOnMap).toHaveBeenCalled();
  });

  it("shows no 'View on map' control when onViewOnMap is absent", () => {
    render(<RecommendScreen frames={FRAMES} />);
    expect(screen.queryByText("View on map →")).toBeNull();
  });

  it("swaps in a resolved Wikipedia photo for the current card", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ type: "standard", thumbnail: { source: "https://example.com/beta.jpg" } }) } as Response),
    );
    render(<RecommendScreen frames={FRAMES} />);
    await waitFor(() => expect(screen.getByAltText("Beta")).toHaveAttribute("src", "https://example.com/beta.jpg"));
  });
});
