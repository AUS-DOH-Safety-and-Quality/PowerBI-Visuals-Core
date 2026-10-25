import at from "../util/at";
import type powerbi from "powerbi-visuals-api";
import { aggregateColumn, valueRoles, type Aggregations, type ValueRole } from "./aggregations";
import type { InputSettings } from "./chartSettings";
import { asArray, isArray, isMissing, type Cell, type Column } from "./values";

/** A date part a key shows, as Power BI's date hierarchy levels; "Qtr 1" style quarters and English month names */
export type DatePart = "year" | "quarter" | "month" | "day";

export type RawData = {
  readonly categories: Column;
  /** Names the rows in the visuals' warnings */
  readonly category_name: string;
  /** Categories with levels (e.g., R factors) are ordered by level rather than value */
  readonly category_levels?: Column | null;
  /** ISO date categories labelled by these parts only (e.g. a yearly series by year); mixed keys stay labels */
  readonly category_date_parts?: readonly DatePart[] | null;
  /** Rows without Crosstalk keys are identified by position */
  readonly crosstalk_identities?: Column | null;
  readonly indicators?: Readonly<Record<string, Column>> | null;
  /** Levels of the indicators that have them, by indicator name, ordering those indicators as `category_levels` does */
  readonly indicator_levels?: Readonly<Record<string, Column>> | null;
  readonly tooltips?: Readonly<Record<string, Column>> | null;
} & Readonly<Partial<Record<ValueRole, Column | null>>>;

/** Power BI's runtime types a date hierarchy level by its category, which the api's descriptor omits */
export type DatePartCategory = "Years" | "Quarters" | "Months" | "DayOfMonth";

/** A column as the visuals read it; R and Python round-trip these as JSON */
export type FrontendColumn = {
  readonly source: powerbi.DataViewMetadataColumn & { readonly type?: powerbi.ValueTypeDescriptor & { readonly category?: DatePartCategory } };
  readonly values: Cell[];
};

/** The key column carries each row's settings */
export type KeyColumn = FrontendColumn & { readonly objects: InputSettings[] };

export type FrontendDataView = {
  readonly categorical: { readonly categories: readonly [KeyColumn, ...FrontendColumn[]]; readonly values: readonly FrontendColumn[] };
  readonly metadata: {
    readonly columns: readonly FrontendColumn["source"][];
  };
};

/** Each data view row's Crosstalk keys, by position */
export type CrosstalkIdentities = string[][];

export type UpdateValues = {
  readonly dataViews: FrontendDataView[];
  readonly crosstalk_identities: CrosstalkIdentities;
  readonly source_rows: Readonly<Record<string, readonly number[]>>;
};

/** R and Python round-trip data views as JSON, which drops the value columns' grouped() the visuals never call */
export function toDataViews(dataViews: readonly FrontendDataView[]): powerbi.DataView[] {
  return dataViews as unknown as powerbi.DataView[];
}

/** Missing values last, numbers by value, and text by code point so that order is locale-independent */
function compareValues(a: Cell | undefined, b: Cell | undefined): number {
  const aMissing = isMissing(a);
  const bMissing = isMissing(b);
  if (aMissing || bMissing) {
    return Number(aMissing) - Number(bMissing);
  }
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }
  const aText = String(a);
  const bText = String(b);
  if (aText === bText) {
    return 0;
  }
  return aText < bText ? -1 : 1;
}

function namedColumns(columns: Readonly<Record<string, Column>> | null | undefined): { names: string[]; columns: (readonly Cell[])[] } {
  const entries = Object.entries(columns ?? {});
  const names = new Array<string>(entries.length);
  const values = new Array<readonly Cell[]>(entries.length);
  for (let i = 0; i < entries.length; i++) {
    const [name, column] = at(entries, i);
    names[i] = name;
    values[i] = asArray(column);
  }
  return { names, columns: values };
}

function hasDateCategories(categories: readonly Cell[]): boolean {
  let hasDate = false;
  for (let i = 0; i < categories.length; i++) {
    const value = categories[i];
    if (isMissing(value)) {
      continue;
    }
    if (typeof value !== "string"
      || !/^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?)?$/.test(value)
      || Number.isNaN(Date.parse(value))) {
      return false;
    }
    const datePart = value.slice(0, 10);
    if (new Date(datePart).toISOString().slice(0, 10) !== datePart) {
      return false;
    }
    hasDate = true;
  }
  return hasDate;
}

/** Values with levels rank by level position, and unlisted values rank as missing */
function levelRanks(values: readonly Cell[], levels: Column | null | undefined): readonly (Cell | undefined)[] {
  if (levels == null) {
    return values;
  }
  const levelValues = asArray(levels);
  const ranks = new Map<Cell, number>();
  for (let i = 0; i < levelValues.length; i++) {
    ranks.set(at(levelValues, i), i);
  }
  const ranked = new Array<number | undefined>(values.length);
  for (let i = 0; i < values.length; i++) {
    ranked[i] = ranks.get(at(values, i));
  }
  return ranked;
}

type CategoryGroup = { category: string | null; indicators: Cell[]; rows: number[] };

const datePartCategories: Readonly<Record<DatePart, DatePartCategory>> = { year: "Years", quarter: "Quarters", month: "Months", day: "DayOfMonth" };

const monthNames: readonly string[] = ["January", "February", "March", "April", "May", "June",
                                       "July", "August", "September", "October", "November", "December"];

type ColumnType = NonNullable<FrontendColumn["source"]["type"]>;

function datePartType(part: DatePart): ColumnType {
  return { temporal: {}, category: datePartCategories[part] };
}

/** The part of an ISO date category, as Power BI's hierarchy gives it */
function datePartValue(category: string | null, part: DatePart): Cell {
  if (category === null) {
    return null;
  }
  const year = Number(category.slice(0, 4));
  const month = Number(category.slice(5, 7));
  switch (part) {
    case "year":
      return year;
    case "quarter":
      return `Qtr ${Math.ceil(month / 3)}`;
    case "month":
      return at(monthNames, month - 1);
    case "day":
      return Number(category.slice(8, 10));
  }
}

/** Rows sorted by indicator then category, and grouped by both; rows outside the Crosstalk filter are dropped */
function groupRows(categories: readonly Cell[], categoryOrder: readonly (Cell | undefined)[], indicatorColumns: readonly (readonly Cell[])[],
                   indicatorOrder: readonly (readonly (Cell | undefined)[])[], crosstalkIdentities: readonly Cell[],
                   crosstalkFilters: readonly string[] | undefined): CategoryGroup[] {
  const filters = crosstalkFilters === undefined ? undefined : new Set(crosstalkFilters);
  const order = new Array<number>(categories.length);
  for (let i = 0; i < order.length; i++) {
    order[i] = i;
  }
  order.sort((a, b) => {
    for (let i = 0; i < indicatorOrder.length; i++) {
      const ranks = at(indicatorOrder, i);
      const comparison = compareValues(ranks[a], ranks[b]);
      if (comparison !== 0) {
        return comparison;
      }
    }
    return compareValues(categoryOrder[a], categoryOrder[b]);
  });

  const groups = new Map<string, CategoryGroup>();
  for (let i = 0; i < order.length; i++) {
    const row = at(order, i);
    if (filters !== undefined && !filters.has(String(crosstalkIdentities[row]))) {
      continue;
    }
    const category = isMissing(categories[row]) ? null : String(categories[row]);
    const indicators = new Array<Cell>(indicatorColumns.length);
    for (let j = 0; j < indicatorColumns.length; j++) {
      indicators[j] = at(at(indicatorColumns, j), row);
    }
    const groupKey = JSON.stringify([category, ...indicators]);
    let group = groups.get(groupKey);
    if (group === undefined) {
      group = { category, indicators, rows: [] };
      groups.set(groupKey, group);
    }
    group.rows.push(row);
  }
  return Array.from(groups.values());
}

/** Settings given per row arrive as arrays, and each group takes the value of its first row */
function groupSettings(inputSettings: InputSettings): (row: number) => InputSettings {
  const groups = Object.entries(inputSettings);
  let conditional = false;
  for (let i = 0; i < groups.length && !conditional; i++) {
    const values = Object.values(at(groups, i)[1]);
    for (let j = 0; j < values.length && !conditional; j++) {
      conditional = isArray(values[j]);
    }
  }
  if (!conditional) {
    return () => inputSettings;
  }
  return row => {
    const settings: Record<string, Record<string, unknown>> = {};
    for (let i = 0; i < groups.length; i++) {
      const [groupName, group] = at(groups, i);
      const rowGroup: Record<string, unknown> = {};
      const entries = Object.entries(group);
      for (let j = 0; j < entries.length; j++) {
        const [name, value] = at(entries, j);
        rowGroup[name] = isArray(value) ? value[row] : value;
      }
      settings[groupName] = rowGroup;
    }
    return settings;
  };
}

/** Aggregates the raw rows into a data view with one row per category and indicator combination */
export function makeUpdateValues(rawData: RawData, inputSettings: InputSettings, aggregations: Aggregations,
                                 crosstalkFilters?: readonly string[]): UpdateValues {
  const valueNames: ValueRole[] = [];
  const valueColumns: (readonly Cell[])[] = [];
  for (let i = 0; i < valueRoles.length; i++) {
    const role = at(valueRoles, i);
    const column = rawData[role];
    if (column != null) {
      valueNames.push(role);
      valueColumns.push(asArray(column));
    }
  }
  const indicators = namedColumns(rawData.indicators);
  const tooltips = namedColumns(rawData.tooltips);
  const categories = asArray(rawData.categories);
  let crosstalkIdentities: readonly Cell[];
  if (rawData.crosstalk_identities == null) {
    const positions = new Array<string>(categories.length);
    for (let i = 0; i < categories.length; i++) {
      positions[i] = String(i + 1);
    }
    crosstalkIdentities = positions;
  } else {
    crosstalkIdentities = asArray(rawData.crosstalk_identities);
  }
  const indicatorOrder = new Array<readonly (Cell | undefined)[]>(indicators.names.length);
  for (let i = 0; i < indicators.names.length; i++) {
    indicatorOrder[i] = levelRanks(at(indicators.columns, i), rawData.indicator_levels?.[at(indicators.names, i)]);
  }
  const groups = groupRows(categories, levelRanks(categories, rawData.category_levels), indicators.columns, indicatorOrder,
                         crosstalkIdentities, crosstalkFilters);

  const temporal = hasDateCategories(categories);
  const dateParts = temporal && rawData.category_date_parts != null ? rawData.category_date_parts : [];
  let keyType: ColumnType = temporal ? { temporal: {} } : { text: true };
  if (dateParts.length > 0) {
    keyType = datePartType(at(dateParts, 0));
  }
  const key: KeyColumn = { source: { displayName: rawData.category_name, roles: { key: true }, type: keyType }, values: [], objects: [] };
  const categoryColumns: [KeyColumn, ...FrontendColumn[]] = [key];
  // Each further part is another key column, as Power BI delivers a date hierarchy
  for (let i = 1; i < dateParts.length; i++) {
    categoryColumns.push({ source: { displayName: rawData.category_name, roles: { key: true }, type: datePartType(at(dateParts, i)) }, values: [] });
  }
  const keyColumnCount = categoryColumns.length;
  for (let i = 0; i < indicators.names.length; i++) {
    categoryColumns.push({ source: { displayName: at(indicators.names, i), roles: { indicator: true } }, values: [] });
  }
  const columns = new Array<FrontendColumn>(valueNames.length + tooltips.names.length);
  for (let i = 0; i < valueNames.length; i++) {
    const name = at(valueNames, i);
    columns[i] = { source: { displayName: name, roles: { [name]: true } }, values: [] };
  }
  // The visuals format tooltip values by type, and label them by name
  for (let i = 0; i < tooltips.names.length; i++) {
    columns[valueNames.length + i] = {
      source: { displayName: at(tooltips.names, i), roles: { tooltips: true }, type: { text: true } },
      values: []
    };
  }

  const rowSettings = groupSettings(inputSettings);
  const identities = new Array<string[]>(groups.length);
  const sourceRows: Record<string, number[]> = {};
  for (let g = 0; g < groups.length; g++) {
    const group = at(groups, g);
    sourceRows[String(g)] = group.rows;
    if (dateParts.length === 0) {
      key.values.push(group.category);
    }
    for (let i = 0; i < dateParts.length; i++) {
      at(categoryColumns, i).values.push(datePartValue(group.category, at(dateParts, i)));
    }
    for (let i = 0; i < group.indicators.length; i++) {
      at(categoryColumns, keyColumnCount + i).values.push(at(group.indicators, i));
    }
    const groupIdentities = new Array<string>(group.rows.length);
    for (let i = 0; i < group.rows.length; i++) {
      groupIdentities[i] = String(crosstalkIdentities[at(group.rows, i)]);
    }
    identities[g] = groupIdentities;
    key.objects.push(rowSettings(at(group.rows, 0)));

    const groupValues = new Array<Cell>(group.rows.length);
    for (let i = 0; i < columns.length; i++) {
      const isValue = i < valueNames.length;
      const column = isValue ? at(valueColumns, i) : at(tooltips.columns, i - valueNames.length);
      for (let j = 0; j < group.rows.length; j++) {
        groupValues[j] = at(column, at(group.rows, j));
      }
      at(columns, i).values.push(aggregateColumn(groupValues, isValue ? aggregations[at(valueNames, i)] : aggregations.tooltips));
    }
  }

  const sources = new Array<FrontendColumn["source"]>(categoryColumns.length + columns.length);
  for (let i = 0; i < sources.length; i++) {
    sources[i] = i < categoryColumns.length ? at(categoryColumns, i).source : at(columns, i - categoryColumns.length).source;
  }
  const dataView: FrontendDataView = {
    categorical: { categories: categoryColumns, values: columns },
    metadata: { columns: sources }
  };
  return { dataViews: [dataView], crosstalk_identities: identities, source_rows: sourceRows };
}
