// Registered as a Vitest setupFile (see vite.config.ts) — runs before every
// test file. Extends vitest's `expect` with jest-dom's DOM matchers
// (toHaveAttribute, etc.) and jest-axe's toHaveNoViolations, both with
// correct TypeScript types (see jest-axe.d.ts for the axe augmentation).
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { toHaveNoViolations } from "jest-axe";
import { afterEach, expect, vi } from "vitest";
import { FakeMapLibreMap } from "./mockMapLibre";

expect.extend(toHaveNoViolations);

// jsdom has no WebGL2, and real MapLibre GL throws GPUInitializationError
// on construction without it — every test goes through the fake instead.
// See mockMapLibre.ts for why. Real map behaviour (the restyle, actual
// tile rendering) is verified against real headless Chromium separately.
vi.mock("maplibre-gl", () => ({ Map: FakeMapLibreMap }));

// @testing-library/react auto-cleans after each test under Jest, but not
// under Vitest — without this, DOM from one test leaks into the next and
// `getByRole` starts finding duplicates.
afterEach(() => {
  cleanup();
});
