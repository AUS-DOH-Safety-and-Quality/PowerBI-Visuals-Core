import { SVG_NS } from "./svgNamespace";

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

export type AxisTitleMeasurement = {
  /** The axis's outer edge, as measureAxisEdge returns it */
  readonly axisEdge: number;
  /** The unrotated title's box above and below its baseline */
  readonly top: number;
  readonly height: number;
};

/**
 * Measured titles are centred between the axis and the canvas edge, abutting the axis when they do not fit so
 * overflow fitting grows the padding by the shortfall; unmeasured titles sit a label size in from the edge
 */
export function axisTitleOffset(side: AxisTitleSide, canvasExtent: number, labelSize: number,
                                measurement: AxisTitleMeasurement | undefined): number {
  if (measurement === undefined) {
    return side === "bottom" ? canvasExtent - labelSize / 2 : labelSize * 1.5;
  }
  const gap = side === "bottom" ? canvasExtent - measurement.axisEdge : measurement.axisEdge;
  const inset = Math.max(0, (gap - measurement.height) / 2);
  if (side === "bottom") {
    return measurement.axisEdge + inset - measurement.top;
  }
  // The rotated y title's top faces left
  return measurement.axisEdge - inset - measurement.height - measurement.top;
}

/**
 * The outer edge of an axis drawn at this offset, in the SVG's units: bottom of a horizontal axis, left of a vertical one.
 * Client rects would be in screen pixels, which differ under CSS scaling.
 */
export function measureAxisEdge(axis: SVGGraphicsElement, offset: number, side: AxisTitleSide): number {
  const box = axis.getBBox();
  return side === "bottom" ? offset + box.y + box.height : offset + box.x;
}

export type AxisTicksOptions = {
  readonly side: "bottom" | "left";
  /** Pixel extent of the axis line */
  readonly range: readonly number[];
  readonly position: (value: number) => number;
  readonly values: readonly number[];
  readonly format: (value: number) => string;
  readonly tickSizeOuter: number;
};

/** Replaces the group's contents with d3-axis's domain path and .tick groups, half-pixel aligned on standard displays */
export function drawAxisTicks(group: SVGGElement, options: AxisTicksOptions): void {
  const bottom = options.side === "bottom";
  const k = bottom ? 1 : -1;
  const offset = window.devicePixelRatio > 1 ? 0 : 0.5;
  const range0 = options.range[0] + offset;
  const range1 = options.range[options.range.length - 1] + offset;
  const outer = k * options.tickSizeOuter;
  const document = group.ownerDocument;
  group.replaceChildren();
  const domain = document.createElementNS(SVG_NS, "path");
  domain.setAttribute("class", "domain");
  domain.setAttribute("stroke", "currentColor");
  if (bottom) {
    domain.setAttribute("d", outer !== 0 ? `M${range0},${outer}V${offset}H${range1}V${outer}` : `M${range0},${offset}H${range1}`);
  } else {
    domain.setAttribute("d", outer !== 0 ? `M${outer},${range0}H${offset}V${range1}H${outer}` : `M${offset},${range0}V${range1}`);
  }
  group.appendChild(domain);
  for (let i = 0; i < options.values.length; i++) {
    const value = options.values[i];
    const tick = document.createElementNS(SVG_NS, "g");
    tick.setAttribute("class", "tick");
    tick.setAttribute("opacity", "1");
    const position = options.position(value) + offset;
    tick.setAttribute("transform", bottom ? `translate(${position},0)` : `translate(0,${position})`);
    const line = document.createElementNS(SVG_NS, "line");
    line.setAttribute("stroke", "currentColor");
    line.setAttribute(bottom ? "y2" : "x2", String(k * 6));
    const text = document.createElementNS(SVG_NS, "text");
    text.setAttribute("fill", "currentColor");
    text.setAttribute(bottom ? "y" : "x", String(k * 9));
    text.setAttribute("dy", bottom ? "0.71em" : "0.32em");
    text.textContent = options.format(value);
    tick.appendChild(line);
    tick.appendChild(text);
    group.appendChild(tick);
  }
  group.setAttribute("fill", "none");
  group.setAttribute("font-size", "10");
  group.setAttribute("font-family", "sans-serif");
  group.setAttribute("text-anchor", bottom ? "middle" : "end");
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
