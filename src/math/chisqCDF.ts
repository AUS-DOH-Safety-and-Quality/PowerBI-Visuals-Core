import gammaCDF from "./gammaCDF";

/** Chi-squared CDF, computed as Gamma(shape = df / 2, scale = 2). */
export default function chisqCDF(x: number, df: number,
                                      lower_tail: boolean = true,
                                      log_p: boolean = false): number {
  return gammaCDF(x, 0.5 * df, 2.0, lower_tail, log_p);
}
