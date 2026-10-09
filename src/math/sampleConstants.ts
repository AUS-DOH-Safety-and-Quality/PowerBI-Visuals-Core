import lgamma from "./lgamma";

/**
 * Bias correction for the sample SD: E[s] = c4 * sigma.
 * @see https://en.wikipedia.org/wiki/Unbiased_estimation_of_standard_deviation
 */
export function c4(sampleSize: number): number {
  const Nminus1: number = sampleSize - 1;

  // lgamma avoids overflowing Γ for large n
  return Math.sqrt(2.0 / Nminus1)
          * Math.exp(lgamma(sampleSize / 2.0) - lgamma(Nminus1 / 2.0));
}

/** Relative SD of the sample SD: SD(s) = c5 * sigma, with c5 = sqrt(1 - c4^2). */
export function c5(sampleSize: number): number {
  return Math.sqrt(1 - Math.pow(c4(sampleSize), 2));
}

/**
 * X-bar chart 3-sigma limits from the mean sample SD: x̿ ± A3 * s̄.
 * @see https://en.wikipedia.org/wiki/Xbar_and_s_chart
 */
export function a3(sampleSize: number): number {
  return 3.0 / (c4(sampleSize) * Math.sqrt(sampleSize));
}
