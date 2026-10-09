import poissonDensity from "./poissonDensity";
import lgamma1p from "./lgamma1p";
import { DBL_MIN } from "./constants";
import poissonDensityPrev from "./poissonDensityPrev";
import gammaContFrac from "./gammaContFrac";
import poissonCDFAsymp from "./poissonCDFAsymp";
import log1mExp from "./log1mExp";

/** Unit-scale gamma CDF; adapted from R's pgamma_raw. */
export default function gammaCDFImpl(x: number, alph: number,
                                      lower_tail: boolean = true,
                                      log_p: boolean = false): number {
  let res: number;
  const zeroBoundLower: number = log_p ? Number.NEGATIVE_INFINITY : 0;
  const zeroBoundUpper: number = log_p ? 0 : 1;

  if (x <= 0) {
    return lower_tail ? zeroBoundLower : zeroBoundUpper;
  }

  if (x >= Number.POSITIVE_INFINITY) {
    return lower_tail ? zeroBoundUpper : zeroBoundLower;
  }

  // R's pgamma_smallx (Abramowitz & Stegun 6.5.29)
  if (x < 1) {
    let sum: number = 0;
    let c: number = alph;
    let n: number = 0;
    let term: number = 1;
    while (Math.abs(term) > Number.EPSILON * Math.abs(sum)) {
      n++;
      c *= -x / n;
      term = c / (alph + n);
      sum += term;
    }

    if (lower_tail) {
      const f1: number = log_p ? Math.log1p(sum) : 1 + sum;
      let f2: number;
      if (alph > 1) {
        f2 = poissonDensity(alph, x, log_p);
        f2 = log_p ? f2 + x : f2 * Math.exp(x);
      } else if (log_p) {
        f2 = alph * Math.log(x) - lgamma1p(alph);
      } else {
        f2 = Math.pow(x, alph) / Math.exp(lgamma1p(alph));
      }
      res = log_p ? f1 + f2 : f1 * f2;
    } else {
      const lf2: number = alph * Math.log(x) - lgamma1p(alph);

      if (log_p) {
        res = log1mExp(Math.log1p(sum) + lf2);
      } else {
        let f1m1: number = sum;
        let f2m1: number = Math.expm1(lf2);
        res =  -(f1m1 + f2m1 + f1m1 * f2m1);
      }
    }
  } else if (x <= alph - 1 && x < 0.8 * (alph + 50)) {
    // R's pd_upper_series
    let y: number = alph;
    let term: number = x / y;
    let sum: number = term;

    while (term > Number.EPSILON * sum) {
      y++;
      term *= x / y;
      sum += term;
    }
    sum = log_p ? Math.log(sum) : sum;
    const d: number = poissonDensityPrev(alph, x, log_p);
    if (!lower_tail) {
      res = log_p ? log1mExp(d + sum) : 1 - d * sum;
    } else {
      res = log_p ? sum + d : sum * d;
    }
  } else if (alph - 1 < x && alph < 0.8 * (x + 50)) {
    // R's pd_lower_series, with pd_lower_cf for the fractional remainder
    let sum: number = 0;
    const d: number = poissonDensityPrev(alph, x, log_p);
    if (alph < 1) {
      if (x * Number.EPSILON > 1 - alph) {
        sum = log_p ? 0 : 1;
      } else {
        const f: number = gammaContFrac(alph, x - (alph - 1)) * x / alph;
        sum = log_p ? Math.log(f) : f;
      }
    } else {
      let term: number = 1;
      let y: number = alph - 1;

      while (y >= 1 && term > sum * Number.EPSILON) {
        term *= y / x;
        sum += term;
        y--;
      }

      if (y != Math.floor(y)) {
        sum += term * gammaContFrac(y, x + 1 - y);
      }

      sum = log_p ? Math.log1p(sum) : 1 + sum;
    }

    if (!lower_tail) {
      res = log_p ? sum + d : sum * d;
    } else {
      res = log_p ? log1mExp(d + sum) : 1 - d * sum;
    }
  } else {
    res = poissonCDFAsymp(alph - 1, x, !lower_tail, log_p);
  }

  // Results near DBL_MIN lose accuracy to underflow, so redo in log space
  if (!log_p && res < DBL_MIN / Number.EPSILON) {
    return Math.exp(gammaCDFImpl(x, alph, lower_tail, true));
  }

  return res;
}
