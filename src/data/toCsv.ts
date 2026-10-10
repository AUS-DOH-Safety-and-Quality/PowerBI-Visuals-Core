/**
 * Fields holding a comma, quote or line break are quoted, with embedded quotes doubled.
 * Text a spreadsheet would read as a formula is prefixed with ' (OWASP CSV injection).
 */
function csvField(value: unknown): string {
  const raw = String(value ?? "");
  const text = typeof value === "string" && /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  if (!/[",\r\n]/.test(text)) {
    return text;
  }
  return `"${text.replace(/"/g, "\"\"")}"`;
}

/** Header from the first row's keys; missing values are blank */
export default function toCsv(rows: readonly Readonly<Record<string, unknown>>[]): string {
  if (rows.length === 0) {
    return "";
  }
  const columns = Object.keys(rows[0]);
  const lines = new Array<string>(rows.length + 1);
  const header = new Array<string>(columns.length);
  for (let j = 0; j < columns.length; j++) {
    header[j] = csvField(columns[j]);
  }
  lines[0] = header.join(",");
  for (let i = 0; i < rows.length; i++) {
    const values = new Array<string>(columns.length);
    for (let j = 0; j < columns.length; j++) {
      values[j] = csvField(rows[i][columns[j]]);
    }
    lines[i + 1] = values.join(",");
  }
  return lines.join("\n");
}
