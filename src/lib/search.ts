// Migrated from the prototype part(s): app_1f_search
import { POST_TYPES, room } from "../data/companies";
import { isEn, tr } from "../i18n/i18n";
import { byNewest } from "./time";

// =====================================================================
//  Fuzzy + semantic search (community). No exact-match dependency: every query token is compared with
//  every post token through three string metrics (Jaro–Winkler, Damerau–Levenshtein, bigram Dice), after
//  Arabic/Franco/English normalisation and light stemming, and through a domain synonym map (راتب ≈ مرتب ≈
//  salary, انترفيو ≈ مقابلة …). A token counts as found at ≥ 80 % similarity; a post is a hit when its
//  query coverage is ≥ 80 %, and "near" (60–80 %) hits are listed separately.
// =====================================================================
export const SEARCH_THRESHOLD = 0.8, SEARCH_NEAR = 0.6;

export const AR_INDIC = "٠١٢٣٤٥٦٧٨٩";

export const searchNorm = (s?: any) => String(s || "").normalize("NFKC").toLowerCase().replace(/[٠-٩]/g, (d) => String(AR_INDIC.indexOf(d))).replace(/[ً-ْٰـ‏‎]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/ؤ/g, "و").replace(/ئ/g, "ي").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();

export const SEARCH_STOP = new Set(["في","من","على","عن","الى","إلى","مع","او","أو","و","ما","هل","ايه","إيه","ازاي","إزاي","ده","دي","دى","اللي","الي","انا","أنا","هو","هي","كان","كانت","لو","بس","يا","كل","اي","أي","عند","بعد","قبل","حد","حاجه","ليه","لان","لكن","the","a","an","of","in","on","for","to","is","are","and","or","at","by","with","how","what","my","me","i","it","this","that"]);

export const AR_PREFIXES = ["وبال", "وال", "بال", "فال", "كال", "لل", "ال", "و", "ف", "ب", "ل", "ك"];
 export const AR_SUFFIXES = ["هما", "كما", "ات", "ون", "ين", "ان", "تي", "ته", "تك", "نا", "كم", "هم", "هن", "ها", "يه", "ه", "ك", "ي", "ت", "ا", "ن"];

export const stemToken = (w?: any) => {
  if (/[ء-ي]/.test(w)) { let s = w; for (const p of AR_PREFIXES) if (s.length - p.length >= 3 && s.startsWith(p)) { s = s.slice(p.length); break; } for (const x of AR_SUFFIXES) if (s.length - x.length >= 3 && s.endsWith(x)) { s = s.slice(0, -x.length); break; } return s; }
  return w.length > 4 ? w.replace(/(ings?|ed|ies|es|s|ers?|tions?|ly)$/, "") : w;
};

export const tokenize = (s?: any) => searchNorm(s).split(" ").filter((t) => t && t.length > 1 && !SEARCH_STOP.has(t));

// Domain synonyms — each group is one meaning (Arabic, Egyptian Arabic, Franco, English)
export const SEARCH_SYN = [
  ["راتب", "مرتب", "اجر", "رواتب", "مرتبات", "اجور", "salary", "salaries", "pay", "payroll", "مرتبي", "راتبي"], ["مقابله", "انترفيو", "انترفيوه", "interview", "interviews", "مقابلات"], ["زياده", "علاوه", "raise", "increment", "زيادات", "علاوات"], ["عرض", "عروض", "offer", "offers", "اوفر"],
  ["استقاله", "استقيل", "resign", "resignation", "اسيب", "سيب", "ترك"], ["مكتب فني", "مكتب فنى", "technical office", "تكنيكال", "تكنيكال اوفيس"], ["موقع", "site", "تنفيذ", "مواقع"], ["حديث التخرج", "خريج", "خريجين", "fresh", "graduate", "graduates", "فريش"], ["بدل", "بدلات", "allowance", "allowances", "بدل سكن", "بدل انتقال"],
  ["تامين", "تامينات", "insurance", "social insurance", "تأمينات"], ["ضريبه", "ضرائب", "tax", "taxes"], ["عقد", "عقود", "contract", "contracts", "fidic"], ["اوفر تايم", "overtime", "ساعات اضافيه", "وقت اضافي"], ["ترقيه", "promotion", "ترقيات"], ["تفاوض", "فاوض", "مفاوضه", "negotiate", "negotiation", "اتفاوض"],
  ["الخليج", "خليج", "gulf", "السعوديه", "سعوديه", "ksa", "saudi", "الامارات", "دبي", "dubai", "uae", "قطر", "qatar", "سفر", "برا"], ["revit", "ريفيت"], ["primavera", "بريمافيرا", "p6", "بريمافيرا p6"], ["autocad", "اوتوكاد", "كاد"], ["etabs", "ايتابس"], ["مدني", "civil", "انشائي", "structural"], ["معماري", "architect", "architecture", "عماره", "معماريه"],
  ["ميكانيكا", "mechanical", "mep", "تكييف", "hvac", "ميكانيكي"], ["كهربا", "كهرباء", "electrical", "electric", "كهربائي"], ["مساحه", "مساحة", "survey", "surveying", "جيوماتكس"], ["شركه", "شركات", "company", "companies", "الشركه"], ["اوراسكوم", "orascom"], ["المقاولون العرب", "المقاولون", "المقاولين العرب", "arab contractors"], ["حسن علام", "hassan allam", "علام"],
  ["العاصمه", "العاصمه الاداريه", "new capital", "capital", "الاداريه"], ["تدريب", "training", "دوره", "كورس", "course", "كورسات", "دورات"], ["ماجستير", "masters", "master", "msc"], ["نقابه", "syndicate", "نقابة المهندسين", "النقابه"], ["استشاري", "consultant", "consulting", "استشاريه"], ["مقاول", "contractor", "مقاولات", "مقاولين"],
  ["دوام", "ساعات العمل", "working hours", "hours", "شغل"], ["سكن", "اقامه", "housing", "accommodation"], ["خبره", "experience", "سنين", "سنوات", "years"], ["مشروع", "مشاريع", "project", "projects", "مشروعات"], ["تقييم", "review", "rating", "رأي", "راي", "تقييمات"], ["كشف", "reveal", "اكشف", "ايه مرتبك"],
].map((g) => g.map(searchNorm));

export const SYN_INDEX = (() => { const m = new Map(); SEARCH_SYN.forEach((g, i) => g.forEach((w) => { const l = m.get(w) || []; l.push(i); m.set(w, l); })); return m; })();

// ---- string metrics ----
export const jaroWinkler = (a?: any, b?: any) => {
  if (a === b) return 1; const la = a.length, lb = b.length; if (!la || !lb) return 0; const win = Math.max(0, Math.floor(Math.max(la, lb) / 2) - 1);
  const ma = new Array(la).fill(false), mb = new Array(lb).fill(false); let m = 0;
  for (let i = 0; i < la; i++) { const lo = Math.max(0, i - win), hi = Math.min(lb - 1, i + win); for (let j = lo; j <= hi; j++) if (!mb[j] && a[i] === b[j]) { ma[i] = mb[j] = true; m++; break; } }
  if (!m) return 0; let t = 0, k = 0; for (let i = 0; i < la; i++) if (ma[i]) { while (!mb[k]) k++; if (a[i] !== b[k]) t++; k++; }
  const j = (m / la + m / lb + (m - t / 2) / m) / 3; let p = 0; while (p < Math.min(4, la, lb) && a[p] === b[p]) p++; return j + p * 0.1 * (1 - j);
};

export const damerau = (a?: any, b?: any) => {
  const la = a.length, lb = b.length; if (!la) return lb; if (!lb) return la; const d: any = []; for (let i = 0; i <= la; i++) { d[i] = [i]; } for (let j = 1; j <= lb; j++) d[0][j] = j;
  for (let i = 1; i <= la; i++) for (let j = 1; j <= lb; j++) { const c = a[i - 1] === b[j - 1] ? 0 : 1; d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c); if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1); }
  return d[la][lb];
};

export const bigrams = (s?: any) => { const out = new Map(); for (let i = 0; i < s.length - 1; i++) { const g = s.slice(i, i + 2); out.set(g, (out.get(g) || 0) + 1); } return out; };

export const dice = (a?: any, b?: any) => { if (a.length < 2 || b.length < 2) return a === b ? 1 : 0; const ga = bigrams(a), gb = bigrams(b); let inter = 0; ga.forEach((n, g) => { inter += Math.min(n, gb.get(g) || 0); }); return (2 * inter) / (a.length - 1 + b.length - 1); };

// Similarity of two normalised tokens in [0, 1]: best of the three metrics, with stems and containment considered
export function tokenSim(q?: any, t?: any) {
  if (q === t) return 1; if (!q || !t) return 0;
  const sq = stemToken(q), st = stemToken(t); if (sq === st && sq.length >= 3) return 0.96;
  if (q.length >= 3 && t.includes(q)) return Math.max(0.82, 0.82 + 0.18 * (q.length / t.length)); if (t.length >= 3 && q.includes(t)) return Math.max(0.8, 0.8 + 0.15 * (t.length / q.length));
  const jw = jaroWinkler(q, t); const lev = 1 - damerau(q, t) / Math.max(q.length, t.length); const dc = dice(q, t); const stemJw = sq !== q || st !== t ? jaroWinkler(sq, st) * 0.98 : 0;
  return Math.max(jw, lev, dc, stemJw);
}

export const synGroups = (tok?: any) => SYN_INDEX.get(tok) || SYN_INDEX.get(stemToken(tok)) || [];

// ---- per-document index ----
export function indexDoc(fields?: any) { // fields: [{ text, weight }]
  if (typeof isEn === "function" && isEn()) fields = fields.concat(fields.filter((f) => !f.ugc).map((f) => ({ text: tr(f.text || ""), weight: f.weight, was: f.text })).filter((f) => f.text && f.text !== f.was)); // what members wrote has no English — only the labels around it do
  const toks = new Map(); const phrases: any = []; fields.forEach(({ text, weight }) => { const norm = searchNorm(text); phrases.push([norm, weight]); tokenize(text).forEach((t) => { if (!toks.has(t) || toks.get(t) < weight) toks.set(t, weight); }); });
  const groups = new Set(); toks.forEach((_, t) => synGroups(t).forEach((g) => groups.add(g))); phrases.forEach(([norm]: any) => SEARCH_SYN.forEach((g, i) => { if (g.some((w) => w.includes(" ") && norm.includes(w))) groups.add(i); }));
  return { toks, phrases, groups };
}

export function matchQuery(doc?: any, qtoks?: any, qnorm?: any) {
  if (!qtoks.length) return { score: 0, hits: [] }; const hits: any = []; let total = 0;
  for (const q of qtoks) { let best = 0, bestTok = null; const qg = synGroups(q);
    doc.toks.forEach((w, t) => { let s = tokenSim(q, t); if (s < 0.95 && qg.length && synGroups(t).some((g) => qg.includes(g))) s = Math.max(s, 0.95); s *= 0.85 + 0.15 * Math.min(1, w); if (s > best) { best = s; bestTok = t; } });
    if (best < 0.95 && qg.length && qg.some((g) => doc.groups.has(g))) { best = Math.max(best, 0.93); bestTok = bestTok || q; }
    if (best >= SEARCH_THRESHOLD) hits.push({ q, t: bestTok, sim: best }); total += best >= SEARCH_THRESHOLD ? best : best * 0.5; }
  let score = total / qtoks.length; if (qtoks.length > 1 && doc.phrases.some(([n]: any) => n.includes(qnorm))) score = Math.min(1, score + 0.08);
  return { score, hits };
}

export const postFields = (p?: any) => { const walk = (cs?: any, w?: any) => (cs || []).flatMap((c) => [{ text: c.text || (c.data && (c.data.note || c.data.title || c.data.company)) || "", weight: w, ugc: !!c.text }, ...walk(c.replies, w * 0.9)]); const type = (typeof POST_TYPES !== "undefined" ? POST_TYPES : []).find((t) => t[0] === p.type); return [{ text: p.body || "", weight: 1, ugc: true }, { text: p.role || "", weight: 0.7 }, { text: (typeof room === "function" && p.room && room(p.room) ? room(p.room).name : "") + " " + (type ? type[1] : ""), weight: 0.6 }, { text: p.data && p.data.title ? p.data.title : "", weight: 0.8 }, ...walk(p.comments, 0.8)]; };

export function searchPosts(posts?: any, query?: any, opts: any = {}) {
  const qtoks = tokenize(query); const qnorm = searchNorm(query); if (!qtoks.length) return { query, tokens: [], hits: [], near: [] };
  const scored = posts.map((p) => { const doc = opts.index && opts.index.get(p.id) ? opts.index.get(p.id) : indexDoc(postFields(p)); const m = matchQuery(doc, qtoks, qnorm); return { post: p, score: m.score, hits: m.hits }; }).filter((r) => r.score >= SEARCH_NEAR).sort((a, b) => b.score - a.score || (typeof byNewest === "function" ? byNewest(a.post, b.post) : 0));
  return { query, tokens: qtoks, hits: scored.filter((r) => r.score >= SEARCH_THRESHOLD), near: scored.filter((r) => r.score < SEARCH_THRESHOLD) };
}

export const buildSearchIndex = (posts?: any) => new Map(posts.map((p) => [p.id, indexDoc(postFields(p))]));
