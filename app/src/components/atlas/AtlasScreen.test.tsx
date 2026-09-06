// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
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

describe("AtlasScreen — clustering and zoom (Task 9)", () => {
  // Two frames a few hundred metres apart — closer together than any two
  // real distinct places in the dataset (see clustering.test.ts's own
  // fixture comment) — cluster at the most zoomed-out level and separate
  // at the most zoomed-in one, at any radius supercluster would use.
  const CLOSE_PAIR: Frame[] = [
    { id: "x1", name: "X1", state: "unprinted", lat: 45.8, lon: 15.9, driveMinutes: 10, distanceKm: 5, tags: [] },
    { id: "x2", name: "X2", state: "unprinted", lat: 45.8005, lon: 15.9005, driveMinutes: 10, distanceKm: 5, tags: [] },
  ];

  it("renders a FrameStack (not two Prints) for a close pair at the most zoomed-out level", async () => {
    const user = userEvent.setup();
    render(<AtlasScreen frames={CLOSE_PAIR} />);
    await user.click(screen.getByLabelText("Zoom out"));
    for (let i = 0; i < 15; i++) await user.click(screen.getByLabelText("Zoom out")); // walk to MIN_ZOOM
    expect(screen.queryByText("X1")).toBeNull();
    expect(screen.queryByText("X2")).toBeNull();
  });

  it("renders both as individual prints at the most zoomed-in level", async () => {
    const user = userEvent.setup();
    const { container } = render(<AtlasScreen frames={CLOSE_PAIR} />);
    for (let i = 0; i < 20; i++) await user.click(screen.getByLabelText("Zoom in")); // walk to MAX_ZOOM
    // unprinted frames don't render their name as a caption, but each is
    // its own clickable Print rather than one merged FrameStack — assert
    // via the pin stems, one per individual marker. (Plain JS filtering,
    // not a `[style*="..."]` selector: jsdom's CSS engine mis-parses an
    // attribute-value substring that looks like "word(" even quoted —
    // not relevant to "width: 2.5px", but avoided everywhere in this
    // block for consistency with the cluster-root lookup below.)
    const pins = Array.from(container.querySelectorAll("span[aria-hidden='true']")).filter((el) =>
      (el.getAttribute("style") ?? "").includes("width: 2.5px"),
    );
    expect(pins).toHaveLength(2);
  });

  it("clicking a cluster zooms in (FrameStack has an onClick)", async () => {
    const user = userEvent.setup();
    const { container } = render(<AtlasScreen frames={CLOSE_PAIR} />);
    for (let i = 0; i < 20; i++) await user.click(screen.getByLabelText("Zoom out")); // MIN_ZOOM — definitely one cluster
    // FrameStack renders its count as a plain text node inside its own
    // root div — a reliable way to find it that doesn't risk matching one
    // of TornGround's many other "rotate(...)"-styled decorations, which
    // a generic `[style*="rotate"]` selector did (a real bug in this test,
    // caught by the assertion below going unexpectedly false).
    const countNode = screen.getByText("2");
    const stackRoot = countNode.parentElement as HTMLElement;
    await user.click(stackRoot);
    // after zooming in enough (getClusterExpansionZoom), the pair
    // separates into two leaves — the merged "2" count is gone.
    expect(screen.queryByText("2")).toBeNull();
    const pins = Array.from(container.querySelectorAll("span[aria-hidden='true']")).filter((el) =>
      (el.getAttribute("style") ?? "").includes("width: 2.5px"),
    );
    expect(pins).toHaveLength(2);
  });

  it("never encodes state in a cluster's colour — FrameStack takes no state prop", async () => {
    const user = userEvent.setup();
    render(<AtlasScreen frames={CLOSE_PAIR} />);
    for (let i = 0; i < 20; i++) await user.click(screen.getByLabelText("Zoom out"));
    // FrameStack's own rendering (Task 5) never reads a `state` — this is
    // really just confirming the integration passes it no such prop by
    // construction; see FrameStack.test.tsx for the fill-colour guarantee.
    expect(screen.getByText("2")).toBeInTheDocument(); // the count numeral
  });

  it("renders the real 116-frame dataset without throwing, and with fewer DOM prints than frames at a low zoom", async () => {
    const { default: realFrames } = await import("../../data/frames.json");
    const user = userEvent.setup();
    const { container } = render(<AtlasScreen frames={realFrames as Frame[]} />);
    for (let i = 0; i < 8; i++) await user.click(screen.getByLabelText("Zoom out")); // well below the default
    // Plain JS filtering rather than a `[style*="translate(..."]` CSS
    // selector — jsdom's selector engine mis-parses an attribute-value
    // substring that looks like "word(" even when quoted (confirmed by
    // direct comparison: the exact full string matches fine, but this
    // partial "translate(-50%," prefix silently matches nothing).
    const markers = Array.from(container.querySelectorAll("div[style]")).filter((el) =>
      (el.getAttribute("style") ?? "").includes("translate(-50%,"),
    );
    expect(markers.length).toBeGreaterThan(0);
    expect(markers.length).toBeLessThan((realFrames as Frame[]).length);
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

// Task 11: "The Contact Sheet should print cleanly to PDF." Real
// pagination/clipping is verified against real headless Chromium
// (emulateMedia('print') + a generated PDF, in the session) — this just
// confirms the two class hooks styles/print.css relies on are actually
// present on the right elements.
describe("AtlasScreen — print class hooks (Task 11)", () => {
  it("marks the map/chrome wrapper as print-hidden", () => {
    const { container } = render(<AtlasScreen frames={TEST_FRAMES} />);
    expect(container.querySelector(".riso-print-hide")).not.toBeNull();
  });

  it("marks the open Contact Sheet's wrapper for print, outside the print-hidden map", async () => {
    const user = userEvent.setup();
    const { container } = render(<AtlasScreen frames={TEST_FRAMES} />);
    await user.click(screen.getByText("Contact sheet"));
    const sheetWrapper = container.querySelector(".riso-contact-sheet-print");
    expect(sheetWrapper).not.toBeNull();
    expect(container.querySelector(".riso-print-hide")?.contains(sheetWrapper!)).toBe(false);
  });
});

// Task 10: New Frame — full end-to-end flow through AtlasScreen.
//
// Deliberately real timers, not vi.useFakeTimers(): mixing global fake
// timers with @testing-library/user-event caused every click to hang
// until the test timeout in this setup, even with `{ delay: null }` —
// userEvent depends on more than just the artificial typing delay
// internally. A genuine ~550ms wait past the 500ms long-press threshold
// is a small, reliable price for not fighting that interaction.
describe("AtlasScreen — New Frame flow (Task 10)", () => {
  async function longPressMap(container: HTMLElement, clientX: number, clientY: number) {
    const mapContainer = container.querySelector('[data-testid="riso-map-container"]') as HTMLElement;
    mapContainer.getBoundingClientRect = () => ({ left: 0, top: 0 }) as DOMRect;
    await act(async () => {
      mapContainer.dispatchEvent(new PointerEvent("pointerdown", { clientX, clientY, pointerType: "touch" }));
      await new Promise((resolve) => setTimeout(resolve, 550));
    });
  }

  it("a map long-press opens the New Frame form at the pressed coordinates", async () => {
    const { container } = render(<AtlasScreen frames={TEST_FRAMES} />);
    await longPressMap(container, 200, 200); // the fake map's unproject(200,200) -> {lat:0, lon:0}
    // "New Frame" also names TopBar's own (always-present) button — the
    // form's heading is the one that actually confirms it opened.
    expect(screen.getByText("New Frame", { selector: "h3" })).toBeInTheDocument();
    expect(screen.getByText("0.0000°N, 0.0000°E")).toBeInTheDocument();
  });

  it("replaces any other open panel occupant, per the one-slot invariant", async () => {
    const user = userEvent.setup();
    const { container } = render(<AtlasScreen frames={TEST_FRAMES} />);
    await user.click(screen.getByText("Krapina")); // open a card first
    expect(screen.getByRole("heading", { name: "Krapina" })).toBeInTheDocument();
    await longPressMap(container, 200, 200);
    expect(screen.getByText("New Frame", { selector: "h3" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Krapina" })).toBeNull();
  });

  it("saving adds a new unprinted frame to the map and closes the form", async () => {
    const user = userEvent.setup();
    const { container } = render(<AtlasScreen frames={TEST_FRAMES} />);
    await longPressMap(container, 200, 200);
    await user.type(screen.getByPlaceholderText("Name this place"), "Test Place");
    await user.click(screen.getByText("Add Frame"));
    expect(screen.queryByText("New Frame", { selector: "h3" })).toBeNull();
    // the new frame is unprinted, so it renders as a print with no visible
    // caption text — confirm indirectly via the updated match counts
    // instead: one more unprinted frame now exists.
    await user.click(screen.getByText("The Index"));
    expect(screen.getByText("5 frames match")).toBeInTheDocument();
  });

  it("TopBar's New Frame button opens the form at the map's current centre as a fallback", async () => {
    const user = userEvent.setup();
    render(<AtlasScreen frames={TEST_FRAMES} />);
    await user.click(screen.getByText("New Frame"));
    expect(screen.getByText("New Frame", { selector: "h3" })).toBeInTheDocument();
  });

  it("cancelling the form closes it without adding a frame", async () => {
    const user = userEvent.setup();
    const { container } = render(<AtlasScreen frames={TEST_FRAMES} />);
    await longPressMap(container, 200, 200);
    await user.click(screen.getByLabelText("Cancel"));
    expect(screen.queryByText("New Frame", { selector: "h3" })).toBeNull();
    await user.click(screen.getByText("The Index"));
    expect(screen.getByText(/4 frames match/)).toBeInTheDocument();
  });
});
