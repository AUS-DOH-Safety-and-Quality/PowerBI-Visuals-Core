/** Ordinary least-squares line through (i + 1, values[i]), evaluated at each position. */
export default function calculateTrendLine(values: readonly number[]): number[] {
  const n: number = values.length;

  // Fewer than two points have no slope; the fit is the points themselves
  if (n < 2) {
    return values.slice();
  }

  let sumY: number = 0;
  let sumX: number = 0;
  let sumXY: number = 0;
  let sumX2: number = 0;

  for (let i = 0; i < n; i++) {
    const x: number = i + 1;
    const y: number = values[i];

    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  const slope: number = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

  const intercept: number = (sumY - slope * sumX) / n;

  const trendLine: Array<number> = new Array(n);
  for (let i = 0; i < n; i++) {
    trendLine[i] = slope * (i + 1) + intercept;
  }

  return trendLine;
}
