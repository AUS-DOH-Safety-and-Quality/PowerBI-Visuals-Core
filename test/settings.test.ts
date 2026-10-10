import { describe, expect, it } from "vitest";
import {
  createCanvasCard, createLabelsCard, createDefaultValues, defineCard,
  dropdownOption, fontStyleOption, numberOption, textOption, toggleOption, orderedBoundsError
} from "../src/settings/index";

describe("setting definitions", () => {
  it("preserves explicit unset defaults and zero bounds", () => {
    const schema = { data: defineCard({
      displayName: "Data", description: "Data", settingsGroups: {
        all: {
          limit: numberOption("Limit", "Description.", undefined, { min: 0, max: 0 }),
          enabled: toggleOption("Enabled", "Description.", false),
          title: textOption("Title", "Description.", "")
        }
      }
    }) };
    const values = createDefaultValues(schema);
    expect(Object.prototype.hasOwnProperty.call(schema.data.limit, "default")).toBe(true);
    expect(schema.data.limit.options).toEqual({ minValue: { value: 0 }, maxValue: { value: 0 } });
    expect(values).toEqual({ data: { limit: undefined, enabled: false, title: "" } });
    expect(Object.prototype.hasOwnProperty.call(values.data, "limit")).toBe(true);
    expect(Object.keys(schema)).toEqual(["data"]);
  });

  it("keeps grouped and flat descriptors aligned without enumerating flat access", () => {
    const definition = {
      displayName: "Data", description: "Data", settingsGroups: {
        First: { low: numberOption("Low", "Description.", 0) },
        Second: { high: numberOption("High", "Description.", undefined) }
      }
    };
    const card = defineCard(definition);
    expect(card.low).toBe(card.settingsGroups.First.low);
    expect(card.high).toBe(card.settingsGroups.Second.high);
    expect(Object.keys(card)).toEqual(["displayName", "description", "settingsGroups"]);
    expect(Object.prototype.hasOwnProperty.call(definition, "low")).toBe(false);
    expect(Object.keys(createDefaultValues({ data: card }).data)).toEqual(["low", "high"]);
  });

  it("creates independent values for every instance and card", () => {
    const schema = { first: createCanvasCard(), second: createCanvasCard() };
    const first = createDefaultValues(schema);
    const second = createDefaultValues(schema);
    first.first.lower_padding = 30;
    first.first.show_errors = false;
    expect(first.second.lower_padding).toBe(10);
    expect(second.first.lower_padding).toBe(10);
    expect(second.first.show_errors).toBe(true);
    expect(schema.first.lower_padding.default).toBe(10);
    expect(schema.first.show_errors.default).toBe(true);
  });

  it("gives each shared card its own descriptors and nested metadata", () => {
    const first = createLabelsCard();
    const second = createLabelsCard();
    first.label_position.items[0].displayName = "Changed";
    first.label_font.valid[0] = "Changed";
    first.label_line_width.options!.minValue!.value = -1;
    expect(second.label_position.items[0].displayName).toBe("Top");
    expect(second.label_font.valid[0]).toBe("'Arial', sans-serif");
    expect(second.label_line_width.options?.minValue?.value).toBe(0);
    expect(Object.keys(first.settingsGroups.all)).toHaveLength(17);
    expect(first.label_line_max_length.default).toBe(1000);
  });

  it("owns dropdown arrays and preserves supplied labels and transforms", () => {
    const values: ("first" | "second")[] = ["first", "second"];
    const first = dropdownOption("Order", "Description.", "first", values, "sentence");
    const second = dropdownOption("Order", "Description.", "second", values, "none", ["One", "Two"]);
    values[0] = "second";
    expect(first.valid).toEqual(["first", "second"]);
    expect(first.items).toEqual([
      { displayName: "First", value: "first" }, { displayName: "Second", value: "second" }
    ]);
    expect(second.items).toEqual([
      { displayName: "One", value: "first" }, { displayName: "Two", value: "second" }
    ]);
  });
});

it("offers a normal/italic font style dropdown", () => {
  expect(fontStyleOption("Style", "Description.")).toEqual({
    displayName: "Style",
    description: "Description.",
    type: "Dropdown",
    default: "normal",
    valid: ["normal", "italic"],
    items: [{ displayName: "Normal", value: "normal" }, { displayName: "Italic", value: "italic" }]
  });
});

describe("ordered bounds", () => {
  const axes = { x_axis: { xlimit_l: undefined, xlimit_u: undefined }, y_axis: { ylimit_l: undefined, ylimit_u: undefined } };
  const unset = { ll_truncate: undefined, ul_truncate: undefined };

  it("accepts unset and ordered bounds", () => {
    expect(orderedBoundsError(axes, unset)).toBeUndefined();
    expect(orderedBoundsError({ x_axis: { xlimit_l: 1, xlimit_u: 2 }, y_axis: { ylimit_l: 5, ylimit_u: undefined } },
      { ll_truncate: 0, ul_truncate: 1 })).toBeUndefined();
  });

  it.each([
    { truncation: { ll_truncate: 5, ul_truncate: 5 }, settings: axes, error: "ll_truncate (5) must be below ul_truncate (5)" },
    { truncation: unset, settings: { ...axes, x_axis: { xlimit_l: 6, xlimit_u: 5 } }, error: "xlimit_l (6) must be below xlimit_u (5)" },
    { truncation: unset, settings: { ...axes, y_axis: { ylimit_l: 6, ylimit_u: 5 } }, error: "ylimit_l (6) must be below ylimit_u (5)" }
  ])("rejects a lower bound not below its upper: $error", ({ truncation, settings, error }) => {
    expect(orderedBoundsError(settings, truncation)).toBe(error);
  });
});
