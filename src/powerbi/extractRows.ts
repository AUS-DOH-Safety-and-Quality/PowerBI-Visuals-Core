import type powerbi from "powerbi-visuals-api";
import { keptPositions, type InputDataResult, type RowValidation, type ValidRows } from "../data/validateRows";
import {
  readRowAnnotations, rowWarnings, type RowAnnotations, type RowAnnotationSources, type RowSettingsMessages
} from "./rowAnnotations";
import type { ValidatedDataView } from "./validateDataView";

/** What every visual's input data carries for a group's kept rows */
export type InputRows<S, L> = RowAnnotations<S, L> & {
  /** Key and indicator columns, which together identify a row */
  readonly identityColumns: powerbi.DataViewCategoryColumn[];
  readonly warningMessage: string;
  readonly validationStatus: ValidRows;
};

export type RowExtractionOptions<S, L> = Pick<RowAnnotationSources<S, L>, "rowSettings"> & {
  readonly keys: readonly (string | undefined)[];
  readonly validation: RowValidation;
  readonly settings: RowSettingsMessages;
};

export type ExtractedRows<S, L> = Omit<InputRows<S, L>, "warningMessage"> & {
  /** Positions within the group's rows that validation kept */
  readonly kept: number[];
  /** Why each dropped row went, and which conditional formatting was ignored */
  readonly warnings: string[];
};

/** Rejects the group when no row is valid; otherwise the kept rows' annotations with the warnings for the rest */
export default function extractRows<S, L>(
  view: ValidatedDataView, rows: readonly number[], options: RowExtractionOptions<S, L>
): InputDataResult<ExtractedRows<S, L>> {
  const validation = options.validation;
  if (validation.status !== 0) {
    return { status: "invalid", error: validation.error };
  }
  const kept = keptPositions(validation.messages);
  const annotations = readRowAnnotations({ categorical: view.categorical, values: view.values, rowSettings: options.rowSettings }, rows, kept);
  return {
    status: "valid",
    data: {
      ...annotations,
      identityColumns: [...view.categories.key, ...(view.categories.indicator ?? [])],
      validationStatus: validation,
      kept,
      warnings: rowWarnings(view.category.source.displayName, rows, options.keys, validation.messages, options.settings)
    }
  };
}
