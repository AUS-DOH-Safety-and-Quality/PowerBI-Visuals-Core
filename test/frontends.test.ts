import { describe, expect, it } from "vitest";
import {
  chartAggregations, chartSettings, chartTitle, indicatorColumns, indicatorFields, makeUpdateValues, paddedDataViews, toDataViews, type Column
} from "../src/frontends/index";
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
  const aggregations = { numerators: "sum", denominators: "sum", groupings: "first", xbar_sds: "first", tooltips: "first", labels: "first" } as const;

  it.each<{ categories: Column; temporal: boolean }>([
    { categories: [0, -1, 1, 1e100], temporal: false },
    { categories: ["1", "2024", "01/02/2024", "Ward A", ""], temporal: false },
    { categories: [true, false], temporal: false },
    { categories: ["2024-01-01", "Ward A"], temporal: false },
    { categories: ["2024-01-01", 0], temporal: false },
    { categories: [null, NaN], temporal: false },
    { categories: [], temporal: false },
    { categories: "Ward A", temporal: false },
    { categories: ["2024-13-01"], temporal: false },
    { categories: ["2023-02-29"], temporal: false },
    { categories: ["2024-01-01Tgarbage"], temporal: false },
    { categories: ["2024-01-01T25:00:00"], temporal: false },
    { categories: ["2024-01-01", "2024-02-29", null], temporal: true },
    { categories: "2024-01-01", temporal: true },
    { categories: ["2024-01-01T12:34:56.123Z", "2024-01-02T12:34:56+08:00"], temporal: true },
    { categories: ["2024-01-01 12:34:56", "2024-01-02 12:34:56.123"], temporal: true }
  ])("marks only ISO date/date-time columns as temporal: $categories", ({ categories, temporal }) => {
    const result = makeUpdateValues({ categories }, {}, aggregations);
    const expected = temporal ? { temporal: {} } : { text: true };
    expect(result.dataViews[0].categorical.categories[0].source.type).toEqual(expected);
    expect(result.dataViews[0].metadata.columns[0].type).toEqual(expected);
    const restored = toDataViews(result.dataViews);
    expect(restored[0].categorical?.categories?.[0].source.type).toEqual(expected);
  });

  it("keeps mixed keys as labels when filtering leaves only dates", () => {
    const result = makeUpdateValues({
      categories: ["Ward A", "2024-01-01"], crosstalk_identities: ["a", "b"], numerators: [1, 2]
    }, { scatter: { size: [3, 4] } }, aggregations, ["b"]);
    const key = result.dataViews[0].categorical.categories[0];
    expect(key.source.type).toEqual({ text: true });
    expect(key.values).toEqual(["2024-01-01"]);
    expect(key.objects).toEqual([{ scatter: { size: 4 } }]);
    expect(result.crosstalk_identities).toEqual({ "2024-01-01": ["b"] });
    expect(result.source_rows).toEqual({ "0": [1] });
  });

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

describe("indicator columns in the limits", () => {
  it("appends underscores to indicators named like a limit column until unique", () => {
    expect(indicatorColumns([], ["value"])).toEqual([]);
    expect(indicatorColumns(["Region", "value"], ["value", "z"])).toEqual(["Region", "value_"]);
    expect(indicatorColumns(["value", "value_"], ["value"])).toEqual(["value__", "value_"]);
    expect(indicatorColumns(["value_", "value"], ["value"])).toEqual(["value_", "value__"]);
    expect(indicatorColumns(["value", "z"], ["value", "value_", "z", "z_"])).toEqual(["value__", "z__"]);
    expect(indicatorColumns(["Value", "value "], ["value"])).toEqual(["Value", "value "]);
  });

  it("keys indicator values by their columns, keeping their order", () => {
    const fields = indicatorFields({ value: "a", Region: null, z: 1 }, ["value", "z"]);
    expect(fields).toEqual({ value_: "a", Region: null, z_: 1 });
    expect(Object.keys(fields)).toEqual(["value_", "Region", "z_"]);
  });
});
