/** True only for finite numbers; null, undefined, NaN, infinities and non-numbers fail. */
export default function isValidNumber<T>(value: T): value is Extract<T, number> {
  return typeof value === "number" && Number.isFinite(value);
}
