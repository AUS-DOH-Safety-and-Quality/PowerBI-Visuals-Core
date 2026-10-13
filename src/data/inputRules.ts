import isNullOrUndefined from "./isNullOrUndefined";
import type { RowRule } from "./validateRows";

export type NumberSeries = readonly (number | undefined)[] | undefined;

/** How the messages name a column: "Numerator", "numerators" */
export type Quantity = { readonly name: string; readonly plural: string };

export const quantity = {
  numerator: { name: "Numerator", plural: "numerators" },
  denominator: { name: "Denominator", plural: "denominators" }
} as const satisfies Record<string, Quantity>;

/** The row's value, NaN when absent so number comparisons stay false */
export function valueAt(values: NumberSeries, index: number): number {
  return values?.[index] ?? NaN;
}

export function missingRule(values: readonly unknown[] | undefined, named: Quantity): RowRule {
  return {
    fails: i => isNullOrUndefined(values?.[i]),
    message: `${named.name} missing`,
    all: `All ${named.plural} are missing or null!`
  };
}

export function nanRule(values: NumberSeries, named: Quantity): RowRule {
  return {
    fails: i => Number.isNaN(valueAt(values, i)),
    message: `${named.name} is not a number`,
    all: `All ${named.plural} are not numbers!`
  };
}

export function negativeRule(values: NumberSeries, named: Quantity): RowRule {
  return {
    fails: i => valueAt(values, i) < 0,
    message: `${named.name} negative`,
    all: `All ${named.plural} are negative!`
  };
}

/** Fails only when both are numbers, so missing values report under their own rules */
export function ratioRule(numerators: NumberSeries, denominators: NumberSeries): RowRule {
  return {
    fails: i => valueAt(denominators, i) < valueAt(numerators, i),
    message: "Denominator < numerator",
    all: "All denominators are smaller than numerators!"
  };
}
