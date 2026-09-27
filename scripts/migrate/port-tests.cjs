// One-off: ports the prototype's logic-test-vNN.js suites to Vitest files in the new codebase. The header (JSX compile,
// stub React, new Function over the page scope) is replaced by the shared harness; the checks themselves are kept verbatim.
const fs = require("fs"), path = require("path");
const OUT = "C:/Users/youse/Projects/engspace/tests";
const files = fs.readdirSync(".").filter((f) => /^logic-test-v\d+\.js$/.test(f)).sort();
for (const f of files) {
  const v = f.match(/v(\d+)/)[1];
  const lines = fs.readFileSync(f, "utf8").replace(/\r/g, "").split("\n");
  const cIdx = lines.findIndex((l) => /^const (C|make) = /.test(l));
  if (cIdx < 0) throw new Error(f + ": no C line");
  const header = lines.slice(0, cIdx);
  // leading doc comment, minus the lines about how the old runner was invoked
  const doc = [];
  for (const l of header) { if (!l.startsWith("//")) break; if (/usage:|sink\/compiled|production-compiled|Runs the .*page code|against stubs/.test(l)) continue; doc.push(l); }
  // the names list (may span lines) and the v19 list of names that must be gone
  const grab = (name) => { const s = header.findIndex((l) => l.startsWith(`const ${name} = [`)); if (s < 0) return null; let e = s; while (!/\];\s*$/.test(header[e])) e++; return header.slice(s, e + 1).join("\n"); };
  const names = grab("names"), gone = grab("gone");
  let body = lines.slice(cIdx + 1);
  if (/^const C = make\(/.test(body[0])) body = body.slice(1); // v14: page code ran twice with different crypto; Node's global webcrypto now
  let text = body.join("\n").replace(/\s+$/, "");
  const failVar = /\blet fails = 0/.test(text) ? "fails" : "fail";
  // the final summary line (console.log … process.exit) goes; Vitest reports instead
  text = text.replace(/^\s*console\.log\([^\n]*process\.exit\([^\n]*\);?[^\n]*$/m, "");
  text = text.replace(/^\(async \(\) => \{$/m, "await (async () => {").replace(/^\}\)\(\)\.catch\([^\n]*$/m, "})();");
  if (/process\.exit|process\.argv|require\(/.test(text)) throw new Error(f + ": leftover process/require");
  // v24 read the page's babel block for static checks — the app source is the equivalent now
  text = text.replace(/^const src = \(html\.match\([^\n]*$/m, "const src = H.src;");
  const declares = (n) => new RegExp(`^(const|let) ${n}\\b`, "m").test(text);
  const uses = (n) => new RegExp(`\\b${n}\\b`).test(text);
  const pre = [];
  if (uses("src") && !declares("src")) pre.push("const src = H.src;");
  if (uses("html") && !declares("html")) pre.push("const html = H.src;");
  if (names) pre.push(names);
  if (gone) pre.push(gone);
  const title = (doc[0] || `// v${v}`).replace(/^\/\/\s*/, "").replace(/^v\d+ logic tests:\s*/, "").replace(/[.:]\s*$/, "");
  const out = [
    ...doc,
    "// Ported from the prototype suite logic-test-v" + v + ".js — the checks are unchanged; the page scope is now tests/harness.",
    "import { test, expect } from \"vitest\";",
    "import * as H from \"./harness\";",
    "const { C, store } = H;",
    ...pre,
    "",
    `test(${JSON.stringify(`v${v} · ${title}`)}, async () => {`,
    text,
    "",
    `  expect(${failVar}, \`\${${failVar}} failed check(s) — see the ✗ lines in the log\`).toBe(0);`,
    "});",
    "",
  ].join("\n");
  fs.writeFileSync(path.join(OUT, `v${v}.test.ts`), out);
  console.log("ported", f, "→", `v${v}.test.ts`, failVar, names ? "names" : "", gone ? "gone" : "");
}
