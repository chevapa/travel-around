import { useEffect, useState } from "react";

/**
 * "Honour prefers-reduced-motion" (Task 11, DESIGN_RISO1/IMPLEMENTATION_PLAN.md).
 * Reads the real OS/browser setting via matchMedia and stays in sync if
 * the user changes it while the page is open (rare, but cheap to handle
 * correctly — a `change` listener, not just a one-time read).
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => matchesReducedMotion());

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

function matchesReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Generic responsive breakpoint hook — used for the mobile layout changes
 * Task 11 asks for (panel slot becomes a bottom sheet, TopBar collapses).
 * Re-evaluates on resize, not just on mount.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query).matches : false));

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/** The plan's own breakpoint set: 1440 / 1024 / 768 / 375. 768 is where "mobile" layout rules (bottom sheet, collapsed TopBar) kick in. */
export const MOBILE_BREAKPOINT_QUERY = "(max-width: 768px)";
