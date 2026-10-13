import { describe, expect, it } from "vitest";
import { groupCategoryRows, readSettingsGroups } from "../src/powerbi/index";
import { defineCard, numberOption, textOption } from "../src/settings/index";

describe("category grouping", () => {
  it("preserves first-seen groups and raw rows for interleaved tuples", () => {
    const groups = groupCategoryRows([{ values: ["A", "B", "A", "A"] }, { values: [1, 1, 1, 2] }], 4);
    expect(groups.rows).toEqual([[0, 2], [1], [3]]);
    expect(groups.names).toEqual([["A", "1"], ["B", "1"], ["A", "2"]]);
    expect(groups.labels).toEqual(["A / 1", "B / 1", "A / 2"]);
    const ungrouped = groupCategoryRows([], 3);
    expect(ungrouped.rows).toEqual([[0, 1, 2]]);
    expect(ungrouped.labels).toEqual([""]);
  });

  it("groups null with undefined but not with blank, and equal dates together", () => {
    const values = [null, undefined, "", new Date(0), new Date(0)];
    expect(groupCategoryRows([{ values }], values.length).rows).toEqual([[0, 1], [2], [3, 4]]);
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
    ] }, [[1], [0, 2]]);
    expect(result.values).toEqual([
      { data: { size: 8, title: "Default" } }, { data: { size: 4, title: "Default" } }
    ]);
    expect(result.validation.status).toBe(0);
    expect(result.validation.messages[2][0]).toContain("size");
    expect(result.messagePositionByRowIndex.get(2)).toBe(2);
    expect(result.values[1].data).not.toBe(result.values[0].data);
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

  it("keeps each group's rows' own values alongside the group's chosen ones", () => {
    const result = readSettingsGroups(schema, { objects: [
      { data: { size: 4 } }, { data: { title: "Other" } }, { data: { size: -1 } }
    ] }, [[1], [0, 2]]);
    expect(result.rowValues).toEqual([
      [{ data: { size: 2, title: "Other" } }],
      [{ data: { size: 4, title: "Default" } }, { data: { size: 2, title: "Default" } }]
    ]);
    expect(result.values[1].data.size).toBe(4);
  });

  it("shares the default row across groups and keeps one empty message list for clean rows", () => {
    const result = readSettingsGroups(schema, { objects: [{}, { data: { size: -1 } }, {}] }, [[0], [1, 2]]);
    expect(result.rowValues[1][1].data).toBe(result.rowValues[0][0].data);
    expect(result.values[1].data).toBe(result.rowValues[0][0].data);
    expect(result.rowValues[1][0].data).not.toBe(result.rowValues[0][0].data);
    expect(result.validation.messages[2]).toBe(result.validation.messages[0]);
    expect(result.validation.messages[1]).toHaveLength(1);
  });

  it("reports all-invalid selections", () => {
    expect(readSettingsGroups(schema, { objects: [{ data: { size: -1 } }] }, [[0]]).validation.status).toBe(1);
  });
});
