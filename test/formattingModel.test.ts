import { describe, expect, it } from "vitest";
import { buildFormattingModel } from "../src/powerbi/index";
import { defineCard, createDefaultValues, numberOption, toggleOption, dropdownOption, colourOption, textOption, fontOption, alignmentOption } from "../src/settings/index";

const schema = { example: defineCard({
  displayName: "Example card", description: "Example settings",
  settingsGroups: {
    all: {
      enabled: toggleOption("Enabled", true),
      colour: colourOption("Colour", "standard"),
      mode: dropdownOption("Mode", "first", ["first", "second"], "none", ["First choice", "Second choice"]),
      count: numberOption("Count", undefined, { min: 0, max: 10 })
    },
    Text: {
      title: textOption("Title", "Heading"),
      font: fontOption("Font"),
      alignment: alignmentOption("Alignment")
    }
  }
}) };

describe("formatting model", () => {
  it("preserves card/group/slice order, labels, UIDs and reset descriptors", () => {
    const model = buildFormattingModel(schema, createDefaultValues(schema));
    expect(model.cards).toHaveLength(1);
    const card = model.cards[0];
    expect(card).toMatchObject({ uid: "example_card_uid", displayName: "Example card", description: "Example settings" });
    expect(card.groups[0].displayName).toBe("Example card");
    expect(card.groups[0].uid).toBe("example_all_uid");
    expect(card.groups[1].displayName).toBe("Text");
    expect(card.groups[1].uid).toBe("example_Text_uid");
    const names = [["enabled", "colour", "mode", "count"], ["title", "font", "alignment"]];
    let position = 0;
    for (let i = 0; i < card.groups.length; i++) {
      const groupName = i === 0 ? "all" : "Text";
      for (let j = 0; j < names[i].length; j++) {
        const name = names[i][j];
        expect(card.groups[i].slices[j].uid).toBe("example_" + groupName + "_" + name + "_slice_uid");
        expect(card.revertToDefaultDescriptors[position++]).toEqual({ objectName: "example", propertyName: name });
      }
    }
    expect(card.revertToDefaultDescriptors).toHaveLength(7);
  });

  it("builds every control from its descriptor with wildcard/rule and optional-value contracts", () => {
    const values = createDefaultValues(schema);
    values.example.mode = "second";
    values.example.enabled = false;
    values.example.title = "";
    const card = buildFormattingModel(schema, values).cards[0];
    const all = card.groups[0].slices;
    expect(all[0].control).toEqual({ type: "ToggleSwitch", properties: {
      descriptor: {
        objectName: "example",
        propertyName: "enabled",
        selector: { data: [{ dataViewWildcard: { matchingOption: 0 } }] }
      },
      value: false
    } });
    expect(all[1].control).toMatchObject({ type: "ColorPicker", properties: { value: { value: "#000000" } } });
    expect(all[2].control).toMatchObject({ type: "Dropdown", properties: {
      value: { displayName: "Second choice", value: "second" },
      items: [{ displayName: "First choice", value: "first" }, { displayName: "Second choice", value: "second" }]
    } });
    expect(all[3].control).toMatchObject({ type: "NumUpDown", properties: {
      value: undefined, options: { minValue: { value: 0 }, maxValue: { value: 10 } }
    } });
    expect(Object.prototype.hasOwnProperty.call(all[3].control.properties, "value")).toBe(true);
    const text = card.groups[1].slices;
    expect(text[0].control).toMatchObject({ type: "TextInput", properties: { value: "" } });
    expect(text[1].control).toMatchObject({ type: "FontPicker", properties: { value: "'Arial', sans-serif" } });
    expect(text[2].control).toMatchObject({ type: "AlignmentGroup", properties: { value: "center" } });
    for (let i = 0; i < card.groups.length; i++) {
      const slices = card.groups[i].slices;
      for (let j = 0; j < slices.length; j++) {
        const control = slices[j].control;
        expect(control.properties.descriptor.selector).toEqual({ data: [{ dataViewWildcard: { matchingOption: 0 } }] });
        if (control.type !== "ToggleSwitch") {
          expect(control.properties.descriptor.instanceKind).toBe(3);
        }
      }
    }
    expect(values.example.count).toBeUndefined();
  });

  it("creates fresh pane structure without mutating settings or descriptors", () => {
    const values = createDefaultValues(schema);
    const first = buildFormattingModel(schema, values);
    const second = buildFormattingModel(schema, values);
    first.cards[0].displayName = "Edited";
    first.cards[0].groups[0].slices[0].control.properties.value = false;
    first.cards[0].revertToDefaultDescriptors[0].propertyName = "edited";
    expect(second.cards[0].displayName).toBe("Example card");
    expect(second.cards[0].groups[0].slices[0].control.properties.value).toBe(true);
    expect(second.cards[0].revertToDefaultDescriptors[0].propertyName).toBe("enabled");
    expect(values.example.enabled).toBe(true);
    expect(schema.example.enabled.default).toBe(true);
  });
});
