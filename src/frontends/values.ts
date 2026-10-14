/** A value as the frontends pass it: R and Python send missing values as null */
export type Cell = string | number | boolean | null;
/** A column, or its only value: R unboxes length-one vectors */
export type Column = Cell | readonly Cell[];

/** Array.isArray narrows unknown to any[] */
export function isArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

export function asArray(value: Column): readonly Cell[] {
  return isArray(value) ? value : [value];
}

export function isMissing(value: unknown): boolean {
  return value == null || Number.isNaN(value);
}

export function isPlainObject(value: unknown): value is Readonly<Record<string, unknown>> {
  return Object.prototype.toString.call(value) === "[object Object]";
}

/** Inputs are keyed by user-supplied names, so inherited keys like "constructor" must not match */
export function hasOwn(object: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

/** Undefined and NaN have no JSON form, so calculated values return them as null */
export function limitValue<T>(value: T | undefined): T | null {
  return value === undefined || Number.isNaN(value) ? null : value;
}
