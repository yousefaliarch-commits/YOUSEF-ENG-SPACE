// =====================================================================
//  Document kit — text helpers (pure): direction, Latin digits, number format, line wrapping
//  · Reports use Latin digits everywhere; numbers, units, codes and dates are LTR runs, wrapped in LRI…PDI isolates when
//    they sit inside Arabic text so a minus sign or a unit never jumps to the wrong side.
//  · Wrapping never throws: an overlong word breaks between graphemes.
// =====================================================================
import type { DocFont, DocMeasurer, DocText } from "./model";

const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
export const LRI = "⁦";
export const PDI = "⁩";
export const MINUS = "−";
export const NBSP = " ";

export const hasArabic = (s: string) => ARABIC.test(s);

export const latinDigits = (s: string) =>
  s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06F0));

// 12,345.60 · 9876.5 · −3.20 — fixed decimals, thousands separators from 10,000, a real minus sign
export function fmtNum(x: number | null | undefined, dp = 2): string {
  if (x == null || !Number.isFinite(x)) return "—";
  const neg = x < 0 || Object.is(x, -0) && false;
  const abs = Math.abs(x);
  let s = abs.toFixed(dp);
  if (abs >= 10000) {
    const [int, frac] = s.split(".");
    s = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (frac != null ? "." + frac : "");
  }
  return (neg && Number(s.replace(/,/g, "")) !== 0 ? MINUS : "") + s;
}

// a number with its unit kept together («250 mm»)
export const withUnit = (v: string, unit?: string) => (unit ? `${v}${NBSP}${unit}` : v);

// an LTR run inside Arabic text
export const iso = (s: string) => `${LRI}${s}${PDI}`;

export const stripIsolates = (s: string) => s.replace(/[⁦-⁩]/g, "");

// DocText → one string (LTR spans isolated) + the heaviest weight it asks for
export function flatText(t: DocText | number | null | undefined): { text: string; w?: 450 | 600 | 700 } {
  if (t == null) return { text: "" };
  if (typeof t === "number") return { text: String(t) };
  if (typeof t === "string") return { text: t };
  let w: 450 | 600 | 700 | undefined;
  const text = t.spans
    .map((s) => {
      if (s.w && (!w || s.w > w)) w = s.w;
      return s.dir === "ltr" ? iso(s.t) : s.t;
    })
    .join("");
  return { text, w };
}

function graphemes(s: string): string[] {
  const Seg = (Intl as any).Segmenter;
  if (Seg) return Array.from(new Seg(undefined, { granularity: "grapheme" }).segment(s), (x: any) => x.segment);
  return Array.from(s);
}

// greedy wrap at spaces; explicit newlines kept; overlong words broken by graphemes
export function wrapText(text: string, maxMm: number, f: DocFont, m: DocMeasurer): string[] {
  const out: string[] = [];
  for (const para of String(text ?? "").split(/\r?\n/)) {
    const words = para.split(/ +/).filter((w) => w.length);
    if (!words.length) {
      out.push("");
      continue;
    }
    let cur = "";
    for (const word of words) {
      const next = cur ? cur + " " + word : word;
      if (m.width(next, f) <= maxMm) {
        cur = next;
        continue;
      }
      if (cur) out.push(cur);
      if (m.width(word, f) <= maxMm) {
        cur = word;
        continue;
      }
      // the word alone is too wide: break it between graphemes
      let piece = "";
      for (const g of graphemes(word)) {
        if (piece && m.width(piece + g, f) > maxMm) {
          out.push(piece);
          piece = g;
        } else piece += g;
      }
      cur = piece;
    }
    out.push(cur);
  }
  return out.length ? out : [""];
}

// at most n lines; the last one ends with an ellipsis when something was cut
export function clampLines(lines: string[], n: number, maxMm: number, f: DocFont, m: DocMeasurer): string[] {
  if (lines.length <= n) return lines;
  const kept = lines.slice(0, n);
  let last = kept[n - 1];
  while (last.length > 1 && m.width(last + "…", f) > maxMm) last = last.slice(0, -1);
  kept[n - 1] = last + "…";
  return kept;
}

// ISO date → «9 أكتوبر 2026» / "9 October 2026" (long form, prose only)
const AR_MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const EN_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export function longDate(iso: string, lang: "ar" | "en") {
  const [y, mo, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !mo || !d) return iso;
  return `${d} ${(lang === "ar" ? AR_MONTHS : EN_MONTHS)[mo - 1]} ${y}`;
}
