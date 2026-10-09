import lgamma1p from "./lgamma1p";
import stirlingError from "./stirlingError";
import { DBL_MIN, TWO_PI, SQRT_TWO_PI } from "./constants";
import binomialDeviance from "./binomialDeviance";

/** Poisson density for continuous x; adapted from R's dpois_raw. */
export default function poissonDensity(x: number, lambda: number, log_p: boolean): number {
  const zeroBound: number = log_p ? Number.NEGATIVE_INFINITY : 0;

  if (lambda === 0) {
    return (x === 0) ? (log_p ? 0 : 1) : zeroBound ;
  }

  if (!Number.isFinite(lambda) || x < 0) {
    return zeroBound;
  }

  if (x <= lambda * DBL_MIN) {
    return log_p ? -lambda : Math.exp(-lambda);
  }

  if (lambda < x * DBL_MIN) {
    if (!Number.isFinite(x)) {
      return zeroBound;
    }

    const rtn: number = -lambda + x * Math.log(lambda) -lgamma1p(x);
    return log_p ? rtn : Math.exp(rtn);
  }

  // exp(-stirlingError(x) - bd0(x, lambda)) / sqrt(2*pi*x) avoids cancellation for x ≈ lambda
  const dev = binomialDeviance(x, lambda);
  const yh: number = dev.yh;
  const yl: number = dev.yl + stirlingError(x);

  // R's x_LRG = 2^1023 / pi: beyond it 2*pi*x overflows, so use sqrt(2*pi) * sqrt(x)
  const Lrg_x: boolean = (x >= 2.86111748575702815380240589208115399625e307);
  const r: number = Lrg_x ? SQRT_TWO_PI * Math.sqrt(x)
                          : TWO_PI * x;

  return log_p ? -yl - yh - (Lrg_x ? Math.log(r) : 0.5 * Math.log(r))
                : Math.exp(-yl) * Math.exp(-yh) / (Lrg_x ? r : Math.sqrt(r));
}
