import { describe, expect, it } from "vitest";
import { lineLabelGeometry } from "../src/rendering/index";
import type { LineLabelPlacement } from "../src/rendering/lineLabels";

const base: LineLabelPlacement = { position: "above", lower: false, hpad: 3, vpad: 5, lineWidth: 2, size: 10 };

function place(overrides: Partial<LineLabelPlacement>, textHeight = 12) {
  return lineLabelGeometry({ ...base, ...overrides }, textHeight);
}

// Changeset 8: line-label placement shared by both visuals; eligibility and text stay local
describe("line label geometry", () => {
  it("offsets above by the padding and line width, anchored at the end", () => {
    expect(place({ position: "above" })).toEqual({ anchor: "end", dx: -3, dy: -7 });
  });

  it("offsets below by the padding and font size", () => {
    expect(place({ position: "below" })).toEqual({ anchor: "end", dx: -3, dy: 15 });
  });

  it("places beside labels after the line end using a quarter of the text height", () => {
    expect(place({ position: "beside" }, 16)).toEqual({ anchor: "start", dx: 3, dy: -1 });
  });

  it("maps outside and inside by whether the line is a lower boundary", () => {
    expect(place({ position: "outside", lower: false }).dy).toBe(-7);
    expect(place({ position: "inside", lower: false }).dy).toBe(15);
    expect(place({ position: "outside", lower: true }).dy).toBe(15);
    expect(place({ position: "inside", lower: true }).dy).toBe(-7);
  });

  it("keeps zero padding and zero width as ordinary offsets", () => {
    expect(place({ hpad: 0, vpad: 0, lineWidth: 0 })).toEqual({ anchor: "end", dx: -0, dy: -0 });
    expect(place({ position: "below", vpad: 0, size: 0 }).dy).toBe(0);
  });
});
