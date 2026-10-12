import type powerbi from "powerbi-visuals-api";
import { describe, expect, it, vi } from "vitest";
import { createVisualHost } from "powerbi-visuals-utils-testutils";
import { PlotViewModelBase, type GroupResults } from "../src/rendering/plotViewModel";
import SettingsStore from "../src/powerbi/settingsStore";
import type { ValidatedDataView, CategoryGroups } from "../src/powerbi/index";
import { createAxisCard, defineCard, numberOption, toggleOption } from "../src/settings/index";
import buildDataView from "../src/testing/buildDataView";

const schema = {
  x_axis: createAxisCard("x", { tickRotation: 0, limitUnits: "" }),
  y_axis: createAxisCard("y", { tickRotation: 0, limitUnits: "" }),
  example: defineCard({
    displayName: "Example", description: "",
    settingsGroups: { all: {
      scale: numberOption("Scale", "", 2, { above: 0 }),
      table: toggleOption("Table", "", false)
    } }
  })
};

class TestModel extends PlotViewModelBase<typeof schema, number, "numerators"> {
  groupTotals: number[] = [];
  results: GroupResults = { errors: [], warnings: [] };
  readonly updateData = vi.fn((view: ValidatedDataView<"numerators">, groups: CategoryGroups): GroupResults => {
    this.groupTotals = new Array<number>(groups.rows.length);
    for (let g = 0; g < groups.rows.length; g++) {
      let total = 0;
      for (let i = 0; i < groups.rows[g].length; i++) {
        total += Number(view.values.numerators[0].values[groups.rows[g][i]]);
      }
      this.groupTotals[g] = total * this.inputSettings.derivedSettings[g];
    }
    return this.results;
  });

  constructor(host: powerbi.extensibility.visual.IVisualHost) {
    super(host, new SettingsStore(schema, settings => settings.example.scale), ["numerators"]);
  }

  protected get hasAxes(): boolean {
    return !this.inputSettings.settings[0].example.table;
  }

  axisRanges() {
    const axes = this.inputSettings.settings[0];
    return { x: { lower: axes.x_axis.xlimit_l ?? 0, upper: axes.x_axis.xlimit_u ?? 1 }, y: { lower: 0, upper: 1 } };
  }

  protected reset(): void {
    this.groupTotals = [];
  }
}

function view(numerators: (number | null)[], objects?: Record<string, Record<string, unknown>>, indicator?: string[]) {
  const keys = new Array<string>(numerators.length);
  for (let i = 0; i < keys.length; i++) {
    keys[i] = `k${i}`;
  }
  const categories = [{ role: "key", values: keys }];
  if (indicator !== undefined) {
    categories.push({ role: "indicator", values: indicator });
  }
  return buildDataView({ categories, values: [{ role: "numerators", values: numerators }] }, objects);
}

function options(dataView: powerbi.DataView, type = 2) {
  return { dataViews: [dataView], viewport: { width: 300, height: 200 }, type, headless: true };
}

describe("plot view model base", () => {
  const host = createVisualHost({});

  it("reads the theme, viewport and settings before building each group's data", () => {
    const model = new TestModel(host);
    expect(model.colourPalette.foregroundColour).toBeTypeOf("string");
    const result = model.update(options(view([1, 2, 3], { example: { scale: 3 } }, ["a", "b", "a"])), host);
    expect(result).toEqual({ status: true, warning: undefined });
    expect([model.svgWidth, model.svgHeight, model.headless, model.frontend, model.firstRun]).toEqual([300, 200, true, false, false]);
    expect(model.inputSettings.settings).toHaveLength(2);
    expect(model.groupTotals).toEqual([12, 6]);
    expect(model.getFormattingModel().cards).toHaveLength(3);
  });

  it("rebuilds only on data or style updates and keeps the warning meanwhile", () => {
    const model = new TestModel(host);
    model.results = { errors: [], warnings: ["one", "two"] };
    expect(model.update(options(view([1])), host)).toEqual({ status: true, warning: "one\ntwo" });
    model.results = { errors: [], warnings: [] };
    expect(model.update(options(view([5]), 4), host)).toEqual({ status: true, warning: "one\ntwo" });
    expect(model.groupTotals).toEqual([2]);
    expect(model.update(options(view([5]), 16), host)).toEqual({ status: true, warning: undefined });
    expect(model.groupTotals).toEqual([10]);
    expect(model.updateData).toHaveBeenCalledTimes(2);
  });

  it("rejects the update and clears its data on data view, settings, group and axis errors", () => {
    const model = new TestModel(host);
    expect(model.update(options(view([1])), host).status).toBe(true);
    expect(model.update({ ...options(view([1])), dataViews: [] }, host)).toEqual({ status: false, error: "No data present" });
    expect([model.groupTotals, model.firstRun]).toEqual([[], true]);
    expect(model.update(options(view([1], { example: { scale: 0 } })), host))
      .toMatchObject({ status: false, type: "settings", error: expect.stringContaining("not a valid value for scale") });
    model.results = { errors: ["bad a", "bad b"], warnings: ["ignored"] };
    expect(model.update(options(view([1])), host)).toEqual({ status: false, error: "bad a\nbad b" });
    model.results = { errors: [], warnings: [] };
    expect(model.update(options(view([1], { x_axis: { xlimit_l: 2 } })), host))
      .toEqual({ status: false, error: "The x-axis lower limit (2) is above the upper limit (1)", type: "settings" });
    expect(model.groupTotals).toEqual([]);
    expect(model.update(options(view([1], { x_axis: { xlimit_l: 2 }, example: { table: true } })), host)).toEqual({ status: true, warning: undefined });
    expect(model.update(options(view([3]), 4), host)).toEqual({ status: true, warning: undefined });
    expect(model.groupTotals).toEqual([2]);
  });
});
