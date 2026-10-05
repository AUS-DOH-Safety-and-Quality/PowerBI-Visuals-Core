import { describe, expect, it } from "vitest";
import { buildFormattingModel, groupCategoryRows, readSettingsGroups } from "../src/powerbi/index.js";
import { defineCard, dropdownOption, numberOption, textOption } from "../src/settings/index.js";

describe("category grouping", () => {
  it("preserves first-seen groups and raw rows for interleaved tuples", () => {
    const groups = groupCategoryRows([{ values: ["A", "B", "A", "A"] }, { values: [1, 1, 1, 2] }], 4);
    expect(groups.rows).toEqual([[0, 2], [1], [3]]);
    expect(groups.names).toEqual([["A", "1"], ["B", "1"], ["A", "2"]]);
    expect(groupCategoryRows([], 3).rows).toEqual([[0, 1, 2]]);
    expect(groupCategoryRows([], 0).rows).toEqual([]);
  });

  it("separates typed values and ambiguous delimiters, normalising missing cells and dates", () => {
    const values = [1, "1", false, "false", null, undefined, new Date(0), new Date(0)];
    expect(groupCategoryRows([{ values }], values.length).rows).toEqual([[0], [1], [2], [3], [4, 5], [6, 7]]);
    expect(groupCategoryRows([{ values: ["A\u0001B", "A"] }, { values: ["C", "B\u0001C"] }], 2).rows)
      .toEqual([[0], [1]]);
  });
});

describe("grouped settings", () => {
  const schema = { data: defineCard({ displayName: "Data", description: "", settingsGroups: { all: {
    size: numberOption("Size", 2, { min: 0 }), title: textOption("Title", "Default")
  } } }) };

  it("reads each group's first row and aligns warnings to flattened raw positions", () => {
    const result = readSettingsGroups(schema, { objects: [
      { data: { size: 4 } }, { data: { size: 8 } }, { data: { size: -1 } }
    ] }, [[1], [0, 2], []]);
    expect(result.values).toEqual([
      { data: { size: 8, title: "Default" } }, { data: { size: 4, title: "Default" } },
      { data: { size: 2, title: "Default" } }
    ]);
    expect(result.validation.status).toBe(0);
    expect(result.validation.messages[2][0]).toContain("size");
    expect(result.messagePositionByRowIndex.get(2)).toBe(2);
    result.values[0].data.size = 9;
    expect(result.values[1].data.size).toBe(4);
  });

  it("reports all-invalid selections and owns fresh empty-group defaults", () => {
    expect(readSettingsGroups(schema, { objects: [{ data: { size: -1 } }] }, [[0]]).validation.status).toBe(1);
    const result = readSettingsGroups(schema, {}, [[], []]);
    result.values[0].data.size = 7;
    expect(result.values[1].data.size).toBe(2);
    expect(readSettingsGroups(schema, {}, []).values).toEqual([]);
  });
});

it("builds a constant dropdown with runtime choices and no row selector", () => {
  const schema = { misc: defineCard({ displayName: "MISC", description: "", settingsGroups: { all: {
    group: { ...dropdownOption("Group", "B", ["A", "B"]), constant: true }
  } } }) };
  const control = buildFormattingModel(schema, { misc: { group: "B" } }).cards[0].groups[0].slices[0].control;
  expect(control.properties.descriptor).toEqual({ objectName: "misc", propertyName: "group" });
  expect(control.properties.value).toEqual({ displayName: "B", value: "B" });
  expect(control.properties.items).toHaveLength(2);
});
