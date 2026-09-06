// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TornGround } from "./TornGround";

describe("TornGround", () => {
  it("renders one img per fragment, cycling when fewer than 4 are given", () => {
    const { container } = render(<TornGround fragments={["a.jpg", "b.jpg"]} />);
    const imgs = Array.from(container.querySelectorAll("img"));
    expect(imgs).toHaveLength(4); // always 4 land shapes
    expect(imgs.map((img) => img.getAttribute("src"))).toEqual(["a.jpg", "b.jpg", "a.jpg", "b.jpg"]);
  });

  it("renders nothing image-wise when no fragments are given", () => {
    const { container } = render(<TornGround fragments={[]} />);
    expect(container.querySelectorAll("img")).toHaveLength(0);
  });

  it("is aria-hidden — it's terrain, not content", () => {
    const { container } = render(<TornGround fragments={["a.jpg"]} />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("omits the road lines when roads=false", () => {
    const { container: withRoads } = render(<TornGround fragments={["a.jpg"]} roads />);
    const { container: withoutRoads } = render(<TornGround fragments={["a.jpg"]} roads={false} />);
    expect(withRoads.querySelectorAll("span").length).toBeGreaterThan(withoutRoads.querySelectorAll("span").length);
  });
});
