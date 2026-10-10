// =====================================================================
//  Levelling field book — engine (pure, versioned, integer millimetres). docs/TOOLS-BLUEPRINT.md §3.4
//  · HI and rise-and-fall reductions with both arithmetic checks, misclosure against a chosen allowance, adjustment by
//    setups or by distance (refused when the run fails), the two-peg collimation test, cut / fill against design.
//  · Readings may be negative (an inverted staff, «مقلوبة»).
// =====================================================================
import type { Check, TraceStep } from "./common";

export const LVL_ENGINE = "levelBook@1.0.0";

export type LvlRow = { id: string; pt: string; bs?: number | null; is?: number | null; fs?: number | null; distM?: number | null; designMm?: number | null; remark?: string };

export type LvlPoint = { id: string; pt: string; hiMm?: number; rlMm: number; riseMm?: number; fallMm?: number; setup: number; cumDistM?: number; bsPoint?: boolean };

const has = (x: number | null | undefined): x is number => typeof x === "number" && Number.isFinite(x);

export function lvlReduce(rows: LvlRow[], openRlMm: number) {
  const pts: LvlPoint[] = [];
  let hi: number | null = null, rl = openRlMm, prevReading: number | null = null, setup = 0, cum = 0;
  let sumBs = 0, sumIs = 0, sumFs = 0, sumRise = 0, sumFall = 0;
  const hiN: { hi: number; n: number }[] = [];
  for (const r of rows) {
    let p: LvlPoint | null = null;
    // the foresight (or intermediate) from the current setup
    const shot = has(r.fs) ? r.fs : has(r.is) ? r.is : null;
    if (shot != null && hi != null) {
      rl = hi - shot;
      const d = (prevReading ?? shot) - shot;
      p = { id: r.id, pt: r.pt, rlMm: rl, setup, riseMm: d > 0 ? d : undefined, fallMm: d < 0 ? -d : undefined };
      if (d > 0) sumRise += d;
      else sumFall += -d;
      hiN[hiN.length - 1].n++;
      if (has(r.fs)) {
        sumFs += r.fs;
        cum += r.distM || 0;
        p.cumDistM = cum;
      } else sumIs += r.is as number;
      prevReading = shot;
    }
    // a backsight starts a new setup (on the BM, or on this change point)
    if (has(r.bs)) {
      if (!p) p = { id: r.id, pt: r.pt, rlMm: rl, setup: setup + 1, bsPoint: true, cumDistM: cum };
      setup++;
      hi = rl + r.bs;
      hiN.push({ hi, n: 0 });
      sumBs += r.bs;
      prevReading = r.bs;
      p.hiMm = hi;
    }
    if (p) pts.push(p);
  }
  return { pts, sumBs, sumIs, sumFs, sumRise, sumFall, setups: setup, hiN, openRlMm };
}

export type LvlReduced = ReturnType<typeof lvlReduce>;

export function lvlChecks(r: LvlReduced) {
  const first = r.openRlMm;
  const last = r.pts.length ? r.pts[r.pts.length - 1].rlMm : first;
  const diff = last - first;
  const lhs = r.hiN.reduce((a, x) => a + x.hi * x.n, 0) - r.sumIs - r.sumFs;
  const rhs = r.pts.filter((p, i) => !(i === 0 && p.bsPoint)).filter((p) => !p.bsPoint || p.riseMm != null || p.fallMm != null).reduce((a, p) => a + p.rlMm, 0);
  return { check1: r.sumBs - r.sumFs === diff, checkRf: r.sumRise - r.sumFall === diff, check2: lhs === rhs, diffMm: diff, bsMinusFs: r.sumBs - r.sumFs, riseMinusFall: r.sumRise - r.sumFall, check2Lhs: lhs, check2Rhs: rhs };
}

export type LvlAllow = { kind: "sqrtK" | "sqrtN" | "fixed"; c: number; fixedMm?: number };
export const LVL_ALLOW_PRESETS: { id: string; name: string; rule: LvlAllow; formula: string }[] = [
  { id: "eng", name: "هندسي 12√K", rule: { kind: "sqrtK", c: 12 }, formula: "12√K mm" },
  { id: "precise", name: "دقيق 4√K", rule: { kind: "sqrtK", c: 4 }, formula: "4√K mm" },
  { id: "rough", name: "تقريبي 24√K", rule: { kind: "sqrtK", c: 24 }, formula: "24√K mm" },
  { id: "site", name: "موقع مبانٍ 5√n", rule: { kind: "sqrtN", c: 5 }, formula: "5√n mm" },
  { id: "eg", name: "نقطة مرجعية مصرية 6√K ⚑", rule: { kind: "sqrtK", c: 6 }, formula: "6√K mm" },
];

export function lvlMisclosure(r: LvlReduced, closeKnownMm: number, rule: LvlAllow, routeKm = 0) {
  const last = r.pts.length ? r.pts[r.pts.length - 1].rlMm : r.openRlMm;
  const e = last - closeKnownMm;
  const allow = rule.kind === "fixed" ? rule.fixedMm || 0 : rule.kind === "sqrtN" ? rule.c * Math.sqrt(r.setups) : rule.c * Math.sqrt(routeKm);
  return { eMm: e, allowMm: allow, ok: Math.abs(e) <= allow + 1e-9, ratio: allow > 0 ? Math.abs(e) / allow : Infinity };
}

const roundHalfAway = (x: number) => Math.sign(x) * Math.round(Math.abs(x));

export function lvlAdjust(r: LvlReduced, eMm: number, by: "setups" | "distance") {
  const N = r.setups || 1;
  const total = r.pts.reduce((a, p) => Math.max(a, p.cumDistM || 0), 0);
  // an intermediate sight takes its setup's closing (FS) point correction in distance mode
  const fsCum = new Map<number, number>();
  r.pts.forEach((p) => {
    if (p.cumDistM != null && !p.bsPoint) fsCum.set(p.setup, p.cumDistM);
  });
  return r.pts.map((p, i) => {
    if (i === 0 && p.bsPoint) return { id: p.id, corrMm: 0, adjRlMm: p.rlMm };
    const c = by === "setups" ? (-eMm * p.setup) / N : total > 0 ? (-eMm * (fsCum.get(p.setup) ?? p.cumDistM ?? 0)) / total : 0;
    return { id: p.id, corrMm: c, adjRlMm: roundHalfAway(p.rlMm + c) };
  });
}

export function lvlTwoPeg(i: { a1: number; b1: number; a2: number; b2: number; saM: number; sbM: number }, limitMmPer20m = 1) {
  const dh1 = i.a1 - i.b1, dh2 = i.a2 - i.b2;
  const e = (dh2 - dh1) / (i.saM - i.sbM);
  const per20 = Math.abs(e) * 20;
  const round1 = (x: number) => Math.round(x * 10) / 10;
  return {
    eMmPerM: e, per20Mm: per20, arcSec: Math.atan(Math.abs(e) / 1000) * 206264.806, ok: per20 <= limitMmPer20m + 1e-9,
    b2CorrMm: round1(i.b2 - e * i.sbM), a2CorrMm: round1(i.a2 - e * i.saM),
  };
}

export function lvlCutFill(rlMm: number, designMm: number) {
  const mm = rlMm - designMm;
  const kind = mm > 0 ? "cut" : mm < 0 ? "fill" : "onGrade";
  return { mm, kind, label: kind === "onGrade" ? "0.000" : `${kind === "cut" ? "C" : "F"} ${(Math.abs(mm) / 1000).toFixed(3)}` } as const;
}

export function lvlValidate(rows: LvlRow[], staffLenMm: number): Check[] {
  const out: Check[] = [];
  const first = rows.find((r) => has(r.bs) || has(r.is) || has(r.fs));
  if (first && !has(first.bs)) out.push({ id: "lvl.firstNotBs", label: "أول قراءة يجب أن تكون مؤخرة على الروبير", value: first.pt, limit: "BS", ok: false, level: "error" });
  let sawBs = false, openBs = false;
  rows.forEach((r) => {
    if (has(r.is) && !sawBs) out.push({ id: "lvl.isBeforeBs", label: `قراءة متوسطة قبل أي مؤخرة (${r.pt})`, value: "IS", limit: "BS أولًا", ok: false, level: "error" });
    if (has(r.fs)) openBs = false;
    if (has(r.bs)) {
      if (openBs && !has(r.fs)) out.push({ id: "lvl.twoBs", label: `مؤخرتان بلا مقدمة بينهما (${r.pt})`, value: "BS, BS", limit: "FS بينهما", ok: false, level: "error" });
      openBs = true;
      sawBs = true;
    }
    for (const v of [r.bs, r.is, r.fs]) if (has(v) && Math.abs(v) > staffLenMm) out.push({ id: "lvl.overStaff", label: `قراءة أطول من القامة (${r.pt})`, value: (v / 1000).toFixed(3), limit: `≤ ${(staffLenMm / 1000).toFixed(1)} m`, ok: false, level: "error" });
    if (has(r.distM) && r.distM > 200) out.push({ id: "lvl.longSight", label: `خط نظر طويل (${r.pt})`, value: `${r.distM} m`, limit: "≤ 100 m لكل خط", ok: false, level: "warn" });
  });
  return out;
}

export function lvlTrace(r: LvlReduced, c: ReturnType<typeof lvlChecks>): TraceStep[] {
  const m = (x: number) => (x / 1000).toFixed(3);
  return [
    { label: "التحقق الأول", expr: "ΣBS − ΣFS = آخر − أول", value: `${m(r.sumBs)} − ${m(r.sumFs)} = ${m(c.bsMinusFs)} ${c.check1 ? "✓" : "✗"}` },
    { label: "الارتفاع والانخفاض", expr: "Σرفع − Σهبوط", value: `${m(r.sumRise)} − ${m(r.sumFall)} = ${m(c.riseMinusFall)} ${c.checkRf ? "✓" : "✗"}` },
    { label: "التحقق الثاني", expr: "Σ(HI·n) − ΣIS − ΣFS = ΣRL", value: `${m(c.check2Lhs)} = ${m(c.check2Rhs)} ${c.check2 ? "✓" : "✗"}` },
  ];
}
