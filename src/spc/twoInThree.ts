import type { OutlierStatus } from "../data/flagDirection";
import sum from "../math/sum";

/**
 * Two-in-three rule: 2 of 3 consecutive points beyond the same 95% limit.
 * Unless highlight_series, only the points beyond the limit are flagged.
 */
export default function twoInThree(val: readonly number[], ll95: readonly (number | undefined)[], ul95: readonly (number | undefined)[], highlight_series: boolean): OutlierStatus[] {
  const length: number = val.length;
  let outside95: number[] = new Array<number>(length);
  let two_in_three_detected: OutlierStatus[] = new Array<OutlierStatus>(length);
  for (let i: number = 0; i < length; i++) {
    const lower = ll95[i];
    const upper = ul95[i];
    outside95[i] = upper !== undefined && val[i] > upper ? 1 : (lower !== undefined && val[i] < lower ? -1 : 0);

    const lagged_sign_sum: number = sum(outside95.slice(Math.max(0, i - 2), i + 1));

    if (Math.abs(lagged_sign_sum) >= 2) {
      two_in_three_detected[i] = lagged_sign_sum >= 2 ? "upper" : "lower";
    } else {
      two_in_three_detected[i] = "none";
    }

    if (two_in_three_detected[i] !== "none") {
      for (let j: number = (i - 1); j >= (i - 2); j--) {
        if (outside95[j] !== 0 || highlight_series) {
          two_in_three_detected[j] = two_in_three_detected[i];
        }
      }
      if (outside95[i] === 0 && !highlight_series) {
        two_in_three_detected[i] = "none";
      }
    }
  }

  return two_in_three_detected;
}
