import at from "../util/at";
/** Largest value; -Infinity for empty input. */
export default function max(values: readonly number[]): number {
  let result = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < values.length; i++) {
    const value = at(values, i);
    if (value > result) {
      result = value;
    }
  }
  return result;
}
