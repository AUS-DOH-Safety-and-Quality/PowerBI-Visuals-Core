import { describe, expect, it } from "vitest";
import { buildFormattingModel, groupCategoryRows, readSettingsGroups } from "../src/powerbi/index";
import { defineCard, dropdownOption, numberOption, textOption } from "../src/settings/index";

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

  // Funnels saves a group's key in the report, so its format must not change
  it("keeps the saved key format and names dates by their local calendar date", () => {
    const midnight = new Date(2020, 0, 1);
    const morning = new Date(2020, 0, 1, 9, 30);
    const groups = groupCategoryRows([{ values: ["A", 1, null, midnight, morning] }], 5);
    expect(groups.keys).toEqual([
      '[["string","A"]]', '[["number","1"]]', '[["undefined",""]]',
      `[["date","${midnight.getTime()}"]]`, `[["date","${morning.getTime()}"]]`
    ]);
    expect(groups.names).toEqual([["A"], ["1"], [""], ["2020-01-01"], ["2020-01-01 09:30:00"]]);
  });
});

describe("grouped settings", () => {
  const schema = { data: defineCard({ displayName: "Data", description: "", settingsGroups: { all: {
    size: numberOption("Size", "Description.", 2, { min: 0 }), title: textOption("Title", "Description.", "Default")
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

  it("takes each group's first valid row for a card, warning about the invalid ones", () => {
    const result = readSettingsGroups(schema, { objects: [
      { data: { size: -1, title: "First" } }, { data: { size: 8, title: "Second" } }
    ] }, [[0, 1]]);
    expect(result.values).toEqual([{ data: { size: 8, title: "Second" } }]);
    expect(result.validation.status).toBe(0);
    expect(result.validation.messages[0]).toHaveLength(1);
    expect(result.validation.messages[1]).toEqual([]);
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
    group: { ...dropdownOption("Group", "Description.", "B", ["A", "B"]), constant: true }
  } } }) };
  const control = buildFormattingModel(schema, { misc: { group: "B" } }).cards[0].groups[0].slices[0].control;
  expect(control.properties.descriptor).toEqual({ objectName: "misc", propertyName: "group" });
  expect(control.properties.value).toEqual({ displayName: "B", value: "B" });
  expect(control.properties.items).toHaveLength(2);
});
