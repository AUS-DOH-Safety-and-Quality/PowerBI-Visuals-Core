export type RoleColumn = { source: { roles?: Readonly<Record<string, boolean>> } };
export type RoleColumns<T extends RoleColumn> = Record<string, T[] | undefined>;

export function indexColumnsByRole<T extends RoleColumn>(columns: readonly T[]): RoleColumns<T> {
  const result: RoleColumns<T> = Object.create(null);
  for (let i = 0; i < columns.length; i++) {
    const column = columns[i];
    const roles = column.source.roles;
    if (roles === undefined) {
      continue;
    }
    const names = Object.keys(roles);
    for (let j = 0; j < names.length; j++) {
      const name = names[j];
      if (!roles[name]) {
        continue;
      }
      (result[name] ??= []).push(column);
    }
  }
  return result;
}

export type PrimitiveValue = string | number | boolean | Date | null | undefined;

export function formatPrimitiveValue(value: PrimitiveValue): string | undefined {
  return value == null ? undefined : String(value);
}

/** The column's cells at the rows as numbers; blank cells read as undefined */
export function readNumbers(column: { readonly values: readonly PrimitiveValue[] }, rows: readonly number[]): (number | undefined)[] {
  const numbers = new Array<number | undefined>(rows.length);
  for (let i = 0; i < rows.length; i++) {
    const value = column.values[rows[i]];
    numbers[i] = value == null ? undefined : Number(value);
  }
  return numbers;
}
