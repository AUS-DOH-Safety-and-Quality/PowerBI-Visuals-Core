type RoleSource = { readonly roles?: Readonly<Record<string, boolean>> };
export type DataViewLike = {
  readonly categorical?: {
    readonly categories?: readonly { readonly source: RoleSource; readonly values: readonly unknown[] }[];
    readonly values?: readonly { readonly source: RoleSource }[];
  };
};

// "valid", or the first problem: no view, no key category, no rows, then each missing value role in order
export function validateDataView(dataViews: readonly DataViewLike[] | undefined, requiredValueRoles: readonly string[]): string {
  const view = dataViews?.[0];
  if (view === undefined) {
    return "No data present";
  }
  const categories = view.categorical?.categories;
  if (categories === undefined || categories.length === 0) {
    return "No grouping/ID variable passed!";
  }
  let keyColumn: (typeof categories)[number] | undefined;
  for (let i = 0; i < categories.length; i++) {
    if (categories[i].source.roles?.key === true) {
      keyColumn = categories[i];
      break;
    }
  }
  if (keyColumn === undefined) {
    return "No grouping/ID variable passed!";
  }
  if (keyColumn.values.length === 0) {
    return "No data present";
  }
  const values = view.categorical?.values ?? [];
  for (let i = 0; i < requiredValueRoles.length; i++) {
    let present = false;
    for (let j = 0; j < values.length; j++) {
      present ||= values[j].source.roles?.[requiredValueRoles[i]] === true;
    }
    if (!present) {
      return `No ${requiredValueRoles[i]} passed!`;
    }
  }
  return "valid";
}
