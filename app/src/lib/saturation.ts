/**
 * HSL saturation (0-1) of a #rrggbb colour. Used for Task 12's regression
 * check on HIGH 03 (AUDIT.md): "the basemap competes with your pins" —
 * the fix (Task 5/8's restyle to cream/greige, MapBase's lib/mapStyle.ts)
 * is provable as "the map's own tokens are less saturated than the marker
 * tokens", the same way contrast.ts proves CRIT 02's fix from the actual
 * token values rather than a live render.
 */
export function hslSaturation(hex: string): number {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  if (max === min) return 0; // achromatic (grey)
  const delta = max - min;
  return lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
}
