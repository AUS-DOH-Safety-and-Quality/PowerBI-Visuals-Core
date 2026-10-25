import { beforeAll, describe, expect, it } from "vitest";
import { createVisual, makeUpdateValues, noSelection, registerChart, type RawData } from "../src/frontends/index";
import { headlessChart, limitIndicatorColumns, updateHeadlessVisual, visuals } from "../src/frontends/headless";
import { must } from "../src/testing/index";
import { defaultAggregations, testSettingsModel, titleSettings, TestVisual } from "./frontendHelpers";

/** The numerators the visual last calculated, and the settings of its first row */
function lastDrawn(visual: TestVisual): { numerators: unknown[]; settings: Readonly<Record<string, unknown>> | undefined } {
  const dataView = visual.viewModel.options?.dataViews?.[0];
  return { numerators: dataView?.categorical?.values?.[0].values ?? [], settings: dataView?.categorical?.categories?.[0].objects?.[0] };
}

/** Returns the drawn numerators as its limits */
registerChart<TestVisual>("limited", {
  Visual: TestVisual,
  settingsModel: testSettingsModel,
  limitColumns: ["value"],
  limits: visual => ({ value: lastDrawn(visual).numerators })
});

/** initialiseHeadless cannot run in a browser, whose document is not assignable, so the visuals are made as it makes them */
beforeAll(() => {
  const names = ["test", "limited"];
  for (let i = 0; i < names.length; i++) {
    visuals[names[i]] = createVisual(names[i], document.body.appendChild(document.createElement("div")), {
      selectionManager: noSelection,
      tooltipSettings: () => undefined,
      rowKeys: index => [String(index)],
      displayWarningIcon: () => {}
    });
  }
});

function testVisual(chartType: string): TestVisual {
  const visual = visuals[chartType];
  if (!(visual instanceof TestVisual)) {
    throw new Error("Not a test visual");
  }
  return visual;
}

describe("headless visual updates", () => {
  it("returns the error message a static plot draws instead of the SVG", () => {
    const dataViews = makeUpdateValues({ categories: ["a"], category_name: "key", numerators: [null] }, {}, defaultAggregations).dataViews;
    expect(updateHeadlessVisual("test", dataViews, titleSettings(null), 300, 200, true, true)).toEqual({ error: "No values" });
  });

  it("warns of indicators renamed in the limits, only when limits are returned", () => {
    const title = titleSettings(null);
    const raw = { categories: ["a", "b"], category_name: "key", numerators: [1, 2] };
    const plain = makeUpdateValues(raw, {}, defaultAggregations).dataViews;
    const clashing = makeUpdateValues({ ...raw, indicators: { value: ["x", "y"], value_: ["x", "x"], Region: ["r", "r"] } }, {}, defaultAggregations).dataViews;
    expect(updateHeadlessVisual("test", plain, title, 300, 200, false, true)).toEqual({ warnings: [] });
    expect(updateHeadlessVisual("test", clashing, title, 300, 200, false, true))
      .toEqual({ warnings: ["Indicators renamed in the limits, as their names are limit columns: value to value__."] });
    expect(updateHeadlessVisual("test", clashing, title, 300, 200, false, false)).toEqual({ warnings: [] });
    expect(limitIndicatorColumns("test", ["value", "Region"]))
      .toEqual({ columns: ["value_", "Region"], warnings: ["Indicators renamed in the limits, as their names are limit columns: value to value_."] });
  });

  it("returns the visual's warnings, whether drawn or only calculated", () => {
    const title = titleSettings(null);
    const dataViews = makeUpdateValues({ categories: ["a", "b"], category_name: "key", numerators: [1, null], indicators: { value: ["x", "x"] } }, {}, defaultAggregations).dataViews;
    const renamed = "Indicators renamed in the limits, as their names are limit columns: value to value_.";
    expect(updateHeadlessVisual("test", dataViews, title, 300, 200, false, true)).toEqual({ warnings: ["1 missing", renamed] });
    expect(updateHeadlessVisual("test", dataViews, title, 300, 200, false, false)).toEqual({ warnings: ["1 missing"] });
    const drawn = updateHeadlessVisual("test", dataViews, title, 300, 200, true, false);
    expect(Object.keys(drawn)).toEqual(["svg", "warnings"]);
    expect(drawn).toHaveProperty("warnings", ["1 missing"]);
  });
});

describe("headless charts", () => {
  const raw: RawData = { categories: ["b", "a", "a"], category_name: "key", numerators: [1, 2, 3] };

  it("returns input validation errors without updating the visual", () => {
    const visual = testVisual("test");
    const updates = visual.updates.length;
    expect(headlessChart("test", raw, { lines: {} }, null, null, 300, 200, false, true))
      .toEqual({ error: "'lines' is not a valid settings group. Valid options are: canvas, x_axis, spc, misc." });
    expect(headlessChart("test", raw, {}, { numerators: "average" }, null, 300, 200, false, true))
      .toEqual({ error: "'average' is not a valid aggregation. Valid options are: first, last, sum, mean, min, max, median, count." });
    expect(headlessChart("test", raw, {}, null, { bogus: 1 }, 300, 200, false, true)).toHaveProperty("error");
    expect(visual.updates.length).toBe(updates);
  });

  it("validates per-row settings against the number of input rows, including an unboxed single row", () => {
    expect(headlessChart("test", raw, { canvas: { upper_padding: [1, 2] } }, null, null, 300, 200, false, false))
      .toEqual({ error: "Setting 'upper_padding' in group 'canvas' must have one value or 3 values." });
    expect(headlessChart("test", raw, { canvas: { upper_padding: [1, 2, 3] } }, null, null, 300, 200, false, false)).toEqual({ warnings: [] });
    const single = headlessChart("test", { categories: "a", category_name: "key", numerators: 1 }, { canvas: { upper_padding: [4] } }, null, null, 300, 200, true, false);
    expect(Object.keys(single)).toEqual(["svg", "warnings"]);
  });

  it("merges the chart's limits with the warnings and the rows behind each grouped row", () => {
    expect(headlessChart("limited", raw, {}, { numerators: "mean" }, null, 300, 200, false, true))
      .toEqual({ value: [2.5, 1], warnings: [], source_rows: { "0": [1, 2], "1": [0] } });
    expect(headlessChart("limited", raw, {}, null, null, 300, 200, false, false)).toEqual({ warnings: [] });
    expect(headlessChart("limited", { ...raw, numerators: [null, null, null] }, {}, null, null, 300, 200, false, true)).toEqual({ error: "No values" });
    const drawn = headlessChart("limited", raw, {}, null, null, 300, 200, true, true);
    expect(Object.keys(drawn).sort()).toEqual(["source_rows", "svg", "value", "warnings"]);
    expect(drawn).toHaveProperty("value", [5, 1]);
  });

  it("refuses static plots of a table view, still calculating its limits", () => {
    const settings = { spc: { chart_type: "table" } };
    expect(headlessChart("limited", raw, settings, null, null, 300, 200, true, true)).toEqual({ error: "Static plots are not available for summary tables." });
    expect(headlessChart("limited", raw, settings, null, null, 300, 200, false, true))
      .toEqual({ value: [5, 1], warnings: [], source_rows: { "0": [1, 2], "1": [0] } });
    expect(headlessChart("limited", raw, { spc: { chart_type: "i" } }, null, null, 300, 200, true, false)).not.toHaveProperty("error");
  });

  it("draws static plots into a sized SVG document with baselines Word can render", () => {
    const visual = testVisual("test");
    const result = headlessChart("test", raw, { canvas: { left_padding: 5 } }, null, { text: "Title", subtitle: "Sub" }, 320, 240, true, false);
    expect(Object.keys(result)).toEqual(["svg", "warnings"]);
    const svg = "svg" in result ? result.svg : undefined;
    if (typeof svg !== "string") {
      throw new Error("No SVG");
    }
    const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
    expect(parsed.querySelector("parsererror")).toBeNull();
    const root = must(parsed.documentElement);
    expect([root.getAttribute("viewBox"), root.getAttribute("width"), root.getAttribute("height"), root.namespaceURI])
      .toEqual(["0 0 320 240", "320px", "240px", "http://www.w3.org/2000/svg"]);
    const background = must(root.firstElementChild);
    expect([background.tagName, background.getAttribute("fill"), background.getAttribute("width")]).toEqual(["rect", "white", "100%"]);
    const title = must(parsed.querySelector(".chart-title"));
    expect([title.textContent, title.getAttribute("dy"), title.hasAttribute("dominant-baseline")]).toEqual(["Title", "0.8em", false]);
    expect(must(parsed.querySelector(".chart-subtitle")).getAttribute("dy")).toBe("0.8em");
    expect(svg.includes("dominant-baseline")).toBe(false);

    const update = visual.updates[visual.updates.length - 1];
    expect(update.viewport).toEqual({ width: 320, height: 240 });
    expect([update.headless, update.frontend]).toEqual([true, true]);
    const canvas = must(update.dataViews?.[0].categorical?.categories?.[0].objects?.[0].canvas);
    // Static plots pad 50 left for the y axis, and the title (16 + 5) and subtitle (12) above
    expect([canvas.left_padding, canvas.upper_padding, canvas.lower_padding, canvas.right_padding]).toEqual([55, 43, 30, 30]);
  });

  it("clears the previous plot before each update", () => {
    const visual = testVisual("test");
    headlessChart("test", raw, {}, null, "Title", 300, 200, true, false);
    expect(visual.svg.select(".chart-title").text()).toBe("Title");
    headlessChart("test", raw, {}, null, null, 300, 200, false, false);
    expect(visual.svg.select(".chart-title").empty()).toBe(true);
    expect(must(visual.updates[visual.updates.length - 1].dataViews).length).toBe(0);
  });

  it("throws for an unknown chart type", () => {
    expect(() => headlessChart("nope", raw, {}, null, null, 300, 200, false, false)).toThrow("Unknown chart type 'nope'.");
  });
});
