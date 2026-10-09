import { describe, expect, it } from "vitest";
import { validateRows, type RowRule } from "../src/data/index";

const values = [1, undefined, -1, NaN];
const rules: RowRule[] = [
  { fails: i => values[i] === undefined, message: "Missing", all: "All missing!" },
  { fails: i => isNaN(values[i] as number), message: "Not a number", all: "All not numbers!" },
  { fails: i => (values[i] as number) < 0, message: "Negative", all: "All negative!" }
];

describe("row validation", () => {
  it("names each row's first failing rule and passes when any row is valid", () => {
    expect(validateRows(4, rules)).toEqual({ status: 0, messages: ["", "Missing", "Negative", "Not a number"] });
  });

  it("names a failure shared by every row and reports mixed failures generically", () => {
    expect(validateRows(3, [{ fails: () => true, message: "Bad", all: "All bad!" }])).toEqual({
      status: 1, messages: ["Bad", "Bad", "Bad"], error: "All bad!"
    });
    expect(validateRows(3, [{ fails: i => i === 0, message: "First", all: "All first!" }, { fails: i => i > 0, message: "Later", all: "All later!" }])).toEqual({
      status: 1, messages: ["First", "Later", "Later"], error: "No valid data found!"
    });
    expect(validateRows(0, rules)).toEqual({ status: 1, messages: [], error: "No valid data found!" });
  });
});
