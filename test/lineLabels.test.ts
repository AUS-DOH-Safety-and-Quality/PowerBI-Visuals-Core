import { describe, expect, it } from "vitest";
import { drawPlotLineLabels, lineLabelGeometry, type GroupedLine } from "../src/rendering/index";
import type { LineLabelPlacement } from "../src/rendering/lineLabels";
import type { LinePoint } from "../src/rendering/drawLines";
import { createDefaultValues, createLineGroup, defineCard } from "../src/settings/index";
import { findBy, must } from "../src/testing/index";
import { svgElement, host, context, pluck } from "./browserHelpers";

const base: LineLabelPlacement = {
  position: "above",
  lower: false,
  hpad: 3,
  vpad: 5,
  lineWidth: 2,
  size: 10
};

function place(overrides: Partial<LineLabelPlacement>, textHeight = 12) {
  return lineLabelGeometry({ ...base, ...overrides }, textHeight);
}

// Line-label placement shared by both visuals; eligibility and text stay local
describe("line label geometry", () => {
  it("offsets above by the padding and line width, anchored at the end", () => {
    expect(place({ position: "above" })).toEqual({ anchor: "end", dx: -3, dy: -7 });
  });

  it("offsets below by the padding and font size", () => {
    expect(place({ position: "below" })).toEqual({ anchor: "end", dx: -3, dy: 15 });
  });

  it("places beside labels after the line end using a quarter of the text height", () => {
    expect(place({ position: "beside" }, 16)).toEqual({ anchor: "start", dx: 3, dy: -1 });
  });

  it("maps outside and inside by whether the line is a lower boundary", () => {
    expect(place({ position: "outside", lower: false }).dy).toBe(-7);
    expect(place({ position: "inside", lower: false }).dy).toBe(15);
    expect(place({ position: "outside", lower: true }).dy).toBe(15);
    expect(place({ position: "inside", lower: true }).dy).toBe(-7);
  });

  it("keeps zero padding and zero width as ordinary offsets", () => {
    expect(place({ hpad: 0, vpad: 0, lineWidth: 0 })).toEqual({ anchor: "end", dx: -0, dy: -0 });
    expect(place({ position: "below", vpad: 0, size: 0 }).dy).toBe(0);
  });
});

type LineName = "target" | "ll99";

const lineDefaults = createDefaultValues({
  lines: defineCard({ displayName: "Lines", description: "", settingsGroups: {
    target: createLineGroup("target", {
      showLabel: "Show Target", showDescription: "", showDefault: true, width: 1.5, type: "10 0", colour: "standard", rebaselines: true
    }),
    limits: createLineGroup("99", {
      showLabel: "Show 99% Limits", showDescription: "", showDefault: true, width: 2, type: "10 0", colour: "limits", rebaselines: true
    })
  } })
}).lines;

function line(values: readonly (number | undefined)[]): LinePoint[] {
  const result = new Array<LinePoint>(values.length);
  for (let i = 0; i < values.length; i++) {
    result[i] = { x: i, line_value: values[i] };
  }
  return result;
}

// Three periods: positions 0-1, 2-3 and 4-5
const periodEnds = [1, 3, 5];
const target: GroupedLine<LineName> = ["target", line([10, 15, 20, 25, 30, 50])];

function drawLabels(lines: readonly GroupedLine<LineName>[], overrides: Readonly<Record<string, unknown>>): SVGTextElement[] {
  const svg = svgElement();
  drawPlotLineLabels(svg, context(host(), []), {
    lines,
    settings: { ...lineDefaults, ...overrides },
    keys: { target: "target", ll99: "99" },
    lower: name => name === "ll99",
    format: value => String(value),
    periodEnds
  });
  return Array.from(svg.querySelectorAll<SVGTextElement>(".linesgroup > text"));
}

function labelTexts(lines: readonly GroupedLine<LineName>[], overrides: Readonly<Record<string, unknown>>): (string | null)[] {
  return pluck(drawLabels(lines, overrides), "textContent");
}

describe("plot line labels", () => {
  it("writes nothing for a line whose value is not shown on the plot", () => {
    expect(labelTexts([target], { plot_label_show_all_target: true })).toEqual([]);
  });

  it("writes the prefixed value at the line's last point by default", () => {
    const labels = drawLabels([target], { plot_label_show_target: true, plot_label_prefix_target: "Target: " });
    expect(pluck(labels, "textContent")).toEqual(["Target: 50"]);
    // x = 10 + 5 / 10 * 480, y = 390 - 50 / 100 * 380
    expect([labels[0].getAttribute("x"), labels[0].getAttribute("y")]).toEqual(["250", "200"]);
  });

  it("labels as many of the latest periods as asked, up to all of them", () => {
    expect(labelTexts([target], { plot_label_show_target: true, plot_label_show_n_target: 2 })).toEqual(["25", "50"]);
    expect(labelTexts([target], { plot_label_show_target: true, plot_label_show_n_target: 3 })).toEqual(["15", "25", "50"]);
    expect(labelTexts([target], { plot_label_show_target: true, plot_label_show_n_target: 10 })).toEqual(["15", "25", "50"]);
  });

  it("labels every period when showing all, whatever the count", () => {
    const all = { plot_label_show_target: true, plot_label_show_all_target: true };
    expect(labelTexts([target], all)).toEqual(["15", "25", "50"]);
    expect(labelTexts([target], { ...all, plot_label_show_n_target: 2 })).toEqual(["15", "25", "50"]);
  });

  it("takes each period's last value inside the axes, and none from a period without one", () => {
    const gapped: GroupedLine<LineName> = ["target", line([undefined, 500, 20, undefined, 30, 500])];
    expect(labelTexts([gapped], { plot_label_show_target: true, plot_label_show_all_target: true })).toEqual(["20", "30"]);
  });

  it("reads each line's own settings and places a lower line's outside label below it", () => {
    const lower: GroupedLine<LineName> = ["ll99", line([1, 2, 3, 4, 5, 6])];
    const labels = drawLabels([target, lower], {
      plot_label_show_target: true,
      plot_label_position_target: "outside",
      plot_label_show_99: true,
      plot_label_show_n_99: 2,
      plot_label_position_99: "outside"
    });
    expect(pluck(labels, "textContent").sort()).toEqual(["4", "50", "6"]);
    const dy = (text: string): number => parseFloat(must(must(findBy(labels, "textContent", text)).getAttribute("dy")));
    expect(dy("50")).toBeLessThan(0);
    expect(dy("4")).toBeGreaterThan(0);
    expect(dy("6")).toBeGreaterThan(0);
  });
});
