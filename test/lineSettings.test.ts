import { describe, expect, it } from "vitest";
import { createDefaultValues, createLineGroup, defineCard, limitLineKeys, lineSetting, lineStyle, lineOpacity, lineLabel } from "../src/settings/index";
import { createValueFormatter } from "../src/data/index";

const lines = createDefaultValues({ lines: defineCard({ displayName: "Lines", description: "Lines", settingsGroups: {
  L99: createLineGroup("99", { showLabel: "Show", showDefault: true, width: 2, type: "10 10", colour: "limits", rebaselines: true })
} }) }).lines;

describe("line settings", () => {
  it("maps limit lines to their keys and reads suffixed settings", () => {
    expect(limitLineKeys).toEqual({ ll99: "99", ll95: "95", ll68: "68", ul68: "68", ul95: "95", ul99: "99" });
    expect(lineSetting<number>(lines, "plot_label_show_n", limitLineKeys.ul99)).toBe(1);
    expect(lineStyle(lines, "99")).toEqual({ colour: "#6495ED", width: 2, type: "10 10" });
    expect(lineOpacity(lines, "99", false)).toBe(1);
    expect(lineOpacity(lines, "99", true)).toBe(0.2);
  });

  it("builds a line label from the plot label settings", () => {
    const label = lineLabel({ ...lines, plot_label_prefix_99: "UCL " }, "99", { x: 10, y: 20, value: 1.234 }, false, createValueFormatter(1, 0, ""));
    expect(label).toEqual({
      text: "UCL 1.2", x: 10, y: 20, position: "beside", lower: false, hpad: 10, vpad: 0, lineWidth: 2, size: 10,
      font: "'Arial', sans-serif", colour: "#000000"
    });
  });
});
