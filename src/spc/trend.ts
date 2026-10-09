import type { OutlierStatus } from "../data/flagDirection";
import sum from "../math/sum";

/** Trend rule: n consecutive points steadily increasing or decreasing; flags the whole run. */
export default function trend(val: readonly number[], n: number): OutlierStatus[] {
  const length: number = val.length;
  let lagged_sign: number[] = new Array<number>(length);
  let trend_detected: OutlierStatus[] = new Array<OutlierStatus>(length);
  for (let i: number = 0; i < length; i++) {
    lagged_sign[i] = (i === 0) ? 0 : Math.sign(val[i] - val[i - 1]);

    // n points give n - 1 changes
    const lagged_sign_sum: number = sum(lagged_sign.slice(Math.max(0, i - (n - 2)), i + 1));

    if (Math.abs(lagged_sign_sum) >= (n - 1)) {
      trend_detected[i] = lagged_sign_sum >= (n - 1) ? "upper" : "lower";
    } else {
      trend_detected[i] = "none";
    }

    if (trend_detected[i] !== "none") {
      for (let j: number = (i - 1); j >= (i - (n - 1)); j--) {
        trend_detected[j] = trend_detected[i];
      }
    }
  }

  return trend_detected;
}
