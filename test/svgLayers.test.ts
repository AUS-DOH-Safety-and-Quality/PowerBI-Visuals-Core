import { describe, expect, it, vi } from "vitest";
import { select } from "d3-selection";
import { initialiseSvg, screenToSvg } from "../src/rendering/index";
import { svgElement } from "./browserHelpers";

describe("svg layers", () => {
  it("builds the fixed layer order", () => {
    const svg = svgElement();
    const classes = Array.from(svg.children).map(child => `${child.tagName}.${child.getAttribute("class")}`);
    expect(classes).toEqual([
      "line.ttip-line-x", "line.ttip-line-y", "g.gridgroup", "g.xaxisgroup", "text.xaxislabel", "g.yaxisgroup", "text.yaxislabel", "g.linesgroup", "g.dotsgroup"
    ]);
  });

  it("resetting clears every child and the .plot handlers before rebuilding the layers", () => {
    const svg = svgElement();
    svg.querySelector(".dotsgroup")!.appendChild(svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "path"));
    const plotClick = vi.fn();
    const otherClick = vi.fn();
    select(svg).on("click.plot", plotClick).on("click.other", otherClick);
    initialiseSvg(svg, true);
    expect(svg.children).toHaveLength(9);
    expect(svg.querySelector(".dotsgroup path")).toBeNull();
    svg.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(plotClick).not.toHaveBeenCalled();
    expect(otherClick).toHaveBeenCalledTimes(1);
  });
});

describe("screen to svg", () => {
  it("maps client coordinates through the svg's viewBox transform", () => {
    const svg = svgElement(500, 400);
    svg.setAttribute("viewBox", "0 0 1000 800");
    const rect = svg.getBoundingClientRect();
    const mapped = screenToSvg(svg, rect.left + 250, rect.top + 100);
    expect(mapped.x).toBeCloseTo(500, 6);
    expect(mapped.y).toBeCloseTo(200, 6);
  });

  it("is the identity without a viewBox", () => {
    const svg = svgElement(500, 400);
    const rect = svg.getBoundingClientRect();
    expect(screenToSvg(svg, rect.left + 12.5, rect.top + 7)).toEqual({ x: 12.5, y: 7 });
  });
});
