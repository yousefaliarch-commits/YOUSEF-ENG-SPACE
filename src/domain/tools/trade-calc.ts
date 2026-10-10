// =====================================================================
//  Trade quick kit — engine (pure, versioned). docs/TOOLS-BLUEPRINT.md §3.1
//  · Answers the foreman's daily questions in purchase units (bags, buckets, units, tiles, boxes, litres, sheets, bars, m).
//  · Masonry mortar uses the Egyptian kg-of-cement-per-m³-of-sand convention, never mixed with volume ratios.
//  · No prices anywhere (the token test in tests/tools-no-money.test.ts holds every field list to that).
// =====================================================================
import { kgPerM } from "./bbs-calc";

export const TRADE_ENGINE = "trade@1.0.0";

export const CALIB_DEFAULT = { bucketL: 20, barrowL: 60, bagKg: 50 };

// ---- bag batch ----
export function tradeBagBatch(m: { bagKg: number; cementKgM3: number; sandM3: number; gravelM3: number; wc: number }, bucketL: number) {
  const y = m.cementKgM3 > 0 ? m.bagKg / m.cementKgM3 : 0;
  const warn: string[] = [];
  if (m.wc > 0.55) warn.push("نسبة الماء للأسمنت أعلى من 0.55 ⚑");
  return { yieldM3: y, sandBuckets: (m.sandM3 * y * 1000) / bucketL, gravelBuckets: (m.gravelM3 * y * 1000) / bucketL, waterL: m.wc * m.bagKg, warn };
}

// ---- masonry ----
export type TradeUnit = { l: number; w: number; h: number; kind: "solid" | "hollow" | "aac" }; // cm
export const UNIT_PRESETS: { id: string; name: string; u: TradeUnit; waste: number }[] = [
  { id: "red", name: "طوب أحمر 25×12×6", u: { l: 25, w: 12, h: 6, kind: "solid" }, waste: 5 },
  { id: "tafla", name: "طفلي 24×11×6", u: { l: 24, w: 11, h: 6, kind: "solid" }, waste: 5 },
  { id: "taflaD", name: "طفلي دبل 24×11×12", u: { l: 24, w: 11, h: 12, kind: "solid" }, waste: 5 },
  { id: "cement", name: "طوب أسمنتي 25×12×6", u: { l: 25, w: 12, h: 6, kind: "solid" }, waste: 3 },
  { id: "b10", name: "بلوك 40×20×10", u: { l: 40, w: 10, h: 20, kind: "hollow" }, waste: 4 },
  { id: "b15", name: "بلوك 40×20×15", u: { l: 40, w: 15, h: 20, kind: "hollow" }, waste: 4 },
  { id: "b20", name: "بلوك 40×20×20", u: { l: 40, w: 20, h: 20, kind: "hollow" }, waste: 4 },
  { id: "aac10", name: "خفاف AAC 60×20×10", u: { l: 60, w: 10, h: 20, kind: "aac" }, waste: 3 },
  { id: "aac20", name: "خفاف AAC 60×20×20", u: { l: 60, w: 20, h: 20, kind: "aac" }, waste: 3 },
];

const HOLLOW_MORTAR_L_M2: Record<number, number> = { 10: 7, 15: 10, 20: 14 };

export function tradeMasonry(i: {
  unit: TradeUnit; areaM2: number; leaves: 0.5 | 1 | 1.5 | 2; jointCm: number; unitWastePct: number; mortarKgM3: number; mortarWastePct: number; thinBed?: boolean; bagKg?: number;
}) {
  const L = i.unit.l / 100, W = i.unit.w / 100, H = i.unit.h / 100, j = (i.thinBed ? 0.3 : i.jointCm) / 100;
  const blockLike = i.unit.kind !== "solid";
  let n: number, tWall: number;
  if (blockLike || i.leaves === 0.5) {
    n = 1 / ((L + j) * (H + j));
    tWall = W;
  } else if (i.leaves === 1) {
    n = 1 / ((W + j) * (H + j));
    tWall = 0.25;
  } else if (i.leaves === 1.5) {
    n = 1 / ((L + j) * (H + j)) + 1 / ((W + j) * (H + j));
    tWall = 0.38;
  } else {
    n = 2 / ((W + j) * (H + j));
    tWall = 0.51;
  }
  const units = Math.ceil(i.areaM2 * n * (1 + i.unitWastePct / 100) - 1e-9);
  let vm = 0, adhesiveKg: number | undefined;
  if (i.unit.kind === "aac" && i.thinBed) {
    const t = i.unit.w;
    const perM2 = t <= 10 ? 2.2 : t >= 20 ? 4.5 : 2.2 + ((t - 10) / 10) * 2.3;
    adhesiveKg = i.areaM2 * perM2;
  } else if (i.unit.kind === "hollow") {
    vm = (HOLLOW_MORTAR_L_M2[i.unit.w] ?? 10) / 1000;
  } else {
    vm = Math.max(0, tWall - n * L * W * H);
  }
  const wet = vm * i.areaM2;
  const sand = wet * (1 + i.mortarWastePct / 100);
  const cement = sand * i.mortarKgM3;
  return { unitsPerM2: n, wallThickM: tWall, units, mortarPerM2: vm, mortarWetM3: wet, sandM3: sand, cementKg: cement, cementBags: Math.ceil(cement / (i.bagKg || 50) - 1e-9), adhesiveKg };
}

// ---- plaster ----
export const PLASTER_PRESETS: Record<string, { name: string; layers: { tMm: number; cementKgM3: number }[] }> = {
  internal: { name: "داخلي (طرطشة + بطانة)", layers: [{ tMm: 4, cementKgM3: 450 }, { tMm: 20, cementKgM3: 300 }] },
  external: { name: "خارجي", layers: [{ tMm: 4, cementKgM3: 450 }, { tMm: 25, cementKgM3: 300 }] },
  underTile: { name: "تحت البلاط", layers: [{ tMm: 4, cementKgM3: 450 }, { tMm: 20, cementKgM3: 300 }] },
};

export function tradePlaster(i: { areaM2: number; layers: { tMm: number; cementKgM3: number }[]; wastePct: number; bagKg?: number }) {
  const k = 1 + i.wastePct / 100;
  const cement = i.layers.reduce((a, l) => a + i.areaM2 * (l.tMm / 1000) * k * l.cementKgM3, 0);
  const sand = i.areaM2 * (i.layers.reduce((a, l) => a + l.tMm, 0) / 1000) * k;
  return { cementKg: cement, cementBags: Math.ceil(cement / (i.bagKg || 50) - 1e-9), sandM3: sand };
}

// ---- tiles ----
export function tradeTiles(i: { areaM2: number; aMm: number; bMm: number; jointMm: number; wastePct: number; boxM2?: number; depthMm?: number; groutDensity?: number; groutWastePct?: number }) {
  const k = 1 + i.wastePct / 100;
  const pitch = ((i.aMm + i.jointMm) / 1000) * ((i.bMm + i.jointMm) / 1000);
  const exact = pitch > 0 ? (i.areaM2 * k) / pitch : 0;
  const boxesExact = i.boxM2 ? (i.areaM2 * k) / i.boxM2 : undefined;
  const groutKgM2 = i.depthMm ? ((i.aMm + i.bMm) / (i.aMm * i.bMm)) * i.jointMm * i.depthMm * (i.groutDensity ?? 1.6) : undefined;
  return {
    tilesExact: exact, tiles: Math.ceil(exact - 1e-9), boxesExact, boxes: boxesExact != null ? Math.ceil(boxesExact - 1e-9) : undefined,
    groutKgM2, groutKg: groutKgM2 != null ? groutKgM2 * i.areaM2 * (1 + (i.groutWastePct ?? 10) / 100) : undefined,
  };
}

// ---- paint ----
export function tradeRoomArea(i: { l: number; w: number; h: number; openingsM2: number; ceiling: boolean }) {
  const walls = 2 * (i.l + i.w) * i.h - i.openingsM2;
  return { wallsM2: walls, areaM2: walls + (i.ceiling ? i.l * i.w : 0) };
}
export function tradePaint(i: { areaM2: number; coats: number; spreadM2L: number; practical: number; wastePct: number; packL: number }) {
  const litres = i.spreadM2L > 0 && i.practical > 0 ? ((i.areaM2 * i.coats) / (i.spreadM2L * i.practical)) * (1 + i.wastePct / 100) : 0;
  return { litres, packs: i.packL > 0 ? Math.ceil(litres / i.packL - 1e-9) : 0 };
}

// ---- formwork ----
export function tradeFormworkContact(e: { kind: "column" | "beam" | "slab" | "wall"; a: number; b: number; h: number; n: number }) {
  const one = e.kind === "column" ? 2 * (e.a + e.b) * e.h : e.kind === "beam" ? (e.b + 2 * e.h) * e.a : e.kind === "slab" ? e.a * e.b : 2 * e.a * e.h;
  return one * e.n;
}
export function tradeFormwork(i: { contactM2: number; wastePct: number; sheetM2?: number }) {
  const exact = (i.contactM2 * (1 + i.wastePct / 100)) / (i.sheetM2 ?? 1.22 * 2.44);
  return { exact, sheets: Math.ceil(exact - 1e-9) };
}

// ---- bar spacing ----
export function tradeBarSpacing(i: { clearM: number; coverMm: number; spacingMm: number; d: number; otherLenM: number }) {
  const bars = i.spacingMm > 0 ? Math.ceil((i.clearM - (2 * i.coverMm) / 1000) / (i.spacingMm / 1000) - 1e-9) + 1 : 0;
  const totalM = bars * i.otherLenM;
  return { bars, asMm2PerM: (1000 / i.spacingMm) * (Math.PI * i.d * i.d) / 4, totalM, kg: totalM * kgPerM(i.d), tight: i.spacingMm < 2 * i.d + 20 };
}

// ---- falls ----
export function tradeFalls(i: { slopePct: number; runM: number; minMm: number; areaM2?: number }) {
  const drop = (i.slopePct / 100) * i.runM * 1000;
  const avg = i.minMm + drop / 2;
  return { dropMm: drop, maxMm: i.minMm + drop, avgMm: avg, volumeM3: i.areaM2 ? i.areaM2 * (avg / 1000) : undefined };
}

// ---- trades beyond civil ----
export function tradeElectric(i: { rooms: number; pointsPerRoom: number; runsM: number; extraPct?: number }) {
  return { boxes: i.rooms * i.pointsPerRoom, wireM: i.runsM * (1 + (i.extraPct ?? 10) / 100) };
}
export function tradePlumbing(i: { runsM: number[]; lengthM?: number; perFittingM?: number }) {
  const total = i.runsM.reduce((a, x) => a + x, 0);
  return { totalM: total, lengths: Math.ceil(total / (i.lengthM ?? 4) - 1e-9), fittings: Math.ceil(total / (i.perFittingM ?? 1.5) - 1e-9) };
}
export function tradeDrywall(i: { lengthM: number; heightM: number; sides: 1 | 2; layers: number; wastePct: number; studAtM?: number }) {
  const area = i.lengthM * i.heightM;
  const exact = (area * i.sides * i.layers * (1 + i.wastePct / 100)) / 2.88;
  return {
    boardsExact: exact, boards: Math.ceil(exact - 1e-9), studs: Math.floor(i.lengthM / (i.studAtM ?? 0.6) + 1e-9) + 1, trackM: 2 * i.lengthM,
    screws: Math.ceil(area * i.sides * i.layers * 30),
  };
}
export const STEEL_SECTIONS: Record<string, number> = {
  "IPE 100": 8.1, "IPE 120": 10.4, "IPE 140": 12.9, "IPE 160": 15.8, "IPE 180": 18.8, "IPE 200": 22.4, "IPE 220": 26.2, "IPE 240": 30.7, "IPE 270": 36.1, "IPE 300": 42.2,
  "HEA 100": 16.7, "HEA 120": 19.9, "HEA 140": 24.7, "HEA 160": 30.4, "HEA 180": 35.5, "HEA 200": 42.3, "HEA 220": 50.5, "HEA 240": 60.3,
  "UPN 100": 10.6, "UPN 120": 13.4, "UPN 140": 16.0, "UPN 160": 18.8, "UPN 200": 25.3,
  "L 50×5": 3.77, "L 60×6": 5.42, "L 70×7": 7.38, "L 80×8": 9.63, "L 100×10": 15.0,
  "RHS 100×50×4": 8.59, "RHS 120×60×4": 10.5, "SHS 100×100×4": 11.7,
};
export function tradeSteel(i: { section: string; lengthM: number; n: number }) {
  const kgm = STEEL_SECTIONS[i.section] ?? 0;
  return { kgPerM: kgm, kg: kgm * i.lengthM * i.n };
}
