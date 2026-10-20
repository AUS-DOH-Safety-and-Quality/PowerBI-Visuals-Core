import { describe, expect, it } from "vitest";
import {
  createDefaultValues, createLineGroup, defineCard, limitLineNames, lowerLimitLines, standardLineKeys, lineSetting, lineStyle, lineOpacity,
  lineLabel
} from "../src/settings/index";
import { createValueFormatter } from "../src/data/index";

const lines = createDefaultValues({ lines: defineCard({ displayName: "Lines", description: "Lines", settingsGroups: {
  L99: createLineGroup("99", {
    showLabel: "Show",
    showDescription: "Draws the line.",
    showDefault: true,
    width: 2,
    type: "10 10",
    colour: "limits",
    rebaselines: true
  })
} }) }).lines;

describe("line settings", () => {
  it("maps the standard lines to their keys and reads suffixed settings", () => {
    expect(standardLineKeys).toEqual({
      ll99: "99",
      ll95: "95",
      ll68: "68",
      ul68: "68",
      ul95: "95",
      ul99: "99",
      target: "target",
      alt_target: "alt_target"
    });
    expect(limitLineNames).toEqual(["ll99", "ll95", "ll68", "ul68", "ul95", "ul99"]);
    expect(Array.from(lowerLimitLines)).toEqual(["ll99", "ll95", "ll68"]);
    expect(lineSetting<number>(lines, "plot_label_show_n", standardLineKeys.ul99)).toBe(1);
    expect(lineStyle(lines, "99")).toEqual({ colour: "#6495ED", width: 2, type: "10 10" });
    expect(lineOpacity(lines, "99", false)).toBe(1);
    expect(lineOpacity(lines, "99", true)).toBe(0.2);
  });

  it("builds a line label from the plot label settings", () => {
    const prefixed = { ...lines, plot_label_prefix_99: "UCL " };
    const label = lineLabel(prefixed, "99", { x: 10, y: 20, value: 1.234 }, false, createValueFormatter(1, ""));
    expect(label).toEqual({
      text: "UCL 1.2",
      x: 10,
      y: 20,
      position: "beside",
      lower: false,
      hpad: 10,
      vpad: 0,
      lineWidth: 2,
      size: 10,
      font: "'Arial', sans-serif",
      colour: "#000000"
    });
  });
});
