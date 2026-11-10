// The typing ratchet — strict TypeScript and no explicit `any`, enforced where the code is ready and never loosened.
//   node scripts/strict-check.mjs            → check (part of `npm run typecheck`, so CI runs it)
//   node scripts/strict-check.mjs --update   → rewrite scripts/strict-baseline.json from the code as it is now
//
// The app was migrated from JavaScript (docs/MIGRATION.md): tsconfig.json keeps `strict` off so the old files compile.
// Turning it on everywhere at once is ~1,400 errors in 50 files. Instead:
//   · every file is compiled with full strict flags (strict + noImplicitAny + strictNullChecks) and its explicit `any`
//     annotations are counted from the syntax tree;
//   · scripts/strict-baseline.json lists the files that are not clean yet, each with its count;
//   · a file that is not in the baseline must have none of either — so every new file is strict and any-free from its
//     first commit — and a listed file may never get worse. Counts only go down: fix a file, run --update, commit both.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";

const traverse = traverseModule.default || traverseModule;
const ROOT = fileURLToPath(new URL("../", import.meta.url));
const BASELINE = join(ROOT, "scripts", "strict-baseline.json");
const posix = (p) => p.split(sep).join("/");

// ---- 1. strict compile errors per file ----
function strictErrors() {
  const r = spawnSync("npx", ["tsc", "--noEmit", "-p", "tsconfig.json", "--strict", "--noImplicitAny", "true", "--strictNullChecks", "true", "--pretty", "false"], {
    cwd: ROOT, encoding: "utf8", shell: process.platform === "win32", maxBuffer: 64 * 1024 * 1024,
  });
  if (r.error) throw r.error;
  const out = `${r.stdout || ""}\n${r.stderr || ""}`;
  const counts = {};
  let seen = 0;
  for (const line of out.split(/\r?\n/)) {
    const m = /^(.+?)\((\d+),(\d+)\): error TS\d+/.exec(line);
    if (!m) continue;
    seen++;
    const file = posix(m[1]);
    counts[file] = (counts[file] || 0) + 1;
  }
  // tsc failed without a single diagnostic we could read: the tool itself is broken, not the code
  if (r.status !== 0 && !seen) throw new Error(`tsc did not run:\n${out.slice(0, 2000)}`);
  return counts;
}

// ---- 2. explicit `any` per file (syntax tree: a comment or a string that says "any" is not one) ----
const walk = (d) => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(f) && !/\.d\.ts$/.test(f) ? [p] : [];
});
function explicitAny() {
  const counts = {};
  for (const file of walk(join(ROOT, "src"))) {
    const code = readFileSync(file, "utf8");
    if (!/\bany\b/.test(code)) continue;
    const ast = parse(code, { sourceType: "module", plugins: file.endsWith(".tsx") ? ["typescript", "jsx"] : ["typescript"], errorRecovery: true });
    let n = 0;
    traverse(ast, { TSAnyKeyword() { n++; } });
    if (n) counts[posix(relative(ROOT, file))] = n;
  }
  return counts;
}

const sorted = (o) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
const total = (o) => Object.values(o).reduce((a, b) => a + b, 0);

const now = { strict: sorted(strictErrors()), any: sorted(explicitAny()) };

if (process.argv.includes("--update")) {
  writeFileSync(BASELINE, JSON.stringify(now, null, 2) + "\n");
  console.log(`strict baseline written: ${total(now.strict)} strict errors in ${Object.keys(now.strict).length} files · ${total(now.any)} explicit any in ${Object.keys(now.any).length} files`);
  process.exit(0);
}

if (!existsSync(BASELINE)) {
  console.error("scripts/strict-baseline.json is missing — run: node scripts/strict-check.mjs --update");
  process.exit(1);
}
const base = JSON.parse(readFileSync(BASELINE, "utf8"));
const problems = [];
let slack = 0;
for (const [kind, label] of [["strict", "strict-mode error"], ["any", "explicit `any`"]]) {
  const b = base[kind] || {};
  for (const [file, n] of Object.entries(now[kind])) {
    if (!(file in b)) problems.push(`${file}: ${n} ${label}${n > 1 ? "s" : ""} — this file is not in the baseline, so it must have none`);
    else if (n > b[file]) problems.push(`${file}: ${label}s rose from ${b[file]} to ${n}`);
    else if (n < b[file]) slack += b[file] - n;
  }
  for (const file of Object.keys(b)) if (!(file in now[kind])) slack += b[file];
}
if (problems.length) {
  console.error("The typing ratchet failed (scripts/strict-check.mjs):\n" + problems.map((p) => `  · ${p}`).join("\n"));
  console.error("\nNew code is strict and any-free; a listed file may not get worse. Fix the lines above (do not raise the baseline).");
  process.exit(1);
}
console.log(
  `typing ratchet: ${total(now.strict)} strict errors left in ${Object.keys(now.strict).length} files · ${total(now.any)} explicit any in ${Object.keys(now.any).length} files · every other file is strict and any-free` +
    (slack ? `\n  ${slack} fewer than the baseline allows — tighten it: npm run strict:update` : ""),
);
