import { describe, expect, it } from "vitest";
import { createDefaultValues, createLineGroup, defineCard, valueTooltipOptions } from "../src/settings/index";
import { createValueFormatter } from "../src/data/index";
import { valueTooltips, limitTooltips, appendPatternTooltips, rowWarnings } from "../src/powerbi/index";

const format = createValueFormatter(2, 0, "%");
const lines = createDefaultValues({ lines: defineCard({ displayName: "Lines", description: "Lines", settingsGroups: {
  Target: createLineGroup("target", { showLabel: "Show", showDefault: true, width: 1, type: "10 0", colour: "standard", rebaselines: false, tooltipLabel: "Centerline" }),
  Alt: createLineGroup("alt_target", { showLabel: "Show", showDefault: false, width: 1, type: "10 0", colour: "standard", rebaselines: false, tooltipLabel: "Alt. Target" }),
  L68: createLineGroup("68", { showLabel: "Show", showDefault: false, width: 1, type: "2 5", colour: "limits", rebaselines: false, tooltipLabel: "68% Limit", tooltipPrefixes: true }),
  L95: createLineGroup("95", { showLabel: "Show", showDefault: true, width: 1, type: "2 5", colour: "limits", rebaselines: false, tooltipLabel: "95% Limit", tooltipPrefixes: true }),
  L99: createLineGroup("99", { showLabel: "Show", showDefault: true, width: 1, type: "10 10", colour: "limits", rebaselines: false, tooltipLabel: "99% Limit", tooltipPrefixes: true })
} }) }).lines;
const row = { ll99: 1, ll95: 2, ll68: 3, ul68: 7, ul95: 8, ul99: 9, target: 5, alt_target: undefined };

describe("tooltip helpers", () => {
  it("shows the value, numerator and denominator with the automatic label resolved", () => {
    const settings = createDefaultValues({ data: defineCard({ displayName: "D", description: "D", settingsGroups: { all: valueTooltipOptions() } }) }).data;
    expect(valueTooltips(settings, { value: 0.5, numerator: 5, denominator: 10 }, "Proportion", format)).toEqual([
      { displayName: "Proportion", value: "0.50%" }, { displayName: "Numerator", value: "5" }, { displayName: "Denominator", value: "10" }
    ]);
    expect(valueTooltips({ ...settings, ttip_label_value: "Rate", ttip_show_denominator: false }, { value: 1, numerator: undefined, denominator: 2 }, "P", format))
      .toEqual([{ displayName: "Rate", value: "1.00%" }]);
  });

  it("lists upper limits in, the targets, then lower limits out, skipping hidden lines and absent alt targets", () => {
    expect(limitTooltips(lines, row, format, true).map(item => `${item.displayName}=${item.value}`)).toEqual([
      "Upper 99% Limit=9.00%", "Upper 95% Limit=8.00%", "Centerline=5.00%", "Lower 95% Limit=2.00%", "Lower 99% Limit=1.00%"
    ]);
    expect(limitTooltips({ ...lines, show_alt_target: true }, { ...row, alt_target: 6 }, format, false).map(item => item.displayName))
      .toEqual(["Centerline", "Alt. Target"]);
  });

  it("appends the patterns as one item before the custom columns", () => {
    const tooltip = [{ displayName: "A", value: "1" }];
    appendPatternTooltips(tooltip, [], undefined);
    expect(tooltip).toHaveLength(1);
    appendPatternTooltips(tooltip, ["Trend", "Shift"], [{ displayName: "Extra", value: "x" }]);
    expect(tooltip.slice(1)).toEqual([{ displayName: "Pattern(s)", value: "Trend\nShift" }, { displayName: "Extra", value: "x" }]);
  });

  it("reports dropped rows and ignored conditional formatting in row order", () => {
    const settings = { messages: [["bad colour"], []], messagePositionByRowIndex: new Map([[4, 0], [6, 1]]) };
    expect(rowWarnings("Date", [4, 5, 6], ["A", "B", "C"], ["", "Numerator missing", ""], settings)).toEqual([
      "Conditional formatting for Date A ignored due to: bad colour.", "Date B removed due to: Numerator missing."
    ]);
  });
});
