import { describe, expect, it } from "vitest";
import { createDefaultValues, createLabelsCard, defineCard, dotOptions } from "../src/settings/index";
import { readNumbers } from "../src/powerbi/columns";
import extractRows from "../src/powerbi/extractRows";
import validateRows from "../src/data/validateRows";
import { missingRule, quantity } from "../src/data/inputRules";
import buildDataView from "../src/testing/buildDataView";
import validatedView from "../src/testing/validatedView";

const cards = {
  scatter: defineCard({ displayName: "Scatter", description: "", settingsGroups: { all: dotOptions() } }),
  labels: createLabelsCard()
};
const defaults = createDefaultValues(cards);
const settings = { messages: [["bad size"]], messagePositionByRowIndex: new Map([[2, 0]]) };

function extract(numerators: (number | null)[]) {
  const view = validatedView(buildDataView({
    categories: [
      { role: "key", values: ["A", "B", "C"], displayName: "Category" },
      { role: "indicator", values: ["X", "X", "X"] }
    ],
    values: [{ role: "numerators", values: numerators }]
  }, [{}, {}, { scatter: { size: 9 } }]), ["numerators"]);
  const rows = [0, 1, 2];
  const values = readNumbers(view.values.numerators[0], rows);
  return extractRows(view, rows, {
    keys: ["A", "B", "C"], validation: validateRows(3, [missingRule(values, quantity.numerator)]), cards, defaults, settings
  });
}

describe("row extraction", () => {
  it("keeps the valid rows' annotations and explains the dropped rows and ignored formatting", () => {
    const result = extract([1, null, 3]);
    if (result.status !== "valid") {
      throw new Error(result.error);
    }
    expect(result.data.kept).toEqual([0, 2]);
    expect(result.data.warnings).toEqual([
      "Category B removed due to: Numerator missing.",
      "Conditional formatting for Category C ignored due to: bad size."
    ]);
    expect(result.data.identityColumns.map(column => column.source.displayName)).toEqual(["Category", "indicator"]);
    expect(result.data.validationStatus).toEqual({ status: 0, messages: ["", "Numerator missing", ""] });
    expect(result.data.scatter_formatting).toHaveLength(2);
    expect(result.data.scatter_formatting[1].size).toBe(9);
  });

  it("rejects the group with the validation error when every row fails", () => {
    expect(extract([null, null, null])).toEqual({ status: "invalid", error: "All numerators are missing or null!" });
  });
});
