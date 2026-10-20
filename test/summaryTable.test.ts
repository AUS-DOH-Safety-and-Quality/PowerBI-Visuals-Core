import type powerbi from "powerbi-visuals-api";
import { describe, expect, it, vi } from "vitest";
import { testDom } from "powerbi-visuals-utils-testutils";
import { createSummaryTableCard, createDefaultValues, toggleOption } from "../src/settings/index";
import {
  createTableContainer, drawSummaryTable, highlightTable, showTable, type SummaryTableOptions, type TableRow, type TableSettingValues
} from "../src/rendering/summaryTable";
import { keyedHost, must } from "../src/testing/index";
import createValueFormatter from "../src/data/valueFormatter";

type Row = TableRow & { name: string; identity: powerbi.visuals.ISelectionId };
type Overrides = Partial<Omit<SummaryTableOptions<Row>, "settings">> & { settings?: Partial<TableSettingValues> };

describe("summary table card", () => {
  it("places extras after the show toggle and keeps the header and body groups", () => {
    const card = createSummaryTableCard({ showDescription: "Shows a table." }, { extra: toggleOption("Extra", "", true) });
    expect(Object.keys(card.settingsGroups)).toEqual(["General", "Header", "Body"]);
    expect(Object.keys(card.settingsGroups.General).slice(0, 3)).toEqual(["show_table", "extra", "table_text_overflow"]);
    expect(card.show_table.description).toBe("Shows a table.");
    expect(card.extra.default).toBe(true);
  });
});

describe("summary table rendering", () => {
  const settings = createDefaultValues({ summary_table: createSummaryTableCard({ showDescription: "" }) }).summary_table;
  const host = keyedHost();
  host.hostCapabilities.allowInteractions = true;

  function row(name: string, table_row: Row["table_row"]): Row {
    return { name, identity: host.createSelectionIdBuilder().withMeasure(name).createSelectionId(), highlighted: false, table_row };
  }

  function render(overrides: Overrides = {}) {
    const element = testDom("500", "500");
    element.append(document.createElementNS("http://www.w3.org/2000/svg", "svg"));
    const div = createTableContainer(element);
    const selectionManager = host.createSelectionManager();
    const rows: Row[] = overrides.rows === undefined ? [
      row("a", { name: "First", value: 1.2345, count: 4, flag: "improvement", missing: undefined }),
      row("b", { name: "Second", value: 2, count: 5, flag: "none", missing: 3 })
    ] : [...overrides.rows];
    const onSelectionChange = vi.fn();
    function draw(next: Overrides): void {
      drawSummaryTable(div, {
        columns: [{ name: "name", label: "Name" }, { name: "value", label: "Value" }, { name: "count", label: "Count" },
                  { name: "flag", label: "Flag" }, { name: "missing", label: "Missing" }],
        kinds: { value: "number", count: "input", flag: "flag" },
        formatValue: createValueFormatter(2, "%"),
        width: 500,
        host,
        selectionManager,
        onSelectionChange,
        ...next,
        rows,
        settings: { ...settings, table_opacity_unselected: 0.3, ...next.settings }
      });
    }
    draw(overrides);
    return { element, div, rows, selectionManager, onSelectionChange, draw };
  }

  it("writes the columns' cells by kind and sizes the container", () => {
    const { element, div } = render();
    expect(element.firstElementChild?.tagName).toBe("DIV");
    const headers = element.querySelectorAll<HTMLElement>(".table-header th");
    expect(headers).toHaveLength(5);
    expect(headers[1].textContent).toBe("Value");
    const rows = element.querySelectorAll("tbody tr");
    expect(rows).toHaveLength(2);
    const texts = (row: number) => Array.from(rows[row].querySelectorAll("td"), cell => cell.textContent);
    expect(texts(0)).toEqual(["First", "1.23%", "4", "Improvement", ""]);
    expect(texts(1)).toEqual(["Second", "2.00%", "5", "", "3.00%"]);
    showTable(div, true);
    expect(element.querySelector<HTMLElement>("div")?.style.height).toBe("100%");
    showTable(div, false);
    expect(element.querySelector<HTMLElement>("div")?.style.width).toBe("0%");
    element.remove();
  });

  it("selects rows on click and fades the rest; clicking the background clears", async () => {
    const { element, div, rows, selectionManager, onSelectionChange } = render();
    const drawn = element.querySelectorAll<HTMLElement>("tbody tr");
    drawn[1].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve));
    expect(selectionManager.getSelectionIds()).toEqual([rows[1].identity]);
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    highlightTable<Row>(div, { active: true, selected: new Set([rows[1].identity.getKey()]) }, () => ({
      opacity: 1, opacity_selected: 0.9, opacity_unselected: 0.3
    }));
    expect(drawn[0].style.opacity).toBe("0.3");
    expect(drawn[1].style.opacity).toBe("0.9");
    must(element.querySelector("div")).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(selectionManager.getSelectionIds()).toEqual([]);
    expect(onSelectionChange).toHaveBeenCalledTimes(2);
    element.remove();
  });

  it("styles the header and body text from the settings", () => {
    const { element } = render({ settings: {
      table_header_font: "Georgia", table_header_size: 13, table_header_colour: "#123456", table_header_bg_colour: "#abcdef",
      table_header_text_align: "right", table_header_font_weight: "bold", table_header_text_transform: "uppercase",
      table_header_text_padding: 7,
      table_body_font: "Verdana", table_body_size: 14, table_body_colour: "#654321", table_body_bg_colour: "#fedcba",
      table_body_text_align: "left", table_body_font_weight: "lighter", table_body_text_transform: "lowercase",
      table_body_text_padding: 5
    } });
    const header = element.querySelectorAll<HTMLElement>("th")[1];
    expect(header.style.fontFamily).toBe("Georgia");
    // On the cell itself, as wrapped labels take their line height from it
    expect(getComputedStyle(header).fontSize).toBe("13px");
    expect(header.style.color).toBe("rgb(18, 52, 86)");
    expect(header.style.backgroundColor).toBe("rgb(171, 205, 239)");
    expect(header.style.textAlign).toBe("right");
    expect(header.style.fontWeight).toBe("bold");
    expect(header.style.textTransform).toBe("uppercase");
    expect(header.style.padding).toBe("7px");
    const cell = element.querySelectorAll("tbody tr")[0].querySelectorAll<HTMLElement>("td")[1];
    expect(cell.style.fontFamily).toBe("Verdana");
    expect(getComputedStyle(cell).fontSize).toBe("14px");
    expect(cell.style.color).toBe("rgb(101, 67, 33)");
    expect(cell.style.backgroundColor).toBe("rgb(254, 220, 186)");
    expect(cell.style.textAlign).toBe("left");
    expect(cell.style.fontWeight).toBe("lighter");
    expect(cell.style.textTransform).toBe("lowercase");
    expect(cell.style.padding).toBe("5px");
    element.remove();
  });

  it("draws only the bottom and right borders of cells, so neighbouring borders never double", () => {
    const { element, draw } = render({ settings: {
      table_header_border_inner: true, table_header_border_style: "dashed", table_header_border_width: 2,
      table_header_border_colour: "#123456",
      table_body_border_left_right: true, table_body_border_style: "dotted", table_body_border_width: 3,
      table_body_border_colour: "#654321"
    } });
    const header = element.querySelectorAll<HTMLElement>("th")[1];
    expect([header.style.borderTopStyle, header.style.borderLeftStyle]).toEqual(["none", "none"]);
    expect([header.style.borderBottomStyle, header.style.borderRightStyle]).toEqual(["dashed", "dashed"]);
    expect(header.style.borderBottomWidth).toBe("2px");
    expect(header.style.borderBottomColor).toBe("rgb(18, 52, 86)");
    const rows = element.querySelectorAll("tbody tr");
    let cell = rows[0].querySelectorAll<HTMLElement>("td")[1];
    expect([cell.style.borderTopStyle, cell.style.borderLeftStyle]).toEqual(["none", "none"]);
    expect([cell.style.borderBottomStyle, cell.style.borderRightStyle]).toEqual(["dotted", "dotted"]);
    expect(cell.style.borderBottomWidth).toBe("3px");
    expect(cell.style.borderBottomColor).toBe("rgb(101, 67, 33)");
    // The table's outer border draws its edges
    const lastCell = must(rows[rows.length - 1].querySelector<HTMLElement>("td:last-child"));
    expect(getComputedStyle(lastCell).borderRightStyle).toBe("none");
    expect(getComputedStyle(lastCell).borderBottomStyle).toBe("none");

    draw({ settings: { table_header_border_bottom: false, table_body_border_top_bottom: false } });
    expect([header.style.borderBottomStyle, header.style.borderRightStyle]).toEqual(["none", "none"]);
    // Text cells are redrawn rather than restyled
    cell = element.querySelectorAll("tbody tr")[0].querySelectorAll<HTMLElement>("td")[1];
    expect([cell.style.borderBottomStyle, cell.style.borderRightStyle]).toEqual(["none", "none"]);
    element.remove();
  });

  it("draws the outer border from its settings, with each side toggled independently", () => {
    const { element } = render({ settings: {
      table_outer_border_style: "double", table_outer_border_width: 4, table_outer_border_colour: "#abcdef",
      table_outer_border_left: false, table_outer_border_top: false
    } });
    const table = getComputedStyle(must(element.querySelector("table.table-group")));
    expect([table.borderLeftStyle, table.borderTopStyle]).toEqual(["none", "none"]);
    expect([table.borderRightStyle, table.borderBottomStyle]).toEqual(["double", "double"]);
    expect(table.borderRightWidth).toBe("4px");
    expect(table.borderBottomColor).toBe("rgb(171, 205, 239)");
    element.remove();
  });

  it("limits header and body cells alike when text overflows, and is off by default", () => {
    const long = "Readmissions_within_twenty_eight_days_of_discharge";
    const { element, draw } = render({ rows: [row("a", { name: long, value: 1 }), row("b", { name: "Short", value: 2 })] });
    let cells = element.querySelectorAll<HTMLElement>("th, td");
    for (let i = 0; i < cells.length; i++) {
      expect(cells[i].style.maxWidth).toBe("none");
    }
    const unlimited = must(element.querySelector("tbody td")).getBoundingClientRect().width;

    draw({ settings: { table_text_overflow: "ellipsis" } });
    cells = element.querySelectorAll<HTMLElement>("th, td");
    for (let i = 0; i < cells.length; i++) {
      expect(cells[i].style.overflow).toBe("hidden");
      expect(cells[i].style.textOverflow).toBe("ellipsis");
      // The 500px width shared between five columns
      expect(cells[i].style.maxWidth).toBe("100px");
    }
    const longCell = must(element.querySelector<HTMLElement>("tbody td"));
    expect(longCell.getBoundingClientRect().width).toBeLessThan(unlimited);
    expect(longCell.scrollWidth).toBeGreaterThan(longCell.clientWidth);
    element.remove();
  });

  it("aligns numbers right, text left and icons centrally unless an alignment is chosen", () => {
    const columns = [{ name: "name", label: "Name" }, { name: "value", label: "Value" }, { name: "count", label: "Count" },
                     { name: "flag", label: "Flag" }, { name: "when", label: "When" }, { name: "icon", label: "Icon" }];
    const kinds = { value: "number", count: "input", flag: "flag", when: "date", icon: "icon" } as const;
    const { element, draw } = render({ columns, kinds });
    const expected = ["left", "right", "right", "left", "left", "center"];
    const alignments = ["auto", "center"] as const;
    for (let a = 0; a < alignments.length; a++) {
      const align = alignments[a];
      draw({ columns, kinds, settings: { table_header_text_align: align, table_body_text_align: align } });
      const headers = element.querySelectorAll<HTMLElement>("th");
      const cells = must(element.querySelector("tbody tr")).querySelectorAll<HTMLElement>("td");
      for (let i = 0; i < columns.length; i++) {
        const alignment = align === "auto" ? expected[i] : align;
        expect(headers[i].style.textAlign, columns[i].name).toBe(alignment);
        expect(cells[i].style.textAlign, columns[i].name).toBe(alignment);
      }
    }
    element.remove();
  });

  it("keeps dates and icons on one line while other cells wrap, also in reused cells", () => {
    const columns = [{ name: "name", label: "Name" }, { name: "when", label: "When" }, { name: "icon", label: "Icon" }];
    const { element, draw } = render({ columns, kinds: { when: "date", icon: "icon" } });
    function whiteSpace(): string[] {
      const cells = must(element.querySelector("tbody tr")).querySelectorAll<HTMLElement>("td");
      const result = new Array<string>(cells.length);
      for (let i = 0; i < cells.length; i++) {
        result[i] = cells[i].style.whiteSpace;
      }
      return result;
    }
    expect(whiteSpace()).toEqual(["normal", "nowrap", "nowrap"]);
    const iconCell = must(element.querySelector("tbody tr")).querySelectorAll("td")[2];
    draw({ columns, kinds: { when: "date" } });
    expect(iconCell.isConnected).toBe(true);
    expect(whiteSpace()).toEqual(["normal", "nowrap", "normal"]);
    element.remove();
  });

  it("updates cells in place and empties icon cells for the visual to fill", () => {
    const columns = [{ name: "name", label: "Name" }, { name: "icon", label: "Icon" }];
    const kinds = { icon: "icon" } as const;
    const { element, rows, draw } = render({ columns, kinds });
    const cells = must(element.querySelector("tbody tr")).querySelectorAll("td");
    cells[1].append(document.createElementNS("http://www.w3.org/2000/svg", "svg"));
    rows[0] = row("a", { name: "Renamed" });
    draw({ columns, kinds });
    const redrawn = must(element.querySelector("tbody tr")).querySelectorAll("td");
    expect(redrawn[0]).toBe(cells[0]);
    expect(redrawn[1]).toBe(cells[1]);
    expect(redrawn[0].textContent).toBe("Renamed");
    expect(redrawn[1].childNodes).toHaveLength(0);
    element.remove();
  });

  it("styles each row from its own settings and restores its background after a hover", () => {
    const colours: Record<string, [string, string]> = { a: ["#111111", "#444444"], b: ["#222222", "#555555"] };
    const { element } = render({ rowSettings: d => ({
      ...settings, table_body_bg_colour: colours[d.name][0], table_body_colour: colours[d.name][1]
    }) });
    const rows = element.querySelectorAll("tbody tr");
    const expected = [["rgb(17, 17, 17)", "rgb(68, 68, 68)"], ["rgb(34, 34, 34)", "rgb(85, 85, 85)"]];
    rows[1].dispatchEvent(new MouseEvent("mouseenter"));
    for (let r = 0; r < rows.length; r++) {
      const cells = rows[r].querySelectorAll<HTMLElement>("td");
      for (let c = 0; c < cells.length; c++) {
        expect(cells[c].style.backgroundColor).toBe(r === 1 ? "whitesmoke" : expected[r][0]);
        expect(cells[c].style.color).toBe(expected[r][1]);
      }
    }
    rows[1].dispatchEvent(new MouseEvent("mouseleave"));
    const cells = rows[1].querySelectorAll<HTMLElement>("td");
    for (let c = 0; c < cells.length; c++) {
      expect(cells[c].style.backgroundColor).toBe(expected[1][0]);
    }
    element.remove();
  });

  it("sizes rows to their content rather than stretching them over the container", () => {
    const { element, div } = render();
    showTable(div, true);
    expect(must(element.querySelector("table")).getBoundingClientRect().height).toBeLessThan(must(div.node()).clientHeight / 2);
    element.remove();
  });

  it("keeps the header above faded rows when the body scrolls", () => {
    const rows = new Array<Row>(40);
    for (let i = 0; i < rows.length; i++) {
      rows[i] = row(`row${i}`, { name: `Row ${i}`, value: i });
    }
    const { element, div } = render({ rows });
    showTable(div, true);
    highlightTable<Row>(div, { active: true, selected: new Set([rows[0].identity.getKey()]) }, () => ({
      opacity: 1, opacity_selected: 1, opacity_unselected: 0.3
    }));
    const container = must(div.node());
    container.scrollTop = 200;

    const header = element.querySelectorAll<HTMLElement>("th")[1];
    const rect = header.getBoundingClientRect();
    expect(container.scrollTop).toBe(200);
    expect(rect.top).toBe(container.getBoundingClientRect().top);
    expect(must(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)).closest("th")).toBe(header);
    // Collapsed borders are painted by the table, so would stay behind as the header sticks
    expect(getComputedStyle(must(element.querySelector("table"))).borderCollapse).toBe("separate");
    element.remove();
  });
});
