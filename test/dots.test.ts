import { describe, expect, it, vi } from "vitest";
import { drawDots, drawPlotDots, drawLines, highlightPlot, type PlotLine } from "../src/rendering/index";
import { symbolPath } from "../src/rendering/symbolPath";
import { svgElement, frame, host, points, context, client, palette, type TestPoint } from "./browserHelpers";
import { must } from "../src/testing/index";

function draw(svg: SVGSVGElement, plotPoints: readonly TestPoint[], overrides: Partial<Parameters<typeof drawDots<TestPoint>>[1]> = {}) {
  const visualHost = overrides.host ?? host();
  const options = {
    frame: frame(),
    points: plotPoints,
    show: true,
    text: undefined,
    host: visualHost,
    selectionManager: visualHost.createSelectionManager(),
    onSelectionChange: vi.fn(),
    onClick: undefined,
    ...overrides
  };
  drawDots(svg, options);
  return options;
}

describe("dot drawing", () => {
  it("draws one marker per point at its scaled position and scales away points outside the frame", () => {
    const svg = svgElement();
    const visualHost = host();
    const plotPoints = points(visualHost, [10, 50, 500]);
    plotPoints[1].aesthetics = {
      ...plotPoints[1].aesthetics,
      shape: "Square",
      size: 4,
      colour: "#ff0000",
      colour_outline: "#00ff00",
      width_outline: 3
    };
    draw(svg, plotPoints, { host: visualHost });
    const marks = svg.querySelectorAll<SVGPathElement>(".dotsgroup > path");
    expect(marks).toHaveLength(3);
    const f = frame();
    expect(marks[0].getAttribute("transform")).toBe(`translate(${f.xScale(0)}, ${f.yScale(10)})`);
    expect(marks[2].getAttribute("transform")).toBe("translate(0, 0) scale(0)");
    expect(marks[1].style.fill).toBe("rgb(255, 0, 0)");
    expect(marks[1].style.stroke).toBe("rgb(0, 255, 0)");
    expect(marks[1].style.strokeWidth).toBe("3");
    // d3-shape 3.2.0 symbol().type(symbolSquare).size(4 ** 2 * Math.PI)()
    expect(marks[1].getAttribute("d")).toBe("M-3.545,-3.545h7.09v7.09h-7.09Z");
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
    draw(svg, plotPoints, {
      host: visualHost,
      text: point => ({ text: `P${point.x}`, size: 14, font: "Georgia", colour: "#0000ff" })
    });
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
    must(svg.querySelector<SVGPathElement>(".dotsgroup > path")).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onClick).toHaveBeenCalledWith(plotPoints[0]);
    expect(select).not.toHaveBeenCalled();

    (visualHost as { hostCapabilities: { allowInteractions: boolean } }).hostCapabilities = { allowInteractions: false };
    draw(svg, plotPoints, { host: visualHost, onClick });
    must(svg.querySelector<SVGPathElement>(".dotsgroup > path")).dispatchEvent(new MouseEvent("click", { bubbles: true }));
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
      dataItems: plotPoints[1].tooltip,
      identities: [plotPoints[1].identity],
      coordinates: [40, 30],
      isTouchEvent: false
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

describe("dot marker paths", () => {
  const dotSize = 2.5 ** 2 * Math.PI;
  // Reference strings generated by d3-shape 3.2.0 symbol().type(symbol<Shape>).size(s)(); dotSize is the default dot's area
  it.each([
    ["Circle", 0, "M0,0"],
    ["Circle", dotSize, "M2.5,0A2.5,2.5,0,1,1,-2.5,0A2.5,2.5,0,1,1,2.5,0"],
    ["Circle", 100, "M5.642,0A5.642,5.642,0,1,1,-5.642,0A5.642,5.642,0,1,1,5.642,0"],
    ["Cross", 0, "M0,0L0,0L0,0L0,0L0,0L0,0L0,0L0,0L0,0L0,0L0,0L0,0Z"],
    ["Cross", dotSize, "M-2.972,-0.991L-0.991,-0.991L-0.991,-2.972L0.991,-2.972L0.991,-0.991L2.972,-0.991L2.972,0.991L0.991,0.991L0.991,2.972L-0.991,2.972L-0.991,0.991L-2.972,0.991Z"],
    ["Cross", 100, "M-6.708,-2.236L-2.236,-2.236L-2.236,-6.708L2.236,-6.708L2.236,-2.236L6.708,-2.236L6.708,2.236L2.236,2.236L2.236,6.708L-2.236,6.708L-2.236,2.236L-6.708,2.236Z"],
    ["Diamond", 0, "M0,0L0,0L0,0L0,0Z"],
    ["Diamond", dotSize, "M0,-4.124L2.381,0L0,4.124L-2.381,0Z"],
    ["Diamond", 100, "M0,-9.306L5.373,0L0,9.306L-5.373,0Z"],
    ["Square", 0, "M0,0h0v0h0Z"],
    ["Square", dotSize, "M-2.216,-2.216h4.431v4.431h-4.431Z"],
    ["Square", 100, "M-5,-5h10v10h-10Z"],
    ["Star", 0, "M0,0L0,0L0,0L0,0L0,0L0,0L0,0L0,0L0,0L0,0Z"],
    ["Star", dotSize, "M0,-4.182L0.939,-1.292L3.978,-1.292L1.519,0.494L2.458,3.383L0,1.597L-2.458,3.383L-1.519,0.494L-3.978,-1.292L-0.939,-1.292Z"],
    ["Star", 100, "M0,-9.438L2.119,-2.917L8.976,-2.917L3.429,1.114L5.548,7.636L0,3.605L-5.548,7.636L-3.429,1.114L-8.976,-2.917L-2.119,-2.917Z"],
    ["Triangle", 0, "M0,0L0,0L0,0Z"],
    ["Triangle", dotSize, "M0,-3.888L3.367,1.944L-3.367,1.944Z"],
    ["Triangle", 100, "M0,-8.774L7.598,4.387L-7.598,4.387Z"],
    ["Wye", 0, "M0,0L0,0L0,0L0,0L0,0L0,0L0,0L0,0L0,0Z"],
    ["Wye", dotSize, "M1.196,0.69L1.196,3.082L-1.196,3.082L-1.196,0.69L-3.267,-0.505L-2.071,-2.577L0,-1.381L2.071,-2.577L3.267,-0.505Z"],
    ["Wye", 100, "M2.699,1.558L2.699,6.955L-2.699,6.955L-2.699,1.558L-7.373,-1.141L-4.674,-5.815L0,-3.116L4.674,-5.815L7.373,-1.141Z"]
  ])("matches d3 for %s at size %s", (shape, size, expected) => {
    expect(symbolPath(shape, size)).toBe(expected);
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
    drawLines(must(svg.querySelector<SVGGElement>(".linesgroup")), { frame: frame(), lines, palette });
    highlightPlot<TestPoint>(svg, {
      active: true,
      selected: new Set([plotPoints[1].identity.getKey()]),
      lineOpacity: line => line.name === "a" ? 0.5 : 0.1,
      dotOpacities: point => ({ opacity: 1, opacity_selected: 0.9, opacity_unselected: point.x === 0 ? 0.3 : 0.2 })
    });
    const marks = svg.querySelectorAll<SVGPathElement>(".dotsgroup > path");
    expect([marks[0].style.fillOpacity, marks[1].style.fillOpacity, marks[2].style.fillOpacity]).toEqual(["0.3", "0.9", "0.9"]);
    expect(marks[0].style.strokeOpacity).toBe("0.3");
    expect(must(svg.querySelector<SVGGElement>(".a-linegroup")).style.strokeOpacity).toBe("0.5");
    expect(must(svg.querySelector<SVGGElement>(".b-linegroup")).style.strokeOpacity).toBe("0.1");
    highlightPlot<TestPoint>(svg, {
      active: false,
      selected: new Set(),
      lineOpacity: () => 1,
      dotOpacities: () => ({ opacity: 0.7, opacity_selected: 0.9, opacity_unselected: 0.2 })
    });
    expect(marks[1].style.fillOpacity).toBe("0.7");
  });
});
