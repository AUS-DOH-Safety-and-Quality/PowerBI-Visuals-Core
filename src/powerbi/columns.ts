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
