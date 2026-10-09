import { describe, expect, it, vi } from "vitest";
import { drawDots, drawPlotDots, drawLines, highlightPlot, type PlotLine } from "../src/rendering/index";
import { svgElement, frame, host, points, context, client, type TestPoint } from "./browserHelpers";

function draw(svg: SVGSVGElement, plotPoints: readonly TestPoint[], overrides: Partial<Parameters<typeof drawDots<TestPoint>>[1]> = {}) {
  const visualHost = overrides.host ?? host();
  const options = {
    frame: frame(), points: plotPoints, show: true, text: undefined, host: visualHost,
    selectionManager: visualHost.createSelectionManager(), onSelectionChange: vi.fn(), onClick: undefined, ...overrides
  };
  drawDots(svg, options);
  return options;
}

describe("dot drawing", () => {
  it("draws one marker per point at its scaled position and scales away points outside the frame", () => {
    const svg = svgElement();
    const visualHost = host();
    const plotPoints = points(visualHost, [10, 50, 500]);
    plotPoints[1].aesthetics = { ...plotPoints[1].aesthetics, shape: "Square", size: 4, colour: "#ff0000", colour_outline: "#00ff00", width_outline: 3 };
    draw(svg, plotPoints, { host: visualHost });
    const marks = svg.querySelectorAll<SVGPathElement>(".dotsgroup > path");
    expect(marks).toHaveLength(3);
    const f = frame();
    expect(marks[0].getAttribute("transform")).toBe(`translate(${f.xScale(0)}, ${f.yScale(10)})`);
    expect(marks[2].getAttribute("transform")).toBe("translate(0, 0) scale(0)");
    expect(marks[1].style.fill).toBe("rgb(255, 0, 0)");
    expect(marks[1].style.stroke).toBe("rgb(0, 255, 0)");
    expect(marks[1].style.strokeWidth).toBe("3");
    expect(marks[1].getAttribute("d")).toMatch(/^M-?\d/);
    expect(marks[0].getAttribute("d")).not.toBe(marks[1].getAttribute("d"));
  });

  it("draws nothing when hidden or when the plot is not displayed, removing earlier marks", () => {
    const svg = svgElement();
    const visualHost = host();
    const plotPoints = points(visualHost, [10, 20]);
    draw(svg, plotPoints, { host: visualHost });
    draw(svg, plotPoints, { host: visualHost, show: false });
    expect(svg.querySelectorAll(".dotsgroup > path")).toHaveLength(0);
    draw(svg, plotPoints, { host: visualHost, frame: frame({ displayPlot: false }) });
    expect(svg.querySelectorAll(".dotsgroup > path")).toHaveLength(0);
  });

  it("draws text instead of markers in text mode and swaps back cleanly", () => {
    const svg = svgElement();
    const visualHost = host();
    const plotPoints = points(visualHost, [10, 20]);
    draw(svg, plotPoints, { host: visualHost, text: point => ({ text: `P${point.x}`, size: 14, font: "Georgia", colour: "#0000ff" }) });
    const texts = svg.querySelectorAll<SVGTextElement>(".dotsgroup > text");
    expect(texts).toHaveLength(2);
    expect(svg.querySelectorAll(".dotsgroup > path")).toHaveLength(0);
    expect(texts[1].textContent).toBe("P1");
    expect(texts[1].style.fontSize).toBe("14px");
    expect(texts[1].style.fontFamily).toBe("Georgia");
    expect(texts[1].style.fill).toBe("rgb(0, 0, 255)");
    draw(svg, plotPoints, { host: visualHost });
    expect(svg.querySelectorAll(".dotsgroup > text")).toHaveLength(0);
    expect(svg.querySelectorAll(".dotsgroup > path")).toHaveLength(2);
  });

  it("selects on click, multi-selects with a modifier, clears on the background and reports each change", async () => {
    const svg = svgElement();
    const visualHost = host();
    const plotPoints = points(visualHost, [10, 20]);
    const options = draw(svg, plotPoints, { host: visualHost });
    const select = vi.spyOn(options.selectionManager, "select");
    const clear = vi.spyOn(options.selectionManager, "clear");
    const marks = svg.querySelectorAll<SVGPathElement>(".dotsgroup > path");
    marks[1].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(select).toHaveBeenLastCalledWith(plotPoints[1].identity, false);
    marks[0].dispatchEvent(new MouseEvent("click", { bubbles: true, ctrlKey: true }));
    expect(select).toHaveBeenLastCalledWith(plotPoints[0].identity, true);
    await vi.waitFor(() => expect(options.onSelectionChange).toHaveBeenCalledTimes(2));
    // The click did not bubble to the background clear
    expect(clear).not.toHaveBeenCalled();
    svg.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(clear).toHaveBeenCalledTimes(1);
    expect(options.onSelectionChange).toHaveBeenCalledTimes(3);
  });

  it("routes clicks to a custom handler instead of selection, and ignores clicks when the host forbids interaction", () => {
    const svg = svgElement();
    const visualHost = host();
    const plotPoints = points(visualHost, [10, 20]);
    const onClick = vi.fn();
    const options = draw(svg, plotPoints, { host: visualHost, onClick });
    const select = vi.spyOn(options.selectionManager, "select");
    svg.querySelector<SVGPathElement>(".dotsgroup > path")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onClick).toHaveBeenCalledWith(plotPoints[0]);
    expect(select).not.toHaveBeenCalled();

    (visualHost as { hostCapabilities: { allowInteractions: boolean } }).hostCapabilities = { allowInteractions: false };
    draw(svg, plotPoints, { host: visualHost, onClick });
    svg.querySelector<SVGPathElement>(".dotsgroup > path")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("shows the point's tooltip at the pointer and hides it on leaving", () => {
    const svg = svgElement();
    const visualHost = host();
    const plotPoints = points(visualHost, [10, 20]);
    draw(svg, plotPoints, { host: visualHost });
    const mark = svg.querySelectorAll<SVGPathElement>(".dotsgroup > path")[1];
    mark.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, ...client(svg, 40, 30) }));
    expect(visualHost.tooltipService.show).toHaveBeenCalledWith({
      dataItems: plotPoints[1].tooltip, identities: [plotPoints[1].identity], coordinates: [40, 30], isTouchEvent: false
    });
    mark.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
    expect(visualHost.tooltipService.hide).toHaveBeenCalledWith({ immediately: true, isTouchEvent: false });
  });

  it("draws from a plot context", () => {
    const svg = svgElement();
    const visualHost = host();
    const plotPoints = points(visualHost, [10, 20, 30]);
    drawPlotDots(svg, context(visualHost, plotPoints), { show: true, text: undefined, onClick: undefined });
    expect(svg.querySelectorAll(".dotsgroup > path")).toHaveLength(3);
  });
});

describe("plot highlighting", () => {
  it("fades dots through the supplied opacities and gives each line group its own opacity", () => {
    const svg = svgElement();
    const visualHost = host();
    const plotPoints = points(visualHost, [10, 20, 30]);
    plotPoints[2].highlighted = true;
    draw(svg, plotPoints, { host: visualHost });
    const style = { colour: "#000", width: 1, type: "10 0" };
    const lines: PlotLine[] = [
      { name: "a", points: [{ x: 0, line_value: 10 }, { x: 2, line_value: 30 }], style: () => style },
      { name: "b", points: [{ x: 0, line_value: 50 }, { x: 2, line_value: 60 }], style: () => style }
    ];
    drawLines(svg.querySelector<SVGGElement>(".linesgroup")!, { frame: frame(), lines, palette: { isHighContrast: false, foregroundColour: "#fff" } });
    highlightPlot<TestPoint>(svg, {
      active: true, selected: new Set([plotPoints[1].identity.getKey()]),
      lineOpacity: line => line.name === "a" ? 0.5 : 0.1,
      dotOpacities: point => ({ opacity: 1, opacity_selected: 0.9, opacity_unselected: point.x === 0 ? 0.3 : 0.2 })
    });
    const marks = svg.querySelectorAll<SVGPathElement>(".dotsgroup > path");
    expect([marks[0].style.fillOpacity, marks[1].style.fillOpacity, marks[2].style.fillOpacity]).toEqual(["0.3", "0.9", "0.9"]);
    expect(marks[0].style.strokeOpacity).toBe("0.3");
    expect(svg.querySelector<SVGGElement>(".a-linegroup")!.style.strokeOpacity).toBe("0.5");
    expect(svg.querySelector<SVGGElement>(".b-linegroup")!.style.strokeOpacity).toBe("0.1");
    highlightPlot<TestPoint>(svg, { active: false, selected: new Set(), lineOpacity: () => 1, dotOpacities: () => ({ opacity: 0.7, opacity_selected: 0.9, opacity_unselected: 0.2 }) });
    expect(marks[1].style.fillOpacity).toBe("0.7");
  });
});
