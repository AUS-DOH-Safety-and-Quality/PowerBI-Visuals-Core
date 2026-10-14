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
});
