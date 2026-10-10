import { formatPrimitiveValue, type PrimitiveValue } from "./columns";

export type CategoryGroups = { rows: number[][]; names: string[][]; keys: string[] };

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
  columns: readonly { values: readonly PrimitiveValue[] }[], rowCount: number
): CategoryGroups {
  const groups: CategoryGroups = { rows: [], names: [], keys: [] };
  const indexes = new Map<string, number>();
  for (let i = 0; i < rowCount; i++) {
    const parts = new Array<readonly [string, string]>(columns.length);
    const names = new Array<string>(columns.length);
    for (let j = 0; j < columns.length; j++) {
      const value = columns[j].values[i];
      names[j] = value instanceof Date ? dateName(value) : formatPrimitiveValue(value) ?? "";
      parts[j] = value == null ? ["undefined", ""]
        : value instanceof Date ? ["date", String(value.getTime())] : [typeof value, String(value)];
    }
    const key = JSON.stringify(parts);
    let index = indexes.get(key);
    if (index === undefined) {
      index = groups.rows.length;
      indexes.set(key, index);
      groups.rows.push([]);
      groups.names.push(names);
      groups.keys.push(key);
    }
    groups.rows[index].push(i);
  }
  return groups;
}
