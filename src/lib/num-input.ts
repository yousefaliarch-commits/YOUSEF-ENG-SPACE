// =====================================================================
//  Numbers typed on site — one parser for every tool field
//  · Arabic keyboards type ٠-٩ (and Persian ۰-۹), «٫» or «،» / «,» as the decimal mark and «−» (U+2212) or «-» as minus.
//    A bare Number() turns those into NaN or 0, and an empty field into 0 — a wrong quantity that looks like a real one.
//  · numInputParse() keeps the member's text as typed and returns the number it means, or null when it means none
//    (empty, a lone minus, two decimal points, letters): screens show «—» for null, never a zero.
//  · Thousands separators are not accepted on input (a site engineer types 1250.5, not 1,250.5): a comma is a decimal mark.
// =====================================================================

const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN = "۰۱۲۳۴۵۶۷۸۹";

// the digits and separators a member may type, normalised to ASCII ("12٫5" → "12.5", "−٣" → "-3"); other characters are kept
export function numInputNormalize(raw: string): string {
  let out = "";
  for (const ch of String(raw ?? "")) {
    const a = ARABIC_INDIC.indexOf(ch);
    const p = PERSIAN.indexOf(ch);
    if (a >= 0) out += String(a);
    else if (p >= 0) out += String(p);
    else if (ch === "٫" || ch === "،" || ch === ",") out += ".";
    else if (ch === "−" || ch === "–" || ch === "‐") out += "-";
    else if (ch === " " || ch === " " || ch === " ") continue;
    else out += ch;
  }
  return out.trim();
}

export type NumInputRule = { min?: number; max?: number; integer?: boolean; allowNegative?: boolean };

// the number the text means, or null (empty, incomplete, not a number, or outside the rule)
export function numInputParse(raw: string, rule: NumInputRule = {}): number | null {
  const s = numInputNormalize(raw);
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  if (n < 0 && !rule.allowNegative) return null;
  if (rule.integer && !Number.isInteger(n)) return null;
  if (rule.min != null && n < rule.min) return null;
  if (rule.max != null && n > rule.max) return null;
  return n;
}

// why a typed value is refused — for the field's error line (Arabic; English comes from the dictionary)
export function numInputProblem(raw: string, rule: NumInputRule = {}): string | null {
  const s = numInputNormalize(raw);
  if (s === "" || s === "-" || s === ".") return null;   // still typing: no error yet
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return "اكتب رقمًا فقط";
  const n = Number(s);
  if (n < 0 && !rule.allowNegative) return "القيمة لا تكون سالبة هنا";
  if (rule.integer && !Number.isInteger(n)) return "اكتب عددًا صحيحًا";
  if (rule.min != null && n < rule.min) return `أقل قيمة ${rule.min}`;
  if (rule.max != null && n > rule.max) return `أكبر قيمة ${rule.max}`;
  return null;
}

// a computed value for display: fixed decimals, "—" when there is no number
export const numInputShow = (n: number | null | undefined, decimals = 2) =>
  n == null || !Number.isFinite(n) ? "—" : n.toLocaleString("en-US", { maximumFractionDigits: decimals, minimumFractionDigits: 0 });
