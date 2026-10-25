import at from "../util/at";
import { select } from "d3-selection";
import { round3 } from "./symbolPath";
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
  /** Style of the segment starting at a point; a change between points splits the line into segments */
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

/** A point placed on the plot, with the drawn length up to it so dashes run on across segments */
type Vertex = { readonly x: number; readonly y: number; readonly valid: boolean; readonly style: LineStyle; readonly along: number };
type Segment = { readonly from: Vertex; readonly to: Vertex };

/** Path through runs of valid points; a run of one point is closed, as d3-shape's line does */
function linePath(vertices: readonly Vertex[]): string {
  let path = "";
  let run = 0;
  for (let i = 0; i <= vertices.length; i++) {
    const vertex = vertices[i];
    if (vertex?.valid) {
      path += `${run === 0 ? "M" : "L"}${round3(vertex.x)},${round3(vertex.y)}`;
      run++;
    } else {
      if (run === 1) {
        path += "Z";
      }
      run = 0;
    }
  }
  return path;
}

/** One group per line bound to its PlotLine: a single path, or per-segment lines when the style varies */
export function drawLines(group: SVGGElement, options: LinesOptions): void {
  const frame = options.frame;
  const palette = options.palette;
  select(group)
    .selectChildren<SVGGElement, PlotLine>("g")
    .data(options.lines)
    .join("g")
    .attr("class", line => `${line.name}-linegroup`)
    .each(function(line) {
      const n = line.points.length;
      const vertices = new Array<Vertex>(n);
      // Segments with an end in the plot
      const segments: Segment[] = [];
      let previous: Vertex | undefined;
      let anyValid = false;
      let uniform = true;
      for (let i = 0; i < n; i++) {
        const point = at(line.points, i);
        const x = frame.xScale(point.x);
        const y = frame.yScale(point.line_value ?? NaN);
        const valid = inPlot(frame, point.x, point.line_value);
        const style = line.style(i);
        const vertex: Vertex = {
          x,
          y,
          valid,
          style: palette.isHighContrast ? { ...style, colour: palette.foregroundColour } : style,
          along: previous === undefined ? 0 : previous.along + (previous.valid && valid ? Math.hypot(x - previous.x, y - previous.y) : 0)
        };
        vertices[i] = vertex;
        anyValid = anyValid || valid;
        if (previous !== undefined) {
          uniform = uniform && sameStyle(vertex.style, previous.style);
          if (previous.valid || valid) {
            segments.push({ from: previous, to: vertex });
          }
        }
        previous = vertex;
      }

      const container = select(this);
      if (!anyValid) {
        container.selectAll("line, path").remove();
        return;
      }
      if (uniform) {
        const style = at(vertices, 0).style;
        container.selectAll("line").remove();
        container
          .selectAll("path")
          .data([line.points])
          .join("path")
          .attr("d", linePath(vertices))
          .attr("fill", "none")
          .attr("stroke", style.colour)
          .attr("stroke-width", style.width)
          .attr("stroke-dasharray", style.type);
        return;
      }
      // An invalid endpoint collapses its segment onto the other end; the dash offset keeps the pattern continuous
      container.selectAll("path").remove();
      container
        .selectAll<SVGLineElement, Segment>("line")
        .data(segments)
        .join("line")
        .attr("x1", s => s.from.valid ? s.from.x : s.to.x)
        .attr("y1", s => s.from.valid ? s.from.y : s.to.y)
        .attr("x2", s => s.to.valid ? s.to.x : s.from.x)
        .attr("y2", s => s.to.valid ? s.to.y : s.from.y)
        .attr("fill", "none")
        .attr("stroke", s => s.from.style.colour)
        .attr("stroke-width", s => s.from.style.width)
        .attr("stroke-dasharray", s => s.from.style.type)
        .attr("stroke-dashoffset", s => s.from.along);
    });
}
