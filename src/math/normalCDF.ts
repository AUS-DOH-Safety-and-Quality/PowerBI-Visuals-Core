import normalCDFImpl from "./normalCDFImpl";

/** Normal CDF; adapted from R's pnorm. */
export default function normalCDF(x: number, mu: number, sigma: number,
                                  lower_tail: boolean = true,
                                  log_p: boolean = false): number {
  if (Number.isNaN(x) || Number.isNaN(mu) || Number.isNaN(sigma)) {
    return x + mu + sigma;
  }

  // x - mu would be Inf - Inf
  if (!Number.isFinite(x) && mu == x) {
    return Number.NaN;
  }

  const zeroBoundLower: number = (lower_tail ? (log_p ? Number.NEGATIVE_INFINITY : 0) : (log_p ? 0 : 1));
  const zeroBoundUpper: number = (lower_tail ? (log_p ? 0 : 1) : (log_p ? Number.NEGATIVE_INFINITY : 0));

  if (sigma <= 0) {
    if (sigma < 0) {
      return Number.NaN;
    }
    return (x < mu) ? zeroBoundLower : zeroBoundUpper;
  }

  let p: number = (x - mu) / sigma;

  if (!Number.isFinite(p)) {
    return (x < mu) ? zeroBoundLower : zeroBoundUpper;
  }

  return normalCDFImpl(p, lower_tail, log_p);
}
