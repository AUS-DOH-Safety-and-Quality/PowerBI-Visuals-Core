// Returns NaN for empty input.
export default function mean(values: readonly number[]): number {
  const n = values.length;
  if (n === 0) {
    return Number.NaN;
  }
  let total = 0;
  for (let i = 0; i < n; i++) {
    total += values[i];
  }
  return total / n;
}
