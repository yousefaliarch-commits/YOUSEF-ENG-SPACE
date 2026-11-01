// =====================================================================
//  Document kit — any tool document as a live Excel workbook (.xlsx), built on the device
//  · The third leg of the export triad (PDF · Word · Excel). A minimal valid SpreadsheetML package zipped with fflate, the
//    approach of the Word exporter (./docx.ts): content types, rels, workbook, one sheet per table, styles, core props.
//  · Live formulas, not pasted numbers: a column can carry an Excel formula template ({key} placeholders for the same
//    row's other columns, DocCol.xl.f) and every summed column ends in =SUM / =SUBTOTAL. Each cell keeps the engine's value
//    as its cached result, and a formula is written only when it reproduces that value at the column's printed decimals
//    (evalFormula below) — the workbook can never disagree with the PDF. The file asks Excel to recalculate on open.
//  · Built for forwarding into commercial and billing systems: one header row per table sheet, frozen, filterable, typed
//    numbers with number formats, repeated when printed; A4 page setup fitted to width; right-to-left sheets for Arabic.
//  · White-label: the issuer is the author (dc:creator), no app name anywhere, no docProps/app.xml.
// =====================================================================
import { strToU8, zipSync } from "fflate";
import type { DocBlock, DocCol, DocLang, DocRow, DocSpec, DocText, TitleParty } from "./model";

export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// ---------------------------------------------------------------------
//  The workbook model
// ---------------------------------------------------------------------
export type XFmt = {
  b?: boolean;
  sz?: number;
  color?: "ink" | "muted" | "accent" | "good" | "bad";
  fill?: "head" | "band" | "total";
  num?: string;                     // an Excel number format, e.g. "#,##0.00"
  center?: boolean;
  wrap?: boolean;
  border?: boolean;                 // thin rules on all four sides
  top2?: boolean;                   // a double rule above (totals)
  top?: boolean;                    // align to the top of the cell (wrapped notes)
};
export type XValue = string | number | boolean | null | undefined;
export type XCell = { v?: XValue; f?: string; s?: XFmt; span?: number } | XValue;
export type XRow = { cells: XCell[]; ht?: number };
export type XSheet = {
  name: string;
  rows: XRow[];
  widths?: number[];                // in characters
  freeze?: number;                  // rows frozen at the top
  filter?: { row: number; cols: number };   // autofilter over a header row (1-based)
  printTitles?: number;             // the 1-based row repeated on every printed page
  landscape?: boolean;
};
export type Workbook = { lang: DocLang; title: string; author: string; sheets: XSheet[] };

// ---------------------------------------------------------------------
//  Text and references
// ---------------------------------------------------------------------
// the PDF backend's isolates and embeddings mean nothing in a spreadsheet cell; characters XML 1.0 can't carry break the file
const MARKS = /[⁦-⁩‪-‮]/g;
const XML_BAD = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;
const clean = (s: unknown) => String(s ?? "").replace(MARKS, "").replace(XML_BAD, "");
const esc = (s: unknown) => clean(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function colName(i: number): string {
  let n = i + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}
export const ref = (col: number, row: number) => `${colName(col)}${row}`;

// Excel's rules for a sheet name: 1–31 characters, none of : \ / ? * [ ], unique in the workbook
function sheetNames(names: string[]): string[] {
  const used = new Set<string>();
  return names.map((raw, i) => {
    let base = clean(raw).replace(/[:\\/?*[\]]/g, " ").replace(/\s+/g, " ").trim().replace(/^'+|'+$/g, "").slice(0, 31) || `Sheet${i + 1}`;
    let name = base;
    for (let k = 2; used.has(name.toLowerCase()); k++) name = `${base.slice(0, 31 - String(k).length - 1)} ${k}`;
    used.add(name.toLowerCase());
    return name;
  });
}
const quoted = (name: string) => `'${name.replace(/'/g, "''")}'`;

// ---------------------------------------------------------------------
//  Formula check: evaluate an Excel formula over known values, so a template is written only when it agrees with the engine
// ---------------------------------------------------------------------
type Tok = { t: "num" | "ref" | "id" | "op"; v: string };

function tokenize(src: string): Tok[] | null {
  const out: Tok[] = [];
  let i = 0;
  const s = src.replace(/^=/, "");
  while (i < s.length) {
    const c = s[i];
    if (c === " ") { i++; continue; }
    const num = /^(\d+(\.\d+)?|\.\d+)([eE][+-]?\d+)?/.exec(s.slice(i));
    if (num) { out.push({ t: "num", v: num[0] }); i += num[0].length; continue; }
    const rng = /^\$?[A-Z]{1,3}\$?\d+(:\$?[A-Z]{1,3}\$?\d+)?/.exec(s.slice(i));
    if (rng && !/^[A-Z]+\(/.test(s.slice(i))) { out.push({ t: "ref", v: rng[0].replace(/\$/g, "") }); i += rng[0].length; continue; }
    const id = /^[A-Z][A-Z0-9.]*/.exec(s.slice(i));
    if (id) { out.push({ t: "id", v: id[0] }); i += id[0].length; continue; }
    const cmp = /^(<=|>=|<>|<|>|=)/.exec(s.slice(i));
    if (cmp) { out.push({ t: "op", v: cmp[0] }); i += cmp[0].length; continue; }
    if ("+-*/^(),".includes(c)) { out.push({ t: "op", v: c }); i++; continue; }
    return null;
  }
  return out;
}

const roundTo = (x: number, n: number, mode: "half" | "up" | "down" = "half") => {
  const f = Math.pow(10, n);
  const a = Math.abs(x) * f;
  const r = mode === "half" ? Math.round(a + 1e-9) : mode === "up" ? Math.ceil(a - 1e-9) : Math.floor(a + 1e-9);
  return (Math.sign(x) * r) / f;
};

function cellsOf(range: string, get: (r: string) => number | null): (number | null)[] {
  const [a, b] = range.split(":");
  if (!b) return [get(a)];
  const pa = /^([A-Z]+)(\d+)$/.exec(a);
  const pb = /^([A-Z]+)(\d+)$/.exec(b);
  if (!pa || !pb) return [null];
  const ci = (s: string) => s.split("").reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
  const out: (number | null)[] = [];
  for (let c = Math.min(ci(pa[1]), ci(pb[1])); c <= Math.max(ci(pa[1]), ci(pb[1])); c++) {
    for (let r = Math.min(+pa[2], +pb[2]); r <= Math.max(+pa[2], +pb[2]); r++) out.push(get(ref(c, r)));
  }
  return out;
}

// numbers, references, + − × ÷ ^, unary minus, brackets, comparisons, IF and the functions the tools use; null when it cannot
// evaluate
export function evalFormula(formula: string, get: (r: string) => number | null): number | null {
  const toks = tokenize(formula);
  if (!toks) return null;
  let p = 0;
  const peek = () => toks[p];
  const take = () => toks[p++];
  const FN: Record<string, (args: (number | null)[][]) => number | null> = {
    SUM: (a) => a.flat().reduce<number>((s, v) => s + (v || 0), 0),
    // SUBTOTAL(9 | 109, range): a sum — the caller's ranges never hold another subtotal's cell when it checks one
    SUBTOTAL: (a) => (a[0][0] === 9 || a[0][0] === 109 ? a.slice(1).flat().reduce<number>((s, v) => s + (v || 0), 0) : null),
    MAX: (a) => Math.max(...(a.flat().filter((v) => v != null) as number[])),
    MIN: (a) => Math.min(...(a.flat().filter((v) => v != null) as number[])),
    ABS: (a) => (a[0][0] == null ? null : Math.abs(a[0][0]!)),
    SQRT: (a) => (a[0][0] == null ? null : Math.sqrt(a[0][0]!)),
    PI: () => Math.PI,
    ROUND: (a) => (a[0][0] == null ? null : roundTo(a[0][0]!, a[1]?.[0] ?? 0)),
    ROUNDUP: (a) => (a[0][0] == null ? null : roundTo(a[0][0]!, a[1]?.[0] ?? 0, "up")),
    ROUNDDOWN: (a) => (a[0][0] == null ? null : roundTo(a[0][0]!, a[1]?.[0] ?? 0, "down")),
    CEILING: (a) => (a[0][0] == null || !a[1]?.[0] ? null : Math.ceil(a[0][0]! / a[1][0]! - 1e-9) * a[1][0]!),
    FLOOR: (a) => (a[0][0] == null || !a[1]?.[0] ? null : Math.floor(a[0][0]! / a[1][0]! + 1e-9) * a[1][0]!),
  };
  const primary = (): number | null => {
    const t = take();
    if (!t) throw 0;
    if (t.t === "num") return Number(t.v);
    if (t.t === "ref") {
      const v = cellsOf(t.v, get);
      return v.length === 1 ? v[0] : null;
    }
    if (t.t === "op" && t.v === "(") {
      const v = cmpExpr();
      if (take()?.v !== ")") throw 0;
      return v;
    }
    if (t.t === "op" && t.v === "-") {
      const v = power();
      return v == null ? null : -v;
    }
    if (t.t === "op" && t.v === "+") return power();
    if (t.t === "id" && t.v === "IF" && peek()?.v === "(") {
      take();
      const c = cmpExpr();
      if (take()?.v !== ",") throw 0;
      const a = cmpExpr();
      let b: number | null = 0;
      if (peek()?.v === ",") { take(); b = cmpExpr(); }
      if (take()?.v !== ")") throw 0;
      return c == null ? null : c !== 0 ? a : b;
    }
    if (t.t === "id" && FN[t.v] && peek()?.v === "(") {
      take();
      const args: (number | null)[][] = [];
      if (peek()?.v !== ")") {
        for (;;) {
          if (peek()?.t === "ref" && toks[p + 1] && (toks[p + 1].v === "," || toks[p + 1].v === ")") && toks[p].v.includes(":")) {
            args.push(cellsOf(take().v, get));
          } else args.push([cmpExpr()]);
          if (peek()?.v === ",") { take(); continue; }
          break;
        }
      }
      if (take()?.v !== ")") throw 0;
      return FN[t.v](args);
    }
    throw 0;
  };
  const power = (): number | null => {
    let v = primary();
    while (peek()?.v === "^") {
      take();
      const r = primary();
      v = v == null || r == null ? null : Math.pow(v, r);
    }
    return v;
  };
  const term = (): number | null => {
    let v = power();
    while (peek()?.v === "*" || peek()?.v === "/") {
      const op = take().v;
      const r = power();
      v = v == null || r == null ? null : op === "*" ? v * r : r === 0 ? null : v / r;
    }
    return v;
  };
  const expr = (): number | null => {
    let v = term();
    while (peek()?.v === "+" || peek()?.v === "-") {
      const op = take().v;
      const r = term();
      v = v == null || r == null ? null : op === "+" ? v + r : v - r;
    }
    return v;
  };
  // comparisons give 1 / 0, as Excel's TRUE / FALSE do in arithmetic
  const cmpExpr = (): number | null => {
    const a = expr();
    const op = peek()?.v;
    if (op && ["<", ">", "<=", ">=", "=", "<>"].includes(op)) {
      take();
      const b = expr();
      if (a == null || b == null) return null;
      const eps = 1e-9;
      const r = op === "<" ? a < b - eps : op === ">" ? a > b + eps : op === "<=" ? a <= b + eps : op === ">=" ? a >= b - eps : op === "=" ? Math.abs(a - b) <= eps : Math.abs(a - b) > eps;
      return r ? 1 : 0;
    }
    return a;
  };
  try {
    const v = cmpExpr();
    if (p !== toks.length) return null;
    return v != null && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

// does a formula reproduce the engine's value as printed (same value at the column's decimals)?
export const agrees = (formulaValue: number | null, engine: number, dp = 6) =>
  formulaValue != null && roundTo(formulaValue, dp) === roundTo(engine, dp);

// ---------------------------------------------------------------------
//  Styles
// ---------------------------------------------------------------------
const INK = "FF18181B";
const COLOR: Record<NonNullable<XFmt["color"]>, string> = { ink: INK, muted: "FF71717A", accent: "FF3F33A0", good: "FF15803D", bad: "FFB91C1C" };
const FILL: Record<NonNullable<XFmt["fill"]>, string> = { head: "FFEDEDF2", band: "FFF6F6F9", total: "FFF3F1FF" };
const RULE = "FFC9C9D1";
const BUILTIN_FMT: Record<string, number> = { "0": 1, "0.00": 2, "#,##0": 3, "#,##0.00": 4, "0%": 9, "0.00%": 10, "@": 49 };

class Styles {
  fonts = [`<font><sz val="10"/><color rgb="${INK}"/><name val="Arial"/><family val="2"/></font>`];
  fills = [`<fill><patternFill patternType="none"/></fill>`, `<fill><patternFill patternType="gray125"/></fill>`];
  borders = [`<border><left/><right/><top/><bottom/><diagonal/></border>`];
  numFmts = new Map<string, number>();
  xfs = [`<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>`];
  private ids = new Map<string, number>();

  constructor(readonly rtl: boolean) {}

  private index(list: string[], xml: string) {
    const i = list.indexOf(xml);
    if (i >= 0) return i;
    list.push(xml);
    return list.length - 1;
  }

  id(f?: XFmt): number {
    if (!f) return 0;
    const key = JSON.stringify(f);
    const hit = this.ids.get(key);
    if (hit != null) return hit;
    const font = this.index(this.fonts, `<font>${f.b ? "<b/>" : ""}<sz val="${f.sz || 10}"/><color rgb="${COLOR[f.color || "ink"]}"/><name val="Arial"/><family val="2"/></font>`);
    const fill = f.fill ? this.index(this.fills, `<fill><patternFill patternType="solid"><fgColor rgb="${FILL[f.fill]}"/><bgColor indexed="64"/></patternFill></fill>`) : 0;
    const side = (name: string, style: string) => `<${name} style="${style}"><color rgb="${RULE}"/></${name}>`;
    const border = f.border || f.top2
      ? this.index(this.borders, `<border>${f.border ? side("left", "thin") + side("right", "thin") : "<left/><right/>"}${f.top2 ? side("top", "double") : f.border ? side("top", "thin") : "<top/>"}${f.border ? side("bottom", "thin") : "<bottom/>"}<diagonal/></border>`)
      : 0;
    let num = 0;
    if (f.num) {
      num = BUILTIN_FMT[f.num] ?? this.numFmts.get(f.num) ?? 0;
      if (!num) {
        num = 164 + this.numFmts.size;
        this.numFmts.set(f.num, num);
      }
    }
    const align = [f.center ? `horizontal="center"` : "", `vertical="${f.top ? "top" : "center"}"`, f.wrap ? `wrapText="1"` : "", this.rtl ? `readingOrder="2"` : ""].filter(Boolean).join(" ");
    this.xfs.push(`<xf numFmtId="${num}" fontId="${font}" fillId="${fill}" borderId="${border}" xfId="0"${num ? ` applyNumberFormat="1"` : ""} applyFont="1"${fill ? ` applyFill="1"` : ""}${border ? ` applyBorder="1"` : ""} applyAlignment="1"><alignment ${align}/></xf>`);
    const id = this.xfs.length - 1;
    this.ids.set(key, id);
    return id;
  }

  xml(): string {
    const fmts = [...this.numFmts].map(([code, id]) => `<numFmt numFmtId="${id}" formatCode="${esc(code)}"/>`).join("");
    return (
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
      (this.numFmts.size ? `<numFmts count="${this.numFmts.size}">${fmts}</numFmts>` : "") +
      `<fonts count="${this.fonts.length}">${this.fonts.join("")}</fonts>` +
      `<fills count="${this.fills.length}">${this.fills.join("")}</fills>` +
      `<borders count="${this.borders.length}">${this.borders.join("")}</borders>` +
      `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
      `<cellXfs count="${this.xfs.length}">${this.xfs.join("")}</cellXfs>` +
      `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
      `</styleSheet>`
    );
  }
}

// ---------------------------------------------------------------------
//  Sheets, workbook, package
// ---------------------------------------------------------------------
const isCell = (c: XCell): c is { v?: XValue; f?: string; s?: XFmt; span?: number } => c != null && typeof c === "object";
// 15 significant digits, as Excel stores a number (no 12.600000000000001 from binary floating point)
const num = (n: number) => String(Number(n.toPrecision(15)));

function cellXml(c: XCell, r: string, st: Styles): string {
  const o = isCell(c) ? c : { v: c };
  const s = st.id(o.s);
  const sa = s ? ` s="${s}"` : "";
  if (o.f) {
    const f = esc(o.f.replace(/^=/, ""));
    if (typeof o.v === "number" && Number.isFinite(o.v)) return `<c r="${r}"${sa}><f>${f}</f><v>${num(o.v)}</v></c>`;
    if (typeof o.v === "string") return `<c r="${r}"${sa} t="str"><f>${f}</f><v>${esc(o.v)}</v></c>`;
    return `<c r="${r}"${sa}><f>${f}</f></c>`;
  }
  const v = o.v;
  if (typeof v === "number" && Number.isFinite(v)) return `<c r="${r}"${sa}><v>${num(v)}</v></c>`;
  if (typeof v === "boolean") return `<c r="${r}"${sa} t="b"><v>${v ? 1 : 0}</v></c>`;
  const text = v == null ? "" : clean(v);
  if (!text) return s ? `<c r="${r}"${sa}/>` : "";
  return `<c r="${r}"${sa} t="inlineStr"><is><t xml:space="preserve">${esc(text)}</t></is></c>`;
}

function sheetXml(sh: XSheet, st: Styles, rtl: boolean): string {
  const merges: string[] = [];
  let maxCol = 1;
  const rows = sh.rows.map((row, ri) => {
    const r = ri + 1;
    let col = 0;
    const cells: string[] = [];
    for (const c of row.cells) {
      const span = isCell(c) && c.span && c.span > 1 ? c.span : 1;
      cells.push(cellXml(c, ref(col, r), st));
      if (span > 1) {
        merges.push(`${ref(col, r)}:${ref(col + span - 1, r)}`);
        // the merged-over cells keep the style, so a filled or ruled band runs across the whole span
        for (let k = 1; k < span; k++) cells.push(cellXml({ v: null, s: isCell(c) ? c.s : undefined }, ref(col + k, r), st));
      }
      col += span;
    }
    maxCol = Math.max(maxCol, col);
    const ht = row.ht ? ` ht="${row.ht}" customHeight="1"` : "";
    return `<row r="${r}"${ht}>${cells.join("")}</row>`;
  });
  const lastRow = Math.max(1, sh.rows.length);
  const freeze = sh.freeze
    ? `<pane ySplit="${sh.freeze}" topLeftCell="A${sh.freeze + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${sh.freeze + 1}" sqref="A${sh.freeze + 1}"/>`
    : "";
  const cols = sh.widths && sh.widths.length
    ? `<cols>${sh.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${Math.max(4, Math.min(80, Math.round(w * 10) / 10))}" customWidth="1"/>`).join("")}</cols>`
    : "";
  const filter = sh.filter ? `<autoFilter ref="${ref(0, sh.filter.row)}:${ref(sh.filter.cols - 1, Math.max(sh.filter.row, lastRow))}"/>` : "";
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>` +
    `<dimension ref="A1:${ref(maxCol - 1, lastRow)}"/>` +
    `<sheetViews><sheetView workbookViewId="0"${rtl ? ` rightToLeft="1"` : ""}${sh.freeze ? "" : ` tabSelected="0"`}>${freeze}</sheetView></sheetViews>` +
    `<sheetFormatPr defaultRowHeight="15"/>` +
    cols +
    `<sheetData>${rows.join("")}</sheetData>` +
    filter +
    (merges.length ? `<mergeCells count="${merges.length}">${merges.map((m) => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>` : "") +
    `<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>` +
    `<pageSetup paperSize="9" orientation="${sh.landscape ? "landscape" : "portrait"}" fitToWidth="1" fitToHeight="0"/>` +
    `<headerFooter><oddFooter>&amp;C&amp;P / &amp;N</oddFooter></headerFooter>` +
    `</worksheet>`
  );
}

function coreXml(wb: Workbook, now: Date): string {
  const iso = now.toISOString().replace(/\.\d{3}Z$/, "Z");
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">` +
    `<dc:title>${esc(wb.title)}</dc:title><dc:creator>${esc(wb.author)}</dc:creator><cp:lastModifiedBy>${esc(wb.author)}</cp:lastModifiedBy>` +
    `<dc:language>${wb.lang === "ar" ? "ar-EG" : "en-GB"}</dc:language>` +
    `<dcterms:created xsi:type="dcterms:W3CDTF">${iso}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${iso}</dcterms:modified>` +
    `</cp:coreProperties>`
  );
}

// the .xlsx bytes for a workbook
export function workbookXlsx(wb: Workbook, now = new Date()): Uint8Array {
  const rtl = wb.lang === "ar";
  const st = new Styles(rtl);
  const sheets = wb.sheets.length ? wb.sheets : [{ name: "Sheet1", rows: [] }];
  const names = sheetNames(sheets.map((s) => s.name));
  const sheetFiles = sheets.map((s) => sheetXml(s, st, rtl));
  const defined: string[] = [];
  sheets.forEach((s, i) => {
    if (s.filter) {
      const last = Math.max(s.filter.row, s.rows.length);
      defined.push(`<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">${esc(quoted(names[i]))}!$A$${s.filter.row}:$${colName(s.filter.cols - 1)}$${last}</definedName>`);
    }
    if (s.printTitles) defined.push(`<definedName name="_xlnm.Print_Titles" localSheetId="${i}">${esc(quoted(names[i]))}!$${s.printTitles}:$${s.printTitles}</definedName>`);
  });
  const workbook =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<workbookPr/><bookViews><workbookView activeTab="0"/></bookViews>` +
    `<sheets>${names.map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets>` +
    (defined.length ? `<definedNames>${defined.join("")}</definedNames>` : "") +
    `<calcPr calcId="191029" fullCalcOnLoad="1"/>` +
    `</workbook>`;
  const types =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("") +
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
    `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>` +
    `</Types>`;
  const rootRels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
    `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>` +
    `</Relationships>`;
  const wbRels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("") +
    `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    `</Relationships>`;
  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(types),
    "_rels/.rels": strToU8(rootRels),
    "xl/workbook.xml": strToU8(workbook),
    "xl/_rels/workbook.xml.rels": strToU8(wbRels),
    "xl/styles.xml": strToU8(st.xml()),
    "docProps/core.xml": strToU8(coreXml(wb, now)),
  };
  sheetFiles.forEach((xml, i) => {
    files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(xml);
  });
  return zipSync(files, { level: 6 });
}

// ---------------------------------------------------------------------
//  DocSpec → workbook: a summary sheet (title block, values, checks, notes, signatures) + one live sheet per table
// ---------------------------------------------------------------------
// the language of the document being written — labels carry their own English, as in ./docx.ts and ./layout.ts
let LANG: DocLang = "ar";
const L2 = (ar: string, en: string) => (LANG === "ar" ? ar : en);

const numFmt = (dp?: number) => (dp == null ? undefined : dp > 0 ? `#,##0.${"0".repeat(Math.min(dp, 6))}` : "#,##0");

function textOf(t: DocText | number | null | undefined): string {
  if (t == null) return "";
  if (typeof t === "number") return String(t);
  if (typeof t === "string") return clean(t);
  return clean(t.spans.map((s) => s.t).join(""));
}

// a numeric column's cell as a real number when it is one (a string like «1,250.5» included); otherwise its text
function valueOf(t: DocText | number | null | undefined, col: DocCol): XValue {
  if (typeof t === "number") return Number.isFinite(t) ? t : null;
  const s = textOf(t).trim();
  if (col.num && /^-?\d{1,3}(,\d{3})*(\.\d+)?$|^-?\d+(\.\d+)?$/.test(s)) return Number(s.replace(/,/g, ""));
  return s;
}

function partyLabel(role: TitleParty["role"]) {
  return ({
    client: L2("المالك", "Client"),
    project: L2("المشروع", "Project"),
    consultant: L2("الاستشاري", "Consultant"),
    contractor: L2("المقاول", "Contractor"),
    mainContractor: L2("المقاول الرئيسي", "Main contractor"),
    subcontractor: L2("مقاول الباطن", "Subcontractor"),
  })[role] || role;
}

function markWord(mk?: string) {
  if (mk === "ok") return L2("مطابق ✓", "Pass ✓");
  if (mk === "fail") return L2("غير مطابق ✗", "Fail ✗");
  if (mk === "warn") return L2("مشروط", "Conditional");
  if (mk === "na") return L2("لا ينطبق", "N/A");
  return "";
}

const S = {
  title: { b: true, sz: 14 } as XFmt,
  sub: { color: "muted" } as XFmt,
  label: { color: "muted" } as XFmt,
  value: { b: true } as XFmt,
  h: { b: true, sz: 11, color: "accent" } as XFmt,
  head: { b: true, fill: "head", border: true, center: true, wrap: true } as XFmt,
  cell: { border: true } as XFmt,
  note: { wrap: true, top: true } as XFmt,
};

const SUMMARY_COLS = 6;

type TableBlock = Extract<DocBlock, { k: "table" }>;

// one table as its own sheet: header row frozen and filterable, typed numbers, formula columns, SUM / SUBTOTAL totals
function tableSheet(b: TableBlock, name: string, title: string, landscape: boolean): XSheet {
  const cols = b.cols.filter((c) => !c.sketch);
  const H = 2; // row 1: the table's title, row 2: its header
  const rows: XRow[] = [
    { cells: [{ v: title, s: S.h, span: cols.length }], ht: 20 },
    { cells: cols.map((c) => ({ v: c.unit ? `${c.label} (${c.unit})` : c.label, s: S.head })), ht: 30 },
  ];
  const sums = new Set(b.carry?.sumCols || []);
  const hasSub = b.rows.some((r) => r.kind === "subtotal" || r.kind === "total");
  const sumFn = hasSub ? "SUBTOTAL(9," : "SUM(";
  const items: number[] = []; // spreadsheet rows of plain items
  let segStart = H + 1;
  const values = new Map<string, number>(); // A1 → number, for the formula check

  const write = (r: DocRow, rowNo: number): XRow => {
    const kind = r.kind || "item";
    if (kind === "section") {
      segStart = rowNo + 1;
      return { cells: [{ v: textOf(r.cells[cols[0].key] ?? Object.values(r.cells)[0]), s: { b: true, fill: "band", border: true }, span: cols.length }] };
    }
    const bold = kind === "subtotal" || kind === "total";
    const cells: XCell[] = cols.map((c, ci) => {
      const fmt: XFmt = { border: true, num: numFmt(c.num?.dp), ...(bold ? { b: true, fill: "total" } : {}) };
      if (c.mark) return { v: markWord(r.mark), s: { ...fmt, center: true, color: r.mark === "ok" ? "good" : r.mark === "fail" ? "bad" : "ink" } };
      const v = valueOf(r.cells[c.key], c);
      if (typeof v === "number") values.set(ref(ci, rowNo), v);
      if (bold && sums.has(c.key)) {
        const lo = kind === "subtotal" ? segStart : H + 1;
        const cached = items.filter((n) => n >= lo).reduce((s, n) => s + (values.get(ref(ci, n)) || 0), 0);
        return { f: `${sumFn}${ref(ci, lo)}:${ref(ci, rowNo - 1)})`, v: cached, s: fmt };
      }
      return { v, s: { ...fmt, center: c.align === "center" && typeof v !== "number" } };
    });
    // formula columns: the template's result must match the engine's value at the printed decimals, else the value stays
    if (kind === "item") {
      cols.forEach((c, ci) => {
        const tpl = c.xl?.f;
        const cell = cells[ci] as { v?: XValue; f?: string; s?: XFmt };
        if (!tpl || typeof cell.v !== "number") return;
        const keyRef = (key: string) => {
          const k = cols.findIndex((x) => x.key === key);
          return k < 0 ? null : ref(k, rowNo);
        };
        let ok = true;
        const f = tpl.replace(/\{(\w+)\}/g, (_m, key) => {
          const rr = keyRef(key);
          if (!rr) ok = false;
          return rr || "0";
        });
        const fv = ok ? evalFormula(f, (a) => values.get(a) ?? null) : null;
        if (fv != null && agrees(fv, cell.v, c.num?.dp ?? 6)) {
          // the cached value is what Excel will compute on open; it equals the engine's figure at the printed decimals
          cell.f = f;
          cell.v = fv;
          values.set(ref(ci, rowNo), fv);
        }
      });
      items.push(rowNo);
    }
    return { cells };
  };

  b.rows.forEach((r) => rows.push(write(r, rows.length + 1)));
  if (b.totals) {
    const rowNo = rows.length + 1;
    const cells: XCell[] = cols.map((c, ci) => {
      const fmt: XFmt = { b: true, fill: "total", top2: true, border: true, num: numFmt(c.num?.dp) };
      const v = valueOf(b.totals!.cells[c.key], c);
      if (sums.has(c.key) && items.length) {
        const cached = items.reduce((s, n) => s + (values.get(ref(ci, n)) || 0), 0);
        // the engine's total must equal the sum of the rows it printed — else the engine's figure is written as is
        if (typeof v !== "number" || agrees(cached, v, c.num?.dp ?? 6)) return { f: `${sumFn}${ref(ci, H + 1)}:${ref(ci, rowNo - 1)})`, v: cached, s: fmt };
      }
      return { v, s: fmt };
    });
    rows.push({ cells });
  }
  return {
    name,
    rows,
    widths: cols.map((c) => Math.max(6, Math.min(60, c.wMm / 1.9))),
    freeze: H,
    filter: { row: H, cols: cols.length },
    printTitles: H,
    landscape,
  };
}

function summarySheet(spec: DocSpec, tableNames: Map<TableBlock, string>): XSheet {
  const rows: XRow[] = [];
  const put = (cells: XCell[], ht?: number) => rows.push({ cells, ht });
  const gap = () => put([]);
  const { meta, title: tb } = spec;

  put([{ v: tb.title, s: S.title, span: SUMMARY_COLS }], 24);
  put([{ v: meta.docTypeName, s: S.sub, span: SUMMARY_COLS }]);
  gap();
  for (const p of tb.parties.filter((x) => x.name || x.nameEn)) {
    const name = [p.name, p.nameEn && p.nameEn !== p.name ? p.nameEn : ""].filter(Boolean).join(" · ");
    put([{ v: partyLabel(p.role) + (p.issuer ? L2(" — المُصدِر", " — issuer") : ""), s: S.label }, { v: name, s: S.value, span: SUMMARY_COLS - 1 }]);
  }
  const control: [string, string][] = [
    [L2("رقم المستند", "Doc No."), meta.docNo || L2("مسودة", "Draft")],
    [L2("المراجعة", "Rev"), meta.rev],
    [L2("التاريخ", "Date"), (meta.dateIso || "").slice(0, 10)],
    [L2("التخصص", "Discipline"), tb.discipline],
    [L2("الموقع", "Location"), tb.location],
    [L2("المرجع", "Reference"), tb.reference],
  ];
  if (tb.scale) control.push([L2("المقياس", "Scale"), tb.scale]);
  for (const [l, v] of control) put([{ v: l, s: S.label }, { v: clean(v) || "—", span: SUMMARY_COLS - 1 }]);

  const sections = spec.sections.flatMap((s) => s.blocks);
  for (const b of sections) {
    if (b.k === "heading") {
      gap();
      put([{ v: [b.num, b.text].filter(Boolean).join(" · "), s: S.h, span: SUMMARY_COLS }], 18);
    } else if (b.k === "kv") {
      for (const r of b.rows) put([{ v: r.label, s: S.label }, { v: textOf(r.value), s: S.value, span: SUMMARY_COLS - 1 }]);
    } else if (b.k === "kpis") {
      gap();
      for (const k of b.items) {
        const n = Number(clean(k.value).replace(/,/g, ""));
        const isNum = clean(k.value).trim() !== "" && Number.isFinite(n) && /^[-\d.,\s]+$/.test(clean(k.value));
        put([{ v: k.label, s: S.label }, { v: isNum ? n : clean(k.value), s: { ...S.value, num: isNum ? (/\.\d/.test(k.value) ? "#,##0.00" : "#,##0") : undefined } }, { v: k.unit || "", s: S.sub }]);
      }
    } else if (b.k === "checks") {
      gap();
      put([L2("التحقق", "Check"), L2("القيمة", "Value"), L2("الحد", "Limit"), L2("البند المرجعي", "Clause"), L2("النتيجة", "Result")].map((v, i) => ({ v, s: S.head, span: i === 0 ? 2 : 1 })));
      for (const c of b.rows) {
        const res = c.ok === true ? L2("مطابق ✓", "Pass ✓") : c.ok === false ? L2("غير مطابق ✗", "Fail ✗") : L2("للمراجعة", "Review");
        put([
          { v: c.label + (c.unverified ? " ⚑" : ""), s: { ...S.cell, wrap: true }, span: 2 },
          { v: clean(c.value), s: S.cell },
          { v: clean(c.limit), s: S.cell },
          { v: clean(c.clause), s: S.cell },
          { v: res, s: { ...S.cell, b: true, color: c.ok === true ? "good" : c.ok === false ? "bad" : "muted" } },
        ]);
      }
    } else if (b.k === "notes" || b.k === "para" || b.k === "disclaimer") {
      const text = b.k === "notes" ? textOf(b.text) : b.text;
      if (b.k === "notes" && b.title) {
        gap();
        put([{ v: b.title, s: S.h, span: SUMMARY_COLS }]);
      }
      for (const line of clean(text).split("\n")) {
        const lines = Math.max(1, Math.ceil(line.length / 95));
        put([{ v: (b.k === "para" && b.bullet ? "• " : "") + line, s: { ...S.note, color: b.k === "disclaimer" || (b.k === "para" && b.muted) ? "muted" : "ink", b: b.k === "para" && b.strong }, span: SUMMARY_COLS }], lines > 1 ? lines * 14 : undefined);
      }
    } else if (b.k === "table") {
      put([{ v: `${L2("الجدول", "Table")}: ${tableNames.get(b) || ""}`, s: S.sub, span: SUMMARY_COLS }]);
    } else if (b.k === "basis") {
      gap();
      put([{ v: L2("أساس الحساب", "Calculation basis"), s: S.h, span: SUMMARY_COLS }]);
      put([L2("البند", "Item"), L2("القيمة", "Value"), L2("الوحدة", "Unit"), L2("المصدر", "Source"), L2("البند المرجعي", "Clause")].map((v, i) => ({ v, s: S.head, span: i === 0 ? 2 : 1 })));
      for (const r of b.rows) put([{ v: r.label + (r.flagged ? " ⚑" : ""), s: S.cell, span: 2 }, { v: clean(r.override?.value ?? r.value), s: S.cell }, { v: r.unit || "", s: S.cell }, { v: clean(r.source), s: S.cell }, { v: clean(r.clause || ""), s: S.cell }]);
      for (const t of b.formulas) put([{ v: `${t.label}: ${clean(t.expr)} = ${clean(t.value)}${t.clause ? ` (${clean(t.clause)})` : ""}`, s: S.note, span: SUMMARY_COLS }]);
    } else if (b.k === "signatures") {
      gap();
      const parties = b.parties.slice(0, SUMMARY_COLS);
      put(parties.map((p) => ({ v: p.role, s: S.head })));
      put(parties.map((p) => ({ v: p.name || "", s: S.cell })));
      put(parties.map((p) => ({ v: [p.title, p.syndicateNo ? `${L2("رقم القيد", "Reg. no.")} ${p.syndicateNo}` : ""].filter(Boolean).join(" · "), s: { ...S.cell, color: "muted" } })));
      put(parties.map(() => ({ v: L2("التوقيع · التاريخ", "Signature · Date"), s: { ...S.cell, color: "muted", top: true } })), 42);
    } else if (b.k === "photos" || b.k === "sketch") {
      put([{ v: L2("الصور والرسومات في نسخة PDF", "Photos and sketches are in the PDF version"), s: S.sub, span: SUMMARY_COLS }]);
    }
  }
  return { name: L2("ملخص", "Summary"), rows, widths: [26, 22, 16, 16, 18, 16], printTitles: undefined };
}

// a tool document as a workbook (summary + one sheet per table)
export function specWorkbook(spec: DocSpec): Workbook {
  LANG = spec.meta.lang || "ar";
  const tables: { b: TableBlock; landscape: boolean; heading: string }[] = [];
  let heading = "";
  for (const s of spec.sections) {
    for (const b of s.blocks) {
      if (b.k === "heading") heading = b.text;
      if (b.k === "table") tables.push({ b, landscape: s.orientation === "landscape", heading });
    }
  }
  // a table's sheet is named by its caption, else the heading above it, else (the first unnamed one) the document's type
  const typeParts = clean(spec.meta.docTypeName).split("·").map((x) => x.trim());
  const typeName = LANG === "ar" ? typeParts[0] : typeParts[1] || typeParts[0];
  let unnamed = 0;
  const raw = tables.map((t, i) => clean(t.b.caption) || clean(t.heading) || (unnamed++ === 0 && typeName ? typeName : `${L2("جدول", "Table")} ${i + 1}`));
  const names = sheetNames([L2("ملخص", "Summary"), ...raw]).slice(1);
  const tableNames = new Map<TableBlock, string>(tables.map((t, i) => [t.b, names[i]]));
  const sheets = [
    summarySheet(spec, tableNames),
    ...tables.map((t, i) => tableSheet(t.b, names[i], `${clean(spec.title.title)} — ${raw[i]}`, t.landscape)),
  ];
  return { lang: LANG, title: clean(spec.title.title), author: clean(spec.meta.issuer) || "—", sheets };
}

export const specXlsx = (spec: DocSpec, now = new Date()) => workbookXlsx(specWorkbook(spec), now);
