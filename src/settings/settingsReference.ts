import { FormattingComponent, groupDisplayName, type SettingCard, type SettingDefinition } from "./definitions";

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
  if (setting.items !== undefined) {
    for (let i = 0; i < setting.items.length; i++) {
      if (setting.items[i].value === value) {
        return setting.items[i].displayName;
      }
    }
  }
  return code(value);
}

function formatRange(setting: SettingDefinition): string {
  const kind = setting.integer ? "Whole number" : "Number";
  const min = setting.options?.minValue?.value;
  const max = setting.options?.maxValue?.value;
  if (min !== undefined && max !== undefined) {
    return kind + " from " + min + " to " + max;
  }
  if (min !== undefined) {
    return kind + ", at least " + min;
  }
  if (max !== undefined) {
    return kind + ", at most " + max;
  }
  return kind;
}

/** Display names, with the value conditional formatting expects where it differs */
function formatValues(setting: SettingDefinition): string {
  switch (setting.type) {
    case FormattingComponent.Dropdown: {
      const items = setting.items ?? [];
      const values = new Array<string>(items.length);
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        values[i] = item.displayName === item.value ? code(item.value) : item.displayName + " (" + code(item.value) + ")";
      }
      return values.join("<br>");
    }
    case FormattingComponent.AlignmentGroup: {
      const valid = setting.valid ?? [];
      const values = new Array<string>(valid.length);
      for (let i = 0; i < valid.length; i++) {
        values[i] = code(valid[i]);
      }
      return values.join("<br>");
    }
    case FormattingComponent.NumUpDown:
      return formatRange(setting);
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
  const cards = Object.keys(schema);
  for (let i = 0; i < cards.length; i++) {
    const card = schema[cards[i]];
    const groups = Object.keys(card.settingsGroups);
    let markdown = "<!-- Generated from the settings model; edit the setting definitions, not this file. -->\n";
    for (let j = 0; j < groups.length; j++) {
      const settings = card.settingsGroups[groups[j]];
      const names = Object.keys(settings);
      markdown += "\n### " + groupDisplayName(card, groups[j]) + "\n\n"
        + "| Setting | Description | Default | Values |\n"
        + "| --- | --- | --- | --- |\n";
      for (let k = 0; k < names.length; k++) {
        const setting = settings[names[k]];
        markdown += "| " + setting.displayName + " | " + setting.description + " | " + formatDefault(setting)
          + " | " + formatValues(setting) + " |\n";
      }
    }
    pages[cards[i]] = markdown;
  }
  return pages;
}
