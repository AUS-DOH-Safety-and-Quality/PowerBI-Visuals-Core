/** The value at a kept position, which validation guarantees is present */
export default function keptValue<T>(values: readonly (T | undefined)[] | undefined, position: number): T {
  const value = values?.[position];
  if (value === undefined) {
    throw new Error("Validated row contains a missing value.");
  }
  return value;
}
