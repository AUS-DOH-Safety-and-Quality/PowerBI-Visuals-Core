import { describe, expect, it } from "vitest";
import {
  defineCard, settingsReference, toggleOption, colourOption, dropdownOption, numberOption, textOption, fontOption, alignmentOption
} from "../src/settings/index";

describe("settings reference", () => {
  it("renders each group as a table of defaults and accepted values", () => {
    const pages = settingsReference({
      example: defineCard({
        displayName: "Example card", description: "Example settings",
        settingsGroups: {
          all: {
            enabled: toggleOption("Enabled", "Turns it on.", true),
            colour: colourOption("Colour", "Fill colour.", "standard"),
            mode: dropdownOption("Mode", "Picks a mode.", "second", ["first", "second"], "none", ["First choice", "second"]),
            count: numberOption("Count", "How many.", undefined, { min: 0, max: 10, integer: true })
          },
          Text: {
            title: textOption("Title", "Heading text.", "Heading"),
            font: fontOption("Font", "Heading font."),
            alignment: alignmentOption("Alignment", "Heading alignment."),
            offset: numberOption("Offset", "Shift.", 0.5, { min: 0 }),
            angle: numberOption("Angle", "Tilt.", -5, { max: 0 }),
            scale: numberOption("Scale", "Size.", 1)
          }
        }
      })
    });
    expect(Object.keys(pages)).toEqual(["example"]);
    expect(pages.example).toBe(
      "<!-- Generated from the settings model; edit the setting definitions, not this file. -->\n"
      + "\n### Example card\n\n"
      + "| Setting | Description | Default | Values |\n"
      + "| --- | --- | --- | --- |\n"
      + "| Enabled | Turns it on. | On | On or Off |\n"
      + "| Colour | Fill colour. | `#000000` | Colour |\n"
      + "| Mode | Picks a mode. | second | First choice (`first`)<br>`second` |\n"
      + "| Count | How many. | (blank) | Whole number from 0 to 10 |\n"
      + "\n### Text\n\n"
      + "| Setting | Description | Default | Values |\n"
      + "| --- | --- | --- | --- |\n"
      + "| Title | Heading text. | `Heading` | Text |\n"
      + "| Font | Heading font. | `'Arial', sans-serif` | Font family |\n"
      + "| Alignment | Heading alignment. | `center` | `center`<br>`left`<br>`right` |\n"
      + "| Offset | Shift. | 0.5 | Number, at least 0 |\n"
      + "| Angle | Tilt. | -5 | Number, at most 0 |\n"
      + "| Scale | Size. | 1 | Number |\n"
    );
  });

  it("leaves empty text defaults blank and names off toggles", () => {
    const pages = settingsReference({
      example: defineCard({
        displayName: "Example", description: "",
        settingsGroups: { all: {
          label: textOption("Label", "Caption.", ""),
          off: toggleOption("Off", "Starts off.", false)
        } }
      })
    });
    expect(pages.example).toContain("| Label | Caption. | (blank) | Text |\n| Off | Starts off. | Off | On or Off |\n");
  });
});
