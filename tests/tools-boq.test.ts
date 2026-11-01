// W8: a bill of quantities in (xlsx · csv · tsv · paste, Arabic or English headers, Arabic digits), every problem named before
// anything is saved; and the take-off's measured quantities into a payment certificate (current = measured − previous).
import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { applyMeasured, detectColumns, importBoq, measuredByItem, parseDelimited, toNumber, unitKey } from "../src/domain/tools/boq";
import { colIndex, readXlsx } from "../src/doc/xlsx-read";
import { workbookXlsx } from "../src/doc/xlsx";

describe("numbers as people type them", () => {
  it("Arabic-Indic digits, Arabic separators, thousands commas, brackets for negatives, percent", () => {
    expect(toNumber("١٬٢٥٠٫٥٠")).toBe(1250.5);
    expect(toNumber("1,250.50")).toBe(1250.5);
    expect(toNumber("(320)")).toBe(-320);
    expect(toNumber(" 4500 ")).toBe(4500);
    expect(toNumber("۱۲")).toBe(12);
    expect(toNumber("12 %")).toBe(12);
    expect(toNumber("م³")).toBeNull();
    expect(toNumber("")).toBeNull();
    expect(toNumber("12-5")).toBeNull();
  });
  it("one unit, many spellings", () => {
    expect(["م3", "م³", "m3", "M³", "متر مكعب"].map(unitKey)).toEqual(["m3", "m3", "m3", "m3", "m3"]);
    expect(["م2", "م²", "m2"].map(unitKey)).toEqual(["m2", "m2", "m2"]);
    expect(["م.ط", "م ط", "m", "lm"].map(unitKey)).toEqual(["m", "m", "m", "m"]);
    expect(unitKey("عدد")).toBe("nr");
  });
});

describe("text and files → rows", () => {
  it("CSV with quotes, commas inside a cell and a BOM; TSV from a spreadsheet paste; semicolons", () => {
    expect(parseDelimited('﻿رقم البند,البيان,الكمية\n1.1,"خرسانة عادية, أساسات",25')).toEqual([["رقم البند", "البيان", "الكمية"], ["1.1", "خرسانة عادية, أساسات", "25"]]);
    expect(parseDelimited("a\tb\tc\r\n1\t2\t3")).toEqual([["a", "b", "c"], ["1", "2", "3"]]);
    expect(parseDelimited("a;b\n1;2")).toEqual([["a", "b"], ["1", "2"]]);
  });
  it("an .xlsx: shared strings, numbers, gaps between cells, the sheet's own order", () => {
    expect(colIndex("A1")).toBe(0);
    expect(colIndex("AB12")).toBe(27);
    const bytes = workbookXlsx({
      title: "BOQ", creator: "x", rtl: true,
      sheets: [{ name: "المقايسة", rows: [
        { cells: [{ v: "رقم البند" }, { v: "البيان" }, { v: "الوحدة" }, { v: "الكمية" }, { v: "الفئة" }] },
        { cells: [{ v: "2.1" }, { v: "خرسانة مسلحة للأسقف" }, { v: "م³" }, { v: 420 }, { v: 4500 }] },
      ] }],
    } as any);
    const sheets = readXlsx(bytes);
    expect(sheets[0].name).toBe("المقايسة");
    expect(sheets[0].rows.filter((r) => r.length)).toEqual([["رقم البند", "البيان", "الوحدة", "الكمية", "الفئة"], ["2.1", "خرسانة مسلحة للأسقف", "م³", "420", "4500"]]);
  });
  it("a hand-made workbook with inline strings and a skipped column; a broken file gives no sheets, never an error", () => {
    const sheet = '<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Item</t></is></c><c r="C1" t="inlineStr"><is><t>Qty</t></is></c></row><row r="3"><c r="A3" t="inlineStr"><is><t>A&amp;B</t></is></c><c r="C3"><v>7.5</v></c></row></sheetData></worksheet>';
    const z = zipSync({
      "xl/workbook.xml": strToU8('<workbook><sheets><sheet name="S1" sheetId="1" r:id="rId1"/></sheets></workbook>'),
      "xl/_rels/workbook.xml.rels": strToU8('<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>'),
      "xl/worksheets/sheet1.xml": strToU8(sheet),
    });
    const rows = readXlsx(z)[0].rows;
    expect(rows[0]).toEqual(["Item", "", "Qty"]);
    expect(rows[1]).toEqual([]);
    expect(rows[2]).toEqual(["A&B", "", "7.5"]);
    expect(readXlsx(new Uint8Array([1, 2, 3]))).toEqual([]);
  });
});

describe("importing a BOQ", () => {
  const rows = [
    ["مشروع أبراج النيل — المقايسة"],
    [],
    ["م", "البيان", "الوحدة", "الكمية", "سعر الوحدة", "الإجمالي"],
    ["", "الباب الثاني: الخرسانة", "", "", "", ""],
    ["2.1", "خرسانة عادية للأساسات", "م³", "١٢٠", "1,800", "216,000"],
    ["2.2", "خرسانة مسلحة للأسقف", "م3", "420", "4500", "1,900,000"],
    ["", "الباب الثالث: المباني", "", "", "", ""],
    ["3.1", "مباني طوب 25 سم", "", "860", "abc", ""],
    ["2.1", "بند مكرر", "م²", "10", "100", "1000"],
  ];
  it("finds the header row and columns from Arabic headings (the amount column too)", () => {
    expect(detectColumns(rows)).toEqual({ header: 2, mapping: { ref: 0, desc: 1, unit: 2, qty: 3, rate: 4, amount: 5 } });
    expect(detectColumns([["Item No.", "Description", "Unit", "Qty", "Rate", "Amount"]]).mapping).toEqual({ ref: 0, desc: 1, unit: 2, qty: 3, rate: 4, amount: 5 });
  });
  it("carries sections to their items, converts numbers, and names every problem with its row", () => {
    const r = importBoq(rows);
    expect(r.items.map((x) => [x.ref, x.section, x.qty, x.rate])).toEqual([
      ["2.1", "الباب الثاني: الخرسانة", 120, 1800],
      ["2.2", "الباب الثاني: الخرسانة", 420, 4500],
      ["3.1", "الباب الثالث: المباني", 860, 0],
      ["2.1", "الباب الثالث: المباني", 10, 100],
    ]);
    expect(r.sections).toBe(2);
    const kinds = r.issues.map((i) => `${i.row}:${i.kind}`);
    expect(kinds).toContain("6:amountMismatch");     // 420 × 4500 = 1,890,000 ≠ 1,900,000
    expect(kinds).toContain("8:missingUnit");
    expect(kinds).toContain("8:badNumber");          // «abc» is not a rate
    expect(kinds).toContain("9:duplicate");          // 2.1 again
    expect(r.issues.find((i) => i.kind === "duplicate")!.level).toBe("error");
  });
  it("without description and quantity columns it refuses and asks for the columns, instead of guessing", () => {
    const r = importBoq([["a", "b"], ["1", "2"]]);
    expect(r.items).toEqual([]);
    expect(r.issues[0].kind).toBe("noColumns");
    const manual = importBoq([["x", "y", "z"], ["كمرات", "م³", "12"]], { desc: 0, unit: 1, qty: 2 }, 0);
    expect(manual.items).toMatchObject([{ desc: "كمرات", unit: "م³", qty: 12 }]);
  });
});

describe("measured quantities → the certificate", () => {
  const lines = [
    { boq: "2.2", unit: "م³", net: 150 },
    { boq: "2.2", unit: "م³", net: 30.5 },
    { boq: "4.1", unit: "م²", net: 98.2 },
    { boq: "", unit: "م²", net: 40 },
    { boq: "9.9", unit: "م³", net: 5 },
    { boq: "2.1", unit: "م²", net: 12 },
  ];
  const cert = [
    { ref: "2.1", unit: "م³", qp: "100", qq: "" },
    { ref: "2.2", unit: "م3", qp: "120", qq: "" },
    { ref: "4.1", unit: "م2", qp: "120", qq: "" },
  ];
  it("groups the take-off by BOQ item and counts the lines with no item code", () => {
    const { measured, unassigned } = measuredByItem(lines);
    expect(measured.find((m) => m.ref === "2.2")).toMatchObject({ qty: 180.5, lines: 2 });
    expect(unassigned).toBe(1);
  });
  it("current = measured − previous; a unit that differs or an unknown item is listed, never applied; a drop is a correction", () => {
    const r = applyMeasured(cert, measuredByItem(lines).measured);
    expect(r.items.map((x) => x.qq)).toEqual(["", "60.5", "-21.8"]);
    expect(r.applied.map((a) => a.ref)).toEqual(["2.2", "4.1"]);
    expect(r.unitConflicts).toEqual([{ ref: "2.1", boqUnit: "م³", measuredUnit: "م²" }]);
    expect(r.unmatched.map((m) => m.ref)).toEqual(["9.9"]);
    expect(r.corrections).toEqual(["4.1"]);
    expect(cert[1].qq).toBe("");                      // the input is never mutated
  });
});

describe("the certificate takes the BOQ", () => {
  it("«replace» keeps previous and current quantities for unchanged item codes; «append» adds after the filled items", async () => {
    const { itemsFromBoq } = await import("../src/features/tools/office/ipc");
    const items: any[] = [
      { id: "a", section: "", ref: "2.1", desc: "قديم", unit: "م³", qc: "100", rate: "1700", qp: "60", qq: "15" },
      { id: "b", section: "", ref: "", desc: "", unit: "م³", qc: "", rate: "", qp: "0", qq: "" },
    ];
    const rows = [
      { row: 5, ref: "2.1", desc: "خرسانة عادية", unit: "م³", qty: 120, rate: 1800, section: "الخرسانة" },
      { row: 6, ref: "2.2", desc: "خرسانة مسلحة", unit: "م³", qty: 420, rate: 4500, section: "الخرسانة" },
    ];
    const rep = itemsFromBoq(items, rows, "replace");
    expect(rep.map((x) => [x.ref, x.qc, x.rate, x.qp, x.qq, x.id])).toEqual([["2.1", "120", "1800", "60", "15", "a"], ["2.2", "420", "4500", "0", "", rep[1].id]]);
    const app = itemsFromBoq(items, rows, "append");
    expect(app.map((x) => x.ref)).toEqual(["2.1", "2.1", "2.2"]);     // the empty starter line is dropped
  });
});
