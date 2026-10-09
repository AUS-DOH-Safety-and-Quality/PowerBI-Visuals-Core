import { describe, expect, it, vi } from "vitest";
import { drawValueLabels, drawPlotValueLabels, labelGeometry, type PlotFrame } from "../src/rendering/index";
import type { ValueLabelOptions } from "../src/rendering/drawValueLabels";
import { svgElement, frame, host, points, context, client, settings, type TestPoint } from "./browserHelpers";

const line = { colour: "#123456", width: 2, type: "2 5" };

function labelOptions(plotPoints: readonly TestPoint[], f: PlotFrame, overrides: Partial<ValueLabelOptions> = {}): ValueLabelOptions {
  return {
    visible: true,
    points: plotPoints,
    xScale: f.xScale,
    yScale: f.yScale,
    plotHeight: 400,
    bottomPadding: 10,
    line,
    interactive: false,
    ...overrides
  };
}

describe("value labels", () => {
  it("draws text, connector and marker for each labelled point from its geometry", () => {
    const svg = svgElement();
    const visualHost = host();
    const plotPoints = points(visualHost, [10, 20, 30], ["first", "", undefined]);
    const f = frame();
    drawValueLabels(svg, labelOptions(plotPoints, f));
    const groups = svg.querySelectorAll<SVGGElement>(".text-labels > .text-group-inner");
    expect(groups).toHaveLength(1);
    const text = groups[0].querySelector("text")!;
    const connector = groups[0].querySelector("line")!;
    const marker = groups[0].querySelector("path")!;
    const pointX = f.xScale(0);
    const pointY = f.yScale(10);
    const geometry = labelGeometry(plotPoints[0].label, pointX, pointY, 400, 10)!;
    expect(text.textContent).toBe("first");
    expect(Number(text.getAttribute("x"))).toBeCloseTo(geometry.x, 6);
    expect(Number(text.getAttribute("y"))).toBeCloseTo(geometry.y, 6);
    expect(text.style.fontSize).toBe("10px");
    expect(Number(connector.getAttribute("y1"))).toBeCloseTo(geometry.y + geometry.line_offset, 6);
    const radians = (geometry.theta - 180) * Math.PI / 180;
    expect(Number(connector.getAttribute("x2"))).toBeCloseTo(pointX + geometry.marker_offset * Math.cos(radians), 6);
    expect(Number(connector.getAttribute("y2"))).toBeCloseTo(pointY + geometry.marker_offset * Math.sin(radians), 6);
    expect(connector.style.stroke).toBe("rgb(18, 52, 86)");
    expect(connector.style.strokeDasharray).toBe("2, 5");
    expect(marker.getAttribute("d")).toMatch(/^M0,-/);
    expect(marker.style.fill).toBe("rgb(0, 0, 0)");
    expect(groups[0].style.touchAction).toBe("");
  });

  it("omits the marker when markers are off and removes the layer when hidden", () => {
    const svg = svgElement();
    const visualHost = host();
    const plotPoints = points(visualHost, [10], ["a"]);
    plotPoints[0].label.aesthetics = { ...plotPoints[0].label.aesthetics, label_marker_show: false };
    const f = frame();
    const options = labelOptions(plotPoints, f);
    drawValueLabels(svg, options);
    expect(svg.querySelector(".text-group-inner path")).toBeNull();
    drawValueLabels(svg, { ...options, visible: false });
    expect(svg.querySelector(".text-labels")).toBeNull();
  });

  it("lets an interactive label be dragged, storing the angle and distance on the point", () => {
    const capture = vi.spyOn(Element.prototype, "setPointerCapture").mockImplementation(() => undefined);
    vi.spyOn(Element.prototype, "releasePointerCapture").mockImplementation(() => undefined);
    try {
      const svg = svgElement();
      const visualHost = host();
      const plotPoints = points(visualHost, [50], ["drag me"]);
      const f = frame();
      drawValueLabels(svg, labelOptions(plotPoints, f, { interactive: true }));
      const group = svg.querySelector<SVGGElement>(".text-group-inner")!;
      expect(group.style.touchAction).toBe("none");
      const pointX = f.xScale(0);
      const pointY = f.yScale(50);
      group.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 1, bubbles: true }));
      expect(capture).toHaveBeenCalledWith(1);
      group.dispatchEvent(new PointerEvent("pointermove", { pointerId: 1, ...client(svg, pointX + 30, pointY) }));
      expect(plotPoints[0].label.angle).toBeCloseTo(0, 6);
      expect(plotPoints[0].label.distance).toBeCloseTo(30, 6);
      expect(Number(group.querySelector("text")!.getAttribute("x"))).toBeCloseTo(pointX + 30, 6);
      group.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1 }));
      group.dispatchEvent(new PointerEvent("pointermove", { pointerId: 1, ...client(svg, pointX + 90, pointY) }));
      expect(plotPoints[0].label.distance).toBeCloseTo(30, 6);
    } finally {
      vi.restoreAllMocks();
    }
  });

  it("draws from a plot context only when the visual has labels to show", () => {
    const svg = svgElement();
    const visualHost = host();
    const plotPoints = points(visualHost, [10, 20], ["a", "b"]);
    drawPlotValueLabels(svg, context(visualHost, plotPoints), false);
    expect(svg.querySelector(".text-labels")).toBeNull();
    drawPlotValueLabels(svg, context(visualHost, plotPoints, { headless: true }), true);
    const groups = svg.querySelectorAll<SVGGElement>(".text-group-inner");
    expect(groups).toHaveLength(2);
    expect(groups[0].style.touchAction).toBe("");
    expect(groups[0].querySelector("line")!.style.strokeWidth).toBe(String(settings.labels.label_line_width));
  });
});
