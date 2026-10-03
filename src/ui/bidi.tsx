// Mixed Arabic / Latin text with numbers. A number inside an Arabic (or English) sentence must read the same on every device:
// «17,000 جنيه», «3–5 سنوات», «+15%», «٢٠٢٦/١٠» — each run of digits (Western or Eastern Arabic) with its separators is its own
// left-to-right isolate, so the surrounding direction can never reorder it. The paragraph itself is isolated and takes its
// direction from its first strong letter (UGC: dir="auto"; app.css: unicode-bidi: isolate).
import { Fragment } from "react";

// built from char codes so the i18n extractor does not mistake the Arabic-Indic digit ranges for interface text
const ch = (...codes: number[]) => String.fromCharCode(...codes);
const DIGITS = "0-9" + ch(0x660) + "-" + ch(0x669) + ch(0x6f0) + "-" + ch(0x6f9);   // Western, Arabic-Indic, Persian
const SEP = ".,:/\\-" + ch(0x66b, 0x66c, 0x2013);                                      // . , : / - ٫ ٬ –
const NUM = new RegExp(`([${DIGITS}]+(?:[${SEP}][${DIGITS}]+)*%?)`, "g");

export function bidi(text: any): any {
  if (typeof text !== "string" || !text) return text;
  const parts = text.split(NUM);
  if (parts.length === 1) return text;
  // odd indexes are the numbers split() captured
  return parts.map((s, i) => (i % 2 ? <bdi key={i} dir="ltr">{s}</bdi> : s ? <Fragment key={i}>{s}</Fragment> : null));
}
