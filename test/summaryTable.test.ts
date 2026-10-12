import type powerbi from "powerbi-visuals-api";
import { describe, expect, it, vi } from "vitest";
import { createSummaryTableCard, createDefaultValues, toggleOption } from "../src/settings/index";
import { createTableContainer, drawSummaryTable, highlightTable, showTable, type TableRow } from "../src/rendering/summaryTable";
import keyedHost from "../src/testing/keyedHost";
import createValueFormatter from "../src/data/valueFormatter";

type Row = TableRow & { name: string; identity: powerbi.visuals.ISelectionId };

describe("summary table card", () => {
  it("places extras after the show toggle and keeps the header and body groups", () => {
    const card = createSummaryTableCard({ showDescription: "Shows a table." }, { extra: toggleOption("Extra", "", true) });
    expect(Object.keys(card.settingsGroups)).toEqual(["General", "Header", "Body"]);
    expect(Object.keys(card.settingsGroups.General).slice(0, 3)).toEqual(["show_table", "extra", "table_text_overflow"]);
    expect(card.show_table.description).toBe("Shows a table.");
    expect(card.extra.default).toBe(true);
    expect(Object.keys(card.settingsGroups.Header)).toHaveLength(13);
    expect(Object.keys(card.settingsGroups.Body)).toHaveLength(13);
    const plain = createSummaryTableCard({ showDescription: "" });
    expect(Object.keys(plain.settingsGroups.General)).toHaveLength(12);
  });
});

describe("summary table rendering", () => {
  const settings = createDefaultValues({ summary_table: createSummaryTableCard({ showDescription: "" }) }).summary_table;
  const host = keyedHost();
  host.hostCapabilities.allowInteractions = true;

  function render() {
    const element = document.createElement("div");
    element.append(document.createElementNS("http://www.w3.org/2000/svg", "svg"));
    document.body.append(element);
    const div = createTableContainer(element);
    const selectionManager = host.createSelectionManager();
    const rows: Row[] = [
      { name: "first", identity: host.createSelectionIdBuilder().withMeasure("a").createSelectionId(), highlighted: false,
        table_row: { name: "First", value: 1.2345, count: 4, flag: "improvement", missing: undefined } },
      { name: "second", identity: host.createSelectionIdBuilder().withMeasure("b").createSelectionId(), highlighted: false,
        table_row: { name: "Second", value: 2, count: 5, flag: "none", missing: 3 } }
    ];
    const onSelectionChange = vi.fn();
    drawSummaryTable(div, {
      columns: [{ name: "name", label: "Name" }, { name: "value", label: "Value" }, { name: "count", label: "Count" },
                { name: "flag", label: "Flag" }, { name: "missing", label: "Missing" }],
      rows,
      kinds: { value: "number", count: "integer", flag: "flag" },
      settings: { ...settings, table_opacity_unselected: 0.3 },
      formatValue: createValueFormatter(2, 0, "%"),
      width: 500,
      host,
      selectionManager,
      onSelectionChange
    });
    return { element, div, rows, selectionManager, onSelectionChange };
  }

  it("writes the columns' cells by kind and sizes the container", () => {
    const { element, div } = render();
    expect(element.firstElementChild?.tagName).toBe("DIV");
    const headers = element.querySelectorAll<HTMLElement>(".table-header th");
    expect(headers).toHaveLength(5);
    expect(headers[1].textContent).toBe("Value");
    expect(headers[0].style.textAlign).toBe("left");
    expect(headers[1].style.textAlign).toBe("right");
    expect(headers[2].style.textAlign).toBe("right");
    const rows = element.querySelectorAll("tbody tr");
    expect(rows).toHaveLength(2);
    const texts = (row: number) => Array.from(rows[row].querySelectorAll("td"), cell => cell.textContent);
    expect(texts(0)).toEqual(["First", "1.23%", "4", "Improvement", ""]);
    expect(texts(1)).toEqual(["Second", "2.00%", "5", "", "3.00%"]);
    expect(rows[0].querySelectorAll<HTMLElement>("td")[1].style.maxWidth).toBe("none");
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
});

function must<T>(value: T | null): T {
  if (value === null) {
    throw new Error("Missing element");
  }
  return value;
}
