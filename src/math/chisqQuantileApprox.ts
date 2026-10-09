import lgamma1p from "./lgamma1p";
import normalQuantile from "./normalQuantile";
import logP from "./logP";

/** Starting value for qgamma, with g = lgamma(nu / 2); adapted from R's qchisq_appr. */
export default function chisqQuantileApprox(p: number, nu: number, g: number,
                                            lower_tail: boolean = true,
                                            log_p: boolean = false,
                                            tol: number): number {
  if (Number.isNaN(p) || Number.isNaN(nu)) {
    return p + nu;
  }

  if ((log_p && p > 0) || (!log_p && (p < 0 || p > 1)) || nu <= 0) {
    return Number.NaN;
  }

  const alpha: number = 0.5 * nu;
  let p1: number = logP(p, lower_tail, log_p);

  if (nu < -1.24 * p1) {
    const lgam1pa: number = (alpha < 0.5) ? lgamma1p(alpha)
                                          : ((Math.log(nu) - Math.LN2) + g);
    return Math.exp((lgam1pa + p1) / alpha + Math.LN2);
  }

  const c: number = alpha - 1;

  // Wilson-Hilferty
  if (nu > 0.32) {
    const x: number = normalQuantile(p, 0, 1, lower_tail, log_p);
    p1 = 2 / (9 * nu);
    const ch: number = nu * Math.pow(x * Math.sqrt(p1) + 1 - p1, 3);

    // p tending to 1
    return (ch > 2.2 * nu + 6)
            ? -2 * (logP(p, !lower_tail, log_p) - c * (Math.log(ch) - Math.LN2) + g)
            : ch;
  }

  // 1.24 * -log(p) <= nu <= 0.32
  const C7: number = 4.67;
  const C8: number = 6.66;
  const C9: number = 6.73;
  const C10: number = 13.32;

  let ch: number = 0.4;
  let p2: number = 0;
  let q: number = 0;
  let t: number = 0;
  const a: number = logP(p, !lower_tail, log_p) + g + c * Math.LN2;

  while (Math.abs(q - ch) > tol * Math.abs(ch)) {
    q = ch;
    p1 = 1 / (1 + ch * (C7 + ch));
    p2 = ch * (C9 + ch * (C8 + ch));
    t = -0.5 + (C7 + 2 * ch) * p1 - (C9 + ch * (C10 + 3 * ch)) / p2;
    ch -= (1 - Math.exp(a + 0.5 * ch) * p2 * p1) / t;
  }

  return ch;
}
