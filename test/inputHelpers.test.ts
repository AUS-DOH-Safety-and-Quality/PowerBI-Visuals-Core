import { describe, expect, it } from "vitest";
import { deriveScaling, keptPositions, keptValues } from "../src/data/index";
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
  it("reads numbers with blanks, keeps the unrejected positions and compacts their values", () => {
    const numbers = readNumbers({ values: [1, null, 3, undefined, 5] }, [0, 1, 2, 4]);
    expect(numbers).toEqual([1, undefined, 3, 5]);
    const kept = keptPositions(["", "Numerator missing", "", ""]);
    expect(kept).toEqual([0, 2, 3]);
    expect(keptValues(numbers, kept)).toEqual([1, 3, 5]);
  });
});

describe("settings group rules", () => {
  const schema = { card: defineCard({ displayName: "Card", description: "Card", settingsGroups: {
    all: { lower: numberOption("Lower", "Lower.", 0), upper: numberOption("Upper", "Upper.", 10) }
  } }) };
  const ordered = (values: { card: { lower: number; upper: number } }, group: number) =>
    values.card.lower < values.card.upper ? undefined : `group ${group} inverted`;

  it("reports the first failing group's rule after any row-level error", () => {
    const category = { objects: [{ card: { lower: 5 } }, { card: { lower: 20 } }, { card: { upper: 1 } }] };
    expect(readSettingsGroups(schema, category, [[0], [1], [2]], [ordered]).validation).toMatchObject({ status: 1, error: "group 1 inverted" });
    expect(readSettingsGroups(schema, category, [[0]], [ordered]).validation.status).toBe(0);
    const invalid = { objects: [{ card: { lower: "x" } }] };
    expect(readSettingsGroups(schema, invalid, [[0]], [() => "rule"]).validation).toMatchObject({ status: 1, error: expect.stringContaining("lower") });
  });
});
