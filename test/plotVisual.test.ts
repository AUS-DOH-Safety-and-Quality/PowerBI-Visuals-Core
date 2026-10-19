import type powerbi from "powerbi-visuals-api";
import { describe, expect, it, vi } from "vitest";
import {
  PlotVisual, PlotViewModelBase, createTableContainer, drawSummaryTable, type GroupResults, type GroupedLine, type PlotOptions,
  type PlotVisualPoint, type TableSelection, type MarksSelection
} from "../src/rendering/index";
import type { LinePoint } from "../src/rendering/drawLines";
import SettingsStore from "../src/powerbi/settingsStore";
import { formatPrimitiveValue, rowIdentity, selectionState, updateType, type CategoryGroups, type PrimitiveValue, type ValidatedDataView } from "../src/powerbi/index";
import { createValueFormatter, type ValueFormatter } from "../src/data/index";
import {
  createAxisCard, createCanvasCard, createDefaultValues, createDownloadCard, createLabelsCard, createLineGroup, createSummaryTableCard,
  defineCard, dotOptions, type SettingsValues
} from "../src/settings/index";
import { buildDataView, createRenderer, must, sequentialKeys, type RowObjects } from "../src/testing/index";
import { host, pluck } from "./browserHelpers";

type IVisualHost = powerbi.extensibility.visual.IVisualHost;
type ISelectionId = powerbi.visuals.ISelectionId;

const schema = {
  canvas: createCanvasCard(),
  x_axis: createAxisCard("x", { tickRotation: 0, limitUnits: "" }),
  y_axis: createAxisCard("y", { tickRotation: 0, limitUnits: "" }),
  labels: createLabelsCard(),
  download_options: createDownloadCard(),
  scatter: defineCard({ displayName: "Scatter", description: "", settingsGroups: { all: dotOptions() } }),
  lines: defineCard({ displayName: "Lines", description: "", settingsGroups: {
    target: createLineGroup("target", {
      showLabel: "Show Target", showDescription: "", showDefault: true, width: 1.5, type: "10 0", colour: "standard", rebaselines: false
    })
  } })
};

type Settings = SettingsValues<typeof schema>;
type Point = PlotVisualPoint & { readonly aesthetics: Settings["scatter"] };

/** One point per row on a target line; a missing numerator drops its row with a warning, a negative one rejects the data */
class TestModel extends PlotViewModelBase<typeof schema, { formatValue: ValueFormatter }, "numerators"> {
  plotPoints: Point[] = [];
  groupedLines: GroupedLine<"target">[] = [];
  readonly periodEnds: number[] = [];
  readonly anyLabels = false;
  /** Thrown while building the data */
  failure: Error | undefined = undefined;

  constructor(visualHost: IVisualHost) {
    super(visualHost, new SettingsStore(schema, () => ({ formatValue: createValueFormatter(2, 0, "") })), ["numerators"]);
  }

  protected get hasAxes(): boolean {
    return true;
  }

  axisRanges() {
    return { x: { lower: 0, upper: 10 }, y: { lower: 0, upper: 100 } };
  }

  protected reset(): void {
    this.plotPoints = [];
    this.groupedLines = [];
  }

  protected updateData(view: ValidatedDataView<"numerators">, _groups: CategoryGroups, visualHost: IVisualHost): GroupResults {
    if (this.failure !== undefined) {
      throw this.failure;
    }
    const settings = this.inputSettings.settings[0];
    const keys = view.categories.key[0].values;
    const numerators = view.values.numerators[0].values;
    const results: GroupResults = { errors: [], warnings: [] };
    const points: Point[] = [];
    const target: LinePoint[] = [];
    for (let i = 0; i < view.rowCount; i++) {
      const value = numerators[i];
      if (value === null) {
        results.warnings.push(`Row ${i + 1} has no numerator`);
      } else if (typeof value !== "number" || value < 0) {
        results.errors.push(`Row ${i + 1} has a negative numerator`);
      } else {
        points.push({
          x: i,
          value,
          aesthetics: settings.scatter,
          identity: rowIdentity(visualHost, [view.category], i),
          highlighted: false,
          tooltip: [],
          label: { text_value: undefined, aesthetics: settings.labels, angle: undefined, distance: undefined },
          table_row: { key: formatPrimitiveValue(keys[i]), value }
        });
        target.push({ x: i, line_value: 50 });
      }
    }
    this.plotPoints = points;
    this.groupedLines = [["target", target]];
    return results;
  }
}

class TestVisual extends PlotVisual<Point, TestModel, Settings> {
  protected readonly lineKeys = { target: "target" };
  /** Draws a mark this far left of the plot's left edge, as a visual's icons may overflow */
  markOverhang: number | undefined = undefined;
  /** Thrown while drawing the marks */
  drawFailure: unknown = undefined;
  /** Grouped rows drawn as a summary table instead of the plot */
  tableRows: { readonly identity: ISelectionId[]; readonly highlighted: boolean; readonly table_row: { readonly name: string } }[]
    | undefined = undefined;
  readonly table: TableSelection;

  constructor(options: powerbi.extensibility.visual.VisualConstructorOptions) {
    super(options, visualHost => new TestModel(visualHost));
    this.table = createTableContainer(this.element);
  }

  protected get settings(): Settings {
    return this.viewModel.inputSettings.settings[0];
  }

  protected plotOptions(): PlotOptions<Point, LinePoint> {
    return {
      tickFormats: { x: undefined, y: undefined },
      verticalCrosshair: false,
      lineSettings: () => this.settings.lines,
      lowerLines: new Set(),
      dots: { show: true, text: undefined, onClick: undefined }
    };
  }

  updateHighlighting(): void {
    this.highlightPlotPoints(selectionState(this.selectionManager, false), point => point.aesthetics);
  }

  protected override drawAlternate(): boolean {
    if (this.tableRows === undefined) {
      return false;
    }
    drawSummaryTable(this.table, {
      columns: [{ name: "name", label: "Name" }],
      rows: this.tableRows,
      kinds: {},
      settings: createDefaultValues({ summary_table: createSummaryTableCard({ showDescription: "" }) }).summary_table,
      formatValue: createValueFormatter(2, 0, "%"),
      width: 500,
      host: this.host,
      selectionManager: this.selectionManager,
      onSelectionChange: () => {}
    });
    this.addContextMenu(this.table.node(), true);
    return true;
  }

  protected override drawMarks(marks: MarksSelection): void {
    if (this.drawFailure !== undefined) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- exercises the visual's handling of non-Error throws
      throw this.drawFailure;
    }
    if (this.markOverhang === undefined) {
      return;
    }
    marks.selectAll("rect.mark").data([null]).join("rect")
      .attr("class", "mark")
      .attr("x", this.plotProperties.xAxis.start_padding - this.markOverhang)
      .attr("y", 100)
      .attr("width", 5)
      .attr("height", 5);
  }
}

function dataView(numerators: readonly PrimitiveValue[], objects: RowObjects): powerbi.DataView {
  return buildDataView({
    categories: [{ role: "key", values: sequentialKeys(numerators.length) }],
    values: [{ role: "numerators", values: numerators }]
  }, objects);
}

const render = createRenderer(TestVisual, dataView);

function send(visual: TestVisual, dataViews: powerbi.DataView[], headless = false): void {
  visual.update({ dataViews, viewport: { width: 500, height: 500 }, type: updateType.data, headless });
}

function missingNumerators(objects: RowObjects): powerbi.DataView {
  return buildDataView({ categories: [{ role: "key", values: sequentialKeys(2) }], values: [] }, objects);
}

function watchedHost() {
  const visualHost = host();
  return {
    visualHost,
    started: vi.spyOn(visualHost.eventService, "renderingStarted"),
    finished: vi.spyOn(visualHost.eventService, "renderingFinished"),
    failed: vi.spyOn(visualHost.eventService, "renderingFailed")
  };
}

/** What the canvas shows: its error lines, its dots, and whether anything else is drawn */
function canvas(element: HTMLElement) {
  const svg = must(element.querySelector("svg"));
  return {
    errors: pluck(svg.querySelectorAll(".errormessage text"), "textContent"),
    dots: svg.querySelectorAll(".dotsgroup path").length,
    plotted: svg.querySelector(".tick, .linesgroup path") !== null
  };
}

const blank = { errors: [], dots: 0, plotted: false };

describe("plot visual", () => {
  it("draws the plot over the viewport, shows data warnings through the host and finishes rendering", () => {
    const events = watchedHost();
    const warn = vi.spyOn(events.visualHost, "displayWarningIcon");
    const rendered = render({ lines: { colour_target: "#123456" } }, [10, null, 30], { host: events.visualHost });
    const svg = must(rendered.element.querySelector("svg"));
    expect([svg.getAttribute("width"), svg.getAttribute("height")]).toEqual(["500", "500"]);
    expect(canvas(rendered.element)).toEqual({ errors: [], dots: 2, plotted: true });
    expect(must(svg.querySelector(".target-linegroup path")).getAttribute("stroke")).toBe("#123456");
    expect(warn).toHaveBeenCalledWith("Invalid inputs or settings ignored.\n", "Row 2 has no numerator");
    expect(events.started).toHaveBeenCalledTimes(1);
    expect(events.finished).toHaveBeenCalledTimes(1);
    expect(events.failed).not.toHaveBeenCalled();
  });

  it("leaves a blank canvas and finishes rendering for an empty view, whether or not errors are shown", () => {
    const showErrors = [true, false];
    for (let i = 0; i < showErrors.length; i++) {
      const events = watchedHost();
      const objects = { canvas: { show_errors: showErrors[i] } };
      const rendered = render(objects, [], { host: events.visualHost });
      expect(canvas(rendered.element)).toEqual(blank);
      rendered.update(objects, [10, 20]);
      expect(canvas(rendered.element).dots).toBe(2);
      send(rendered.visual, []);
      expect(canvas(rendered.element)).toEqual(blank);
      expect(events.finished).toHaveBeenCalledTimes(3);
      expect(events.failed).not.toHaveBeenCalled();
    }
  });

  it("writes a missing or invalid data error in place of the plot and reports the render failed", () => {
    const events = watchedHost();
    const rendered = render({}, [10, 20], { host: events.visualHost });
    send(rendered.visual, [missingNumerators({})]);
    expect(canvas(rendered.element)).toEqual({ ...blank, errors: ["No numerators passed!"] });
    rendered.update({}, [10, -5]);
    expect(canvas(rendered.element)).toEqual({ ...blank, errors: ["Row 2 has a negative numerator"] });
    expect(() => rendered.visual.plotProperties).toThrow("Plot properties require validated data.");
    expect(events.failed).toHaveBeenCalledTimes(2);
    expect(events.finished).toHaveBeenCalledTimes(1);
  });

  it("leaves the canvas blank for data errors while errors are hidden, still reporting the failure", () => {
    const events = watchedHost();
    const objects = { canvas: { show_errors: false } };
    const rendered = render(objects, [10, 20], { host: events.visualHost });
    send(rendered.visual, [missingNumerators(objects)]);
    expect(canvas(rendered.element)).toEqual(blank);
    rendered.update(objects, [10, -5]);
    expect(canvas(rendered.element)).toEqual(blank);
    expect(events.failed).toHaveBeenCalledTimes(2);
  });

  it("writes the settings preamble above an invalid setting's message", () => {
    const events = watchedHost();
    const rendered = render({ scatter: { size: -1 } }, [10, 20], { host: events.visualHost });
    const errors = canvas(rendered.element).errors;
    expect(errors).toHaveLength(2);
    expect(errors[0]).toBe("Invalid settings provided for all observations! First error:");
    expect(errors[1]).toContain("-1 is not a valid value for size");
    expect(events.failed).toHaveBeenCalledTimes(1);
  });

  it("writes the internal error preamble above the message of an exception while building or drawing", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const events = watchedHost();
    const rendered = render({}, [10, 20], { host: events.visualHost });
    const preamble = "Internal Error! Please file a bug report with the following text:";
    rendered.visual.viewModel.failure = new Error("Model failed");
    rendered.update({});
    expect(canvas(rendered.element)).toEqual({ ...blank, errors: [preamble, "Model failed"] });
    rendered.visual.viewModel.failure = undefined;
    rendered.visual.drawFailure = "Draw failed";
    rendered.update({});
    expect(canvas(rendered.element)).toEqual({ ...blank, errors: [preamble, "Draw failed"] });
    expect(events.failed).toHaveBeenCalledTimes(2);
  });

  it("redraws the plot without the message once a later update is valid", () => {
    const events = watchedHost();
    const rendered = render({}, [10, -5], { host: events.visualHost });
    expect(canvas(rendered.element).errors).toEqual(["Row 2 has a negative numerator"]);
    rendered.update({}, [10, 20]);
    expect(canvas(rendered.element)).toEqual({ errors: [], dots: 2, plotted: true });
    rendered.update({ scatter: { size: -1 } });
    expect(canvas(rendered.element).errors).toHaveLength(2);
    rendered.update({});
    expect(canvas(rendered.element)).toEqual({ errors: [], dots: 2, plotted: true });
    expect(events.finished).toHaveBeenCalledTimes(2);
    expect(events.failed).toHaveBeenCalledTimes(2);
  });

  it("grows the padding by a mark's overflow and redraws the plot inside the canvas, except headless", () => {
    const rendered = render({}, [10, 20]);
    const visual = rendered.visual;
    const svg = must(rendered.element.querySelector("svg"));
    visual.markOverhang = 60;
    rendered.update({});
    // The mark starts 50px past the default 10px padding
    expect(visual.plotProperties.xAxis.start_padding).toBe(60);
    expect(must(svg.querySelector("rect.mark")).getAttribute("x")).toBe("0");
    // In their own layer, so their stacking does not depend on whether the fit redrew them
    expect(must(svg.querySelector("rect.mark")).parentElement).toBe(svg.querySelector(":scope > .marksgroup"));
    expect(must(svg.querySelector(".yaxisgroup")).getAttribute("transform")).toBe("translate(60, 0)");
    send(visual, [dataView([10, 20], {})], true);
    expect(visual.plotProperties.xAxis.start_padding).toBe(10);
    expect(must(svg.querySelector("rect.mark")).getAttribute("x")).toBe("-50");
  });

  it("opens the context menu with the right-clicked point's identity, or an empty one for anything without an identity", () => {
    const rendered = render({}, [10, 20, 30], { host: host() });
    const show = vi.spyOn(rendered.visual.selectionManager, "showContextMenu").mockResolvedValue({});
    const svg = must(rendered.element.querySelector("svg"));
    const onDot = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 11, clientY: 22 });
    svg.querySelectorAll(".dotsgroup path")[1].dispatchEvent(onDot);
    expect(show).toHaveBeenLastCalledWith(rendered.visual.viewModel.plotPoints[1].identity, { x: 11, y: 22 });
    expect(onDot.defaultPrevented).toBe(true);
    svg.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 3, clientY: 4 }));
    expect(show).toHaveBeenLastCalledWith({}, { x: 3, y: 4 });
    must(svg.querySelector(".linesgroup path")).dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 5, clientY: 6 }));
    expect(show).toHaveBeenLastCalledWith({}, { x: 5, y: 6 });
    must(svg.querySelector(".tick text")).dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 7, clientY: 8 }));
    expect(show).toHaveBeenLastCalledWith({}, { x: 7, y: 8 });
    expect(show).toHaveBeenCalledTimes(4);
  });

  it("draws an alternate view in place of the plot, whose grouped rows open the context menu with their first identity", () => {
    const events = watchedHost();
    const rendered = render({}, [10, 20, 30], { host: events.visualHost });
    const visual = rendered.visual;
    const show = vi.spyOn(visual.selectionManager, "showContextMenu").mockResolvedValue({});
    const points = visual.viewModel.plotPoints;
    visual.tableRows = [{ identity: [points[1].identity, points[2].identity], highlighted: false, table_row: { name: "row" } }];
    rendered.update({});
    expect(() => visual.plotProperties).toThrow("Plot properties require validated data.");
    expect(events.finished).toHaveBeenCalledTimes(2);
    const cell = must(rendered.element.querySelector("tbody td"));
    cell.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 5, clientY: 6 }));
    expect(show).toHaveBeenLastCalledWith(points[1].identity, { x: 5, y: 6 });
    // Icons are drawn inside the cell
    const icon = cell.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "svg"))
      .appendChild(document.createElementNS("http://www.w3.org/2000/svg", "path"));
    icon.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 7, clientY: 8 }));
    expect(show).toHaveBeenLastCalledWith(points[1].identity, { x: 7, y: 8 });
    must(rendered.element.querySelector("thead th")).dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 9, clientY: 10 }));
    expect(show).toHaveBeenLastCalledWith({}, { x: 9, y: 10 });
  });

  it("drops the plot's pointer handlers while an alternate view replaces it, and rebinds them with the plot", () => {
    const visualHost = host();
    const rendered = render({}, [10, 20, 30], { host: visualHost });
    const visual = rendered.visual;
    const svg = must(rendered.element.querySelector("svg"));
    const clear = vi.spyOn(visual.selectionManager, "clear");
    const point = () => {
      const box = svg.getBoundingClientRect();
      svg.dispatchEvent(new MouseEvent("mousemove", { clientX: box.left + 250, clientY: box.top + 250 }));
      svg.dispatchEvent(new MouseEvent("click"));
    };
    point();
    expect(visualHost.tooltipService.show).toHaveBeenCalledTimes(1);
    expect(clear).toHaveBeenCalledTimes(1);
    visual.tableRows = [{ identity: [visual.viewModel.plotPoints[0].identity], highlighted: false, table_row: { name: "row" } }];
    rendered.update({});
    point();
    expect(visualHost.tooltipService.show).toHaveBeenCalledTimes(1);
    expect(clear).toHaveBeenCalledTimes(1);
    visual.tableRows = undefined;
    rendered.update({});
    point();
    expect(visualHost.tooltipService.show).toHaveBeenCalledTimes(2);
    expect(clear).toHaveBeenCalledTimes(2);
  });

  it("downloads every plotted point's table row from the download button", () => {
    const visualHost = host();
    const rendered = render({ download_options: { show_button: true } }, [10, 20], { host: visualHost });
    must(rendered.element.querySelector(".download-btn-group")).dispatchEvent(new MouseEvent("click"));
    expect(visualHost.downloadService.exportVisualsContent).toHaveBeenCalledWith("key,value\n1,10\n2,20", "chartdata.csv", "csv", "csv file");
  });
});
