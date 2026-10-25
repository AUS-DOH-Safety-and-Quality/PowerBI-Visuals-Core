import { describe, expect, it } from "vitest";
import {
  chartAggregations, chartNames, chartSettings, chartTitle, frontendChart, indicatorColumns, indicatorFields, makeUpdateValues, paddedDataViews,
  toDataViews, updateChartTitle, type Column, type RawData
} from "../src/frontends/index";
import { defaultAggregations, titleSettings } from "./frontendHelpers";
import { drawAxis, select } from "../src/rendering/index";
import { svgElement, frame, settings } from "./browserHelpers";
import { must } from "../src/testing/index";

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

  it("takes per-row values for every setting, as Power BI conditionally formats them all", () => {
    expect(chartSettings("test", { misc: { group: ["x", "y", "z"] } }, 3)).toEqual({ settings: { misc: { group: ["x", "y", "z"] } } });
    expect(chartSettings("test", { misc: { group: ["x"] } }, 3)).toEqual({ settings: { misc: { group: "x" } } });
  });

  it("writes numbers given for text settings as JavaScript names numeric keys, leaving other settings and values as given", () => {
    expect(chartSettings("test", { misc: { group: 100000 } }, 3)).toEqual({ settings: { misc: { group: "100000" } } });
    expect(chartSettings("test", { misc: { group: [0.1 + 0.2, 1e21, -0, "x", null] } }, 5))
      .toEqual({ settings: { misc: { group: ["0.30000000000000004", "1e+21", "0", "x", null] } } });
    expect(chartSettings("test", { misc: { group: [true] } }, 3)).toEqual({ settings: { misc: { group: true } } });
    expect(chartSettings("test", { canvas: { upper_padding: [1, 2, 3] } }, 3)).toEqual({ settings: { canvas: { upper_padding: [1, 2, 3] } } });
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
    const result = makeUpdateValues({ categories, category_name: "key" }, {}, aggregations);
    const expected = temporal ? { temporal: {} } : { text: true };
    expect(result.dataViews[0].categorical.categories[0].source.type).toEqual(expected);
    expect(result.dataViews[0].metadata.columns[0].type).toEqual(expected);
    const restored = toDataViews(result.dataViews);
    expect(restored[0].categorical?.categories?.[0].source.type).toEqual(expected);
  });

  it("splits date keys into the parts asked for, as a Power BI date hierarchy, in date order", () => {
    const result = makeUpdateValues({
      categories: ["2025-12-01", "2025-11-01", null, "2024-03-15"], category_name: "Date", category_date_parts: ["month", "year"],
      numerators: [1, 2, 3, 4], indicators: { Site: ["A", "A", "A", "A"] }
    }, { scatter: { size: [1, 2, 3, 4] } }, aggregations);
    const categories = result.dataViews[0].categorical.categories;
    expect(categories.length).toBe(3);
    expect(categories[0].source).toEqual({ displayName: "Date", roles: { key: true }, type: { temporal: {}, category: "Months" } });
    expect(categories[1].source).toEqual({ displayName: "Date", roles: { key: true }, type: { temporal: {}, category: "Years" } });
    expect(categories[0].values).toEqual(["March", "November", "December", null]);
    expect(categories[1].values).toEqual([2024, 2025, 2025, null]);
    expect(categories[0].objects).toEqual([{ scatter: { size: 4 } }, { scatter: { size: 2 } }, { scatter: { size: 1 } }, { scatter: { size: 3 } }]);
    expect(categories[2].source.roles).toEqual({ indicator: true });
    expect(categories[2].values).toEqual(["A", "A", "A", "A"]);
    expect(result.dataViews[0].metadata.columns.length).toBe(4);
    const single = makeUpdateValues({ categories: ["2025-04-01", "2025-01-01"], category_name: "Date", category_date_parts: ["quarter"], numerators: [1, 2] }, {}, aggregations);
    expect(single.dataViews[0].categorical.categories).toHaveLength(1);
    expect(single.dataViews[0].categorical.categories[0].values).toEqual(["Qtr 1", "Qtr 2"]);
    const days = makeUpdateValues({ categories: ["2025-04-09"], category_name: "Date", category_date_parts: ["day", "year"], numerators: [1] }, {}, aggregations);
    expect(days.dataViews[0].categorical.categories[0].values).toEqual([9]);
    expect(days.dataViews[0].categorical.categories[0].source.type).toEqual({ temporal: {}, category: "DayOfMonth" });
  });

  it("ignores date parts when a key is not all dates", () => {
    const result = makeUpdateValues({ categories: ["2025-12-01", "Ward A"], category_name: "key", category_date_parts: ["year"], numerators: [1, 2] }, {}, aggregations);
    expect(result.dataViews[0].categorical.categories).toHaveLength(1);
    expect(result.dataViews[0].categorical.categories[0].source.type).toEqual({ text: true });
    expect(result.dataViews[0].categorical.categories[0].values).toEqual(["2025-12-01", "Ward A"]);
  });

  it("keeps mixed keys as labels when filtering leaves only dates", () => {
    const result = makeUpdateValues({
      categories: ["Ward A", "2024-01-01"], category_name: "key", crosstalk_identities: ["a", "b"], numerators: [1, 2]
    }, { scatter: { size: [3, 4] } }, aggregations, ["b"]);
    const key = result.dataViews[0].categorical.categories[0];
    expect(key.source.type).toEqual({ text: true });
    expect(key.values).toEqual(["2024-01-01"]);
    expect(key.objects).toEqual([{ scatter: { size: 4 } }]);
    expect(result.crosstalk_identities).toEqual([["b"]]);
    expect(result.source_rows).toEqual({ "0": [1] });
  });

  it("passes the MISC group on every row's settings, as Power BI delivers the pane value and rules", () => {
    const input = { categories: ["a", "b"], category_name: "key", numerators: [1, 2], indicators: { Measure: ["X", "Y"] } };
    const dataView = makeUpdateValues(input, { misc: { group: "b" } }, aggregations).dataViews[0];
    expect(dataView.categorical.categories[0].objects).toEqual([{ misc: { group: "b" } }, { misc: { group: "b" } }]);
    expect(dataView.metadata).toEqual({ columns: dataView.metadata.columns });
  });

  it("names each column, the key by the caller's name for it, as Power BI names fields", () => {
    const result = makeUpdateValues({
      categories: ["a"], category_name: "month", numerators: [1], indicators: { Region: ["X"] }, tooltips: { Note: ["n"] }
    }, {}, aggregations);
    const categorical = result.dataViews[0].categorical;
    expect([categorical.categories[0].source.displayName, categorical.categories[1].source.displayName]).toEqual(["month", "Region"]);
    expect([categorical.values[0].source.displayName, categorical.values[1].source.displayName]).toEqual(["numerators", "Note"]);
  });

  it("keeps a missing key's Crosstalk keys apart from a key reading \"null\"", () => {
    const result = makeUpdateValues({ categories: [null, "null"], category_name: "key", crosstalk_identities: ["a", "b"], numerators: [1, 2] }, {}, aggregations);
    expect(result.dataViews[0].categorical.categories[0].values).toEqual(["null", null]);
    expect(result.crosstalk_identities).toEqual([["b"], ["a"]]);
  });

  it("retains contributing row indexes through sorting, grouping and Crosstalk filtering", () => {
    const input = {
      categories: ["b", "a", "a", "c", "b"], category_name: "key", numerators: [1, 2, 3, 4, 5],
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
    const dataViews = makeUpdateValues({ categories: ["a"], category_name: "key", numerators: [1] }, {}, aggregations).dataViews;
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
      const dataViews = makeUpdateValues({ categories: ["a"], category_name: "key", numerators: [1] }, settings, aggregations).dataViews;
      return paddedDataViews("test", dataViews, title.settings, staticPlot)[0].categorical.categories[0].objects[0].canvas.right_padding;
    };
    expect(rightPadding(0, true)).toBe(34);
    expect(rightPadding(45, true)).toBe(58);
    expect(rightPadding(-45, true)).toBe(10);
    expect(rightPadding(0, false)).toBe(10);
  });
});

describe("static plot padding", () => {
  it("keeps rotated date tick labels inside the canvas, at any font size", () => {
    const aggregations = { numerators: "sum", denominators: "sum", groupings: "first", xbar_sds: "first", tooltips: "first", labels: "first" } as const;
    const title = chartTitle(undefined);
    if ("error" in title) {
      throw new Error(title.error);
    }
    const rotations = [-90, -60, -45, -35, -20, 20, 45, 90, 180];
    const sizes = [8, 10, 14, 20];
    for (let r = 0; r < rotations.length; r++) {
      for (let s = 0; s < sizes.length; s++) {
        const x_axis = { ...settings.x_axis, xlimit_tick_size: sizes[s], xlimit_tick_rotation: rotations[r] };
        const dataViews = makeUpdateValues({ categories: ["a"], category_name: "key", numerators: [1] }, { x_axis }, aggregations).dataViews;
        const padded = paddedDataViews("test", dataViews, title.settings, true)[0].categorical.categories[0].objects[0].canvas;
        const svg = svgElement();
        drawAxis(svg, {
          axis: "x",
          frame: frame({ settings: { ...settings, x_axis, canvas: { ...settings.canvas, lower_padding: Number(padded.lower_padding) } } }),
          show: true,
          tickFormat: () => "01/01/2020",
          labelSize: 10,
          measure: false,
          integer: false
        });
        const overhang = must(svg.querySelector(".xaxisgroup")).getBoundingClientRect().bottom - svg.getBoundingClientRect().bottom;
        expect(overhang, `${rotations[r]} degrees, ${sizes[s]}px`).toBeLessThanOrEqual(0);
      }
    }
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

describe("named aggregations", () => {
  const options = "numerators, denominators, groupings, xbar_sds, tooltips, labels";
  const methods = "first, last, sum, mean, min, max, median, count";

  it("defaults every role, overriding only those named", () => {
    expect(chartAggregations(undefined)).toEqual({ aggregations: defaultAggregations });
    expect(chartAggregations(null)).toEqual({ aggregations: defaultAggregations });
    expect(chartAggregations({})).toEqual({ aggregations: defaultAggregations });
    expect(chartAggregations({ numerators: "mean", tooltips: "count" }))
      .toEqual({ aggregations: { ...defaultAggregations, numerators: "mean", tooltips: "count" } });
  });

  it("rejects unknown variables and methods, naming the options", () => {
    expect(chartAggregations({ numerator: "sum" }))
      .toEqual({ error: `'numerator' is not a valid variable to aggregate. Valid options are: ${options}.` });
    expect(chartAggregations({ constructor: "sum" }))
      .toEqual({ error: `'constructor' is not a valid variable to aggregate. Valid options are: ${options}.` });
    expect(chartAggregations({ numerators: "average" })).toEqual({ error: `'average' is not a valid aggregation. Valid options are: ${methods}.` });
    expect(chartAggregations({ numerators: null })).toEqual({ error: `'null' is not a valid aggregation. Valid options are: ${methods}.` });
    expect(chartAggregations({ numerators: ["sum"] })).toEqual({ error: `'sum' is not a valid aggregation. Valid options are: ${methods}.` });
    expect(chartAggregations("sum")).toEqual({ error: "Aggregations must be named." });
  });
});

describe("aggregating grouped rows", () => {
  it("applies each role's method within a group, skipping missing values", () => {
    const raw: RawData = {
      categories: ["a", "a", "a", "a", "b"],
      category_name: "key",
      numerators: [null, 4, Number.NaN, 1, 7],
      denominators: [3, null, 5, 1, null],
      groupings: [2, 9, null, 4, null],
      xbar_sds: [5, 1, null, 3, 2],
      labels: ["x", null, "y", null, null],
      tooltips: { Note: ["n1", null, "n2", null, null], Count: [1, 2, 3, 4, null] }
    };
    const result = makeUpdateValues(raw, {}, {
      numerators: "mean", denominators: "max", groupings: "min", xbar_sds: "median", labels: "last", tooltips: "count"
    });
    const columns = result.dataViews[0].categorical.values;
    const byName: Record<string, unknown[]> = {};
    for (let i = 0; i < columns.length; i++) {
      byName[columns[i].source.displayName] = columns[i].values;
    }
    expect(byName).toEqual({
      numerators: [2.5, 7],
      denominators: [5, null],
      groupings: [2, null],
      xbar_sds: [3, 2],
      labels: ["y", null],
      Note: [2, 0],
      Count: [4, 0]
    });
  });

  it("sums, finds extremes and medians of even counts, and takes first and last values past missing ones", () => {
    const raw: RawData = { categories: ["a", "a", "a", "a"], category_name: "key", numerators: [1e15, 1, -1e15, 4], denominators: [null, -2, 0, null] };
    const values = (aggregations: Parameters<typeof makeUpdateValues>[2]): unknown[][] => {
      const columns = makeUpdateValues(raw, {}, aggregations).dataViews[0].categorical.values;
      return [columns[0].values, columns[1].values];
    };
    expect(values({ ...defaultAggregations, numerators: "sum", denominators: "sum" })).toEqual([[5], [-2]]);
    expect(values({ ...defaultAggregations, numerators: "median", denominators: "median" })).toEqual([[2.5], [-1]]);
    expect(values({ ...defaultAggregations, numerators: "min", denominators: "max" })).toEqual([[-1e15], [0]]);
    expect(values({ ...defaultAggregations, numerators: "first", denominators: "first" })).toEqual([[1e15], [-2]]);
    expect(values({ ...defaultAggregations, numerators: "last", denominators: "last" })).toEqual([[4], [0]]);
    expect(values({ ...defaultAggregations, numerators: "count", denominators: "count" })).toEqual([[4], [2]]);
  });
});

describe("category order and per-row inputs", () => {
  it("orders categories by their levels, unlisted ones last, within each indicator", () => {
    const raw: RawData = {
      categories: ["b", "a", "c", "z", "b", "a"],
      category_name: "key",
      category_levels: ["c", "b", "a"],
      indicators: { Measure: ["Y", "Y", "Y", "Y", "X", "X"] },
      numerators: [1, 2, 3, 4, 5, 6]
    };
    const levelled = makeUpdateValues(raw, {}, defaultAggregations).dataViews[0].categorical;
    expect(levelled.categories[0].values).toEqual(["b", "a", "c", "b", "a", "z"]);
    expect(levelled.categories[1].values).toEqual(["X", "X", "Y", "Y", "Y", "Y"]);
    expect(levelled.values[0].values).toEqual([5, 6, 3, 1, 2, 4]);
    const unlevelled = makeUpdateValues({ ...raw, category_levels: null }, {}, defaultAggregations).dataViews[0].categorical;
    expect(unlevelled.categories[0].values).toEqual(["a", "b", "a", "b", "c", "z"]);
    expect(unlevelled.values[0].values).toEqual([6, 5, 2, 1, 3, 4]);
  });

  it("orders each indicator by its own levels, unlisted ones last, keeping their values", () => {
    const raw: RawData = {
      categories: ["k", "k", "k", "k", "k", "j"],
      category_name: "key",
      indicators: {
        Theme: ["Safety", "HSPR", "Access", "HSPR", "Other", "Access"],
        Label: ["s", "h2", "a", "h1", "o", "a"]
      },
      indicator_levels: { Theme: ["Safety", "Access", "HSPR"] },
      numerators: [1, 2, 3, 4, 5, 6]
    };
    const levelled = makeUpdateValues(raw, {}, defaultAggregations).dataViews[0].categorical;
    expect(levelled.categories[1].values).toEqual(["Safety", "Access", "Access", "HSPR", "HSPR", "Other"]);
    expect(levelled.categories[2].values).toEqual(["s", "a", "a", "h1", "h2", "o"]);
    expect(levelled.categories[0].values).toEqual(["k", "j", "k", "k", "k", "k"]);
    expect(levelled.values[0].values).toEqual([1, 6, 3, 4, 2, 5]);
    const unlevelled = makeUpdateValues({ ...raw, indicator_levels: null }, {}, defaultAggregations).dataViews[0].categorical;
    expect(unlevelled.categories[1].values).toEqual(["Access", "Access", "HSPR", "HSPR", "Other", "Safety"]);
    const single = makeUpdateValues({ ...raw, indicator_levels: { Theme: "HSPR" } }, {}, defaultAggregations).dataViews[0].categorical;
    expect(single.categories[1].values.slice(0, 2)).toEqual(["HSPR", "HSPR"]);
  });

  it("ranks numeric levels by position rather than value, and accepts an unboxed single level", () => {
    const numeric = makeUpdateValues({ categories: [1, 10, 2], category_name: "key", category_levels: [10, 2, 1], numerators: [1, 2, 3] }, {}, defaultAggregations);
    expect(numeric.dataViews[0].categorical.categories[0].values).toEqual(["10", "2", "1"]);
    expect(numeric.dataViews[0].categorical.values[0].values).toEqual([2, 3, 1]);
    const single = makeUpdateValues({ categories: ["b", "a"], category_name: "key", category_levels: "b", numerators: [1, 2] }, {}, defaultAggregations);
    expect(single.dataViews[0].categorical.categories[0].values).toEqual(["b", "a"]);
  });

  it("takes each group's per-row settings from its first input row, after sorting, leaving single values shared", () => {
    const result = makeUpdateValues({ categories: ["b", "a", "a"], category_name: "key", numerators: [1, 2, 3] }, {
      canvas: { upper_padding: [1, 2, 3], left_padding: 7 },
      spc: { chart_type: "p" }
    }, defaultAggregations);
    expect(result.dataViews[0].categorical.categories[0].objects).toEqual([
      { canvas: { upper_padding: 2, left_padding: 7 }, spc: { chart_type: "p" } },
      { canvas: { upper_padding: 1, left_padding: 7 }, spc: { chart_type: "p" } }
    ]);
    expect(chartSettings("test", { canvas: { upper_padding: [1, 2] } }, 3))
      .toEqual({ error: "Setting 'upper_padding' in group 'canvas' must have one value or 3 values." });
    expect(chartSettings("test", { canvas: { upper_padding: [1, 2, 3] } }, 3)).toEqual({ settings: { canvas: { upper_padding: [1, 2, 3] } } });
  });

  it("passes tooltips as text-typed tooltip columns after the values, aggregated by the tooltips method", () => {
    const result = makeUpdateValues({
      categories: ["a", "a", "b"], category_name: "key", numerators: [1, 2, 3], denominators: [4, 5, 6],
      tooltips: { Note: ["n1", null, "n3"], Score: [1.5, 2.5, null] }
    }, {}, { ...defaultAggregations, tooltips: "last" });
    const columns = result.dataViews[0].categorical.values;
    expect(columns.length).toBe(4);
    expect(columns[0].source).toEqual({ displayName: "numerators", roles: { numerators: true } });
    expect(columns[2].source).toEqual({ displayName: "Note", roles: { tooltips: true }, type: { text: true } });
    expect(columns[3].source).toEqual({ displayName: "Score", roles: { tooltips: true }, type: { text: true } });
    expect(columns[2].values).toEqual(["n1", "n3"]);
    expect(columns[3].values).toEqual([2.5, null]);
    const names: string[] = [];
    for (let i = 0; i < result.dataViews[0].metadata.columns.length; i++) {
      names.push(result.dataViews[0].metadata.columns[i].displayName);
    }
    expect(names).toEqual(["key", "numerators", "denominators", "Note", "Score"]);
  });
});

describe("chart titles", () => {
  it("accepts a subtitle alongside the title, rejecting unknown names and non-scalar values", () => {
    const defaults = titleSettings(null);
    expect(titleSettings({ text: "T", subtitle: "S", subtitle_font_size: "14px" }))
      .toEqual({ ...defaults, text: "T", subtitle: "S", subtitle_font_size: "14px" });
    expect(titleSettings({ text: "T", subtitle: null })).toEqual({ ...defaults, text: "T" });
    expect(titleSettings({ text: "T", subtitle: 2024 })).toEqual({ ...defaults, text: "T", subtitle: 2024 });
    expect(chartTitle({ bogus: "x" })).toEqual({
      error: "The title must be a string, or named settings from: 'text', 'font_size', 'font_weight', 'font_family', 'x', 'y', 'text_anchor', "
        + "'dominant_baseline', 'subtitle', 'subtitle_font_size', 'subtitle_font_weight'."
    });
    expect(chartTitle({ subtitle: ["S"] })).toHaveProperty("error");
    expect(chartTitle(42)).toHaveProperty("error");
  });

  it("draws the subtitle under the title, removing it when retitled without one", () => {
    const svg = select(svgElement());
    updateChartTitle(svg, titleSettings({ text: "T", subtitle: "S", x: 20, text_anchor: "start" }));
    const title = svg.select(".chart-title");
    const subtitle = svg.select(".chart-subtitle");
    expect([title.text(), title.attr("y"), title.attr("x")]).toEqual(["T", "5", "20"]);
    expect([subtitle.text(), subtitle.attr("y"), subtitle.attr("x"), subtitle.attr("text-anchor")]).toEqual(["S", "21", "20", "start"]);
    expect([subtitle.attr("font-size"), subtitle.attr("font-weight")]).toEqual(["12px", "normal"]);
    updateChartTitle(svg, titleSettings({ text: "T", font_size: "20px", y: 10, subtitle: "S" }));
    expect(svg.select(".chart-subtitle").attr("y")).toBe("30");
    expect(svg.selectAll(".chart-title, .chart-subtitle").size()).toBe(2);
    updateChartTitle(svg, titleSettings("T"));
    expect(svg.selectAll(".chart-subtitle").size()).toBe(0);
    expect(svg.selectAll(".chart-title").size()).toBe(1);
    updateChartTitle(svg, titleSettings({ subtitle: "S" }));
    expect(svg.selectAll(".chart-title, .chart-subtitle").size()).toBe(0);
  });

  it("pads the plot for the title and subtitle heights", () => {
    const dataViews = makeUpdateValues({ categories: ["a"], category_name: "key", numerators: [1] }, {}, defaultAggregations).dataViews;
    const upperPadding = (title: unknown): unknown =>
      paddedDataViews("test", dataViews, titleSettings(title), false)[0].categorical.categories[0].objects[0].canvas.upper_padding;
    expect(upperPadding(null)).toBe(10);
    expect(upperPadding("T")).toBe(31);
    expect(upperPadding({ text: "T", subtitle: "S" })).toBe(43);
    expect(upperPadding({ text: "T", subtitle: "S", subtitle_font_size: "20px", font_size: 18, y: 0 })).toBe(48);
    expect(upperPadding({ subtitle: "S" })).toBe(10);
  });
});

describe("chart registry", () => {
  it("throws for unknown chart types wherever a chart is looked up", () => {
    const dataViews = makeUpdateValues({ categories: ["a"], category_name: "key", numerators: [1] }, {}, defaultAggregations).dataViews;
    expect(() => frontendChart("nope")).toThrow("Unknown chart type 'nope'.");
    expect(() => chartSettings("nope", {}, 1)).toThrow("Unknown chart type 'nope'.");
    expect(() => paddedDataViews("nope", dataViews, titleSettings(null), false)).toThrow("Unknown chart type 'nope'.");
    expect(chartNames()).toContain("test");
  });
});
