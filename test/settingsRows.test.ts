import { describe, expect, it } from "vitest";
import { readSettingsRows } from "../src/powerbi/index";
import { defineCard, createDefaultValues, numberOption, toggleOption, dropdownOption, colourOption, textOption, fontOption, alignmentOption } from "../src/settings/index";

const card = defineCard({
  displayName: "Example", description: "Example settings",
  settingsGroups: {
    all: {
      count: numberOption("Count", "Description.", 2, { min: 0, max: 10 }),
      optional: numberOption("Optional", "Description.", undefined, { min: 0, max: 10 }),
      enabled: toggleOption("Enabled", "Description.", true),
      mode: dropdownOption("Mode", "Description.", "first", ["first", "second"]),
      colour: colourOption("Colour", "Description.", "standard"),
      title: textOption("Title", "Description.", "Heading"),
      font: fontOption("Font", "Description."),
      alignment: alignmentOption("Alignment", "Description.")
    }
  }
});
const defaults = createDefaultValues({ example: card }).example;

describe("settings row contracts", () => {
  it("preserves selected order, duplicate rows and independent values/messages", () => {
    const category = { objects: [
      {}, { example: { count: 0, enabled: false } }, {}, {},
      { example: { count: 7, optional: -1, mode: "second" } }
    ] };
    const rows = readSettingsRows(card, "example", defaults, category, [4, 1, 4, 3]);
    expect(rows.values).toHaveLength(4);
    expect(rows.validation.messages).toHaveLength(4);
    expect(rows.values[0]).toMatchObject({ count: 7, optional: undefined, mode: "second" });
    expect(rows.values[1]).toMatchObject({ count: 0, enabled: false });
    expect(rows.values[2]).toEqual(rows.values[0]);
    expect(rows.values[3]).toEqual(defaults);
    expect(rows.validation.messages).toEqual([
      ["-1 is not a valid value for optional. Valid values are between 0 and 10"], [],
      ["-1 is not a valid value for optional. Valid values are between 0 and 10"], []
    ]);
    expect(rows.validation.status).toBe(0);
    rows.values[0].count = 9;
    rows.validation.messages[0].push("local");
    expect(rows.values[2].count).toBe(7);
    expect(rows.validation.messages[2]).toHaveLength(1);
    expect(defaults.count).toBe(2);
    expect(category.objects[4]).toEqual({ example: { count: 7, optional: -1, mode: "second" } });
  });

  it("reports all-invalid status using only selected rows and their first warning", () => {
    const category = { objects: [
      { example: { count: 0 } }, {}, { example: { mode: "invalid" } }, {},
      { example: { optional: -1 } }
    ] };
    const result = readSettingsRows(card, "example", defaults, category, [4, 2]);
    expect(result.validation.status).toBe(1);
    expect(result.validation.error).toBe("-1 is not a valid value for optional. Valid values are between 0 and 10");
    expect(result.validation.messages).toHaveLength(2);
    expect(result.values[0].optional).toBeUndefined();
    expect(result.values[1].mode).toBe("first");
  });

  it("returns empty arrays and success for no selected rows", () => {
    expect(readSettingsRows(card, "example", defaults, {}, [])).toEqual({
      values: [], validation: { status: 0, messages: [] }
    });
  });

  it("uses named defaults for missing row objects and normalizes null/eraser values", () => {
    const result = readSettingsRows(card, "example", defaults, { objects: [
      { example: {
        count: null,
        optional: "",
        enabled: undefined,
        mode: "",
        colour: { solid: { color: "#123456" } }
      } }
    ] }, [0, 1]);
    expect(result.values[0]).toEqual({ ...defaults, colour: "#123456" });
    expect(result.values[1]).toEqual(defaults);
    expect(Object.prototype.hasOwnProperty.call(result.values[1], "optional")).toBe(true);
    expect(result.validation).toEqual({ status: 0, messages: [[], []] });
  });

  it.each([-1, 11, NaN, Infinity, -Infinity, "4", true])("rejects supplied invalid numeric controls: %s", value => {
    const result = readSettingsRows(card, "example", defaults, {
      objects: [{ example: { count: value, optional: value } }]
    }, [0]);
    expect(result.values[0].count).toBe(2);
    expect(result.values[0].optional).toBeUndefined();
    expect(result.validation.status).toBe(1);
    expect(result.validation.messages[0]).toHaveLength(2);
  });

  it("honours both zero bounds and allows unset optional numbers", () => {
    const bounded = defineCard({ displayName: "Bounds", description: "", settingsGroups: { all: {
      value: numberOption("Value", "Description.", undefined, { min: 0, max: 0 })
    } } });
    const base = createDefaultValues({ bounded }).bounded;
    const result = readSettingsRows(bounded, "bounded", base, {
      objects: [{ bounded: { value: 0 } }, { bounded: { value: 1 } }, { bounded: { value: -1 } }, {}]
    }, [0, 1, 2, 3]);
    expect(result.values).toEqual([{ value: 0 }, { value: undefined }, { value: undefined }, { value: undefined }]);
    expect(result.validation.messages[0]).toEqual([]);
    expect(result.validation.messages[1]).toHaveLength(1);
    expect(result.validation.messages[2]).toHaveLength(1);
    expect(result.validation.messages[3]).toEqual([]);
  });

  it("validates primitive control types, fonts and alignment from descriptors", () => {
    const result = readSettingsRows(card, "example", defaults, {
      objects: [{ example: { enabled: "false", title: 4, font: "invalid", alignment: "invalid" } }]
    }, [0]);
    expect(result.values[0]).toEqual(defaults);
    expect(result.validation.messages[0]).toHaveLength(4);
    expect(result.validation.status).toBe(1);
  });
});

it("keeps explicit blank text while missing and null text use the non-blank default", () => {
  const result = readSettingsRows(card, "example", defaults, { objects: [
    { example: { title: "" } }, { example: { title: undefined } },
    { example: { title: null } }, {}, { example: { title: "  " } }
  ] }, [0, 1, 2, 3, 4]);
  expect(result.values[0].title).toBe("");
  expect(result.values[1].title).toBe("Heading");
  expect(result.values[2].title).toBe("Heading");
  expect(result.values[3].title).toBe("Heading");
  expect(result.values[4].title).toBe("  ");
  expect(result.validation).toEqual({ status: 0, messages: [[], [], [], [], []] });
  expect(defaults.title).toBe("Heading");
});

it("keeps text blank while resetting erased non-text controls", () => {
  const result = readSettingsRows(card, "example", defaults, { objects: [{ example: {
    count: "",
    optional: "",
    enabled: "",
    mode: "",
    colour: "",
    title: "",
    font: "",
    alignment: ""
  } }] }, [0]);
  expect(result.values[0]).toEqual({ ...defaults, title: "" });
  expect(result.validation).toEqual({ status: 0, messages: [[]] });
});

it("gives rows without card objects independent copies of the shared defaults", () => {
  const result = readSettingsRows(card, "example", defaults, {
    objects: [{}, undefined, { other: { count: 1 } }]
  }, [0, 1, 2, 0]);
  expect(result.values).toEqual([defaults, defaults, defaults, defaults]);
  expect(result.validation).toEqual({ status: 0, messages: [[], [], [], []] });
  result.values[0].count = 9;
  result.validation.messages[0].push("local");
  expect(result.values[1].count).toBe(2);
  expect(result.values[3].count).toBe(2);
  expect(result.validation.messages[1]).toEqual([]);
  expect(defaults.count).toBe(2);
});
