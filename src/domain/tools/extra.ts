// =====================================================================
//  «إضافات المهندس» — what the engineer adds to ANY tool document beyond the tool's own form:
//  · custom parameters (a label, a value, a unit): the site's own figures, printed as they were typed;
//  · custom rows (description, quantity, unit, waste %): the quantity to order = quantity × (1 + waste / 100).
//  Pure: body → rows → document blocks / an Excel sheet. The blocks go through the same document kit as the tool's own
//  sections, so the PDF, the Word copy and the workbook all carry them; in Excel the order quantity is a live formula.
//  No price fields here by design: field tools never carry money (the money tools have their own priced lines).
// =====================================================================
import type { DocBlock, DocSpec } from "../../doc/model";
import type { XCell, XRow, XSheet } from "../../doc/xlsx";
import { numInputParse } from "../../lib/num-input";

export type ExtraParam = { label: string; value: string; unit: string };
export type ExtraRow = { desc: string; qty: string; unit: string; waste: string; note: string };
export type DocExtra = { params: ExtraParam[]; rows: ExtraRow[] };

export const EXTRA_MAX = { params: 30, rows: 100 };
export const blankExtra = (): DocExtra => ({ params: [], rows: [] });
export const blankParam = (): ExtraParam => ({ label: "", value: "", unit: "" });
export const blankRow = (): ExtraRow => ({ desc: "", qty: "", unit: "", waste: "", note: "" });

const num = (s: string | undefined) => {
  const n = numInputParse(s || "");
  return n != null && Number.isFinite(n) ? n : 0;
};
// half away from zero at 2 decimals — what Excel's ROUND does, so the sheet's formula and the PDF agree
export const round2 = (x: number) => (Math.sign(x) * Math.round(Math.abs(x) * 100 + 1e-9)) / 100;

export type ExtraCalcRow = { desc: string; qty: number; unit: string; wastePct: number; order: number; note: string };

// only what was really filled in: a parameter needs a label or a value, a row a description or a quantity
export function extraCalc(extra: DocExtra | null | undefined) {
  const params = (extra?.params || [])
    .map((p) => ({ label: (p.label || "").trim(), value: (p.value || "").trim(), unit: (p.unit || "").trim() }))
    .filter((p) => p.label || p.value);
  const rows: ExtraCalcRow[] = (extra?.rows || [])
    .filter((r) => (r.desc || "").trim() || num(r.qty) !== 0)
    .map((r) => {
      const qty = num(r.qty);
      const wastePct = Math.max(0, num(r.waste));
      return { desc: (r.desc || "").trim(), qty, unit: (r.unit || "").trim(), wastePct, order: round2(qty * (1 + wastePct / 100)), note: (r.note || "").trim() };
    });
  return { params, rows, empty: !params.length && !rows.length };
}

export const hasExtra = (extra: DocExtra | null | undefined) => !extraCalc(extra).empty;

const ORDER_F = "ROUND({qty}*(1+{w}/100),2)";

export function extraBlocks(extra: DocExtra | null | undefined): DocBlock[] {
  const c = extraCalc(extra);
  if (c.empty) return [];
  const out: DocBlock[] = [{ k: "heading", text: "إضافات المهندس" }];
  if (c.params.length) {
    out.push({ k: "kv", cols: 2, rows: c.params.map((p) => ({ label: p.label || "—", value: [p.value || "—", p.unit].filter(Boolean).join(" ") })) });
  }
  if (c.rows.length) {
    out.push({
      k: "table", id: "extra", caption: "بنود إضافية",
      cols: [
        { key: "n", label: "#", wMm: 9, align: "center", num: { dp: 0 } },
        { key: "desc", label: "البند", wMm: 58, align: "start" },
        { key: "qty", label: "الكمية", wMm: 22, align: "end", num: { dp: 2 } },
        { key: "unit", label: "الوحدة", wMm: 16, align: "center" },
        { key: "w", label: "الهالك", unit: "%", wMm: 15, align: "end", num: { dp: 1 } },
        { key: "ord", label: "المطلوب بالهالك", wMm: 24, align: "end", num: { dp: 2 }, xl: { f: ORDER_F } },
        { key: "note", label: "ملاحظات", wMm: 30, align: "start" },
      ],
      rows: c.rows.map((r, i) => ({ cells: { n: i + 1, desc: r.desc || "—", qty: r.qty, unit: r.unit, w: r.wastePct, ord: r.order, note: r.note } })),
    });
  }
  return out;
}

const TAIL = new Set(["basis", "disclaimer", "signatures"]);

// the additions go at the end of the document's content — before the basis, the disclaimer and the signatures
export function withExtra(spec: DocSpec, extra: DocExtra | null | undefined): DocSpec {
  const blocks = extraBlocks(extra);
  if (!blocks.length || !spec.sections.length) return spec;
  const last = spec.sections.length - 1;
  const sec = spec.sections[last];
  let at = sec.blocks.findIndex((b) => TAIL.has(b.k));
  if (at < 0) at = sec.blocks.length;
  const sections = spec.sections.map((s, i) => (i === last ? { ...s, blocks: [...s.blocks.slice(0, at), ...blocks, ...s.blocks.slice(at)] } : s));
  return { ...spec, sections };
}

// the same additions as one sheet, for the tools that write their own workbook (parameters on top, then the rows with a
// live «quantity × (1 + waste)» formula in every line)
export function extraSheet(extra: DocExtra | null | undefined): XSheet | null {
  const c = extraCalc(extra);
  if (c.empty) return null;
  const head = { b: true, fill: "band" as const, border: true, center: true, wrap: true };
  const cell = { border: true };
  const rows: XRow[] = [{ cells: [{ v: "إضافات المهندس", s: { b: true, sz: 13 }, span: 7 }], ht: 22 }];
  for (const p of c.params) {
    const n = Number(p.value.replace(/,/g, ""));
    const isNum = /^-?[\d,]*\.?\d+$/.test(p.value) && Number.isFinite(n);
    rows.push({ cells: [{ v: p.label || "—", s: { ...cell, b: true }, span: 2 }, { v: isNum ? n : p.value, s: cell }, { v: p.unit, s: cell }] });
  }
  if (c.rows.length) {
    if (c.params.length) rows.push({ cells: [] });
    rows.push({ cells: ["#", "البند", "الكمية", "الوحدة", "الهالك (%)", "المطلوب بالهالك", "ملاحظات"].map((v) => ({ v, s: head })), ht: 30 });
    c.rows.forEach((r, i) => {
      const n = rows.length + 1;
      const cells: XCell[] = [
        { v: i + 1, s: { ...cell, center: true } },
        { v: r.desc || "—", s: { ...cell, wrap: true } },
        { v: r.qty, s: { ...cell, num: "#,##0.00" } },
        { v: r.unit, s: { ...cell, center: true } },
        { v: r.wastePct, s: { ...cell, num: "0.0" } },
        { f: `ROUND(C${n}*(1+E${n}/100),2)`, v: r.order, s: { ...cell, num: "#,##0.00", b: true } },
        { v: r.note, s: { ...cell, wrap: true } },
      ];
      rows.push({ cells });
    });
  }
  return { name: "إضافات المهندس", rows, widths: [6, 34, 14, 10, 12, 18, 28] };
}
