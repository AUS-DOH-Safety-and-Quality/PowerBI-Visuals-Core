import type { OutlierStatus } from "../data/flagDirection";
import sum from "../math/sum";

/** Shift rule: n consecutive points on the same side of the target; flags the whole run. */
export default function shift(val: readonly number[], targets: readonly (number | undefined)[], n: number): OutlierStatus[] {
  const length: number = val.length;

  let lagged_sign: number[] = new Array<number>(length);
  let shift_detected: OutlierStatus[] = new Array<OutlierStatus>(length);

  for (let i: number = 0; i < length; i++) {
    const target = targets[i];
    lagged_sign[i] = target === undefined ? NaN : Math.sign(val[i] - target);
    const lagged_sign_sum: number = sum(lagged_sign.slice(Math.max(0, i - (n - 1)), i + 1));
    if (Math.abs(lagged_sign_sum) >= n) {
      shift_detected[i] = lagged_sign_sum >= n ? "upper" : "lower";
    } else {
      shift_detected[i] = "none";
    }

    if (shift_detected[i] !== "none") {
      for (let j: number = (i - 1); j >= (i - (n - 1)); j--) {
        shift_detected[j] = shift_detected[i];
      }
    }
  }

  return shift_detected;
}
