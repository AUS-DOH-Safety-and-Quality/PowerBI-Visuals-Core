import at from "../util/at";
import { createDefaultValues, type SettingCard, type SettingsValues } from "../settings/definitions";
import readSettingsRows, { type SettingsCategory, type SettingsRows, type SettingsValidation } from "./readSettingsRows";

/** A check across one group's settings; its message becomes the error */
export type SettingsGroupRule<S> = (settings: S, group: number) => string | undefined;

export type SettingsGroups<T extends Record<string, SettingCard>> = {
  readonly values: SettingsValues<T>[];
  /** Each group's rows' own values, for checks across a group's rows */
  readonly rowValues: SettingsValues<T>[][];
  readonly validation: SettingsValidation;
  readonly messagePositionByRowIndex: Map<number, number>;
};

/** Each group's settings, invalid on the first row-level error, then the first rule any group fails */
export default function readSettingsGroups<T extends Record<string, SettingCard>>(
  schema: T, category: SettingsCategory, groups: readonly (readonly number[])[],
  rules: readonly SettingsGroupRule<SettingsValues<T>>[] = []
): SettingsGroups<T> {
  const rawRows: number[] = [];
  const firstPositions = new Array<number>(groups.length);
  const messagePositionByRowIndex = new Map<number, number>();
  for (let i = 0; i < groups.length; i++) {
    const rows = at(groups, i);
    firstPositions[i] = rawRows.length;
    for (let j = 0; j < rows.length; j++) {
      const row = at(rows, j);
      messagePositionByRowIndex.set(row, rawRows.length);
      rawRows.push(row);
    }
  }
  const defaults = createDefaultValues(schema);
  const cards = Object.keys(schema) as (keyof T & string)[];
  const perCard = new Array<SettingsRows<SettingsValues<T>[keyof T & string]>>(cards.length);
  // Rows with no messages from any card share one empty list
  const noMessages: string[] = [];
  const messages = new Array<string[]>(rawRows.length).fill(noMessages);
  let error: string | undefined;
  for (let i = 0; i < cards.length; i++) {
    const card = at(cards, i);
    const cardSchema = schema[card];
    if (cardSchema === undefined) {
      throw new Error(`Missing schema for ${card}`);
    }
    const result = readSettingsRows(cardSchema, card, defaults[card], category, rawRows);
    perCard[i] = result;
    for (let j = 0; j < rawRows.length; j++) {
      const row = at(result.validation.messages, j);
      if (row.length === 0) {
        continue;
      }
      let rowMessages = at(messages, j);
      if (rowMessages === noMessages) {
        rowMessages = [];
        messages[j] = rowMessages;
      }
      for (let k = 0; k < row.length; k++) {
        rowMessages.push(at(row, k));
      }
    }
    if (result.validation.status !== 0) {
      error = result.validation.error;
    }
  }
  const values = new Array<SettingsValues<T>>(groups.length);
  const rowValues = new Array<SettingsValues<T>[]>(groups.length);
  for (let i = 0; i < groups.length; i++) {
    const position = at(firstPositions, i);
    const count = at(groups, i).length;
    const group: Record<string, unknown> = {};
    const groupRows = new Array<SettingsValues<T>>(count);
    for (let k = 0; k < count; k++) {
      const row: Record<string, unknown> = {};
      for (let c = 0; c < cards.length; c++) {
        row[at(cards, c)] = at(perCard, c).values[position + k];
      }
      groupRows[k] = row as SettingsValues<T>;
    }
    rowValues[i] = groupRows;
    for (let c = 0; c < cards.length; c++) {
      const card = at(perCard, c);
      // The group's first row with valid values for this card; otherwise its first row, with defaults
      let chosen = position;
      for (let k = position; k < position + count; k++) {
        if (at(card.validation.messages, k).length === 0) {
          chosen = k;
          break;
        }
      }
      group[at(cards, c)] = card.values[chosen];
    }
    values[i] = group as SettingsValues<T>;
  }
  let validation: SettingsValidation = error === undefined ? { status: 0, messages } : { status: 1, messages, error };
  for (let i = 0; validation.status === 0 && i < groups.length; i++) {
    for (let r = 0; validation.status === 0 && r < rules.length; r++) {
      const ruleError = at(rules, r)(at(values, i), i);
      if (ruleError !== undefined) {
        validation = { status: 1, messages, error: ruleError };
      }
    }
  }
  return { values, rowValues, validation, messagePositionByRowIndex };
}
