export default function pickRows<T>(values: readonly T[], positions: readonly number[]): Array<T | undefined> {
  const result = new Array<T | undefined>(positions.length);
  for (let i = 0; i < positions.length; i++) result[i] = values[positions[i]];
  return result;
}
