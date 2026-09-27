// English dictionary for the app → src/i18n/en.generated.json (imported by src/i18n/i18n.ts).
//   i18n/keys.json      every Arabic string the code can render (scripts/i18n/extract.mjs)
//   i18n/en/*.tsv       "<id>\t<English>" — id = first 8 hex of sha1(Arabic key); "-" = internal string, never shown
//   i18n/extra.tsv      "<Arabic>\t<English>" — hand-written entries (typed patterns such as «{t} م» → "{t} PM")
// usage:  node scripts/i18n/build.mjs                  → writes the dictionary (fails on a placeholder mismatch)
//         node scripts/i18n/build.mjs todo [file] [n]  → untranslated keys as "<id>\t<kind>\t<Arabic>\t<context>"
//         node scripts/i18n/build.mjs stats            → coverage per source file
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const P = (...a) => join(ROOT, "i18n", ...a);
const OUT = join(ROOT, "src", "i18n", "en.generated.json");
const kid = (k) => createHash("sha1").update(k, "utf8").digest("hex").slice(0, 8);
const PH = /\{(\d+|n|t)\}/;
const lines = (f) => readFileSync(f, "utf8").split("\n").map((l) => l.replace(/\r$/, ""));

const loadKeys = () => (existsSync(P("keys.json")) ? JSON.parse(readFileSync(P("keys.json"), "utf8")) : {});
function loadTr() {
  const out = new Map();
  if (!existsSync(P("en"))) return out;
  for (const fn of readdirSync(P("en")).filter((f) => f.endsWith(".tsv")).sort()) {
    lines(P("en", fn)).forEach((line, n) => {
      if (!line.trim() || line.startsWith("#")) return;
      if (!line.includes("\t")) throw new Error(`${fn}:${n + 1}: no tab`);
      const at = line.indexOf("\t");
      out.set(line.slice(0, at).trim(), line.slice(at + 1).trim());
    });
  }
  return out;
}
const loadExtra = () => (existsSync(P("extra.tsv")) ? lines(P("extra.tsv")).filter((l) => l.trim() && !l.startsWith("#") && l.includes("\t")).map((l) => { const at = l.indexOf("\t"); return [l.slice(0, at).trim(), l.slice(at + 1).trim()]; }) : []);
// English may drop a placeholder (e.g. a gendered verb); it may never invent one
const placeholdersOk = (ar, en) => { const need = new Set([...ar.matchAll(/\{(\d+|n|t)\}/g)].map((m) => m[1])); return [...en.matchAll(/\{(\d+|n|t)(?:\|[^}]*)?\}/g)].every((m) => need.has(m[1])); };
// community content (what members wrote — the extractor flags it) is never translated: English is the system's language only
const contentKeys = (keys) => new Set(Object.entries(keys).filter(([, v]) => (v.c || 0) >= (v.n ?? 1)).map(([k]) => k));

export function buildDict() {
  const keys = loadKeys(), trs = loadTr(), ids = new Map();
  for (const k of Object.keys(keys)) { const i = kid(k); if (ids.has(i) && ids.get(i) !== k) throw new Error(`id collision ${i}: ${ids.get(i)} / ${k}`); ids.set(i, k); }
  const exact = {}, pats = [], bad = [], content = contentKeys(keys);
  for (const [i, en] of trs) {
    const k = ids.get(i);
    if (k === undefined || en === "-" || content.has(k)) continue;
    if (PH.test(k)) { if (!placeholdersOk(k, en)) { bad.push([i, k, en]); continue; } pats.push([k, en]); }
    else exact[k] = en;
  }
  // replies that open with a mention («@e08c شكرًا…») render the mention as its own element: the rest must match alone too
  for (const [k, v] of Object.entries(exact)) {
    const m = k.match(/^(@[0-9a-f]{4}) ([\s\S]+)$/);
    if (m && v.startsWith(m[1] + " ") && !(m[2] in exact)) exact[m[2]] = v.slice(m[1].length + 1);
  }
  for (const [a, e] of loadExtra()) { if (content.has(a)) continue; if (PH.test(a)) pats.push([a, e]); else exact[a] = e; }
  if (bad.length) { bad.slice(0, 20).forEach(([i, k, en]) => console.error("placeholder mismatch", i, k, "=>", en)); throw new Error(`${bad.length} translations with mismatched placeholders`); }
  const extra = new Set(loadExtra().map(([a]) => a));
  const done = Object.keys(keys).filter((k) => trs.has(kid(k)) || content.has(k) || extra.has(k)).length;
  return { data: { exact, patterns: pats }, stats: { keys: Object.keys(keys).length, done, content: content.size, exact: Object.keys(exact).length, patterns: pats.length } };
}

const [cmd = "build", ...args] = process.argv.slice(2);
if (cmd === "todo") {
  const keys = loadKeys(), trs = loadTr(), extra = new Set(loadExtra().map(([a]) => a)); const [part, lim = Infinity] = args; let n = 0;
  for (const [k, v] of Object.entries(keys)) {
    if ((!part || v.p.split(",")[0] === part) && !trs.has(kid(k)) && !extra.has(k) && (v.c || 0) < v.n) { process.stdout.write(`${kid(k)}\t${v.k}\t${k}${v.x ? `\t⟨${v.x}⟩` : ""}\n`); if (++n >= +lim) break; }
  }
} else if (cmd === "stats") {
  const keys = loadKeys(), trs = loadTr(), by = {};
  for (const [k, v] of Object.entries(keys)) { const p = v.p.split(",")[0]; const a = (by[p] ||= [0, 0]); a[0]++; a[1] += trs.has(kid(k)) ? 1 : 0; }
  for (const p of Object.keys(by).sort()) console.log(p.padEnd(36), `${by[p][1]}`.padStart(5) + "/" + `${by[p][0]}`.padStart(5));
  console.log(buildDict().stats);
} else {
  const { data, stats } = buildDict();
  writeFileSync(OUT, JSON.stringify(data) + "\n");
  const todo = stats.keys - stats.done;
  console.log(`i18n build: ${stats.exact} exact · ${stats.patterns} patterns · ${stats.content} community-content keys left in Arabic${todo ? ` · ${todo} keys without English (node scripts/i18n/build.mjs todo)` : ""}`);
}
