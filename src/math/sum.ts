import at from "../util/at";
export default function sum(values: readonly number[]): number {
  let total = 0;
  for (let i = 0; i < values.length; i++) {
    total += at(values, i);
  }
  return total;
}
