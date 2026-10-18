/** Each indicator's column in the limits: names taken by a limit column, or by another indicator, get trailing underscores */
export function indicatorColumns(names: readonly string[], limitColumns: readonly string[]): string[] {
  const reserved = new Set(limitColumns);
  const taken = new Set(limitColumns);
  for (let i = 0; i < names.length; i++) {
    taken.add(names[i]);
  }
  const columns = new Array<string>(names.length);
  for (let i = 0; i < names.length; i++) {
    let column = names[i];
    if (reserved.has(column)) {
      do {
        column += "_";
      } while (taken.has(column));
      taken.add(column);
    }
    columns[i] = column;
  }
  return columns;
}

/** Indicator values keyed by their columns in the limits */
export function indicatorFields<T>(indicators: Readonly<Record<string, T>>, limitColumns: readonly string[]): Record<string, T> {
  const names = Object.keys(indicators);
  const columns = indicatorColumns(names, limitColumns);
  const fields: Record<string, T> = {};
  for (let i = 0; i < names.length; i++) {
    fields[columns[i]] = indicators[names[i]];
  }
  return fields;
}
