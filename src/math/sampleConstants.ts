import lgamma from "./lgamma";
import lgammaCorrection from "./lgammaCorrection";
import log1pmx from "./log1pmx";

/** log(c4(n)) = lgamma(a + 1/2) - lgamma(a) - log(a) / 2, with a = (n - 1) / 2 */
function logC4(sampleSize: number): number {
  const a: number = (sampleSize - 1) / 2;
  if (a < 10) {
    return lgamma(a + 0.5) - lgamma(a) - 0.5 * Math.log(a);
  }
  // Stirling's series, as R's lgamma uses for a >= 10, without the cancelling log terms
  return a * log1pmx(0.5 / a) + lgammaCorrection(a + 0.5) - lgammaCorrection(a);
}

/**
 * Bias correction for the sample SD: E[s] = c4 * sigma.
 * @see https://en.wikipedia.org/wiki/Unbiased_estimation_of_standard_deviation
 */
export function c4(sampleSize: number): number {
  return Math.exp(logC4(sampleSize));
}

/** Relative SD of the sample SD: SD(s) = c5 * sigma, with c5 = sqrt(1 - c4^2). */
export function c5(sampleSize: number): number {
  return Math.sqrt(-Math.expm1(2 * logC4(sampleSize)));
}

/**
 * X-bar chart 3-sigma limits from the mean sample SD: x̿ ± A3 * s̄.
 * @see https://en.wikipedia.org/wiki/Xbar_and_s_chart
 */
export function a3(sampleSize: number): number {
  return 3.0 / (c4(sampleSize) * Math.sqrt(sampleSize));
}
