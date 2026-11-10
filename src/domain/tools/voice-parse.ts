// =====================================================================
//  Dictation → a concrete take-off (pure; no React, no network). A site engineer says — or types, or dictates with the phone's
//  keyboard — «احسبلي كمية خرسانة لقواعد مسلحة 10 قواعد بمقاس 2 في 2.5 وارتفاع 60 سم», and this reads it:
//   · the elements (footings, slabs, ties, columns, beams, walls, necks, blinding), each with its count and dimensions,
//   · the mix grade and the waste, if they were said,
//   · and exactly what is still missing, as questions — a dimension never guessed, a number never invented.
//  Egyptian dialect and English; Arabic-Indic digits, spoken numbers (عشرة · خمسين · مية) and «ونص»; cm / mm / m.
//  A dimension with no unit is read as metres, except a thickness, a height or a section side above 12 — that is centimetres
//  (nobody means a 60 m deep footing); the card shows what it assumed. Results feed the concrete tool's own document.
// =====================================================================
import { CONC_KINDS, CONC_PROFILE, concTakeoff, type ConcElement, type ConcKind } from "./concrete-calc";

export type VoiceKind = Extract<ConcKind, "footing" | "slab" | "blinding" | "tieBeam" | "beam" | "column" | "wall" | "neck">;
export type Bilingual = { ar: string; en: string };
export type VoiceElement = { kind: VoiceKind; n: number | null; dims: Record<string, number | null>; assumed: string[]; said: string };
export type VoiceQuestion = {
  id: string; element: number | null; field: string; required: boolean; ask: Bilingual; unit: "m" | "count" | "%" | "grade"; fallback?: string;
};
export type VoiceParse = { elements: VoiceElement[]; grade: string | null; wastePct: number | null; questions: VoiceQuestion[] };

export const VOICE_GRADES = ["C20", "C25", "C30", "C35", "C40", "C50"];

// ---- text → comparable text ----
const INDIC = "٠١٢٣٤٥٦٧٨٩";
const WORDS: [RegExp, number][] = [
  [/\b(?:صفر|zero)\b/g, 0], [/\b(?:واحد|واحدة|one)\b/g, 1], [/\b(?:اتنين|اثنين|إتنين|اثنان|two)\b/g, 2], [/\b(?:تلاتة|ثلاثة|تلات|three)\b/g, 3],
  [/\b(?:اربعة|أربعة|اربع|four)\b/g, 4], [/\b(?:خمسة|خمس|five)\b/g, 5], [/\b(?:ستة|ست|six)\b/g, 6], [/\b(?:سبعة|سبع|seven)\b/g, 7],
  [/\b(?:تمانية|ثمانية|تمن|eight)\b/g, 8], [/\b(?:تسعة|تسع|nine)\b/g, 9], [/\b(?:عشرة|عشر|ten)\b/g, 10], [/\b(?:احداشر|إحدى عشر|eleven)\b/g, 11],
  [/\b(?:اتناشر|اثنا عشر|twelve)\b/g, 12], [/\b(?:خمستاشر|خمسة عشر|fifteen)\b/g, 15], [/\b(?:عشرين|twenty)\b/g, 20], [/\b(?:تلاتين|ثلاثين|thirty)\b/g, 30],
  [/\b(?:اربعين|أربعين|forty)\b/g, 40], [/\b(?:خمسين|fifty)\b/g, 50], [/\b(?:ستين|sixty)\b/g, 60], [/\b(?:سبعين|seventy)\b/g, 70],
  [/\b(?:تمانين|ثمانين|eighty)\b/g, 80], [/\b(?:تسعين|ninety)\b/g, 90], [/\b(?:مية|مائة|ميه|hundred)\b/g, 100],
];

export function normaliseSpeech(raw: string): string {
  let s = String(raw || "").normalize("NFKC").toLowerCase()
    .replace(/[٠-٩]/g, (d) => String(INDIC.indexOf(d)))
    .replace(/٫/g, ".").replace(/(\d)،(\d)/g, "$1.$2").replace(/(\d),(\d{1,2})(?!\d)/g, "$1.$2")
    .replace(/[ً-ْـ]/g, "").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه");
  // spoken numbers (the table is written with the letters people say; normalise it the same way)
  for (const [re, n] of WORDS) {
    // \b does not see Arabic letters as word characters — a word is bounded by spaces instead
    const src = re.source.replace(/\\b/g, "").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه");
    s = s.replace(new RegExp(`(?<![\\p{L}\\d])${src}(?![\\p{L}\\d])`, "gu"), String(n));
  }
  // «عشرة ونص» → 10.5; «2 ونص» → 2.5
  s = s.replace(/(\d+(?:\.\d+)?)\s*و?\s*(?:نص|نصف|half)\b/g, (_m, n: string) => String(Number(n) + 0.5));
  // «في» / «x» / «×» between two numbers is a product sign
  s = s.replace(/(\d(?:\.\d+)?\s*(?:سم|cm|مم|mm|م|متر|m)?)\s*(?:في|x|×|\*|ب)\s*(?=\d)/g, "$1 x ");
  return s.replace(/\s+/g, " ").trim();
}

// ---- elements: the nouns people say, singular and plural ----
type Noun = { kind: VoiceKind; re: RegExp; plural: RegExp };
const NOUNS: Noun[] = [
  { kind: "blinding", re: /(?:خرسانه )?نظافه|blinding|lean concrete/, plural: /^$/ },
  { kind: "tieBeam", re: /سملات|سمله|ميده|ميد|tie beams?|grade beams?|plinth beams?/, plural: /سملات|tie beams|grade beams/ },
  { kind: "footing", re: /قواعد|قاعده|اساسات|footings?|pad footings?/, plural: /قواعد|اساسات|footings/ },
  { kind: "neck", re: /رقاب|رقبه|necks?/, plural: /رقاب|necks/ },
  { kind: "column", re: /اعمده|عمود|columns?/, plural: /اعمده|columns/ },
  { kind: "beam", re: /كمرات|كمره|beams?/, plural: /كمرات|beams/ },
  { kind: "slab", re: /بلاطات|بلاطه|اسقف|سقف|slabs?|roofs?/, plural: /بلاطات|اسقف|slabs|roofs/ },
  { kind: "wall", re: /حوائط|حايط|حائط|جدران|walls?/, plural: /حوائط|جدران|walls/ },
];
export const KIND_NAME: Record<VoiceKind, Bilingual> = {
  footing: { ar: "القاعدة", en: "footing" }, slab: { ar: "البلاطة", en: "slab" }, blinding: { ar: "خرسانة النظافة", en: "blinding" }, tieBeam: { ar: "السملة", en: "tie beam" },
  beam: { ar: "الكمرة", en: "beam" }, column: { ar: "العمود", en: "column" }, wall: { ar: "الحائط", en: "wall" }, neck: { ar: "الرقبة", en: "neck" },
};

// field → what it is called when asked for, whether a bare number above 12 means centimetres, and the words that introduce it
const FIELD: Record<string, { name: Bilingual; cm: boolean; words: RegExp }> = {
  L: { name: { ar: "الطول", en: "length" }, cm: false, words: /طول|length/ },
  B: { name: { ar: "العرض", en: "width" }, cm: false, words: /عرض|width/ },
  H: { name: { ar: "الارتفاع", en: "height" }, cm: true, words: /ارتفاع|عمق|height|depth/ },
  t: { name: { ar: "السمك", en: "thickness" }, cm: true, words: /سمك|ارتفاع|thickness|thick/ },
  b: { name: { ar: "العرض", en: "width" }, cm: true, words: /عرض|width/ },
  h: { name: { ar: "العمق", en: "depth" }, cm: true, words: /عمق|ارتفاع|depth|height/ },
  a: { name: { ar: "ضلع القطاع", en: "section side" }, cm: true, words: /عرض|width/ },
  hFF: { name: { ar: "ارتفاع الدور", en: "floor height" }, cm: false, words: /ارتفاع|height/ },
};
// the dimensions each kind needs (concrete-calc CONC_KINDS keys), in the order they are asked, and the pair «A x B» fills the first two
const NEEDS: Record<VoiceKind, { pair: [string, string]; third?: string; others: string[]; optional?: Record<string, number> }> = {
  footing: { pair: ["L", "B"], third: "H", others: [] },
  slab: { pair: ["L", "B"], third: "t", others: [] },
  blinding: { pair: ["L", "B"], third: "t", others: [] },
  tieBeam: { pair: ["b", "h"], third: "L", others: [] },
  beam: { pair: ["b", "h"], third: "L", others: [], optional: { ts: 0.15 } },
  column: { pair: ["b", "a"], third: "hFF", others: [], optional: { ts: 0.15 } },
  wall: { pair: ["L", "t"], third: "H", others: [] },
  neck: { pair: ["b", "a"], third: "h", others: [] },
};
// words introducing a labelled value, per field, for the field names each kind really uses
const LABELLED: [string, RegExp][] = [
  ["H", /(?:ارتفاع|عمق|height|depth)/], ["t", /(?:سمك|thickness|thick)/], ["L", /(?:طول|length)/], ["B", /(?:عرض|width)/],
];
const UNIT = "(سم|cm|مم|mm|متر|م|m)?";
const NUM = "(\\d+(?:\\.\\d+)?)";
const toMetres = (v: number, unit: string | undefined, cmIfBig: boolean, assumed: string[], label: string): number => {
  const u = unit || "";
  if (/^(سم|cm)$/.test(u)) return v / 100;
  if (/^(مم|mm)$/.test(u)) return v / 1000;
  if (/^(متر|م|m)$/.test(u)) return v;
  if (cmIfBig && v > 12) {
    assumed.push(label);
    return v / 100;
  }
  return v;
};

const r6 = (x: number) => Math.round(x * 1e6) / 1e6;

function readClause(kind: VoiceKind, clause: string): { dims: Record<string, number | null>; assumed: string[] } {
  const need = NEEDS[kind];
  const dims: Record<string, number | null> = {};
  for (const k of [...need.pair, ...(need.third ? [need.third] : []), ...need.others, ...Object.keys(need.optional || {})]) dims[k] = null;
  const assumed: string[] = [];
  // 1. «A x B» or «A x B x C» — the section / plan sizes, each with its own unit when it has one
  const prod = new RegExp(`${NUM}\\s*${UNIT}\\s*x\\s*${NUM}\\s*${UNIT}(?:\\s*x\\s*${NUM}\\s*${UNIT})?`).exec(clause);
  let rest = clause;
  if (prod) {
    const [, a, ua, b, ub, c, uc] = prod;
    const pair = need.pair;
    // a pair of plan sizes is metres; a pair of section sides is centimetres when large
    const cmPair = ["b", "a", "h", "t"].includes(pair[0]);
    dims[pair[0]] = r6(toMetres(Number(a), ua, cmPair, assumed, FIELD[pair[0]].name.ar));
    dims[pair[1]] = r6(toMetres(Number(b), ub, cmPair, assumed, FIELD[pair[1]].name.ar));
    if (c !== undefined && need.third) dims[need.third] = r6(toMetres(Number(c), uc, FIELD[need.third].cm, assumed, FIELD[need.third].name.ar));
    rest = clause.replace(prod[0], " ");
  }
  // 2. labelled values — «ارتفاع 60 سم», «height 0.6 m», «بسمك 15» — fill what the product did not
  for (const [field, words] of LABELLED) {
    const target = kindField(kind, field);
    if (!target || dims[target] != null) continue;
    const m = new RegExp(`(?:ب|ال)?${words.source}\\s*(?:ه|ها)?\\s*${NUM}\\s*${UNIT}`).exec(rest);
    if (m) dims[target] = r6(toMetres(Number(m[1]), m[2], FIELD[target]?.cm ?? FIELD[field].cm, assumed, FIELD[target]?.name.ar || FIELD[field].name.ar));
  }
  return { dims, assumed };
}

// which of a kind's own dimension keys a spoken word means («ارتفاع» is H on a footing, hFF on a column, h on a neck)
function kindField(kind: VoiceKind, word: string): string | null {
  const own = (k: string) => (k in ({ ...Object.fromEntries([...NEEDS[kind].pair, ...(NEEDS[kind].third ? [NEEDS[kind].third as string] : [])].map((x) => [x, 1])) }) ? k : null);
  const table: Record<VoiceKind, Record<string, string>> = {
    footing: { H: "H", t: "H", L: "L", B: "B" }, slab: { t: "t", H: "t", L: "L", B: "B" }, blinding: { t: "t", H: "t", L: "L", B: "B" },
    tieBeam: { L: "L", B: "b", H: "h", t: "h" }, beam: { L: "L", B: "b", H: "h", t: "h" }, column: { H: "hFF", L: "b", B: "a", t: "hFF" },
    wall: { L: "L", H: "H", t: "t", B: "t" }, neck: { H: "h", t: "h", L: "b", B: "a" },
  };
  const k = table[kind][word];
  return k ? own(k) : null;
}

export function parseDictation(raw: string): VoiceParse {
  const text = normaliseSpeech(raw);
  const found: { kind: VoiceKind; at: number; end: number; plural: boolean }[] = [];
  for (const n of NOUNS) {
    for (const m of text.matchAll(new RegExp(n.re.source, "g"))) {
      // «سقف» inside «سقف الدور» etc. is one mention; a noun already covered by a longer one (tie beam ⊃ beam) is skipped
      if (found.some((f) => m.index !== undefined && m.index >= f.at && m.index < f.end)) continue;
      found.push({ kind: n.kind, at: m.index ?? 0, end: (m.index ?? 0) + m[0].length, plural: n.plural.test(m[0]) });
    }
  }
  found.sort((a, b) => a.at - b.at);
  // «لقواعد مسلحة 10 قواعد …» names the same element twice: a mention followed by the same kind with no figure between is one mention
  for (let i = found.length - 2; i >= 0; i--) {
    if (found[i].kind === found[i + 1].kind && !/\d/.test(text.slice(found[i].end, found[i + 1].at).replace(/\d+\s*$/, ""))) found.splice(i, 1);
  }
  const elements: VoiceElement[] = found.map((f, i) => {
    // the clause runs from this element's count (the number right before the noun) to the next element's count
    const before = text.slice(0, f.at);
    const countAt = /(\d+)\s*$/.exec(before);
    const start = countAt ? f.at - countAt[0].length : f.at;
    const nextAt = found[i + 1] ? found[i + 1].at - ((/(\d+)\s*$/.exec(text.slice(0, found[i + 1].at)) || [""])[0].length) : text.length;
    const clause = text.slice(start, Math.max(nextAt, f.end));
    const after = text.slice(f.end, Math.max(nextAt, f.end));
    const counted = countAt ? Number(countAt[1]) : /(?:عدد|count|number of)\s*(\d+)/.exec(clause) ? Number((/(?:عدد|count|number of)\s*(\d+)/.exec(clause) as RegExpExecArray)[1]) : null;
    const n = counted !== null && counted > 0 && Number.isInteger(counted) ? counted : f.plural ? null : 1;
    const { dims, assumed } = readClause(f.kind, after);
    return { kind: f.kind, n, dims, assumed, said: clause.trim() };
  });
  // mix grade and waste, said once for the whole take-off
  const gradeM = /\bc\s?(\d{2})(?:\s?\/\s?\d{2})?\b/.exec(text);
  const kgM = /(?:خرسانه|مقاومه|concrete|grade)\s*(\d{3})\b/.exec(text);
  const mpaM = /(?:مقاومه|grade|رتبه)\s*(\d{2})\b/.exec(text);
  const pick = gradeM ? `C${gradeM[1]}` : kgM ? `C${Math.round(Number(kgM[1]) / 10)}` : mpaM ? `C${mpaM[1]}` : null;
  const grade = pick && VOICE_GRADES.includes(pick) ? pick : null;
  const wasteM = /(?:هالك|waste)\s*(\d+(?:\.\d+)?)/.exec(text);
  const wastePct = wasteM ? Number(wasteM[1]) : null;
  return { elements, grade, wastePct: wastePct !== null && wastePct >= 0 && wastePct <= 30 ? wastePct : null, questions: questionsFor(elements, grade, wastePct) };
}

// what is still needed — each required dimension, then the choices a take-off normally states (grade, waste)
export function questionsFor(elements: VoiceElement[], grade: string | null, wastePct: number | null): VoiceQuestion[] {
  const out: VoiceQuestion[] = [];
  elements.forEach((e, i) => {
    const kn = KIND_NAME[e.kind];
    if (e.n === null) out.push({ id: `${i}.n`, element: i, field: "n", required: true, unit: "count", ask: { ar: `كم عدد ${kn.ar.replace(/^ال/, "")}؟`, en: `How many ${kn.en}s?` } });
    for (const k of Object.keys(e.dims)) {
      const optional = NEEDS[e.kind].optional && k in (NEEDS[e.kind].optional as Record<string, number>);
      if (e.dims[k] != null) continue;
      const f = FIELD[k] || { name: { ar: k, en: k } };
      out.push({
        id: `${i}.${k}`, element: i, field: k, required: !optional, unit: "m",
        ask: { ar: `${f.name.ar} ${kn.ar} كام؟${optional ? " (اتركه للافتراضي)" : ""}`, en: `${kn.en[0].toUpperCase()}${kn.en.slice(1)} ${f.name.en}?${optional ? " (leave for the default)" : ""}` },
        ...(optional ? { fallback: String((NEEDS[e.kind].optional as Record<string, number>)[k]) } : {}),
      });
    }
  });
  if (elements.length) {
    if (!grade) out.push({ id: "grade", element: null, field: "grade", required: false, unit: "grade", fallback: "C30", ask: { ar: "رتبة الخرسانة؟ (الافتراضي C30)", en: "Concrete grade? (default C30)" } });
    if (wastePct === null) out.push({ id: "waste", element: null, field: "waste", required: false, unit: "%", fallback: "", ask: { ar: "نسبة الهالك؟ (الافتراضي حسب نوع العنصر)", en: "Waste %? (default by element)" } });
  }
  return out;
}

// answers typed into the card: id → text; a number may use Arabic digits, a unit, «ونص» — the same reading as the dictation
export function answerNumber(text: string, cmIfBig: boolean): number | null {
  const t = normaliseSpeech(text);
  const m = new RegExp(`${NUM}\\s*${UNIT}`).exec(t);
  if (!m) return null;
  const v = toMetres(Number(m[1]), m[2], cmIfBig, [], "");
  return Number.isFinite(v) && v > 0 ? r6(v) : null;
}

export type VoiceAnswers = Record<string, string>;

// the parse with the answers laid over it → the rows of the concrete tool (strings, as its editor keeps them) and what is still open
export function applyAnswers(p: VoiceParse, answers: VoiceAnswers): { elements: VoiceElement[]; grade: string; wastePct: number | null; open: VoiceQuestion[] } {
  const elements = p.elements.map((e, i) => {
    const dims = { ...e.dims };
    let n = e.n;
    for (const k of Object.keys(dims)) {
      const a = answers[`${i}.${k}`];
      if (dims[k] == null && a != null && a.trim() !== "") dims[k] = answerNumber(a, FIELD[k]?.cm ?? false);
    }
    const an = answers[`${i}.n`];
    if (n === null && an != null) {
      const v = Number(normaliseSpeech(an).replace(/[^\d.]/g, ""));
      n = Number.isInteger(v) && v > 0 ? v : null;
    }
    return { ...e, n, dims };
  });
  const g = (answers.grade || "").trim().toUpperCase().replace(/\s/g, "");
  const grade = VOICE_GRADES.includes(g) ? g : p.grade || "C30";
  const w = Number(normaliseSpeech(answers.waste || "").replace(/[^\d.]/g, ""));
  const wastePct = p.wastePct !== null ? p.wastePct : answers.waste && Number.isFinite(w) && w >= 0 && w <= 30 ? w : null;
  // a dimension left at its optional fallback counts as answered
  const filled = elements.map((e, i) => {
    const dims = { ...e.dims };
    for (const q of questionsFor([e], null, null)) if (q.fallback && q.field in dims && dims[q.field] == null) dims[q.field] = Number(q.fallback);
    return { ...e, dims, __i: i };
  });
  const open = questionsFor(filled, "x", 0).filter((q) => q.required).map((q) => ({ ...q, id: q.id.replace(/^\d+/, (m) => String(filled[Number(m)].__i)), element: q.element }));
  return { elements: filled.map(({ __i, ...e }) => e), grade, wastePct, open };
}

// the concrete tool's own rows (src/features/tools/concrete/concrete.tsx Row): every number as the editor keeps it, in metres
export type VoiceRow = { kind: VoiceKind; label: string; n: string; dims: Record<string, string>; waste: string };
export function toConcreteRows(elements: VoiceElement[], wastePct: number | null): VoiceRow[] {
  const names: Partial<Record<VoiceKind, string>> = {};
  return elements.map((e) => {
    const seq = (names[e.kind] = String((Number(names[e.kind]) || 0) + 1));
    const need = CONC_KINDS.find((k) => k.kind === e.kind);
    const dims: Record<string, string> = {};
    for (const [f] of need ? need.fields : []) dims[f] = e.dims[f] != null ? String(e.dims[f]) : f === "open" ? "" : "";
    return { kind: e.kind, label: `${KIND_NAME[e.kind].ar.replace(/^ال/, "")} ${seq}`, n: String(e.n ?? 1), dims, waste: wastePct === null ? "" : String(wastePct) };
  });
}

// the figures the card shows before the document opens — the engine's own take-off over the rows
export function previewTakeoff(rows: VoiceRow[]): { netM3: number; orderM3: number; formworkM2: number } {
  const els: ConcElement[] = rows.map((r, i) => ({
    id: String(i + 1), kind: r.kind, label: r.label, n: Number(r.n) || 0,
    dims: Object.fromEntries(Object.entries(r.dims).map(([k, v]) => [k, v === "" ? null : Number(v)])), wastePct: r.waste === "" ? null : Number(r.waste),
  }));
  const t = concTakeoff(els);
  return { netM3: t.netM3, orderM3: t.orderM3, formworkM2: t.formworkM2 };
}

export const defaultWaste = (kind: VoiceKind): number => CONC_PROFILE.waste[kind];
