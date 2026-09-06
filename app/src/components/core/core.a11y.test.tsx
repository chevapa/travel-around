// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { axe } from "jest-axe";
import { expect, test } from "vitest";
import { CoreGallery } from "./CoreGallery";

// Task 3 acceptance check (DESIGN_RISO1/IMPLEMENTATION_PLAN.md): "a
// Storybook (or equivalent) page renders every variant of all six [core
// primitives]... and axe reports no violations." CoreGallery is that page;
// this is the automated axe run against it.
test("CoreGallery has no axe violations", async () => {
  const { container } = render(<CoreGallery />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
