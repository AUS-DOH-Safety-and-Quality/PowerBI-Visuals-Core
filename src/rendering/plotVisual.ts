import type powerbi from "powerbi-visuals-api";
import { select, type BaseType, type Selection } from "d3-selection";
import { lineOpacity, lineStyle, type LineSettingValues } from "../settings/lineSettings";
import type { ValueFormatter } from "../data/valueFormatter";
import type { TableValue } from "../data/toCsv";
import bindContextMenu from "./contextMenu";
import type { ColourPalette } from "../powerbi/colourPalette";
import type { FormattingModel } from "../powerbi/buildFormattingModel";
import type { UpdateOptions } from "../powerbi/updateOptions";
import { drawErrorMessage, type ErrorKind } from "./errorMessage";
import { highlightPlot, type HighlightOpacities, type HighlightPoint } from "./highlight";
import { initialiseSvg } from "./initialiseSvg";
import { fitPlotToOverflow } from "./overflow";
import type { PlotContext, PlotPoint, PlotSettings } from "./plotContext";
import { createPlotFrame, type AxisBounds, type PlotFrame, type PlotFrameSettings } from "./plotFrame";
import type { LinePoint } from "./drawLines";
import {
  drawPlotAxes, drawPlotTooltips, drawPlotLines, drawPlotLineLabels, drawPlotDots, drawPlotDownload, drawPlotValueLabels, visiblePoints,
  type GroupedLine, type PlotDotsOptions, type TickFormats
} from "./drawPlot";

type IVisualHost = powerbi.extensibility.visual.IVisualHost;
type VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
type ISelectionId = powerbi.visuals.ISelectionId;

/** A drawn datum: a point, or a grouped row carrying its rows' identities */
type ContextMenuDatum = { readonly identity: ISelectionId | ISelectionId[] };

export type ViewModelValidation =
  | { status: true; warning?: string }
  | { status: false; error: string; type?: ErrorKind };

export type PlotVisualSettings = PlotSettings & PlotFrameSettings & {
  readonly canvas: { readonly show_errors: boolean };
  readonly lines: LineSettingValues;
};

/** A plot point's table row is what the download exports */
export type PlotVisualPoint = PlotPoint & HighlightPoint & { readonly table_row: Readonly<Record<string, TableValue>> };

/** What the visual shell reads from its view model */
export type PlotViewModel<P extends PlotVisualPoint, L extends LinePoint = LinePoint> = {
  readonly plotPoints: readonly P[];
  readonly groupedLines: readonly GroupedLine<string, L>[];
  /** Positions in every grouped line ending a labelled period */
  readonly periodEnds: readonly number[];
  readonly anyLabels: boolean;
  readonly inputSettings: { readonly derivedSettings: readonly { readonly formatValue: ValueFormatter }[] };
  readonly colourPalette: ColourPalette;
  readonly headless: boolean;
  readonly frontend: boolean;
  update(options: UpdateOptions, host: IVisualHost): ViewModelValidation;
  axisRanges(): { x: AxisBounds; y: AxisBounds };
  /** The formatting pane for the current view, which may depend on the data */
  getFormattingModel(): FormattingModel;
};

/** What differs between the visuals' plots */
export type PlotOptions<P extends PlotVisualPoint, L extends LinePoint> = {
  readonly tickFormats: TickFormats;
  /** Whether the crosshair follows the nearest point horizontally as well as vertically */
  readonly verticalCrosshair: boolean;
  /** The line settings a line's point is styled from */
  readonly lineSettings: (points: readonly L[], index: number) => LineSettingValues;
  /** Lines whose outside labels sit below the line */
  readonly lowerLines: ReadonlySet<string>;
  readonly dots: PlotDotsOptions<P>;
};

export type SelectionHighlightState = {
  readonly active: boolean;
  readonly selected: ReadonlySet<string>;
};

export type SvgSelection = Selection<SVGSVGElement, unknown, null, undefined>;
/** A view drawn in place of the plot: into the svg, or as an HTML table that leaves the svg empty */
export type AlternateView = "svg" | "table";
export type MarksSelection = Selection<SVGGElement, unknown, null, undefined>;

/** The update cycle, error display, plot frame and highlighting shared by the plot visuals */
export abstract class PlotVisual<P extends PlotVisualPoint, VM extends PlotViewModel<P, L>, S extends PlotVisualSettings,
                                 L extends LinePoint = LinePoint> implements powerbi.extensibility.IVisual {
  readonly element: HTMLElement;
  readonly host: IVisualHost;
  readonly svg: SvgSelection;
  readonly viewModel: VM;
  readonly selectionManager: powerbi.extensibility.ISelectionManager;
  private currentPlotProperties: PlotFrame | undefined;
  private tableShown: boolean = false;
  /** Line names to their `createLineGroup` keys */
  protected abstract readonly lineKeys: Readonly<Record<string, string>>;

  get plotProperties(): PlotFrame {
    if (this.currentPlotProperties === undefined) {
      throw new Error("Plot properties require validated data.");
    }
    return this.currentPlotProperties;
  }

  /** The last update drew an HTML table rather than the svg */
  get showsTable(): boolean {
    return this.tableShown;
  }

  constructor(options: VisualConstructorOptions | undefined, createViewModel: (host: IVisualHost) => VM) {
    if (options === undefined) {
      throw new Error("Visual constructor options are required.");
    }
    this.element = options.element;
    this.svg = select(options.element).append("svg");
    this.host = options.host;
    this.viewModel = createViewModel(this.host);
    this.selectionManager = this.host.createSelectionManager();
    this.selectionManager.registerOnSelectCallback(() => this.updateHighlighting());
    const svg = this.svg.node();
    if (svg !== null) {
      initialiseSvg(svg);
    }
  }

  /** The settings the plot is drawn from */
  protected abstract get settings(): S;
  protected abstract plotOptions(): PlotOptions<P, L>;
  abstract updateHighlighting(): void;
  /** Draws a view in place of the plot and returns its kind; by default there is none */
  protected drawAlternate(): AlternateView | undefined {
    return undefined;
  }
  /** Draws any marks into their layer over the dots; by default there are none */
  protected drawMarks(_marks: MarksSelection): void {}

  /** Axes, tooltips, lines and their labels, dots, marks, context menu, download and value labels, in that order */
  drawVisual(): void {
    const svg = this.svg.node();
    if (svg === null) {
      return;
    }
    const viewModel = this.viewModel;
    const context = this.plotContext();
    const options = this.plotOptions();
    const lines = viewModel.groupedLines;
    drawPlotAxes(svg, context, options.tickFormats);
    drawPlotTooltips(svg, context, options.verticalCrosshair);
    drawPlotLines(svg, context, lines, (name, points, index) => lineStyle(options.lineSettings(points, index), this.lineKeys[name]));
    drawPlotLineLabels(svg, context, {
      lines,
      settings: this.settings.lines,
      keys: this.lineKeys,
      lower: name => options.lowerLines.has(name),
      format: viewModel.inputSettings.derivedSettings[0].formatValue,
      periodEnds: viewModel.periodEnds
    });
    drawPlotDots(svg, context, options.dots);
    this.drawMarks(select(svg).select<SVGGElement>(".marksgroup"));
    this.addContextMenu(svg);
    drawPlotDownload(svg, context, () => {
      const points = context.points;
      const rows = new Array<P["table_row"]>(points.length);
      for (let i = 0; i < points.length; i++) {
        rows[i] = points[i].table_row;
      }
      return rows;
    });
    drawPlotValueLabels(svg, context, viewModel.anyLabels);
  }

  update(options: UpdateOptions): ViewModelValidation {
    try {
      this.host.eventService.renderingStarted(options);
      // Remove printed error if refreshing after a previous error run
      this.svg.select(".errormessage").remove();
      this.tableShown = false;

      const status = this.viewModel.update(options, this.host);
      if (!status.status) {
        this.currentPlotProperties = undefined;
        this.resizeCanvas(options.viewport.width, options.viewport.height);
        const empty = status.type === "empty";
        this.drawErrors(options, status.error, status.type, this.settings.canvas.show_errors && !empty);
        if (empty) {
          this.host.eventService.renderingFinished(options);
        } else {
          this.host.eventService.renderingFailed(options);
        }
        return status;
      }
      if (status.warning) {
        this.host.displayWarningIcon("Invalid inputs or settings ignored.\n", status.warning);
      }

      this.resizeCanvas(options.viewport.width, options.viewport.height);
      // An alternate view keeps the svg, so the last plot's pointer handlers would otherwise act on it
      this.svg.on(".plot", null);
      const alternate = this.drawAlternate();
      if (alternate !== undefined) {
        this.tableShown = alternate === "table";
        this.currentPlotProperties = undefined;
        this.updateHighlighting();
        this.host.eventService.renderingFinished(options);
        return status;
      }
      const viewModel = this.viewModel;
      this.currentPlotProperties = createPlotFrame({
        width: options.viewport.width,
        height: options.viewport.height,
        displayPlot: viewModel.plotPoints.length > 0,
        ...viewModel.axisRanges(),
        settings: this.settings,
        palette: viewModel.colourPalette
      });
      this.drawVisual();
      this.adjustPaddingForOverflow();

      this.updateHighlighting();
      this.host.eventService.renderingFinished(options);
      return status;
    } catch (caught_error) {
      this.currentPlotProperties = undefined;
      this.resizeCanvas(options.viewport.width, options.viewport.height);
      this.drawErrors(options, caught_error instanceof Error ? caught_error.message : String(caught_error), "internal", true);
      console.error(caught_error);
      this.host.eventService.renderingFailed(options);
      return { status: false, error: String(caught_error), type: "internal" };
    }
  }

  resizeCanvas(width: number, height: number): void {
    this.svg.attr("width", width).attr("height", height);
  }

  drawErrors(options: UpdateOptions, message: string, kind: ErrorKind | undefined, show: boolean): void {
    const svg = this.svg.node();
    if (svg === null) {
      return;
    }
    drawErrorMessage(svg, {
      width: options.viewport.width,
      height: options.viewport.height,
      message,
      kind,
      show,
      colour: this.viewModel.colourPalette.foregroundColour
    });
  }

  plotContext(): PlotContext<P> {
    const viewModel = this.viewModel;
    const frame = this.plotProperties;
    return {
      frame,
      points: viewModel.plotPoints,
      visible: visiblePoints(frame, viewModel.plotPoints),
      palette: viewModel.colourPalette,
      settings: this.settings,
      host: this.host,
      selectionManager: this.selectionManager,
      onSelectionChange: () => this.updateHighlighting(),
      headless: viewModel.headless,
      frontend: viewModel.frontend
    };
  }

  /** Fades the plot's lines by their line group's opacities and its dots by the given ones */
  protected highlightPlotPoints(state: SelectionHighlightState, dotOpacities: (point: P) => HighlightOpacities): void {
    const svg = this.svg.node();
    if (svg === null) {
      return;
    }
    highlightPlot<P>(svg, {
      active: state.active,
      selected: state.selected,
      lineOpacity: line => lineOpacity(this.settings.lines, this.lineKeys[line.name], state.active),
      dotOpacities
    });
  }

  /**
   * Context menu for the nearest datum with an identity under the pointer, as table cells sit within their row;
   * grouped rows supply their first identity, anything without one an empty one
   */
  addContextMenu(root: HTMLElement | SVGElement | null, enabled = this.plotProperties.displayPlot): void {
    if (root === null) {
      return;
    }
    bindContextMenu(root, {
      enabled,
      identity: target => {
        for (let node = target instanceof Element ? target : null; node !== null && node !== root; node = node.parentElement) {
          const datum = select<BaseType, Partial<ContextMenuDatum> | undefined>(node).datum();
          if (datum?.identity !== undefined) {
            return Array.isArray(datum.identity) ? datum.identity[0] : datum.identity;
          }
        }
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- no row under the pointer; Power BI treats the id as opaque
        return {} as ISelectionId;
      },
      show: (identity, position) => {
        void this.selectionManager.showContextMenu(identity, position);
      }
    });
  }

  adjustPaddingForOverflow(): void {
    // Headless mode does not render to screen so do not attempt to adjust for overflow
    if (this.viewModel.headless) {
      return;
    }
    const svg = this.svg.node();
    if (svg === null) {
      return;
    }
    const fitted = fitPlotToOverflow(svg, this.plotProperties);
    if (fitted === undefined) {
      return;
    }
    this.currentPlotProperties = fitted;
    this.drawVisual();
  }

  getFormattingModel(): powerbi.visuals.FormattingModel {
    // API 5.1 omits the visual's unset numeric values and legacy option shapes.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- tsc rejects the uncast model
    return this.viewModel.getFormattingModel() as powerbi.visuals.FormattingModel;
  }
}
