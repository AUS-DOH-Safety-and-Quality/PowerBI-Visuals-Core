import { select } from "d3-selection";
import toCsv from "../data/toCsv";
import { drawAxis } from "./drawAxis";
import { drawCrosshairs } from "./crosshairs";
import { nearestPoint } from "./nearestPoint";
import screenToSvg from "./screenToSvg";
import drawValueLabels from "./drawValueLabels";
import { drawDots, type DotText } from "./drawDots";
import { drawDownloadButton } from "./downloadButton";
import type { PlotContext, PlotPoint } from "./plotContext";

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
  const points = context.points;
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

export function drawPlotValueLabels(svg: SVGSVGElement, context: PlotContext, anyLabels: boolean): void {
  const frame = context.frame;
  const settings = context.settings;
  drawValueLabels(svg, {
    visible: settings.labels.show_labels && anyLabels,
    points: context.points,
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
