import { describe, expect, it } from "vitest";
import { drawLines, drawLineLabels, type LineLabel, type PlotLine } from "../src/rendering/index";
import { svgElement, frame, palette } from "./browserHelpers";

const style = { colour: "#112233", width: 2, type: "2 5" };
const points = [{ x: 0, line_value: 10 }, { x: 2, line_value: 30 }, { x: 4, line_value: 20 }];

function group(svg: SVGSVGElement): SVGGElement {
  return svg.querySelector<SVGGElement>(".linesgroup")!;
}

function draw(svg: SVGSVGElement, lines: readonly PlotLine[], linePalette = palette): void {
  drawLines(group(svg), { frame: frame(), lines, palette: linePalette });
}

function ends(segment: Element): (string | null)[] {
  return [segment.getAttribute("x1"), segment.getAttribute("y1"), segment.getAttribute("x2"), segment.getAttribute("y2")];
}

function lineLabel(text: string, x: number, y: number, overrides: Partial<LineLabel> = {}): LineLabel {
  return {
    text,
    x,
    y,
    position: "above",
    lower: false,
    hpad: 3,
    vpad: 5,
    lineWidth: 2,
    size: 10,
    font: "Arial",
    colour: "#000",
    ...overrides
  };
}

describe("line drawing", () => {
  it("draws a uniformly styled line as one path bound to its definition", () => {
    const svg = svgElement();
    const line: PlotLine = { name: "target", points, style: () => style };
    draw(svg, [line]);
    const lineGroup = svg.querySelector<SVGGElement>(".linesgroup > g.target-linegroup")!;
    const path = lineGroup.querySelector("path")!;
    expect(lineGroup.querySelectorAll("line")).toHaveLength(0);
    expect(path.getAttribute("stroke")).toBe("#112233");
    expect(path.getAttribute("stroke-width")).toBe("2");
    expect(path.getAttribute("stroke-dasharray")).toBe("2 5");
    const f = frame();
    expect(path.getAttribute("d")).toBe(`M${f.xScale(0)},${f.yScale(10)}L${f.xScale(2)},${f.yScale(30)}L${f.xScale(4)},${f.yScale(20)}`);
  });

  it("breaks the path at gaps and points outside the frame", () => {
    const svg = svgElement();
    const gapped = [
      { x: 0, line_value: 10 },
      { x: 1, line_value: undefined },
      { x: 2, line_value: 30 },
      { x: 3, line_value: 500 },
      { x: 4, line_value: 20 }
    ];
    draw(svg, [{ name: "a", points: gapped, style: () => style }]);
    const d = svg.querySelector(".a-linegroup path")!.getAttribute("d")!;
    expect(d.split("M")).toHaveLength(4);
  });

  it("draws per-segment lines when the style changes along the line, with the dash offset at the drawn length", () => {
    const svg = svgElement();
    // A segment takes the style of the point it starts at
    const styles = [style, { ...style, colour: "#ff0000" }, { ...style, colour: "#ff0000" }];
    draw(svg, [{ name: "a", points, style: index => styles[index] }]);
    const lineGroup = svg.querySelector<SVGGElement>(".a-linegroup")!;
    expect(lineGroup.querySelectorAll("path")).toHaveLength(0);
    const segments = lineGroup.querySelectorAll("line");
    expect(segments).toHaveLength(2);
    expect(segments[0].getAttribute("stroke")).toBe("#112233");
    expect(segments[1].getAttribute("stroke")).toBe("#ff0000");
    const f = frame();
    expect(segments[1].getAttribute("x1")).toBe(String(f.xScale(2)));
    expect(segments[1].getAttribute("stroke-dashoffset")).toBe(String(Math.hypot(f.xScale(2) - f.xScale(0), f.yScale(30) - f.yScale(10))));
  });

  it("drops per-segment lines with neither end inside the frame", () => {
    const svg = svgElement();
    const outside = [
      { x: 0, line_value: 10 },
      { x: 2, line_value: 120 },
      { x: 4, line_value: 130 },
      { x: 6, line_value: 20 }
    ];
    const styles = [style, { ...style, colour: "#ff0000" }, style, style];
    draw(svg, [{ name: "a", points: outside, style: index => styles[index] }]);
    const segments = svg.querySelectorAll(".a-linegroup line");
    const f = frame();
    // The middle segment is dropped; the others collapse onto their end inside the frame
    expect(segments).toHaveLength(2);
    expect(ends(segments[0])).toEqual([String(f.xScale(0)), String(f.yScale(10)), String(f.xScale(0)), String(f.yScale(10))]);
    expect(ends(segments[1])).toEqual([String(f.xScale(6)), String(f.yScale(20)), String(f.xScale(6)), String(f.yScale(20))]);
    // Collapsed and dropped segments draw nothing, so add no length
    expect(segments[1].getAttribute("stroke-dashoffset")).toBe("0");
  });

  it("removes a line with no drawable points and drops lines no longer supplied", () => {
    const svg = svgElement();
    draw(svg, [{ name: "a", points, style: () => style }, { name: "b", points, style: () => style }]);
    expect(svg.querySelectorAll(".linesgroup > g")).toHaveLength(2);
    draw(svg, [{ name: "a", points: [{ x: 0, line_value: undefined }], style: () => style }]);
    expect(svg.querySelectorAll(".linesgroup > g")).toHaveLength(1);
    expect(svg.querySelectorAll(".a-linegroup path, .a-linegroup line")).toHaveLength(0);
  });

  it("uses the host foreground colour in high contrast", () => {
    const svg = svgElement();
    draw(svg, [{ name: "a", points, style: () => style }], { isHighContrast: true, foregroundColour: "#00ff00" });
    expect(svg.querySelector(".a-linegroup path")!.getAttribute("stroke")).toBe("#00ff00");
  });
});

describe("line labels", () => {
  it("replaces the group's text children with placed labels", () => {
    const svg = svgElement();
    const target = group(svg);
    drawLineLabels(target, [lineLabel("old", 0, 0, { hpad: 1, vpad: 1, lineWidth: 1 })]);
    drawLineLabels(target, [
      lineLabel("UCL 9.5", 300, 40, { colour: "#123456" }),
      lineLabel("LCL 1.5", 300, 360, { position: "outside", lower: true, colour: "#654321" })
    ]);
    const texts = target.querySelectorAll("text");
    expect(texts).toHaveLength(2);
    expect(texts[0].textContent).toBe("UCL 9.5");
    expect(texts[0].getAttribute("x")).toBe("300");
    expect(texts[0].getAttribute("fill")).toBe("#123456");
    expect(texts[0].getAttribute("text-anchor")).toBe("end");
    expect(texts[0].getAttribute("dx")).toBe("-3px");
    expect(texts[0].getAttribute("dy")).toBe("-7px");
    expect(texts[1].getAttribute("dy")).toBe("15px");
    drawLineLabels(target, []);
    expect(target.querySelectorAll("text")).toHaveLength(0);
  });
});
