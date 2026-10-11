/** The values at the kept positions, which validation guarantees are present */
export default function keptValues<T>(values: readonly (T | undefined)[], kept: readonly number[]): T[] {
  const result = new Array<T>(kept.length);
  for (let i = 0; i < kept.length; i++) {
    const value = values[kept[i]];
    if (value === undefined) {
      throw new Error("Validated row contains a missing value.");
    }
    result[i] = value;
  }
  return result;
}
