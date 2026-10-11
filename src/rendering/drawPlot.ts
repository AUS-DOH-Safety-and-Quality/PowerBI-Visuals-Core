import { select } from "d3-selection";
import toCsv from "../data/toCsv";
import { drawAxis } from "./drawAxis";
import { drawCrosshairs } from "./crosshairs";
import { nearestPoint } from "./nearestPoint";
import screenToSvg from "./screenToSvg";
import drawValueLabels from "./drawValueLabels";
import { drawDots, type DotText } from "./drawDots";
import { drawDownloadButton } from "./downloadButton";
import { drawLines, type LinePoint, type LineStyle, type PlotLine } from "./drawLines";
import { drawLineLabels, type LineLabel } from "./lineLabels";
import { lineLabel, lineSetting, type LineSettingValues } from "../settings/lineSettings";
import type { ValueFormatter } from "../data/valueFormatter";
import { inPlot } from "./plotFrame";
import type { PlotContext, PlotPoint } from "./plotContext";

/** A named line and its points, as `groupBy` returns them */
export type GroupedLine<N extends string = string, L extends LinePoint = LinePoint> = readonly [N, readonly L[]];

export type PlotLineLabelOptions<N extends string> = {
  readonly lines: readonly GroupedLine<N>[];
  readonly settings: LineSettingValues;
  readonly keys: Readonly<Record<N, string>>;
  /** Lines whose outside labels sit below the line */
  readonly lower: (name: N) => boolean;
  readonly format: ValueFormatter;
  /** Positions ending each labelled period; the last period is always labelled */
  readonly periodEnds: readonly number[];
};

export type TickFormat = (value: number) => string;

export type TickFormats = {
  readonly x: TickFormat | undefined;
  readonly y: TickFormat | undefined;
};

export type PlotDotsOptions<P extends PlotPoint> = {
  readonly show: boolean;
  readonly text: ((point: P) => DotText) | undefined;
  readonly onClick: ((point: P) => void) | undefined;
};

/** Points whose dots are drawn; the rest lie outside the axis limits, so take no label or tooltip */
function visiblePoints<P extends PlotPoint>(context: PlotContext<P>): P[] {
  const visible: P[] = [];
  for (let i = 0; i < context.points.length; i++) {
    const point = context.points[i];
    if (inPlot(context.frame, point.x, point.value)) {
      visible.push(point);
    }
  }
  return visible;
}

/** Fixed decimals, as a percentage when the values are scaled to one hundred */
export function valueTickFormat(decimals: number, percent: boolean): TickFormat {
  return value => percent ? `${value.toFixed(decimals)}%` : value.toFixed(decimals);
}

/** Axis titles are measured against the live layout, which the frontend renderer lacks */
export function drawPlotAxes(svg: SVGSVGElement, context: PlotContext, formats: TickFormats): void {
  const frame = context.frame;
  const settings = context.settings;
  const measure = !context.frontend;
  drawAxis(svg, {
    axis: "x",
    frame,
    show: settings.x_axis.xlimit_show,
    labelSize: settings.x_axis.xlimit_label_size,
    measure,
    tickFormat: formats.x
  });
  drawAxis(svg, {
    axis: "y",
    frame,
    show: settings.y_axis.ylimit_show,
    labelSize: settings.y_axis.ylimit_label_size,
    measure,
    tickFormat: formats.y
  });
}

/** Crosshairs and the host tooltip follow the nearest point; `.plot` handlers are dropped when the svg is reset */
export function drawPlotTooltips(svg: SVGSVGElement, context: PlotContext, includeVertical: boolean): void {
  const frame = context.frame;
  const points = visiblePoints(context);
  const host = context.host;
  const palette = context.palette;
  const vertical = svg.querySelector<SVGLineElement>(".ttip-line-x");
  const horizontal = svg.querySelector<SVGLineElement>(".ttip-line-y");
  if (vertical === null || horizontal === null) {
    return;
  }
  const crosshairs = drawCrosshairs({
    vertical,
    horizontal,
    left: frame.xAxis.start_padding,
    right: frame.width - frame.xAxis.end_padding,
    top: frame.yAxis.end_padding,
    bottom: frame.height - frame.yAxis.start_padding,
    colour: palette.isHighContrast ? palette.foregroundColour : "black"
  });
  select(svg)
    .on("mousemove.plot", (event: MouseEvent) => {
      if (!frame.displayPlot) {
        return;
      }
      const pointer = screenToSvg(svg, event.clientX, event.clientY);
      const nearest = nearestPoint(
        points.length,
        i => ({ x: frame.xScale(points[i].x), y: frame.yScale(points[i].value) }),
        pointer.x,
        pointer.y,
        includeVertical
      );
      if (nearest === undefined) {
        return;
      }
      const point = points[nearest.index];
      host.tooltipService.show({
        dataItems: point.tooltip,
        identities: [point.identity],
        coordinates: [nearest.x, nearest.y],
        isTouchEvent: false
      });
      crosshairs.show(nearest.x, nearest.y);
    })
    .on("mouseleave.plot", () => {
      if (!frame.displayPlot) {
        return;
      }
      host.tooltipService.hide({ immediately: true, isTouchEvent: false });
      crosshairs.hide();
    });
}

/** One plot line per group, styled per point so a line's segments may differ */
export function drawPlotLines<N extends string, L extends LinePoint>(svg: SVGSVGElement, context: PlotContext,
                                                                     grouped: readonly GroupedLine<N, L>[],
                                                                     style: (name: N, points: readonly L[], index: number) => LineStyle): void {
  const group = svg.querySelector<SVGGElement>(".linesgroup");
  if (group === null) {
    return;
  }
  const lines = new Array<PlotLine>(grouped.length);
  for (let i = 0; i < grouped.length; i++) {
    const name = grouped[i][0];
    const points = grouped[i][1];
    lines[i] = { name, points, style: index => style(name, points, index) };
  }
  drawLines(group, { frame: context.frame, lines, palette: context.palette });
}

/** Labels each line's last in-plot point per period, as its `plot_label_` settings allow */
export function drawPlotLineLabels<N extends string>(svg: SVGSVGElement, context: PlotContext, options: PlotLineLabelOptions<N>): void {
  const group = svg.querySelector<SVGGElement>(".linesgroup");
  if (group === null) {
    return;
  }
  const frame = context.frame;
  const lines = options.lines;
  const settings = options.settings;
  const periodEnds = options.periodEnds;
  const lastPeriod = periodEnds.length - 1;
  const labels: LineLabel[] = [];
  for (let r = 0; r < periodEnds.length; r++) {
    const index = periodEnds[r];
    const start = r === 0 ? 0 : periodEnds[r - 1] + 1;
    for (let l = 0; l < lines.length; l++) {
      const name = lines[l][0];
      const points = lines[l][1];
      const key = options.keys[name];
      if (!lineSetting<boolean>(settings, "plot_label_show", key)) {
        continue;
      }
      // Earlier periods are labelled by count from the end, or all of them
      if (r !== lastPeriod) {
        const showN = periodEnds.length - Math.min(periodEnds.length, lineSetting<number>(settings, "plot_label_show_n", key));
        if (r < showN && !lineSetting<boolean>(settings, "plot_label_show_all", key)) {
          continue;
        }
      }
      for (let i = index; i >= start; i--) {
        const value = points[i].line_value;
        if (value !== undefined && inPlot(frame, points[i].x, value)) {
          labels.push(lineLabel(settings, key, { x: frame.xScale(points[i].x), y: frame.yScale(value), value }, options.lower(name), options.format));
          break;
        }
      }
    }
  }
  drawLineLabels(group, labels, context.headless);
}

export function drawPlotValueLabels(svg: SVGSVGElement, context: PlotContext, anyLabels: boolean): void {
  const frame = context.frame;
  const settings = context.settings;
  drawValueLabels(svg, {
    visible: settings.labels.show_labels && anyLabels,
    points: visiblePoints(context),
    xScale: frame.xScale,
    yScale: frame.yScale,
    plotHeight: frame.height,
    bottomPadding: frame.yAxis.start_padding,
    line: {
      colour: settings.labels.label_line_colour,
      width: settings.labels.label_line_width,
      type: settings.labels.label_line_type
    },
    interactive: !context.headless
  });
}

export function drawPlotDots<P extends PlotPoint>(svg: SVGSVGElement, context: PlotContext<P>, options: PlotDotsOptions<P>): void {
  drawDots(svg, {
    frame: context.frame,
    points: context.points,
    show: options.show,
    text: options.text,
    host: context.host,
    selectionManager: context.selectionManager,
    onSelectionChange: context.onSelectionChange,
    onClick: options.onClick
  });
}

/** Exports the rows as chartdata.csv through the host's download service */
export function drawPlotDownload(svg: SVGSVGElement, context: PlotContext, rows: () => readonly Readonly<Record<string, unknown>>[]): void {
  drawDownloadButton(svg, {
    visible: context.settings.download_options.show_button,
    x: context.frame.width - 50,
    y: context.frame.height - 5,
    onClick: () => context.host.downloadService.exportVisualsContent(toCsv(rows()), "chartdata.csv", "csv", "csv file")
  });
}
