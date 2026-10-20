// «المهندس الذكي» — the answer cache on the device (docs/AI.md → caching). Before a first-turn question goes to the model, a
// near-identical one answered recently is reused: Arabic is normalised (alef / ya / ta marbuta forms, diacritics, tatweel,
// Arabic-Indic digits) and two questions match when their word sets overlap ≥ 85 % (Jaccard) under the same context key.
// That is lexical similarity, not embeddings — honest and free. Assistant answers keep 7 days, salary answers 24 hours.
// Storage: localStorage, ≤ 80 entries, never the CV or anything personal (only questions the member typed and the answers).
const KEY = "engspace.ai.cache.v1";
const MAX = 80;
export const DAY = 86_400_000;

type Entry = { f: string; c: string; w: string[]; a: string; t: number };

export function normalise(s: string): string {
  return String(s || "")
    .toLowerCase()
    .replace(/[ً-ْٰـ]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// small words that change nothing
const STOP = new Set(["ما", "هو", "هي", "في", "من", "علي", "عن", "ايه", "اي", "ازاي", "هل", "يا", "و", "او", "the", "a", "an", "is", "what", "how", "of", "in", "to", "for"]);
const words = (s: string) => [...new Set(normalise(s).split(" ").filter((w) => w && !STOP.has(w)))];

export function similar(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const B = new Set(b);
  const inter = a.filter((w) => B.has(w)).length;
  return inter / (a.length + b.length - inter);
}

const load = (): Entry[] => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};
const save = (xs: Entry[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(xs.slice(-MAX)));
  } catch {
    /* full or blocked storage: the cache is only a saving, never needed */
  }
};

export function cached(feature: string, question: string, ctx: string, maxAge: number, now = Date.now()): string | null {
  const w = words(question);
  if (w.length < 2) return null;
  let best: Entry | null = null;
  let score = 0;
  for (const e of load()) {
    if (e.f !== feature || e.c !== ctx || now - e.t > maxAge) continue;
    const s = similar(w, e.w);
    if (s > score) {
      score = s;
      best = e;
    }
  }
  return best && score >= 0.85 ? best.a : null;
}

export function remember(feature: string, question: string, ctx: string, answer: string, now = Date.now()) {
  if (!answer || answer.length > 12_000) return;
  const w = words(question);
  if (w.length < 2) return;
  const xs = load().filter((e) => now - e.t < 7 * DAY && !(e.f === feature && e.c === ctx && similar(w, e.w) >= 0.85));
  xs.push({ f: feature, c: ctx, w, a: answer, t: now });
  save(xs);
}

export const clearAiCache = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
};
