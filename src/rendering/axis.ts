export type AxisLabelAlign = "left" | "center" | "right" | "bottom" | "top";
export type AxisLabelPlacement = {
  readonly position: number;
  readonly anchor: "start" | "middle" | "end";
};

export type GridlineOptions = {
  // Group holding the gridlines; lines of this class are replaced
  readonly container: Element;
  readonly className: string;
  readonly orientation: "vertical" | "horizontal";
  // Tick values and the scale placing them along the axis
  readonly values: readonly number[];
  readonly scale: (value: number) => number;
  // Extent of each line across the plot
  readonly from: number;
  readonly to: number;
  readonly colour: string;
  readonly width: number;
};

const SVG_NS = "http://www.w3.org/2000/svg";

// Bottom/top mirror left/right for the rotated y-axis label; centre is the plot midpoint
export function axisLabelPlacement(align: AxisLabelAlign, start: number, end: number): AxisLabelPlacement {
  if (align === "left" || align === "bottom") {
    return { position: start, anchor: "start" };
  }
  if (align === "right" || align === "top") {
    return { position: end, anchor: "end" };
  }
  return { position: (start + end) / 2, anchor: "middle" };
}

export function drawGridlines(options: GridlineOptions): void {
  const { container, className } = options;
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
