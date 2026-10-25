import at from "../util/at";
import { formatPrimitiveValue, type PrimitiveValue } from "./columns";

/** `labels` joins each group's names for messages and captions; blank when there are no columns */
export type CategoryGroups = { rows: number[][]; names: string[][]; keys: string[]; labels: string[] };

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Local calendar date, with the time unless midnight; String(date) names the viewer's timezone */
function dateName(date: Date): string {
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  if (date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0) {
    return day;
  }
  return `${day} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export default function groupCategoryRows(
  columns: readonly { readonly values: readonly PrimitiveValue[] }[], rowCount: number
): CategoryGroups {
  // Without columns every row belongs to one unnamed group
  if (columns.length === 0) {
    const rows = new Array<number>(rowCount);
    for (let i = 0; i < rowCount; i++) {
      rows[i] = i;
    }
    return { rows: [rows], names: [[]], keys: ["[]"], labels: [""] };
  }
  const groups: CategoryGroups = { rows: [], names: [], keys: [], labels: [] };
  const indexes = new Map<string, number>();
  for (let i = 0; i < rowCount; i++) {
    const parts = new Array<readonly [string, string]>(columns.length);
    const names = new Array<string>(columns.length);
    for (let j = 0; j < columns.length; j++) {
      const value = at(columns, j).values[i];
      names[j] = value instanceof Date ? dateName(value) : formatPrimitiveValue(value) ?? "";
      if (value == null) {
        parts[j] = ["undefined", ""];
      } else if (value instanceof Date) {
        parts[j] = ["date", String(value.getTime())];
      } else {
        parts[j] = [typeof value, String(value)];
      }
    }
    const key = JSON.stringify(parts);
    let index = indexes.get(key);
    if (index === undefined) {
      index = groups.rows.length;
      indexes.set(key, index);
      groups.rows.push([]);
      groups.names.push(names);
      groups.keys.push(key);
      groups.labels.push(names.join(" / "));
    }
    at(groups.rows, index).push(i);
  }
  return groups;
}
