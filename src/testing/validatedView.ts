import type powerbi from "powerbi-visuals-api";
import { validateDataView, type ValidatedDataView } from "../powerbi/validateDataView";

/** The view Core validates for the roles, failing the test on an invalid one */
export default function validatedView<R extends string>(dataView: powerbi.DataView, roles: readonly R[]): ValidatedDataView<R> {
  const result = validateDataView([dataView], roles);
  if (result.status !== "valid") {
    throw new Error(result.error);
  }
  return result.view;
}
