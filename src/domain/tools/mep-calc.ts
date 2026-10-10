// =====================================================================
//  MEP quick checks — AC installation, drain runs, sprinkler spacing, cables (pure, versioned).
//  docs/TOOLS-BLUEPRINT.md §3.8–§3.11
//  · AC: line sizes are never defaulted (they come from the unit's manual); IMC 307.2.2 drain sizes; extra charge.
//  · Drains: inverts, depths, cover, sight rails, grade stakes; minimum slope by profile (IPC strict or metric ⚑).
//  · Sprinklers: NFPA 13-2022 standard-spray limits; site area per head = max(sx, 2·wallX) × max(sy, 2·wallY).
//  · Cables: IEC 60364-5-52 (2009). Ib, derating (B.52.14 air / B.52.15 ground by method, B.52.16 soil, B.52.17 grouping),
//    selection, coordination (gG: In ≤ 1.45/1.6·Iz), voltage drop, L_max, adiabatic (0.1–5 s only). The ampacity rows are a
//    transcription marked unverified ⚑: a pass on them prints «ضمن الحد ⚑», never «مطابق».
// =====================================================================
import type { Check } from "./common";

export const AC_ENGINE = "acInstall@1.0.0";
export const DRN_ENGINE = "drainRun@1.0.0";
export const SPK_ENGINE = "sprinklerCheck@1.0.0";
export const CAB_ENGINE = "cab@1.0.0";

// ---------------------------------------------------------------------
//  AC installation
// ---------------------------------------------------------------------
export const TR_KW = 3.516853;

export function acxDrainSize(tr: number) {
  return tr <= 20 ? "3/4″" : tr <= 40 ? "1″" : tr <= 90 ? "1¼″" : tr <= 125 ? "1½″" : tr <= 250 ? "2″" : "> 2″";
}

export function acxCondensate(i: { airLs?: number | null; dW?: number | null; tr: number; runM: number; slopePct: number }) {
  const lph = i.airLs && i.dW ? 1.2 * (i.airLs / 1000) * i.dW * 3600 : null;
  const perTr = lph != null && i.tr > 0 ? lph / i.tr : null;
  return {
    lph, minDrainIn: acxDrainSize(i.tr), fallMm: (i.slopePct / 100) * i.runM * 1000, slopeOk: i.slopePct >= 1 - 1e-9,
    sanity: perTr == null ? undefined : perTr < 3 ? ("low" as const) : perTr > 7.6 ? ("high" as const) : undefined,
  };
}

export function acxLineSet(i: { lenM: number; liftM: number; maxLenM: number; maxLiftM: number; preM: number; gPerM: number; liquidIn: string; gasIn: string; manualLiquidIn: string; manualGasIn: string }) {
  const norm = (s: string) => s.replace(/\s|["″]/g, "");
  return {
    extraG: i.gPerM * Math.max(0, i.lenM - i.preM), lenOk: i.lenM <= i.maxLenM + 1e-9, liftOk: i.liftM <= i.maxLiftM + 1e-9,
    sizesOk: !!i.manualLiquidIn && !!i.manualGasIn && norm(i.liquidIn) === norm(i.manualLiquidIn) && norm(i.gasIn) === norm(i.manualGasIn),
  };
}

export const acxHpLabel = (btuh: number) => `${(btuh / 9000).toFixed(btuh % 9000 ? 2 : 0)} HP`;

// ---------------------------------------------------------------------
//  Drain runs (integer mm levels)
// ---------------------------------------------------------------------
export type DrainProfile = "metric" | "ipc";

export function drnMinSlope(dnMm: number, p: DrainProfile) {
  if (p === "ipc") return dnMm <= 65 ? 2.083 : dnMm <= 150 ? 1.042 : 0.521;
  return dnMm <= 150 ? 1.0 : 0.5;
}

export function drnRun(i: { startIlMm: number; reaches: { lenM: number; dnMm: number; odMm?: number; slopePct?: number | null; dropMm?: number; glMm?: number | null }[]; minCoverMm: number; profile: DrainProfile; outfallIlMm?: number | null }) {
  let il = i.startIlMm, chain = 0;
  const nodes = i.reaches.map((r) => {
    const sMin = drnMinSlope(r.dnMm, i.profile);
    const s = r.slopePct != null && r.slopePct > 0 ? r.slopePct : sMin;
    const ilIn = Math.round(il - (s / 100) * r.lenM * 1000);
    const ilOut = ilIn - (r.dropMm || 0);
    chain += r.lenM;
    const crown = ilIn + (r.odMm ?? r.dnMm);
    const depth = r.glMm != null ? r.glMm - ilIn : undefined;
    const cover = r.glMm != null ? r.glMm - crown : undefined;
    const checks: Check[] = [];
    checks.push({ id: "drn.slope", label: "الميل", value: `${s.toFixed(3)} %`, limit: `≥ ${sMin} %`, ok: s >= sMin - 1e-9, unverified: i.profile === "metric" });
    if (cover != null) checks.push({ id: "drn.cover", label: "الغطاء", value: `${(cover / 1000).toFixed(3)} m`, limit: `≥ ${(i.minCoverMm / 1000).toFixed(2)} m`, ok: cover >= i.minCoverMm });
    if (r.dnMm >= 200 && r.lenM > 122) checks.push({ id: "drn.spacing", label: "المسافة بين غرف التفتيش", value: `${r.lenM} m`, limit: "≤ 122 m", ok: false, level: "warn" });
    il = ilOut;
    return { chainM: chain, slopePct: s, ilInMm: ilIn, ilOutMm: ilOut, depthMm: depth, crownMm: crown, coverMm: cover, mhSize: depth == null ? "—" : depth < 1000 ? "60×60" : depth < 2000 ? "80×80" : "100×100", checks };
  });
  const outfallOk = i.outfallIlMm == null || !nodes.length || nodes[nodes.length - 1].ilOutMm >= i.outfallIlMm;
  return { nodes, ok: outfallOk && nodes.every((n) => n.checks.every((c) => c.ok !== false)), outfallOk };
}

export const drnSightRail = (ilMm: number, travellerMm: number, pegRlMm?: number | null) => {
  const rail = ilMm + travellerMm;
  return { railMm: rail, markAbovePegMm: pegRlMm != null ? rail - pegRlMm : undefined };
};

export const drnGradeStake = (stakeMm: number, designMm: number) => {
  const mm = stakeMm - designMm;
  return { mm, label: mm === 0 ? "0.000" : `${mm > 0 ? "C" : "F"} ${(Math.abs(mm) / 1000).toFixed(3)}` };
};

// ---------------------------------------------------------------------
//  Sprinklers (NFPA 13-2022, standard spray)
// ---------------------------------------------------------------------
export type SpkHazard = "LH" | "OH1" | "OH2" | "EH1" | "EH2";
export type SpkSystem = "hydraulic" | "pipeSchedule";
export type SpkCeiling = "nc-unobstructed" | "nc-obstructed" | "comb-unobstructed" | "comb-obstructed";

export function spkLimits(h: SpkHazard, system: SpkSystem = "hydraulic", ceiling: SpkCeiling = "nc-unobstructed", memberSpacingM?: number) {
  if (h === "LH") {
    if (ceiling === "comb-obstructed") return { areaM2: memberSpacingM != null && memberSpacingM < 0.9 ? 12.1 : 15.6, sM: 4.6, row: "LH combustible obstructed" };
    return system === "pipeSchedule" ? { areaM2: 18.6, sM: 4.6, row: "LH pipe schedule" } : { areaM2: 20.9, sM: 4.6, row: "LH hydraulic" };
  }
  if (h === "OH1" || h === "OH2") return { areaM2: 12.1, sM: 4.6, row: "OH" };
  return system === "pipeSchedule" ? { areaM2: 8.4, sM: 3.7, row: "EH pipe schedule" } : { areaM2: 9.3, sM: 3.7, row: "EH hydraulic" };
}

export function spkLayout(lM: number, wM: number, lim: { areaM2: number; sM: number }) {
  let best: { nx: number; ny: number; n: number; sx: number; sy: number } | null = null;
  for (const [a, b, swap] of [[lM, wM, false], [wM, lM, true]] as [number, number, boolean][]) {
    for (let nx = Math.max(1, Math.ceil(a / lim.sM - 1e-9)); nx <= Math.max(1, Math.floor(a / 1.8)); nx++) {
      const sx = a / nx;
      const syMax = Math.min(lim.sM, lim.areaM2 / sx);
      const ny = Math.max(1, Math.ceil(b / syMax - 1e-9));
      const sy = b / ny;
      if (sy < 1.8 && ny > 1) continue;
      const cand = swap ? { nx: ny, ny: nx, n: nx * ny, sx: sy, sy: sx } : { nx, ny, n: nx * ny, sx, sy };
      if (!best || cand.n < best.n || (cand.n === best.n && Math.abs(cand.sx - cand.sy) < Math.abs(best.sx - best.sy) - 1e-9)) best = cand;
    }
  }
  const r = best || { nx: 1, ny: 1, n: 1, sx: lM, sy: wM };
  return { ...r, areaM2: r.sx * r.sy, wallX: r.sx / 2, wallY: r.sy / 2 };
}

export function spkSiteCheck(m: { sxM: number; syM: number; wallXM: number; wallYM: number; headMinM: number }, lim: { areaM2: number; sM: number }) {
  const area = Math.max(m.sxM, 2 * m.wallXM) * Math.max(m.syM, 2 * m.wallYM);
  const checks: Check[] = [
    { id: "spk.area", label: "المساحة لكل رشاش", value: `${area.toFixed(2)} m²`, limit: `≤ ${lim.areaM2} m²`, ok: area <= lim.areaM2 + 1e-9, clause: "NFPA 13 §10.2.4" },
    { id: "spk.spacing", label: "المسافة بين الرشاشات", value: `${Math.max(m.sxM, m.syM).toFixed(2)} m`, limit: `≤ ${lim.sM} m`, ok: Math.max(m.sxM, m.syM) <= lim.sM + 1e-9, clause: "NFPA 13 §10.2.4.2" },
    { id: "spk.wall", label: "البعد عن الحائط", value: `${Math.max(m.wallXM, m.wallYM).toFixed(2)} m`, limit: `≤ ${(lim.sM / 2).toFixed(2)} m و ≥ 0.1 m`, ok: Math.max(m.wallXM, m.wallYM) <= lim.sM / 2 + 1e-9 && Math.min(m.wallXM, m.wallYM) >= 0.1, clause: "NFPA 13 §10.2.4.3" },
    { id: "spk.headMin", label: "أقل مسافة بين رشاشين", value: `${m.headMinM.toFixed(2)} m`, limit: "≥ 1.8 m", ok: m.headMinM >= 1.8 - 1e-9, clause: "NFPA 13 §10.2.5.4" },
  ];
  return { areaM2: area, checks, ok: checks.every((c) => c.ok) };
}

// ---------------------------------------------------------------------
//  Cables (IEC 60364-5-52)
// ---------------------------------------------------------------------
export type CabMethod = "C" | "E" | "D1";
export const CAB_SIZES = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300];
// copper, three loaded conductors (a two-loaded single-phase circuit uses these too: conservative)
const AMP: Record<"pvc" | "xlpe", Record<CabMethod, number[]>> = {
  pvc: {
    C: [17.5, 24, 32, 41, 57, 76, 96, 119, 144, 184, 223, 259, 299, 341, 403, 464],
    E: [18.5, 25, 34, 43, 60, 80, 101, 126, 153, 196, 238, 276, 319, 364, 430, 497],
    D1: [18, 24, 30, 38, 50, 64, 82, 98, 116, 143, 169, 192, 217, 243, 280, 316],
  },
  xlpe: {
    C: [22, 30, 40, 51, 70, 94, 119, 148, 180, 232, 282, 328, 379, 434, 514, 593],
    E: [23, 32, 42, 54, 75, 100, 127, 158, 192, 246, 298, 346, 399, 456, 538, 621],
    D1: [21, 28, 36, 44, 58, 75, 96, 115, 135, 167, 197, 223, 251, 281, 324, 365],
  },
};
export const CAB_DATASET = { id: "iec60364-5-52-2009@1", verified: false };
export const cabAmpacity = (insul: "pvc" | "xlpe", method: CabMethod) => CAB_SIZES.map((s, i) => ({ s, it: AMP[insul][method][i] }));

const AIR: Record<"pvc" | "xlpe", Record<number, number>> = {
  pvc: { 25: 1.03, 30: 1.0, 35: 0.94, 40: 0.87, 45: 0.79, 50: 0.71 },
  xlpe: { 25: 1.02, 30: 1.0, 35: 0.96, 40: 0.91, 45: 0.87, 50: 0.82 },
};
const GROUND: Record<"pvc" | "xlpe", Record<number, number>> = {
  pvc: { 20: 1.0, 25: 0.95, 30: 0.89, 35: 0.84, 40: 0.77 },
  xlpe: { 20: 1.0, 25: 0.96, 30: 0.93, 35: 0.89, 40: 0.85 },
};
const SOIL: Record<string, number> = { "1": 1.18, "1.5": 1.1, "2": 1.05, "2.5": 1.0, "3": 0.96 };
export type CabArr = "bunched" | "trayPerforated" | "ground";
const GROUP: Record<CabArr, number[]> = {
  bunched: [1, 0.8, 0.7, 0.65, 0.6, 0.57, 0.54, 0.52, 0.5],
  trayPerforated: [1, 0.88, 0.82, 0.77, 0.75, 0.73, 0.73, 0.72, 0.72],
  ground: [1, 0.75, 0.65, 0.6, 0.55, 0.5, 0.5, 0.45, 0.45],
};

// nearest tabulated step at or above the temperature (conservative)
const stepUp = (t: Record<number, number>, x: number) => {
  const keys = Object.keys(t).map(Number).sort((a, b) => a - b);
  const k = keys.find((v) => v >= x - 1e-9) ?? keys[keys.length - 1];
  return t[k];
};

export function cabIb(i: { phases: 1 | 3; kw: number; cosphi: number; uV: number; eta?: number }) {
  const p = i.kw * 1000;
  const eta = i.eta || 1;
  return i.phases === 3 ? p / (Math.sqrt(3) * i.uV * i.cosphi * eta) : p / (i.uV * i.cosphi * eta);
}

export function cabDerate(i: { insul: "pvc" | "xlpe"; method: CabMethod; airC: number; groundC: number; groupN: number; groupArr: CabArr; soilRho?: number }) {
  const buried = i.method === "D1";
  const kTemp = buried ? stepUp(GROUND[i.insul], i.groundC) : stepUp(AIR[i.insul], i.airC);
  const kSoil = buried ? SOIL[String(i.soilRho ?? 2.5)] ?? 1 : 1;
  const g = GROUP[buried ? "ground" : i.groupArr];
  const kGroup = g[Math.min(g.length, Math.max(1, i.groupN)) - 1];
  return { kTemp, kGroup, kSoil, k: kTemp * kGroup * kSoil, tempTable: buried ? ("B.52.15" as const) : ("B.52.14" as const) };
}

export const cabCoord = (device: "breaker" | "gG", inA: number, izA: number) => {
  const limit = device === "gG" ? (1.45 / 1.6) * izA : izA;
  return { ok: inA <= limit + 1e-9, limitA: limit };
};

export function cabSelect(inA: number, k: number, table: { s: number; it: number }[]) {
  const need = inA / k;
  const row = table.find((r) => r.it >= need - 1e-9);
  return row ? { s: row.s, it: row.it, iz: row.it * k, itRequired: need } : { parallel: true as const, itRequired: need };
}

const RHO = { cu: 0.0225, al: 0.036 };
const LAMBDA = 0.00008;

export function cabVd(i: { phases: 1 | 3; sMm2: number; lenM: number; ibA: number; cosphi: number; mat: "cu" | "al"; u0V: number; uV?: number }) {
  const b = i.phases === 3 ? 1 : 2;
  const sin = Math.sqrt(1 - i.cosphi * i.cosphi);
  const u = b * ((RHO[i.mat] * i.lenM) / i.sMm2 * i.cosphi + LAMBDA * i.lenM * sin) * i.ibA;
  if (i.phases === 3) {
    const line = Math.sqrt(3) * u;
    return { uV: u, pct: (line / (i.uV || Math.sqrt(3) * i.u0V)) * 100, lineV: line };
  }
  return { uV: u, pct: (u / i.u0V) * 100 };
}

export function cabLmax(i: { phases: 1 | 3; sMm2: number; ibA: number; cosphi: number; mat: "cu" | "al"; u0V: number; limitPct: number }) {
  const b = i.phases === 3 ? 1 : 2;
  const sin = Math.sqrt(1 - i.cosphi * i.cosphi);
  return ((i.limitPct * i.u0V) / 100) / (b * i.ibA * ((RHO[i.mat] * i.cosphi) / i.sMm2 + LAMBDA * sin));
}

export const CAB_K: Record<string, number> = { "cu-pvc": 115, "cu-xlpe": 143, "al-pvc": 76, "al-xlpe": 94 };

export function cabAdiabatic(iscA: number, tS: number, k: number) {
  if (tS < 0.1) return { refused: "tBelow0.1s" as const };
  if (tS > 5) return { refused: "tAbove5s" as const };
  return { sMinMm2: (iscA * Math.sqrt(tS)) / k };
}
