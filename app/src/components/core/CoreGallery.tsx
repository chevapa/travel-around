import { useState } from "react";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { Paper } from "./Paper";
import { StampCheck } from "./StampCheck";
import { Tag } from "./Tag";

/**
 * Renders every variant of every Task 3 core primitive on one page — the
 * "Storybook or equivalent" acceptance check from
 * DESIGN_RISO1/IMPLEMENTATION_PLAN.md Task 3. Also the page
 * core.a11y.test.tsx renders and runs axe against.
 */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "var(--s-4)" }}>
      <h2 style={{ font: "var(--eyebrow)", letterSpacing: "var(--eyebrow-tracking)", textTransform: "uppercase", color: "var(--text-quiet)", margin: 0 }}>
        {label}
      </h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--s-5)", alignItems: "center" }}>{children}</div>
    </section>
  );
}

export function CoreGallery() {
  const [checked1, setChecked1] = useState(false);
  const [checked2, setChecked2] = useState(true);

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: "var(--s-9)", padding: "var(--s-9)", background: "var(--surface-page)" }}>
      <Row label="Paper — tone">
        <Paper tone="card">card</Paper>
        <Paper tone="page">page</Paper>
        <Paper tone="ground">ground</Paper>
        <Paper tone="ink">ink</Paper>
      </Row>

      <Row label="Paper — lift">
        <Paper lift="none">none</Paper>
        <Paper lift="sm">sm</Paper>
        <Paper lift="md">md</Paper>
        <Paper lift="lg">lg</Paper>
      </Row>

      <Row label="Paper — tape">
        <Paper tape>Sveti Križ Začretje</Paper>
      </Row>

      <Row label="Button — variant (exactly one primary here, by design)">
        <Button variant="primary">To Print →</Button>
        <Button variant="secondary">New Frame</Button>
        <Button variant="invert" badge={2}>
          The Index
        </Button>
        <Button variant="accent">Not interested</Button>
        <Button variant="secondary" disabled>
          Disabled
        </Button>
      </Row>

      <Row label="Button — size">
        <Button variant="secondary" size="sm">
          sm
        </Button>
        <Button variant="secondary" size="md">
          md
        </Button>
        <Button variant="secondary" size="lg">
          lg
        </Button>
      </Row>

      <Row label="IconButton">
        <IconButton glyph="⌕" label="Search frames" />
        <IconButton glyph="✕" label="Close" />
        <IconButton glyph="★" label="Favourite" />
        <IconButton glyph="↗" label="Route" />
      </Row>

      <Row label="Tag — tone">
        <Tag tone="outline">Croatia</Tag>
        <Tag tone="ink">52 min · 49 km</Tag>
        <Tag tone="yellow">By drive time</Tag>
      </Row>

      <Row label="StampCheck">
        {/* StampCheck is a bare span with role="checkbox" — wrapping it in a
            <label> does not give it an accessible name the way a native
            <input> gets one, so every usage must pass aria-label (or
            aria-labelledby) itself. */}
        <label style={{ display: "flex", alignItems: "center", gap: "var(--s-3)", font: "var(--body)" }}>
          <StampCheck checked={checked1} onChange={setChecked1} aria-label="Printed and loved" />
          Printed and loved
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "var(--s-3)", font: "var(--body)" }}>
          <StampCheck checked={checked2} onChange={setChecked2} aria-label="Not printed" />
          Not printed
        </label>
      </Row>
    </div>
  );
}
