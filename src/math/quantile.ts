/** Linearly interpolated q-quantile of ascending-sorted values; NaN without values or for q outside [0, 1]. */
export default function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0 || !(q >= 0 && q <= 1)) {
    return NaN;
  }
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;

  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  } else {
    return sorted[base];
  }
}
