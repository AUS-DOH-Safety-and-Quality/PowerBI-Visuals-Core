import type powerbi from "powerbi-visuals-api";
import { validateDataView } from "../src/powerbi/index";

declare const dataViews: powerbi.DataView[];
const result = validateDataView(dataViews, ["numerators"]);

// @ts-expect-error The view only exists once validation has passed.
result.view;
if (result.status === "valid") {
  // Required roles and the key are present without a check; other roles stay optional
  const numerators: powerbi.DataViewValueColumn[] = result.view.values.numerators;
  const key: powerbi.DataViewCategoryColumn[] = result.view.categories.key;
  // @ts-expect-error Roles not named as required may be absent.
  const denominators: powerbi.DataViewValueColumn[] = result.view.values.denominators;
  // @ts-expect-error Optional category roles may be absent.
  const indicator: powerbi.DataViewCategoryColumn[] = result.view.categories.indicator;
  void [numerators, key, denominators, indicator];
}
