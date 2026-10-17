import { describe, expect, it } from "vitest";
import { xTickLabelOffsets, axisTitleOffset, nearestPoint } from "../src/rendering/index";

describe("x tick label offsets", () => {
  it("anchors by the sign of the rotation and keeps d3's centred default at zero", () => {
    expect(xTickLabelOffsets(-35)).toEqual({ anchor: "end", dx: "-.8em", dy: "-.15em" });
    expect(xTickLabelOffsets(45)).toEqual({ anchor: "start", dx: ".8em", dy: ".15em" });
    expect(xTickLabelOffsets(0)).toEqual({ anchor: "middle", dx: "0em", dy: ".71em" });
  });
});

describe("axis title offset", () => {
  // Titles 12 high, extending 9 above their baseline
  it("centres each title's box between the axis and the canvas edge", () => {
    expect(axisTitleOffset("bottom", 500, 10, { axisEdge: 460, top: -9, height: 12 })).toBe(483);
    expect(axisTitleOffset("left", 500, 10, { axisEdge: 40, top: -9, height: 12 })).toBe(23);
  });

  it("abuts the axis when the title does not fit, overflowing the canvas by the shortfall", () => {
    expect(axisTitleOffset("bottom", 500, 10, { axisEdge: 497, top: -9, height: 12 })).toBe(506);
    expect(axisTitleOffset("left", 500, 10, { axisEdge: 2, top: -9, height: 12 })).toBe(-1);
  });

  it("falls back to a label-size offset from the edge when the axis is unmeasured", () => {
    expect(axisTitleOffset("bottom", 500, 12, undefined)).toBe(494);
    expect(axisTitleOffset("left", 500, 12, undefined)).toBe(18);
  });
});

describe("nearest point", () => {
  const points = [{ x: 10, y: 100 }, { x: 20, y: 10 }, { x: 30, y: 50 }];
  const position = (i: number) => points[i];

  it("uses horizontal distance only when vertical is excluded", () => {
    expect(nearestPoint(3, position, 21, 95, false)).toEqual({ index: 1, x: 20, y: 10 });
  });

  it("adds vertical distance when included", () => {
    expect(nearestPoint(3, position, 21, 95, true)).toEqual({ index: 0, x: 10, y: 100 });
  });

  it("returns nothing for no points", () => {
    expect(nearestPoint(0, position, 0, 0, false)).toBeUndefined();
  });
});
