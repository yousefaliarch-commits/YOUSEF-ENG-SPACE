// =====================================================================
//  Bill of quantities in, measured quantities out (W8). Nobody types 300 BOQ lines on a phone (docs/TOOLS-BLUEPRINT.md → ipc):
//  · importBoq — rows from an .xlsx sheet, a CSV / TSV file or a paste → BOQ items, with the columns found from their Arabic or
//    English headers (or chosen by hand), section rows carried to the items under them, and every problem named before
//    anything is saved: a missing unit, a cell that is not a number, a duplicate item code, a quantity × rate that does not
//    match the amount column.
//  · applyMeasured — the take-off's measured (cumulative) quantities per BOQ item → this certificate's quantities:
//    current = measured − previously certified; a unit that differs or an item the certificate does not have is listed,
//    never applied. Pure, no I/O.
// =====================================================================

export const BOQ_ENGINE = "boq@1";

// ---- text → rows ----
export function parseDelimited(text: string): string[][] {
  const src = String(text || "").replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const first = src.split("\n").find((l) => l.trim()) || "";
  const counts: [string, number][] = [["\t", first.split("\t").length], [";", first.split(";").length], [",", first.split(",").length]];
  const sep = counts.sort((a, b) => b[1] - a[1])[0][1] > 1 ? counts[0][0] : "\t";
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === sep) { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// «١٬٢٥٠٫٥٠», «1,250.50», «(320)», «12 %» → numbers; anything else → null
export function toNumber(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  let s = String(raw ?? "").trim();
  if (!s) return null;
  s = s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
  s = s.replace(/٫/g, ".").replace(/[٬,\s  ]/g, "").replace(/[^\d.()\-+eE]/g, (c) => (c === "%" ? "" : c));
  const neg = /^\(.*\)$/.test(s);
  s = s.replace(/[()]/g, "");
  if (!/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? (neg ? -n : n) : null;
}

// ---- columns ----
export type BoqField = "ref" | "desc" | "unit" | "qty" | "rate" | "amount";
export type BoqMapping = Partial<Record<BoqField, number>>;
const SYNONYMS: Record<BoqField, RegExp> = {
  ref: /^(رقم البند|البند|بند|م|رقم|item|item no\.?|no\.?|ref\.?|code|s\.?n\.?)$/i,
  desc: /(البيان|بيان|الوصف|وصف|الأعمال|description|desc|works?)/i,
  unit: /^(الوحدة|وحدة|وحدة القياس|unit|uom|u\.o\.m\.?)$/i,
  qty: /(الكمية|كمية|qty|quantity|quan)/i,
  rate: /(الفئة|فئة|سعر الوحدة|السعر|سعر|rate|unit price|price)/i,
  amount: /(القيمة|الإجمالي|اجمالي|المبلغ|amount|total|value)/i,
};
const norm = (s: string) => String(s || "").replace(/[ً-ْـ]/g, "").replace(/\s+/g, " ").trim();

// the header row (within the first 15) and which column is which
export function detectColumns(rows: string[][]): { header: number; mapping: BoqMapping } {
  let best = { header: -1, mapping: {} as BoqMapping, score: 0 };
  for (let r = 0; r < Math.min(rows.length, 15); r++) {
    const m: BoqMapping = {};
    (rows[r] || []).forEach((cell, c) => {
      const t = norm(cell);
      if (!t) return;
      // most specific first: the amount column often says «إجمالي القيمة», a rate column «سعر الوحدة»
      for (const f of ["unit", "rate", "qty", "amount", "ref", "desc"] as BoqField[]) {
        if (m[f] == null && SYNONYMS[f].test(t) && !Object.values(m).includes(c)) {
          m[f] = c;
          break;
        }
      }
    });
    const score = (m.desc != null ? 2 : 0) + (m.qty != null ? 2 : 0) + (m.rate != null ? 1 : 0) + (m.unit != null ? 1 : 0) + (m.ref != null ? 1 : 0);
    if (score > best.score) best = { header: r, mapping: m, score };
  }
  return best.score >= 4 ? { header: best.header, mapping: best.mapping } : { header: -1, mapping: {} };
}

// ---- rows → items ----
export type BoqRow = { row: number; ref: string; desc: string; unit: string; qty: number; rate: number; section: string };
export type BoqIssue = { row: number; level: "error" | "warn"; kind: "badNumber" | "missingUnit" | "duplicate" | "amountMismatch" | "noRate" | "noColumns"; text: string };

export function importBoq(rows: string[][], mapping?: BoqMapping, header?: number) {
  const det = mapping ? { header: header ?? -1, mapping } : detectColumns(rows);
  const m = det.mapping;
  const issues: BoqIssue[] = [];
  const items: BoqRow[] = [];
  if (m.desc == null || m.qty == null) {
    issues.push({ row: 0, level: "error", kind: "noColumns", text: "لم يُعثر على عمودي البيان والكمية — اختر الأعمدة يدويًا" });
    return { items, issues, mapping: m, header: det.header, sections: 0 };
  }
  const cell = (r: string[], f: BoqField) => (m[f] == null ? "" : String(r[m[f]!] ?? "").trim());
  const seen = new Map<string, number>();
  let section = "";
  let sections = 0;
  rows.forEach((r, i) => {
    if (i <= det.header || !r || r.every((x) => !String(x ?? "").trim())) return;
    const row = i + 1;
    const desc = cell(r, "desc"), ref = cell(r, "ref"), unit = cell(r, "unit");
    const qRaw = cell(r, "qty"), rRaw = cell(r, "rate"), aRaw = cell(r, "amount");
    // a heading (a description with no unit, quantity or rate) names the section of the items under it
    if (desc && !unit && !qRaw && !rRaw) {
      section = desc;
      sections++;
      return;
    }
    if (!desc && !qRaw) return;
    const qty = toNumber(qRaw), rate = toNumber(rRaw), amount = toNumber(aRaw);
    if (qRaw && qty == null) issues.push({ row, level: "error", kind: "badNumber", text: `الصف ${row}: الكمية «${qRaw}» ليست رقمًا` });
    if (rRaw && rate == null) issues.push({ row, level: "error", kind: "badNumber", text: `الصف ${row}: الفئة «${rRaw}» ليست رقمًا` });
    if (!unit) issues.push({ row, level: "warn", kind: "missingUnit", text: `الصف ${row}: بدون وحدة` });
    if (!rRaw && m.rate != null) issues.push({ row, level: "warn", kind: "noRate", text: `الصف ${row}: بدون فئة` });
    if (ref) {
      if (seen.has(ref)) issues.push({ row, level: "error", kind: "duplicate", text: `الصف ${row}: رقم البند ${ref} مكرر (الصف ${seen.get(ref)})` });
      else seen.set(ref, row);
    }
    if (amount != null && qty != null && rate != null) {
      const calc = qty * rate;
      if (Math.abs(calc - amount) > Math.max(1, Math.abs(amount) * 0.005)) {
        issues.push({ row, level: "warn", kind: "amountMismatch", text: `الصف ${row}: الكمية × الفئة = ${Math.round(calc * 100) / 100} لا تساوي القيمة ${amount}` });
      }
    }
    items.push({ row, ref, desc, unit, qty: qty ?? 0, rate: rate ?? 0, section });
  });
  return { items, issues, mapping: m, header: det.header, sections };
}

// ---- units: «م3», «م³», «m3», «M³» are one unit ----
export function unitKey(u: string): string {
  const s = norm(u).toLowerCase().replace(/[.\s]/g, "").replace(/³/g, "3").replace(/²/g, "2");
  if (/^(م3|m3|متر مكعب|مترمكعب|cum|cu\.?m)$/.test(s)) return "m3";
  if (/^(م2|m2|متر مربع|مترمربع|sqm|sq\.?m)$/.test(s)) return "m2";
  if (/^(مط|م\.ط|متر طولي|مترطولي|m|lm|rm|م)$/.test(s)) return "m";
  if (/^(طن|ton|t|tonne)$/.test(s)) return "t";
  if (/^(كجم|كغ|kg)$/.test(s)) return "kg";
  if (/^(عدد|nr|no|pcs|ea|each|قطعة)$/.test(s)) return "nr";
  if (/^(مقطوعية|ls|lumpsum|lump sum|مقطوع)$/.test(s)) return "ls";
  return s;
}

// ---- measured → certificate ----
export type CertItem = { ref: string; unit: string; qp: string; qq: string };
export type Measured = { ref: string; unit: string; qty: number; lines: number };

// the take-off's lines grouped by BOQ item (a line with no item code is left out and counted)
export function measuredByItem(lines: { boq?: string; unit: string; net: number }[]) {
  const map = new Map<string, Measured>();
  let unassigned = 0;
  for (const l of lines) {
    const ref = String(l.boq || "").trim();
    if (!ref) {
      if (l.net > 0) unassigned++;
      continue;
    }
    const k = `${ref}|${unitKey(l.unit)}`;
    const m = map.get(k) || { ref, unit: l.unit, qty: 0, lines: 0 };
    m.qty += l.net;
    m.lines++;
    map.set(k, m);
  }
  return { measured: [...map.values()], unassigned };
}

export function applyMeasured<T extends CertItem>(items: T[], measured: Measured[], toFixed = 3) {
  const out = items.map((x) => ({ ...x }));
  const applied: { ref: string; measured: number; previous: number; current: number }[] = [];
  const unmatched: Measured[] = [];
  const unitConflicts: { ref: string; boqUnit: string; measuredUnit: string }[] = [];
  const corrections: string[] = [];
  for (const m of measured) {
    const i = out.findIndex((x) => String(x.ref).trim() === m.ref);
    if (i < 0) {
      unmatched.push(m);
      continue;
    }
    if (unitKey(out[i].unit) !== unitKey(m.unit)) {
      unitConflicts.push({ ref: m.ref, boqUnit: out[i].unit, measuredUnit: m.unit });
      continue;
    }
    const previous = toNumber(out[i].qp) ?? 0;
    const current = Math.round((m.qty - previous) * 10 ** toFixed) / 10 ** toFixed;
    out[i] = { ...out[i], qq: String(current) };
    applied.push({ ref: m.ref, measured: m.qty, previous, current });
    if (current < 0) corrections.push(m.ref);
  }
  return { items: out, applied, unmatched, unitConflicts, corrections };
}
