// =====================================================================
//  Site and technical-office calculations — pure functions (tests/site-calc.test.ts)
//  Quantities for take-off checks and ordering on site. Every default (mix, waste, unit size) is a common Egyptian practice
//  value the member can change on screen; the screens say these are estimates to check against the drawings and specs.
// =====================================================================

// ---- rebar: weight per metre = π·d²/4 × 7850 kg/m³ (d in mm) ≈ d² / 162.2 ----
export const STEEL_DENSITY = 7850;
export const rebarKgPerM = (d: number) => (Math.PI * d * d / 4) * 1e-6 * STEEL_DENSITY;
export const REBAR_SIZES = [8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 32];

// bars of one diameter: count × length → weight, and how many 12 m stock bars to order (cutting waste included)
export function rebarOrder(d: number, count: number, length: number, stock = 12, wastePct = 5) {
  const total = Math.max(0, count) * Math.max(0, length);
  const kg = total * rebarKgPerM(d) * (1 + wastePct / 100);
  // pieces cut from one stock bar (no splicing); pieces longer than the stock need laps — counted as a whole number of bars each
  const perBar = length > 0 && length <= stock ? Math.floor(stock / length) : 0;
  const bars = perBar ? Math.ceil(count / perBar) : Math.ceil((total * (1 + wastePct / 100)) / stock);
  return { totalLength: total, kg, tons: kg / 1000, bars, perBar };
}

// ---- concrete: volume of common elements (metres), with waste, and the materials for that volume ----
export type Element = { kind: "slab" | "beam" | "column" | "round" | "footing" | "wall"; count?: number; a?: number; b?: number; c?: number };
export function elementVolume(e: Element) {
  const n = Math.max(1, Number(e.count) || 1), a = Number(e.a) || 0, b = Number(e.b) || 0, c = Number(e.c) || 0;
  // slab: L × W × t · beam: L × b × h · column: b × h × H · round column: Ø × H (b unused) · footing: L × W × t · wall: L × t × H
  return n * (e.kind === "round" ? Math.PI * (a / 2) ** 2 * c : a * b * c);
}
// per m³ of reinforced concrete: cement (kg), sand and coarse aggregate (m³) — the usual Egyptian site mix, editable
export const MIX = { cement: 350, sand: 0.4, gravel: 0.8 };
export function concreteMaterials(volume: number, wastePct = 5, mix = MIX) {
  const v = Math.max(0, volume) * (1 + wastePct / 100);
  const cement = v * mix.cement;
  return { volume: v, cementKg: cement, cementBags: Math.ceil(cement / 50), sand: v * mix.sand, gravel: v * mix.gravel };
}

// ---- masonry: units and mortar for a wall (unit sizes in cm, wall in m) ----
export const UNITS: Record<string, { name: string; l: number; h: number; w: number }> = {
  red: { name: "طوب أحمر 25×12×6", l: 25, h: 6, w: 12 },
  cement: { name: "طوب أسمنتي مصمت 25×12×6", l: 25, h: 6, w: 12 },
  block20: { name: "بلوك أسمنتي 40×20×20", l: 40, h: 20, w: 20 },
  block15: { name: "بلوك أسمنتي 40×20×15", l: 40, h: 20, w: 15 },
  block10: { name: "بلوك أسمنتي 40×20×10", l: 40, h: 20, w: 10 },
};
// leaves: 1 = the unit's width (e.g. «نص طوبة» 12 cm), 2 = its length laid across («طوبة» 25 cm)
export function masonry(o: { length: number; height: number; openings?: number; unit?: string; leaves?: number; joint?: number; wastePct?: number }) {
  const u = UNITS[o.unit || "red"] || UNITS.red; const j = (o.joint ?? 1) / 100; const leaves = o.leaves === 2 ? 2 : 1;
  const area = Math.max(0, (Number(o.length) || 0) * (Number(o.height) || 0) - (Number(o.openings) || 0));
  const thick = leaves === 2 ? u.l / 100 : u.w / 100;
  // units per m² of wall face, per leaf of the unit's width
  const face = 1 / ((u.l / 100 + j) * (u.h / 100 + j));
  const perM2 = face * (leaves === 2 ? (u.l / 100 + j) / (u.w / 100 + j) : 1);
  const units = Math.ceil(area * perM2 * (1 + (o.wastePct ?? 5) / 100));
  const mortar = Math.max(0, area * thick - (area * perM2) * (u.l * u.h * u.w) / 1e6);
  return { area, thickness: thick, perM2, units, mortar };
}

// ---- units: engineering and Egyptian land measures ----
export const CONVERT: Record<string, { label: string; units: [string, string, number][] }> = {
  length: { label: "الطول", units: [["m", "متر", 1], ["cm", "سم", 0.01], ["mm", "مم", 0.001], ["ft", "قدم", 0.3048], ["in", "بوصة", 0.0254]] },
  area: { label: "المساحة", units: [["m2", "م²", 1], ["feddan", "فدان", 4200.833], ["qirat", "قيراط", 175.035], ["sahm", "سهم", 7.293], ["ft2", "قدم²", 0.09290304]] },
  volume: { label: "الحجم", units: [["m3", "م³", 1], ["l", "لتر", 0.001], ["ft3", "قدم³", 0.0283168]] },
  force: { label: "القوة", units: [["kN", "كيلونيوتن", 1], ["t", "طن قوة", 9.80665], ["kgf", "كجم قوة", 0.00980665]] },
  stress: { label: "الإجهاد والضغط", units: [["MPa", "ميجاباسكال (ن/مم²)", 1], ["kgcm2", "كجم/سم²", 0.0980665], ["kNm2", "كيلونيوتن/م²", 0.001], ["tm2", "طن/م²", 0.00980665], ["psi", "رطل/بوصة²", 0.00689476]] },
};
export const convert = (kind: string, value: number, from: string, to: string) => {
  const u = CONVERT[kind].units; const f = u.find((x) => x[0] === from), t = u.find((x) => x[0] === to);
  return f && t ? (value * f[2]) / t[2] : NaN;
};
