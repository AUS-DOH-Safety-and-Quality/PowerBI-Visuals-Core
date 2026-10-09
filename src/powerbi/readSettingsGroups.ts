import { createDefaultValues, type SettingCard, type SettingsValues } from "../settings/definitions";
import readSettingsRows, { type SettingsCategory, type SettingsValidation } from "./readSettingsRows";

export default function readSettingsGroups<T extends Record<string, SettingCard>>(
  schema: T, category: SettingsCategory, groups: readonly (readonly number[])[]
): { values: SettingsValues<T>[]; validation: SettingsValidation; messagePositionByRowIndex: Map<number, number> } {
  const values = new Array<SettingsValues<T>>(groups.length);
  const rawRows: number[] = [];
  const firstPositions = new Array<number | undefined>(groups.length);
  const messagePositionByRowIndex = new Map<number, number>();
  for (let i = 0; i < groups.length; i++) {
    values[i] = createDefaultValues(schema);
    const rows = groups[i];
    firstPositions[i] = rows.length === 0 ? undefined : rawRows.length;
    for (let j = 0; j < rows.length; j++) {
      messagePositionByRowIndex.set(rows[j], rawRows.length);
      rawRows.push(rows[j]);
    }
  }
  let validation: SettingsValidation = { status: 0, messages: [] };
  const defaults = createDefaultValues(schema);
  const cards = Object.keys(schema) as (keyof T & string)[];
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const result = readSettingsRows(schema[card], card, defaults[card], category, rawRows);
    for (let j = 0; j < result.validation.messages.length; j++) {
      const messages = validation.messages[j] ??= [];
      const row = result.validation.messages[j];
      for (let k = 0; k < row.length; k++) messages.push(row[k]);
    }
    if (result.validation.status !== 0) {
      validation = { status: 1, messages: validation.messages, error: result.validation.error };
    }
    for (let j = 0; j < groups.length; j++) {
      const position = firstPositions[j];
      if (position !== undefined) values[j][card] = result.values[position];
    }
  }
  return { values, validation, messagePositionByRowIndex };
}
