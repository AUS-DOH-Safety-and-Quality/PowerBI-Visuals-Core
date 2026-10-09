import logcf from "./logcf";

/** log(1 + x) - x, accurate for small x; adapted from R's log1pmx (src/nmath/pgamma.c). */
export default function log1pmx(x: number): number {
  const minLog1Value = -0.79149064;
  if (x > 1 || x < minLog1Value) {
    return Math.log1p(x) - x;
  }
  // Expand in y = [x/(2+x)]^2: log(1+x) - x = x/(2+x) * [2*y*S(y) - x], S(y) = sum y^k/(2k+3).
  const r = x / (2 + x);
  const y = r * r;
  if (Math.abs(x) < 1e-2) {
    return r * ((((2 / 9 * y + 2 / 7) * y + 2 / 5) * y + 2 / 3) * y - x);
  }
  const tol_logcf = 1e-14;
  return r * (2 * y * logcf(y, 3, 2, tol_logcf) - x);
}
