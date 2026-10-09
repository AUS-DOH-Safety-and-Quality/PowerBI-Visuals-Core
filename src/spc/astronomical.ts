import type { OutlierStatus } from "../data/flagDirection";
import between from "../math/between"

/**
 * Detects astronomical points (single points outside 99% control limits).
 *
 * An astronomical point represents special cause variation where a single data point
 * falls outside the 99% control limits. This is one of the key rules for identifying
 * when a process is exhibiting non-random variation.
 *
 * @param val - Array of data values to check
 * @param ll99 - Array of lower 99% control limits
 * @param ul99 - Array of upper 99% control limits
 * @returns Array indicating outlier direction: "upper", "lower", or "none" for each point
 */
export default function astronomical(val: readonly number[], ll99: readonly (number | undefined)[], ul99: readonly (number | undefined)[]): OutlierStatus[] {
  const n: number = val.length;
  let rtn: OutlierStatus[] = new Array<OutlierStatus>(n);

  for (let i = 0; i < n; i++) {
    const lower = ll99[i];
    const upper = ul99[i];
    // Check if point is outside 99% control limits; a blank limit flags nothing
    if (lower !== undefined && upper !== undefined && !between(val[i], lower, upper)) {
      rtn[i] = val[i] > upper ? "upper" : "lower";
    } else {
      rtn[i] = "none";
    }
  }
  return rtn;
}
