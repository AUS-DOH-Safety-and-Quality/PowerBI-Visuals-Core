import { describe, expect, it } from "vitest";
import { chartAggregations, chartSettings, chartTitle, makeUpdateValues, paddedDataViews } from "../src/frontends/index";
import "./frontendHelpers";

describe("frontend input validation", () => {
  it("rejects unnamed aggregations and non-scalar title values", () => {
    expect(chartAggregations(["sum"])).toEqual({ error: "Aggregations must be named." });
    expect(chartTitle({ text: ["T"] })).toHaveProperty("error");
  });

  it("validates settings against the chart's settings model and unboxes single values", () => {
    expect(chartSettings("test", { spc: { chart_type: ["p"] }, canvas: null }, 3)).toEqual({ settings: { spc: { chart_type: "p" } } });
    expect(chartSettings("test", { spc: { constructor: 1 } }, 3)).toHaveProperty("error");
    expect(chartSettings("test", { lines: {} }, 3)).toHaveProperty("error");
    expect(chartSettings("test", { spc: [1] }, 3)).toEqual({ error: "Settings in group 'spc' must be named." });
    expect(chartSettings("test", { spc: { chart_type: { p: 1 } } }, 3))
      .toEqual({ error: "Setting 'chart_type' in group 'spc' must have one value or 3 values." });
  });

  it("rejects per-row values for settings Power BI cannot conditionally format", () => {
    expect(chartSettings("test", { misc: { group: ["x", "y", "z"] } }, 3))
      .toEqual({ error: "Setting 'group' in group 'misc' must have one value." });
    expect(chartSettings("test", { misc: { group: ["x"] } }, 3)).toEqual({ settings: { misc: { group: "x" } } });
  });
});

describe("frontend data views", () => {
  it("retains contributing row indexes through sorting, grouping and Crosstalk filtering", () => {
    const input = {
      categories: ["b", "a", "a", "c", "b"], numerators: [1, 2, 3, 4, 5],
      indicators: { Measure: ["Y", "X", "Y", "X", "Y"] },
      crosstalk_identities: ["A", "A", "B", "B", "A"]
    };
    const aggregations = { numerators: "sum", denominators: "sum", groupings: "first", xbar_sds: "first", tooltips: "first", labels: "first" } as const;
    const result = makeUpdateValues(input, {}, aggregations, ["A"]);
    expect(result.source_rows).toEqual({ "0": [1], "1": [0, 4] });
    expect(result.dataViews[0].categorical.categories[0].values).toEqual(["a", "b"]);
    expect(result.dataViews[0].categorical.values[0].values).toEqual([2, 6]);
  });

  it("pads without changing the input, which interactive charts re-pad on every filter", () => {
    const aggregations = { numerators: "sum", denominators: "sum", groupings: "first", xbar_sds: "first", tooltips: "first", labels: "first" } as const;
    const dataViews = makeUpdateValues({ categories: ["a"], numerators: [1] }, {}, aggregations).dataViews;
    const title = chartTitle("T");
    if ("error" in title) {
      throw new Error(title.error);
    }
    const before = JSON.stringify(dataViews);
    paddedDataViews("test", dataViews, title.settings, true);
    expect(JSON.stringify(dataViews)).toBe(before);
  });

  it("pads static plots on the right for x tick labels overhanging the last tick", () => {
    const aggregations = { numerators: "sum", denominators: "sum", groupings: "first", xbar_sds: "first", tooltips: "first", labels: "first" } as const;
    const title = chartTitle(undefined);
    if ("error" in title) {
      throw new Error(title.error);
    }
    const rightPadding = (rotation: number, staticPlot: boolean): unknown => {
      const settings = { x_axis: { xlimit_tick_size: 12, xlimit_tick_rotation: rotation } };
      const dataViews = makeUpdateValues({ categories: ["a"], numerators: [1] }, settings, aggregations).dataViews;
      return paddedDataViews("test", dataViews, title.settings, staticPlot)[0].categorical.categories[0].objects[0].canvas.right_padding;
    };
    expect(rightPadding(0, true)).toBe(34);
    expect(rightPadding(45, true)).toBe(58);
    expect(rightPadding(-45, true)).toBe(10);
    expect(rightPadding(0, false)).toBe(10);
  });
});
