import formatNumber from "./formatNumber";

export type ValueFormatter = (value: number | undefined, name: "input" | "value") => string;

/** "input" formats input data without suffix, integral values without decimals; "value" with the decimal places and suffix */
export default function createValueFormatter(decimalPlaces: number, suffix: string): ValueFormatter {
  return (value, name) => {
    if (name === "value") {
      return formatNumber(value, decimalPlaces, suffix) ?? "";
    }
    return formatNumber(value, Number.isInteger(value) ? 0 : decimalPlaces, "") ?? "";
  };
}
