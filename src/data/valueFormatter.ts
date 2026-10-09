import formatNumber from "./formatNumber.js";

export type ValueFormatter = (value: number | undefined, name: "integer" | "value") => string;

// "integer" formats with the integer places and no suffix; "value" with the decimal places and suffix
export default function createValueFormatter(decimalPlaces: number, integerPlaces: number, suffix: string): ValueFormatter {
  return (value, name) => formatNumber(value, name === "integer" ? integerPlaces : decimalPlaces, name === "integer" ? "" : suffix) ?? "";
}
