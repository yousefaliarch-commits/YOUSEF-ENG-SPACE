// The export triad's Excel leg (src/doc/xlsx.ts): a tool document becomes a valid .xlsx with live formulas. Every formula is
// re-evaluated here against the cached values in the sheet — a formula that would show a different number from the PDF fails.
import { describe, expect, it } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import type { DocSpec } from "../src/doc/model";
import { XLSX_MIME, colName, evalFormula, specWorkbook, specXlsx, workbookXlsx } from "../src/doc/xlsx";
import { module as bbs } from "../src/features/tools/rebar/bbs";
import { module as concrete } from "../src/features/tools/concrete/concrete";
import { module as toolbox } from "../src/features/tools/site/toolbox";
import { module as permit } from "../src/features/tools/site/permit";
import { module as levelBook } from "../src/features/tools/survey/level-book";

const docOf = (mod: any, body: any) => ({
  id: "dtest", kind: mod.kind, v: mod.v, at: 1, createdAt: 1, projectId: null, title: mod.defaultTitle(body),
  dateIso: "2026-10-20", docNo: "TWR-BBS-0003", rev: "01", status: "issued", body, profile: mod.profile, photos: {}, log: [],
}) as any;

const line = (o: any) => ({
  member: "B1", mark: "01", d: 16, shape: "00", dims: { A: "4000" }, segs: [{ len: "", angle: "45" }, { len: "", angle: "45" }, { len: "", angle: "0" }],
  nMembers: "3", nPer: "4", pos: "unknown", lap: "auto", lapMm: "", ...o,
});
const bbsBody = () => ({
  ...bbs.blank(), group: "سقف الدور الثالث", lines: [
    line({}),
    line({ member: "B2", mark: "02", d: 12, dims: { A: "2650" }, nMembers: "2", nPer: "7" }),
    line({ member: "C1", mark: "03", d: 10, dims: { A: "1180" }, nMembers: "6", nPer: "9" }),
  ],
});
const concreteBody = () => ({
  ...concrete.blank(), scope: "takeoff", rows: [
    { kind: "slab", label: "S1", n: "1", dims: { L: "10", B: "8", t: "0.15", open: "" }, waste: "5" },
    { kind: "column", label: "C1", n: "6", dims: { a: "0.3", b: "0.6", hFF: "3.2", ts: "0.15" }, waste: "3" },
  ],
});

type Sheet = { xml: string; values: Map<string, number>; formulas: { ref: string; f: string; v: number | null }[] };

function sheets(bytes: Uint8Array): { files: Record<string, Uint8Array>; list: Sheet[] } {
  const files = unzipSync(bytes);
  const list = Object.keys(files).filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k)).sort((a, b) => parseInt(a.replace(/\D/g, "")) - parseInt(b.replace(/\D/g, ""))).map((k) => {
    const xml = strFromU8(files[k]);
    const values = new Map<string, number>();
    const formulas: Sheet["formulas"] = [];
    for (const m of xml.matchAll(/<c r="([A-Z]+\d+)"[^>]*?(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const body = m[2] || "";
      const v = /<v>([^<]*)<\/v>/.exec(body);
      const f = /<f>([^<]*)<\/f>/.exec(body);
      if (v && /^-?[\d.eE+-]+$/.test(v[1])) values.set(m[1], Number(v[1]));
      if (f) formulas.push({ ref: m[1], f: f[1].replace(/&amp;/g, "&"), v: v ? Number(v[1]) : null });
    }
    return { xml, values, formulas };
  });
  return { files, list };
}

// every formula, evaluated over the sheet's own cached values, gives its own cached value
function consistent(s: Sheet) {
  for (const x of s.formulas) {
    const got = evalFormula(x.f, (r) => s.values.get(r) ?? null);
    expect(got, `${x.ref} = ${x.f}`).not.toBeNull();
    expect(Math.abs((got as number) - (x.v as number)), `${x.ref} = ${x.f}`).toBeLessThan(1e-6);
  }
}

describe("evalFormula — the check that keeps formulas honest", () => {
  const vals: Record<string, number> = { A1: 2, B1: 3.5, C1: 4, A2: 10, A3: 20, A4: 30 };
  const get = (r: string) => vals[r] ?? null;
  it("arithmetic with precedence, powers and unary minus", () => {
    expect(evalFormula("A1*B1+C1", get)).toBe(11);
    expect(evalFormula("=(A1+B1)*C1", get)).toBe(22);
    expect(evalFormula("-A1^2", get)).toBe(-4);
    expect(evalFormula("C1/A1-1", get)).toBe(1);
  });
  it("Excel's rounding (half away from zero) and the functions the tools use", () => {
    expect(evalFormula("ROUND(2.345,2)", get)).toBe(2.35);
    expect(evalFormula("ROUND(-2.345,2)", get)).toBe(-2.35);
    expect(evalFormula("ROUNDUP(2.301,1)", get)).toBe(2.4);
    expect(evalFormula("CEILING(7.2,0.5)", get)).toBe(7.5);
    expect(evalFormula("SUM(A2:A4)", get)).toBe(60);
    expect(evalFormula("SUBTOTAL(9,A2:A4)", get)).toBe(60);
    expect(evalFormula("MAX(A1,C1,B1)", get)).toBe(4);
  });
  it("refuses what it cannot evaluate instead of guessing", () => {
    expect(evalFormula("VLOOKUP(A1,B1:C1,2)", get)).toBeNull();
    expect(evalFormula("A1/0", get)).toBeNull();
    expect(evalFormula("Z99*2", get)).toBeNull();
    expect(evalFormula("A1+", get)).toBeNull();
  });
  it("names columns past Z", () => {
    expect([colName(0), colName(25), colName(26), colName(701), colName(702)]).toEqual(["A", "Z", "AA", "ZZ", "AAA"]);
  });
});

describe("workbookXlsx — a valid SpreadsheetML package", () => {
  const bytes = workbookXlsx({
    lang: "ar", title: "تجربة", author: "شركة البناء الحديث",
    sheets: [
      { name: "جدول [1]: الكميات/الأعمال", rows: [{ cells: ["البند", "الكمية"] }, { cells: ["حفر <A&B>", 12.5] }, { cells: ["ردم", { f: "B2*2", v: 25, s: { num: "#,##0.00" } }] }], freeze: 1, filter: { row: 1, cols: 2 }, printTitles: 1, widths: [30, 12] },
      { name: "جدول [1]: الكميات/الأعمال", rows: [{ cells: [{ v: "دمج", span: 3, s: { b: true, fill: "band" } }] }] },
    ],
  }, new Date("2026-10-20T08:00:00Z"));
  const { files, list } = sheets(bytes);
  it("has the expected parts, no app.xml, and recalculates on open", () => {
    expect(Object.keys(files).sort()).toEqual(["[Content_Types].xml", "_rels/.rels", "docProps/core.xml", "xl/_rels/workbook.xml.rels", "xl/styles.xml", "xl/workbook.xml", "xl/worksheets/sheet1.xml", "xl/worksheets/sheet2.xml"]);
    expect(strFromU8(files["xl/workbook.xml"])).toContain(`fullCalcOnLoad="1"`);
    expect(XLSX_MIME).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  });
  it("cleans and de-duplicates sheet names (≤ 31 characters, no : \\ / ? * [ ])", () => {
    const names = [...strFromU8(files["xl/workbook.xml"]).matchAll(/<sheet name="([^"]+)"/g)].map((m) => m[1]);
    expect(names).toHaveLength(2);
    names.forEach((n) => { expect(n.length).toBeLessThanOrEqual(31); expect(n).not.toMatch(/[:\\/?*[\]]/); });
    expect(names[0]).not.toBe(names[1]);
  });
  it("writes right-to-left, a frozen header, a filter, print titles, a merged band and escaped text", () => {
    const s = list[0].xml;
    expect(s).toContain(`rightToLeft="1"`);
    expect(s).toContain(`state="frozen"`);
    expect(s).toContain(`<autoFilter ref="A1:B3"/>`);
    expect(strFromU8(files["xl/workbook.xml"])).toContain("_xlnm.Print_Titles");
    expect(s).toContain("حفر &lt;A&amp;B&gt;");
    expect(list[1].xml).toContain(`<mergeCell ref="A1:C1"/>`);
    expect(strFromU8(files["xl/styles.xml"])).toContain(`numFmtId="4"`); // #,##0.00 is a built-in format
  });
  it("keeps the formula with its cached value", () => {
    expect(list[0].formulas).toEqual([{ ref: "B3", f: "B2*2", v: 25 }]);
    consistent(list[0]);
  });
  it("names the issuer as the author and never the app", () => {
    const core = strFromU8(files["docProps/core.xml"]);
    expect(core).toContain("<dc:creator>شركة البناء الحديث</dc:creator>");
    for (const [k, v] of Object.entries(files)) expect(strFromU8(v), k).not.toMatch(/EngSpace/i);
  });
});

describe("specXlsx — real tool documents with live formulas", () => {
  it("BBS: count, total length and weight are formulas, the weights end in a SUM, and every formula matches the engine", () => {
    const s = bbs.build(docOf(bbs, bbsBody()), null) as DocSpec;
    const wb = specWorkbook(s);
    expect(wb.sheets.length).toBeGreaterThanOrEqual(3); // summary + bar schedule + weights by diameter
    const { list } = sheets(specXlsx(s));
    const bars = list[1];
    const fs = bars.formulas.map((x) => x.f);
    expect(fs.filter((f) => /^[A-Z]+\d+\*[A-Z]+\d+$/.test(f)).length).toBeGreaterThanOrEqual(6); // tn = nm×ne and kg = tm×kgm per bar
    expect(fs.filter((f) => /\/1000$/.test(f)).length).toBe(3);                                     // tm = tn×cut/1000 per bar
    expect(fs.some((f) => /^SUM\(/.test(f))).toBe(true);
    list.slice(1).forEach(consistent);
    // the weights by diameter: kg = m × kg/m and t = kg/1000, summed
    expect(list[2].formulas.some((x) => /\/1000$/.test(x.f))).toBe(true);
    expect(list[2].formulas.filter((x) => /^SUM\(/.test(x.f)).length).toBeGreaterThanOrEqual(2);
  });
  it("concrete take-off: ordered volume = net × (1 + waste), totals are SUMs", () => {
    const s = concrete.build(docOf(concrete, concreteBody()), null) as DocSpec;
    const { list } = sheets(specXlsx(s));
    const els = list.find((x) => x.formulas.some((f) => /\(1\+/.test(f.f)))!;
    expect(els, "the elements sheet has the waste formula").toBeTruthy();
    expect(els.formulas.filter((f) => /\(1\+/.test(f.f)).length).toBe(2);
    expect(els.formulas.filter((f) => /^SUM\(/.test(f.f)).length).toBe(3);
    consistent(els);
  });
  it.each([["toolbox", toolbox], ["permit", permit], ["level book", levelBook]])("%s exports a well-formed workbook", (_k, mod: any) => {
    const s = mod.build(docOf(mod, mod.blank()), null) as DocSpec;
    const { files, list } = sheets(specXlsx(s));
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(strFromU8(files["docProps/core.xml"])).not.toMatch(/EngSpace/i);
    list.forEach(consistent);
  });
});
