import log1pmx from "./log1pmx";
import normalCDF from "./normalCDF";
import normalDensity from "./normalDensity";

/** Asymptotic Poisson CDF for large lambda and x; adapted from R's ppois_asymp. */
export default function poissonCDFAsymp(x: number, lambda: number,
                                        lower_tail: boolean, log_p: boolean): number {
  const coefs_a: readonly number[] = [
    -1e99, /* placeholder used for 1-indexing */
    2/3.,
    -4/135.,
    8/2835.,
    16/8505.,
    -8992/12629925.,
    -334144/492567075.,
    698752/1477701225.
  ];

  const coefs_b: readonly number[] = [
    -1e99, /* placeholder */
    1/12.,
    1/288.,
    -139/51840.,
    -571/2488320.,
    163879/209018880.,
    5246819/75246796800.,
    -534703531/902961561600.
  ];

  let elfb: number;
  let elfb_term: number;
  let res12: number;
  let res1_term: number;
  let res1_ig: number;
  let res2_term: number;
  let res2_ig: number;
  let dfm: number;
  let pt_: number;
  let s2pt: number;
  let f: number;
  let np: number;
  let i: number;

  dfm = lambda - x;
  pt_ = -log1pmx(dfm / x);

  // Signed root deviance; approximately standard normal
  s2pt = Math.sqrt(2 * x * pt_);
  if (dfm < 0) {
    s2pt = -s2pt;
  }

  res12 = 0;
  res1_ig = res1_term = Math.sqrt(x);
  res2_ig = res2_term = s2pt;
  for (i = 1; i < 8; i++) {
    res12 += res1_ig * coefs_a[i];
    res12 += res2_ig * coefs_b[i];
    res1_term *= pt_ / i;
    res2_term *= 2 * pt_ / (2 * i + 1);
    res1_ig = res1_ig / x + res1_term;
    res2_ig = res2_ig / x + res2_term;
  }

  elfb = x;
  elfb_term = 1;
  for (i = 1; i < 8; i++) {
    elfb += elfb_term * coefs_b[i];
    elfb_term /= x;
  }
  if (!lower_tail) {
    elfb = -elfb;
  }

  f = res12 / elfb;
  np = normalCDF(s2pt, 0, 1, !lower_tail, log_p);

  if (log_p) {
    // Inlined R dpnorm: phi(s2pt) / Phi(s2pt), with a series for large s2pt where exp(np) underflows
    let i_tail: boolean = !lower_tail;
    let n_d_over_p: number;
    if (s2pt < 0) {
      s2pt = -s2pt;
      i_tail = !i_tail;
    }

    if (s2pt > 10 && !i_tail) {
      let term: number = 1 / s2pt;
      let sum: number = term;
      let x2: number = s2pt * s2pt;
      let i: number = 1;

      while (Math.abs(term) > Number.EPSILON * sum) {
        term *= -i / x2;
        sum += term;
        i += 2;
      }

      n_d_over_p = 1 / sum;
    } else {
      let d: number = normalDensity(s2pt, 0, 1, false);
      n_d_over_p =  d / Math.exp(np);
    }

    return np + Math.log1p(f * n_d_over_p);
  } else {
    return np + f * normalDensity(s2pt, 0, 1, log_p);
  }
}
