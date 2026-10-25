import at from "../util/at";
/** Valid input carries the positions of the rows no rule rejected */
export type RowValidation = { status: 0; messages: string[]; kept: number[] } | { status: 1; messages: string[]; error: string };
export type ValidRows = Extract<RowValidation, { status: 0 }>;

/** Extracted input data, or why the whole input was rejected */
export type InputDataResult<D> = { status: "valid"; data: D } | { status: "invalid"; error: string };

/** A row fails on its first matching rule; `all` names the error when every row fails the same rule */
export type RowRule = {
  readonly fails: (index: number) => boolean;
  readonly message: string;
  readonly all: string;
};

export default function validateRows(count: number, rules: readonly RowRule[]): RowValidation {
  const messages = new Array<string>(count);
  const kept: number[] = [];
  let sameRule = true;
  let firstRule: RowRule | undefined;
  for (let i = 0; i < count; i++) {
    let failed: RowRule | undefined;
    for (let j = 0; j < rules.length; j++) {
      const rule = at(rules, j);
      if (rule.fails(i)) {
        failed = rule;
        break;
      }
    }
    messages[i] = failed === undefined ? "" : failed.message;
    if (failed === undefined) {
      kept.push(i);
    }
    if (i === 0) {
      firstRule = failed;
    } else if (failed !== firstRule) {
      sameRule = false;
    }
  }
  if (kept.length > 0) {
    return { status: 0, messages, kept };
  }
  // A single shared failure names it; mixed failures or no rows get the generic error
  return { status: 1, messages, error: sameRule && firstRule !== undefined ? firstRule.all : "No valid data found!" };
}
