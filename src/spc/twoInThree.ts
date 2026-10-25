import type { OutlierStatus } from "../data/flagDirection";
import limitStatus from "./limitStatus";

/**
 * Two-in-three rule: 2 of 3 consecutive points beyond the same 95% limit.
 * Unless highlight_series, only the points beyond that limit are flagged; points beyond the other limit never are.
 */
export default function twoInThree(val: readonly number[], ll95: readonly (number | undefined)[], ul95: readonly (number | undefined)[], highlight_series: boolean): OutlierStatus[] {
  const length: number = val.length;
  const outside95: number[] = new Array<number>(length);
  const two_in_three_detected: OutlierStatus[] = new Array<OutlierStatus>(length);
  for (let i: number = 0; i < length; i++) {
    const status = limitStatus(val[i], ll95[i], ul95[i]);
    if (status === "upper") {
      outside95[i] = 1;
    } else if (status === "lower") {
      outside95[i] = -1;
    } else {
      outside95[i] = 0;
    }
    two_in_three_detected[i] = "none";

    // Each side is counted separately, so a point beyond the other limit doesn't cancel a pair
    const start: number = Math.max(0, i - 2);
    let above: number = 0;
    let below: number = 0;
    for (let j: number = start; j <= i; j++) {
      if (outside95[j] === 1) {
        above++;
      } else if (outside95[j] === -1) {
        below++;
      }
    }
    let side = 0;
    if (above >= 2) {
      side = 1;
    } else if (below >= 2) {
      side = -1;
    }
    if (side === 0) {
      continue;
    }
    for (let j: number = start; j <= i; j++) {
      if (outside95[j] === side || (highlight_series && outside95[j] !== -side)) {
        two_in_three_detected[j] = side === 1 ? "upper" : "lower";
      }
    }
  }

  return two_in_three_detected;
}
