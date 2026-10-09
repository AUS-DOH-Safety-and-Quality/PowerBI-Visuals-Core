import { describe, expect, it } from "vitest";
import { createDefaultValues, createLineGroup, defineCard, valueTooltipOptions } from "../src/settings/index";
import { createValueFormatter } from "../src/data/index";
import { valueTooltips, limitTooltips, appendPatternTooltips, rowWarnings } from "../src/powerbi/index";
import { pluck } from "./browserHelpers";

const format = createValueFormatter(2, 0, "%");
const targetLine = {
  showLabel: "Show",
  width: 1,
  type: "10 0",
  colour: "standard",
  rebaselines: false
} as const;
const limitLine = {
  showLabel: "Show",
  width: 1,
  colour: "limits",
  rebaselines: false,
  tooltipPrefixes: true
} as const;
const lines = createDefaultValues({ lines: defineCard({ displayName: "Lines", description: "Lines", settingsGroups: {
  Target: createLineGroup("target", { ...targetLine, showDefault: true, tooltipLabel: "Centerline" }),
  Alt: createLineGroup("alt_target", { ...targetLine, showDefault: false, tooltipLabel: "Alt. Target" }),
  L68: createLineGroup("68", { ...limitLine, showDefault: false, type: "2 5", tooltipLabel: "68% Limit" }),
  L95: createLineGroup("95", { ...limitLine, showDefault: true, type: "2 5", tooltipLabel: "95% Limit" }),
  L99: createLineGroup("99", { ...limitLine, showDefault: true, type: "10 10", tooltipLabel: "99% Limit" })
} }) }).lines;
const row = {
  ll99: 1,
  ll95: 2,
  ll68: 3,
  ul68: 7,
  ul95: 8,
  ul99: 9,
  target: 5,
  alt_target: undefined
};

describe("tooltip helpers", () => {
  it("shows the value, numerator and denominator with the automatic label resolved", () => {
    const settings = createDefaultValues({ data: defineCard({
      displayName: "D",
      description: "D",
      settingsGroups: { all: valueTooltipOptions() }
    }) }).data;
    expect(valueTooltips(settings, { value: 0.5, numerator: 5, denominator: 10 }, "Proportion", format)).toEqual([
      { displayName: "Proportion", value: "0.50%" },
      { displayName: "Numerator", value: "5" },
      { displayName: "Denominator", value: "10" }
    ]);
    const relabelled = { ...settings, ttip_label_value: "Rate", ttip_show_denominator: false };
    expect(valueTooltips(relabelled, { value: 1, numerator: undefined, denominator: 2 }, "P", format))
      .toEqual([{ displayName: "Rate", value: "1.00%" }]);
  });

  it("lists upper limits in, the targets, then lower limits out, skipping hidden lines and absent alt targets", () => {
    const limits = limitTooltips(lines, row, format, true);
    expect(pluck(limits, "displayName")).toEqual([
      "Upper 99% Limit", "Upper 95% Limit", "Centerline", "Lower 95% Limit", "Lower 99% Limit"
    ]);
    expect(pluck(limits, "value")).toEqual(["9.00%", "8.00%", "5.00%", "2.00%", "1.00%"]);
    const targets = limitTooltips({ ...lines, show_alt_target: true }, { ...row, alt_target: 6 }, format, false);
    expect(pluck(targets, "displayName")).toEqual(["Centerline", "Alt. Target"]);
  });

  it("appends the patterns as one item before the custom columns", () => {
    const tooltip = [{ displayName: "A", value: "1" }];
    appendPatternTooltips(tooltip, [], []);
    expect(tooltip).toHaveLength(1);
    appendPatternTooltips(tooltip, ["Trend", "Shift"], [{ displayName: "Extra", value: "x" }]);
    expect(tooltip.slice(1)).toEqual([
      { displayName: "Pattern(s)", value: "Trend\nShift" },
      { displayName: "Extra", value: "x" }
    ]);
  });

  it("reports dropped rows and ignored conditional formatting in row order", () => {
    const settings = { messages: [["bad colour"], []], messagePositionByRowIndex: new Map([[4, 0], [6, 1]]) };
    expect(rowWarnings("Date", [4, 5, 6], ["A", "B", "C"], ["", "Numerator missing", ""], settings)).toEqual([
      "Conditional formatting for Date A ignored due to: bad colour.", "Date B removed due to: Numerator missing."
    ]);
  });
});
