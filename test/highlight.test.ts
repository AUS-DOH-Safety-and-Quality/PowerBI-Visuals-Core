import { describe, expect, it } from "vitest";
import { highlightOpacity } from "../src/rendering/index.js";

const opacities = { opacity: 1, opacity_selected: 0.9, opacity_unselected: 0.2 };

describe("highlight opacity", () => {
  it("keeps the default while nothing is selected or highlighted", () => {
    expect(highlightOpacity(opacities, false, false)).toBe(1);
    expect(highlightOpacity(opacities, false, true)).toBe(1);
  });

  it("splits emphasised and other points once anything is active", () => {
    expect(highlightOpacity(opacities, true, true)).toBe(0.9);
    expect(highlightOpacity(opacities, true, false)).toBe(0.2);
  });
});
