/** Largest value; -Infinity for empty input. */
export default function max(values: readonly number[]): number {
  let result = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < values.length; i++) {
    if (values[i] > result) {
      result = values[i];
    }
  }
  return result;
}
