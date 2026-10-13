import { describe, expect, it } from "vitest";
import { deriveScaling, keptValues } from "../src/data/index";
import { readNumbers, readSettingsGroups } from "../src/powerbi/index";
import { defineCard, numberOption } from "../src/settings/index";

describe("derived scaling", () => {
  const settings = { multiplier: 1, sig_figs: 2, perc_labels: "Automatic" };

  it("scales automatic proportions to percentages and formats counts without decimals", () => {
    const derived = deriveScaling(settings, { proportion: true, wholeCounts: true, percentAllowed: true });
    expect(derived.multiplier).toBe(100);
    expect(derived.percentLabels).toBe(true);
    expect(derived.formatValue(12.345, "value")).toBe("12.35%");
    expect(derived.formatValue(12.345, "integer")).toBe("12");
  });

  it("keeps the multiplier but drops the percent sign where percent labels are not allowed", () => {
    const derived = deriveScaling(settings, { proportion: true, wholeCounts: false, percentAllowed: false });
    expect(derived.multiplier).toBe(100);
    expect(derived.percentLabels).toBe(false);
    expect(derived.formatValue(12.345, "value")).toBe("12.35");
    expect(derived.formatValue(12.345, "integer")).toBe("12.35");
  });
});

describe("kept rows", () => {
  it("reads the selected cells as numbers, with blank cells and empty strings missing", () => {
    expect(readNumbers({ values: [2.5, null, "0", 4, undefined, ""] }, [0, 1, 2, 4, 5])).toEqual([2.5, undefined, 0, undefined, undefined]);
  });

  it("compacts the kept positions' values and rejects a kept missing value", () => {
    const numbers = [1, undefined, 3, 5];
    expect(keptValues(numbers, [0, 2, 3])).toEqual([1, 3, 5]);
    expect(() => keptValues(numbers, [1])).toThrow("missing value");
  });
});

describe("settings group rules", () => {
  const schema = { card: defineCard({ displayName: "Card", description: "Card", settingsGroups: {
    all: { lower: numberOption("Lower", "Lower.", 0) }
  } }) };

  it("reports a row-level error ahead of any group rule", () => {
    const invalid = { objects: [{ card: { lower: "x" } }] };
    expect(readSettingsGroups(schema, invalid, [[0]], [() => "rule"]).validation).toMatchObject({ status: 1, error: "x is not a valid number for lower" });
  });
});
