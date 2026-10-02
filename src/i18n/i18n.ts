import { createContext, useContext } from "react";
import EN_DICT from "./en.generated.json";
import { genderOf } from "../domain/taxonomy";

// =====================================================================
//  Languages — Arabic (the source) and English
//  · The code is written once, in Arabic. English comes from a dictionary assembled from i18n/*.tsv by scripts/i18n-build.mjs
//    into en.generated.json (bundled with the code): exact strings, plus patterns for strings built from parts
//    («{0} سنوات خبرة» → "{0} years of experience"; plural-aware: "{0} {0|reply|replies}").
//  · React always renders Arabic. In English a DOM pass swaps every text node and label attribute (placeholder, aria-label,
//    title, alt) for its English counterpart the moment React writes it — a MutationObserver, so before paint — and switching
//    back restores the Arabic. React state is never touched: a switch keeps the open screen, sheets, drafts and scroll.
//  · English is the system's language only. What members write — posts, comments, replies, polls, reviews, messages —
//    is community content and stays exactly as written (Arabic, the way engineers here talk): every place that shows it
//    carries {...UGC} (translate="no" + dir="auto"), and the dictionary never holds it (scripts/i18n-extract.mjs flags seed content,
//    scripts/i18n-build.mjs leaves it out), so tr() in notifications, copied text and search can't turn it into English either.
//  · Internal values (rules, search, stored text) stay Arabic; only what is shown changes. Code that shows UI text outside the DOM
//    (notifications, copied text, the AI prompt) calls tr() / isEn() directly.
// =====================================================================
export const LANG_KEY = "engspace.lang";

export const LANGS = { ar: { dir: "rtl", name: "العربية", locale: "ar-EG-u-nu-latn" }, en: { dir: "ltr", name: "English", locale: "en-GB" } };

export const loadLang = () => { try { const q = new URLSearchParams(location.search || "").get("lang"); if (q === "ar" || q === "en") return q; const v = localStorage.getItem(LANG_KEY); return v === "ar" || v === "en" ? v : null; } catch (e) { return null; } };

export const saveLang = (v?: any) => { try { localStorage.setItem(LANG_KEY, v); } catch (e) {} };

export const I18N = { lang: "ar", missing: new Set() };

export const isEn = () => I18N.lang === "en";

export const uiLocale = () => LANGS[I18N.lang].locale;

export const LangCtx = createContext<any>("ar");
 export const useLang = () => useContext(LangCtx);

export const AR_CHARS = /[؀-ۿ]/;

export const latinDigits = (s?: any) => String(s).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/٫/g, ".").replace(/٬/g, ",").replace(/٪/g, "%");


// ---- the dictionary: exact strings in a Map, patterns compiled once into anchored regexes (most specific first) ----
// A placeholder written right against a word («مرشح{1}») may be empty; one separated by a space must hold something.
// Each pattern gets a lazy and a greedy reading; the translator keeps whichever leaves no Arabic behind.
export const DICT = (() => {
  const data = EN_DICT as unknown as { exact?: Record<string, string>; patterns?: [string, string][] };
  const exact = new Map(Object.entries(data.exact || {})); const pats: any = [];
  const esc = (s?: any) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  (data.patterns || []).forEach(([ar, en]: any) => {
    const parts = ar.split(/\{(\d+|n|t)\}/); let lazy = "^", greedy = "^", lit = 0, key = ""; const names: any = [];
    parts.forEach((p, i) => {
      if (i % 2 === 0) { const e = esc(p).replace(/ /g, "\\s+"); lazy += e; greedy += e; lit += p.trim().length; if (p.trim().length > key.length) key = p.trim(); return; }
      names.push(p); const typed = p === "n" ? "([\\d\u0660-\u0669][\\d\u0660-\u0669.,\u066B\u066C]*)" : p === "t" ? "(\\d{1,2}:\\d{2}(?::\\d{2})?)" : null;
      const spaced = /\s$/.test(parts[i - 1] || "") || /^\s/.test(parts[i + 1] || "");
      lazy += typed || (spaced ? "([\\s\\S]+?)" : "([\\s\\S]*?)"); greedy += typed || (spaced ? "([\\s\\S]+)" : "([\\s\\S]*)");
    });
    if (!/[ء-ي]/.test(key)) return; // a pattern whose only fixed part is punctuation («{0}، {1}») would match anything
    try { pats.push({ re: new RegExp(lazy + "$"), reG: new RegExp(greedy + "$"), en, names, w: lit, key }); } catch (e) {}
  });
  pats.sort((a, b) => b.w - a.w);
  return { exact, pats };
})();

// a sentence that opens with a placeholder is capitalised ("{0} was removed" → "The post was removed")
export const fillPattern = (en?: any, caps?: any) => { const out = en.replace(/\{(\w+)(?:\|([^|}]*)\|([^}]*))?\}/g, (m0, k, one, many) => { const v = caps[k]; if (v == null) return m0; if (one == null) return v; const n = parseFloat(latinDigits(v).replace(/[^\d.]/g, "")); return n === 1 ? one : many; }); return en[0] === "{" ? out.charAt(0).toUpperCase() + out.slice(1) : out; };

export const TR_SEPS = [" · ", " — ", " – ", " | ", "، ", " • ", " / ", " ← ", " → "];

export const trCache = new Map();

// Arabic → English, or null when nothing in the dictionary covers it. Strings without Arabic come back unchanged.
export function trCore(s?: any, depth: any = 0) {
  if (s == null) return s; s = String(s); if (!AR_CHARS.test(s)) return s;
  const hit = trCache.get(s); if (hit !== undefined) return hit;
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s); const core = m[2].replace(/\s+/g, " ");
  let out = trFind(core, depth);
  // text laid out in lines (several messages, a pasted list): each line on its own when the whole isn't known
  if ((out == null || arResidue(out)) && /\n/.test(m[2]) && depth < 5) {
    const lines = m[2].split(/\n+/); const tl = lines.map((l) => (AR_CHARS.test(l) ? trCore(l, depth + 1) : l));
    if (tl.some((l, i) => l != null && l !== lines[i])) { const joined = tl.map((l, i) => (l == null ? lines[i] : l)).join("\n"); if (out == null || arResidue(joined) < arResidue(out)) out = joined; }
  }
  const res = out == null ? null : m[1] + latinDigits(out) + m[3];
  if (trCache.size > 30000) trCache.clear(); trCache.set(s, res);
  if (res == null && depth === 0) I18N.missing.add(core);
  return res;
}

// How much Arabic a candidate still shows (text inside element markers doesn't count) — the translation leaving the least wins
export const arResidue = (x?: any) => (String(x).replace(/\uE000[^\uE001]*\uE001/g, "").match(/[\u0621-\u064A]/g) || []).length;

export const PUNCT_EN = { "؟": "?", "،": ",", "؛": ";", "：": ":" };

// A reading may leave Arabic behind only in short stretches — a name, a place, a term («م. منى الشريف» → "Eng. منى الشريف").
// A longer stretch is free text (a sentence someone wrote, or a sentence the dictionary lacks): a short pattern such as
// «من {0}» must not turn it into "From …" + a whole Arabic paragraph, so that reading is not offered at all.
export const freeText = (v?: any, t?: any) => AR_CHARS.test(v) && (t == null || arResidue(t) > 0) && v.trim().split(/\s+/).length > 4;

export function trFind(core?: any, depth?: any) {
  const ex = DICT.exact.get(core); if (ex != null) return ex;
  if (depth > 5) return null; const sub = (x?: any) => trCore(x, depth + 1);
  let best = null, bestScore = Infinity;
  const offer = (out?: any) => { if (out == null) return false; const sc = arResidue(out); if (sc < bestScore) { best = out; bestScore = sc; } return sc === 0; };
  // 1. patterns, most specific first — each with its shortest and its longest reading
  for (const p of DICT.pats) {
    if (!core.includes(p.key)) continue;
    for (const re of [p.re, p.reG]) {
      const mm = re.exec(core); if (!mm) continue;
      const caps: any = {}; let free = false;
      p.names.forEach((name, i) => { const v = mm[i + 1] || ""; const t = AR_CHARS.test(v) ? sub(v) : v; if (freeText(v, t)) free = true; caps[name] = t == null ? v : t; });
      if (!free && offer(fillPattern(p.en, caps))) return best;
    }
  }
  // 2. a known string inside quotes / brackets, after a leading mark, or before trailing punctuation
  const inner = (v?: any) => { const t = sub(v); return t == null || freeText(v, t) ? null : t; };
  let w = /^«([^«»]+)»$/.exec(core); if (w) { const t = inner(w[1]); if (t != null && offer(`“${t}”`)) return best; }
  w = /^\(([^()]+)\)$/.exec(core); if (w) { const t = inner(w[1]); if (t != null && offer(`(${t})`)) return best; }
  w = /^([·•—–+#@]\s?|\d+[.)]\s)([\s\S]+)$/.exec(core); if (w && AR_CHARS.test(w[2])) { const t = inner(w[2]); if (t != null && offer(w[1] + t)) return best; }
  w = /([:：.…؟?!،؛]+)$/.exec(core); if (w && w.index > 0) { const t = inner(core.slice(0, w.index)); if (t != null && offer(t + w[1].replace(/[؟،؛：]/g, (c) => PUNCT_EN[c]))) return best; }
  if (core.includes("\uE000")) return best; // a sentence with element markers is only ever matched whole
  // 3. segments joined by separators — neighbouring segments are merged when together they are a known string
  for (const sep of TR_SEPS) {
    if (!core.includes(sep)) continue; const segs = core.split(sep); const out: any = []; let any = false, free = false;
    for (let i = 0; i < segs.length;) {
      let j = segs.length, t = null;
      for (; j > i + 1; j--) { const piece = segs.slice(i, j).join(sep); if (AR_CHARS.test(piece) && DICT.exact.has(piece)) { t = DICT.exact.get(piece); break; } }
      if (t == null) { j = i + 1; t = AR_CHARS.test(segs[i]) ? sub(segs[i]) : segs[i]; if (freeText(segs[i], t)) free = true; }
      if (t == null) t = segs[i]; else if (AR_CHARS.test(segs.slice(i, j).join(sep))) any = true;
      out.push(t); i = j;
    }
    if (any && !free && offer(out.join(sep === "، " ? ", " : sep))) return best;
  }
  return best;
}

// For code that shows text outside the React tree (or needs the shown form): Arabic in, the current language out
export const tr = (s?: any) => { if (s == null || !isEn()) return s; const t = trCore(String(s)); return t == null ? String(s) : t; };


// ---- the DOM pass ----
export const I18N_ATTRS = ["placeholder", "aria-label", "title", "alt", "aria-description", "aria-roledescription", "aria-valuetext"];

export const I18N_SKIP = 'script,style,textarea,code,pre,[translate="no"],[contenteditable="true"],[contenteditable=""]';

export const I18N_ATTR_SEL = I18N_ATTRS.map((a) => `[${a}]`).join(",");

export const I18ND: any = { mo: null, orig: new WeakMap(), wrote: new WeakMap(), texts: new Set(), aorig: new WeakMap(), els: new Set() };

export function i18nNode(n?: any, o?: any, want?: any) {
  if (n.nodeValue !== want) n.nodeValue = want;
  if (want !== o) { I18ND.orig.set(n, o); I18ND.wrote.set(n, want); I18ND.texts.add(n); }
  else if (I18ND.orig.has(n)) { I18ND.orig.delete(n); I18ND.wrote.delete(n); I18ND.texts.delete(n); }
}

export const origOf = (n?: any) => { const o = I18ND.orig.get(n); return o !== undefined && I18ND.wrote.get(n) === n.nodeValue ? o : n.nodeValue; };

// A parent whose children are all text nodes is translated as one string (React renders "لديك {n} رسائل" as three nodes):
// the whole translation goes into the first node and the rest are emptied.
// A sentence that wraps inline elements («بقي <Num>40</Num> نقطة لمستوى خبير») is translated whole too: each element becomes a
// marker, the English is looked up with the markers inside, then cut at the markers back into the text nodes around the
// (untouched) elements — word order changes freely, elements keep theirs. Anything else: each text node on its own.
// Each element becomes « letter text »: the letter keeps the order, the text (a number in <Num>) lets the English
// pick "1 reply" / "12 replies".
export const I18N_INLINE = /^(BDI|BDO|SPAN|B|STRONG|EM|I|A|SMALL|SUP|SUB|MARK|KBD|TIME|ABBR|Q|S|U|DATA|SVG|IMG|BR|WBR)$/;

export const mark = (k?: any, t?: any) => `${String.fromCharCode(97 + k)}${t}`;

export const elText = (n?: any) => (n.textContent || "").replace(/[]/g, "").replace(/\s+/g, " ").trim();

export function i18nRich(nodes?: any) {
  let key = "", inline = "", els = 0; const gaps: any = [[]]; const texts: any = [];
  for (const n of nodes) {
    if (n.nodeType === 3) { const o = origOf(n); key += o; inline += o; gaps[gaps.length - 1].push(n); }
    else if (n.nodeType === 1) { if (!I18N_INLINE.test(n.tagName.toUpperCase())) return false; const t = elText(n); texts.push(t); key += mark(els++, t.slice(0, 40)); inline += t; gaps.push([]); }
  }
  if (!els || els > 6 || !AR_CHARS.test(key.replace(/[^]*/g, ""))) return false;
  let segs = null;
  // 1. the sentence with its elements as markers
  const out = trCore(key);
  if (out != null && !arResidue(out)) {
    segs = []; let rest = out;
    for (let k = 0; k < els; k++) { const m = new RegExp("" + String.fromCharCode(97 + k) + "[^]*").exec(rest); if (!m) { segs = null; break; } segs.push(rest.slice(0, m.index)); rest = rest.slice(m.index + m[0].length); }
    if (segs) { segs.push(rest); if (segs.some((s) => s.includes(""))) segs = null; }
  }
  // 2. the whole sentence with the elements' own text inside — linkified numbers, e-mails and @mentions in a known sentence
  //    («… ده رقمي: <a>01000000909</a> — كلمني …»): the English keeps those texts verbatim, so it is cut where they appear
  if (!segs && texts.every((t) => t && !AR_CHARS.test(t))) {
    const full = DICT.exact.get(inline.replace(/\s+/g, " ").trim());
    if (full) { segs = []; let rest = full; for (const t of texts) { const at = rest.indexOf(t); if (at < 0) { segs = null; break; } segs.push(rest.slice(0, at)); rest = rest.slice(at + t.length); } if (segs) segs.push(rest); }
  }
  if (!segs) return false;
  for (let g = 0; g < gaps.length; g++) if (segs[g].trim() && !gaps[g].length) return false; // English needs text where Arabic has none
  gaps.forEach((ns, g) => ns.forEach((n, j) => i18nNode(n, origOf(n), j === 0 ? segs[g] : "")));
  return true;
}

export function i18nParent(el?: any, skipCache?: any) {
  if (!el || el.nodeType !== 1) return;
  let skip = skipCache ? skipCache.get(el) : undefined; if (skip === undefined) { skip = !!el.closest(I18N_SKIP); if (skipCache) skipCache.set(el, skip); } if (skip) return;
  const kids = el.childNodes; let allText = kids.length > 1, anyEl = false; for (let i = 0; i < kids.length; i++) if (kids[i].nodeType !== 3) { allText = false; if (kids[i].nodeType === 1) anyEl = true; }
  if (allText) {
    const nodes = Array.from(kids); const os = nodes.map(origOf); const joined = os.join("");
    const whole = AR_CHARS.test(joined) ? trCore(joined) : null;
    const per = nodes.map((n, i) => { const t = AR_CHARS.test(os[i]) ? trCore(os[i]) : null; return t == null ? os[i] : t; });
    if (whole != null && arResidue(whole) <= arResidue(per.join(""))) { nodes.forEach((n, i) => i18nNode(n, os[i], i === 0 ? whole : "")); return; }
    nodes.forEach((n, i) => i18nNode(n, os[i], per[i]));
    return;
  }
  if (anyEl && kids.length > 1 && i18nRich(Array.from(kids))) return;
  for (let i = 0; i < kids.length; i++) { const n = kids[i]; if (n.nodeType !== 3) continue; const o = origOf(n); if (!AR_CHARS.test(o) && !I18ND.orig.has(n)) continue; const t = AR_CHARS.test(o) ? trCore(o) : null; i18nNode(n, o, t == null ? o : t); }
}

export function i18nAttr(el?: any, name?: any) {
  const cur = el.getAttribute(name); if (cur == null) return; const rec = I18ND.aorig.get(el) || {};
  const o = rec[name] !== undefined && rec["w:" + name] === cur ? rec[name] : cur;
  const t = AR_CHARS.test(o) ? trCore(o) : null; const want = t == null ? o : t;
  if (want !== cur) el.setAttribute(name, want);
  if (want !== o) { rec[name] = o; rec["w:" + name] = want; I18ND.aorig.set(el, rec); I18ND.els.add(el); }
}

export function i18nWalk(root?: any, skipCache?: any) {
  if (!root) return;
  if (root.nodeType === 3) { i18nParent(root.parentNode, skipCache); return; }
  if (root.nodeType !== 1 || root.closest(I18N_SKIP)) return;
  const withAttrs = root.matches(I18N_ATTR_SEL) ? [root, ...root.querySelectorAll(I18N_ATTR_SEL)] : root.querySelectorAll(I18N_ATTR_SEL);
  withAttrs.forEach((el) => { if (!el.closest(I18N_SKIP)) I18N_ATTRS.forEach((a) => { if (el.hasAttribute(a)) i18nAttr(el, a); }); });
  const parents = new Set<any>(); const tw = document.createTreeWalker(root, 4); let n;
  while ((n = tw.nextNode())) if (AR_CHARS.test(n.nodeValue) || I18ND.orig.has(n)) parents.add(n.parentNode);
  parents.forEach((p) => i18nParent(p, skipCache));
}

export function i18nOnMutations(recs?: any) {
  const skipCache = new Map(); const parents = new Set<any>(); const roots: any = [];
  for (const r of recs) {
    if (r.type === "childList") r.addedNodes.forEach((n) => { if (n.nodeType === 3) parents.add(n.parentNode); else if (n.nodeType === 1) roots.push(n); });
    else if (r.type === "characterData") parents.add(r.target.parentNode);
    else if (r.type === "attributes" && r.target.nodeType === 1 && !r.target.closest(I18N_SKIP)) i18nAttr(r.target, r.attributeName);
  }
  roots.forEach((el) => { if (el.isConnected) i18nWalk(el, skipCache); });
  parents.forEach((p) => { if (p && p.isConnected) i18nParent(p, skipCache); });
  if (I18ND.mo) I18ND.mo.takeRecords(); // drop the records our own writes just made
  if (I18ND.texts.size > 6000) I18ND.texts.forEach((t) => { if (!t.isConnected) I18ND.texts.delete(t); });
  if (I18ND.els.size > 3000) I18ND.els.forEach((e) => { if (!e.isConnected) I18ND.els.delete(e); });
}

export function i18nOn() {
  if (I18ND.mo || typeof document === "undefined" || !document.body || typeof MutationObserver === "undefined") return;
  i18nWalk(document.body, new Map());
  I18ND.mo = new MutationObserver(i18nOnMutations);
  I18ND.mo.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: I18N_ATTRS });
}

export function i18nOff() {
  if (!I18ND.mo) return; I18ND.mo.disconnect(); I18ND.mo = null;
  I18ND.texts.forEach((n) => { if (n.isConnected && I18ND.wrote.get(n) === n.nodeValue) n.nodeValue = I18ND.orig.get(n); });
  I18ND.els.forEach((el) => { const rec = I18ND.aorig.get(el); if (!rec || !el.isConnected) return; Object.keys(rec).forEach((k) => { if (!k.startsWith("w:") && el.getAttribute(k) === rec["w:" + k]) el.setAttribute(k, rec[k]); }); });
  I18ND.orig = new WeakMap(); I18ND.wrote = new WeakMap(); I18ND.texts = new Set(); I18ND.aorig = new WeakMap(); I18ND.els = new Set();
}

// Applies a language to the whole page synchronously (call it after React has committed, e.g. in a layout effect)
export function i18nApply(lang?: any) {
  I18N.lang = lang === "en" ? "en" : "ar";
  try { const root = document.documentElement; root.lang = I18N.lang; root.dir = LANGS[I18N.lang].dir; } catch (e) {}
  if (I18N.lang === "en") i18nOn(); else i18nOff();
  try { (window as any).__i18n = { lang: I18N.lang, missing: I18N.missing, tr }; } catch (e) {}
}

// Community content — spread on the element that holds what a member wrote: never translated, laid out in its own direction
export const UGC = { translate: "no", dir: "auto" } as const;


// Copy written in both languages side by side (the language screen, the feature guide, the tour, the CV audit).
// L3 = [Arabic to a man, Arabic to a woman (null = the same), English]; L2 = the same without a gendered form. The two versions
// are checked against each other line by line; the Arabic addresses the member in their own gender («افتح» / «افتحي»).
// Rendered already in the interface language, so its container is marked translate="no" (the English swap never touches it).
// i18n-extract.js skips the arguments of L3( ) and L2( ): they need no dictionary entry.
export const L3 = (ar?: any, arF?: any, en?: any) => ({ ar, arF: arF || ar, en });

export const L2 = (ar?: any, en?: any) => ({ ar, arF: ar, en });

export const say = (app?: any, x?: any) => (x == null ? "" : typeof x === "string" ? x : (app && app.lang) === "en" ? x.en : genderOf(app && app.profile && app.profile.gender) === "female" ? x.arF : x.ar);

// For text rendered already in the interface language: dictionary / date format of the language passed in — i18nApply sets
// I18N.lang only after React commits, so a first render must not depend on it
export const trIn = (lang?: any, s?: any) => { if (s == null || lang !== "en") return s; const t = trCore(String(s)); return t == null ? String(s) : t; };

export const whenIn = (lang?: any, ms?: any) => { if (!ms) return "—"; try { return new Date(ms).toLocaleString(LANGS[lang === "en" ? "en" : "ar"].locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); } catch (e) { return new Date(ms).toISOString().slice(0, 16).replace("T", " "); } };
