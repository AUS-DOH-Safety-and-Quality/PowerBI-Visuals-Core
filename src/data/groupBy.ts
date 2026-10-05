// Groups by SameValueZero key equality, preserving first-seen group order and row order.
export default function groupBy<T, K extends keyof T>(rows: readonly T[], key: K): Array<[T[K], T[]]> {
  const groups = new Map<T[K], T[]>();
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const keyValue = row[key];
    const group = groups.get(keyValue);
    if (group === undefined) {
      groups.set(keyValue, [row]);
    } else {
      group.push(row);
    }
  }
  return Array.from(groups);
}
