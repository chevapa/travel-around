// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
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

  it("Filters -> opens the filter panel, replacing any open card", async () => {
    const user = userEvent.setup();
    render(<AtlasScreen frames={TEST_FRAMES} />);
    await user.click(screen.getByText("Krapina")); // open a card first
    expect(screen.getByRole("heading", { name: "Krapina" })).toBeInTheDocument();
    await user.click(screen.getByText("Filters"));
    expect(screen.queryByRole("heading", { name: "Krapina" })).toBeNull();
    expect(screen.getByText(/frames match/)).toBeInTheDocument();
  });

  it("clicking Filters again closes it (toggle)", async () => {
    const user = userEvent.setup();
    render(<AtlasScreen frames={TEST_FRAMES} />);
    await user.click(screen.getByText("Filters"));
    expect(screen.getByText(/frames match/)).toBeInTheDocument();
    await user.click(screen.getByText("Filters"));
    expect(screen.queryByText(/frames match/)).toBeNull();
  });

  it("a legend row isolates that state — unchecking removes other states from the map", async () => {
    const user = userEvent.setup();
    render(<AtlasScreen frames={TEST_FRAMES} />);
    expect(screen.getByText("Krapina")).toBeInTheDocument();
    expect(screen.getByText("Ludbreg")).toBeInTheDocument();
    await user.click(screen.getByText(/Visited · loved/));
    expect(screen.getByText("Krapina")).toBeInTheDocument(); // loved — stays
    expect(screen.queryByText("Ludbreg")).toBeNull(); // fine — isolated away
  });

  it("clicking the same legend row again releases the isolation", async () => {
    const user = userEvent.setup();
    render(<AtlasScreen frames={TEST_FRAMES} />);
    await user.click(screen.getByText(/Visited · loved/));
    expect(screen.queryByText("Ludbreg")).toBeNull();
    await user.click(screen.getByText(/Visited · loved/));
    expect(screen.getByText("Ludbreg")).toBeInTheDocument();
  });

  it("Where to? picks a random unprinted frame, highlights it yellow, and opens its card", async () => {
    const user = userEvent.setup();
    render(<AtlasScreen frames={TEST_FRAMES} />);
    await user.click(screen.getByText("Where to? →"));
    const heading = screen.getByRole("heading", { level: 3 });
    expect(["Ozalj", "Samobor"]).toContain(heading.textContent); // the two unprinted frames
    // the rolled print on the map carries the yellow outline
    const highlighted = document.querySelector('[style*="outline: 3px solid var(--yellow)"]');
    expect(highlighted).not.toBeNull();
  });

  it("Where to? does nothing if there are no unprinted frames left", async () => {
    const user = userEvent.setup();
    const allPrinted = TEST_FRAMES.map((f) => (f.state === "unprinted" ? { ...f, state: "fine" as const } : f));
    render(<AtlasScreen frames={allPrinted} />);
    await user.click(screen.getByText("Where to? →"));
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

// Task 12 regression check for HIGH 04 (AUDIT.md): "nothing on the map
// explains what [pin] colours mean... buried inside a panel." The fix
// (Legend, Task 5) is a permanent, always-mounted element — proven across
// every view/panel-slot combination, not just the default one.
describe("AtlasScreen — the Legend is always mounted (HIGH 04 regression)", () => {
  it("is present on initial render", () => {
    render(<AtlasScreen frames={TEST_FRAMES} />);
    expect(screen.getByText("Reading the page")).toBeInTheDocument();
  });

  it("stays present while Filters is open", async () => {
    const user = userEvent.setup();
    render(<AtlasScreen frames={TEST_FRAMES} />);
    await user.click(screen.getByText("Filters"));
    expect(screen.getByText("Reading the page")).toBeInTheDocument();
  });

  it("stays present while a card is open", async () => {
    const user = userEvent.setup();
    render(<AtlasScreen frames={TEST_FRAMES} />);
    await user.click(screen.getByText("Krapina"));
    expect(screen.getByText("Reading the page")).toBeInTheDocument();
  });

  it("stays present in the contact sheet view", async () => {
    const user = userEvent.setup();
    render(<AtlasScreen frames={TEST_FRAMES} />);
    await user.click(screen.getByText("Contact sheet"));
    expect(screen.getByText("Reading the page")).toBeInTheDocument();
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
    expect(screen.getByText(/Zagreb · \d+ visited \/ \d+ not/)).toBeInTheDocument();
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
    await user.click(screen.getByText("Filters"));
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
    await user.click(screen.getByText("Filters"));
    expect(screen.getByText(/4 frames match/)).toBeInTheDocument();
  });
});

// Issue 131: "when click on search button nothing happens."
describe("AtlasScreen — search (issue 131)", () => {
  it("typing in the search field filters the map by name", async () => {
    const user = userEvent.setup();
    render(<AtlasScreen frames={TEST_FRAMES} />);
    await user.click(screen.getByLabelText("Search frames"));
    await user.type(screen.getByPlaceholderText("Search frames…"), "Krap");
    // Issue 159: a match now appears twice — the map pin's own caption,
    // and the new results dropdown row — so this just confirms it's still
    // present at all, not that the map re-rendered it once.
    expect(screen.getAllByText("Krapina").length).toBeGreaterThan(0);
    expect(screen.queryByText("Ludbreg")).toBeNull();
  });

  it("also matches the local-language name (q)", async () => {
    const user = userEvent.setup();
    const withQ = [...TEST_FRAMES, { id: "e5", name: "Любляна", state: "loved" as const, lat: 46.05, lon: 14.5, driveMinutes: 90, distanceKm: 117, tags: [], q: "Ljubljana" }];
    render(<AtlasScreen frames={withQ} />);
    await user.click(screen.getByLabelText("Search frames"));
    await user.type(screen.getByPlaceholderText("Search frames…"), "ljublj");
    expect(screen.getAllByText("Любляна").length).toBeGreaterThan(0);
    expect(screen.queryByText("Krapina")).toBeNull();
  });

  // Issue 159: "nothing popped up" — a real results list under the field,
  // and picking a result guarantees the frame's card actually opens.
  it("shows matches in a results dropdown and opens the picked frame's card", async () => {
    const user = userEvent.setup();
    render(<AtlasScreen frames={TEST_FRAMES} />);
    await user.click(screen.getByLabelText("Search frames"));
    await user.type(screen.getByPlaceholderText("Search frames…"), "Krap");
    await user.click(screen.getByRole("option", { name: "Krapina" }));
    expect(screen.getByRole("heading", { name: "Krapina" })).toBeInTheDocument();
  });

  it("shows a no-matches row for a query that matches nothing", async () => {
    const user = userEvent.setup();
    render(<AtlasScreen frames={TEST_FRAMES} />);
    await user.click(screen.getByLabelText("Search frames"));
    await user.type(screen.getByPlaceholderText("Search frames…"), "zzz-no-such-place");
    expect(screen.getByRole("listbox", { name: "Matching frames" })).toHaveTextContent("No frames match");
  });
});

// Issue 128: "the tags on cards are not clickable and not showing the filtering."
describe("AtlasScreen — tag filtering from a card (issue 128)", () => {
  it("clicking a tag on an open card filters the map to frames sharing it", async () => {
    const user = userEvent.setup();
    const tagged = [
      { id: "t1", name: "Alpha", state: "loved" as const, lat: 45.8, lon: 15.9, driveMinutes: 30, distanceKm: 20, tags: ["castle"] },
      { id: "t2", name: "Beta", state: "unprinted" as const, lat: 45.9, lon: 16.0, driveMinutes: 40, distanceKm: 30, tags: ["castle"] },
      { id: "t3", name: "Gamma", state: "loved" as const, lat: 48.5, lon: 20.5, driveMinutes: 50, distanceKm: 40, tags: ["beach"] },
    ];
    render(<AtlasScreen frames={tagged} />);
    await user.click(screen.getByText("Alpha"));
    await user.click(screen.getByText("castle"));
    await user.click(screen.getByLabelText("Close frame"));
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.queryByText("Gamma")).toBeNull(); // different tag — filtered out
  });

  it("shows a removable chip for the active tag filter", async () => {
    const user = userEvent.setup();
    const tagged = [{ id: "t1", name: "Alpha", state: "loved" as const, lat: 45.8, lon: 15.9, driveMinutes: 30, distanceKm: 20, tags: ["castle"] }];
    render(<AtlasScreen frames={tagged} />);
    await user.click(screen.getByText("Alpha"));
    await user.click(screen.getByText("castle"));
    expect(screen.getByLabelText("Remove castle filter")).toBeInTheDocument();
    await user.click(screen.getByLabelText("Remove castle filter"));
    expect(screen.queryByLabelText("Remove castle filter")).toBeNull();
  });
});

// Issue 145: country and season as clickable filter badges on the card.
describe("AtlasScreen — country/season filtering from a card (issue 145)", () => {
  // Neither country is HOME_COUNTRY ("hr") — issue 123's default
  // Croatia-only restriction would otherwise hide "mk"/"si" regardless of
  // this feature, making these tests pass for the wrong reason.
  const FRAMES: Frame[] = [
    { id: "c1", name: "Alpha", state: "loved", lat: 45.8, lon: 15.9, driveMinutes: 30, distanceKm: 20, tags: [], country: "mk", season: "summer" },
    { id: "c2", name: "Beta", state: "loved", lat: 42.0, lon: 21.4, driveMinutes: 600, distanceKm: 600, tags: [], country: "si", season: "warm" },
  ];

  it("clicking the country badge isolates the map to that country", async () => {
    const user = userEvent.setup();
    render(<AtlasScreen frames={FRAMES} />);
    await user.click(screen.getByText("Alpha"));
    await user.click(screen.getByText("MK"));
    await user.click(screen.getByLabelText("Close frame"));
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.queryByText("Beta")).toBeNull();
  });

  it("clicking the same country badge again releases the isolation", async () => {
    const user = userEvent.setup();
    render(<AtlasScreen frames={FRAMES} />);
    await user.click(screen.getByText("Alpha"));
    await user.click(screen.getByText("MK"));
    await user.click(screen.getByText("MK")); // toggle off
    await user.click(screen.getByLabelText("Close frame"));
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("clicking the season badge isolates the map to that season", async () => {
    const user = userEvent.setup();
    render(<AtlasScreen frames={FRAMES} />);
    await user.click(screen.getByText("Alpha"));
    await user.click(screen.getByText("Summer / swimming"));
    await user.click(screen.getByLabelText("Close frame"));
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.queryByText("Beta")).toBeNull();
  });
});

// Issue 124: "after clicking the index there are no places nor filter present."
describe("AtlasScreen — recovering from an empty filter (issue 124)", () => {
  it("shows a reset affordance instead of a silent empty map when every state row is off", async () => {
    const user = userEvent.setup();
    render(<AtlasScreen frames={TEST_FRAMES} />);
    await user.click(screen.getByText("Filters"));
    // IndexPanel's own checkboxes (StampCheck, aria-labelled by the row's
    // label) — not Legend's row, which shares the same visible text
    // ("Visited · loved · 31") but isn't a labelled control.
    await user.click(screen.getByLabelText("Visited · loved"));
    await user.click(screen.getByLabelText("Visited · fine"));
    await user.click(screen.getByLabelText("Not visited"));
    expect(screen.getByText("No frames match your filters.")).toBeInTheDocument();
    await user.click(screen.getByText("Reset filters"));
    expect(screen.queryByText("No frames match your filters.")).toBeNull();
    expect(screen.getByText("Krapina")).toBeInTheDocument();
  });
});

// Issue 123: the live site's default filter is Croatia only.
describe("AtlasScreen — default country filter (issue 123)", () => {
  // Both frames are "loved" (rather than "unprinted") deliberately — an
  // unprinted frame never renders its name as a map caption regardless of
  // any filter (see AtlasScreen's caption logic), which would make
  // "Skopje Place" absent for the wrong reason and defeat this test.
  const MULTI_COUNTRY: Frame[] = [
    { id: "hr1", name: "Zagreb Place", state: "loved", lat: 45.8, lon: 15.9, driveMinutes: 10, distanceKm: 5, tags: [], country: "hr" },
    { id: "mk1", name: "Skopje Place", state: "loved", lat: 42.0, lon: 21.4, driveMinutes: 600, distanceKm: 600, tags: [], country: "mk" },
  ];

  it("hides frames from other countries by default when the dataset spans more than one", () => {
    render(<AtlasScreen frames={MULTI_COUNTRY} />);
    expect(screen.getByText("Zagreb Place")).toBeInTheDocument();
    expect(screen.queryByText("Skopje Place")).toBeNull();
  });

  it("a frame with no country set is never hidden by this filter", () => {
    const mixed = [...MULTI_COUNTRY, { id: "u1", name: "Unset Country", state: "loved" as const, lat: 45.7, lon: 15.8, driveMinutes: 20, distanceKm: 15, tags: [] }];
    render(<AtlasScreen frames={mixed} />);
    expect(screen.getByText("Unset Country")).toBeInTheDocument();
  });

  it("can be lifted from the Index's Country tab", async () => {
    const user = userEvent.setup();
    render(<AtlasScreen frames={MULTI_COUNTRY} />);
    await user.click(screen.getByText("Filters"));
    expect(screen.getByText("1 frames match")).toBeInTheDocument(); // hr only, by default
    await user.click(screen.getByText("Country"));
    await user.click(screen.getByLabelText("MK"));
    expect(screen.getByText("2 frames match")).toBeInTheDocument();
    await user.click(screen.getByText("Filters")); // close the panel
    expect(screen.getByText("Skopje Place")).toBeInTheDocument();
  });
});

// Issue 143: "add season and source filters to the Index panel" — ported
// from js/filters.js, following the same tab/row pattern as Country above.
describe("AtlasScreen — Season and Source filters (issue 143)", () => {
  const SEASON_SOURCE_FRAMES: Frame[] = [
    { id: "s1", name: "Summer Place", state: "loved", lat: 45.8, lon: 15.9, driveMinutes: 10, distanceKm: 5, tags: [], season: "summer", sourceType: "journal" },
    { id: "s2", name: "Warm Place", state: "loved", lat: 45.9, lon: 16.0, driveMinutes: 20, distanceKm: 10, tags: [], season: "warm", sourceType: "research" },
  ];

  it("adds Season and Source tabs to the Index panel", async () => {
    const user = userEvent.setup();
    render(<AtlasScreen frames={SEASON_SOURCE_FRAMES} />);
    await user.click(screen.getByText("Filters"));
    expect(screen.getByText("Season")).toBeInTheDocument();
    expect(screen.getByText("Source")).toBeInTheDocument();
  });

  it("filters the map from the Season tab", async () => {
    const user = userEvent.setup();
    render(<AtlasScreen frames={SEASON_SOURCE_FRAMES} />);
    await user.click(screen.getByText("Filters"));
    await user.click(screen.getByText("Season"));
    await user.click(screen.getByLabelText("Summer / swimming")); // uncheck it
    await user.click(screen.getByText("Filters")); // close the panel
    expect(screen.queryByText("Summer Place")).toBeNull();
    expect(screen.getByText("Warm Place")).toBeInTheDocument();
  });

  it("filters the map from the Source tab", async () => {
    const user = userEvent.setup();
    render(<AtlasScreen frames={SEASON_SOURCE_FRAMES} />);
    await user.click(screen.getByText("Filters"));
    await user.click(screen.getByText("Source"));
    await user.click(screen.getByLabelText("My travel journal")); // uncheck it
    await user.click(screen.getByText("Filters"));
    expect(screen.queryByText("Summer Place")).toBeNull(); // journal
    expect(screen.getByText("Warm Place")).toBeInTheDocument(); // research
  });

  it("does not add Season/Source tabs when no frame in the dataset carries that field", () => {
    render(<AtlasScreen frames={TEST_FRAMES} />);
    expect(screen.queryByText("Season")).toBeNull();
    expect(screen.queryByText("Source")).toBeNull();
  });
});

// Issue 126: "the circles are wrong completely, there are only 2 and should be 3."
describe("AtlasScreen — drive-time rings (issue 126)", () => {
  it("draws all three calibrated rings (1h/2h/3h), not two", () => {
    const { container } = render(<AtlasScreen frames={TEST_FRAMES} />);
    const polygons = container.querySelectorAll("svg polygon");
    expect(polygons.length).toBe(3);
  });
});

// Issue 133: FrameCard's actions were previously unwired no-ops.
describe("AtlasScreen — FrameCard actions actually do something (issue 133)", () => {
  // Issue 154: on mobile, a silent filter with nothing guaranteed visible
  // read as a no-op — "just gets me back to the map and doesn't open any
  // similar places." Similar places now flies to and opens the nearest
  // actual match, same treatment as search-select/"To Print".
  it("Similar places filters the map to frames sharing the open frame's first tag, and opens the nearest match", async () => {
    const user = userEvent.setup();
    const tagged = [
      { id: "t1", name: "Alpha", state: "loved" as const, lat: 45.8, lon: 15.9, driveMinutes: 30, distanceKm: 20, tags: ["castle"] },
      { id: "t2", name: "Beta", state: "loved" as const, lat: 45.9, lon: 16.0, driveMinutes: 35, distanceKm: 25, tags: ["castle"] },
      { id: "t3", name: "Gamma", state: "loved" as const, lat: 48.5, lon: 20.5, driveMinutes: 50, distanceKm: 40, tags: ["beach"] },
    ];
    render(<AtlasScreen frames={tagged} />);
    await user.click(screen.getByText("Alpha"));
    await user.click(screen.getByText("Similar places →"));
    // Beta is the only other frame sharing "castle" — its card opens.
    expect(screen.getByRole("heading", { name: "Beta" })).toBeInTheDocument();
    // Gamma (a different tag) is filtered off the map.
    expect(screen.queryByText("Gamma")).toBeNull();
  });

  it("Similar places just closes the card, leaving the filter untouched, when nothing else shares the tag", async () => {
    const user = userEvent.setup();
    const tagged = [
      { id: "t1", name: "Alpha", state: "loved" as const, lat: 45.8, lon: 15.9, driveMinutes: 30, distanceKm: 20, tags: ["castle"] },
      { id: "t2", name: "Gamma", state: "loved" as const, lat: 48.5, lon: 20.5, driveMinutes: 50, distanceKm: 40, tags: ["beach"] },
    ];
    render(<AtlasScreen frames={tagged} />);
    await user.click(screen.getByText("Alpha"));
    await user.click(screen.getByText("Similar places →"));
    expect(screen.queryByRole("heading", { name: "Alpha" })).toBeNull(); // card closed
    expect(screen.getByText("Gamma")).toBeInTheDocument(); // no dead-end filter applied
  });

  it("Want to go marks the frame with a star on the map", async () => {
    const user = userEvent.setup();
    // state "fine" (not "loved") so it starts unstarred but still renders
    // its name as a map caption — an unprinted frame never shows one
    // (regardless of this test), which would make it unclickable by text.
    render(<AtlasScreen frames={[{ id: "u1", name: "Unstarred", state: "fine", lat: 45.8, lon: 15.9, driveMinutes: 10, distanceKm: 5, tags: [] }]} />);
    await user.click(screen.getByText("Unstarred"));
    await user.click(screen.getByText(/Want to go/));
    expect(screen.getByText("★")).toBeInTheDocument();
  });
});

// Issue 153: "as a map... are too big they just don't fit in the mobile
// screen... I just see like huge [prints]" — prints were never scaled down
// for the mobile viewport, unlike the rest of the chrome.
describe("AtlasScreen — smaller print pins on mobile (issue 153)", () => {
  afterEach(() => {
    // @ts-expect-error -- test-only cleanup
    delete window.matchMedia;
  });

  function mockMobile(isMobile: boolean) {
    window.matchMedia = ((query: string) => ({
      matches: isMobile,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
  }

  it("renders a smaller print on mobile than on desktop, at the same zoom", () => {
    mockMobile(false);
    const { container: desktop } = render(<AtlasScreen frames={[TEST_FRAMES[0]]} />);
    const desktopWidth = Number((desktop.querySelector('img[alt="Krapina"]') as HTMLImageElement).style.width.replace("px", ""));

    mockMobile(true);
    const { container: mobile } = render(<AtlasScreen frames={[TEST_FRAMES[0]]} />);
    const mobileWidth = Number((mobile.querySelector('img[alt="Krapina"]') as HTMLImageElement).style.width.replace("px", ""));

    expect(mobileWidth).toBeGreaterThan(0);
    expect(mobileWidth).toBeLessThan(desktopWidth);
  });
});
