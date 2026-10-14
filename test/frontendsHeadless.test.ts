import { expect, it } from "vitest";
import { chartTitle, constructorOptions, makeUpdateValues } from "../src/frontends/index";
import { updateHeadlessVisual, visuals } from "../src/frontends/headless";
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
