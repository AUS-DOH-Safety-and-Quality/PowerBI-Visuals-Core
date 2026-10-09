import type { OutlierStatus } from "../data/flagDirection";
import between from "../math/between"

/** Astronomical points: single values outside the 99% limits; a blank limit flags nothing. */
export default function astronomical(val: readonly number[], ll99: readonly (number | undefined)[], ul99: readonly (number | undefined)[]): OutlierStatus[] {
  const n: number = val.length;
  let rtn: OutlierStatus[] = new Array<OutlierStatus>(n);

  for (let i = 0; i < n; i++) {
    const lower = ll99[i];
    const upper = ul99[i];
    if (lower !== undefined && upper !== undefined && !between(val[i], lower, upper)) {
      rtn[i] = val[i] > upper ? "upper" : "lower";
    } else {
      rtn[i] = "none";
    }
  }
  return rtn;
}
