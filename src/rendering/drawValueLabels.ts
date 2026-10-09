import { labelGeometry, type LabelPoint } from "./labelGeometry";
import trianglePath from "./trianglePath";
import screenToSvg from "./screenToSvg";

export type LabelLineStyle = {
  readonly colour: string;
  readonly width: number;
  readonly type: string;
};

export type ValueLabelOptions = {
  readonly visible: boolean;
  readonly points: readonly LabelPoint[];
  readonly xScale: (x: number) => number;
  readonly yScale: (value: number) => number;
  readonly plotHeight: number;
  readonly bottomPadding: number;
  readonly line: LabelLineStyle;
  // Drag handlers are attached only when true (headless rendering passes false)
  readonly interactive: boolean;
};

const SVG_NS = "http://www.w3.org/2000/svg";

function append<K extends keyof SVGElementTagNameMap>(parent: Element, tag: K): SVGElementTagNameMap[K] {
  const element = parent.ownerDocument.createElementNS(SVG_NS, tag);
  parent.appendChild(element);
  return element;
}

export default function drawValueLabels(svg: SVGSVGElement, options: ValueLabelOptions): void {
  let container = svg.querySelector(".text-labels");
  if (!options.visible) {
    container?.remove();
    return;
  }
  if (container === null) {
    container = append(svg, "g");
    container.classList.add("text-labels");
  }
  container.replaceChildren();

  const points = options.points;
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const text = point.label.text_value ?? "";
    if (text === "") continue;

    const pointX = options.xScale(point.x);
    const pointY = options.yScale(point.value);
    const geometry = labelGeometry(point.label, pointX, pointY, options.plotHeight, options.bottomPadding);
    if (geometry === undefined) continue;

    const aesthetics = point.label.aesthetics;
    const top = aesthetics.label_position === "top";
    const angle = geometry.theta - (top ? 180 : 0);
    const radians = angle * Math.PI / 180;

    const group = append(container, "g");
    group.classList.add("text-group-inner");
    const textElement = append(group, "text");
    const lineElement = append(group, "line");
    const pathElement = aesthetics.label_marker_show ? append(group, "path") : undefined;

    textElement.setAttribute("x", String(geometry.x));
    textElement.setAttribute("y", String(geometry.y));
    textElement.textContent = text;
    textElement.style.setProperty("text-anchor", "middle");
    textElement.style.setProperty("font-size", `${aesthetics.label_size}px`);
    textElement.style.setProperty("font-family", aesthetics.label_font);
    textElement.style.setProperty("fill", aesthetics.label_colour);

    const markerSize = Math.pow(aesthetics.label_marker_size, 2);
    const markerX = pointX + geometry.marker_offset * Math.cos(radians);
    const markerY = pointY + geometry.marker_offset * Math.sin(radians);

    lineElement.setAttribute("x1", String(geometry.x));
    lineElement.setAttribute("y1", String(geometry.y + geometry.line_offset));
    lineElement.setAttribute("x2", String(markerX));
    lineElement.setAttribute("y2", String(markerY));
    lineElement.style.setProperty("stroke", options.line.colour);
    lineElement.style.setProperty("stroke-width", String(options.line.width));
    lineElement.style.setProperty("stroke-dasharray", options.line.type);

    if (pathElement !== undefined) {
      pathElement.setAttribute("d", trianglePath(markerSize));
      pathElement.setAttribute("transform", `translate(${markerX}, ${markerY}) rotate(${angle + (top ? 90 : 270)})`);
      pathElement.style.setProperty("fill", aesthetics.label_marker_colour);
      pathElement.style.setProperty("stroke", aesthetics.label_marker_outline_colour);
    }

    if (!options.interactive) continue;

    // Marker distance along the drag angle; matches the initial draw's offset from the point
    const dragMarkerOffset = aesthetics.label_marker_offset + aesthetics.label_size / 2;
    group.style.setProperty("touch-action", "none");
    group.addEventListener("pointerdown", (event: PointerEvent) => {
      group.setPointerCapture(event.pointerId);
      const onMove = (move: PointerEvent) => {
        const { x, y } = screenToSvg(svg, move.clientX, move.clientY);
        const dragAngle = Math.atan2(y - pointY, x - pointX) * 180 / Math.PI;
        point.label.angle = dragAngle;
        point.label.distance = Math.sqrt(Math.pow(y - pointY, 2) + Math.pow(x - pointX, 2));
        const dragRadians = dragAngle * Math.PI / 180;
        const dragMarkerX = pointX + dragMarkerOffset * Math.cos(dragRadians);
        const dragMarkerY = pointY + dragMarkerOffset * Math.sin(dragRadians);
        textElement.setAttribute("x", String(x));
        textElement.setAttribute("y", String(y));
        lineElement.setAttribute("x1", String(x));
        lineElement.setAttribute("y1", String(y + geometry.line_offset));
        lineElement.setAttribute("x2", String(dragMarkerX));
        lineElement.setAttribute("y2", String(dragMarkerY));
        pathElement?.setAttribute("transform", `translate(${dragMarkerX}, ${dragMarkerY}) rotate(${dragAngle - 90})`);
      };
      const onUp = (up: PointerEvent) => {
        group.releasePointerCapture(up.pointerId);
        group.removeEventListener("pointermove", onMove);
        group.removeEventListener("pointerup", onUp);
        group.removeEventListener("pointercancel", onUp);
      };
      group.addEventListener("pointermove", onMove);
      group.addEventListener("pointerup", onUp);
      group.addEventListener("pointercancel", onUp);
    });
  }
}
