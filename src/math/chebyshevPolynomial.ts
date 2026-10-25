import at from "../util/at";
/** Clenshaw evaluation of a Chebyshev series; adapted from R's chebyshev_eval. */
export default function chebyshevPolynomial(x: number, a: readonly number[], n: number): number {
  const twox = x * 2;
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  for (let i = 1; i <= n; i++) {
    b2 = b1;
    b1 = b0;
    b0 = twox * b1 - b2 + at(a, n - i);
  }
  return (b0 - b2) * 0.5;
}
