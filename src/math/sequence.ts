/** Exactly `count` values from `start` by repeated addition of `step`. */
export default function sequence(start: number, count: number, step: number): number[] {
  const result: number[] = new Array<number>(count);
  if (count > 0) {
    result[0] = start;
  }
  for (let i = 1; i < count; i++) {
    result[i] = result[i - 1] + step;
  }
  return result;
}
