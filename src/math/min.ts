// Matches Math.min: NaN propagates, empty input is Infinity, -0 orders below +0.
export default function min(values: readonly number[]): number {
  let result = Number.POSITIVE_INFINITY;
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (Number.isNaN(value)) {
      return Number.NaN;
    }
    if (value < result || (value === 0 && result === 0 && Object.is(value, -0))) {
      result = value;
    }
  }
  return result;
}
