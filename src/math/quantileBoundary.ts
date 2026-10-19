/** The quantile at p = 0 or 1 on either scale, NaN outside [0, 1], or undefined when p lies strictly between */
export default function quantileBoundary(p: number, lower_tail: boolean, log_p: boolean, atZero: number, atOne: number): number | undefined {
  if (log_p) {
    if (p > 0) {
      return Number.NaN;
    }
    if (p === 0) {
      return lower_tail ? atOne : atZero;
    }
    if (p === Number.NEGATIVE_INFINITY) {
      return lower_tail ? atZero : atOne;
    }
    return undefined;
  }
  if (p < 0 || p > 1) {
    return Number.NaN;
  }
  if (p === 0) {
    return lower_tail ? atZero : atOne;
  }
  if (p === 1) {
    return lower_tail ? atOne : atZero;
  }
  return undefined;
}
