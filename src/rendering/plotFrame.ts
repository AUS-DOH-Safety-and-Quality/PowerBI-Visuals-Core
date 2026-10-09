import type { LinearScale } from "../math/scaleLinear";
import between from "../math/between";
import isNullOrUndefined from "../data/isNullOrUndefined";
import type { AxisProperties } from "./axisProperties";

// The region renderers draw into: canvas size, padded axis ranges, and the scales built from them
export type PlotFrame = {
  readonly width: number;
  readonly height: number;
  readonly xAxis: AxisProperties;
  readonly yAxis: AxisProperties;
  readonly xScale: LinearScale;
  readonly yScale: LinearScale;
  readonly displayPlot: boolean;
};

// Whether a point has a value and lies within both axis ranges
export function inPlot(frame: PlotFrame, x: number, value: number | null | undefined): boolean {
  return !isNullOrUndefined(value)
    && between(value, frame.yAxis.lower, frame.yAxis.upper)
    && between(x, frame.xAxis.lower, frame.xAxis.upper);
}
