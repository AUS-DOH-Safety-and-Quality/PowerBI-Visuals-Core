import log1mExp from "./log1mExp";

/** Log of the lower_tail-selected probability, for p on either scale; adapted from R's R_DT_log. */
export default function logP(p: number, lower_tail: boolean, log_p: boolean): number {
  if (lower_tail) {
    return log_p ? p : Math.log(p);
  }

  return log_p ? log1mExp(p) : Math.log1p(-p);
}
