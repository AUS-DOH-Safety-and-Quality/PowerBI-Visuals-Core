import { ONE_DIV_SQRT_TWO_PI, LOG_SQRT_TWO_PI } from "./constants";
import ldexp from "./ldexp";

/** Normal density; adapted from R's dnorm. */
export default function normalDensity(x: number, mu: number, sigma: number,
                                      log_p: boolean = false): number {
  if (Number.isNaN(x) || Number.isNaN(mu) || Number.isNaN(sigma)) {
    return x + mu + sigma;
  }

  if (sigma < 0) {
    return Number.NaN;
  }

  const zeroBound: number = log_p ? Number.NEGATIVE_INFINITY : 0;

  if (!Number.isFinite(sigma)) {
    return zeroBound;
  }

  // x - mu would be Inf - Inf
  if (!Number.isFinite(x) && mu == x) {
    return Number.NaN;
  }

  if (sigma == 0) {
    return (x == mu) ? Number.POSITIVE_INFINITY : zeroBound;
  }

  const z: number = (x - mu) / sigma;

  if (!Number.isFinite(z)) {
    return zeroBound;
  }

  const absZ: number = Math.abs(z);

  if (absZ >= 2 * Math.sqrt(Number.MAX_VALUE)) {
    return zeroBound;
  }

  if (log_p) {
    return -(LOG_SQRT_TWO_PI + 0.5 * absZ * absZ + Math.log(sigma));
  }

  if (absZ < 5) {
    return ONE_DIV_SQRT_TWO_PI * Math.exp(-0.5 * absZ * absZ) / sigma;
  }

  // R's sqrt(-2 ln2 (DBL_MIN_EXP + 1 - DBL_MANT_DIG)): exp(-z²/2) underflows beyond it
  if (absZ > 38.56804181549334 ) {
    return 0;
  }

  // |z| = x1 + x2 with x1 truncated to 16 fractional bits avoids precision loss in z²:
  // exp(-z²/2) = exp(-x1²/2) * exp((-x2/2 - x1) * x2)
  let x1: number = ldexp(Math.trunc(ldexp(absZ, 16)), -16);
  let x2: number = absZ - x1;
  return ONE_DIV_SQRT_TWO_PI / sigma
          * (Math.exp(-0.5 * x1 * x1) * Math.exp((-0.5 * x2 - x1) * x2));
}
