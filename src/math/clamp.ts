/** Applies every supplied bound, including zero; undefined leaves that side open. NaN passes through. */
export default function clamp(value: number, lower: number | undefined, upper: number | undefined): number {
  let result = value;
  if (lower !== undefined && result < lower) {
    result = lower;
  }
  if (upper !== undefined && result > upper) {
    result = upper;
  }
  return result;
}
