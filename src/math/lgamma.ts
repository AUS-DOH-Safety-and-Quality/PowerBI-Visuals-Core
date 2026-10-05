import gamma from "./gamma.js";
import lgammaCorrection from "./lgammaCorrection.js";
import sinpi from "./sinpi.js";
import { LOG_SQRT_TWO_PI, LOG_SQRT_PI_DIV_2 } from "./constants.js";

// ln|gamma(x)|; +Infinity at non-positive integers; adapted from R's lgammafn.
export default function lgamma(x: number): number {
  if (Number.isNaN(x)) {
    return Number.NaN;
  }
  if (x <= 0 && x === Math.trunc(x)) {
    return Number.POSITIVE_INFINITY;
  }

  const y = Math.abs(x);
  if (y < 1e-306) {
    return -Math.log(y);
  }
  if (y <= 10) {
    return Math.log(Math.abs(gamma(x)));
  }
  // R's xmax = DBL_MAX / log(DBL_MAX): lgamma overflows beyond it.
  if (y > 2.5327372760800758e305) {
    return Number.POSITIVE_INFINITY;
  }

  if (x > 0) {
    if (x > 1e17) {
      return x * (Math.log(x) - 1);
    }
    return LOG_SQRT_TWO_PI + (x - 0.5) * Math.log(x) - x
            + ((x > 4934720) ? 0 : lgammaCorrection(x));
  }

  return LOG_SQRT_PI_DIV_2 + (x - 0.5) * Math.log(y)
          - x - Math.log(Math.abs(sinpi(y))) - lgammaCorrection(y);
}
