// One-off migration step: adds explicit gradual types to the JavaScript-era code so `tsc` can check it without rewriting it.
//  · destructured parameters (component props, option objects, [id, label, Icon] tuples in callbacks) → `: any`
//  · untyped parameters of named functions → optional `?: any` (JavaScript callers often pass fewer arguments)
//  · rest parameters → `: any[]`
//  · useState / useRef / useMemo seeded with {}, [], null or an object literal → `<any>`
//  · `const x = {}` / `= []` → `: any`
// Callbacks passed inline keep their contextual types. Run once: node scripts/migrate/gradual-types.cjs src
const fs = require("fs"), path = require("path");
const ts = require(process.env.TS_PATH || "typescript");
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : /\.tsx?$/.test(e.name) ? [path.join(d, e.name)] : []));
let total = 0;
for (const file of walk(process.argv[2])) {
  const text = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const edits = []; // [pos, insert]
  const isCallback = (fn) => { const p = fn.parent; return (ts.isCallExpression(p) || ts.isNewExpression(p)) && p.arguments && p.arguments.includes(fn) || ts.isJsxExpression(p) || ts.isPropertyAssignment(p) && ts.isObjectLiteralExpression(p.parent) && ts.isCallExpression(p.parent.parent) || ts.isParenthesizedExpression(p) && ts.isCallExpression(p.parent) || ts.isArrayLiteralExpression(p) || ts.isConditionalExpression(p) || ts.isBinaryExpression(p) || ts.isReturnStatement(p) || ts.isArrowFunction(p); };
  const visit = (n) => {
    if (ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isArrowFunction(n) || ts.isMethodDeclaration(n)) {
      const cb = (ts.isArrowFunction(n) || ts.isFunctionExpression(n)) && isCallback(n);
      for (const p of n.parameters) {
        if (p.type) continue;
        if (p.dotDotDotToken) { if (!cb) edits.push([p.name.getEnd(), ": any[]"]); continue; }
        if (ts.isObjectBindingPattern(p.name) || ts.isArrayBindingPattern(p.name)) { if (!cb || ts.isArrayBindingPattern(p.name) || ts.isObjectBindingPattern(p.name) && !ts.isCallExpression(n.parent)) edits.push([p.name.getEnd(), ": any"]); continue; }
        if (ts.isIdentifier(p.name) && !cb) {
          if (p.initializer) edits.push([p.name.getEnd(), ": any"]);
          else if (!p.questionToken) edits.push([p.name.getEnd(), "?: any"]);
        }
      }
    }
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && ["useState", "useRef", "useMemo", "createContext"].includes(n.expression.text) && !n.typeArguments) {
      const a = n.arguments[0];
      const loose = a && (ts.isObjectLiteralExpression(a) || ts.isArrayLiteralExpression(a) || a.kind === ts.SyntaxKind.NullKeyword || (ts.isArrowFunction(a) && n.expression.text !== "useMemo") || ts.isIdentifier(a) || ts.isCallExpression(a) || ts.isStringLiteral(a) || ts.isConditionalExpression(a) || ts.isPropertyAccessExpression(a));
      if (loose || n.expression.text === "useMemo") edits.push([n.expression.getEnd(), "<any>"]);
    }
    if (ts.isVariableDeclaration(n) && !n.type && ts.isIdentifier(n.name) && n.initializer && (ts.isObjectLiteralExpression(n.initializer) || ts.isArrayLiteralExpression(n.initializer)) && ts.isVariableDeclarationList(n.parent) && !(n.parent.flags & ts.NodeFlags.Const && ts.isSourceFile(n.parent.parent.parent) && n.initializer.getText().length > 2)) {
      edits.push([n.name.getEnd(), ": any"]);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  if (!edits.length) continue;
  edits.sort((a, b) => b[0] - a[0]);
  let out = text; for (const [pos, ins] of edits) out = out.slice(0, pos) + ins + out.slice(pos);
  fs.writeFileSync(file, out); total += edits.length;
}
console.log("annotations added:", total);
