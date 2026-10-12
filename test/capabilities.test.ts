import { describe, expect, it } from "vitest";
import capabilitiesMismatches from "../src/testing/capabilities";
import { defineCard, toggleOption, colourOption, dropdownOption, numberOption, textOption, fontOption, fontSizeOption } from "../src/settings/index";

const model = {
  example: defineCard({
    displayName: "Example", description: "",
    settingsGroups: {
      all: {
        enabled: toggleOption("Enabled", "", true),
        colour: colourOption("Colour", "", "standard"),
        mode: dropdownOption("Mode", "", "first", ["first", "second"]),
        count: numberOption("Count", "", 1)
      },
      Text: {
        title: textOption("Title", "", ""),
        font: fontOption("Font", ""),
        size: fontSizeOption("Size", "")
      }
    }
  })
};

const objects = {
  example: { properties: {
    enabled: { type: { bool: true } },
    colour: { type: { fill: { solid: { color: true } } } },
    mode: { type: { enumeration: [] } },
    count: { type: { numeric: true } },
    title: { type: { text: true } },
    font: { type: { formatting: { fontFamily: true } } },
    size: { type: { formatting: { fontSize: true } } }
  } }
};

describe("capabilities mismatches", () => {
  it("accepts objects mirroring the model, plus named other objects", () => {
    expect(capabilitiesMismatches(model, objects)).toEqual([]);
    const storage = { properties: { state: { type: { text: true } } } };
    expect(capabilitiesMismatches(model, { ...objects, storage }, ["storage"])).toEqual([]);
    expect(capabilitiesMismatches(model, { ...objects, storage })).toEqual(["storage: not in the settings model"]);
    expect(capabilitiesMismatches(model, objects, ["storage"])).toEqual(["storage: no capabilities object"]);
  });

  it("names missing, extra and wrongly typed properties", () => {
    const { enabled, ...rest } = objects.example.properties;
    expect(capabilitiesMismatches(model, { example: { properties: {
      ...rest,
      count: { type: { bool: true } },
      mode: { type: { enumeration: ["first"] } },
      size: { type: { numeric: true } },
      stale: { type: { text: true } }
    } } })).toEqual([
      "example.enabled: missing",
      'example.mode: Dropdown declared as {"enumeration":["first"]}',
      'example.count: NumUpDown declared as {"bool":true}',
      "example.stale: not in the settings model"
    ]);
    expect(enabled.type.bool).toBe(true);
    expect(capabilitiesMismatches(model, {})).toEqual(["example: no capabilities object"]);
  });
});
