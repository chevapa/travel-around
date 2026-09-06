import { useEffect, type CSSProperties, type HTMLAttributes } from "react";

// `mix-blend-mode` is read from a token (--grain-blend) rather than one of
// the literal keywords CSSProperties expects — this is the one place that's
// true, so the cast is scoped tightly here rather than loosened app-wide.
const blendFromToken = "var(--grain-blend)" as unknown as CSSProperties["mixBlendMode"];

/**
 * The halftone grain that makes RISO1 read as printed. Mount ONCE, as the
 * last child of the outermost positioned container, so a single dot screen
 * sits over the whole composition. Never apply grain per element —
 * stacked screens moiré and destroy text contrast.
 *
 * Ported from DESIGN_RISO1/components/core/GrainOverlay.jsx. The
 * "mount once" rule can't be enforced by the component itself, so it
 * self-reports a dev-mode warning if a second instance mounts anywhere in
 * the tree (Task 3, DESIGN_RISO1/IMPLEMENTATION_PLAN.md).
 */
export interface GrainOverlayProps extends HTMLAttributes<HTMLDivElement> {
  /** Override the default .5; keep it under .6 or body copy starts to mottle. */
  opacity?: number;
}

let mountedCount = 0;

export function GrainOverlay({ opacity, style, ...rest }: GrainOverlayProps) {
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    mountedCount += 1;
    if (mountedCount > 1) {
      console.warn(
        `[GrainOverlay] ${mountedCount} instances are mounted at once — RISO1 allows exactly one grain layer, as the last child of the outermost container. Stacked screens moiré and destroy text contrast.`,
      );
    }
    return () => {
      mountedCount -= 1;
    };
  }, []);

  return (
    <div
      {...rest}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 60,
        mixBlendMode: blendFromToken,
        opacity: opacity ?? "var(--grain-opacity)",
        backgroundImage: "var(--grain-image)",
        backgroundSize: "var(--grain-size)",
        ...style,
      }}
    />
  );
}
