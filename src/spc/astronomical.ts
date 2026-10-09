import type { OutlierStatus } from "../data/flagDirection";

/** Astronomical points: single values outside the 99% limits; a blank limit flags nothing on its side. */
export default function astronomical(val: readonly number[], ll99: readonly (number | undefined)[], ul99: readonly (number | undefined)[]): OutlierStatus[] {
  const n: number = val.length;
  let rtn: OutlierStatus[] = new Array<OutlierStatus>(n);

  for (let i = 0; i < n; i++) {
    const lower = ll99[i];
    const upper = ul99[i];
    if (upper !== undefined && val[i] > upper) {
      rtn[i] = "upper";
    } else if (lower !== undefined && val[i] < lower) {
      rtn[i] = "lower";
    } else {
      rtn[i] = "none";
    }
  }
  return rtn;
}
