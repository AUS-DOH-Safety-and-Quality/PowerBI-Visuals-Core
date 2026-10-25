import normalCDFImpl from "./normalCDFImpl";

/** Normal CDF; adapted from R's pnorm. */
export default function normalCDF(x: number, mu: number, sigma: number,
                                  lower_tail: boolean = true,
                                  log_p: boolean = false): number {
  if (Number.isNaN(x) || Number.isNaN(mu) || Number.isNaN(sigma)) {
    return Number.NaN;
  }

  // x - mu would be Inf - Inf
  if (!Number.isFinite(x) && mu === x) {
    return Number.NaN;
  }

  let zeroBoundLower: number;
  let zeroBoundUpper: number;
  if (lower_tail) {
    zeroBoundLower = log_p ? Number.NEGATIVE_INFINITY : 0;
    zeroBoundUpper = log_p ? 0 : 1;
  } else {
    zeroBoundLower = log_p ? 0 : 1;
    zeroBoundUpper = log_p ? Number.NEGATIVE_INFINITY : 0;
  }

  if (sigma < 0) {
    return Number.NaN;
  }

  if (sigma === 0) {
    return (x < mu) ? zeroBoundLower : zeroBoundUpper;
  }

  const p: number = (x - mu) / sigma;

  if (!Number.isFinite(p)) {
    return (x < mu) ? zeroBoundLower : zeroBoundUpper;
  }

  return normalCDFImpl(p, lower_tail, log_p);
}
