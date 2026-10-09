import poissonDensity from "./poissonDensity";
import lgamma from "./lgamma";

/** Poisson density at x_plus_1 - 1; adapted from R's dpois_wrap. */
export default function poissonDensityPrev(x_plus_1: number, lambda: number, log_p: boolean): number {
  if (!Number.isFinite(lambda)) {
    return log_p ? Number.NEGATIVE_INFINITY : 0;
  }

  if (x_plus_1 > 1) {
    return poissonDensity(x_plus_1 - 1, lambda, log_p);
  }

  // R's M_cutoff = ln(2) * DBL_MAX_EXP / DBL_EPSILON: beyond it log(exp(-x) * k^x) ≈ -x
  const M_cutoff: number = 3.196577161300664E18;

  if (lambda > Math.abs(x_plus_1 - 1) * M_cutoff) {
    const rtn: number = -lambda - lgamma(x_plus_1);
    return log_p ? rtn : Math.exp(rtn);
  }

  // f(x) = f(x+1) * (x+1) / lambda, scaled in the requested space as R does.
  const d: number = poissonDensity(x_plus_1, lambda, log_p);
  return log_p ? d + Math.log(x_plus_1 / lambda) : d * (x_plus_1 / lambda);
}
