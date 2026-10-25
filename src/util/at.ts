/** Element i of an array or DOM list the caller's bounds already guarantee; a hole is a programming error, not data */
export default function at<T>(values: ArrayLike<T>, i: number): T {
  const value = values[i];
  if (value === undefined) {
    throw new RangeError(`Index ${i} out of bounds for length ${values.length}.`);
  }
  return value;
}
