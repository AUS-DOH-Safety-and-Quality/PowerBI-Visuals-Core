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
  const texts = group.querySelectorAll("text");
  const ys = new Array<number>(texts.length);
  for (let i = 0; i < texts.length; i++) {
    ys[i] = Number(texts[i].getAttribute("y"));
  }
  return { group, texts, ys, rectHeight: Number(group.querySelector("rect")?.getAttribute("height")) };
}

describe("SVG tooltips", () => {
  it("styles the text from the settings, spacing a 12px font 15px apart", () => {
    const { group, texts, ys, rectHeight } = drawn(fontSettings(12));
    expect(group.getAttribute("class")).toBe("chart-tooltip-group");
    expect(ys).toEqual([15, 30]);
    expect(rectHeight).toBe(35);
    const style = getComputedStyle(texts[0]);
    expect([style.fontSize, style.fontFamily, style.fill]).toEqual(["12px", "monospace", "rgb(1, 2, 3)"]);
  });

  it("spaces lines in proportion to the font size", () => {
    const { ys, rectHeight } = drawn(fontSettings(20));
    expect(ys).toEqual([25, 50]);
    expect(rectHeight).toBe(55);
  });

  it("takes font, size and colour from the class, overriding the page's text styles", () => {
    addStyle(".test-tooltip { font-family: monospace; font-size: 20px; font-weight: bold; color: rgb(1, 2, 3); } svg { font-size: 8px; }");
    const { group, texts, ys, rectHeight } = drawn(classSettings);
    expect(group.getAttribute("class")).toBe("chart-tooltip-group test-tooltip");
    expect(ys).toEqual([25, 50]);
    expect(rectHeight).toBe(55);
    const style = getComputedStyle(texts[1]);
    expect([style.fontSize, style.fontFamily, style.fontWeight, style.fill]).toEqual(["20px", "monospace", "700", "rgb(1, 2, 3)"]);
  });

  it("follows changes to the class's rule on the next show", () => {
    addStyle(".test-tooltip { font-size: 12px; }");
    const svg = select(svgElement(300, 150));
    showTooltip(svg, classSettings, items, [10, 10]);
    must(sheets[0]).textContent = ".test-tooltip { font-size: 16px; }";
    showTooltip(svg, classSettings, items, [10, 10]);
    const texts = must(svg.node()).querySelectorAll(".chart-tooltip-group text");
    expect([texts[0].getAttribute("y"), texts[1].getAttribute("y")]).toEqual(["20", "40"]);
  });

  it("moves above the point by the scaled height when it would pass the bottom edge", () => {
    const { group } = drawn(fontSettings(20), [10, 140]);
    // 140 - 2 lines of 25px - 5px padding
    expect(group.getAttribute("transform")).toBe("translate(10, 85)");
  });

  it("draws an empty box for no items", () => {
    const { texts, rectHeight } = drawn(fontSettings(12), [10, 10], []);
    expect(texts.length).toBe(0);
    expect(rectHeight).toBe(5);
  });
});
