/** Continued fraction for sum_{k>=0} x^k / (i + k*d); adapted from R's logcf. */
export default function logcf(x: number, i: number, d: number, eps: number): number {
  let c1 = 2 * d;
  let c2 = i + d;
  let c4 = c2 + d;
  let a1 = c2;
  let b1 = i * (c2 - i * x);
  let b2 = d * d * x;
  let a2 = c4 * c2 - b2;
  // (2^32)^8 = 2^256, as in R; a power of two keeps rescaling exact.
  const scalefactor = 2 ** 256;

  b2 = c4 * b1 - i * b2;

  while (Math.abs(a2 * b1 - a1 * b2) > Math.abs(eps * b1 * b2)) {
    let c3 = c2 * c2 * x;
    c2 += d;
    c4 += d;
    a1 = c4 * a2 - c3 * a1;
    b1 = c4 * b2 - c3 * b1;

    c3 = c1 * c1 * x;
    c1 += d;
    c4 += d;
    a2 = c4 * a1 - c3 * a2;
    b2 = c4 * b1 - c3 * b2;

    if (Math.abs(b2) > scalefactor) {
      a1 /= scalefactor;
      b1 /= scalefactor;
      a2 /= scalefactor;
      b2 /= scalefactor;
    } else if (Math.abs(b2) < 1 / scalefactor) {
      a1 *= scalefactor;
      b1 *= scalefactor;
      a2 *= scalefactor;
      b2 *= scalefactor;
    }
  }
  return a2 / b2;
}
