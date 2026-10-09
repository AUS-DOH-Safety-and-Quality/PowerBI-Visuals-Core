import isNullOrUndefined from "../data/isNullOrUndefined";

// Inclusive bounds; a null or undefined bound is unbounded.
export default function between<T>(x: T, lower: T, upper: T): boolean {
  let inside = true;
  if (!isNullOrUndefined(lower)) {
    inside = inside && (x >= lower);
  }
  if (!isNullOrUndefined(upper)) {
    inside = inside && (x <= upper);
  }
  return inside;
}
