import { hasOwn, isMissing, isPlainObject, type Cell } from "./values";

const aggregationMethods = ["first", "last", "sum", "mean", "min", "max", "median", "count"] as const;
export type AggregationMethod = typeof aggregationMethods[number];

/** The value roles, which with the tooltips are aggregated within each category */
export const valueRoles = ["numerators", "denominators", "groupings", "xbar_sds", "labels"] as const;
export type ValueRole = typeof valueRoles[number];
type AggregatedRole = ValueRole | "tooltips";
export type Aggregations = Readonly<Record<AggregatedRole, AggregationMethod>>;

const defaultAggregations: Aggregations = {
  numerators: "sum",
  denominators: "sum",
  groupings: "first",
  xbar_sds: "first",
  tooltips: "first",
  labels: "first"
};

function isAggregationMethod(value: unknown): value is AggregationMethod {
  for (let i = 0; i < aggregationMethods.length; i++) {
    if (aggregationMethods[i] === value) {
      return true;
    }
  }
  return false;
}

function isAggregatedRole(name: string): name is AggregatedRole {
  return hasOwn(defaultAggregations, name);
}

/** Missing values are skipped; null when none remain */
export function aggregateColumn(column: readonly Cell[], aggregation: AggregationMethod): Cell {
  if (aggregation === "first") {
    return column[0];
  }
  if (aggregation === "last") {
    return column[column.length - 1];
  }
  const values: number[] = [];
  let sum = 0;
  for (let i = 0; i < column.length; i++) {
    const value = column[i];
    if (!isMissing(value)) {
      values.push(Number(value));
      sum += Number(value);
    }
  }
  if (values.length === 0) {
    return null;
  }
  switch (aggregation) {
    case "sum":
      return sum;
    case "mean":
      return sum / values.length;
    case "count":
      return values.length;
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
    case "median": {
      values.sort((a, b) => a - b);
      const mid = Math.floor(values.length / 2);
      return values.length % 2 !== 0 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
    }
  }
}

export function chartAggregations(aggregations: unknown): { aggregations: Aggregations } | { error: string } {
  if (aggregations != null && !isPlainObject(aggregations)) {
    return { error: "Aggregations must be named." };
  }
  const result: Record<AggregatedRole, AggregationMethod> = { ...defaultAggregations };
  const names = Object.keys(aggregations ?? {});
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    const method = aggregations?.[name];
    if (!isAggregatedRole(name)) {
      const options = Object.keys(defaultAggregations).join(", ");
      return { error: `'${name}' is not a valid variable to aggregate. Valid options are: ${options}.` };
    }
    if (!isAggregationMethod(method)) {
      return { error: `'${String(method)}' is not a valid aggregation. Valid options are: ${aggregationMethods.join(", ")}.` };
    }
    result[name] = method;
  }
  return { aggregations: result };
}
