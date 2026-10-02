// Finds every Arabic string the app can render, so each one gets an English counterpart in i18n/en/*.tsv.
// Kinds: "s" string literal · "t" template literal (→ pattern with {0},{1}…) · "x" JSX text · "e" element pattern (JSX text
// mixed with {expressions} — React renders them as sibling text nodes; the runtime joins them back when all are text) ·
// "r" a sentence wrapping inline elements.
// usage: node scripts/i18n/extract.mjs            → writes i18n/keys.json
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import * as t from "@babel/types";

const traverse = traverseModule.default || traverseModule;
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SRC = join(ROOT, "src");
const OUT = join(ROOT, "i18n", "keys.json");
const AR = /[؀-ۿ]/;
// Files whose text never goes through the dictionary: the CV audit writes its report bilingually (L2) and its rewrites in the
// CV's own language; verification copy is written in both languages side by side.
const NO_DICT = new Set(["features/cv/audit.ts", "features/cv/CVReviewScreen.tsx", "features/verify/verify.tsx", "features/admin/verify-admin.tsx"]);

const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(f) && !/\.d\.ts$/.test(f) ? [p] : []; });
const keys = new Map(); // key → {k: kind, parts: Set, n, c, x}

// Community content in the seed data — what members wrote. It is never translated (English is the system's language only),
// so the dictionary build leaves a key out when every place it appears is content:
//   a post's body · a comment's / reply's / message's / review's / reported item's text · a poll's question and options ·
//   the note on an experience reply · a member's image description · the other side's simulated chat replies
const propName = (n) => (t.isIdentifier(n.key) ? n.key.name : t.isStringLiteral(n.key) ? n.key.value : null);
const hasProp = (obj, name) => t.isObjectExpression(obj) && obj.properties.some((q) => t.isObjectProperty(q) && propName(q) === name);
// Copy written in both languages side by side — L3(arabic, arabicFeminine, english) / L2(arabic, english) — carries its own
// English and is rendered with translate="no": it needs no dictionary entry
const isBilingual = (p) => !!p.findParent((x) => x.isCallExpression() && t.isIdentifier(x.node.callee) && (x.node.callee.name === "L3" || x.node.callee.name === "L2"));
function isContent(p) {
  const par = p.parent;
  if (t.isObjectProperty(par) && par.value === p.node) {
    const obj = p.parentPath.parent; const k = propName(par);
    if (k === "body") return hasProp(obj, "comments");
    if (k === "text") return ["replies", "from", "stars", "author"].some((x) => hasProp(obj, x));
    if (k === "q") return hasProp(obj, "options");
    if (k === "note") return hasProp(obj, "outcome");
    if (k === "alt") return hasProp(obj, "src") && hasProp(obj, "tone");
    return false;
  }
  if (t.isArrayExpression(par)) {
    // poll option: ["label", votes] inside options: [...]
    const outer = p.parentPath.parentPath;
    if (outer && t.isArrayExpression(outer.node) && par.elements[0] === p.node && outer.parentPath && t.isObjectProperty(outer.parent) && propName(outer.parent) === "options") return true;
    // canned replies: const canned = cond ? [...] : [...]
    let q = p.parentPath.parentPath; if (q && t.isConditionalExpression(q.node)) q = q.parentPath;
    if (q && t.isVariableDeclarator(q.node) && t.isIdentifier(q.node.id, { name: "canned" })) return true;
  }
  return false;
}
const inRegexCtx = (p) => { const par = p.parentPath && p.parentPath.node; return par && t.isNewExpression(par) && t.isIdentifier(par.callee, { name: "RegExp" }); };
const inType = (p) => !!p.findParent((x) => x.isTSType() || x.isTSTypeAnnotation());

// sorted by POSIX-style relative path, so keys.json comes out identical on Windows and on Linux (CI)
const posix = (file) => relative(SRC, file).split(sep).join("/");
for (const file of walk(SRC).sort((a, b) => (posix(a) < posix(b) ? -1 : posix(a) > posix(b) ? 1 : 0))) {
  const part = posix(file);
  if (NO_DICT.has(part)) continue;
  const src = readFileSync(file, "utf8");
  if (!AR.test(src)) continue;
  const add = (key, kind, extra, content) => {
    key = key.replace(/\s+/g, " ").trim();
    if (!key || !AR.test(key)) return;
    const e = keys.get(key) || { k: kind, parts: new Set(), n: 0, c: 0 };
    e.parts.add(part); e.n++; if (content) e.c++; if (extra && !e.x) e.x = extra;
    keys.set(key, e);
  };
  // the children of an element or a fragment (a fragment's children render straight into the parent — «<>بقي <Num/> نقطة</>»)
  const kidsOf = (p) => {
    const kids = t.react.buildChildren(p.node);
    kids.forEach((k) => { if (t.isStringLiteral(k)) add(k.value, "x"); });
    const hasText = kids.some((k) => t.isStringLiteral(k) && AR.test(k.value));
    const hasExpr = kids.some((k) => !t.isStringLiteral(k) && !t.isJSXElement(k) && !t.isJSXFragment(k));
    const isEl = (k) => t.isJSXElement(k) || t.isJSXFragment(k);
    if (hasText && hasExpr && !kids.some(isEl)) {
      let s = "", i = 0; const ex = [];
      kids.forEach((k) => { if (t.isStringLiteral(k)) s += k.value; else { s += "{" + i++ + "}"; ex.push(src.slice(k.start, k.end)); } });
      add(s, "e", ex.join(" | ").slice(0, 160));
    }
    // "r": a sentence that wraps inline elements — Arabic text on both sides of an element. Placeholders keep child order;
    // elements must stay in the same order in the English (the runtime cuts the English at them).
    const firstAr = kids.findIndex((k) => t.isStringLiteral(k) && AR.test(k.value)); let lastAr = -1; kids.forEach((k, j) => { if (t.isStringLiteral(k) && AR.test(k.value)) lastAr = j; });
    const inlineTag = (k) => { if (!t.isJSXElement(k)) return false; const n = k.openingElement.name; return t.isJSXIdentifier(n) && /^(Num|b|strong|span|bdi|em|i|a|br|small|sup|sub|mark|kbd|code|time|abbr)$/.test(n.name); };
    if (firstAr >= 0 && (kids.some((k, j) => isEl(k) && j > firstAr && j < lastAr) || kids.some(inlineTag))) {
      let s = "", i = 0; const ex = [];
      kids.forEach((k) => { if (t.isStringLiteral(k)) s += k.value; else { s += "{" + i++ + "}"; ex.push((isEl(k) ? "EL " : "") + src.slice(k.start, k.end).replace(/\s+/g, " ").slice(0, 60)); } });
      if (i <= 6) add(s, "r", ex.join(" | ").slice(0, 300));
    }
  };
  const ast = parse(src, { sourceType: "module", plugins: file.endsWith(".tsx") ? ["jsx", "typescript"] : ["typescript"] });
  traverse(ast, {
    StringLiteral(p) { if (AR.test(p.node.value) && !inRegexCtx(p) && !isBilingual(p) && !inType(p) && !(t.isObjectProperty(p.parent) && p.parent.key === p.node && !p.parent.computed)) add(p.node.value, "s", null, isContent(p)); },
    TemplateLiteral(p) {
      if (!p.node.quasis.some((q) => AR.test(q.value.cooked || ""))) return;
      if (t.isTaggedTemplateExpression(p.parent) || isBilingual(p)) return;
      let s = ""; p.node.quasis.forEach((q, i) => { s += q.value.cooked; if (i < p.node.expressions.length) s += "{" + i + "}"; });
      add(s, "t", p.node.expressions.map((e) => src.slice(e.start, e.end)).join(" | ").slice(0, 160));
    },
    JSXFragment(p) { kidsOf(p); },
    JSXElement(p) { kidsOf(p); },
    JSXAttribute(p) { const v = p.node.value; if (t.isStringLiteral(v) && AR.test(v.value)) add(v.value.replace(/\n\s+/g, " "), "s"); },
  });
}

const out = {};
const first = (e) => e.parts.values().next().value;
for (const [k, e] of [...keys.entries()].sort((a, b) => (first(a[1]) < first(b[1]) ? -1 : first(a[1]) > first(b[1]) ? 1 : 0))) out[k] = { k: e.k, p: [...e.parts].join(","), n: e.n, ...(e.c ? { c: e.c } : {}), ...(e.x ? { x: e.x } : {}) };
writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n");
const byKind = {}; let chars = 0;
for (const [k, e] of keys) { byKind[e.k] = (byKind[e.k] || 0) + 1; chars += k.length; }
console.log(`i18n extract: ${keys.size} keys · ${chars} chars · ${[...keys.values()].filter((e) => e.c && e.c >= e.n).length} community-content keys (never translated) ·`, byKind);
