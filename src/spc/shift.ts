import type { OutlierStatus } from "../data/flagDirection";

/**
 * Shift rule: n consecutive points on the same side of the target; flags the whole run.
 * Points on the target neither add to nor break a shift (Perla et al., 2011); a missing target breaks it.
 */
export default function shift(val: readonly number[], targets: readonly (number | undefined)[], n: number): OutlierStatus[] {
  const length: number = val.length;
  const shift_detected: OutlierStatus[] = new Array<OutlierStatus>(length);
  let side: number = 0;
  let count: number = 0;
  let unflagged: number = 0;

  for (let i: number = 0; i < length; i++) {
    shift_detected[i] = "none";
    const target = targets[i];
    const sign: number = target === undefined ? NaN : Math.sign(val[i] - target);
    if (Number.isNaN(sign)) {
      side = 0;
      continue;
    }
    if (sign === 0) {
      continue;
    }
    if (sign === side) {
      count++;
    } else {
      side = sign;
      count = 1;
      unflagged = i;
    }
    if (count >= n) {
      for (let j: number = unflagged; j <= i; j++) {
        shift_detected[j] = side > 0 ? "upper" : "lower";
      }
      unflagged = i + 1;
    }
  }

  return shift_detected;
}
