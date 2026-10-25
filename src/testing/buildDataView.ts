import at from "../util/at";
import type powerbi from "powerbi-visuals-api";
import type { PrimitiveValue } from "../powerbi/columns";
import cells from "./cells";

/** Row objects as Power BI stores them: settings values by card */
export type RowObjects = Readonly<Record<string, Readonly<Record<string, unknown>> | undefined>>;

export type DataViewColumnInput = {
  readonly role: string;
  readonly values: readonly PrimitiveValue[];
  readonly displayName?: string;
};

export type DataViewInputs = {
  /** The first category carries the row objects */
  readonly categories: readonly DataViewColumnInput[];
  readonly values: readonly DataViewColumnInput[];
};

export function sequentialKeys(n: number): string[] {
  const keys = new Array<string>(n);
  for (let i = 0; i < n; i++) {
    keys[i] = String(i + 1);
  }
  return keys;
}

/** Numeric when the first present value is a number, as the host types a measure column */
function columnSource(column: DataViewColumnInput): powerbi.DataViewMetadataColumn {
  let first: PrimitiveValue = null;
  for (let i = 0; i < column.values.length && first == null; i++) {
    first = column.values[i];
  }
  return {
    displayName: column.displayName ?? column.role,
    queryName: column.role,
    roles: { [column.role]: true },
    type: typeof first === "number" ? { numeric: true } : { text: true }
  };
}

/** A categorical data view; per-row objects apply the matching entry, or the same objects to every row */
export default function buildDataView(inputs: DataViewInputs, objects?: RowObjects | readonly (RowObjects | undefined)[]): powerbi.DataView {
  const columns: powerbi.DataViewMetadataColumn[] = [];
  const categories: powerbi.DataViewCategoryColumn[] = [];
  const values: powerbi.DataViewValueColumns = Object.assign([], { grouped: () => [] });
  for (let c = 0; c < inputs.categories.length; c++) {
    const column = at(inputs.categories, c);
    const source = columnSource(column);
    columns.push(source);
    const category: powerbi.DataViewCategoryColumn = { source, values: cells(column.values.slice()) };
    if (c === 0 && objects !== undefined) {
      const rows = new Array<powerbi.DataViewObjects>(column.values.length);
      for (let i = 0; i < rows.length; i++) {
        rows[i] = (Array.isArray(objects) ? objects[i] : objects) as powerbi.DataViewObjects;
      }
      category.objects = rows;
    }
    categories.push(category);
  }
  for (let v = 0; v < inputs.values.length; v++) {
    const column = at(inputs.values, v);
    const source = columnSource(column);
    columns.push(source);
    values.push({ source, values: cells(column.values.slice()) });
  }
  return { metadata: { columns }, categorical: { categories, values } };
}
