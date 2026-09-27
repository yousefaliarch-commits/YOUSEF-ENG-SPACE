// One-off migration: the prototype's 27 script parts (one shared scope, concatenated by assemble.py) → ES modules with
// explicit imports/exports. Every top-level declaration is assigned to a module (its part's module unless moved below), each
// module imports exactly the names it references, and the module graph is checked for cycles.
// usage: node generate.cjs <prototype dir> <project dir>
const fs = require("fs"), path = require("path");
const ts = require("C:/Users/youse/AppData/Local/Programs/cursor/resources/app/extensions/node_modules/typescript/lib/typescript.js");
const [ROOT, OUT] = process.argv.slice(2);
const rd = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

// ---- the same assembly as assemble.py (full lucide import list), minus the page shell ----
const PARTS = ["_brand_part", "_app_1a_geo", "_app_1b_taxonomy", "_app_1c_companies", "_app_1d_jobs", "_app_1e_helpers", "_app_1e2_characters", "_app_1f_search", "_app_1g_identity", "_app_1h_division", "_app_1i_media", "_app_1j_i18n", "_app_2_chrome", "_app_2b_onboarding", "_app_2c_identity_ui", "_app_2d_auth", "_app_2e_verify", "_app_3_screens", "_app_3b_stack", "_app_3c_cv", "_app_3c2_cvaudit", "_app_3d_cvui", "_app_3e_settings", "_app_4_sheets", "_app_4b_devices", "_app_4c_moderation", "_app_4d_verify_admin", "_app_5_root"];
const asm = rd("assemble.py");
const newImp = asm.slice(asm.indexOf('new_imp = """') + 13, asm.indexOf('"""', asm.indexOf('new_imp = """') + 13));
let src = "", ranges = [];
for (const p of PARTS) {
  let t = rd(p + ".txt");
  if (p === "_brand_part") { const a = t.indexOf("  const {\n    Bell, Fingerprint"); const b = t.indexOf("} = LucideReact;", a) + "} = LucideReact;".length; t = t.slice(0, a) + newImp + t.slice(b); }
  if (p === "_app_5_root") t = t.replace(/<\/script>\s*$/, "");
  const s = src.length; src += t + "\n"; ranges.push([p, s, src.length]);
}
const partAt = (pos) => { for (const [p, s, e] of ranges) if (pos >= s && pos < e) return p; return "?"; };
const file = "all.jsx";
const host = ts.createCompilerHost({ allowJs: true });
const orig = host.getSourceFile; host.getSourceFile = (f, l) => (f === file ? ts.createSourceFile(file, src, l, true, ts.ScriptKind.JSX) : orig(f, l));
const prog = ts.createProgram([file], { allowJs: true, jsx: ts.JsxEmit.Preserve, noEmit: true, noLib: true, types: [] }, host);
const sf = prog.getSourceFile(file); const checker = prog.getTypeChecker();

// ---- module map ----
const PART_MODULE = {
  _brand_part: "ui/primitives", _app_1a_geo: "data/geo", _app_1b_taxonomy: "domain/taxonomy", _app_1c_companies: "data/companies", _app_1d_jobs: "data/seed",
  _app_1e_helpers: "lib/helpers", _app_1e2_characters: "ui/characters", _app_1f_search: "lib/search", _app_1g_identity: "domain/identity", _app_1h_division: "domain/division",
  _app_1i_media: "lib/media", _app_1j_i18n: "i18n/i18n", _app_2_chrome: "ui/chrome", _app_2b_onboarding: "ui/feed", _app_2c_identity_ui: "ui/identity", _app_2d_auth: "features/auth/auth",
  _app_2e_verify: "features/verify/verify", _app_3_screens: "features/tabs/tabs", _app_3b_stack: "features/stack/stack", _app_3c_cv: "features/cv/extract", _app_3c2_cvaudit: "features/cv/audit",
  _app_3d_cvui: "features/cv/CVReviewScreen", _app_3e_settings: "features/settings/settings", _app_4_sheets: "features/sheets/sheets", _app_4b_devices: null, _app_4c_moderation: "domain/moderation",
  _app_4d_verify_admin: "features/admin/verify-admin", _app_5_root: "app/AppView",
};
const MOVE = {};
const move = (mod, names) => names.split(/\s+/).filter(Boolean).forEach((n) => (MOVE[n] = mod));
move("lib/runtime", "liveState createStore storeFor useStore PlatformCtx ModeCtx useMode usePlatform reducedMotion reduced");
move("ui/theme", "ACCENTS labelOf THEMES accentHex NEUTRALS DISCIPLINES fmt");
move("app/TopBar", "TopBar");
move("domain/text-guard", "DIGIT_WORDS normalizeText CONTACT_KINDS detectContact LANG_KINDS AR_PROFANITY AR_PROFANITY_PHRASES AR_MILD AR_INSULTS AR_THREATS AR_HATE AR_HATE_ADDR AR_SEXUAL AR_SEXUAL_MILD AR_NAME_EXCEPTIONS FR_PROFANITY FR_INSULTS EN_PROFANITY EN_INSULTS EN_MILD EN_THREATS EN_HATE EN_SEXUAL arNorm LEET AR_PREFIX AR_SUFFIX langNormalize mask arCandidates latCandidates screenLanguage LANGUAGE_POLICY");
move("domain/taxonomy", "RETIRED_ROLES canVerifyRole");
move("lib/ocr", "OCR_LIB withTimeout loadImageEl ocrModelsPath ocrWorkerShim OCR_WORKER_URL ocrWorkerUrl ocrOpen ocrPrep");
move("ui/characters", "AnonChip");
move("lib/time", "AR_COUNT whenMinutes byNewest");
move("domain/identity", "fnv accIdOf memberAccId authorAccId");
move("lib/media", "HiddenFigure");
move("lib/posts", "flatten countComments applyReaction");
move("ui/chrome", "ThemeQuick");
move("ui/moderation", "Removed HiddenByMe RemovedMine ReportSheet");
move("data/tools", "TOOLS");
move("ui/notifications", "NotificationsBody NotificationsScreen");
move("features/admin/kit", "usePeek SevChip ToneChip STATUS_CHIP faceOf accName Kpi PanelHead Columns HBar BoxRow Stepper SearchBox Choice SettingRow");
move("features/admin/AdminView", "ADMIN_SECTIONS AdminView OverviewSection QueueSection SUSPEND_OPTS CaseDetail UsersSection UserDetail AnalyticsSection ContentSection SettingsSection AuditList AuditSection");
move("app/App", "loadTheme systemMode App PRESS_SEL installPressFeedback");
// dropped: the brand board, the device previews + live code editor, and the page-level mount (main.tsx replaces it)
const DROP = new Set("HeroArt Hero SectionHeading PalettePanel TypePanel TypeScale SalaryCard SalaryStage ActionsPanel TagsPanel PrivacyPanel Principles BrandView Modal LiveBoundary mountApp".split(" "));

// ---- statements ----
const REACT_NAMES = new Set(), ICON_NAMES = new Map(); // local name -> exported name
const stmts = [];
for (const st of sf.statements) {
  const part = partAt(st.getStart());
  if (ts.isVariableStatement(st) && st.declarationList.declarations.length === 1 && ts.isObjectBindingPattern(st.declarationList.declarations[0].name) && st.declarationList.declarations[0].initializer && ts.isIdentifier(st.declarationList.declarations[0].initializer)) {
    const from = st.declarationList.declarations[0].initializer.text;
    for (const el of st.declarationList.declarations[0].name.elements) { const local = el.name.text, exp = el.propertyName ? el.propertyName.text : local; if (from === "React") REACT_NAMES.add(local); else if (from === "LucideReact") ICON_NAMES.set(local, exp); }
    continue;
  }
  if (ts.isIfStatement(st)) continue; // the page-level mount line — main.tsx mounts the app
  if (ts.isExpressionStatement(st)) { stmts.push({ st, part, names: [], expr: true }); continue; } // `if (...) mountApp()` etc.
  const names = [];
  if ((ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st)) && st.name) names.push(st.name.text);
  else if (ts.isVariableStatement(st)) st.declarationList.declarations.forEach((d) => ts.isIdentifier(d.name) && names.push(d.name.text));
  stmts.push({ st, part, names });
}
const declMod = new Map(); // name -> module
const modOf = (s) => { if (s.part === "_app_4b_devices") return null; if (s.names.some((n) => DROP.has(n))) return null; const m = s.names.map((n) => MOVE[n]).find(Boolean); return m || PART_MODULE[s.part]; };
for (const s of stmts) { s.mod = s.expr ? null : modOf(s); for (const n of s.names) declMod.set(n, s.mod); }
const dropped = stmts.filter((s) => !s.expr && !s.mod).flatMap((s) => s.names);
const exprStmts = stmts.filter((s) => s.expr).map((s) => partAt(s.st.getStart()) + ": " + s.st.getText().slice(0, 80));

// ---- references per module ----
const isTopDecl = (d) => { let n = d; while (n && !ts.isSourceFile(n.parent)) n = n.parent; return n; };
const refs = new Map(); // mod -> Map(name -> fromMod)
const ext = new Map(); // mod -> {react:Set, icons:Set, reactNs:bool, reactDom:bool}
const unresolved = new Map();
const note = (mod) => { if (!refs.has(mod)) refs.set(mod, new Map()); if (!ext.has(mod)) ext.set(mod, { react: new Set(), icons: new Set(), reactNs: false, reactDom: false }); };
for (const s of stmts) {
  if (!s.mod) continue; note(s.mod); const R = refs.get(s.mod), E = ext.get(s.mod);
  const visit = (n) => {
    if (ts.isIdentifier(n)) {
      const pa = n.parent;
      const isName = (ts.isPropertyAccessExpression(pa) && pa.name === n) || (ts.isPropertyAssignment(pa) && pa.name === n) || (ts.isJsxAttribute(pa) && pa.name === n) || (ts.isBindingElement(pa) && pa.propertyName === n) || (ts.isMethodDeclaration(pa) && pa.name === n) || (ts.isPropertyDeclaration(pa) && pa.name === n);
      if (!isName) {
        const t = n.text;
        const sym = ts.isShorthandPropertyAssignment(pa) ? checker.getShorthandAssignmentValueSymbol(pa) : checker.getSymbolAtLocation(n);
        const d = sym && sym.declarations && sym.declarations[0];
        if (d) {
          const topSt = isTopDecl(d);
          if (topSt && ts.isVariableStatement(topSt) && ts.isObjectBindingPattern(topSt.declarationList.declarations[0].name)) { if (REACT_NAMES.has(t)) E.react.add(t); else if (ICON_NAMES.has(t)) E.icons.add(t); }
          else if (topSt && topSt !== s.st && (topSt.parent === sf)) { const fromMod = declMod.get(t); if (fromMod === undefined) {} else if (fromMod === null) { (unresolved.get(s.mod) || unresolved.set(s.mod, new Set()).get(s.mod)).add(t + " (dropped)"); } else if (fromMod !== s.mod) R.set(t, fromMod); }
        } else if (t === "React" && ts.isPropertyAccessExpression(pa)) E.reactNs = true;
        else if (t === "ReactDOM") E.reactDom = true;
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(s.st);
}
// ---- graph + cycles ----
const mods = [...new Set(stmts.map((s) => s.mod).filter(Boolean))];
const edges = new Map(mods.map((m) => [m, new Set([...(refs.get(m) || new Map()).values()])]));
const order = []; const state = new Map(); const cycles = [];
const dfs = (m, stack) => { if (state.get(m) === 2) return; if (state.get(m) === 1) { cycles.push([...stack.slice(stack.indexOf(m)), m].join(" -> ")); return; } state.set(m, 1); stack.push(m); for (const d of edges.get(m) || []) dfs(d, stack); stack.pop(); state.set(m, 2); order.push(m); };
mods.forEach((m) => dfs(m, []));
console.log("modules:", mods.length, "dropped decls:", dropped.join(" "));
console.log("expression statements (not emitted):", exprStmts.join(" | "));
for (const [m, u] of unresolved) console.log("REFERS TO DROPPED:", m, [...u].join(", "));
console.log(cycles.length ? "CYCLES:\n  " + [...new Set(cycles)].join("\n  ") : "no cycles");
if (process.argv.includes("--dry")) process.exit(0);

// ---- emit ----
const rel = (from, to) => { let r = path.posix.relative(path.posix.dirname(from), to); if (!r.startsWith(".")) r = "./" + r; return r; };
const tplRanges = []; const collectTpl = (n) => { if (ts.isTemplateExpression(n) || ts.isNoSubstitutionTemplateLiteral(n)) tplRanges.push([n.getStart(), n.getEnd()]); ts.forEachChild(n, collectTpl); }; collectTpl(sf);
const inTpl = (pos) => tplRanges.some(([a, b]) => pos > a && pos < b);
const dedent = (text, base) => { let out = "", i = 0; const lines = text.split("\n"); let pos = base; for (const l of lines) { out += (i ? "\n" : "") + (!inTpl(pos) && l.startsWith("  ") ? l.slice(2) : l); pos += l.length + 1; i++; } return out; };
const hasJsx = new Map();
const written = [];
for (const m of mods) {
  const body = [];
  for (const s of stmts.filter((x) => x.mod === m)) {
    const full = s.st.getFullStart(), start = s.st.getStart(); let lead = src.slice(full, start); let code = src.slice(start, s.st.getEnd());
    const exportable = ts.isFunctionDeclaration(s.st) || ts.isVariableStatement(s.st) || ts.isClassDeclaration(s.st);
    if (exportable) code = "export " + code;
    body.push(dedent(lead, full) + dedent(code, start));
    let jsx = false; const f = (n) => { if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxFragment(n)) jsx = true; else ts.forEachChild(n, f); }; f(s.st); if (jsx) hasJsx.set(m, true);
  }
  const E = ext.get(m) || { react: new Set(), icons: new Set() }; const R = refs.get(m) || new Map();
  const imp = [];
  const reactNames = [...E.react].sort();
  if (E.reactNs || reactNames.length) imp.push(`import ${E.reactNs ? "React" + (reactNames.length ? ", " : "") : ""}${reactNames.length ? "{ " + reactNames.join(", ") + " }" : ""} from "react";`);
  if (E.reactDom) imp.push(`import ReactDOM from "react-dom";`);
  const icons = [...E.icons].sort().map((l) => (ICON_NAMES.get(l) !== l ? `${ICON_NAMES.get(l)} as ${l}` : l));
  if (icons.length) imp.push(`import {\n  ${icons.join(", ").replace(/(.{1,110})(, |$)/g, "$1$2\n  ").trim()}\n} from "lucide-react";`);
  const byMod = new Map(); for (const [n, fm] of R) { if (!byMod.has(fm)) byMod.set(fm, []); byMod.get(fm).push(n); }
  for (const fm of [...byMod.keys()].sort()) imp.push(`import { ${byMod.get(fm).sort().join(", ")} } from "${rel(m, fm)}";`);
  const ext_ = hasJsx.get(m) ? ".tsx" : ".ts";
  const out = path.join(OUT, "src", m + ext_);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const origin = [...new Set(stmts.filter((x) => x.mod === m).map((x) => x.part.replace(/^_/, "")))].join(", ");
  fs.writeFileSync(out, `// Migrated from the prototype part(s): ${origin}\n${imp.join("\n")}\n${body.join("\n").replace(/^\n+/, "\n")}\n`);
  written.push(m + ext_);
}
fs.writeFileSync(path.join(OUT, "migrate-report.json"), JSON.stringify({ modules: written, order, dropped }, null, 1));
console.log("wrote", written.length, "modules");
