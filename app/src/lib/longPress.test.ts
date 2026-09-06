// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { attachLongPress } from "./longPress";

function pointerEvent(type: string, init: Partial<PointerEventInit> = {}) {
  return new PointerEvent(type, { clientX: 0, clientY: 0, pointerType: "touch", ...init });
}

describe("attachLongPress", () => {
  let el: HTMLDivElement;

  beforeEach(() => {
    vi.useFakeTimers();
    el = document.createElement("div");
    document.body.appendChild(el);
  });

  afterEach(() => {
    vi.useRealTimers();
    el.remove();
  });

  it("fires after the threshold if the pointer doesn't move or lift", () => {
    const onLongPress = vi.fn();
    attachLongPress(el, onLongPress, { thresholdMs: 500 });
    el.dispatchEvent(pointerEvent("pointerdown", { clientX: 10, clientY: 20 }));
    vi.advanceTimersByTime(499);
    expect(onLongPress).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onLongPress).toHaveBeenCalledWith(10, 20);
  });

  it("does not fire if the pointer is released before the threshold", () => {
    const onLongPress = vi.fn();
    attachLongPress(el, onLongPress, { thresholdMs: 500 });
    el.dispatchEvent(pointerEvent("pointerdown"));
    vi.advanceTimersByTime(300);
    el.dispatchEvent(pointerEvent("pointerup"));
    vi.advanceTimersByTime(500);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("does not fire if the pointer moves past the tolerance (a drag, not a long-press)", () => {
    const onLongPress = vi.fn();
    attachLongPress(el, onLongPress, { thresholdMs: 500, moveTolerancePx: 8 });
    el.dispatchEvent(pointerEvent("pointerdown", { clientX: 0, clientY: 0 }));
    el.dispatchEvent(pointerEvent("pointermove", { clientX: 20, clientY: 0 }));
    vi.advanceTimersByTime(500);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("still fires for small jitter within the move tolerance", () => {
    const onLongPress = vi.fn();
    attachLongPress(el, onLongPress, { thresholdMs: 500, moveTolerancePx: 8 });
    el.dispatchEvent(pointerEvent("pointerdown", { clientX: 0, clientY: 0 }));
    el.dispatchEvent(pointerEvent("pointermove", { clientX: 3, clientY: 2 }));
    vi.advanceTimersByTime(500);
    expect(onLongPress).toHaveBeenCalled();
  });

  it("ignores non-left mouse buttons", () => {
    const onLongPress = vi.fn();
    attachLongPress(el, onLongPress, { thresholdMs: 500 });
    el.dispatchEvent(pointerEvent("pointerdown", { pointerType: "mouse", button: 2 }));
    vi.advanceTimersByTime(500);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("cancels a pending press on pointercancel/pointerleave", () => {
    const onLongPress = vi.fn();
    attachLongPress(el, onLongPress, { thresholdMs: 500 });
    el.dispatchEvent(pointerEvent("pointerdown"));
    el.dispatchEvent(pointerEvent("pointercancel"));
    vi.advanceTimersByTime(500);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("the returned cleanup function removes all listeners", () => {
    const onLongPress = vi.fn();
    const detach = attachLongPress(el, onLongPress, { thresholdMs: 500 });
    detach();
    el.dispatchEvent(pointerEvent("pointerdown"));
    vi.advanceTimersByTime(500);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("starting a second press replaces the pending timer, not stacks it", () => {
    const onLongPress = vi.fn();
    attachLongPress(el, onLongPress, { thresholdMs: 500 });
    el.dispatchEvent(pointerEvent("pointerdown", { clientX: 1, clientY: 1 }));
    vi.advanceTimersByTime(200);
    el.dispatchEvent(pointerEvent("pointerdown", { clientX: 5, clientY: 5 }));
    vi.advanceTimersByTime(500);
    expect(onLongPress).toHaveBeenCalledTimes(1);
    expect(onLongPress).toHaveBeenCalledWith(5, 5);
  });
});
