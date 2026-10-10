// =====================================================================
//  Bar bending schedule — engine (pure, versioned). docs/TOOLS-BLUEPRINT.md §3.3
//  · BS 8666:2020 shape codes; the governing cut length is the BS formula rounded UP to the profile step; the exact centre
//    line (tangent-intersection deduction 2(r+d)·tan(θ/2) − θ(r+d/2) per bend) is a self-test, and the governing length
//    for the free sketch (shape 99).
//  · Bend radius: BS 8666 Table 2 where it lists the size, else 2d (≤ 16) / 3.5d (> 16) — Ø18 never falls on the small mandrel.
//  · Ld (ECP 203): α·β·η·(fy/γs)·Φ / (4·fbu), fbu = 0.30·√(fcu/γc). Laps are 1.3·Ld unless the mark is declared staggered.
//    Plain grades and non-ECP profiles never get a computed lap: the member types it.
// =====================================================================
import { ceilTo, r, type Check, type TraceStep } from "./common";

export const BBS_ENGINE = "bbs@1.0.0";

export const BBS_DIAMETERS = [6, 8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 32, 36, 40];

export const BBS_KG_PER_M: Readonly<Record<number, number>> = {
  6: 0.222, 8: 0.395, 10: 0.617, 12: 0.888, 14: 1.208, 16: 1.578, 18: 1.998, 20: 2.466, 22: 2.984, 25: 3.853, 28: 4.834, 32: 6.313, 36: 7.99, 40: 9.865,
};
const R_TABLE: Readonly<Record<number, number>> = { 6: 12, 8: 16, 10: 20, 12: 24, 16: 32, 20: 70, 25: 87, 32: 112, 40: 140 };

export const kgPerM = (d: number) => BBS_KG_PER_M[d] ?? Number(((d * d) / 162.2).toFixed(3));
export const bbsRadius = (d: number) => R_TABLE[d] ?? (d <= 16 ? 2 * d : 3.5 * d);

// steel grades: fy (MPa) and whether the bar is plain (no computed lap)
export const BBS_GRADES: { id: string; fy: number; plain?: boolean; legacy?: boolean }[] = [
  { id: "B500DWR", fy: 500 }, { id: "B500B-R", fy: 500 }, { id: "B420DWR", fy: 420 }, { id: "B400DWR", fy: 400 }, { id: "B400B-R", fy: 400 },
  { id: "B400C-R", fy: 400 }, { id: "B350DWR", fy: 350 }, { id: "B300", fy: 300 }, { id: "B240B-P", fy: 240, plain: true },
  { id: "24/35", fy: 240, plain: true, legacy: true }, { id: "28/45", fy: 280, plain: true, legacy: true }, { id: "36/52", fy: 360, legacy: true }, { id: "40/60", fy: 400, legacy: true },
];
export const gradeOf = (id: string) => BBS_GRADES.find((g) => g.id === id) || { id, fy: 400 };

export type BbsShape = "00" | "11" | "12" | "13" | "21" | "22" | "23" | "25" | "26" | "31" | "33" | "41" | "51" | "63" | "77" | "99";
export type BbsDims = { A?: number; B?: number; C?: number; D?: number; E?: number; R?: number; segs?: { len: number; angle: number }[] };

// which letters each shape asks for, and its BS formula as printed
export const BBS_SHAPES: { code: BbsShape; letters: (keyof BbsDims)[]; formula: string; bends90: number; name: string }[] = [
  { code: "00", letters: ["A"], formula: "A", bends90: 0, name: "مستقيم" },
  { code: "11", letters: ["A", "B"], formula: "A + (B) − 0.5r − d", bends90: 1, name: "زاوية 90°" },
  { code: "12", letters: ["A", "B", "R"], formula: "A + (B) − 0.43R − 1.2d", bends90: 1, name: "زاوية بنصف قطر" },
  { code: "13", letters: ["A", "B", "C"], formula: "A + 0.57B + (C) − 1.6d", bends90: 2, name: "خطاف 180°" },
  { code: "21", letters: ["A", "B", "C"], formula: "A + B + (C) − r − 2d", bends90: 2, name: "حرف U" },
  { code: "22", letters: ["A", "B", "C", "D"], formula: "A + B + C + (D) − 1.5r − 3d", bends90: 3, name: "U بخطاف" },
  { code: "23", letters: ["A", "B", "C"], formula: "A + B + (C) − r − 2d", bends90: 2, name: "Z" },
  { code: "25", letters: ["A", "B", "E"], formula: "A + B + (E)", bends90: 0, name: "مائل" },
  { code: "26", letters: ["A", "B", "C"], formula: "A + B + (C)", bends90: 0, name: "مكسح" },
  { code: "31", letters: ["A", "B", "C", "D"], formula: "A + B + C + (D) − 1.5r − 3d", bends90: 3, name: "ثلاث ثنيات" },
  { code: "33", letters: ["A", "B", "C"], formula: "2A + 1.7B + 2(C) − 4d", bends90: 4, name: "U بخطافين" },
  { code: "41", letters: ["A", "B", "C", "D", "E"], formula: "A + B + C + D + (E) − 2r − 4d", bends90: 4, name: "أربع ثنيات" },
  { code: "51", letters: ["A", "B"], formula: "2A + 2B + max(16d, 160)", bends90: 4, name: "كانة مغلقة" },
  { code: "63", letters: ["A", "B"], formula: "2A + 3B + max(14d, 140) | 13d", bends90: 4, name: "كانة بخطافين" },
  { code: "77", letters: ["A", "B", "C"], formula: "C·π(A − d)", bends90: 0, name: "حلزوني" },
  { code: "99", letters: [], formula: "Σ L − Σ 2(r+d)·tan(θ/2) + Σ θ(r+d/2)", bends90: 0, name: "رسم حر" },
];
export const shapeOf = (c: BbsShape) => BBS_SHAPES.find((s) => s.code === c)!;

// deduction of one bend measured to tangent intersections, deflection θ (radians, ≤ π/2)
const bendDeduction = (theta: number, rr: number, d: number) => 2 * (rr + d) * Math.tan(theta / 2) - theta * (rr + d / 2);

export function bbsCutLength(shape: BbsShape, dims: BbsDims, d: number, o: { rOverride?: number | null; rounding: number }) {
  const rMin = bbsRadius(d);
  const rr = o.rOverride && o.rOverride > 0 ? o.rOverride : rMin;
  const g = (k: keyof BbsDims) => (typeof dims[k] === "number" ? (dims[k] as number) : 0);
  const A = g("A"), B = g("B"), C = g("C"), D = g("D"), E = g("E"), R = g("R");
  const checks: Check[] = [];
  const trace: TraceStep[] = [];
  let formula: number | null = null;
  let straight = 0;
  let bends: number[] = [];
  switch (shape) {
    case "00": formula = A; straight = A; break;
    case "11": formula = A + B - 0.5 * rr - d; straight = A + B; bends = [Math.PI / 2]; break;
    case "12": formula = A + B - 0.43 * R - 1.2 * d; straight = A + B; break;
    case "13": formula = A + 0.57 * B + C - 1.6 * d; break;
    case "21": formula = A + B + C - rr - 2 * d; straight = A + B + C; bends = [Math.PI / 2, Math.PI / 2]; break;
    case "22": formula = A + B + C + D - 1.5 * rr - 3 * d; straight = A + B + C + D; bends = [Math.PI / 2, Math.PI / 2, Math.PI / 2]; break;
    case "23": formula = A + B + C - rr - 2 * d; straight = A + B + C; bends = [Math.PI / 2, Math.PI / 2]; break;
    case "25": formula = A + B + E; break;
    case "26": formula = A + B + C; break;
    case "31": formula = A + B + C + D - 1.5 * rr - 3 * d; straight = A + B + C + D; bends = [Math.PI / 2, Math.PI / 2, Math.PI / 2]; break;
    case "33": formula = 2 * A + 1.7 * B + 2 * C - 4 * d; break;
    case "41": formula = A + B + C + D + E - 2 * rr - 4 * d; straight = A + B + C + D + E; bends = [Math.PI / 2, Math.PI / 2, Math.PI / 2, Math.PI / 2]; break;
    case "51": formula = 2 * A + 2 * B + Math.max(16 * d, 160); break;
    case "63": formula = 2 * A + 3 * B + (d <= 16 ? Math.max(14 * d, 140) : 13 * d); break;
    case "77": {
      const circ = Math.PI * (A - d);
      formula = B > A / 5 ? C * Math.sqrt(circ * circ + B * B) : C * circ;
      break;
    }
    case "99": {
      const segs = dims.segs || [];
      straight = segs.reduce((a, s) => a + (s.len || 0), 0);
      bends = segs.slice(0, -1).map((s) => (Math.min(90, Math.max(0, s.angle || 0)) * Math.PI) / 180).filter((t) => t > 0);
      break;
    }
  }
  const exact = bends.length || shape === "99" ? straight - bends.reduce((a, t) => a + bendDeduction(t, rr, d), 0) : formula ?? straight;
  const govern = shape === "99" ? exact : (formula as number);
  const rounded = o.rounding > 0 ? ceilTo(govern, o.rounding) : Math.ceil(govern - 1e-9);
  trace.push({ label: `الشكل ${shape}`, expr: shape === "99" ? shapeOf(shape).formula : shapeOf(shape).formula, value: `${r(govern, 1)} mm` });
  trace.push({ label: "نصف قطر الثني", expr: R_TABLE[d] ? `BS 8666 T2 (Ø${d})` : d <= 16 ? "2d" : "3.5d", value: `${rr} mm` });
  if (o.rOverride && o.rOverride < rMin)
    checks.push({ id: "bbs.rBelowMin", label: "نصف قطر أقل من الأدنى", value: `${o.rOverride} mm`, limit: `≥ ${rMin} mm`, ok: false, level: "warn", clause: "BS 8666 T2" });
  if (shape !== "99" && bends.length && Math.abs(exact - (formula as number)) > 5)
    checks.push({ id: "bbs.exactDelta", label: "الفرق عن خط المنتصف الدقيق", value: `${r(exact - (formula as number), 1)} mm`, limit: "≤ 5 mm", ok: null, level: "warn" });
  for (const k of shapeOf(shape).letters) {
    const x = g(k);
    if (x && x % 5 !== 0) {
      checks.push({ id: "bbs.notMult5", label: `البعد ${k} ليس من مضاعفات 5`, value: `${x}`, limit: "× 5 mm", ok: false, level: "warn" });
      break;
    }
  }
  // the site rule (2d per 90° bend) — a comparison only
  const site = shapeOf(shape).bends90 && straight ? straight - 2 * d * shapeOf(shape).bends90 : undefined;
  if (site != null && bends.length && Math.abs(site - exact) > 25)
    checks.push({ id: "bbs.siteRuleDelta", label: "قاعدة الموقع (2d لكل ثنية) تختلف", value: `${r(site - exact, 1)} mm`, limit: "± 25 mm", ok: false, level: "warn" });
  if (rounded <= 0) checks.push({ id: "bbs.zero", label: "طول القص غير صحيح", value: `${r(govern, 0)}`, limit: "> 0", ok: false, level: "error" });
  return { formulaMm: shape === "99" ? null : formula, exactMm: exact, roundedMm: rounded, siteRuleMm: site, rMm: rr, checks, trace };
}

// ---- development and lap length (ECP 203 only) ----
export function bbsLd(i: { fy: number; fcu: number; d: number; grade: string; pos: "top" | "other" | "unknown"; hooked?: boolean; staggered?: boolean; profile?: string }) {
  const g = gradeOf(i.grade);
  const typedRequired = !!g.plain || (i.profile != null && i.profile !== "ecp203");
  const fbu = 0.3 * Math.sqrt(i.fcu / 1.5);
  const alpha = i.hooked ? 0.7 : 1, beta = 0.75, eta = i.pos === "other" ? 1 : 1.3;
  const ldPhi = (alpha * beta * eta * (i.fy / 1.15)) / (4 * fbu);
  const ldMm = ldPhi * i.d;
  const ldRounded = Math.max(300, ceilTo(ldMm, 25));
  const lapMm = i.staggered ? ldMm : 1.3 * ldMm;
  const lapRounded = Math.max(300, ceilTo(lapMm, 25));
  const trace: TraceStep[] = [
    { label: "إجهاد التماسك", expr: "0.30·√(fcu/1.5)", value: `${r(fbu, 4)} MPa`, clause: "ECP 203" },
    { label: "طول التماسك / القطر", expr: `α·β·η·(fy/1.15)/(4·fbu), η=${eta}`, value: `${r(ldPhi, 2)}Φ`, clause: "ECP 203" },
    { label: "طول الوصلة", expr: i.staggered ? "Ld (متخالفة ≤ 50 %)" : "1.3·Ld (كل الأسياخ في قطاع واحد)", value: `${lapRounded} mm` },
  ];
  return { fbu, ldPhi, ldMm, ldRoundedMm: ldRounded, lapMm, lapRoundedMm: lapRounded, typedRequired, trace };
}

// ---- schedule lines ----
export type BbsLine = {
  id: string; member: string; mark: string; d: number; shape: BbsShape; dims: BbsDims; nMembers: number; nPer: number;
  pos: "top" | "other" | "unknown"; rOverride?: number | null;
  lap?: { mode: "auto" | "staggered" | "typed"; mm?: number | null; source?: string };
};

export function bbsLine(l: BbsLine, o: { rounding: number; fy: number; fcu: number; grade: string; stockMm: number }) {
  const cut = bbsCutLength(l.shape, l.dims, l.d, { rOverride: l.rOverride, rounding: o.rounding });
  const totalNo = Math.max(0, l.nMembers) * Math.max(0, l.nPer);
  // over the stock: split with a lap (1.3·Ld unless staggered, or the typed value)
  let lapMm = 0, splices = 0;
  const checks = [...cut.checks];
  if (cut.roundedMm > o.stockMm) {
    const ld = bbsLd({ fy: o.fy, fcu: o.fcu, d: l.d, grade: o.grade, pos: l.pos, staggered: l.lap?.mode === "staggered" });
    lapMm = l.lap?.mode === "typed" || ld.typedRequired ? Math.max(ld.typedRequired ? 400 : 300, l.lap?.mm || 0) : ld.lapRoundedMm;
    if ((l.lap?.mode === "typed" || ld.typedRequired) && !l.lap?.mm)
      checks.push({ id: "bbs.lapTyped", label: "طول الوصلة مطلوب إدخاله", value: "—", limit: ld.typedRequired ? "سيخ أملس / كود آخر" : "مُدخل", ok: false, level: "warn" });
    splices = lapMm < o.stockMm ? Math.ceil((cut.roundedMm - o.stockMm) / (o.stockMm - lapMm) - 1e-9) : 0;
    checks.push({ id: "bbs.overStock", label: "أطول من السيخ — وصلات", value: `${splices} × ${lapMm} mm`, limit: `${o.stockMm} mm`, ok: null, level: "warn" });
  }
  const pieceMm = cut.roundedMm + splices * lapMm;
  const totalM = (totalNo * pieceMm) / 1000;
  const kgm = kgPerM(l.d);
  return { ...cut, checks, totalNo, lapMm, splices, pieceMm, totalM, kgPerM: kgm, kg: totalM * kgm };
}

export function bbsSummary(rows: { d: number; totalM: number }[]) {
  const by = new Map<number, number>();
  rows.forEach((x) => by.set(x.d, (by.get(x.d) || 0) + x.totalM));
  const out = [...by].sort((a, b) => a[0] - b[0]).map(([d, m]) => {
    const kg = Number((m * kgPerM(d)).toFixed(3));
    return { d, totalM: m, kgPerM: kgPerM(d), kg, t: kg / 1000 };
  });
  return { rows: out, kg: out.reduce((a, x) => a + x.kg, 0) };
}

// the pieces a line sends to the cutting plan (spliced lines become stock-length pieces plus the last piece)
export function cutPieces(cutMm: number, n: number, stockMm: number, lapMm: number, splices: number): { lenMm: number; n: number }[] {
  if (!splices) return [{ lenMm: cutMm, n }];
  const last = cutMm + splices * lapMm - splices * stockMm;
  return [{ lenMm: stockMm, n: n * splices }, { lenMm: last, n }];
}

// ---------------------------------------------------------------------
//  Cutting optimiser — 12 m stock (integer mm). Candidates: two pattern strategies (best fill; most demand covered) and
//  first / best fit decreasing; the best under: new bars ↓, scrap ↓, remnant count ↓, longest remnant ↑, total remnant ↑,
//  pattern count ↓. Remnants from the store are filled first. Claims rest on the material bound LB = ⌈Σ l·n / L⌉
//  (a true lower bound): «proven» when bars = LB, «withinOne» when bars = LB + 1.
// ---------------------------------------------------------------------
export type CutDemand = { mark: string; lenMm: number; n: number };
export type CutPattern = { cuts: { mark: string; lenMm: number }[]; reps: number; offcutMm: number; offcut: "scrap" | "remnant" | "none"; fromRemnant?: string; tag?: string };
export type CutPlan = {
  patterns: CutPattern[]; newBars: number; scrapMm: number; remnantsMm: number[]; remnantsUsed: string[]; lowerBound: number; lpBound: number | null;
  ffdBars: number; naiveBars: number; method: "patterns" | "ffd"; optimality: "proven" | "withinOne" | "heuristic" | null;
};
export type CutOpts = { kerfMm?: number; trimMm?: number; minRemnantMm?: number; remnants?: { id: string; lenMm: number }[] };

type Piece = { mark: string; len: number };

const expand = (dem: CutDemand[]) =>
  dem.flatMap((x) => Array.from({ length: Math.max(0, x.n) }, () => ({ mark: x.mark, len: Math.round(x.lenMm) })))
    .sort((a, b) => b.len - a.len || a.mark.localeCompare(b.mark));

export const cutLowerBound = (dem: CutDemand[], stockMm: number) => Math.ceil(dem.reduce((a, x) => a + x.lenMm * x.n, 0) / stockMm - 1e-9);

export const cutNaive = (dem: CutDemand[], stockMm: number) =>
  dem.reduce((a, x) => {
    const per = Math.floor(stockMm / x.lenMm);
    return a + (per > 0 ? Math.ceil(x.n / per - 1e-9) : x.n);
  }, 0);

type Bin = { cap: number; used: number; cuts: Piece[]; from?: string };

function fitDecreasing(pieces: Piece[], stock: number, kerf: number, best: boolean, bins: Bin[] = []): Bin[] {
  for (const p of pieces) {
    let pick: Bin | null = null;
    for (const b of bins) {
      const need = p.len + (b.cuts.length ? kerf : 0);
      if (b.used + need <= b.cap) {
        if (!best) { pick = b; break; }
        if (!pick || b.cap - b.used < pick.cap - pick.used) pick = b;
      }
    }
    if (!pick) {
      pick = { cap: stock, used: 0, cuts: [] };
      bins.push(pick);
    }
    pick.used += p.len + (pick.cuts.length ? kerf : 0);
    pick.cuts.push(p);
  }
  return bins;
}

// all maximal patterns over the remaining demand (distinct lengths, bounded counts), capped
function patternsFor(rem: Map<number, number>, cap: number, kerf: number, minRem = 0, limit = 4000): number[][] {
  const lens = [...rem.keys()].filter((l) => (rem.get(l) || 0) > 0).sort((a, b) => b - a);
  const out: number[][] = [];
  const cur: number[] = [];
  const used = (sum: number, count: number) => sum + Math.max(0, count - 1) * kerf;
  const go = (i: number, sum: number) => {
    if (out.length >= limit) return;
    if (i === lens.length) {
      if (!cur.length) return;
      // maximal: no remaining piece still fits
      const fits = lens.some((l) => cur.filter((x) => x === l).length < (rem.get(l) || 0) && used(sum + l, cur.length + 1) <= cap);
      if (!fits) out.push([...cur]);
      return;
    }
    const l = lens[i];
    let maxK = 0;
    while (maxK < (rem.get(l) || 0) && used(sum + (maxK + 1) * l, cur.length + maxK + 1) <= cap) maxK++;
    for (let k = maxK; k >= 0; k--) {
      for (let j = 0; j < k; j++) cur.push(l);
      go(i + 1, sum + k * l);
      cur.length -= k;
    }
  };
  go(0, 0);
  // a pattern whose offcut would be scrap also comes one piece shorter, leaving a usable remnant instead
  if (minRem > 0) {
    const extra: number[][] = [];
    for (const pat of out) {
      const off = cap - (pat.reduce((a, x) => a + x, 0) + Math.max(0, pat.length - 1) * kerf);
      if (off > 0 && off < minRem && pat.length > 1) extra.push(pat.slice(0, -1));
    }
    out.push(...extra);
  }
  return out;
}

const fillOf = (pat: number[], kerf: number) => pat.reduce((a, x) => a + x, 0) + Math.max(0, pat.length - 1) * kerf;

function repsOf(pat: number[], rem: Map<number, number>) {
  const need = new Map<number, number>();
  pat.forEach((l) => need.set(l, (need.get(l) || 0) + 1));
  let reps = Infinity;
  need.forEach((k, l) => (reps = Math.min(reps, Math.floor((rem.get(l) || 0) / k))));
  return reps === Infinity ? 0 : reps;
}

function patternStrategy(pieces: Piece[], stock: number, kerf: number, mode: "fill" | "cover", minRem: number): Bin[] {
  const rem = new Map<number, number>();
  pieces.forEach((p) => rem.set(p.len, (rem.get(p.len) || 0) + 1));
  const marks = new Map<number, string[]>();
  pieces.forEach((p) => (marks.get(p.len) || marks.set(p.len, []).get(p.len)!).push(p.mark));
  const bins: Bin[] = [];
  let guard = 0;
  while ([...rem.values()].some((n) => n > 0) && guard++ < 10000) {
    const pats = patternsFor(rem, stock, kerf, minRem);
    if (!pats.length) break;
    let best: number[] | null = null, bestKey: number[] = [];
    for (const p of pats) {
      const reps = repsOf(p, rem);
      if (!reps) continue;
      const fill = fillOf(p, kerf);
      const off = stock - fill;
      const scrap = off > 0 && off < minRem ? off : 0;
      // keys compared lexicographically (larger is better)
      const key = mode === "fill"
        ? [-scrap, fill, reps, ...p]
        : [fill * reps - scrap * reps * 4, -scrap, fill, ...p];
      if (!best || lexGreater(key, bestKey)) {
        best = p;
        bestKey = key;
      }
    }
    if (!best) break;
    const reps = repsOf(best, rem);
    for (let k = 0; k < reps; k++) {
      const cuts = best.map((l) => ({ mark: marks.get(l)!.shift() || "", len: l }));
      bins.push({ cap: stock, used: fillOf(best, kerf), cuts });
    }
    best.forEach((l) => rem.set(l, (rem.get(l) || 0) - reps));
  }
  return bins;
}

function lexGreater(a: number[], b: number[]) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? -Infinity, y = b[i] ?? -Infinity;
    if (x !== y) return x > y;
  }
  return false;
}

function score(bins: Bin[], minRem: number) {
  const fresh = bins.filter((b) => !b.from);
  const offs = bins.map((b) => b.cap - b.used).filter((o) => o > 0);
  const scrap = offs.filter((o) => o < minRem).reduce((a, x) => a + x, 0);
  const rems = offs.filter((o) => o >= minRem);
  const sig = new Set(bins.map((b) => b.cuts.map((c) => c.len).join(","))).size;
  // smaller is better, compared in order
  return [fresh.length, scrap, rems.length, -Math.max(0, ...rems), -rems.reduce((a, x) => a + x, 0), sig];
}

function toPlan(bins: Bin[], stock: number, minRem: number): CutPattern[] {
  const groups = new Map<string, CutPattern>();
  let tag = 0;
  for (const b of bins) {
    const off = b.cap - b.used;
    const key = `${b.from || ""}|${b.cap}|${b.cuts.map((c) => `${c.mark}:${c.len}`).join(",")}`;
    const g = groups.get(key);
    if (g && !b.from) {
      g.reps++;
      continue;
    }
    groups.set(key, {
      cuts: b.cuts.map((c) => ({ mark: c.mark, lenMm: c.len })), reps: 1, offcutMm: off,
      offcut: off <= 0 ? "none" : off >= minRem ? "remnant" : "scrap", fromRemnant: b.from,
    });
  }
  const out = [...groups.values()];
  out.forEach((p) => {
    if (p.offcut === "remnant") p.tag = `R-${String(++tag).padStart(2, "0")}`;
  });
  return out;
}

export function cutPlan(dem: CutDemand[], stockMm: number, o: CutOpts = {}): CutPlan {
  const kerf = o.kerfMm || 0;
  const stock = stockMm - (o.trimMm || 0);
  const minRem = o.minRemnantMm ?? 1000;
  const pieces = expand(dem).filter((p) => p.len > 0 && p.len <= stock);
  // remnants from the store first: each takes the best-filling pieces it can hold
  const remBins: Bin[] = [];
  let left = pieces;
  for (const rm of [...(o.remnants || [])].sort((a, b) => a.lenMm - b.lenMm)) {
    const rem = new Map<number, number>();
    left.forEach((p) => rem.set(p.len, (rem.get(p.len) || 0) + 1));
    const pats = patternsFor(rem, rm.lenMm, kerf).sort((a, b) => fillOf(b, kerf) - fillOf(a, kerf));
    if (!pats.length) continue;
    const pat = pats[0];
    const take: Piece[] = [];
    const pool = [...left];
    for (const l of pat) {
      const i = pool.findIndex((p) => p.len === l);
      take.push(pool.splice(i, 1)[0]);
    }
    left = pool;
    remBins.push({ cap: rm.lenMm, used: fillOf(pat, kerf), cuts: take, from: rm.id });
  }
  const cands: { bins: Bin[]; method: "patterns" | "ffd" }[] = [
    { bins: patternStrategy(left, stock, kerf, "fill", minRem), method: "patterns" },
    { bins: patternStrategy(left, stock, kerf, "cover", minRem), method: "patterns" },
    { bins: fitDecreasing(left, stock, kerf, false), method: "ffd" },
    { bins: fitDecreasing(left, stock, kerf, true), method: "ffd" },
  ];
  const ffdBars = cands[2].bins.length;
  let best = cands[0];
  for (const c of cands.slice(1)) if (lexLess(score(c.bins, minRem), score(best.bins, minRem))) best = c;
  const all = [...remBins, ...best.bins];
  const newBars = best.bins.length;
  const lb = cutLowerBound([{ mark: "", lenMm: 1, n: left.reduce((a, p) => a + p.len, 0) }], stock);
  const offs = all.map((b) => b.cap - b.used).filter((x) => x > 0);
  return {
    patterns: toPlan(all, stock, minRem),
    newBars, scrapMm: offs.filter((x) => x < minRem).reduce((a, x) => a + x, 0), remnantsMm: offs.filter((x) => x >= minRem),
    remnantsUsed: remBins.map((b) => b.from!), lowerBound: lb, lpBound: null, ffdBars, naiveBars: cutNaive(dem, stock), method: best.method,
    optimality: !newBars ? null : newBars === lb ? "proven" : newBars === lb + 1 ? "withinOne" : "heuristic",
  };
}

function lexLess(a: number[], b: number[]) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0, y = b[i] ?? 0;
    if (x !== y) return x < y;
  }
  return false;
}
