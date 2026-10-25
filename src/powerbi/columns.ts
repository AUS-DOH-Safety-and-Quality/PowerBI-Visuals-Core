import at from "../util/at";
export type RoleColumn = { source: { roles?: Readonly<Record<string, boolean>> } };
export type RoleColumns<T extends RoleColumn> = Record<string, T[] | undefined>;

export function indexColumnsByRole<T extends RoleColumn>(columns: readonly T[]): RoleColumns<T> {
  const result = Object.create(null) as RoleColumns<T>;
  for (let i = 0; i < columns.length; i++) {
    const column = at(columns, i);
    const roles = Object.entries(column.source.roles ?? {});
    for (let j = 0; j < roles.length; j++) {
      const [name, enabled] = at(roles, j);
      if (!enabled) {
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

/** The column's cells at the rows as numbers; blank cells and empty strings read as undefined */
export function readNumbers(column: { readonly values: readonly PrimitiveValue[] }, rows: readonly number[]): (number | undefined)[] {
  const numbers = new Array<number | undefined>(rows.length);
  for (let i = 0; i < rows.length; i++) {
    const value = column.values[at(rows, i)];
    numbers[i] = value == null || value === "" ? undefined : Number(value);
  }
  return numbers;
}
