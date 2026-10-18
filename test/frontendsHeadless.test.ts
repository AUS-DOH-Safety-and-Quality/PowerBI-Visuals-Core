import { expect, it } from "vitest";
import { chartTitle, constructorOptions, makeUpdateValues } from "../src/frontends/index";
import { limitIndicatorColumns, updateHeadlessVisual, visuals } from "../src/frontends/headless";
import { TestVisual } from "./frontendHelpers";

it("returns the error message a static plot draws instead of the SVG", () => {
  const ignore = () => Promise.resolve();
  visuals.test = new TestVisual(constructorOptions(document.createElement("div"), {
    selectionManager: { registerOnSelectCallback: () => {}, getSelectionIds: () => [], select: ignore, clear: ignore, showContextMenu: ignore },
    tooltipService: { show: () => {}, hide: () => {} },
    rowKeys: (_category, index) => [String(index)]
  }));
  const aggregations = { numerators: "sum", denominators: "sum", groupings: "first", xbar_sds: "first", tooltips: "first", labels: "first" } as const;
  const dataViews = makeUpdateValues({ categories: ["a"], numerators: [null] }, {}, aggregations).dataViews;
  const title = chartTitle(null);
  if ("error" in title) {
    throw new Error(title.error);
  }
  expect(updateHeadlessVisual("test", dataViews, title.settings, 300, 200, true, true)).toEqual({ error: "No values" });
});

it("warns of indicators renamed in the limits, only when limits are returned", () => {
  const aggregations = { numerators: "sum", denominators: "sum", groupings: "first", xbar_sds: "first", tooltips: "first", labels: "first" } as const;
  const title = chartTitle(null);
  if ("error" in title) {
    throw new Error(title.error);
  }
  const raw = { categories: ["a", "b"], numerators: [1, 2] };
  const plain = makeUpdateValues(raw, {}, aggregations).dataViews;
  const clashing = makeUpdateValues({ ...raw, indicators: { value: ["x", "y"], value_: ["x", "x"], Region: ["r", "r"] } }, {}, aggregations).dataViews;
  expect(updateHeadlessVisual("test", plain, title.settings, 300, 200, false, true)).toEqual({ warnings: [] });
  expect(updateHeadlessVisual("test", clashing, title.settings, 300, 200, false, true))
    .toEqual({ warnings: ["Indicators renamed in the limits, as their names are limit columns: value to value__."] });
  expect(updateHeadlessVisual("test", clashing, title.settings, 300, 200, false, false)).toEqual({});
  expect(limitIndicatorColumns("test", ["value", "Region"]))
    .toEqual({ columns: ["value_", "Region"], warnings: ["Indicators renamed in the limits, as their names are limit columns: value to value_."] });
});
