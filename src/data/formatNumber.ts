export default function formatNumber(value: number | undefined, decimalPlaces: number, suffix: string): string | undefined {
  return value === undefined ? undefined : value.toFixed(decimalPlaces) + suffix;
}
