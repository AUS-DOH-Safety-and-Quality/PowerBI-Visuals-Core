/** The value at a kept position, which validation guarantees is present */
export function keptValue<T>(values: readonly (T | undefined)[] | undefined, position: number): T {
  const value = values?.[position];
  if (value === undefined) {
    throw new Error("Validated row contains a missing value.");
  }
  return value;
}

/** The values at the kept positions */
export default function keptValues<T>(values: readonly (T | undefined)[], kept: readonly number[]): T[] {
  const result = new Array<T>(kept.length);
  for (let i = 0; i < kept.length; i++) {
    result[i] = keptValue(values, kept[i]);
  }
  return result;
}
