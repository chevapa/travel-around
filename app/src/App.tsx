import { AtlasGallery } from "./components/atlas/AtlasGallery";
import { CoreGallery } from "./components/core/CoreGallery";
import { GrainOverlay } from "./components/core/GrainOverlay";

/**
 * Component-gallery scaffold: every primitive built so far, actually
 * viewable, not just asserted in tests. Task 8 replaces this with the real
 * Atlas screen (see https://github.com/chevapa/travel-around/issues/93).
 */
export default function App() {
  return (
    <div style={{ position: "relative" }}>
      <CoreGallery />
      <AtlasGallery />
      <GrainOverlay />
    </div>
  );
}
