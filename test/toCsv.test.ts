import { describe, expect, it } from "vitest";
import { toCsv } from "../src/data/index.js";

describe("csv export", () => {
  it("writes the first row's keys as the header and blanks missing values", () => {
    expect(toCsv([{ date: "A", value: 1.5, target: undefined }, { date: "B", value: 2, target: 3 }]))
      .toBe("date,value,target\nA,1.5,\nB,2,3");
  });

  it("quotes fields holding commas, quotes or line breaks and doubles embedded quotes", () => {
    expect(toCsv([{ "a,b": 'x"y', note: "line\nbreak", plain: 1 }]))
      .toBe('"a,b",note,plain\n"x""y","line\nbreak",1');
    expect(toCsv([{ date: "1 Jan, 2024", value: 2 }])).toBe('date,value\n"1 Jan, 2024",2');
  });

  it("gives an empty string for no rows", () => {
    expect(toCsv([])).toBe("");
  });
});
