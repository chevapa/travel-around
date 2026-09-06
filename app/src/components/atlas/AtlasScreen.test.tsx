// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Frame } from "../../model/frame";
import { AtlasScreen } from "./AtlasScreen";

// A small, deterministic dataset — the real 116-frame set is exercised via
// the default export in the running app, but these tests need frames whose
// names/ids/states are known ahead of time.
const TEST_FRAMES: Frame[] = [
  { id: "a1", name: "Krapina", state: "loved", lat: 46.16, lon: 15.87, driveMinutes: 41, distanceKm: 38, tags: ["Croatia"] },
  { id: "b2", name: "Ludbreg", state: "fine", lat: 46.24, lon: 16.63, driveMinutes: 64, distanceKm: 78, tags: ["Croatia"] },
  { id: "c3", name: "Ozalj", state: "unprinted", lat: 45.63, lon: 15.57, driveMinutes: 52, distanceKm: 49, tags: ["Croatia"] },
  { id: "d4", name: "Samobor", state: "unprinted", lat: 45.8, lon: 15.72, driveMinutes: 28, distanceKm: 25, tags: ["Croatia"] },
];

describe("AtlasScreen — the four required interactions (Task 8 'Done when')", () => {
  it("click a print -> opens its card (name visible), and closes the map's other prints from view is not required, just the card shows", async () => {
    const user = userEvent.setup();
    render(<AtlasScreen frames={TEST_FRAMES} />);
    await user.click(screen.getByText("Krapina"));
    // The FrameCard renders the name in an <h3>; the map print behind it
    // also renders the caption text "Krapina" — assert the heading exists.
    expect(screen.getByRole("heading", { name: "Krapina" })).toBeInTheDocument();
  });

  it("The Index -> opens the filter panel, replacing any open card", async () => {
    const user = userEvent.setup();
    render(<AtlasScreen frames={TEST_FRAMES} />);
    await user.click(screen.getByText("Krapina")); // open a card first
    expect(screen.getByRole("heading", { name: "Krapina" })).toBeInTheDocument();
    await user.click(screen.getByText("The Index"));
    expect(screen.queryByRole("heading", { name: "Krapina" })).toBeNull();
    expect(screen.getByText(/frames match/)).toBeInTheDocument();
  });

  it("clicking The Index again closes it (toggle)", async () => {
    const user = userEvent.setup();
    render(<AtlasScreen frames={TEST_FRAMES} />);
    await user.click(screen.getByText("The Index"));
    expect(screen.getByText(/frames match/)).toBeInTheDocument();
    await user.click(screen.getByText("The Index"));
    expect(screen.queryByText(/frames match/)).toBeNull();
  });

  it("a legend row isolates that state — unchecking removes other states from the map", async () => {
    const user = userEvent.setup();
    render(<AtlasScreen frames={TEST_FRAMES} />);
    expect(screen.getByText("Krapina")).toBeInTheDocument();
    expect(screen.getByText("Ludbreg")).toBeInTheDocument();
    await user.click(screen.getByText(/Printed · loved/));
    expect(screen.getByText("Krapina")).toBeInTheDocument(); // loved — stays
    expect(screen.queryByText("Ludbreg")).toBeNull(); // fine — isolated away
  });

  it("clicking the same legend row again releases the isolation", async () => {
    const user = userEvent.setup();
    render(<AtlasScreen frames={TEST_FRAMES} />);
    await user.click(screen.getByText(/Printed · loved/));
    expect(screen.queryByText("Ludbreg")).toBeNull();
    await user.click(screen.getByText(/Printed · loved/));
    expect(screen.getByText("Ludbreg")).toBeInTheDocument();
  });

  it("To Print picks a random unprinted frame, highlights it yellow, and opens its card", async () => {
    const user = userEvent.setup();
    render(<AtlasScreen frames={TEST_FRAMES} />);
    await user.click(screen.getByText("To Print →"));
    const heading = screen.getByRole("heading", { level: 3 });
    expect(["Ozalj", "Samobor"]).toContain(heading.textContent); // the two unprinted frames
    // the rolled print on the map carries the yellow outline
    const highlighted = document.querySelector('[style*="outline: 3px solid var(--yellow)"]');
    expect(highlighted).not.toBeNull();
  });

  it("To Print does nothing if there are no unprinted frames left", async () => {
    const user = userEvent.setup();
    const allPrinted = TEST_FRAMES.map((f) => (f.state === "unprinted" ? { ...f, state: "fine" as const } : f));
    render(<AtlasScreen frames={allPrinted} />);
    await user.click(screen.getByText("To Print →"));
    expect(screen.queryByRole("heading", { level: 3 })).toBeNull();
  });
});

describe("AtlasScreen — chrome always paints above map content (z-index regression)", () => {
  // Any element with a *set* z-index creates its own stacking level above
  // auto/unset siblings regardless of DOM order — found for real once
  // frames could project near the top edge with real coordinates (the
  // reference ui_kit's mock positions never did). TopBar and Legend must
  // out-rank every print, not just come later in the DOM.
  it("gives TopBar's wrapper a higher z-index than any print", () => {
    const { container } = render(<AtlasScreen frames={TEST_FRAMES} />);
    // Print wrappers are identified by translate(-50%,-100%) — the pin
    // anchor transform AtlasScreen applies to every map marker, and to
    // nothing else — rather than by z-index value, since GrainOverlay
    // also has an (intentionally, correctly higher) z-index of its own.
    const printZIndexes = Array.from(container.querySelectorAll('[style*="translate(-50%,-100%)"]'))
      .map((el) => Number((el as HTMLElement).style.zIndex))
      .filter((z) => Number.isFinite(z));
    expect(printZIndexes.length).toBeGreaterThan(0);

    const topBarBrand = screen.getByText("The Atlas");
    let node: HTMLElement | null = topBarBrand;
    while (node && !node.style.zIndex) node = node.parentElement;
    expect(node).not.toBeNull();
    const topBarZ = Number(node!.style.zIndex);

    expect(Math.max(...printZIndexes)).toBeLessThan(topBarZ);
  });
});

describe("AtlasScreen — structure", () => {
  it("mounts exactly one grain layer", () => {
    const { container } = render(<AtlasScreen frames={TEST_FRAMES} />);
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0);
    // GrainOverlay is the only element with this exact background-image token.
    const grainLayers = Array.from(container.querySelectorAll("*")).filter((el) =>
      (el.getAttribute("style") ?? "").includes("var(--grain-image)"),
    );
    expect(grainLayers).toHaveLength(1);
  });

  it("labels the header meta — never a bare number", () => {
    render(<AtlasScreen frames={TEST_FRAMES} />);
    expect(screen.getByText(/Zagreb · \d+ printed \/ \d+ not/)).toBeInTheDocument();
  });

  it("toggles to the contact sheet view and back", async () => {
    const user = userEvent.setup();
    render(<AtlasScreen frames={TEST_FRAMES} />);
    await user.click(screen.getByText("Contact sheet"));
    expect(screen.getByText(/Contact sheet · 4/)).toBeInTheDocument();
    await user.click(screen.getByText("Back to the atlas"));
    expect(screen.queryByText(/Contact sheet · 4/)).toBeNull();
  });
});
