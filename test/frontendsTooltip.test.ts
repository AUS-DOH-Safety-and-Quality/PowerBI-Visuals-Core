import { afterEach, describe, expect, it } from "vitest";
import { showTooltip, type TooltipSettings } from "../src/frontends/index";
import { select } from "../src/rendering/index";
import { must } from "../src/testing/index";
import { svgElement } from "./browserHelpers";

const box = {
  ttip_background_color: "#FFFFFF",
  ttip_opacity: 1,
  ttip_border_radius: 0,
  ttip_border_color: "#D4D4D4",
  ttip_border_width: 1
};
const fontSettings = (size: number): TooltipSettings => ({ ...box, ttip_font_size: size, ttip_font: "monospace", ttip_font_color: "rgb(1, 2, 3)" });
const classSettings: TooltipSettings = { ...box, ttip_font_class: "test-tooltip" };
const items = [{ displayName: "Value", value: "4" }, { displayName: "Upper limit", value: "12.5" }];

const sheets: HTMLStyleElement[] = [];
afterEach(() => {
  for (let i = 0; i < sheets.length; i++) {
    sheets[i].remove();
  }
  sheets.length = 0;
});

function addStyle(css: string): void {
  const style = document.head.appendChild(document.createElement("style"));
  style.textContent = css;
  sheets.push(style);
}

function drawn(settings: TooltipSettings, coordinates: readonly number[] = [10, 10], tooltipItems = items) {
  const svg = select(svgElement(300, 150));
  showTooltip(svg, settings, tooltipItems, coordinates);
  const group = must(svg.select<SVGGElement>(".chart-tooltip-group").node());
  const names = group.querySelectorAll<SVGTextElement>(".chart-tooltip-name");
  const values = group.querySelectorAll<SVGTextElement>(".chart-tooltip-value");
  const ys = new Array<number>(names.length);
  for (let i = 0; i < names.length; i++) {
    ys[i] = Number(names[i].getAttribute("y"));
  }
  const rect = must(group.querySelector("rect"));
  return { group, names, values, ys, rectWidth: Number(rect.getAttribute("width")), rectHeight: Number(rect.getAttribute("height")) };
}

describe("SVG tooltips", () => {
  it("styles the text from the settings, spacing a 12px font as Power BI does", () => {
    const { group, names, ys, rectHeight } = drawn(fontSettings(12));
    expect(group.getAttribute("class")).toBe("chart-tooltip-group");
    // 13.2px padding, then 16.8px lines with the text centred in each
    expect(ys).toEqual([expect.closeTo(21.6), expect.closeTo(38.4)]);
    expect(rectHeight).toBeCloseTo(60);
    const style = getComputedStyle(names[0]);
    expect([style.fontSize, style.fontFamily, style.fill]).toEqual(["12px", "monospace", "rgb(1, 2, 3)"]);
  });

  it("scales the spacing with the font size", () => {
    const { ys, rectHeight } = drawn(fontSettings(20));
    expect(ys).toEqual([expect.closeTo(36), expect.closeTo(64)]);
    expect(rectHeight).toBeCloseTo(100);
  });

  it("takes font, size and colour from the class, overriding the page's text styles", () => {
    addStyle(".test-tooltip { font-family: monospace; font-size: 20px; font-weight: bold; color: rgb(1, 2, 3); } svg { font-size: 8px; }");
    const { group, values, ys, rectHeight } = drawn(classSettings);
    expect(group.getAttribute("class")).toBe("chart-tooltip-group test-tooltip");
    expect(ys).toEqual([expect.closeTo(36), expect.closeTo(64)]);
    expect(rectHeight).toBeCloseTo(100);
    const style = getComputedStyle(values[1]);
    expect([style.fontSize, style.fontFamily, style.fontWeight, style.fill]).toEqual(["20px", "monospace", "700", "rgb(1, 2, 3)"]);
  });

  it("follows changes to the class's rule on the next show", () => {
    addStyle(".test-tooltip { font-size: 12px; }");
    const svg = select(svgElement(300, 150));
    showTooltip(svg, classSettings, items, [10, 10]);
    must(sheets[0]).textContent = ".test-tooltip { font-size: 16px; }";
    showTooltip(svg, classSettings, items, [10, 10]);
    const names = must(svg.node()).querySelectorAll(".chart-tooltip-name");
    expect([Number(names[0].getAttribute("y")), Number(names[1].getAttribute("y"))]).toEqual([expect.closeTo(28.8), expect.closeTo(51.2)]);
  });

  it("right-aligns the names against left-aligned values, as Power BI does", () => {
    const { names, values, rectWidth } = drawn(fontSettings(12));
    const nameWidth = Math.max(names[0].getComputedTextLength(), names[1].getComputedTextLength());
    const valueWidth = Math.max(values[0].getComputedTextLength(), values[1].getComputedTextLength());
    expect(nameWidth).toBeGreaterThan(0);
    expect([names[0].textContent, values[0].textContent, names[1].textContent, values[1].textContent]).toEqual(["Value", "4", "Upper limit", "12.5"]);
    expect([getComputedStyle(names[0]).textAnchor, getComputedStyle(values[0]).textAnchor]).toEqual(["end", "start"]);
    for (let i = 0; i < names.length; i++) {
      expect(Number(names[i].getAttribute("x"))).toBeCloseTo(13.2 + nameWidth);
      expect(Number(values[i].getAttribute("x"))).toBeCloseTo(13.2 + nameWidth + 12);
      const box = names[i].getBBox();
      expect(box.x + box.width).toBeCloseTo(13.2 + nameWidth, 3);
    }
    expect(rectWidth).toBeCloseTo(13.2 + nameWidth + 12 + valueWidth + 13.2);
  });

  it("centres each row in its line, leaving equal space above and below the text", () => {
    const { names, values, ys, rectHeight } = drawn(fontSettings(20));
    for (let i = 0; i < names.length; i++) {
      const nameBox = names[i].getBBox();
      const valueBox = values[i].getBBox();
      expect(nameBox.y + nameBox.height / 2).toBeCloseTo(ys[i], 0);
      expect(valueBox.y).toBeCloseTo(nameBox.y, 3);
    }
    const first = names[0].getBBox();
    const last = names[names.length - 1].getBBox();
    expect(first.y).toBeCloseTo(rectHeight - last.y - last.height, 0);
  });

  it("moves left of the point by the full width when it would pass the right edge", () => {
    const { group, rectWidth } = drawn(fontSettings(12), [290, 10]);
    expect(group.getAttribute("transform")).toBe(`translate(${290 - rectWidth}, 10)`);
  });

  it("moves above the point by the full height when it would pass the bottom edge", () => {
    const { group, rectHeight } = drawn(fontSettings(20), [10, 60]);
    // 60 + 100 passes the 150px edge; 60 alone does not
    expect(rectHeight).toBeCloseTo(100);
    expect(group.getAttribute("transform")).toBe(`translate(10, ${60 - rectHeight})`);
  });

  it("stays put when the box fits", () => {
    const { group } = drawn(fontSettings(12), [10, 10]);
    expect(group.getAttribute("transform")).toBe("translate(10, 10)");
  });

  it("draws an empty, padded box for no items", () => {
    const { names, values, rectHeight } = drawn(fontSettings(12), [10, 10], []);
    expect([names.length, values.length]).toEqual([0, 0]);
    expect(rectHeight).toBeCloseTo(26.4);
  });
});
