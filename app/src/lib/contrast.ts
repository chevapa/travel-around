/**
 * WCAG 2.x contrast ratio, straight from the spec formula
 * (https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio). Used to verify
 * token colour *pairs* meet the plan's explicit bar ("every filter label
 * measures ≥ 4.5:1 against its background", Task 7) — the only way to do
 * this as an automated check at all, since CSS custom properties can't be
 * resolved to real colours in jsdom (no browser, no cascade).
 */
function srgbChannelToLinear(channel8bit: number): number {
  const c = channel8bit / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return 0.2126 * srgbChannelToLinear(r) + 0.7152 * srgbChannelToLinear(g) + 0.0722 * srgbChannelToLinear(b);
}

/** Returns the contrast ratio between two #rrggbb colours, from 1 (identical) to 21 (black on white). */
export function contrastRatio(hexA: string, hexB: string): number {
  const a = relativeLuminance(hexA);
  const b = relativeLuminance(hexB);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

/** WCAG AA for normal-size text — the bar DESIGN_RISO1/IMPLEMENTATION_PLAN.md Task 7 sets explicitly. */
export const WCAG_AA_NORMAL_TEXT = 4.5;
