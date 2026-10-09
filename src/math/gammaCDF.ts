import gammaCDFImpl from "./gammaCDFImpl";

/** Gamma CDF; adapted from R's pgamma. */
export default function gammaCDF(x: number, alpha: number, scale: number,
                                  lower_tail: boolean = true,
                                  log_p: boolean = false): number {
  if (Number.isNaN(x) || Number.isNaN(alpha) || Number.isNaN(scale)) {
    return x + alpha + scale;
  }

  if (alpha < 0 || scale <= 0) {
    return Number.NaN;
  }

  x /= scale;
  if (Number.isNaN(x)) {
    return x;
  }

  if (alpha === 0) {
    const zeroBoundLower: number = log_p ? Number.NEGATIVE_INFINITY : 0;
    const zeroBoundUpper: number = log_p ? 0 : 1;
    return (x <= 0) ? (lower_tail ? zeroBoundLower : zeroBoundUpper)
                    : (lower_tail ? zeroBoundUpper : zeroBoundLower);
  }

  return gammaCDFImpl(x, alpha, lower_tail, log_p);
}
