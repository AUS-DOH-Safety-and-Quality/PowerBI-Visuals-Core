import poissonDensity from "./poissonDensity";

/** Gamma density; adapted from R's dgamma. */
export default function gammaDensity(x: number, shape: number, scale: number, log_p: boolean): number {
  if (Number.isNaN(x) || Number.isNaN(shape) || Number.isNaN(scale)) {
    return x + shape + scale;
  }

  if (shape < 0 || scale <= 0) {
    return Number.NaN;
  }

  const zeroBound: number = log_p ? Number.NEGATIVE_INFINITY : 0;

  if (x < 0) {
    return zeroBound;
  }

  if (shape === 0) {
    return (x === 0) ? Number.POSITIVE_INFINITY : zeroBound;
  }

  if (x === 0) {
    if (shape < 1) {
      return Number.POSITIVE_INFINITY;
    }
    if (shape > 1) {
      return zeroBound;
    }
    return log_p ? -Math.log(scale) : 1 / scale;
  }

  let pr: number;
  if (shape < 1) {
    pr = poissonDensity(shape, x / scale, log_p);

    if (log_p) {
      const shapeDivX: number = shape / x;
      const offset: number = Number.isFinite(shapeDivX)
                              ? Math.log(shapeDivX)
                              : Math.log(shape) - Math.log(x);
      return pr + offset
    } else {
      return pr * shape / x;
    }
  }

  pr = poissonDensity(shape - 1, x / scale, log_p);
  return log_p ? pr - Math.log(scale) : pr / scale;
}
