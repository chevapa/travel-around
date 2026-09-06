import { describe, expect, it } from "vitest";
import { contrastRatio, WCAG_AA_NORMAL_TEXT } from "./contrast";

describe("contrastRatio", () => {
  it("is 21 for black on white", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });

  it("is 1 for identical colours", () => {
    expect(contrastRatio("#191510", "#191510")).toBeCloseTo(1, 5);
  });

  it("is symmetric", () => {
    expect(contrastRatio("#191510", "#F6F0DE")).toBeCloseTo(contrastRatio("#F6F0DE", "#191510"), 10);
  });
});

// Task 7 acceptance check: "every filter label measures >= 4.5:1 against
// its background in an automated contrast check" — the CRIT 02 fix
// (AUDIT.md). These are the actual hex values from tokens/colors.css for
// every text/background pair IndexPanel and Legend actually use for
// labels and counts; if colors.css ever changes these values, this test
// needs re-syncing by hand (there's no way to resolve CSS custom
// properties without a real browser).
describe("RISO1 filter-label contrast (CRIT 02 regression guard)", () => {
  const PAPER_2 = "#F6F0DE";
  const INK = "#191510";
  const INK_55 = "#4d4636"; // counts
  const TEXT_ON_INVERT = "#F6F0DE"; // = paper-2, used as text colour on the ink surface

  it("row label (--text-strong = ink) on paper-2 meets AA", () => {
    expect(contrastRatio(INK, PAPER_2)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
  });

  it("row count (--ink-55) on paper-2 meets AA — the lightest text IndexPanel permits", () => {
    expect(contrastRatio(INK_55, PAPER_2)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
  });

  it("Legend's labels (--text-on-invert) on the ink surface meet AA", () => {
    expect(contrastRatio(TEXT_ON_INVERT, INK)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
  });
});
