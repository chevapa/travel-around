import { useMemo, useState } from "react";
import collage from "../../assets/images/collage.jpeg";
import collage2 from "../../assets/images/collage2.webp";
import photoBeach from "../../assets/images/photo-beach.jpeg";
import photoStack from "../../assets/images/photo-stack.jpeg";
import rawFrames from "../../data/frames.json";
import { countsByState, formatDrive, formatMeta, type Frame, type FrameState } from "../../model/frame";
import { haversineKm } from "../../model/migrate";
import { Button } from "../core/Button";
import { GrainOverlay } from "../core/GrainOverlay";
import { IconButton } from "../core/IconButton";
import { ContactSheet } from "../shell/ContactSheet";
import { FrameCard } from "../shell/FrameCard";
import { IndexPanel, type IndexSection } from "../shell/IndexPanel";
import { PanelSlot } from "../shell/PanelSlot";
import { usePanelSlot } from "../shell/panelSlotReducer";
import { TopBar } from "../shell/TopBar";
import { buildClusterIndex, getClustersAtZoom, isCluster, MAX_ZOOM, MIN_ZOOM } from "./clustering";
import { FrameStack } from "./FrameStack";
import { averageSpeedKmh, computeIsochroneRings } from "./isochrone";
import { Legend } from "./Legend";
import { derivePrintTransform, Print } from "./Print";
import { computeBounds, projectToPercent } from "./projection";
import { RingSet } from "./RingLabel";
import { TornGround } from "./TornGround";

/**
 * The product's main view: torn-collage terrain, prints pinned to it, one
 * bar of chrome, a permanent legend, and a single right-hand panel slot
 * shared by The Index and a FrameCard.
 *
 * Ported from DESIGN_RISO1/ui_kits/atlas/AtlasScreen.jsx, replacing its
 * mock frames.js positions with real projected coordinates (projection.ts)
 * from the migrated dataset (src/data/frames.json, Task 2). Mount order
 * matches the plan exactly: TornGround -> RingSet -> prints/stacks ->
 * TopBar -> Legend -> panel slot -> GrainOverlay last.
 *
 * Honest scope note: no frame in the current dataset has a real photo URL
 * yet (see src/model/frame.ts's `photo` field, and migrate.ts) — the live
 * site resolves these at runtime via Wikipedia (js/photos.js), which
 * hasn't been ported here. Printed frames cycle the 4 local placeholder
 * images instead, so the screen is visually complete without inventing
 * per-place data. Tracked as a follow-up, not silently left broken.
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
 * z-index is auto/unset, regardless of DOM order — so chrome (TopBar,
 * Legend, the panel slot) needs its own explicit, higher value or a print
 * that happens to project near the top/side of the map paints over it.
 * This is a real bug the reference ui_kit never exposed: its mock
 * frames.js positions all sit well clear of the chrome (y: 24-80%), but
 * real projected coordinates (projection.ts) legitimately land within a
 * few percent of the edge, since they cover this dataset's full extent.
 */
const Z_PRINT = 1;
const Z_ROLLED_PRINT = 5;
const Z_CHROME = 10;

const RING_SPECS = [
  { minutes: 120, label: "2 H" },
  { minutes: 60, label: "1 H" },
];

/**
 * A middling default: on the real 116-frame dataset this resolves to
 * roughly 95 features (~17 clusters, ~78 leaves) — enough clustering to be
 * visibly doing something, not so much the map reads as empty. See the
 * empirical sweep in clustering.test.ts's real-dataset test and this
 * task's PR description for the full zoom/feature-count table.
 */
const DEFAULT_ZOOM = 9;

/**
 * Print size shrinks as zoom decreases, down to 25% of full size — low
 * enough that a base 84px print (loved/fine) crosses --print-min (28px,
 * Print.tsx) and collapses to Task 4's plain-square rendering, so
 * "zoomed out" and "collapsed" are the same real mechanism, not two.
 */
function scaleForZoom(zoom: number): number {
  const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
  return 0.25 + 0.75 * (clamped / MAX_ZOOM);
}

export interface AtlasScreenProps {
  /** Defaults to the full migrated dataset; overridable for tests/stories. */
  frames?: Frame[];
}

export function AtlasScreen({ frames: framesProp }: AtlasScreenProps) {
  const data = framesProp ?? frames;
  const slot = usePanelSlot();
  const [view, setView] = useState<"atlas" | "sheet">("atlas");
  const [iso, setIso] = useState<FrameState | null>(null);
  const [checks, setChecks] = useState<Record<FrameState, boolean>>({ loved: true, fine: true, unprinted: true });
  const [rolled, setRolled] = useState<string | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  const bounds = useMemo(() => computeBounds(data.map((f) => ({ lat: f.lat, lon: f.lon }))), [data]);

  // How many real-world km the projected box's half-width covers, so the
  // isochrone rings (a real, non-mock radius since Task 5) can be drawn at
  // the right relative size against however far this dataset's own extent
  // happens to run — Zagreb day trips out to Skopje and Berat, see
  // migrate.ts, so this is not a fixed constant.
  const kmPerContainerHalf = useMemo(() => {
    const midLat = (bounds.minLat + bounds.maxLat) / 2;
    const westEastKm = haversineKm({ lat: midLat, lon: bounds.minLon }, { lat: midLat, lon: bounds.maxLon });
    return Math.max(westEastKm / 2, 1);
  }, [bounds]);

  const avgSpeed = useMemo(() => averageSpeedKmh(data), [data]);
  const rings = useMemo(() => computeIsochroneRings(RING_SPECS, avgSpeed, kmPerContainerHalf), [avgSpeed, kmPerContainerHalf]);

  const counts = countsByState(data);
  const shown = data.filter((f) => (!iso || f.state === iso) && checks[f.state]);
  const shownById = useMemo(() => new Map(shown.map((f) => [f.id, f])), [shown]);

  // Task 9: real clustering (supercluster) over whatever's currently
  // shown (after the legend isolate + state-filter above) — a frame the
  // filters hide shouldn't still occupy a cluster slot.
  const clusterIndex = useMemo(() => buildClusterIndex(shown), [shown]);
  const clusters = useMemo(() => getClustersAtZoom(clusterIndex, zoom), [clusterIndex, zoom]);
  const printScale = scaleForZoom(zoom);
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

  const rollOne = () => {
    const pool = data.filter((f) => f.state === "unprinted");
    if (pool.length === 0) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setRolled(pick.id);
    // Zoom fully in so the rolled frame is guaranteed to render as its own
    // leaf, never buried inside a cluster it'd otherwise be highlighted
    // inside of without being individually visible.
    setZoom(MAX_ZOOM);
    slot.openCard(pick.id);
    setView("atlas");
  };

  const toggleIndex = () => {
    if (slot.state.kind === "index") slot.close();
    else slot.openIndex();
  };

  const closeCard = () => {
    slot.close();
    setRolled(null);
  };

  return (
    <div style={{ position: "relative", height: "100vh", overflow: "hidden", background: "var(--paper-3)" }}>
      <TornGround fragments={[collage2, collage, photoStack, photoBeach]} />
      <RingSet rings={rings} />

      {view === "atlas"
        ? clusters.map((feature) => {
            const [lon, lat] = feature.geometry.coordinates;
            const { x, y } = projectToPercent({ lat, lon }, bounds);

            if (isCluster(feature)) {
              const { cluster_id: clusterId, point_count: count } = feature.properties;
              const { tilt } = derivePrintTransform(`cluster-${clusterId}`);
              return (
                <div key={`cluster-${clusterId}`} style={{ position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)", zIndex: Z_PRINT }}>
                  <FrameStack
                    count={count}
                    tilt={tilt}
                    onClick={() => setZoom(Math.min(MAX_ZOOM, clusterIndex.getClusterExpansionZoom(clusterId)))}
                  />
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
                style={{ position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-100%)", zIndex: rolled === f.id ? Z_ROLLED_PRINT : Z_PRINT }}
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

      <div style={{ position: "absolute", right: 16, bottom: 16, zIndex: Z_CHROME, display: "flex", flexDirection: "column", gap: 6 }}>
        <IconButton glyph="+" label="Zoom in" onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + 1))} />
        <IconButton glyph="−" label="Zoom out" onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - 1))} />
      </div>

      <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: Z_CHROME }}>
        <TopBar brand="The Atlas" meta={formatMeta("Zagreb", counts)} filterCount={filterCount} onIndex={toggleIndex} onPrint={rollOne} />
      </div>

      <div style={{ position: "absolute", left: 16, bottom: 16, zIndex: Z_CHROME, display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start" }}>
        <Legend counts={counts} active={iso} onToggle={(k) => setIso(iso === k ? null : k)} />
        <Button variant="secondary" size="sm" onClick={() => setView(view === "atlas" ? "sheet" : "atlas")}>
          {view === "atlas" ? "Contact sheet" : "Back to the atlas"}
        </Button>
      </div>

      {view === "sheet" ? (
        <div style={{ position: "absolute", left: "50%", top: 96, transform: "translateX(-50%)", width: "min(760px, 88%)", zIndex: Z_CHROME }}>
          <ContactSheet
            frames={data.map((f, i) => ({ name: f.name, src: photoFor(f, i), state: f.state, driveMinutes: f.driveMinutes }))}
            range="2023—2026"
          />
        </div>
      ) : null}

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
      />

      <GrainOverlay />
    </div>
  );
}

