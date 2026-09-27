// Dependency analysis of the prototype's parts (one shared script scope) with the TypeScript checker.
const fs = require("fs"), path = require("path");
const ts = require("C:/Users/youse/AppData/Local/Programs/cursor/resources/app/extensions/node_modules/typescript/lib/typescript.js");
const ROOT = process.argv[2];
const PARTS = ["_brand_part", "_app_1a_geo", "_app_1b_taxonomy", "_app_1c_companies", "_app_1d_jobs", "_app_1e_helpers", "_app_1e2_characters", "_app_1f_search", "_app_1g_identity", "_app_1h_division", "_app_1i_media", "_app_1j_i18n", "_app_2_chrome", "_app_2b_onboarding", "_app_2c_identity_ui", "_app_2d_auth", "_app_2e_verify", "_app_3_screens", "_app_3b_stack", "_app_3c_cv", "_app_3c2_cvaudit", "_app_3d_cvui", "_app_3e_settings", "_app_4_sheets", "_app_4b_devices", "_app_4c_moderation", "_app_4d_verify_admin", "_app_5_root"];
let src = "", ranges = [];
for (const p of PARTS) { let t = fs.readFileSync(path.join(ROOT, p + ".txt"), "utf8"); if (p === "_app_5_root") t = t.replace(/<\/script>\s*$/, ""); const s = src.length; src += t + "\n"; ranges.push([p, s, src.length]); }
const partAt = (pos) => { for (const [p, s, e] of ranges) if (pos >= s && pos < e) return p; return "?"; };
const file = "all.jsx";
const host = ts.createCompilerHost({ allowJs: true, jsx: ts.JsxEmit.Preserve, noEmit: true, noLib: true });
const orig = host.getSourceFile; host.getSourceFile = (f, l) => (f === file ? ts.createSourceFile(file, src, l, true, ts.ScriptKind.JSX) : orig(f, l));
const prog = ts.createProgram([file], { allowJs: true, jsx: ts.JsxEmit.Preserve, noEmit: true, noLib: true, types: [] }, host);
const sf = prog.getSourceFile(file); const checker = prog.getTypeChecker();
const top = new Map(); // decl node -> {name, part}
const declOf = new Map(); // name -> part
for (const st of sf.statements) {
  const part = partAt(st.getStart());
  const add = (n) => { if (declOf.has(n)) console.error("DUP", n, declOf.get(n), part); declOf.set(n, part); };
  if (ts.isFunctionDeclaration(st) && st.name) { add(st.name.text); top.set(st, { name: st.name.text, part }); }
  else if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) {
    const walk = (b) => { if (ts.isIdentifier(b)) { add(b.text); top.set(b, { name: b.text, part }); } else if (ts.isObjectBindingPattern(b) || ts.isArrayBindingPattern(b)) b.elements.forEach((e) => e.name && walk(e.name)); };
    walk(d.name); if (ts.isIdentifier(d.name)) top.set(d, { name: d.name.text, part });
  }
  else if (ts.isClassDeclaration(st) && st.name) { add(st.name.text); top.set(st, { name: st.name.text, part }); }
}
const topDecl = (sym) => { if (!sym || !sym.declarations) return null; for (const d of sym.declarations) { let n = d; if (ts.isBindingElement(n)) { /* destructured */ const id = n.name; if (top.has(id)) return top.get(id); } if (top.has(n)) return top.get(n); if (n.parent && top.has(n.parent)) return top.get(n.parent); if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && top.has(n.name)) return top.get(n.name); } return null; };
const inFn = (n) => { for (let p = n.parent; p; p = p.parent) { if (ts.isFunctionLike(p)) return true; } return false; };
const uses = {}; // part -> depPart -> name -> {eval:bool}
const visit = (n) => {
  if (ts.isIdentifier(n)) {
    const pa = n.parent;
    const isDeclName = (ts.isVariableDeclaration(pa) || ts.isFunctionDeclaration(pa) || ts.isParameter(pa) || ts.isBindingElement(pa) || ts.isClassDeclaration(pa)) && pa.name === n;
    const isProp = (ts.isPropertyAccessExpression(pa) && pa.name === n) || (ts.isPropertyAssignment(pa) && pa.name === n) || (ts.isJsxAttribute(pa) && pa.name === n) || (ts.isBindingElement(pa) && pa.propertyName === n) || (ts.isMethodDeclaration(pa) && pa.name === n);
    if (!isDeclName && !isProp) {
      const sym = ts.isShorthandPropertyAssignment(pa) ? checker.getShorthandAssignmentValueSymbol(pa) : checker.getSymbolAtLocation(n);
      const d = topDecl(sym);
      if (d) { const me = partAt(n.getStart()); if (d.part !== me) { const u = ((uses[me] ||= {})[d.part] ||= {}); const ev = !inFn(n); u[d.name] = { eval: (u[d.name] && u[d.name].eval) || ev }; } }
    }
  }
  ts.forEachChild(n, visit);
};
visit(sf);
const idx = (p) => PARTS.indexOf(p);
const out = { parts: PARTS, declared: {}, uses };
for (const [n, p] of declOf) (out.declared[p] ||= []).push(n);
fs.writeFileSync(path.join(ROOT, "migrate", "deps.json"), JSON.stringify(out, null, 1));
// report forward refs and eval-time forward refs
let fwd = 0, fwdEval = [];
for (const [me, deps] of Object.entries(uses)) for (const [dp, names] of Object.entries(deps)) if (idx(dp) > idx(me)) for (const [nm, f] of Object.entries(names)) { fwd++; if (f.eval) fwdEval.push(`${me} -> ${dp}.${nm}`); }
console.log("declared names:", declOf.size, "forward refs:", fwd, "eval-time forward refs:", fwdEval.length); fwdEval.forEach((x) => console.log("  EVAL-FWD", x));
// who uses devices part / brand view names
for (const [me, deps] of Object.entries(uses)) { if (deps._app_4b_devices) console.log("uses 4b:", me, Object.keys(deps._app_4b_devices).join(",")); }
const brandView = ["TopBar","HeroArt","Hero","SectionHeading","PalettePanel","TypePanel","TypeScale","SalaryCard","SalaryStage","ActionsPanel","TagsPanel","PrivacyPanel","Principles","BrandView"];
for (const [me, deps] of Object.entries(uses)) { if (deps._brand_part) { const b = Object.keys(deps._brand_part).filter((n) => brandView.includes(n)); if (b.length) console.log("uses brand view:", me, b.join(",")); } }
