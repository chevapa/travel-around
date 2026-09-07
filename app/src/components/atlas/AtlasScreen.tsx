import { useMemo, useState } from "react";
import collage from "../../assets/images/collage.jpeg";
import collage2 from "../../assets/images/collage2.webp";
import photoStack from "../../assets/images/photo-stack.jpeg";
import rawFrames from "../../data/frames.json";
import { categoryImageFor } from "../../lib/categoryImages";
import { countsByState, formatDrive, formatMeta, STATE_LABEL, type Frame, type FrameState } from "../../model/frame";
import { averageSpeedKmh, destPoint, ovalOutline, ZAGREB_DRIVE_RINGS } from "./isochrone";
import { haversineKm, HOME } from "../../model/migrate";
import { MOBILE_BREAKPOINT_QUERY, useMediaQuery } from "../../lib/motion";
import { Button } from "../core/Button";
import { GrainOverlay } from "../core/GrainOverlay";
import { IconButton } from "../core/IconButton";
import { ContactSheet } from "../shell/ContactSheet";
import { FrameCard } from "../shell/FrameCard";
import { IndexPanel, type IndexSection } from "../shell/IndexPanel";
import { NewFrameForm } from "../shell/NewFrameForm";
import { MOBILE_SHEET_MAX_HEIGHT_VH, PanelSlot } from "../shell/PanelSlot";
import { usePanelSlot } from "../shell/panelSlotReducer";
import { TopBar } from "../shell/TopBar";
import { buildClusterIndex, getClustersAtZoom, isCluster } from "./clustering";
import { FrameStack } from "./FrameStack";
import { Legend } from "./Legend";
import { MapBase } from "./MapBase";
import { derivePrintTransform, Print } from "./Print";
import { computeBounds } from "./projection";
import { RingLabel } from "./RingLabel";

/**
 * The product's main view: a real, restyled basemap, prints pinned to it,
 * one bar of chrome, a permanent legend, and a single right-hand panel
 * slot shared by The Index and a FrameCard.
 *
 * Ported from DESIGN_RISO1/ui_kits/atlas/AtlasScreen.jsx. Two things the
 * reference (and Tasks 8-9 as first built) didn't have: a real map
 * (MapBase.tsx, wrapping MapLibre GL — see its own docstring for why and
 * which provider) and, as a direct consequence, real pan alongside the
 * existing real zoom. Every marker position now comes from the map's own
 * `project()` rather than the percentage-based projection.ts math Tasks
 * 8-9 used (projection.ts's percent-based functions still exist and are
 * still tested — TornGround/RingSet's own percentage-based demos in
 * AtlasGallery still use them — they're just not how the live screen
 * places markers any more). Mount order matches the plan: basemap ->
 * isochrone -> prints/stacks -> TopBar -> Legend -> panel slot ->
 * GrainOverlay last.
 *
 * Honest scope note: no frame in the current dataset has a real photo URL
 * yet (see src/model/frame.ts's `photo` field, and migrate.ts) — the live
 * site resolves these at runtime via Wikipedia (js/photos.js), which
 * hasn't been ported here. Printed frames without a recognised category
 * (see lib/categoryImages.ts, issue 122) cycle 3 local placeholder
 * collage images instead, so the screen is visually complete without
 * inventing per-place data. Tracked as GitHub issue 105, not silently left
 * broken.
 */
const frames = rawFrames as Frame[];

const PLACEHOLDER_PHOTOS = [photoStack, collage, collage2];

/**
 * Issue 122: "replace standard pictures for old graphics from 1st
 * version... this 'frame not printed yet' is not a good idea for now...
 * let's show basic picture from category or wikipedia page image if
 * present." No frame has a resolved Wikipedia photo yet (see the file
 * docstring), so this is: a real `photo` if migrate.ts ever sets one, else
 * the place's own category illustration, else — only when neither exists —
 * one of the generic collage placeholders. Returning a real value for
 * unprinted frames too (the live site's old behaviour returned `undefined`
 * unconditionally) is what lets FrameCard show that illustration instead
 * of the hatched "not visited yet" box; Print and ContactSheet render
 * unprinted frames from their own `state`, not `src`, so this doesn't
 * change how a frame looks on the map or the contact sheet, only in its
 * own detail card.
 */
function photoFor(frame: Frame, index: number): string | undefined {
  return frame.photo ?? categoryImageFor(frame.tags) ?? (frame.state === "unprinted" ? undefined : PLACEHOLDER_PHOTOS[index % PLACEHOLDER_PHOTOS.length]);
}

/**
 * Explicit z-index scale. Necessary because any element with a *set*
 * z-index (even 1) creates its own stacking level above siblings whose
 * z-index is auto/unset, regardless of DOM order — chrome needs a higher
 * value or a print that projects near the top/side of the map paints over
 * it. Found for real in Task 8; still applies with a real map underneath.
 */
const Z_PRINT = 1;
const Z_ROLLED_PRINT = 5;
const Z_CHROME = 10;

/**
 * Print size shrinks as zoom decreases, down to 25% of full size — low
 * enough that a base 84px print (loved/fine) crosses --print-min (28px,
 * Print.tsx) and collapses to Task 4's plain-square rendering, so
 * "zoomed out" and "collapsed" are the same real mechanism, not two.
 * Real map zoom is a much wider range than the old synthetic 0-16 scale
 * ever needed to be in practice — clamped to a sane display band.
 */
const MIN_DISPLAY_ZOOM = 3;
const MAX_DISPLAY_ZOOM = 16;

function scaleForZoom(zoom: number): number {
  const clamped = Math.max(MIN_DISPLAY_ZOOM, Math.min(MAX_DISPLAY_ZOOM, zoom));
  return 0.25 + 0.75 * ((clamped - MIN_DISPLAY_ZOOM) / (MAX_DISPLAY_ZOOM - MIN_DISPLAY_ZOOM));
}

/**
 * Issue 153: "as a map... are too big they just don't fit in the mobile
 * screen... I just see like huge [prints]." The desktop-sized print (84px
 * base) was never scaled down for the mobile viewport, unlike every other
 * piece of chrome. Komoot-style small pins that still carry a name line
 * (the reporter's own reference) is the target — 0.6 keeps a full-zoom
 * print's caption readable (still comfortably above Print.tsx's 28px
 * PRINT_MIN collapse threshold) while meaningfully shrinking the footprint.
 */
const MOBILE_PRINT_SCALE = 0.6;

/**
 * Issue 123: the live site's default filter is Croatia only
 * (js/filters.js's `DEFAULT_COUNTRIES = ['hr']`) — this app showed every
 * country at once. Only applied when the dataset actually spans more than
 * one country and includes the home one; a caller passing a small custom
 * `frames` prop with no `country` field at all (every existing test
 * fixture) is unaffected; a frame with no `country` set is always shown
 * regardless of this filter, for the same reason.
 */
const HOME_COUNTRY = "hr";

export interface AtlasScreenProps {
  /** Defaults to the full migrated dataset; overridable for tests/stories. */
  frames?: Frame[];
}

export function AtlasScreen({ frames: framesProp }: AtlasScreenProps) {
  const baseFrames = framesProp ?? frames;
  // Task 10: frames added via the New Frame flow live only in this
  // session's state — there's no write API in this static site (the
  // legacy site's equivalent is a manual commit of a new places/*.json
  // file). Persisting new frames for real is a separate, future task.
  const [extraFrames, setExtraFrames] = useState<Frame[]>([]);
  const data = useMemo(() => [...baseFrames, ...extraFrames], [baseFrames, extraFrames]);
  const slot = usePanelSlot();
  const [viewMode, setViewMode] = useState<"atlas" | "sheet">("atlas");
  const [iso, setIso] = useState<FrameState | null>(null);
  const [checks, setChecks] = useState<Record<FrameState, boolean>>({ loved: true, fine: true, unprinted: true });
  const [rolled, setRolled] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [indexTab, setIndexTab] = useState("State");
  // Session-only "want to go" marks (issue 133's "★ Want to go" button) —
  // same no-write-API scope note as extraFrames above; a real visit/rating
  // is what actually moves a frame between loved/fine/unprinted.
  const [wantSet, setWantSet] = useState<ReadonlySet<string>>(new Set());
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT_QUERY);

  const availableCountries = useMemo(
    () => Array.from(new Set(baseFrames.map((f) => f.country).filter((c): c is string => Boolean(c)))).sort(),
    [baseFrames],
  );
  const defaultCountryChecks = useMemo<Record<string, boolean>>(() => {
    const restrictToHome = availableCountries.includes(HOME_COUNTRY) && availableCountries.length > 1;
    return Object.fromEntries(availableCountries.map((c) => [c, restrictToHome ? c === HOME_COUNTRY : true]));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- HOME_COUNTRY is a module constant
  }, [availableCountries]);
  const [countryChecks, setCountryChecks] = useState<Record<string, boolean>>(defaultCountryChecks);

  // The map's *initial* framing only (issue 125: "can we not show the
  // whole map? only area 3-4 hours from Zagreb is fine for now" —
  // MapBase's own fitBounds call is deliberately one-shot, see its
  // docstring). First attempt (issue 125's own first fix) derived this
  // from the default-filtered frame set's own extent — an improvement
  // over the full 9-country dataset, but still as wide as Croatia itself
  // reaches (e.g. Dubrovnik), which isn't "3-4 hours" and was still
  // "too much loading" per the follow-up comment. Tied directly to the
  // real 3h drive-time ring instead (isochrone.ts's own calibrated data,
  // already used for the map's rings — one source of truth, not a second
  // guessed radius): the initial view is exactly the ring's real extent,
  // independent of how far outlying frames in the dataset actually are.
  const bounds = useMemo(
    () => computeBounds(ovalOutline(HOME, ZAGREB_DRIVE_RINGS[ZAGREB_DRIVE_RINGS.length - 1])),
    [],
  );
  const avgSpeed = useMemo(() => averageSpeedKmh(data), [data]);

  const counts = countsByState(data);
  const trimmedQuery = search.trim().toLowerCase();
  // Memoized on the actual filter criteria, not recomputed on every pan/
  // zoom tick — issue 130 ("when showing many cards the browser is
  // visibly slow"): this used to be a plain `.filter(...)` re-run every
  // render, and buildClusterIndex() below used to rebuild its whole
  // supercluster index from *that* fresh array on every single pan/zoom
  // event (MapBase's `rerender` bump fires on 'move'/'zoom', many times a
  // second during a drag) — see clustering.ts's own docstring for why
  // that index is supposed to be built once and queried cheaply, not
  // rebuilt per frame.
  const shown = useMemo(
    () =>
      data.filter(
        (f) =>
          (!iso || f.state === iso) &&
          checks[f.state] &&
          (!f.country || countryChecks[f.country] !== false) &&
          (!tagFilter || f.tags.includes(tagFilter)) &&
          (!trimmedQuery || f.name.toLowerCase().includes(trimmedQuery) || f.q?.toLowerCase().includes(trimmedQuery)),
      ),
    [data, iso, checks, countryChecks, tagFilter, trimmedQuery],
  );
  const shownById = useMemo(() => new Map(shown.map((f) => [f.id, f])), [shown]);
  const clusterIndex = useMemo(() => buildClusterIndex(shown), [shown]);
  // Issue 159: a real results list for the search field, capped so a broad
  // query (e.g. a single letter) doesn't dump the whole dataset into a
  // dropdown.
  const searchMatches = useMemo(
    () => (trimmedQuery ? shown.slice(0, 8).map((f) => ({ id: f.id, label: f.name })) : []),
    [trimmedQuery, shown],
  );

  const slotState = slot.state; // local const so TS narrows `kind` through the closure below
  const openFrame = slotState.kind === "card" ? data.find((f) => f.id === slotState.frameId) : undefined;
  const activeCheckCount = Object.values(checks).filter(Boolean).length;
  const filterCount = 3 - activeCheckCount + (tagFilter ? 1 : 0) + (trimmedQuery ? 1 : 0);

  const stateSection: IndexSection = {
    tab: "State",
    rows: [
      { key: "loved", label: STATE_LABEL.loved, count: counts.loved, checked: checks.loved, swatch: { background: "var(--pink)" } },
      { key: "fine", label: STATE_LABEL.fine, count: counts.fine, checked: checks.fine, swatch: { background: "var(--state-fine)" } },
      { key: "unprinted", label: STATE_LABEL.unprinted, count: counts.unprinted, checked: checks.unprinted, swatch: { border: "1.5px dashed var(--unprinted-edge)" } },
    ],
  };
  const countrySection: IndexSection | null =
    availableCountries.length > 0
      ? {
          tab: "Country",
          rows: availableCountries.map((c) => ({
            key: c,
            label: c.toUpperCase(),
            count: data.filter((f) => f.country === c).length,
            checked: countryChecks[c] !== false,
          })),
        }
      : null;
  const sections: IndexSection[] = countrySection ? [stateSection, countrySection] : [stateSection];

  const toggleRow = (tab: string, key: string) => {
    if (tab === "Country") {
      setCountryChecks((prev) => ({ ...prev, [key]: !(prev[key] ?? true) }));
    } else {
      setChecks((prev) => ({ ...prev, [key]: !prev[key as FrameState] }));
    }
  };

  // Issue 124 ("after clicking the index there are no places nor filter
  // present"): reachable by turning every State row off (0 frames can
  // ever match) with no way back in the panel itself — the live site's
  // equivalent ("Выбрать все"/"Снять все", js/filters.js) at least had a
  // select-all. Surfaced two ways: this reset (wired to the empty-map
  // message below) and, more simply, filters just aren't a dead end.
  const resetFilters = () => {
    setChecks({ loved: true, fine: true, unprinted: true });
    setCountryChecks(defaultCountryChecks);
    setIso(null);
    setTagFilter(null);
    setSearch("");
  };

  const toggleIndex = () => {
    if (slot.state.kind === "index") slot.close();
    else slot.openIndex();
  };

  const closeCard = () => {
    slot.close();
    setRolled(null);
  };

  const toggleWant = (id: string) => {
    setWantSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Issue 109 checklist: "link to Google Maps from a place." No origin
  // specified — Google fills in the user's own current location, same as
  // the live site's equivalent link (js/map.js).
  const openRoute = (frame: Frame) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${frame.lat},${frame.lon}`, "_blank", "noopener");
  };

  const saveNewFrame = ({ name, lat, lon }: { name: string; lat: number; lon: number }) => {
    const distanceKm = haversineKm(HOME, { lat, lon });
    const newFrame: Frame = {
      // crypto.randomUUID() is a real place id, same as everywhere else in
      // the dataset — just generated client-side instead of coming from
      // migrate.ts's own id assignment.
      id: crypto.randomUUID(),
      name,
      state: "unprinted",
      lat,
      lon,
      distanceKm: Math.round(distanceKm * 10) / 10,
      driveMinutes: Math.round((distanceKm / avgSpeed) * 60),
      tags: [],
    };
    setExtraFrames((prev) => [...prev, newFrame]);
    slot.close();
  };

  return (
    <div style={{ position: "relative", height: "100vh", overflow: "hidden", background: "var(--paper-3)" }}>
      {/* Print CSS (styles/print.css) hides everything with this class —
          the real map, every marker, all chrome — so only the Contact
          Sheet (a genuine sibling, not nested in here) prints. */}
      <div className="riso-print-hide" style={{ position: "absolute", inset: 0 }}>
        <MapBase initialBounds={bounds} onLongPress={(point) => slot.openNewFrame(point.lat, point.lon)}>
          {(map) => {
          const clusters = getClustersAtZoom(clusterIndex, map.zoom);
          const printScale = scaleForZoom(map.zoom);

          const rollOne = () => {
            const pool = data.filter((f) => f.state === "unprinted");
            if (pool.length === 0) return;
            const pick = pool[Math.floor(Math.random() * pool.length)];
            setRolled(pick.id);
            // Pan/zoom to the picked frame so it's guaranteed visible —
            // real pan makes this a better experience than Task 9's
            // original "just zoom fully in and hope it's not off-screen".
            map.flyTo({ lat: pick.lat, lon: pick.lon }, 14);
            slot.openCard(pick.id);
            setViewMode("atlas");
          };

          // Issue 159: the search field used to only ever filter pins
          // silently behind this bar. Picking a result now also guarantees
          // it's actually visible, same treatment as "To Print" above.
          const selectSearchResult = (id: string) => {
            const f = data.find((fr) => fr.id === id);
            if (!f) return;
            map.flyTo({ lat: f.lat, lon: f.lon }, 14);
            slot.openCard(f.id);
            setViewMode("atlas");
            setSearch("");
          };

          // Issue 133 ("Same roll... doesn't work") first renamed this
          // "Similar places", filtering the map to other frames sharing
          // the card's primary category. Issue 154: on mobile that read as
          // a no-op — "it's just get me back to the map and doesn't open
          // any similar places" — because a silent filter with no
          // guaranteed-visible result is indistinguishable from doing
          // nothing (same failure shape as issue 159's search field).
          // Now flies to and opens the nearest actual match, same
          // treatment as "To Print" and search-select above; with no
          // match at all, it leaves the filter untouched rather than
          // applying one that hides every remaining pin.
          const showSimilar = (frame: Frame) => {
            const tag = frame.tags[0] ?? null;
            if (!tag) {
              slot.close();
              return;
            }
            const candidates = data.filter((f) => f.id !== frame.id && f.tags.includes(tag));
            if (candidates.length === 0) {
              slot.close();
              return;
            }
            const nearest = candidates.reduce((best, f) => (f.driveMinutes < best.driveMinutes ? f : best));
            setTagFilter(tag);
            map.flyTo({ lat: nearest.lat, lon: nearest.lon }, 14);
            slot.openCard(nearest.id);
            setViewMode("atlas");
          };

          // Issue 126: real, directionally-calibrated drive-time rings
          // (see isochrone.ts's ZAGREB_DRIVE_RINGS) projected through the
          // real map, replacing the old single-radius circle — a uniform
          // radius necessarily gets *some* direction wrong (the old ring
          // put its 2h edge over Karlovac, a real 1h drive).
          const ringPolygons = ZAGREB_DRIVE_RINGS.map((ring) => {
            const projected = ovalOutline(HOME, ring)
              .map((pt) => map.project(pt))
              .filter((p): p is { x: number; y: number } => p !== null);
            if (projected.length < 3) return null;
            return (
              <polygon
                key={ring.label}
                points={projected.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke="rgba(25,21,16,.45)"
                strokeWidth={3}
                strokeDasharray="7 7"
              />
            );
          });
          const ringLabels = ZAGREB_DRIVE_RINGS.map((ring) => {
            // Due-north edge of the ring — the same anchor point the live
            // site's tooltip uses (js/map.js's drawBase: `openTooltip(destPoint(base, ring.N, 0))`).
            const p = map.project(destPoint(HOME, ring.n, 0));
            if (!p) return null;
            return (
              <RingLabel
                key={ring.label}
                aria-hidden="true"
                style={{ position: "absolute", left: p.x, top: p.y, transform: "translate(-50%,-140%) rotate(-4deg)", zIndex: Z_CHROME }}
              >
                {ring.label}
              </RingLabel>
            );
          });

          return (
            <>
              <svg aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
                {ringPolygons}
              </svg>
              {ringLabels}

              {viewMode === "atlas"
                ? clusters.map((feature) => {
                    const [lon, lat] = feature.geometry.coordinates;
                    const p = map.project({ lat, lon });
                    if (!p) return null;

                    if (isCluster(feature)) {
                      const { cluster_id: clusterId, point_count: count } = feature.properties;
                      const { tilt } = derivePrintTransform(`cluster-${clusterId}`);
                      const clusterScale = isMobile ? MOBILE_PRINT_SCALE : 1;
                      return (
                        <div key={`cluster-${clusterId}`} style={{ position: "absolute", left: p.x, top: p.y, transform: "translate(-50%,-50%)", zIndex: Z_PRINT, pointerEvents: "auto" }}>
                          <FrameStack
                            count={count}
                            tilt={tilt}
                            width={Math.round(58 * clusterScale)}
                            height={Math.round(46 * clusterScale)}
                            onClick={() => map.flyTo({ lat, lon }, clusterIndex.getClusterExpansionZoom(clusterId))}
                          />
                        </div>
                      );
                    }

                    const f = shownById.get(feature.properties.frameId);
                    if (!f) return null;
                    const i = data.indexOf(f);
                    const { edge, tilt } = derivePrintTransform(f.id);
                    const mobileScale = isMobile ? MOBILE_PRINT_SCALE : 1;
                    const baseWidth = (f.state === "unprinted" ? 56 : 84) * mobileScale;
                    const baseHeight = (f.state === "unprinted" ? 42 : 62) * mobileScale;
                    return (
                      <div
                        key={f.id}
                        style={{ position: "absolute", left: p.x, top: p.y, transform: "translate(-50%,-100%)", zIndex: rolled === f.id ? Z_ROLLED_PRINT : Z_PRINT, pointerEvents: "auto" }}
                      >
                        <Print
                          state={f.state}
                          src={photoFor(f, i)}
                          caption={f.state !== "unprinted" ? f.name : undefined}
                          tape={f.state === "loved"}
                          star={f.state === "loved" || wantSet.has(f.id)}
                          pin
                          tilt={tilt}
                          edge={edge}
                          width={Math.round(baseWidth * printScale)}
                          height={Math.round(baseHeight * printScale)}
                          onClick={() => slot.openCard(f.id)}
                          style={rolled === f.id ? { outline: "3px solid var(--yellow)", outlineOffset: 4 } : undefined}
                        />
                      </div>
                    );
                  })
                : null}

              <div style={{ position: "absolute", right: 16, bottom: 16, zIndex: Z_CHROME, pointerEvents: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                {/* Issue 157: "no home button... hard to go back to the
                    home location" once panned away to a far-off frame. */}
                <IconButton glyph="⌂" label="Back to home area" onClick={() => map.fitBounds(bounds)} />
                <IconButton glyph="+" label="Zoom in" onClick={map.zoomIn} />
                <IconButton glyph="−" label="Zoom out" onClick={map.zoomOut} />
              </div>

              <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: Z_CHROME, pointerEvents: "auto" }}>
                <TopBar
                  brand="The Atlas"
                  meta={formatMeta("Zagreb", counts)}
                  filterCount={filterCount}
                  searchValue={search}
                  onSearchChange={setSearch}
                  searchResults={searchMatches}
                  onSelectSearchResult={selectSearchResult}
                  onIndex={toggleIndex}
                  onPrint={rollOne}
                  // Long-press is the decided way to start New Frame
                  // (epic #84) — this button is a fallback for anyone who
                  // doesn't find/use the gesture, opening the form at the
                  // map's current centre instead of a pressed point.
                  onNewFrame={() => slot.openNewFrame(map.center.lat, map.center.lon)}
                />
              </div>

              {/* Task 11: "Legend moves above the sheet, stays visible" —
                  on mobile, once the bottom sheet is occupied, it would
                  otherwise sit underneath/behind it. */}
              <div
                style={{
                  position: "absolute",
                  left: 16,
                  bottom: isMobile && slot.state.kind !== "empty" ? `calc(${MOBILE_SHEET_MAX_HEIGHT_VH}vh + 16px)` : 16,
                  zIndex: Z_CHROME,
                  pointerEvents: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                {tagFilter ? (
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`Remove ${tagFilter} filter`}
                    onClick={() => setTagFilter(null)}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Enter") {
                        e.preventDefault();
                        setTagFilter(null);
                      }
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "5px 9px",
                      font: "var(--label-sm)",
                      fontSize: 10,
                      letterSpacing: ".1em",
                      textTransform: "uppercase",
                      background: "var(--ink)",
                      color: "var(--text-on-invert)",
                      border: "1.5px solid var(--ink)",
                      cursor: "pointer",
                    }}
                  >
                    Tag: {tagFilter}
                    <span aria-hidden="true">✕</span>
                  </span>
                ) : null}
                <Legend counts={counts} active={iso} onToggle={(k) => setIso(iso === k ? null : k)} />
                <Button variant="secondary" size="sm" onClick={() => setViewMode(viewMode === "atlas" ? "sheet" : "atlas")}>
                  {viewMode === "atlas" ? "Contact sheet" : "Back to the atlas"}
                </Button>
              </div>

              {/* Issue 124: turning every filter off (State rows, tag,
                  search, country) leaves an empty map with no obvious way
                  back — a labelled dead end is still a dead end. */}
              {shown.length === 0 ? (
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%,-50%)",
                    zIndex: Z_CHROME,
                    pointerEvents: "auto",
                    background: "var(--paper-2)",
                    border: "var(--stroke-heavy)",
                    boxShadow: "var(--lift-3)",
                    padding: "18px 22px",
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <p style={{ margin: 0, font: "var(--body)", color: "var(--text-strong)" }}>No frames match your filters.</p>
                  <Button variant="secondary" size="sm" onClick={resetFilters}>
                    Reset filters
                  </Button>
                </div>
              ) : null}

              <PanelSlot
                state={slot.state}
                renderIndex={() => (
                  <IndexPanel
                    sections={sections}
                    activeTab={indexTab}
                    onTab={setIndexTab}
                    onToggleRow={toggleRow}
                    footerCount={shown.length}
                    style={{ width: "100%" }}
                  />
                )}
                renderCard={() =>
                  openFrame ? (
                    <FrameCard
                      name={openFrame.name}
                      state={openFrame.state}
                      src={photoFor(openFrame, data.indexOf(openFrame))}
                      // Issue 155: try a real Wikipedia photo whenever
                      // there's no curated one yet (frame.photo — see its
                      // own comment in model/frame.ts) rather than always
                      // falling back to the generic category/placeholder
                      // art photoFor() resolves above.
                      wikiQuery={openFrame.photo ? undefined : openFrame.q || openFrame.name}
                      description={openFrame.description}
                      driveTime={formatDrive(openFrame.driveMinutes)}
                      distance={`${openFrame.distanceKm} km`}
                      tags={openFrame.tags}
                      activeTag={tagFilter}
                      searchUrl={`https://www.google.com/search?q=${encodeURIComponent(openFrame.q || openFrame.name)}`}
                      onTagClick={(tag) => setTagFilter((prev) => (prev === tag ? null : tag))}
                      onClose={closeCard}
                      onNearby={() => showSimilar(openFrame)}
                      onToPrint={() => toggleWant(openFrame.id)}
                      onRoute={() => openRoute(openFrame)}
                      style={{ width: "100%" }}
                    />
                  ) : null
                }
                renderNewFrame={(lat, lon) => <NewFrameForm lat={lat} lon={lon} onSave={saveNewFrame} onCancel={() => slot.close()} style={{ width: "100%" }} />}
              />
            </>
          );
          }}
        </MapBase>
      </div>

      {viewMode === "sheet" ? (
        <div
          className="riso-contact-sheet-print"
          style={{ position: "absolute", left: "50%", top: 96, transform: "translateX(-50%)", width: "min(760px, 88%)", zIndex: Z_CHROME, pointerEvents: "auto" }}
        >
          <ContactSheet
            frames={data.map((f, i) => ({ id: f.id, name: f.name, src: photoFor(f, i), state: f.state, driveMinutes: f.driveMinutes }))}
            range="2023—2026"
            onClose={() => setViewMode("atlas")}
            // Issue 156: "it's not clickable" — onPick was never wired at
            // all, so tapping a cell did nothing. Uses the frame's real id
            // (not the sorted-array index ContactSheet also passes back)
            // so the right card opens no matter the current sort order.
            onPick={(f) => {
              if (!f.id) return;
              setViewMode("atlas");
              slot.openCard(f.id);
            }}
          />
        </div>
      ) : null}

      <GrainOverlay />
    </div>
  );
}
