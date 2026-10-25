import at from "../util/at";
/** Sorts an owned copy; returns NaN for empty input. */
export default function median(values: readonly number[]): number {
  const n = values.length;
  if (n === 0) {
    return Number.NaN;
  }
  const sorted = [...values].sort((a: number, b: number) => a - b);
  const mid = Math.floor(n / 2);
  if (n % 2 === 0) {
    return (at(sorted, mid - 1) + at(sorted, mid)) / 2;
  }
  return at(sorted, mid);
}
