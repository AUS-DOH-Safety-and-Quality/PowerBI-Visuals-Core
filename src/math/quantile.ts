/** Linearly interpolated q-quantile of ascending-sorted values; undefined if empty. */
export default function quantile(sorted: readonly number[], q: number): number | undefined {
  if (sorted.length === 0) {
    return undefined;
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
