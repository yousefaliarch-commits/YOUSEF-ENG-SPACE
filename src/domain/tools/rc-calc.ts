// =====================================================================
//  RC section check (W4) — a rectangular beam or a one-way slab strip: flexure by strain compatibility (singly or doubly
//  reinforced), shear, minimum reinforcement, bar spacing, crack-control spacing and the span / depth limit. Every step is a
//  TraceStep with its clause, every limit a Check, and every failure comes with what to change (`advice`).
//  · ACI 318-19 (SI) — the clause is printed with each step [H].
//  · ECP 203-2020 (limit states, γc 1.5 · γs 1.15) — the constants are transcribed, NOT yet checked against the printed code
//    (docs/TOOLS-BLUEPRINT.md → rcSection): each is flagged ⚑, a pass reads «ضمن الحد ⚑», never «مطابق».
//  Pure and versioned (RC_ENGINE). Units: mm, MPa (N/mm²), kN, kN·m. Never a substitute for the engineer of record.
// =====================================================================
import { r, type Check, type TraceStep } from "./common";

export const RC_ENGINE = "rc-calc@1";
export const ES = 200000;          // MPa — ACI 20.2.2.2
export const ECU = 0.003;          // ACI 22.2.2.1

export type RcCode = "aci318-19" | "ecp203-2020";
export type RcKind = "beam" | "slab";
export type RcSupport = "simple" | "oneEnd" | "bothEnds" | "cantilever";

export type RcIn = {
  code: RcCode;
  kind: RcKind;
  b: number;            // mm (a slab is checked as a 1000 mm strip)
  h: number;            // mm
  cover: number;        // clear cover, mm — to the stirrup (beam) or to the main bar (slab)
  fc: number;           // MPa — f'c cylinder (ACI) or fcu cube (ECP)
  fy: number;           // MPa — main bars
  fyt: number;          // MPa — stirrups
  nT: number;           // beam: number of tension bars
  dT: number;           // tension bar Ø, mm
  sT: number;           // slab: tension bar spacing, mm
  layers: 1 | 2;        // beam: tension bars in one or two layers
  nC: number;           // beam: compression bars
  dC: number;           // compression bar Ø
  dS: number;           // stirrup Ø
  legs: number;         // stirrup legs
  sS: number;           // stirrup spacing, mm
  mu: number;           // factored moment, kN·m
  vu: number;           // factored shear at the critical section, kN
  span: number;         // m (0: span / depth not checked)
  support: RcSupport;
  agg: number;          // largest aggregate size, mm
};

export type RcOut = {
  ready: boolean;
  geo: { d: number; dt: number; dp: number; as: number; asc: number; av: number };
  flex: { c: number; a: number; epsT: number; phi: number; mn: number; cap: number; asReq: number | null; asMin: number; util: number };
  shear: { vc: number; vs: number; cap: number; sMax: number; sReq: number | null; util: number };
  hMin: number | null;
  checks: Check[];
  trace: TraceStep[];
  advice: string[];
  ok: boolean;
  flagged: boolean;     // ECP: transcribed constants, a pass is «ضمن الحد ⚑»
};

export const barArea = (d: number) => (Math.PI * d * d) / 4;
const pos = (x: number) => Number.isFinite(x) && x > 0;

export const SUPPORT_LABEL: Record<RcSupport, string> = {
  simple: "بسيطة الارتكاز",
  oneEnd: "مستمرة من طرف",
  bothEnds: "مستمرة من الطرفين",
  cantilever: "كابولي",
};

// span / depth denominators: ACI 318-19 Table 9.3.1.1 (beams) and Table 7.3.1.1 (one-way slabs) for fy = 420, scaled by
// (0.4 + fy/700); ECP 203 table (transcribed ⚑, no steel-grade factor applied)
const DEPTH: Record<RcCode, Record<RcKind, Record<RcSupport, number>>> = {
  "aci318-19": { beam: { simple: 16, oneEnd: 18.5, bothEnds: 21, cantilever: 8 }, slab: { simple: 20, oneEnd: 24, bothEnds: 28, cantilever: 10 } },
  "ecp203-2020": { beam: { simple: 16, oneEnd: 18, bothEnds: 21, cantilever: 8 }, slab: { simple: 25, oneEnd: 30, bothEnds: 36, cantilever: 10 } },
};

// ACI 318-19 Table 22.2.2.4.3
export const beta1 = (fc: number) => (fc <= 28 ? 0.85 : fc >= 55 ? 0.65 : 0.85 - (0.05 * (fc - 28)) / 7);

// ACI 318-19 Table 21.2.2 (deformed reinforcement, εty = fy/Es — 21.2.2.1)
export function phiFlex(epsT: number, fy: number) {
  const ety = fy / ES;
  if (epsT >= ety + 0.003) return 0.9;
  if (epsT <= ety) return 0.65;
  return 0.65 + (0.25 * (epsT - ety)) / 0.003;
}

// the neutral axis by force equilibrium (bisection), and the nominal moment about the tension steel
export function solveSection(o: {
  b: number; h: number; d: number; dp: number; as: number; asc: number;
  block: number;        // uniform stress of the block: 0.85 f'c (ACI) / 0.67 fcu/γc (ECP)
  beta: number;         // block depth / c: β1 (ACI) / 0.8 (ECP)
  fs: number;           // the steel's design stress cap: fy (ACI) / fy/γs (ECP)
  displaced: boolean;   // deduct the concrete displaced by compression bars inside the block (ACI)
}) {
  const fsT = (c: number) => Math.min(o.fs, (ES * ECU * (o.d - c)) / c);
  const fsC = (c: number) => Math.max(-o.fs, Math.min(o.fs, (ES * ECU * (c - o.dp)) / c));
  const a = (c: number) => Math.min(o.beta * c, o.h);
  const comp = (c: number) => o.asc * (fsC(c) - (o.displaced && a(c) > o.dp ? o.block : 0));
  const net = (c: number) => o.block * o.b * a(c) + comp(c) - o.as * fsT(c);
  let lo = 1e-6, hi = 3 * o.h;
  for (let i = 0; i < 200; i++) {
    const m = (lo + hi) / 2;
    if (net(m) > 0) hi = m;
    else lo = m;
  }
  const c = (lo + hi) / 2;
  const aa = a(c);
  const mn = (o.block * o.b * aa * (o.d - aa / 2) + comp(c) * (o.d - o.dp)) / 1e6;
  return { c, a: aa, fsT: fsT(c), fsC: o.asc ? fsC(c) : 0, mn };
}

const chk = (id: string, label: string, value: string, limit: string, ok: boolean | null, clause: string, unverified = false, level: "error" | "warn" = "error"): Check => ({
  id, label, value, limit, ok, clause, unverified, level,
});

export function checkRc(i: RcIn): RcOut {
  const aci = i.code === "aci318-19";
  const slab = i.kind === "slab";
  const b = slab ? 1000 : i.b;
  const dS = slab ? 0 : i.dS;
  const trace: TraceStep[] = [];
  const checks: Check[] = [];
  const advice: string[] = [];
  const flag = !aci;
  const C = (aciClause: string, ecpText: string) => (aci ? `ACI 318-19 ${aciClause}` : `ECP 203 — ${ecpText} ⚑`);
  const step = (label: string, expr: string, value: string, clause?: string) => trace.push({ label, expr, value, clause });

  // ---- geometry ----
  const dt = i.h - i.cover - dS - i.dT / 2;
  const n1 = slab ? 0 : i.layers === 2 ? Math.ceil(i.nT / 2) : i.nT;
  const n2 = slab ? 0 : i.nT - n1;
  const layerGap = i.dT + Math.max(25, i.dT);                 // centre to centre of two layers, clear ≥ 25 mm (ACI 25.2.2)
  const d = slab || !n2 ? dt : dt - (n2 / i.nT) * layerGap;
  const dp = i.cover + dS + i.dC / 2;
  const as = slab ? (1000 / i.sT) * barArea(i.dT) : i.nT * barArea(i.dT);
  const asc = slab ? 0 : i.nC * barArea(i.dC);
  const av = slab ? 0 : i.legs * barArea(i.dS);
  const geo = { d, dt, dp, as, asc, av };
  const empty: RcOut = {
    ready: false, geo,
    flex: { c: 0, a: 0, epsT: 0, phi: 0, mn: 0, cap: 0, asReq: null, asMin: 0, util: 0 },
    shear: { vc: 0, vs: 0, cap: 0, sMax: 0, sReq: null, util: 0 },
    hMin: null, checks, trace, advice, ok: false, flagged: flag,
  };
  if (![b, i.h, i.fc, i.fy, i.dT].every(pos) || !(d > 0) || !(as > 0) || (slab && !pos(i.sT)) || (!slab && !pos(i.nT))) return empty;

  step("العمق الفعّال d", n2 ? `${i.h} − ${i.cover} − ${dS} − ${i.dT}/2 − ${n2}/${i.nT}·(${i.dT} + ${Math.max(25, i.dT)})` : `${i.h} − ${i.cover}${slab ? "" : ` − ${dS}`} − ${i.dT}/2`, `${r(d, 1)} mm`);
  step(slab ? "حديد الشد لكل متر As" : "حديد الشد As", slab ? `1000/${i.sT} × π·${i.dT}²/4` : `${i.nT} × π·${i.dT}²/4`, `${r(as, 1)} mm²`);
  if (asc) step("حديد الضغط A′s", `${i.nC} × π·${i.dC}²/4 — d′ = ${r(dp, 1)}`, `${r(asc, 1)} mm²`);

  // ---- flexure ----
  const block = aci ? 0.85 * i.fc : (0.67 * i.fc) / 1.5;
  const beta = aci ? beta1(i.fc) : 0.8;
  const fsd = aci ? i.fy : i.fy / 1.15;
  const sol = solveSection({ b, h: i.h, d, dp, as, asc, block, beta, fs: fsd, displaced: aci });
  const epsT = (ECU * (dt - sol.c)) / sol.c;
  const mu = Math.abs(i.mu);
  if (aci) {
    step("كتلة الإجهاد", `0.85·f′c = 0.85 × ${i.fc} · β1 = ${r(beta, 3)}`, `${r(block, 2)} MPa`, "ACI 318-19 22.2.2.4.1 · Table 22.2.2.4.3");
  } else {
    step("كتلة الإجهاد", `0.67·fcu/γc = 0.67 × ${i.fc}/1.5 · a = 0.8c`, `${r(block, 2)} N/mm²`, C("", "كتلة الإجهاد المستطيلة"));
    step("إجهاد الحديد التصميمي", `fy/γs = ${i.fy}/1.15`, `${r(fsd, 1)} N/mm²`, C("", "معامل أمان الحديد γs"));
  }
  step("محور التعادل c (اتزان القوى)", asc ? `0.85f′c·b·β1c + A′s(f′s − 0.85f′c) = As·fs` : `${r(block, 2)}·${b}·${r(beta, 2)}·c = ${r(as, 1)}·${r(sol.fsT, 1)}`, `c = ${r(sol.c, 1)} mm · a = ${r(sol.a, 1)} mm`, aci ? "ACI 318-19 22.2.1 · 22.2.2" : undefined);
  step("انفعال حديد الشد εt", `0.003·(${r(dt, 1)} − ${r(sol.c, 1)})/${r(sol.c, 1)}`, r(epsT, 5), aci ? "ACI 318-19 22.2.2.1" : undefined);

  let phi = 1;
  let cap = sol.mn;
  if (aci) {
    phi = phiFlex(epsT, i.fy);
    cap = phi * sol.mn;
    step("المقاومة الاسمية Mn", `0.85f′c·b·a·(d − a/2)${asc ? " + A′s·f′s·(d − d′)" : ""}`, `${r(sol.mn, 2)} kN·m`, "ACI 318-19 22.3");
    step("معامل الخفض φ", `εt = ${r(epsT, 5)} · εty = ${r(i.fy / ES, 5)}`, r(phi, 3), "ACI 318-19 Table 21.2.2");
    step("المقاومة التصميمية φMn", `${r(phi, 3)} × ${r(sol.mn, 2)}`, `${r(cap, 2)} kN·m`, "ACI 318-19 9.5.1.1");
  } else {
    step("مقاومة القطاع القصوى Mu,cap", `C·(d − a/2)${asc ? " + A′s·f′s·(d − d′)" : ""}`, `${r(cap, 2)} kN·m`, C("", "تصميم القطاعات بطريقة حالات الحدود"));
  }
  const utilM = mu > 0 ? mu / cap : 0;
  checks.push(chk("flex", "مقاومة الانحناء", `${aci ? "φMn" : "Mu,cap"} = ${r(cap, 1)} ≥ Mu = ${r(mu, 1)} kN·m`, `${r(utilM * 100, 0)} %`, mu > 0 ? cap >= mu - 1e-9 : null, aci ? "ACI 318-19 9.5.1.1" : C("", "حالة حد المقاومة"), flag));

  // required steel (singly reinforced) — for the advice and the 4/3 rule
  let asReq: number | null = null;
  if (mu > 0) {
    if (aci) {
      const rn = (mu * 1e6) / (0.9 * b * d * d);
      const disc = 1 - (2 * rn) / (0.85 * i.fc);
      asReq = disc >= 0 ? ((0.85 * i.fc) / i.fy) * (1 - Math.sqrt(disc)) * b * d : null;
      if (asReq != null) step("الحديد المطلوب (قطاع مفرد، φ = 0.9)", `ρ = 0.85f′c/fy·(1 − √(1 − 2Rn/0.85f′c)) · Rn = ${r(rn, 3)}`, `${r(asReq, 1)} mm²`, "ACI 318-19 22.2 · 22.3");
    } else {
      const disc = d * d - (2 * mu * 1e6) / (block * b);
      asReq = disc >= 0 ? (block * b * (d - Math.sqrt(disc))) / fsd : null;
      if (asReq != null) step("الحديد المطلوب (قطاع مفرد)", `a = d − √(d² − 2Mu/(0.67fcu/γc·b)) · As = C/(fy/γs)`, `${r(asReq, 1)} mm²`, C("", "تصميم القطاعات"));
    }
  }

  // ductility
  if (aci) {
    checks.push(chk("duct", "المطيلية: انفعال حديد الشد", `εt = ${r(epsT, 4)}`, "≥ 0.004", epsT >= 0.004 - 1e-12, slab ? "ACI 318-19 7.3.3.1" : "ACI 318-19 9.3.3.1"));
  } else {
    const cb = (600 * d) / (600 + fsd);
    const cmax = (2 / 3) * cb;
    step("أقصى عمق لمحور التعادل", `c_max = 2/3 · 600d/(600 + fy/γs)`, `${r(cmax, 1)} mm`, C("", "حدود التسليح القصوى"));
    checks.push(chk("duct", "المطيلية: عمق محور التعادل", `c = ${r(sol.c, 1)} mm`, `≤ ${r(cmax, 1)} mm`, sol.c <= cmax + 1e-9, C("", "c ≤ 2/3 c_b"), true));
  }

  // minimum reinforcement
  let asMin: number;
  let minClause: string;
  if (aci) {
    if (slab) {
      const rho = i.fy < 420 ? 0.002 : Math.max((0.0018 * 420) / i.fy, 0.0014);
      asMin = rho * b * i.h;
      minClause = "ACI 318-19 7.6.1.1";
      step("الحد الأدنى للبلاطة", `${r(rho, 5)} × ${b} × ${i.h}`, `${r(asMin, 1)} mm²/m`, minClause);
    } else {
      asMin = Math.max((0.25 * Math.sqrt(i.fc)) / i.fy, 1.4 / i.fy) * b * d;
      minClause = "ACI 318-19 9.6.1.2";
      step("الحد الأدنى للكمرة", `max(0.25√f′c/fy, 1.4/fy)·b·d`, `${r(asMin, 1)} mm²`, minClause);
    }
  } else {
    const mu0 = i.fy >= 360 ? 0.0015 : 0.0025;
    if (slab) {
      asMin = Math.max((0.6 / i.fy) * b * d, mu0 * b * d);
      minClause = "ECP 203 — الحد الأدنى لحديد البلاطات ⚑";
      step("الحد الأدنى للبلاطة", `max(0.6/fy, ${mu0})·b·d`, `${r(asMin, 1)} mm²/m`, minClause);
    } else {
      const base = Math.max((0.225 * Math.sqrt(i.fc)) / i.fy, 1.1 / i.fy) * b * d;
      asMin = Math.max(asReq != null ? Math.min(base, 1.3 * asReq) : base, mu0 * b * d);
      minClause = "ECP 203 — الحد الأدنى لحديد الكمرات ⚑";
      step("الحد الأدنى للكمرة", `max(min(max(0.225√fcu/fy, 1.1/fy)·b·d, 1.3·As,req), ${mu0}·b·d)`, `${r(asMin, 1)} mm²`, minClause);
    }
  }
  const fourThirds = aci && !slab && as < asMin && asReq != null && as >= (4 / 3) * asReq;
  checks.push(chk("asmin", "الحد الأدنى للتسليح", `As = ${r(as, 0)} mm²${fourThirds ? " ≥ 4/3·As,req" : ""}`, `≥ ${r(asMin, 0)} mm²`, as >= asMin - 1e-9 || fourThirds, fourThirds ? "ACI 318-19 9.6.1.3" : minClause, flag));

  // bar spacing: clear spacing in the layer, and crack control
  const sMinClear = Math.max(25, i.dT, (4 / 3) * i.agg);
  const clear = slab ? i.sT - i.dT : n1 > 1 ? (b - 2 * i.cover - 2 * dS - n1 * i.dT) / (n1 - 1) : Infinity;
  const cc = slab ? i.sT : n1 > 1 ? (b - 2 * i.cover - 2 * dS - i.dT) / (n1 - 1) : 0;
  if (clear !== Infinity) {
    checks.push(chk("clear", slab ? "المسافة الصافية بين الأسياخ" : "الأسياخ تتسع في الطبقة", `${r(clear, 0)} mm`, `≥ ${r(sMinClear, 0)} mm`, clear >= sMinClear - 1e-9, aci ? "ACI 318-19 25.2.1" : "ACI 318-19 25.2.1 — لحين التحقق من ECP ⚑", flag));
  }
  if (aci) {
    const fs = (2 / 3) * i.fy;
    const ccov = slab ? i.cover : i.cover + dS;
    const sLim = Math.min(380 * (280 / fs) - 2.5 * ccov, 300 * (280 / fs));
    if (cc > 0) {
      step("أقصى تباعد للتحكم في التشقق", `min(380·(280/fs) − 2.5·cc, 300·(280/fs)) · fs = 2/3·fy = ${r(fs, 0)} · cc = ${r(ccov, 0)}`, `${r(sLim, 0)} mm`, "ACI 318-19 Table 24.3.2");
      checks.push(chk("crack", "تباعد الأسياخ (التشقق)", `${r(cc, 0)} mm`, `≤ ${r(sLim, 0)} mm`, cc <= sLim + 1e-9, "ACI 318-19 24.3.2", false, "warn"));
    }
    if (slab) {
      const sMaxSlab = Math.min(3 * i.h, 450);
      checks.push(chk("smax", "أقصى تباعد لحديد البلاطة", `${r(i.sT, 0)} mm`, `≤ ${r(sMaxSlab, 0)} mm`, i.sT <= sMaxSlab + 1e-9, "ACI 318-19 7.7.2.3"));
    }
  } else if (slab) {
    const sMaxSlab = Math.min(2 * i.h, 200);
    checks.push(chk("smax", "أقصى تباعد لحديد البلاطة", `${r(i.sT, 0)} mm`, `≤ ${r(sMaxSlab, 0)} mm`, i.sT <= sMaxSlab + 1e-9, "ECP 203 — تباعد حديد البلاطات ⚑", true));
  }

  // ---- shear ----
  const vu = Math.abs(i.vu);
  let vc = 0, vs = 0, vcap = 0, sMax = 0;
  let sReq: number | null = null;
  if (aci) {
    const rf = Math.min(Math.sqrt(i.fc), 8.3);                                  // 22.5.3.1
    const fyt = Math.min(i.fyt || i.fy, 420);                                   // 20.2.2.4
    const bd = b * d;
    const avMin = slab ? 0 : Math.max((0.062 * rf * b) / fyt, (0.35 * b) / fyt) * i.sS;
    const withMin = !slab && pos(i.sS) && av >= avMin - 1e-9;
    if (withMin) {
      vc = (0.17 * rf * bd) / 1000;
      step("مقاومة الخرسانة للقص Vc", `0.17·λ·√f′c·b·d (Av ≥ Av,min)`, `${r(vc, 2)} kN`, "ACI 318-19 Table 22.5.5.1(a)");
    } else {
      const lamS = Math.min(1, Math.sqrt(2 / (1 + d / 250)));
      const rhoW = as / bd;
      vc = (0.66 * lamS * Math.cbrt(rhoW) * rf * bd) / 1000;
      step("مقاومة الخرسانة للقص Vc", `0.66·λs·λ·ρw^⅓·√f′c·b·d · λs = ${r(lamS, 3)} · ρw = ${r(rhoW, 5)}`, `${r(vc, 2)} kN`, "ACI 318-19 Table 22.5.5.1(c) · 22.5.5.1.3");
    }
    vc = Math.min(vc, (0.42 * rf * bd) / 1000);                                 // 22.5.5.1.1
    if (!slab && pos(i.sS)) {
      vs = (av * fyt * d) / i.sS / 1000;
      step("مقاومة الكانات Vs", `Av·fyt·d/s = ${r(av, 1)} × ${fyt} × ${r(d, 1)} / ${i.sS}`, `${r(vs, 2)} kN`, "ACI 318-19 22.5.8.5.3");
    }
    const vsLim = (0.66 * rf * bd) / 1000;
    vcap = 0.75 * (vc + Math.min(vs, vsLim));
    step("مقاومة القص التصميمية φVn", `0.75 × (${r(vc, 2)} + ${r(Math.min(vs, vsLim), 2)})`, `${r(vcap, 2)} kN`, "ACI 318-19 Table 21.2.1(b) · 22.5.1.1");
    checks.push(chk("shear", "مقاومة القص", `φVn = ${r(vcap, 1)} ≥ Vu = ${r(vu, 1)} kN`, `${r(vu > 0 ? (vu / vcap) * 100 : 0, 0)} %`, vu > 0 ? vcap >= vu - 1e-9 : null, "ACI 318-19 9.5.1.1"));
    const secLim = 0.75 * (vc + vsLim);
    checks.push(chk("secv", "أبعاد القطاع على القص", `Vu = ${r(vu, 1)} kN`, `≤ φ(Vc + 0.66√f′c·b·d) = ${r(secLim, 1)}`, vu > 0 ? vu <= secLim + 1e-9 : null, "ACI 318-19 22.5.1.2"));
    if (!slab) {
      const need = vu > 0.75 * 0.083 * rf * bd / 1000;
      checks.push(chk("avmin", "الحد الأدنى للكانات", `Av = ${r(av, 0)} mm² @ ${i.sS}`, need ? `≥ ${r(avMin, 0)} mm²` : "غير لازم", need ? av >= avMin - 1e-9 : null, "ACI 318-19 9.6.3.1 · Table 9.6.3.4"));
      sMax = vs <= (0.33 * rf * bd) / 1000 ? Math.min(d / 2, 600) : Math.min(d / 4, 300);
      checks.push(chk("ssmax", "أقصى تباعد للكانات", `s = ${r(i.sS, 0)} mm`, `≤ ${r(sMax, 0)} mm`, pos(i.sS) ? i.sS <= sMax + 1e-9 : null, "ACI 318-19 Table 9.7.6.2.2"));
      if (vu / 0.75 > vc) {
        sReq = (av * fyt * d) / ((vu / 0.75 - vc) * 1000);
        step("تباعد الكانات المطلوب", `Av·fyt·d/(Vu/φ − Vc)`, `${r(sReq, 0)} mm`, "ACI 318-19 22.5.8.5.3");
      }
    }
  } else {
    const root = Math.sqrt(i.fc / 1.5);
    const qu = (vu * 1000) / (b * d);
    const qcu = (slab ? 0.16 : 0.24) * root;
    const qmax = Math.min(0.7 * root, 4);
    const fyd = (i.fyt || i.fy) / 1.15;
    step("إجهاد القص qu", `Qu/(b·d) = ${r(vu, 1)}×10³/(${b}×${r(d, 1)})`, `${r(qu, 3)} N/mm²`, C("", "القص"));
    step("مقاومة الخرسانة qcu", `${slab ? "0.16" : "0.24"}·√(fcu/γc)`, `${r(qcu, 3)} N/mm²`, C("", "مقاومة الخرسانة للقص"));
    step("أقصى إجهاد قص", `min(0.7·√(fcu/γc), 4.0)`, `${r(qmax, 3)} N/mm²`, C("", "الحد الأقصى لإجهاد القص"));
    vc = (qcu * b * d) / 1000;
    let qcap = qcu;
    if (!slab && pos(i.sS)) {
      const qs = (av * fyd) / (b * i.sS);
      qcap = Math.min(Math.max(qcu, 0.5 * qcu + qs), qmax);
      vs = (qs * b * d) / 1000;
      step("مقاومة الكانات", `qs = Av·(fy/γs)/(b·s) · qu,cap = max(qcu, qcu/2 + qs) ≤ qu,max`, `${r(qcap, 3)} N/mm²`, C("", "تصميم الكانات"));
      if (qu > qcu) {
        sReq = (av * fyd) / ((qu - 0.5 * qcu) * b);
        step("تباعد الكانات المطلوب", `Av·(fy/γs)/((qu − qcu/2)·b)`, `${r(sReq, 0)} mm`, C("", "تصميم الكانات"));
      }
      const avMin = (0.4 / (i.fyt || i.fy)) * b * i.sS;
      checks.push(chk("avmin", "الحد الأدنى للكانات", `Av = ${r(av, 0)} mm² @ ${i.sS}`, `≥ ${r(avMin, 0)} mm²`, av >= avMin - 1e-9, "ECP 203 — الحد الأدنى للكانات ⚑", true));
      sMax = Math.min(200, d / 2);
      checks.push(chk("ssmax", "أقصى تباعد للكانات", `s = ${r(i.sS, 0)} mm`, `≤ ${r(sMax, 0)} mm`, i.sS <= sMax + 1e-9, "ECP 203 — تباعد الكانات ⚑", true));
    }
    vcap = (qcap * b * d) / 1000;
    checks.push(chk("shear", "مقاومة القص", `Qu,cap = ${r(vcap, 1)} ≥ Qu = ${r(vu, 1)} kN`, `${r(vu > 0 ? (vu / vcap) * 100 : 0, 0)} %`, vu > 0 ? vcap >= vu - 1e-9 : null, C("", "القص"), true));
    checks.push(chk("secv", "أبعاد القطاع على القص", `qu = ${r(qu, 2)} N/mm²`, `≤ ${r(qmax, 2)} N/mm²`, vu > 0 ? qu <= qmax + 1e-9 : null, C("", "الحد الأقصى لإجهاد القص"), true));
  }
  const utilV = vu > 0 ? vu / vcap : 0;

  // ---- span / depth ----
  let hMin: number | null = null;
  if (pos(i.span)) {
    const den = DEPTH[i.code][i.kind][i.support];
    const k = aci ? 0.4 + i.fy / 700 : 1;
    hMin = ((i.span * 1000) / den) * k;
    step("أقل سُمك بدون حساب الترخيم", aci ? `ℓ/${den} × (0.4 + fy/700) = ${i.span * 1000}/${den} × ${r(k, 3)}` : `ℓ/${den} = ${i.span * 1000}/${den}`, `${r(hMin, 0)} mm`, aci ? (slab ? "ACI 318-19 Table 7.3.1.1 · 7.3.1.1.1" : "ACI 318-19 Table 9.3.1.1 · 9.3.1.1.1") : "ECP 203 — جدول البحر / العمق ⚑");
    checks.push(chk("depth", "البحر / العمق (الترخيم)", `h = ${r(i.h, 0)} mm`, `≥ ${r(hMin, 0)} mm`, i.h >= hMin - 1e-9, aci ? (slab ? "ACI 318-19 7.3.1.1" : "ACI 318-19 9.3.1.1") : "ECP 203 — جدول البحر / العمق ⚑", flag, "warn"));
  }

  // ---- what to change (a reviewer's notes, not a redesign) ----
  const by = (id: string) => checks.find((c) => c.id === id);
  if (by("flex")?.ok === false) {
    if (asReq != null) {
      const n = slab ? 0 : Math.ceil(asReq / barArea(i.dT) - 1e-9);
      const s = slab ? Math.floor(((1000 * barArea(i.dT)) / asReq) / 5) * 5 : 0;
      advice.push(slab
        ? `الانحناء: العزم أكبر من المقاومة بنسبة ${r((utilM - 1) * 100, 0)} %. الحديد المطلوب ${r(asReq, 0)} مم²/م — مثلًا Ø${i.dT} كل ${s} مم، أو زد سُمك البلاطة.`
        : `الانحناء: العزم أكبر من المقاومة بنسبة ${r((utilM - 1) * 100, 0)} %. الحديد المطلوب ${r(asReq, 0)} مم² — مثلًا ${n} Ø${i.dT}، أو زد العمق.`);
    } else {
      advice.push("الانحناء: القطاع أصغر من أن يقاوم العزم بحديد شد فقط — زد العمق أو العرض، أو أضف حديد ضغط وأعد الفحص.");
    }
  }
  if (by("duct")?.ok === false) advice.push("المطيلية: القطاع مُسلّح فوق الحد (انهيار قصيف) — زد العمق أو أضف حديد ضغط بدل زيادة حديد الشد.");
  if (by("asmin")?.ok === false) advice.push(`الحد الأدنى: زد حديد الشد إلى ${r(asMin, 0)} مم² على الأقل.`);
  if (by("clear")?.ok === false) advice.push(slab ? "التباعد: الأسياخ متقاربة جدًا — استخدم قطرًا أكبر بتباعد أوسع." : `التباعد: ${n1} أسياخ Ø${i.dT} لا تتسع في عرض ${b} مم — استخدم طبقتين أو قطرًا أكبر بعدد أقل.`);
  if (by("crack")?.ok === false) advice.push("التشقق: التباعد أكبر من حد التحكم في عرض الشروخ — استخدم أسياخًا أصغر بعدد أكبر.");
  if (by("smax")?.ok === false) advice.push("التباعد: قلّل تباعد حديد البلاطة إلى الحد المسموح.");
  if (by("secv")?.ok === false) advice.push("القص: أبعاد القطاع لا تكفي — لا تحلها الكانات؛ زد العرض أو العمق.");
  else if (by("shear")?.ok === false) {
    advice.push(slab
      ? "القص: البلاطة لا تقاوم القص بالخرسانة وحدها — زد السُمك (أو الحديد الطولي) وأعد الفحص."
      : `القص: قلّل تباعد الكانات${sReq != null ? ` إلى ${Math.max(50, Math.floor(sReq / 25) * 25)} مم` : ""} أو زد عدد الأفرع / القطر.`);
  }
  if (by("avmin")?.ok === false || by("ssmax")?.ok === false) advice.push(`الكانات: التزم بالحد الأدنى للمساحة وأقصى تباعد ${r(sMax, 0)} مم.`);
  if (by("depth")?.ok === false) advice.push("الترخيم: السُمك أقل من حد الجدول — يلزم حساب الترخيم صراحةً أو زيادة السُمك.");

  const ok = checks.every((c) => c.ok !== false || c.level === "warn");
  return {
    ready: true, geo,
    flex: { c: sol.c, a: sol.a, epsT, phi, mn: sol.mn, cap, asReq, asMin, util: utilM },
    shear: { vc, vs, cap: vcap, sMax, sReq, util: utilV },
    hMin, checks, trace, advice, ok, flagged: flag,
  };
}
