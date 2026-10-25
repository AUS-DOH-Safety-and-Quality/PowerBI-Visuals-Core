import at from "../util/at";
import { FormattingComponent, describeRange, groupDisplayName, type SettingCard, type SettingDefinition } from "./definitions";

function code(value: string): string {
  return "`" + value + "`";
}

function formatDefault(setting: SettingDefinition): string {
  const value = setting.default;
  if (value === undefined || value === "") {
    return "(blank)";
  }
  if (typeof value === "boolean") {
    return value ? "On" : "Off";
  }
  if (typeof value === "number") {
    return String(value);
  }
  const items = setting.items ?? [];
  for (let i = 0; i < items.length; i++) {
    const item = at(items, i);
    if (item.value === value) {
      return item.displayName;
    }
  }
  return code(value);
}

/** Display names, with the value conditional formatting expects where it differs; choices as bullet lines */
function formatValues(setting: SettingDefinition): string {
  switch (setting.type) {
    case FormattingComponent.Dropdown: {
      const items = setting.items ?? [];
      const values = new Array<string>(items.length);
      for (let i = 0; i < items.length; i++) {
        const item = at(items, i);
        values[i] = "• " + (item.displayName === item.value ? code(item.value) : item.displayName + " (" + code(item.value) + ")");
      }
      return values.join("<br>");
    }
    case FormattingComponent.AlignmentGroup: {
      const valid = setting.valid ?? [];
      const values = new Array<string>(valid.length);
      for (let i = 0; i < valid.length; i++) {
        values[i] = "• " + code(at(valid, i));
      }
      return values.join("<br>");
    }
    case FormattingComponent.NumUpDown:
      return describeRange(setting, setting.integer ? "Whole number" : "Number");
    case FormattingComponent.ColorPicker:
      return "Colour";
    case FormattingComponent.FontPicker:
      return "Font family";
    case FormattingComponent.TextInput:
      return "Text";
    case FormattingComponent.ToggleSwitch:
      return "On or Off";
  }
}

/** One Markdown table per format-pane group, keyed by card */
export default function settingsReference(schema: Record<string, SettingCard>): Record<string, string> {
  const pages: Record<string, string> = {};
  const cards = Object.entries(schema);
  for (let i = 0; i < cards.length; i++) {
    const [cardName, card] = at(cards, i);
    const groups = Object.entries(card.settingsGroups);
    let markdown = "<!-- Generated from the settings model; edit the setting definitions, not this file. -->\n";
    for (let j = 0; j < groups.length; j++) {
      const [groupName, settings] = at(groups, j);
      const definitions = Object.values(settings);
      markdown += "\n### " + groupDisplayName(card, groupName) + "\n\n"
        + "| Setting | Description | Default | Values |\n"
        + "| --- | --- | --- | --- |\n";
      for (let k = 0; k < definitions.length; k++) {
        const setting = at(definitions, k);
        markdown += "| " + setting.displayName + " | " + setting.description + " | " + formatDefault(setting)
          + " | " + formatValues(setting) + " |\n";
      }
    }
    pages[cardName] = markdown;
  }
  return pages;
}
