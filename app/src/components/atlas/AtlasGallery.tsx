import { useState } from "react";
import photoStack from "../../assets/images/photo-stack.jpeg";
import collage from "../../assets/images/collage.jpeg";
import collage2 from "../../assets/images/collage2.webp";
import { FrameStack } from "./FrameStack";
import { computeIsochroneRings } from "./isochrone";
import { Legend } from "./Legend";
import { derivePrintTransform, Print } from "./Print";
import { RingSet } from "./RingLabel";
import { TornGround } from "./TornGround";
import type { FrameState } from "../../model/frame";

/**
 * Every Print variant on one page — the atlas-side half of the "Storybook
 * or equivalent" acceptance check (Task 3/4,
 * DESIGN_RISO1/IMPLEMENTATION_PLAN.md). Grows with Task 5's FrameStack,
 * RingLabel, Legend, TornGround.
 */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "var(--s-4)" }}>
      <h2 style={{ font: "var(--eyebrow)", letterSpacing: "var(--eyebrow-tracking)", textTransform: "uppercase", color: "var(--text-quiet)", margin: 0 }}>
        {label}
      </h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--s-6)", alignItems: "flex-end" }}>{children}</div>
    </section>
  );
}

const SAMPLE_IDS = ["b7nmno2d", "o3rsks02", "e5m4s41l", "wux2iksh"];

const DEMO_RINGS = computeIsochroneRings(
  [
    { minutes: 120, label: "2 H" },
    { minutes: 60, label: "1 H" },
  ],
  60,
  140,
);

export function AtlasGallery() {
  const [isolated, setIsolated] = useState<FrameState | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-9)", padding: "var(--s-9)", background: "var(--surface-ground)" }}>
      <Row label="TornGround + RingSet + Legend — a miniature Atlas">
        <div style={{ position: "relative", width: 520, height: 340, border: "var(--stroke-heavy)" }}>
          <TornGround fragments={[collage2, collage, photoStack]} />
          <RingSet rings={DEMO_RINGS} />
          <div style={{ position: "absolute", left: "42%", top: "48%" }}>
            <Print state="loved" src={photoStack} width={56} height={42} pin tilt={-3} />
          </div>
          <div style={{ position: "absolute", left: "60%", top: "30%" }}>
            <FrameStack count={3} />
          </div>
          <div style={{ position: "absolute", left: 12, bottom: 12 }}>
            <Legend active={isolated} onToggle={(k) => setIsolated((cur) => (cur === k ? null : k))} />
          </div>
        </div>
      </Row>

      <Row label="FrameStack — quieter than a Print, never coloured">
        <FrameStack count={2} />
        <FrameStack count={5} width={70} height={54} tilt={4} />
      </Row>

      <Row label="Print — three states at 96px">
        <Print state="loved" src={photoStack} caption="Krapina '24" width={96} height={70} tape star pin tilt={-4} />
        <Print state="fine" src={collage} caption="Ludbreg" width={96} height={70} pin tilt={3} edge={1} />
        <Print state="unprinted" width={96} height={70} pin tilt={-2} />
      </Row>

      <Row label="Print — three states at 56px">
        <Print state="loved" src={photoStack} width={56} height={42} pin tilt={2} edge={2} />
        <Print state="fine" src={collage} width={56} height={42} pin tilt={-1} />
        <Print state="unprinted" width={56} height={42} pin tilt={1} />
      </Row>

      <Row label="Print — three states at 20px (below --print-min: bare square, 44px tap target)">
        <Print state="loved" width={20} height={20} pin />
        <Print state="fine" width={20} height={20} pin />
        <Print state="unprinted" width={20} height={20} pin />
      </Row>

      <Row label="derivePrintTransform — deterministic edge/tilt per frame id">
        {SAMPLE_IDS.map((id) => {
          const { edge, tilt } = derivePrintTransform(id);
          return <Print key={id} state="loved" src={photoStack} width={72} height={54} edge={edge} tilt={tilt} pin />;
        })}
      </Row>
    </div>
  );
}
