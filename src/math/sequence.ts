/** Exactly `count` values from `start` by repeated addition of `step`. */
export default function sequence(start: number, count: number, step: number): number[] {
  const result: number[] = new Array<number>(count);
  let value = start;
  for (let i = 0; i < count; i++) {
    result[i] = value;
    value += step;
  }
  return result;
}
