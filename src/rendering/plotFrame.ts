import scaleLinear, { type LinearScale } from "../math/scaleLinear";
import between from "../math/between";
import isNullOrUndefined from "../data/isNullOrUndefined";
import { axisPropertiesFromSettings, type AxisPalette, type AxisProperties, type AxisSettingValues } from "./axisProperties";
import type { PlotPadding } from "./overflow";

/** The region renderers draw into: canvas size, padded axis ranges, and the scales built from them */
export type PlotFrame = {
  readonly width: number;
  readonly height: number;
  readonly xAxis: AxisProperties;
  readonly yAxis: AxisProperties;
  readonly xScale: LinearScale;
  readonly yScale: LinearScale;
  readonly displayPlot: boolean;
};

export type AxisBounds = {
  readonly lower: number;
  readonly upper: number;
};

export type PlotFrameSettings = {
  readonly canvas: {
    readonly lower_padding: number;
    readonly upper_padding: number;
    readonly left_padding: number;
    readonly right_padding: number;
  };
  readonly x_axis: AxisSettingValues<"x">;
  readonly y_axis: AxisSettingValues<"y">;
};

export type PlotFrameOptions = {
  readonly width: number;
  readonly height: number;
  readonly displayPlot: boolean;
  readonly x: AxisBounds;
  readonly y: AxisBounds;
  readonly settings: PlotFrameSettings;
  readonly palette: AxisPalette;
};

function scaledFrame(width: number, height: number, xAxis: AxisProperties, yAxis: AxisProperties, displayPlot: boolean): PlotFrame {
  return {
    width,
    height,
    xAxis,
    yAxis,
    displayPlot,
    xScale: scaleLinear().domain([xAxis.lower, xAxis.upper]).range([xAxis.start_padding, width - xAxis.end_padding]),
    yScale: scaleLinear().domain([yAxis.lower, yAxis.upper]).range([height - yAxis.start_padding, yAxis.end_padding])
  };
}

/** Each axis title reserves its font size beside the canvas padding: the y title on the left, the x title below */
export function createPlotFrame(options: PlotFrameOptions): PlotFrame {
  const settings = options.settings;
  const palette = options.palette;
  const leftLabel = settings.y_axis.ylimit_label ? settings.y_axis.ylimit_label_size : 0;
  const lowerLabel = settings.x_axis.xlimit_label ? settings.x_axis.xlimit_label_size : 0;
  const xAxis = axisPropertiesFromSettings("x", settings.x_axis, palette, {
    lower: options.x.lower,
    upper: options.x.upper,
    start_padding: settings.canvas.left_padding + leftLabel,
    end_padding: settings.canvas.right_padding
  });
  const yAxis = axisPropertiesFromSettings("y", settings.y_axis, palette, {
    lower: options.y.lower,
    upper: options.y.upper,
    start_padding: settings.canvas.lower_padding + lowerLabel,
    end_padding: settings.canvas.upper_padding
  });
  return scaledFrame(options.width, options.height, xAxis, yAxis, options.displayPlot);
}

/** The same frame over new paddings, with the scales rebuilt */
export function rescalePlotFrame(frame: PlotFrame, padding: PlotPadding): PlotFrame {
  const xAxis = { ...frame.xAxis, start_padding: padding.left, end_padding: padding.right };
  const yAxis = { ...frame.yAxis, start_padding: padding.bottom, end_padding: padding.top };
  return scaledFrame(frame.width, frame.height, xAxis, yAxis, frame.displayPlot);
}

/** Whether a point has a value and lies within both axis ranges */
export function inPlot(frame: PlotFrame, x: number, value: number | null | undefined): boolean {
  return !isNullOrUndefined(value)
    && between(value, frame.yAxis.lower, frame.yAxis.upper)
    && between(x, frame.xAxis.lower, frame.xAxis.upper);
}
