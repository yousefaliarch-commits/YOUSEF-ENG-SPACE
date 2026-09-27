// One-off migration step: targeted fixes for what gradual-types.cjs cannot infer — mixed-type lookup tables, boolean
// arithmetic in sort comparators, DOM element casts. Every replacement must match exactly the expected number of times.
const fs = require("fs");
const edit = (file, pairs) => {
  let s = fs.readFileSync(file, "utf8");
  for (const [a, b, n = 1] of pairs) {
    const count = s.split(a).length - 1;
    if (count === 0 && s.includes(b)) continue; // already applied
    if (count !== n) throw new Error(`${file}: expected ${n} × ${JSON.stringify(a.slice(0, 70))}, found ${count}`);
    s = s.split(a).join(b);
  }
  fs.writeFileSync(file, s);
};
// tables whose rows mix strings, numbers, regexes and icons: typed as rows of any
const table = (file, names) => edit(file, names.map((n) => [`export const ${n} = `, `export const ${n}: any = `]));
table("src/domain/moderation.ts", ["REPORT_REASONS"]);
table("src/domain/taxonomy.ts", ["TRACKS", "POSITIONS", "REP_LEVELS"]);
table("src/data/geo.ts", ["GOVS"]);
table("src/ui/theme.ts", ["THEMES"]);
table("src/data/companies.tsx", ["POST_TYPES"]);
table("src/features/verify/verify.tsx", ["VERIFY_REJECT"]);
table("src/features/cv/audit.ts", ["ENG_CODES", "ENG_CREDS", "TRACK_SIG"]);
table("src/features/cv/extract.ts", ["CV_LANG_NAMES", "CV_CERT_LIST", "CV_DISCS", "keywordRe"]);
table("src/i18n/i18n.ts", ["I18ND"]);
// boolean ± boolean (a sort-comparator idiom) → Number()
edit("src/domain/moderation.ts", [["(b.status === \"open\") - (a.status === \"open\")", "Number(b.status === \"open\") - Number(a.status === \"open\")"], ["counts[b] - counts[a]", "(counts[b] as number) - (counts[a] as number)"]]);
edit("src/features/cv/audit.ts", [["(a.count === 0) - (b.count === 0)", "Number(a.count === 0) - Number(b.count === 0)"]]);
edit("src/features/stack/stack.tsx", [["(!!app.roomFollows[b.id]) - (!!app.roomFollows[a.id])", "Number(!!app.roomFollows[b.id]) - Number(!!app.roomFollows[a.id])"], ["((p.best === b.c.id) - (p.best === a.c.id))", "(Number(p.best === b.c.id) - Number(p.best === a.c.id))"]]);
edit("src/features/tabs/tabs.tsx", [["(!!app.roomFollows[b.id]) - (!!app.roomFollows[a.id])", "Number(!!app.roomFollows[b.id]) - Number(!!app.roomFollows[a.id])"], ["(b.unread > 0) - (a.unread > 0)", "Number(b.unread > 0) - Number(a.unread > 0)"], ["const active = (disc !== \"all\") + (sub !== \"all\") + (pos !== \"all\") + (region !== \"all\")", "const active = Number(disc !== \"all\") + Number(sub !== \"all\") + Number(pos !== \"all\") + Number(region !== \"all\")"]]);
edit("src/ui/identity.tsx", [["(b.id === focus) - (a.id === focus)", "Number(b.id === focus) - Number(a.id === focus)"]]);
// DOM casts
edit("src/app/App.tsx", [["const m = document.querySelector('meta[name=\"theme-color\"]');", "const m = document.querySelector('meta[name=\"theme-color\"]') as HTMLMetaElement | null;"]]);
edit("src/features/cv/extract.ts", [["const root = dom.body.firstChild;", "const root = dom.body.firstChild as HTMLElement;"]]);
for (const f of ["src/features/admin/verify-admin.tsx"]) edit(f, [["const back = document.activeElement;", "const back = document.activeElement as HTMLElement | null;"]]);
for (const f of ["src/ui/chrome.tsx", "src/lib/media.tsx"]) edit(f, [["const prev = document.activeElement;", "const prev = document.activeElement as HTMLElement | null;"]]);
// small typing fixes
edit("src/lib/runtime.ts", [["const w = typeof window !== \"undefined\" ? window : {};", "const w: any = typeof window !== \"undefined\" ? window : {};"], ["const subs = new Set();", "const subs = new Set<() => void>();"]]);
edit("src/lib/ocr.ts", [["export const withTimeout = (p?: any, ms?: any) => new Promise((res, rej) =>", "export const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T> => new Promise((res, rej) =>"]]);
edit("src/i18n/i18n.ts", [["(d) => \"٠١٢٣٤٥٦٧٨٩\".indexOf(d))", "(d) => String(\"٠١٢٣٤٥٦٧٨٩\".indexOf(d)))"]]);
edit("src/domain/moderation.ts", [["Object.values(reviews).forEach(", "Object.values(reviews as Record<string, any>).forEach("]]);
edit("src/features/cv/audit.ts", [["const where = Object.fromEntries(", "const where: Record<string, any[]> = Object.fromEntries("], ["const types = [...new Set(cv.projectTypes)].slice(0, 2);", "const types = [...new Set(cv.projectTypes as string[])].slice(0, 2);"], ["parseFloat(String(s).replace(/[,٬\\s]/g, \"\").match(/\\d+(?:\\.\\d+)?/) || [0])", "parseFloat(String(String(s).replace(/[,٬\\s]/g, \"\").match(/\\d+(?:\\.\\d+)?/) || [0]))"]]);
edit("src/features/cv/CVReviewScreen.tsx", [["const allowedTracks = (disc?: any) => tracksFor(disc).map((x) => x[0]);", "const allowedTracks = (disc?: any): string[] => tracksFor(disc).map((x) => x[0]);"]]);
edit("src/ui/characters.tsx", [["style={{ \"--w\": `${w + 3}px` }}", "style={{ \"--w\": `${w + 3}px` } as React.CSSProperties}"]]);
edit("src/features/cv/audit.ts", [["const s = Object.fromEntries(allowed.map((t) => [t, 0]));", "const s: Record<string, number> = Object.fromEntries(allowed.map((t) => [t, 0]));"]]);
edit("src/lib/media.tsx", [["return [input, () => { if (ref.current) ref.current.click(); }];", "return [input, () => { if (ref.current) ref.current.click(); }] as const;"]]);
edit("src/features/cv/audit.ts", [["const shares = Object.fromEntries(Object.entries(s).map(", "const shares: Record<string, number> = Object.fromEntries(Object.entries(s).map("]]);
edit("src/i18n/i18n.ts", [["const parents = new Set()", "const parents = new Set<any>()", 2]]);
edit("src/lib/media.tsx", [["const r = await withTimeout(w.recognize(c), 60000);", "const r: any = await withTimeout(w.recognize(c), 60000);"]]);
console.log("type fixes applied");
