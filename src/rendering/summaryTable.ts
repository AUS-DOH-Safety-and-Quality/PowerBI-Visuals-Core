import type powerbi from "powerbi-visuals-api";
import { select, type Selection } from "d3-selection";
import { identitySelected, selectionState } from "../powerbi/selection";
import type { ValueFormatter } from "../data/valueFormatter";
import type { CardValues } from "../settings/definitions";
import type { SummaryTableCard } from "../settings/createSummaryTableCard";
import { highlightOpacity, type HighlightOpacities, type HighlightPoint } from "./highlight";
import type { SelectionHighlightState } from "./plotVisual";

type IVisualHost = powerbi.extensibility.visual.IVisualHost;

export type TableSelection = Selection<HTMLDivElement, unknown, null, undefined>;
export type TableColumn = { name: string; label: string };
/** How a column's cells are written and aligned; icon cells are left for the visual to fill */
export type ColumnKind = "text" | "number" | "integer" | "date" | "flag" | "icon";
export type TableSettingValues = CardValues<SummaryTableCard<Record<never, never>>>;
export type TableRow = HighlightPoint & { readonly table_row: Readonly<Record<string, string | number | undefined>> };

export type SummaryTableOptions<R extends TableRow> = {
  readonly columns: readonly TableColumn[];
  readonly rows: readonly R[];
  /** Columns not listed are text */
  readonly kinds: Readonly<Record<string, ColumnKind>>;
  readonly settings: TableSettingValues;
  /** A row's own table settings, where conditional formatting gives it some */
  readonly rowSettings?: (row: R) => TableSettingValues;
  readonly formatValue: ValueFormatter;
  /** The canvas width, shared between the columns */
  readonly width: number;
  readonly host: IVisualHost;
  readonly selectionManager: powerbi.extensibility.ISelectionManager;
  readonly onSelectionChange: () => void;
};

type Cell = { readonly column: string; readonly value: string | number | undefined; readonly settings: TableSettingValues };

const flagLabels: Readonly<Record<string, string>> = {
  none: "",
  improvement: "Improvement",
  deterioration: "Deterioration",
  neutral_low: "Neutral (Low)",
  neutral_high: "Neutral (High)"
};

/** A hidden table before the svg; collapsed borders stay behind when the sticky header scrolls, so cells draw their own */
export function createTableContainer(element: HTMLElement): TableSelection {
  const div: TableSelection = select(element).insert("div", "svg").style("overflow", "auto");
  const table = div.append("table")
                   .classed("table-group", true)
                   .style("border-collapse", "separate")
                   .style("border-spacing", "0")
                   .style("width", "100%");
  table.append("thead").append("tr").classed("table-header", true);
  table.append("tbody").classed("table-body", true);
  return div;
}

export function showTable(div: TableSelection, visible: boolean): void {
  const size = visible ? "100%" : "0%";
  div.style("width", size).style("height", size);
}

function columnAlignment(setting: string, kind: ColumnKind | undefined): string {
  if (setting !== "auto") {
    return setting;
  }
  if (kind === "icon") {
    return "center";
  }
  return kind === "number" || kind === "integer" ? "right" : "left";
}

function drawTableHeaders<R extends TableRow>(div: TableSelection, options: SummaryTableOptions<R>): void {
  const tableSettings = options.settings;
  const tableHeaders = div.select(".table-header")
                          .selectAll("th")
                          .data(options.columns)
                          .join("th");

  tableHeaders.selectAll("text")
              .data(d => [d.label])
              .join("text")
              .text(d => d);

  // Font set on the cell itself, so wrapped lines take the header's line height
  tableHeaders.style("font-size", `${tableSettings.table_header_size}px`)
              .style("font-family", tableSettings.table_header_font)
              .style("color", tableSettings.table_header_colour)
              .style("padding", `${tableSettings.table_header_text_padding}px`)
              .style("background-color", tableSettings.table_header_bg_colour)
              .style("font-weight", tableSettings.table_header_font_weight)
              .style("text-transform", tableSettings.table_header_text_transform)
              .style("text-align", d => columnAlignment(tableSettings.table_header_text_align, options.kinds[d.name]))
              .style("border-width", `${tableSettings.table_header_border_width}px`)
              .style("border-style", tableSettings.table_header_border_style)
              .style("border-color", tableSettings.table_header_border_colour)
              // Cells draw only their bottom and right borders, so neighbours never double up
              .style("border-top", "none")
              .style("border-left", "none")
              .style("position", "sticky")
              .style("top", "0")
              // Rows with opacity below 1 would otherwise paint over the header
              .style("z-index", "1");

  if (!tableSettings.table_header_border_bottom) {
    tableHeaders.style("border-bottom", "none");
  }
  if (!tableSettings.table_header_border_inner) {
    tableHeaders.style("border-right", "none");
  }
}

function drawTableRows<R extends TableRow>(div: TableSelection, options: SummaryTableOptions<R>,
                                           rowSettings: (row: R) => TableSettingValues): void {
  div.select(".table-body")
     .selectAll("tr")
     .data(options.rows)
     .join("tr")
     .on("click", (event: MouseEvent, d) => {
       if (options.host.hostCapabilities.allowInteractions) {
         const alreadySelected = identitySelected(d.identity, selectionState(options.selectionManager, false).selected);
         options.selectionManager
                .select(d.identity as powerbi.visuals.ISelectionId, alreadySelected || event.ctrlKey || event.metaKey)
                .then(() => options.onSelectionChange());
         event.stopPropagation();
       }
     })
     .on("mouseenter", function() {
       select(this).selectAll("td").style("background-color", "whitesmoke");
     })
     .on("mouseleave", function(_event, d) {
       select(this).selectAll("td").style("background-color", rowSettings(d).table_body_bg_colour);
     });
}

/** Applied to the cells, as tables ignore width limits on rows */
function drawTextOverflow(div: TableSelection, tableSettings: TableSettingValues, maxWidth: number): void {
  const cells = div.selectAll("th, td");
  if (tableSettings.table_text_overflow !== "none") {
    cells.style("overflow", "hidden")
         .style("max-width", `${maxWidth}px`)
         .style("text-overflow", tableSettings.table_text_overflow);
  } else {
    cells.style("overflow", "auto")
         .style("max-width", "none");
  }
}

function drawOuterBorder(div: TableSelection, tableSettings: TableSettingValues): void {
  const table = div.select(".table-group");
  table.style("border-width", `${tableSettings.table_outer_border_width}px`)
       .style("border-style", tableSettings.table_outer_border_style)
       .style("border-color", tableSettings.table_outer_border_colour);

  const sides = ["top", "right", "bottom", "left"] as const;
  for (let i = 0; i < sides.length; i++) {
    if (!tableSettings[`table_outer_border_${sides[i]}`]) {
      table.style(`border-${sides[i]}`, "none");
    }
  }

  div.selectAll("th:last-child").style("border-right", "inherit");
  div.selectAll("td:last-child").style("border-right", "inherit");
  div.selectAll("tr:last-child").selectAll("td").style("border-bottom", "inherit");
}

function cellText(cell: Cell, kind: ColumnKind | undefined, formatValue: ValueFormatter): string {
  if (typeof cell.value === "number") {
    return formatValue(cell.value, kind === "integer" ? "integer" : "value");
  }
  if (cell.value === undefined) {
    return "";
  }
  return kind === "flag" ? flagLabels[cell.value] : cell.value;
}

function drawTableCells<R extends TableRow>(div: TableSelection, options: SummaryTableOptions<R>,
                                            rowSettings: (row: R) => TableSettingValues): void {
  const columns = options.columns;
  const kinds = options.kinds;
  const tableCells = div.select(".table-body")
                        .selectAll<HTMLTableRowElement, R>("tr")
                        .selectAll<HTMLTableCellElement, unknown>("td")
                        .data(d => {
                          const settings = rowSettings(d);
                          const cells = new Array<Cell>(columns.length);
                          for (let i = 0; i < columns.length; i++) {
                            cells[i] = { column: columns[i].name, value: d.table_row[columns[i].name], settings };
                          }
                          return cells;
                        })
                        .join("td");

  tableCells.each(function(d) {
    const cell = select(this);
    const kind = kinds[d.column];
    if (kind !== "icon") {
      cell.text(cellText(d, kind, options.formatValue)).classed("cell-text", true);
    }
    const tableSettings = d.settings;
    cell.style("background-color", tableSettings.table_body_bg_colour)
        .style("font-weight", tableSettings.table_body_font_weight)
        .style("text-transform", tableSettings.table_body_text_transform)
        .style("text-align", columnAlignment(tableSettings.table_body_text_align, kind))
        .style("font-size", `${tableSettings.table_body_size}px`)
        .style("font-family", tableSettings.table_body_font)
        .style("color", tableSettings.table_body_colour)
        .style("border-width", `${tableSettings.table_body_border_width}px`)
        .style("border-style", tableSettings.table_body_border_style)
        .style("border-color", tableSettings.table_body_border_colour)
        .style("border-top", "none")
        .style("border-left", "none")
        .style("padding", `${tableSettings.table_body_text_padding}px`)
        .style("opacity", "inherit")
        // Cells are reused across updates, so a former icon cell must wrap again
        .style("white-space", (kind === "icon" || kind === "date") ? "nowrap" : "normal");

    if (!tableSettings.table_body_border_left_right) {
      cell.style("border-right", "none");
    }
    if (!tableSettings.table_body_border_top_bottom) {
      cell.style("border-bottom", "none");
    }
  });
}

/** Draws the rows' table_row values under the columns; icon cells are left empty for the visual to fill afterwards */
export function drawSummaryTable<R extends TableRow>(div: TableSelection, options: SummaryTableOptions<R>): void {
  div.selectAll(".rowsvg").remove();
  div.selectAll(".cell-text").remove();

  const rowSettings = options.rowSettings ?? (() => options.settings);
  drawTableHeaders(div, options);
  drawTableRows(div, options, rowSettings);
  if (options.rows.length > 0) {
    drawTableCells(div, options, rowSettings);
  }
  drawTextOverflow(div, options.settings, options.width / options.columns.length);
  drawOuterBorder(div, options.settings);

  div.on("click", () => {
    options.selectionManager.clear();
    options.onSelectionChange();
  });
}

/** Fades the rows by their opacities unless selected or host-highlighted */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- R lets callers pass opacities for their own row type
export function highlightTable<R extends TableRow>(div: TableSelection, state: SelectionHighlightState,
                                                   opacities: (row: R) => HighlightOpacities): void {
  div.selectAll(".table-body").selectChildren<HTMLTableRowElement, R>().style("opacity", d =>
    highlightOpacity(opacities(d), state.active, identitySelected(d.identity, state.selected) || d.highlighted));
}
