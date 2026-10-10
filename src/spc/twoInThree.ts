import type { OutlierStatus } from "../data/flagDirection";

/**
 * Two-in-three rule: 2 of 3 consecutive points beyond the same 95% limit.
 * Unless highlight_series, only the points beyond that limit are flagged; points beyond the other limit never are.
 */
export default function twoInThree(val: readonly number[], ll95: readonly (number | undefined)[], ul95: readonly (number | undefined)[], highlight_series: boolean): OutlierStatus[] {
  const length: number = val.length;
  let outside95: number[] = new Array<number>(length);
  let two_in_three_detected: OutlierStatus[] = new Array<OutlierStatus>(length);
  for (let i: number = 0; i < length; i++) {
    const lower = ll95[i];
    const upper = ul95[i];
    outside95[i] = upper !== undefined && val[i] > upper ? 1 : (lower !== undefined && val[i] < lower ? -1 : 0);
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
    const side: number = above >= 2 ? 1 : (below >= 2 ? -1 : 0);
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
