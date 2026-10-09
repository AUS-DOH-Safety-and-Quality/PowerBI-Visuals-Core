import type powerbi from "powerbi-visuals-api";
import { indexColumnsByRole, type RoleColumns } from "./columns";

export type ValidatedDataView<R extends string = never> = {
  readonly dataView: powerbi.DataView;
  readonly categorical: powerbi.DataViewCategorical;
  // First category column: carries the per-row settings objects and selection identities
  readonly category: powerbi.DataViewCategoryColumn;
  readonly rowCount: number;
  readonly categories: RoleColumns<powerbi.DataViewCategoryColumn> & { readonly key: powerbi.DataViewCategoryColumn[] };
  readonly values: RoleColumns<powerbi.DataViewValueColumn> & { readonly [K in R]: powerbi.DataViewValueColumn[] };
};

export type DataViewValidation<R extends string> =
  | { readonly status: "valid"; readonly view: ValidatedDataView<R> }
  | { readonly status: "invalid"; readonly error: string };

// The first problem wins: no view, no key category, no rows, then each missing value role in order
export function validateDataView<R extends string>(dataViews: readonly powerbi.DataView[] | undefined,
                                                   requiredValueRoles: readonly R[]): DataViewValidation<R> {
  const dataView = dataViews?.[0];
  if (dataView === undefined) {
    return { status: "invalid", error: "No data present" };
  }
  const categorical = dataView.categorical;
  const category = categorical?.categories?.[0];
  if (categorical === undefined || category === undefined) {
    return { status: "invalid", error: "No grouping/ID variable passed!" };
  }
  const categories = indexColumnsByRole(categorical.categories ?? []);
  const key = categories.key;
  if (key === undefined) {
    return { status: "invalid", error: "No grouping/ID variable passed!" };
  }
  const rowCount = key[0].values.length;
  if (rowCount === 0) {
    return { status: "invalid", error: "No data present" };
  }
  const values = indexColumnsByRole(categorical.values ?? []);
  for (let i = 0; i < requiredValueRoles.length; i++) {
    if (values[requiredValueRoles[i]] === undefined) {
      return { status: "invalid", error: `No ${requiredValueRoles[i]} passed!` };
    }
  }
  return { status: "valid", view: {
    dataView, categorical, category, rowCount,
    categories: { ...categories, key },
    values: values as ValidatedDataView<R>["values"]
  } };
}
