import { useState } from "react";
import photoStack from "../../assets/images/photo-stack.jpeg";
import collage from "../../assets/images/collage.jpeg";
import { Button } from "../core/Button";
import { ContactSheet, type ContactSortBy } from "./ContactSheet";
import { FrameCard } from "./FrameCard";
import { IndexPanel, type IndexSection } from "./IndexPanel";
import { PanelSlot } from "./PanelSlot";
import { usePanelSlot } from "./panelSlotReducer";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "var(--s-4)" }}>
      <h2 style={{ font: "var(--eyebrow)", letterSpacing: "var(--eyebrow-tracking)", textTransform: "uppercase", color: "var(--text-quiet)", margin: 0 }}>
        {label}
      </h2>
      {children}
    </section>
  );
}

const SECTIONS: IndexSection[] = [
  {
    tab: "State",
    rows: [
      { key: "loved", label: "Printed · loved", count: 31, checked: true, swatch: { background: "var(--pink)" } },
      { key: "fine", label: "Printed · fine", count: 11, swatch: { background: "var(--state-fine)" } },
      { key: "unprinted", label: "Not printed", count: 74, swatch: { background: "transparent", border: "1.5px dashed var(--unprinted-edge)" } },
    ],
  },
  {
    tab: "Kind",
    rows: [
      { key: "castle", label: "Castle", count: 18 },
      { key: "town", label: "Town", count: 22 },
    ],
  },
  {
    tab: "Season",
    rows: [
      { key: "summer", label: "Summer", count: 20, checked: true },
      { key: "all", label: "All year", count: 60 },
    ],
  },
];

export function ShellGallery() {
  const slot = usePanelSlot();
  const [sections, setSections] = useState(SECTIONS);
  const [activeTab, setActiveTab] = useState("State");
  const [sortBy, setSortBy] = useState<ContactSortBy>("date");

  const toggleRow = (tab: string, key: string) => {
    setSections((prev) =>
      prev.map((s) => (s.tab === tab ? { ...s, rows: s.rows.map((r) => (r.key === key ? { ...r, checked: !r.checked } : r)) } : s)),
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-9)", padding: "var(--s-9)", background: "var(--surface-page)" }}>
      <Row label="Panel slot — The Index and a FrameCard can never be open together">
        <div style={{ display: "flex", gap: "var(--s-4)", marginBottom: "var(--s-4)" }}>
          <Button variant="secondary" size="sm" onClick={slot.openIndex}>
            Open The Index
          </Button>
          <Button variant="secondary" size="sm" onClick={() => slot.openCard("b7nmno2d")}>
            Open a FrameCard
          </Button>
          <Button variant="secondary" size="sm" onClick={slot.close}>
            Close
          </Button>
        </div>
        <div style={{ position: "relative", width: 520, height: 460, border: "var(--stroke-heavy)", background: "var(--surface-ground)" }}>
          <PanelSlot
            state={slot.state}
            renderIndex={() => (
              <IndexPanel
                sections={sections}
                activeTab={activeTab}
                onTab={setActiveTab}
                onToggleRow={toggleRow}
                footerCount={105}
                onSort={() => {}}
                style={{ width: "100%" }}
              />
            )}
            renderCard={(frameId) => (
              <FrameCard
                name={frameId === "b7nmno2d" ? "Kumrovec (Staro Selo)" : frameId}
                state="loved"
                src={photoStack}
                description="A complete ethno-village, real houses and interiors."
                driveTime="50 min"
                distance="39 km"
                tags={["Croatia", "Museum", "Town"]}
                onClose={slot.close}
                style={{ width: "100%" }}
              />
            )}
          />
        </div>
      </Row>

      <Row label="ContactSheet — sortable by date and by drive time, unprinted stays a dashed blank">
        <ContactSheet
          frames={[
            { name: "Krapina", src: photoStack, state: "loved", date: "2025-06-15", driveMinutes: 50 },
            { name: "Ludbreg", src: collage, state: "fine", date: "2024-03-02", driveMinutes: 70 },
            { name: "Ozalj", state: "unprinted", driveMinutes: 55 },
            { name: "Samobor", state: "unprinted", driveMinutes: 30 },
          ]}
          columns={4}
          range="2024—2025"
          sortBy={sortBy}
          onSortChange={setSortBy}
          style={{ width: 420 }}
        />
      </Row>
    </div>
  );
}
