// jest-axe ships no type declarations of its own; @types/jest-axe augments
// Jest's global namespace, not vitest's `expect`. This augments vitest's
// Assertion interface directly so `expect(results).toHaveNoViolations()`
// type-checks.
import "vitest";

declare module "vitest" {
  interface Assertion<T = unknown> {
    toHaveNoViolations(): T extends object ? void : never;
  }
}
