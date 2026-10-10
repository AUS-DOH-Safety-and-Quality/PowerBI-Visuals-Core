/** Missing and NaN values have no text; rounding never leaves a sign on zero */
export default function formatNumber(value: number | undefined, decimalPlaces: number, suffix: string): string | undefined {
  if (value === undefined || Number.isNaN(value)) {
    return undefined;
  }
  const text = value.toFixed(decimalPlaces);
  return (Number(text) === 0 ? text.replace("-", "") : text) + suffix;
}
