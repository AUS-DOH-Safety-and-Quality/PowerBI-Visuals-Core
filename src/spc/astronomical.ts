import type { OutlierStatus } from "../data/flagDirection";
import limitStatus from "./limitStatus";

/** Astronomical points: single values outside the 99% limits */
export default function astronomical(val: readonly number[], ll99: readonly (number | undefined)[], ul99: readonly (number | undefined)[]): OutlierStatus[] {
  const rtn = new Array<OutlierStatus>(val.length);
  for (let i = 0; i < val.length; i++) {
    rtn[i] = limitStatus(val[i], ll99[i], ul99[i]);
  }
  return rtn;
}
