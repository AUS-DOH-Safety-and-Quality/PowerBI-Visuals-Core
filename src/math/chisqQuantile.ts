import gammaQuantile from "./gammaQuantile";

/** Chi-squared quantile, computed as Gamma(shape = df / 2, scale = 2). */
export default function chisqQuantile(p: number, df: number,
                                      lower_tail: boolean = true,
                                      log_p: boolean = false): number {
  return gammaQuantile(p, 0.5 * df, 2.0, lower_tail, log_p);
}
