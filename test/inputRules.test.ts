import { describe, expect, it } from "vitest";
import { missingRule, nanRule, negativeRule, quantity, ratioRule, valueAt } from "../src/data/inputRules";
import validateRows from "../src/data/validateRows";

describe("input rules", () => {
  it("names the quantity in each row's message and in the whole-input error", () => {
    const values = [undefined, NaN, -1, 2];
    const rules = [missingRule(values, quantity.numerator), nanRule(values, quantity.numerator), negativeRule(values, quantity.numerator)];
    expect(validateRows(4, rules)).toEqual({ status: 0, messages: ["Numerator missing", "Numerator is not a number", "Numerator negative", ""], kept: [3] });
    expect(validateRows(2, [missingRule(undefined, quantity.denominator)]))
      .toMatchObject({ status: 1, error: "All denominators are missing or null!" });
    expect(validateRows(2, [missingRule(["A", undefined], { name: "Date", plural: "dates/IDs" })]))
      .toEqual({ status: 0, messages: ["", "Date missing"], kept: [0] });
  });

  it("compares a denominator against its numerator only when both are numbers", () => {
    const rule = ratioRule([1, undefined, NaN, 3], [0.5, 0.5, 0.5, 5]);
    const failed = new Array<boolean>(4);
    for (let i = 0; i < 4; i++) {
      failed[i] = rule.fails(i);
    }
    expect(failed).toEqual([true, false, false, false]);
    expect(valueAt(undefined, 0)).toBeNaN();
    expect(valueAt([undefined], 0)).toBeNaN();
  });
});
