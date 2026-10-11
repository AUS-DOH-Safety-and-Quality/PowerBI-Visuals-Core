/** Inclusive bounds. */
export default function between(x: number, lower: number, upper: number): boolean {
  return lower <= x && x <= upper;
}
