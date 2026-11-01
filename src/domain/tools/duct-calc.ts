// =====================================================================
//  Duct sizer (W4) — equal friction (docs/TOOLS-BLUEPRINT.md → ductSizer): Darcy–Weisbach with the Altshul–Tsal friction
//  factor solved for the diameter by bisection, Huebscher's equivalent diameter for rectangular ducts, velocity and aspect
//  checks. Fitting losses and the fan's static pressure stay an engineer input (ASHRAE fitting data is licensed).
//  · Standard air ρ = 1.20 kg/m³, μ = 18.13 µPa·s (ASHRAE Fundamentals, Duct Design) [H].
//  · Roughness ε: galvanised steel 0.09 mm [H]; the other classes are the handbook's categories [M].
//  Pure and versioned (DUCT_ENGINE). Units: L/s, mm, Pa, m/s.
// =====================================================================
import { r, type Check, type TraceStep } from "./common";

export const DUCT_ENGINE = "duct-calc@1";
export const AIR = { rho: 1.2, mu: 1.813e-5 };

export type DuctMat = "galv" | "smooth" | "spiral" | "flex";
export const ROUGH: Record<DuctMat, { eps: number; label: string; conf: "H" | "M" }> = {
  galv: { eps: 0.09, label: "صاج مجلفن (وصلات طولية)", conf: "H" },
  smooth: { eps: 0.03, label: "PVC / ألومنيوم أملس", conf: "M" },
  spiral: { eps: 0.15, label: "مجلفن حلزوني", conf: "M" },
  flex: { eps: 3.0, label: "مرن مفرود بالكامل", conf: "M" },
};

export type FlowUnit = "ls" | "cfm" | "m3h";
export const toLs = (q: number, u: FlowUnit) => (u === "cfm" ? q * 0.4719474 : u === "m3h" ? q / 3.6 : q);

// Altshul–Tsal: f′ = 0.11(ε/D + 68/Re)^0.25; f = f′ when f′ ≥ 0.018, else 0.85f′ + 0.0028
export function frictionFactor(epsMm: number, dMm: number, re: number) {
  const f1 = 0.11 * Math.pow(epsMm / dMm + 68 / re, 0.25);
  return f1 >= 0.018 ? f1 : 0.85 * f1 + 0.0028;
}

// pressure loss per metre of a round duct (or a rectangular one through its equivalent diameter, at the round duct's velocity)
export function ductFriction(qLs: number, dMm: number, epsMm = ROUGH.galv.eps) {
  const q = qLs / 1000, d = dMm / 1000;
  const v = q / ((Math.PI * d * d) / 4);
  const re = (AIR.rho * v * d) / AIR.mu;
  const f = frictionFactor(epsMm, dMm, re);
  return { pa: ((f / d) * AIR.rho * v * v) / 2, v, re, f };
}

// the diameter that gives the design friction rate
export function sizeRound(qLs: number, paPerM: number, epsMm = ROUGH.galv.eps) {
  let lo = 20, hi = 5000;
  for (let i = 0; i < 200; i++) {
    const m = (lo + hi) / 2;
    if (ductFriction(qLs, m, epsMm).pa > paPerM) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}

// Huebscher: De = 1.30(ab)^0.625/(a + b)^0.25
export const huebscher = (a: number, b: number) => (1.3 * Math.pow(a * b, 0.625)) / Math.pow(a + b, 0.25);

export const ceilStep = (x: number, step: number) => Math.ceil(x / step - 1e-9) * step;

// a rectangular duct for a given height (the ceiling void decides it): the narrowest width, in steps, whose De ≥ D required
export function rectForHeight(dReq: number, h: number, step = 50) {
  let w = step;
  while (huebscher(w, h) < dReq - 1e-9 && w < 20000) w += step;
  return w;
}

export type DuctRun = {
  tag: string; q: number;                   // L/s
  len: number;                              // m
  shape: "round" | "rect";
  d?: number;                               // chosen round size (mm); blank = auto
  w?: number; h?: number;                   // rectangular: h fixed (mm), w chosen or auto
  fit: number;                              // fitting / terminal losses on this run, Pa (engineer input)
  index: boolean;                           // part of the index (critical) path
};
export type DuctLimits = { paPerM: number; vMax: number; aspectMax: number; step: number; mat: DuctMat };

export type DuctRunOut = {
  ready: boolean; dReq: number; size: string; de: number; v: number; pa: number; dpStraight: number; dpTotal: number;
  aspect: number | null; checks: Check[]; trace: TraceStep[];
};

export function sizeRun(run: DuctRun, lim: DuctLimits): DuctRunOut {
  const eps = ROUGH[lim.mat].eps;
  const trace: TraceStep[] = [];
  const checks: Check[] = [];
  const none: DuctRunOut = { ready: false, dReq: 0, size: "—", de: 0, v: 0, pa: 0, dpStraight: 0, dpTotal: 0, aspect: null, checks, trace };
  if (!(run.q > 0) || !(lim.paPerM > 0)) return none;
  const dReq = sizeRound(run.q, lim.paPerM, eps);
  trace.push({ label: "القطر المطلوب (احتكاك متساوٍ)", expr: `Δp/L = f/D · ρV²/2 = ${lim.paPerM} Pa/m · Q = ${r(run.q, 1)} L/s`, value: `${r(dReq, 1)} mm`, clause: "ASHRAE Fundamentals — Duct Design (Darcy, Altshul–Tsal)" });
  let de: number, size: string, area: number, aspect: number | null = null;
  if (run.shape === "rect") {
    const h = run.h && run.h > 0 ? run.h : ceilStep(dReq / Math.sqrt(2), lim.step);
    const w = run.w && run.w > 0 ? run.w : rectForHeight(dReq, h, lim.step);
    de = huebscher(w, h);
    area = (w * h) / 1e6;
    aspect = Math.max(w, h) / Math.min(w, h);
    size = `${w} × ${h}`;
    trace.push({ label: "القطر المكافئ (هوبشر)", expr: `1.30·(${w}×${h})^0.625/(${w} + ${h})^0.25`, value: `${r(de, 1)} mm`, clause: "Huebscher — ASHRAE Fundamentals, Duct Design" });
  } else {
    const d = run.d && run.d > 0 ? run.d : ceilStep(dReq, lim.step);
    de = d;
    area = (Math.PI * d * d) / 4 / 1e6;
    size = `Ø${d}`;
  }
  const fr = ductFriction(run.q, de, eps);
  const v = run.q / 1000 / area;
  const dpStraight = fr.pa * run.len;
  const dpTotal = dpStraight + (run.fit || 0);
  trace.push({ label: "الاحتكاك الفعلي", expr: `Re = ${r(fr.re, 0)} · f = ${r(fr.f, 5)}`, value: `${r(fr.pa, 3)} Pa/m`, clause: "Darcy–Weisbach · Altshul–Tsal" });
  trace.push({ label: "السرعة", expr: `Q/A = ${r(run.q / 1000, 4)}/${r(area, 4)}`, value: `${r(v, 2)} m/s` });
  if (run.len > 0) trace.push({ label: "فقد الاستقامات", expr: `${r(fr.pa, 3)} × ${run.len}`, value: `${r(dpStraight, 1)} Pa` });
  checks.push({ id: "v", label: "السرعة", value: `${r(v, 2)} m/s`, limit: `≤ ${lim.vMax} m/s`, ok: v <= lim.vMax + 1e-9, level: "warn", clause: "حد التصميم (ضوضاء) — مدخل المهندس", unverified: true });
  checks.push({ id: "fr", label: "الاحتكاك", value: `${r(fr.pa, 3)} Pa/m`, limit: `≤ ${r(lim.paPerM * 1.1, 3)} Pa/m`, ok: fr.pa <= lim.paPerM * 1.1 + 1e-9, level: "warn", clause: "معدل الاحتكاك التصميمي + 10 %" });
  if (aspect != null) checks.push({ id: "ar", label: "نسبة الأبعاد", value: `${r(aspect, 2)} : 1`, limit: `≤ ${lim.aspectMax} : 1`, ok: aspect <= lim.aspectMax + 1e-9, level: "warn", clause: "SMACNA — توصية", unverified: true });
  return { ready: true, dReq, size, de, v, pa: fr.pa, dpStraight, dpTotal, aspect, checks, trace };
}

export function sizeDucts(runs: DuctRun[], lim: DuctLimits) {
  const out = runs.map((x) => sizeRun(x, lim));
  const indexPa = out.reduce((s, o, i) => s + (runs[i].index && o.ready ? o.dpTotal : 0), 0);
  return { runs: out, indexPa, warnings: out.reduce((n, o) => n + o.checks.filter((c) => c.ok === false).length, 0) };
}
