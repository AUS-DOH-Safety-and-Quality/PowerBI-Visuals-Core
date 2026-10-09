import { FormattingComponent, type SettingCard, type SettingDefinition, type SettingValue, type CardValues } from "../settings/definitions";

export type SettingsValidation =
  | { status: 0; messages: string[][]; error?: undefined }
  | { status: 1; messages: string[][]; error: string };
export type SettingsRows<T> = { values: T[]; validation: SettingsValidation };
export type SettingsCategory = {
  objects?: readonly (Readonly<Record<string, Readonly<Record<string, unknown>> | undefined>> | undefined)[];
};

function readValue(raw: unknown, defaultValue: SettingValue, type: SettingDefinition["type"]): unknown {
  if (raw == null || (raw === "" && type !== FormattingComponent.TextInput)) return defaultValue;
  if (typeof raw === "object" && "solid" in raw) {
    const solid = raw.solid;
    return typeof solid === "object" && solid !== null && "color" in solid ? solid.color : undefined;
  }
  return raw;
}

function validationMessage(value: unknown, definition: SettingDefinition, name: string): string {
  if (value === undefined && definition.default === undefined) return "";
  const expected = definition.type === FormattingComponent.NumUpDown ? "number"
    : definition.type === FormattingComponent.ToggleSwitch ? "boolean" : "string";
  if (typeof value !== expected) return `${value} is not a valid ${expected} for ${name}`;
  if (definition.valid !== undefined) {
    let valid = false;
    for (let i = 0; i < definition.valid.length; i++) {
      if (definition.valid[i] === value) {
        valid = true;
        break;
      }
    }
    if (!valid) return `${value} is not a valid value for ${name}. Valid values are: ${definition.valid.join(", ")}`;
  }
  if (typeof value === "number") {
    const min = definition.options?.minValue?.value;
    const max = definition.options?.maxValue?.value;
    if (!Number.isFinite(value) || (min !== undefined && value < min) || (max !== undefined && value > max)) {
      return `${value} is not a valid value for ${name}. Valid values are between ${min} and ${max}`;
    }
    if (definition.integer && !Number.isInteger(value)) {
      return `${value} is not a valid value for ${name}. Valid values are whole numbers`;
    }
  }
  return "";
}

export default function readSettingsRows<T extends SettingCard>(
  cardSchema: T, cardName: string, defaults: NoInfer<CardValues<T>>,
  category: SettingsCategory, rawRowIndices: readonly number[]
): SettingsRows<CardValues<T>> {
  if (rawRowIndices.length === 0) return { values: [], validation: { status: 0, messages: [] } };
  const defaultValues: Readonly<Record<string, SettingValue>> = defaults;
  const groups = Object.keys(cardSchema.settingsGroups);
  const entries: { name: string; definition: SettingDefinition; defaultValue: SettingValue }[] = [];
  for (let i = 0; i < groups.length; i++) {
    const definitions = cardSchema.settingsGroups[groups[i]];
    const names = Object.keys(definitions);
    for (let j = 0; j < names.length; j++) {
      const name = names[j];
      entries.push({ name, definition: definitions[name], defaultValue: defaultValues[name] });
    }
  }
  const values = new Array<CardValues<T>>(rawRowIndices.length);
  const messages = new Array<string[]>(rawRowIndices.length);
  let anyValid = false;
  let firstMessage: string | undefined;
  // Rows without their own card objects all read the same way, so reuse the first
  let defaultRow: { values: CardValues<T>; messages: string[] } | undefined;
  for (let i = 0; i < rawRowIndices.length; i++) {
    const objects = category.objects?.[rawRowIndices[i]]?.[cardName];
    if (objects == null && defaultRow !== undefined) {
      values[i] = { ...defaultRow.values };
      messages[i] = defaultRow.messages.slice();
      anyValid ||= defaultRow.messages.length === 0;
      continue;
    }
    const row: Record<string, SettingValue> = {};
    const rowMessages: string[] = [];
    for (let j = 0; j < entries.length; j++) {
      const { name, definition, defaultValue } = entries[j];
      let value = readValue(objects?.[name], defaultValue, definition.type);
      const message = validationMessage(value, definition, name);
      if (message !== "") {
        rowMessages.push(message);
        firstMessage ??= message;
        value = defaultValue;
      }
      row[name] = value as SettingValue;
    }
    values[i] = row as CardValues<T>;
    messages[i] = rowMessages;
    anyValid ||= rowMessages.length === 0;
    if (objects == null) {
      defaultRow = { values: values[i], messages: rowMessages };
    }
  }
  return { values, validation: !anyValid && firstMessage !== undefined
    ? { status: 1, messages, error: firstMessage } : { status: 0, messages } };
}
