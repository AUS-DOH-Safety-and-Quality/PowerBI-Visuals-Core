import type powerbi from "powerbi-visuals-api";
import groupCategoryRows from "../powerbi/groupCategoryRows";
import { aggregateColumn, valueRoles, type Aggregations, type ValueRole } from "./aggregations";
import type { InputSettings } from "./chartSettings";
import { asArray, isArray, isMissing, type Cell, type Column } from "./values";

export type RawData = {
  readonly categories: Column;
  /** Categories with levels (e.g., R factors) are ordered by level rather than value */
  readonly category_levels?: Column | null;
  /** Rows without Crosstalk keys are identified by position */
  readonly crosstalk_identities?: Column | null;
  readonly indicators?: Readonly<Record<string, Column>> | null;
  readonly tooltips?: Readonly<Record<string, Column>> | null;
} & { readonly [R in ValueRole]?: Column | null };

/** A column as the visuals read it; R and Python round-trip these as JSON */
export type FrontendColumn = {
  readonly source: Omit<powerbi.DataViewMetadataColumn, "displayName"> & { readonly displayName?: string };
  readonly values: Cell[];
};

/** The key column carries each row's settings */
export type KeyColumn = FrontendColumn & { readonly objects: InputSettings[] };

export type FrontendDataView = {
  readonly categorical: { readonly categories: readonly [KeyColumn, ...FrontendColumn[]]; readonly values: readonly FrontendColumn[] };
  readonly metadata: {
    readonly columns: readonly FrontendColumn["source"][];
    readonly objects?: { readonly misc: { readonly group: string } };
  };
};

/** Each row's Crosstalk keys: by category name, or by position when indicators repeat the categories */
export type CrosstalkIdentities = string[][] | Record<string, string[]>;

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
  const names = Object.keys(columns ?? {});
  const values = new Array<readonly Cell[]>(names.length);
  for (let i = 0; i < names.length; i++) {
    values[i] = asArray(columns?.[names[i]] ?? null);
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

type CategoryGroup = { category: string | null; indicators: Cell[]; rows: number[] };

/** Rows sorted by indicator then category, and grouped by both; rows outside the Crosstalk filter are dropped */
function groupRows(categories: readonly Cell[], categoryOrder: readonly (Cell | undefined)[], indicatorColumns: readonly (readonly Cell[])[],
                   crosstalkIdentities: readonly Cell[], crosstalkFilters: readonly string[] | undefined): CategoryGroup[] {
  const filters = crosstalkFilters === undefined ? undefined : new Set(crosstalkFilters);
  const order = new Array<number>(categories.length);
  for (let i = 0; i < order.length; i++) {
    order[i] = i;
  }
  order.sort((a, b) => {
    for (let i = 0; i < indicatorColumns.length; i++) {
      const comparison = compareValues(indicatorColumns[i][a], indicatorColumns[i][b]);
      if (comparison !== 0) {
        return comparison;
      }
    }
    return compareValues(categoryOrder[a], categoryOrder[b]);
  });

  const groups = new Map<string, CategoryGroup>();
  for (let i = 0; i < order.length; i++) {
    const row = order[i];
    if (filters !== undefined && !filters.has(String(crosstalkIdentities[row]))) {
      continue;
    }
    const category = isMissing(categories[row]) ? null : String(categories[row]);
    const indicators = new Array<Cell>(indicatorColumns.length);
    for (let j = 0; j < indicatorColumns.length; j++) {
      indicators[j] = indicatorColumns[j][row];
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
  const groupNames = Object.keys(inputSettings);
  let conditional = false;
  for (let i = 0; i < groupNames.length && !conditional; i++) {
    const group = inputSettings[groupNames[i]];
    const names = Object.keys(group);
    for (let j = 0; j < names.length && !conditional; j++) {
      conditional = isArray(group[names[j]]);
    }
  }
  if (!conditional) {
    return () => inputSettings;
  }
  return row => {
    const settings: Record<string, Record<string, unknown>> = {};
    for (let i = 0; i < groupNames.length; i++) {
      const group = inputSettings[groupNames[i]];
      const rowGroup: Record<string, unknown> = {};
      const names = Object.keys(group);
      for (let j = 0; j < names.length; j++) {
        const value = group[names[j]];
        rowGroup[names[j]] = isArray(value) ? value[row] : value;
      }
      settings[groupNames[i]] = rowGroup;
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
    const column = rawData[valueRoles[i]];
    if (column != null) {
      valueNames.push(valueRoles[i]);
      valueColumns.push(asArray(column));
    }
  }
  const indicators = namedColumns(rawData.indicators);
  const tooltips = namedColumns(rawData.tooltips);
  const hasIndicators = indicators.names.length > 0;
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
  let categoryOrder: readonly (Cell | undefined)[] = categories;
  if (rawData.category_levels != null) {
    const levels = asArray(rawData.category_levels);
    const ranks = new Map<Cell, number>();
    for (let i = 0; i < levels.length; i++) {
      ranks.set(levels[i], i);
    }
    const ranked = new Array<number | undefined>(categories.length);
    for (let i = 0; i < categories.length; i++) {
      ranked[i] = ranks.get(categories[i]);
    }
    categoryOrder = ranked;
  }
  const groups = groupRows(categories, categoryOrder, indicators.columns, crosstalkIdentities, crosstalkFilters);

  const key: KeyColumn = {
    source: { roles: { key: true }, type: hasDateCategories(categories) ? { temporal: {} } : { text: true } },
    values: [],
    objects: []
  };
  const categoryColumns: [KeyColumn, ...FrontendColumn[]] = [key];
  for (let i = 0; i < indicators.names.length; i++) {
    categoryColumns.push({ source: { displayName: indicators.names[i], roles: { indicator: true } }, values: [] });
  }
  const columns = new Array<FrontendColumn>(valueNames.length + tooltips.names.length);
  for (let i = 0; i < valueNames.length; i++) {
    columns[i] = { source: { roles: { [valueNames[i]]: true } }, values: [] };
  }
  // The visuals format tooltip values by type, and label them by name
  for (let i = 0; i < tooltips.names.length; i++) {
    columns[valueNames.length + i] = {
      source: { displayName: tooltips.names[i], roles: { tooltips: true }, type: { text: true } },
      values: []
    };
  }

  const rowSettings = groupSettings(inputSettings);
  const byPosition: string[][] = [];
  const byCategory: Record<string, string[]> = {};
  const sourceRows: Record<string, number[]> = {};
  for (let g = 0; g < groups.length; g++) {
    const group = groups[g];
    sourceRows[String(g)] = group.rows;
    key.values.push(group.category);
    for (let i = 0; i < group.indicators.length; i++) {
      categoryColumns[i + 1].values.push(group.indicators[i]);
    }
    const groupIdentities = new Array<string>(group.rows.length);
    for (let i = 0; i < group.rows.length; i++) {
      groupIdentities[i] = String(crosstalkIdentities[group.rows[i]]);
    }
    if (hasIndicators) {
      byPosition.push(groupIdentities);
    } else {
      byCategory[String(group.category)] = groupIdentities;
    }
    key.objects.push(rowSettings(group.rows[0]));

    const groupValues = new Array<Cell>(group.rows.length);
    for (let i = 0; i < columns.length; i++) {
      const isValue = i < valueNames.length;
      const column = isValue ? valueColumns[i] : tooltips.columns[i - valueNames.length];
      for (let j = 0; j < group.rows.length; j++) {
        groupValues[j] = column[group.rows[j]];
      }
      columns[i].values.push(aggregateColumn(groupValues, isValue ? aggregations[valueNames[i]] : aggregations.tooltips));
    }
  }

  const sources = new Array<FrontendColumn["source"]>(categoryColumns.length + columns.length);
  for (let i = 0; i < sources.length; i++) {
    sources[i] = i < categoryColumns.length ? categoryColumns[i].source : columns[i - categoryColumns.length].source;
  }
  const group = inputSettings.misc?.group;
  const dataView: FrontendDataView = {
    categorical: { categories: categoryColumns, values: columns },
    metadata: hasIndicators && (typeof group === "string" || typeof group === "number")
      ? { columns: sources, objects: { misc: { group: groupCategoryRows([{ values: [String(group)] }], 1).keys[0] } } }
      : { columns: sources }
  };
  return { dataViews: [dataView], crosstalk_identities: hasIndicators ? byPosition : byCategory, source_rows: sourceRows };
}
