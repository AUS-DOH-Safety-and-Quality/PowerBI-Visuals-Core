import at from "../util/at";
import type powerbi from "powerbi-visuals-api";
import { formatPrimitiveValue, type PrimitiveValue, type RoleColumns } from "./columns";

type VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;

/** Row-aligned with the kept rows; absent roles read as blank, and the any* flags say whether the role carried data */
export type RowAnnotations<S, L> = {
  labels: (string | undefined)[];
  anyLabels: boolean;
  highlights: Exclude<PrimitiveValue, null>[];
  anyHighlights: boolean;
  tooltips: VisualTooltipDataItem[][];
  scatter_formatting: S[];
  label_formatting: L[];
};

export type RowAnnotationSources<S, L> = {
  readonly categorical: powerbi.DataViewCategorical;
  readonly values: RoleColumns<powerbi.DataViewValueColumn>;
  /** Each row's own settings, as the settings store read them, aligned with `rows` */
  readonly rowSettings: readonly { readonly scatter: S; readonly labels: L }[];
};

/** Labels, highlights, tooltip columns and per-row formatting for the kept positions of `rows` */
export function readRowAnnotations<S, L>(
  sources: RowAnnotationSources<S, L>, rows: readonly number[], kept: readonly number[]
): RowAnnotations<S, L> {
  const labels = sources.values.labels?.[0];
  const tooltips = sources.values.tooltips ?? [];
  const highlights: readonly PrimitiveValue[] | undefined = sources.categorical.values?.[0]?.highlights;
  const rowSettings = sources.rowSettings;
  const result: RowAnnotations<S, L> = {
    labels: new Array<string | undefined>(kept.length),
    anyLabels: false,
    highlights: new Array<Exclude<PrimitiveValue, null>>(kept.length),
    anyHighlights: false,
    tooltips: new Array<VisualTooltipDataItem[]>(kept.length),
    scatter_formatting: new Array<S>(kept.length),
    label_formatting: new Array<L>(kept.length)
  };
  for (let k = 0; k < kept.length; k++) {
    const position = at(kept, k);
    const row = at(rows, position);
    const settings = at(rowSettings, position);
    result.scatter_formatting[k] = settings.scatter;
    result.label_formatting[k] = settings.labels;
    const label = labels === undefined ? undefined : formatPrimitiveValue(labels.values[row]);
    result.labels[k] = label;
    result.anyLabels ||= label !== undefined && label !== "";
    const highlight = highlights === undefined ? undefined : highlights[row] ?? undefined;
    result.highlights[k] = highlight;
    result.anyHighlights ||= highlight !== undefined;
    const rowTooltips = new Array<VisualTooltipDataItem>(tooltips.length);
    for (let j = 0; j < tooltips.length; j++) {
      const column = at(tooltips, j);
      rowTooltips[j] = {
        displayName: column.source.displayName,
        value: formatPrimitiveValue(column.values[row]) ?? ""
      };
    }
    result.tooltips[k] = rowTooltips;
  }
  return result;
}

export type RowSettingsMessages = {
  readonly messages: readonly (readonly string[])[];
  readonly messagePositionByRowIndex: ReadonlyMap<number, number>;
};

/** Dropped rows report why; kept rows report any conditional formatting that was ignored (none when settings were never read) */
export function rowWarnings(groupName: string, rows: readonly number[], keys: readonly (string | undefined)[],
                            rowMessages: readonly string[], settings: RowSettingsMessages): string[] {
  const warnings: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    // Power BI's own label for a blank category
    const key = keys[i] ?? "(Blank)";
    if (rowMessages[i] !== "") {
      warnings.push(`${groupName} ${key} removed due to: ${rowMessages[i]}.`);
      continue;
    }
    const position = settings.messagePositionByRowIndex.get(at(rows, i));
    const messages = position === undefined ? [] : at(settings.messages, position);
    for (let j = 0; j < messages.length; j++) {
      warnings.push(`Conditional formatting for ${groupName} ${key} ignored due to: ${at(messages, j)}.`);
    }
  }
  return warnings;
}

/** Each line of a group's message led by the group's label; an unlabelled group's message is unchanged */
export function labelledMessage(label: string, message: string): string {
  if (label === "") {
    return message;
  }
  const lines = message.split("\n");
  for (let i = 0; i < lines.length; i++) {
    lines[i] = `${label}: ${lines[i]}`;
  }
  return lines.join("\n");
}
