import { select } from "d3-selection";
import { line as linePath } from "d3-shape";
import type { AxisPalette } from "./axisProperties";
import { inPlot, type PlotFrame } from "./plotFrame";

export type LinePoint = {
  readonly x: number;
  readonly line_value: number | undefined;
};

export type LineStyle = {
  readonly colour: string;
  readonly width: number;
  readonly type: string;
};

export type PlotLine = {
  readonly name: string;
  readonly points: readonly LinePoint[];
  // Style of the segment starting at a point; a change between points splits the line into segments
  readonly style: (index: number) => LineStyle;
};

export type LinesOptions = {
  readonly frame: PlotFrame;
  readonly lines: readonly PlotLine[];
  readonly palette: AxisPalette;
};

function sameStyle(a: LineStyle, b: LineStyle): boolean {
  return a.colour === b.colour && a.width === b.width && a.type === b.type;
}

// One group per line bound to its PlotLine: a single path, or per-segment lines when the style varies
export function drawLines(group: SVGGElement, options: LinesOptions): void {
  const { frame, palette } = options;
  select(group)
    .selectChildren<SVGGElement, PlotLine>("g")
    .data(options.lines)
    .join("g")
    .attr("class", line => `${line.name}-linegroup`)
    .each(function(line) {
      const n = line.points.length;
      const x = new Array<number>(n);
      const y = new Array<number>(n);
      const valid = new Array<boolean>(n);
      const styles = new Array<LineStyle>(n);
      let anyValid = false;
      let uniform = true;
      for (let i = 0; i < n; i++) {
        const point = line.points[i];
        x[i] = frame.xScale(point.x);
        y[i] = frame.yScale(point.line_value ?? NaN);
        valid[i] = inPlot(frame, point.x, point.line_value);
        anyValid = anyValid || valid[i];
        const style = line.style(i);
        styles[i] = palette.isHighContrast ? { ...style, colour: palette.foregroundColour } : style;
        if (i > 0) {
          uniform = uniform && sameStyle(styles[i], styles[i - 1]);
        }
      }

      const container = select(this);
      if (!anyValid) {
        container.selectAll("line, path").remove();
        return;
      }
      if (uniform) {
        container.selectAll("line").remove();
        container
          .selectAll("path")
          .data([line.points])
          .join("path")
          .attr("d", linePath<LinePoint>()
            .x((_, i) => x[i])
            .y((_, i) => y[i])
            .defined((_, i) => valid[i]))
          .attr("fill", "none")
          .attr("stroke", styles[0].colour)
          .attr("stroke-width", styles[0].width)
          .attr("stroke-dasharray", styles[0].type);
        return;
      }
      // An invalid endpoint collapses its segment onto the other end; the dash offset keeps the pattern continuous
      container.selectAll("path").remove();
      container
        .selectAll("line")
        .data(line.points.slice(1))
        .join("line")
        .attr("x1", (_, i) => valid[i] ? x[i] : x[i + 1])
        .attr("y1", (_, i) => valid[i] ? y[i] : y[i + 1])
        .attr("x2", (_, i) => valid[i + 1] ? x[i + 1] : x[i])
        .attr("y2", (_, i) => valid[i + 1] ? y[i + 1] : y[i])
        .attr("fill", "none")
        .attr("stroke", (_, i) => styles[i].colour)
        .attr("stroke-width", (_, i) => styles[i].width)
        .attr("stroke-dasharray", (_, i) => styles[i].type)
        .attr("stroke-dashoffset", (_, i) => x[i] - x[0]);
    });
}
