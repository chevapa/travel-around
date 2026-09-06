import { CoreGallery } from "./components/core/CoreGallery";

/**
 * Task 3 scaffold: mounts the core-primitives gallery so every variant is
 * actually viewable, not just asserted in tests. Task 4+ replaces this with
 * the real Atlas screen (see
 * https://github.com/chevapa/travel-around/issues/93, Task 8).
 */
export default function App() {
  return <CoreGallery />;
}
