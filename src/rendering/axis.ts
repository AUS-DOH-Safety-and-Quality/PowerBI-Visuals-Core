export type AxisLabelAlign = "left" | "center" | "right" | "bottom" | "top";
export type AxisLabelPlacement = {
  readonly position: number;
  readonly anchor: "start" | "middle" | "end";
};

export type GridlineOptions = {
  /** Group holding the gridlines; lines of this class are replaced */
  readonly container: Element;
  readonly className: string;
  readonly orientation: "vertical" | "horizontal";
  /** Tick values and the scale placing them along the axis */
  readonly values: readonly number[];
  readonly scale: (value: number) => number;
  /** Extent of each line across the plot */
  readonly from: number;
  readonly to: number;
  readonly colour: string;
  readonly width: number;
};

const SVG_NS = "http://www.w3.org/2000/svg";

/** Bottom/top mirror left/right for the rotated y-axis label; centre is the plot midpoint */
export function axisLabelPlacement(align: AxisLabelAlign, start: number, end: number): AxisLabelPlacement {
  if (align === "left" || align === "bottom") {
    return { position: start, anchor: "start" };
  }
  if (align === "right" || align === "top") {
    return { position: end, anchor: "end" };
  }
  return { position: (start + end) / 2, anchor: "middle" };
}

export type TickLabelOffsets = {
  readonly anchor: "start" | "middle" | "end";
  readonly dx: string;
  readonly dy: string;
};

/** Rotated tick labels hang from their rotated end; unrotated ones keep d3's centred placement */
export function xTickLabelOffsets(rotation: number): TickLabelOffsets {
  if (rotation < 0) {
    return { anchor: "end", dx: "-.8em", dy: "-.15em" };
  }
  if (rotation > 0) {
    return { anchor: "start", dx: ".8em", dy: ".15em" };
  }
  return { anchor: "middle", dx: "0em", dy: ".71em" };
}

export type AxisTitleSide = "bottom" | "left";

/**
 * Bottom titles sit midway between the axis and the canvas edge, left titles at 0.7 of the axis offset;
 * without a measurement the title sits a label size in from the edge
 */
export function axisTitleOffset(side: AxisTitleSide, canvasExtent: number, axisEdge: number | undefined, labelSize: number): number {
  if (side === "bottom") {
    return axisEdge === undefined ? canvasExtent - labelSize / 2 : canvasExtent - (canvasExtent - axisEdge) / 2;
  }
  return axisEdge === undefined ? labelSize * 1.5 : axisEdge * 0.7;
}

/** The axis's outer edge in the SVG's coordinates: bottom of a horizontal axis, left of a vertical one */
export function measureAxisEdge(svg: SVGSVGElement, axis: Element, side: AxisTitleSide): number {
  const svgRect = svg.getBoundingClientRect();
  const axisRect = axis.getBoundingClientRect();
  return side === "bottom" ? axisRect.bottom - svgRect.top : axisRect.left - svgRect.left;
}

export function drawGridlines(options: GridlineOptions): void {
  const container = options.container;
  const className = options.className;
  const existing = container.querySelectorAll(`.${className}`);
  for (let i = 0; i < existing.length; i++) {
    existing[i].remove();
  }
  const vertical = options.orientation === "vertical";
  for (let i = 0; i < options.values.length; i++) {
    const line = container.ownerDocument.createElementNS(SVG_NS, "line");
    line.classList.add(className);
    const position = String(options.scale(options.values[i]));
    line.setAttribute(vertical ? "x1" : "y1", position);
    line.setAttribute(vertical ? "x2" : "y2", position);
    line.setAttribute(vertical ? "y1" : "x1", String(options.from));
    line.setAttribute(vertical ? "y2" : "x2", String(options.to));
    line.style.setProperty("stroke", options.colour);
    line.style.setProperty("stroke-width", String(options.width));
    container.appendChild(line);
  }
}
