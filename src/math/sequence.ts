// Exactly `count` values from `start` by repeated addition of `step`. A count of zero or less
// yields an empty array; count must be an integer (a fractional count throws RangeError).
export default function sequence(start: number, count: number, step: number): number[] {
  if (!(count > 0)) {
    return [];
  }
  const result: number[] = new Array<number>(count);
  result[0] = start;
  for (let i = 1; i < count; i++) {
    result[i] = result[i - 1] + step;
  }
  return result;
}
