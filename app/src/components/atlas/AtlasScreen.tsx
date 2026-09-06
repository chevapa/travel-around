import { Fragment, useMemo, useState } from "react";
import collage from "../../assets/images/collage.jpeg";
import collage2 from "../../assets/images/collage2.webp";
import photoBeach from "../../assets/images/photo-beach.jpeg";
import photoStack from "../../assets/images/photo-stack.jpeg";
import rawFrames from "../../data/frames.json";
import { countsByState, formatDrive, formatMeta, type Frame, type FrameState } from "../../model/frame";
import { averageSpeedKmh } from "./isochrone";
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
import { computeBounds, metersPerPixel } from "./projection";
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
 * hasn't been ported here. Printed frames cycle the 4 local placeholder
 * images instead, so the screen is visually complete without inventing
 * per-place data. Tracked as GitHub issue 105, not silently left broken.
 */
const frames = rawFrames as Frame[];

const PLACEHOLDER_PHOTOS = [photoStack, collage, collage2, photoBeach];

function photoFor(frame: Frame, index: number): string | undefined {
  if (frame.state === "unprinted") return undefined;
  return frame.photo ?? PLACEHOLDER_PHOTOS[index % PLACEHOLDER_PHOTOS.length];
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

/** Drive-time rings, drawn as real circles around the real Zagreb home point (see isochrone.ts's own averageSpeedKmh) — they now move and resize correctly with real pan/zoom, rather than being fixed percentages of an arbitrary box. */
const RING_SPECS = [
  { minutes: 120, label: "2 H" },
  { minutes: 60, label: "1 H" },
];

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
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT_QUERY);

  const bounds = useMemo(() => computeBounds(data.map((f) => ({ lat: f.lat, lon: f.lon }))), [data]);
  const avgSpeed = useMemo(() => averageSpeedKmh(data), [data]);

  const counts = countsByState(data);
  const shown = data.filter((f) => (!iso || f.state === iso) && checks[f.state]);
  const shownById = useMemo(() => new Map(shown.map((f) => [f.id, f])), [shown]);

  const slotState = slot.state; // local const so TS narrows `kind` through the closure below
  const openFrame = slotState.kind === "card" ? data.find((f) => f.id === slotState.frameId) : undefined;
  const activeCheckCount = Object.values(checks).filter(Boolean).length;
  const filterCount = activeCheckCount === 3 ? 0 : 3 - activeCheckCount;

  const sections: IndexSection[] = [
    {
      tab: "State",
      rows: [
        { key: "loved", label: "Printed · loved", count: counts.loved, checked: checks.loved, swatch: { background: "var(--pink)" } },
        { key: "fine", label: "Printed · fine", count: counts.fine, checked: checks.fine, swatch: { background: "var(--state-fine)" } },
        { key: "unprinted", label: "Not printed", count: counts.unprinted, checked: checks.unprinted, swatch: { border: "1.5px dashed var(--unprinted-edge)" } },
      ],
    },
  ];

  const toggleCheck = (_tab: string, key: string) => {
    setChecks((prev) => ({ ...prev, [key]: !prev[key as FrameState] }));
  };

  const toggleIndex = () => {
    if (slot.state.kind === "index") slot.close();
    else slot.openIndex();
  };

  const closeCard = () => {
    slot.close();
    setRolled(null);
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
          const clusterIndex = buildClusterIndex(shown);
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

          const home = map.project(HOME);
          const ringElements = home
            ? RING_SPECS.map(({ minutes, label }) => {
                const radiusKm = avgSpeed * (minutes / 60);
                const radiusPx = (radiusKm * 1000) / metersPerPixel(HOME.lat, map.zoom);
                return (
                  <Fragment key={label}>
                    <span
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        left: home.x - radiusPx,
                        top: home.y - radiusPx,
                        width: radiusPx * 2,
                        height: radiusPx * 2,
                        border: "3px dashed rgba(25,21,16,.45)",
                        borderRadius: "50%",
                      }}
                    />
                    <RingLabel
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        left: home.x - radiusPx,
                        top: home.y,
                        transform: "translate(-50%, -50%) rotate(-4deg)",
                        // Unlike the dashed ring itself (deliberately under
                        // prints — RingLabel.prompt.md: "sit under the
                        // prints"), the pennant needs to stay legible. The
                        // real map can genuinely put the ring's edge right
                        // where the densest cluster is (Zagreb is both the
                        // isochrone centre and, by far, the densest area of
                        // the dataset) — a print/cluster with an explicit
                        // z-index otherwise paints straight over it.
                        zIndex: Z_CHROME,
                      }}
                    >
                      {label}
                    </RingLabel>
                  </Fragment>
                );
              })
            : null;

          return (
            <>
              {ringElements}

              {viewMode === "atlas"
                ? clusters.map((feature) => {
                    const [lon, lat] = feature.geometry.coordinates;
                    const p = map.project({ lat, lon });
                    if (!p) return null;

                    if (isCluster(feature)) {
                      const { cluster_id: clusterId, point_count: count } = feature.properties;
                      const { tilt } = derivePrintTransform(`cluster-${clusterId}`);
                      return (
                        <div key={`cluster-${clusterId}`} style={{ position: "absolute", left: p.x, top: p.y, transform: "translate(-50%,-50%)", zIndex: Z_PRINT, pointerEvents: "auto" }}>
                          <FrameStack count={count} tilt={tilt} onClick={() => map.flyTo({ lat, lon }, clusterIndex.getClusterExpansionZoom(clusterId))} />
                        </div>
                      );
                    }

                    const f = shownById.get(feature.properties.frameId);
                    if (!f) return null;
                    const i = data.indexOf(f);
                    const { edge, tilt } = derivePrintTransform(f.id);
                    const baseWidth = f.state === "unprinted" ? 56 : 84;
                    const baseHeight = f.state === "unprinted" ? 42 : 62;
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
                          star={f.state === "loved"}
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
                <IconButton glyph="+" label="Zoom in" onClick={map.zoomIn} />
                <IconButton glyph="−" label="Zoom out" onClick={map.zoomOut} />
              </div>

              <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: Z_CHROME, pointerEvents: "auto" }}>
                <TopBar
                  brand="The Atlas"
                  meta={formatMeta("Zagreb", counts)}
                  filterCount={filterCount}
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
                <Legend counts={counts} active={iso} onToggle={(k) => setIso(iso === k ? null : k)} />
                <Button variant="secondary" size="sm" onClick={() => setViewMode(viewMode === "atlas" ? "sheet" : "atlas")}>
                  {viewMode === "atlas" ? "Contact sheet" : "Back to the atlas"}
                </Button>
              </div>

              <PanelSlot
                state={slot.state}
                renderIndex={() => <IndexPanel sections={sections} activeTab="State" onToggleRow={toggleCheck} footerCount={shown.length} style={{ width: "100%" }} />}
                renderCard={() =>
                  openFrame ? (
                    <FrameCard
                      name={openFrame.name}
                      state={openFrame.state}
                      src={photoFor(openFrame, data.indexOf(openFrame))}
                      description={openFrame.description}
                      driveTime={formatDrive(openFrame.driveMinutes)}
                      distance={`${openFrame.distanceKm} km`}
                      tags={openFrame.tags}
                      onClose={closeCard}
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
            frames={data.map((f, i) => ({ name: f.name, src: photoFor(f, i), state: f.state, driveMinutes: f.driveMinutes }))}
            range="2023—2026"
          />
        </div>
      ) : null}

      <GrainOverlay />
    </div>
  );
}
