// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { derivePrintTransform, Print } from "./Print";

// NOTE on querying: jsdom's CSSStyleDeclaration getters (element.style.foo)
// unreliably reconstruct values containing var(...) — confirmed by
// comparing the raw `style` attribute (correct) against the getter (often
// ''). So these tests read getAttribute("style") directly rather than
// element.style.foo. Structural lookups use explicit firstElementChild
// chains rather than CSS combinator selectors, since Testing Library's own
// render container is itself a <div>, which makes "div > div > div"-style
// selectors match ambiguously at the wrong depth.

function outerOf(container: HTMLElement) {
  return container.firstElementChild as HTMLElement; // rotation wrapper
}
function sheetOf(container: HTMLElement) {
  return outerOf(container).firstElementChild as HTMLElement; // clickable element
}
function squareOf(container: HTMLElement) {
  return sheetOf(container).firstElementChild as HTMLElement; // collapsed-only fill square
}

describe("Print — state", () => {
  it("unprinted never requests an image", () => {
    const { container } = render(<Print state="unprinted" />);
    expect(container.querySelector("img")).toBeNull();
  });

  it("loved renders an img with the colour filter", () => {
    const { container } = render(<Print state="loved" src="photo.jpg" />);
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("photo.jpg");
    expect(img?.getAttribute("style")).toMatch(/saturate/);
  });

  it("fine renders an img with the grayscale filter", () => {
    const { container } = render(<Print state="fine" src="photo.jpg" />);
    const img = container.querySelector("img");
    expect(img?.getAttribute("style")).toMatch(/grayscale/);
  });
});

describe("Print — caption placement (MED 06 / core semantic: never over the photo)", () => {
  it("caption is a sibling of the img, never a descendant", () => {
    const { container } = render(<Print state="loved" src="photo.jpg" caption="Krapina" />);
    const img = container.querySelector("img");
    const caption = Array.from(container.querySelectorAll("span")).find((el) => el.textContent === "Krapina");
    expect(caption).toBeDefined();
    expect(img?.contains(caption!)).toBe(false);
  });

  it("caption sits in the bottom border strip, not the image bounds — proxy check via the style attribute, since jsdom has no real layout engine to measure", () => {
    const { container } = render(<Print state="loved" src="photo.jpg" caption="Krapina" height={62} />);
    const caption = Array.from(container.querySelectorAll("span")).find((el) => el.textContent === "Krapina");
    const style = caption?.getAttribute("style") ?? "";
    expect(style).toContain("position: absolute");
    // The sheet's extra bottom padding (19px) creates the white border
    // below the image; the caption sits 2px from the sheet's own bottom
    // edge — inside that border strip, not over the image.
    expect(style).toContain("bottom: 2px");
  });
});

describe("Print — collapse below --print-min (28px)", () => {
  it("renders a plain square, not a photo/caption/tape/star, below 28px", () => {
    const { container } = render(
      <Print state="loved" src="photo.jpg" caption="Krapina" tape star width={20} height={20} />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(Array.from(container.querySelectorAll("span")).some((el) => el.textContent === "Krapina")).toBe(false);
    expect(container.textContent).toBe(""); // no ★, no caption, no "?" — just a filled square
  });

  it("fills the square with the loved colour token when collapsed", () => {
    const { container } = render(<Print state="loved" width={20} height={20} />);
    expect(squareOf(container).getAttribute("style")).toContain("background: var(--state-loved)");
  });

  it("fills the square with the fine (grey) colour token when collapsed", () => {
    const { container } = render(<Print state="fine" width={20} height={20} />);
    expect(squareOf(container).getAttribute("style")).toContain("background: var(--state-fine)");
  });

  it("renders a dashed outline, not a fill, for unprinted when collapsed", () => {
    const { container } = render(<Print state="unprinted" width={20} height={20} />);
    expect(squareOf(container).getAttribute("style")).toContain("border: var(--stroke-dashed)");
  });

  it("keeps the tap target at --tap-min even when the visual square is smaller", () => {
    const { container } = render(<Print state="loved" width={20} height={20} />);
    const style = sheetOf(container).getAttribute("style") ?? "";
    expect(style).toContain("min-width: var(--tap-min)");
    expect(style).toContain("min-height: var(--tap-min)");
  });
});

describe("Print — non-collapsed also keeps the tap-target floor", () => {
  it("sets minWidth/minHeight to --tap-min regardless of print size", () => {
    const { container } = render(<Print state="loved" src="photo.jpg" width={96} height={70} />);
    const style = sheetOf(container).getAttribute("style") ?? "";
    expect(style).toContain("min-width: var(--tap-min)");
    expect(style).toContain("min-height: var(--tap-min)");
  });
});

describe("derivePrintTransform", () => {
  it("is deterministic — the same id produces the same result across 50 calls", () => {
    const first = derivePrintTransform("b7nmno2d");
    for (let i = 0; i < 50; i++) {
      expect(derivePrintTransform("b7nmno2d")).toEqual(first);
    }
  });

  it("always returns an edge index of 0, 1, or 2", () => {
    const ids = ["a", "bb", "ccc", "o3rsks02", "e5m4s41l", "zzz999", ""];
    for (const id of ids) {
      expect([0, 1, 2]).toContain(derivePrintTransform(id).edge);
    }
  });

  it("always returns a tilt within the ±4° budget", () => {
    const ids = ["a", "bb", "ccc", "o3rsks02", "e5m4s41l", "zzz999", ""];
    for (const id of ids) {
      const { tilt } = derivePrintTransform(id);
      expect(tilt).toBeGreaterThanOrEqual(-4);
      expect(tilt).toBeLessThanOrEqual(4);
    }
  });

  it("gives different neighbours different edges most of the time (not a constant)", () => {
    const ids = Array.from({ length: 20 }, (_, i) => `frame-${i}`);
    const edges = new Set(ids.map((id) => derivePrintTransform(id).edge));
    expect(edges.size).toBeGreaterThan(1);
  });
});
