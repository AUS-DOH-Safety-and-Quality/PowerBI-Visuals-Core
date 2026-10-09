/** Every element is the same reference; n must be a non-negative integer. */
export default function rep<T>(x: T, n: number): T[] {
  const result = new Array<T>(n);
  for (let i = 0; i < n; i++) {
    result[i] = x;
  }
  return result;
}
