import type powerbi from "powerbi-visuals-api";
import type { CardValues, SettingCard } from "../settings/definitions";
import readSettingsRows from "./readSettingsRows";
import { formatPrimitiveValue, type RoleColumns } from "./columns";

type VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;

export type RowAnnotations<S, L> = {
  labels: (string | undefined)[] | undefined;
  anyLabels: boolean;
  highlights: (Exclude<powerbi.PrimitiveValue, null> | undefined)[] | undefined;
  anyHighlights: boolean;
  tooltips: VisualTooltipDataItem[][] | undefined;
  scatter_formatting: S[];
  label_formatting: L[];
};

export type RowAnnotationSources<S extends SettingCard, L extends SettingCard> = {
  readonly categorical: powerbi.DataViewCategorical;
  readonly values: RoleColumns<powerbi.DataViewValueColumn>;
  readonly categories: powerbi.DataViewCategoryColumn;
  readonly cards: { readonly scatter: S; readonly labels: L };
  readonly defaults: { readonly scatter: CardValues<S>; readonly labels: CardValues<L> };
};

// Labels, highlights, tooltip columns and per-row formatting for the kept positions of `rows`
export function readRowAnnotations<S extends SettingCard, L extends SettingCard>(
  sources: RowAnnotationSources<S, L>, rows: readonly number[], kept: readonly number[]
): RowAnnotations<CardValues<S>, CardValues<L>> {
  const { categories } = sources;
  const labels = sources.values.labels?.[0];
  const tooltips = sources.values.tooltips;
  const highlights = sources.categorical.values?.[0]?.highlights;
  const scatter = readSettingsRows(sources.cards.scatter, "scatter", sources.defaults.scatter, categories, rows).values;
  const labelSettings = readSettingsRows(sources.cards.labels, "labels", sources.defaults.labels, categories, rows).values;
  const result: RowAnnotations<CardValues<S>, CardValues<L>> = {
    labels: labels === undefined ? undefined : new Array<string | undefined>(kept.length),
    anyLabels: false,
    highlights: highlights === undefined ? undefined : new Array<Exclude<powerbi.PrimitiveValue, null> | undefined>(kept.length),
    anyHighlights: false,
    tooltips: tooltips === undefined ? undefined : new Array<VisualTooltipDataItem[]>(kept.length),
    scatter_formatting: new Array<CardValues<S>>(kept.length),
    label_formatting: new Array<CardValues<L>>(kept.length)
  };
  for (let k = 0; k < kept.length; k++) {
    const position = kept[k];
    const row = rows[position];
    result.scatter_formatting[k] = scatter[position];
    result.label_formatting[k] = labelSettings[position];
    if (result.labels !== undefined && labels !== undefined) {
      const label = formatPrimitiveValue(labels.values[row]);
      result.labels[k] = label;
      result.anyLabels ||= label !== undefined && label !== "";
    }
    if (result.highlights !== undefined && highlights !== undefined) {
      const highlight = highlights[row] ?? undefined;
      result.highlights[k] = highlight;
      result.anyHighlights ||= highlight !== undefined;
    }
    if (result.tooltips !== undefined && tooltips !== undefined) {
      const rowTooltips = new Array<VisualTooltipDataItem>(tooltips.length);
      for (let j = 0; j < tooltips.length; j++) {
        rowTooltips[j] = { displayName: tooltips[j].source.displayName, value: formatPrimitiveValue(tooltips[j].values[row]) ?? "" };
      }
      result.tooltips[k] = rowTooltips;
    }
  }
  return result;
}

export type RowSettingsMessages = {
  readonly messages: readonly (readonly string[])[];
  readonly messagePositionByRowIndex: ReadonlyMap<number, number>;
};

// Dropped rows report why; kept rows report any conditional formatting that was ignored (none when settings were never read)
export function rowWarnings(groupName: string, rows: readonly number[], keys: readonly (string | undefined)[],
                            rowMessages: readonly string[], settings: RowSettingsMessages): string[] {
  const warnings: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const key = keys[i];
    if (rowMessages[i] !== "") {
      warnings.push(`${groupName} ${key} removed due to: ${rowMessages[i]}.`);
      continue;
    }
    const position = settings.messagePositionByRowIndex.get(rows[i]);
    const messages = position === undefined ? [] : settings.messages[position];
    for (let j = 0; j < messages.length; j++) {
      warnings.push(`Conditional formatting for ${groupName} ${key} ignored due to: ${messages[j]}.`);
    }
  }
  return warnings;
}
