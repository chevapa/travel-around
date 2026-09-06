/**
 * Long-press detection for the New Frame flow (Task 10 — "adding a place
 * starts from a map long-press", per the product decision on epic #84).
 * MapLibre GL has no built-in long-press event (only click/dblclick/
 * contextmenu), so this is a small, generic pointer-event implementation:
 * press and hold past `thresholdMs` without moving more than
 * `moveTolerancePx` fires the callback; moving further, or releasing
 * early, cancels it — the same shape as a native long-press gesture.
 *
 * Plain DOM addEventListener rather than a React hook, so it's usable
 * directly on MapBase's container ref inside a plain useEffect without
 * fighting React's synthetic event system over a raw HTMLElement.
 */
export interface LongPressOptions {
  thresholdMs?: number;
  moveTolerancePx?: number;
}

/** Returns a cleanup function that removes all the listeners it added. */
export function attachLongPress(element: HTMLElement, onLongPress: (clientX: number, clientY: number) => void, options: LongPressOptions = {}): () => void {
  const thresholdMs = options.thresholdMs ?? 500;
  const moveTolerancePx = options.moveTolerancePx ?? 8;

  let timer: ReturnType<typeof setTimeout> | null = null;
  let startX = 0;
  let startY = 0;

  const clear = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return; // left button only for mouse
    startX = e.clientX;
    startY = e.clientY;
    clear();
    timer = setTimeout(() => onLongPress(startX, startY), thresholdMs);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (timer === null) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.hypot(dx, dy) > moveTolerancePx) clear();
  };

  element.addEventListener("pointerdown", onPointerDown);
  element.addEventListener("pointermove", onPointerMove);
  element.addEventListener("pointerup", clear);
  element.addEventListener("pointercancel", clear);
  element.addEventListener("pointerleave", clear);

  return () => {
    clear();
    element.removeEventListener("pointerdown", onPointerDown);
    element.removeEventListener("pointermove", onPointerMove);
    element.removeEventListener("pointerup", clear);
    element.removeEventListener("pointercancel", clear);
    element.removeEventListener("pointerleave", clear);
  };
}
