import { createDefaultValues, type SettingCard, type SettingsValues } from "../settings/definitions";
import readSettingsRows, { type SettingsCategory, type SettingsValidation } from "./readSettingsRows";

/** A check across one group's settings; its message becomes the error */
export type SettingsGroupRule<S> = (settings: S, group: number) => string | undefined;

export type SettingsGroups<T extends Record<string, SettingCard>> = {
  values: SettingsValues<T>[];
  /** Each group's rows' own values, for checks across a group's rows */
  rowValues: SettingsValues<T>[][];
  validation: SettingsValidation;
  messagePositionByRowIndex: Map<number, number>;
};

/** Each group's settings, invalid on the first row-level error, then the first rule any group fails */
export default function readSettingsGroups<T extends Record<string, SettingCard>>(
  schema: T, category: SettingsCategory, groups: readonly (readonly number[])[],
  rules: readonly SettingsGroupRule<SettingsValues<T>>[] = []
): SettingsGroups<T> {
  const values = new Array<SettingsValues<T>>(groups.length);
  const rowValues = new Array<SettingsValues<T>[]>(groups.length);
  const rawRows: number[] = [];
  const firstPositions = new Array<number>(groups.length);
  const messagePositionByRowIndex = new Map<number, number>();
  for (let i = 0; i < groups.length; i++) {
    values[i] = createDefaultValues(schema);
    const rows = groups[i];
    rowValues[i] = new Array<SettingsValues<T>>(rows.length);
    firstPositions[i] = rawRows.length;
    for (let j = 0; j < rows.length; j++) {
      rowValues[i][j] = {} as SettingsValues<T>;
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
      for (let k = 0; k < row.length; k++) {
        messages.push(row[k]);
      }
    }
    if (result.validation.status !== 0) {
      validation = { status: 1, messages: validation.messages, error: result.validation.error };
    }
    for (let j = 0; j < groups.length; j++) {
      const position = firstPositions[j];
      for (let k = 0; k < groups[j].length; k++) {
        rowValues[j][k][card] = result.values[position + k];
      }
      // The group's first row with valid values for this card; otherwise its first row, with defaults
      let chosen = position;
      for (let k = position; k < position + groups[j].length; k++) {
        if (result.validation.messages[k].length === 0) {
          chosen = k;
          break;
        }
      }
      values[j][card] = result.values[chosen];
    }
  }
  for (let i = 0; validation.status === 0 && i < groups.length; i++) {
    for (let r = 0; validation.status === 0 && r < rules.length; r++) {
      const error = rules[r](values[i], i);
      if (error !== undefined) {
        validation = { status: 1, messages: validation.messages, error };
      }
    }
  }
  return { values, rowValues, validation, messagePositionByRowIndex };
}
