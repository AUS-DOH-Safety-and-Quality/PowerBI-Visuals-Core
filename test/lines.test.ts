import { describe, expect, it } from "vitest";
import { drawLines, drawLineLabels, type PlotLine } from "../src/rendering/index";
import { svgElement, frame } from "./browserHelpers";

const style = { colour: "#112233", width: 2, type: "2 5" };
const points = [{ x: 0, line_value: 10 }, { x: 2, line_value: 30 }, { x: 4, line_value: 20 }];

function group(svg: SVGSVGElement): SVGGElement {
  return svg.querySelector<SVGGElement>(".linesgroup")!;
}

describe("line drawing", () => {
  it("draws a uniformly styled line as one path bound to its definition", () => {
    const svg = svgElement();
    const line: PlotLine = { name: "target", points, style: () => style };
    drawLines(group(svg), { frame: frame(), lines: [line], palette: { isHighContrast: false, foregroundColour: "#fff" } });
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
    const gapped = [{ x: 0, line_value: 10 }, { x: 1, line_value: undefined }, { x: 2, line_value: 30 }, { x: 3, line_value: 500 }, { x: 4, line_value: 20 }];
    drawLines(group(svg), { frame: frame(), lines: [{ name: "a", points: gapped, style: () => style }], palette: { isHighContrast: false, foregroundColour: "#fff" } });
    const d = svg.querySelector(".a-linegroup path")!.getAttribute("d")!;
    expect(d.split("M")).toHaveLength(4);
  });

  it("draws per-segment lines when the style changes along the line, with a continuous dash offset", () => {
    const svg = svgElement();
    // A segment takes the style of the point it starts at
    const styles = [style, { ...style, colour: "#ff0000" }, { ...style, colour: "#ff0000" }];
    drawLines(group(svg), { frame: frame(), lines: [{ name: "a", points, style: index => styles[index] }], palette: { isHighContrast: false, foregroundColour: "#fff" } });
    const lineGroup = svg.querySelector<SVGGElement>(".a-linegroup")!;
    expect(lineGroup.querySelectorAll("path")).toHaveLength(0);
    const segments = lineGroup.querySelectorAll("line");
    expect(segments).toHaveLength(2);
    expect(segments[0].getAttribute("stroke")).toBe("#112233");
    expect(segments[1].getAttribute("stroke")).toBe("#ff0000");
    const f = frame();
    expect(segments[1].getAttribute("x1")).toBe(String(f.xScale(2)));
    expect(segments[1].getAttribute("stroke-dashoffset")).toBe(String(f.xScale(2) - f.xScale(0)));
  });

  it("removes a line with no drawable points and drops lines no longer supplied", () => {
    const svg = svgElement();
    const palette = { isHighContrast: false, foregroundColour: "#fff" };
    drawLines(group(svg), { frame: frame(), lines: [{ name: "a", points, style: () => style }, { name: "b", points, style: () => style }], palette });
    expect(svg.querySelectorAll(".linesgroup > g")).toHaveLength(2);
    drawLines(group(svg), { frame: frame(), lines: [{ name: "a", points: [{ x: 0, line_value: undefined }], style: () => style }], palette });
    expect(svg.querySelectorAll(".linesgroup > g")).toHaveLength(1);
    expect(svg.querySelectorAll(".a-linegroup path, .a-linegroup line")).toHaveLength(0);
  });

  it("uses the host foreground colour in high contrast", () => {
    const svg = svgElement();
    drawLines(group(svg), { frame: frame(), lines: [{ name: "a", points, style: () => style }], palette: { isHighContrast: true, foregroundColour: "#00ff00" } });
    expect(svg.querySelector(".a-linegroup path")!.getAttribute("stroke")).toBe("#00ff00");
  });
});

describe("line labels", () => {
  it("replaces the group's text children with placed labels", () => {
    const svg = svgElement();
    const target = group(svg);
    drawLineLabels(target, [{ text: "old", x: 0, y: 0, position: "above", lower: false, hpad: 1, vpad: 1, lineWidth: 1, size: 10, font: "Arial", colour: "#000" }]);
    drawLineLabels(target, [
      { text: "UCL 9.5", x: 300, y: 40, position: "above", lower: false, hpad: 3, vpad: 5, lineWidth: 2, size: 10, font: "Arial", colour: "#123456" },
      { text: "LCL 1.5", x: 300, y: 360, position: "outside", lower: true, hpad: 3, vpad: 5, lineWidth: 2, size: 10, font: "Arial", colour: "#654321" }
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
