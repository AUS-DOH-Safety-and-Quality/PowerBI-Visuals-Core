import type { OutlierStatus } from "../data/flagDirection";

/** Which limit a value lies beyond; a blank limit flags nothing on its side */
export default function limitStatus(value: number, lower: number | undefined, upper: number | undefined): OutlierStatus {
  if (upper !== undefined && value > upper) {
    return "upper";
  }
  if (lower !== undefined && value < lower) {
    return "lower";
  }
  return "none";
}
