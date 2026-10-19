/** sin(pi * x) with exact results at multiples of 1/2; adapted from R's sinpi, accurate near odd integers as libm's sinpi is. */
export default function sinpi(x: number): number {
  if (Number.isNaN(x) || !Number.isFinite(x)) {
    return Number.NaN;
  }
  let r = x % 2;
  if (r <= -1) {
    r += 2;
  } else if (r > 1) {
    r -= 2;
  }
  if (r === 0 || r === 1) {
    return 0;
  }
  if (r === 0.5) {
    return 1;
  }
  if (r === -0.5) {
    return -1;
  }
  // sin(pi * r) = sin(pi * (±1 - r)), and ±1 - r is exact here; pi * r would lose ~1e-8 relative near ±1
  if (r > 0.5) {
    r = 1 - r;
  } else if (r < -0.5) {
    r = -1 - r;
  }
  return Math.sin(Math.PI * r);
}
