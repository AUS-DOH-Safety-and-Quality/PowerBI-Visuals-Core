import { DBL_MIN } from "./constants";
import gammaCDF from "./gammaCDF";
import gammaDensity from "./gammaDensity";

/** Final Newton steps of qgamma from the chi-squared-scale estimate ch; adapted from R's qgamma. */
export default function gammaNewtonIter(ch: number, p: number, alpha: number, scale: number,
                                        lower_tail: boolean, log_p: boolean,
                                        max_it_Newton: number, EPS_N: number): number {
  let x: number = 0.5 * scale * ch;

  if (max_it_Newton === 0) {
    return x;
  }

  // Newton steps run in log scale for precision
  if (!log_p) {
    p = Math.log(p);
    log_p = true;
  }

  let p_: number;

  if (x === 0) {
    const _1_p: number = 1. + 1e-7;
    const _1_m: number = 1. - 1e-7;
    x = DBL_MIN;
    p_ = gammaCDF(x, alpha, scale, lower_tail, log_p);
    if ((lower_tail && p_ > p * _1_p) || (!lower_tail && p_ < p * _1_m)) {
      return 0;
    }
  } else {
    p_ = gammaCDF(x, alpha, scale, lower_tail, log_p);
  }

  if (p_ === Number.NEGATIVE_INFINITY) {
    return 0;
  }

  const zeroBound: number = log_p ? Number.NEGATIVE_INFINITY : 0;

  for (let i = 1; i <= max_it_Newton; i++) {
    const p1: number = p_ - p;
    if(Math.abs(p1) < Math.abs(EPS_N * p)) {
      break;
    }

    const g: number = gammaDensity(x, alpha, scale, log_p);
    if (g === zeroBound) {
      break;
    }

    // In log scale f = log P - p and f' = P'/P, so f/f' = p1 * exp(p_ - g)
    let t = log_p ? p1 * Math.exp(p_ - g) : p1 / g;
    t = lower_tail ? x - t : x + t;
    p_ = gammaCDF(t, alpha, scale, lower_tail, log_p);

    // Stop on no improvement, or flip-flopping
    const absDiff: number = Math.abs(p_ - p);
    const absP1: number = Math.abs(p1);
    if (absDiff > absP1 || (i > 1 && absDiff === absP1)) {
      break;
    }
    x = t;
  }

  return x;
}
