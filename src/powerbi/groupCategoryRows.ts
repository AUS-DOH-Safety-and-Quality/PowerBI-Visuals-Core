import { formatPrimitiveValue, type PrimitiveValue } from "./columns";

export type CategoryGroups = { rows: number[][]; names: string[][]; keys: string[] };

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
      names[j] = formatPrimitiveValue(value) ?? "";
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
