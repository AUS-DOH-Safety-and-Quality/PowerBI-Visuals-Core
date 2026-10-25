import at from "../util/at";
import type { OutlierStatus } from "../data/flagDirection";

/**
 * Trend rule: n consecutive points steadily increasing or decreasing; flags the whole run.
 * Repeated values neither make nor break a trend (Perla et al., 2011), so a plateau at either end lies outside it;
 * a turning point stays with the earlier trend.
 */
export default function trend(val: readonly number[], n: number): OutlierStatus[] {
  const length: number = val.length;
  const trend_detected: OutlierStatus[] = new Array<OutlierStatus>(length);
  let direction: number = 0;
  let count: number = 0;
  let unflagged: number = 0;

  for (let i: number = 0; i < length; i++) {
    trend_detected[i] = "none";
    const change: number = i === 0 ? NaN : Math.sign(at(val, i) - at(val, i - 1));
    if (Number.isNaN(change)) {
      direction = 0;
      continue;
    }
    if (change === 0) {
      continue;
    }
    if (change === direction) {
      count++;
    } else {
      direction = change;
      count = 2;
      unflagged = i - 1;
    }
    if (count >= n) {
      for (let j: number = unflagged; j <= i; j++) {
        if (trend_detected[j] === "none") {
          trend_detected[j] = direction > 0 ? "upper" : "lower";
        }
      }
      unflagged = i + 1;
    }
  }

  return trend_detected;
}
