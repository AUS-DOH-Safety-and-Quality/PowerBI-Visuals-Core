import at from "../util/at";
/** Linearly interpolated q-quantile of ascending-sorted values; NaN without values or for q outside [0, 1]. */
export default function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0 || !(q >= 0 && q <= 1)) {
    return NaN;
  }
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;

  const value = at(sorted, base);
  const next = sorted[base + 1];
  if (next === undefined) {
    return value;
  }
  return value + rest * (next - value);
}
