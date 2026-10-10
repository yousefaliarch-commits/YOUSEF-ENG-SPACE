// Trade quick kit (src/domain/tools/trade-calc.ts) against the blueprint's worked vectors (§3.1).
import { describe, expect, it } from "vitest";
import {
  tradeBagBatch, tradeBarSpacing, tradeDrywall, tradeElectric, tradeFalls, tradeFormwork, tradeFormworkContact, tradeMasonry, tradePaint,
  tradePlaster, tradePlumbing, tradeRoomArea, tradeSteel, tradeTiles,
} from "../src/domain/tools/trade-calc";

describe("civil and finishing trades", () => {
  it("1 bag batch: 0.142857 m³, 2.857 / 5.714 buckets, 25 L water", () => {
    const b = tradeBagBatch({ bagKg: 50, cementKgM3: 350, sandM3: 0.4, gravelM3: 0.8, wc: 0.5 }, 20);
    expect(b.yieldM3).toBeCloseTo(0.142857, 6);
    expect(b.sandBuckets).toBeCloseTo(2.857, 3);
    expect(b.gravelBuckets).toBeCloseTo(5.714, 3);
    expect(b.waterL).toBe(25);
  });
  it("2 plaster single layer: 264 kg → 6 bags, sand 0.880 m³ = 44 buckets", () => {
    const p = tradePlaster({ areaM2: 40, layers: [{ tMm: 20, cementKgM3: 300 }], wastePct: 10 });
    expect(p.cementKg).toBeCloseTo(264, 6);
    expect(p.cementBags).toBe(6);
    expect(p.sandM3).toBeCloseTo(0.88, 6);
    expect((p.sandM3 * 1000) / 20).toBeCloseTo(44, 6);
  });
  it("3 plaster internal (4 @450 + 20 @300, waste 20 %): 374.4 kg → 8 bags, sand 1.152 m³", () => {
    const p = tradePlaster({ areaM2: 40, layers: [{ tMm: 4, cementKgM3: 450 }, { tMm: 20, cementKgM3: 300 }], wastePct: 20 });
    expect(p.cementKg).toBeCloseTo(374.4, 6);
    expect(p.cementBags).toBe(8);
    expect(p.sandM3).toBeCloseTo(1.152, 6);
  });
  it("4 tiles 4.0 × 3.5, 600 × 600, j 2: 43 tiles (42.494), 11 boxes; grout 0.096 kg/m², 1.478 kg", () => {
    const t = tradeTiles({ areaM2: 14, aMm: 600, bMm: 600, jointMm: 2, wastePct: 10, boxM2: 1.44, depthMm: 9 });
    expect(t.tilesExact).toBeCloseTo(42.494, 3);
    expect(t.tiles).toBe(43);
    expect(t.boxes).toBe(11);
    expect(t.groutKgM2).toBeCloseTo(0.096, 3);
    expect(t.groutKg).toBeCloseTo(1.478, 3);
  });
  it("5 paint: walls 41.31 m², area 55.31 m², 12.168 L → 4 × 3.6 L", () => {
    const a = tradeRoomArea({ l: 4, w: 3.5, h: 3, openingsM2: 0.9 * 2.1 + 1.5 * 1.2, ceiling: true });
    expect(a.wallsM2).toBeCloseTo(41.31, 6);
    expect(a.areaM2).toBeCloseTo(55.31, 6);
    const p = tradePaint({ areaM2: a.areaM2, coats: 2, spreadM2L: 10, practical: 1, wastePct: 10, packL: 3.6 });
    expect(p.litres).toBeCloseTo(12.168, 3);
    expect(p.packs).toBe(4);
  });
  it("6 formwork: 8 columns 0.3 × 0.6 × 3.0 → 43.2 m², 16 sheets (15.963)", () => {
    const c = tradeFormworkContact({ kind: "column", a: 0.3, b: 0.6, h: 3, n: 8 });
    expect(c).toBeCloseTo(43.2, 6);
    const s = tradeFormwork({ contactM2: c, wastePct: 10 });
    expect(s.exact).toBeCloseTo(15.963, 3);
    expect(s.sheets).toBe(16);
  });
  it("7 half-brick 25×12×6: 54.945/m², 577 units, mortar 0.2110, sand 0.2637, 65.9 kg → 2 bags", () => {
    const m = tradeMasonry({ unit: { l: 25, w: 12, h: 6, kind: "solid" }, areaM2: 10, leaves: 0.5, jointCm: 1, unitWastePct: 5, mortarKgM3: 250, mortarWastePct: 25 });
    expect(m.unitsPerM2).toBeCloseTo(54.945, 3);
    expect(m.units).toBe(577);
    expect(m.mortarWetM3).toBeCloseTo(0.211, 4);
    expect(m.sandM3).toBeCloseTo(0.2637, 4);
    expect(m.cementKg).toBeCloseTo(65.9, 1);
    expect(m.cementBags).toBe(2);
  });
  it("8 blocks and thicker walls; AAC thin bed has adhesive and no sand or cement", () => {
    const blk = (w: number) => tradeMasonry({ unit: { l: 40, w: 20, h: 20, kind: "hollow" }, areaM2: 10, leaves: 0.5, jointCm: 1, unitWastePct: w, mortarKgM3: 250, mortarWastePct: 25 });
    expect(blk(5).unitsPerM2).toBeCloseTo(11.614, 3);
    expect(blk(5).units).toBe(122);
    expect(blk(4).units).toBe(121);
    const b15 = tradeMasonry({ unit: { l: 25, w: 12, h: 6, kind: "solid" }, areaM2: 1, leaves: 1.5, jointCm: 1, unitWastePct: 0, mortarKgM3: 250, mortarWastePct: 0 });
    expect(b15.unitsPerM2).toBeCloseTo(164.835, 3);
    expect(b15.mortarPerM2).toBeCloseTo(0.0833, 4);
    const b2 = tradeMasonry({ unit: { l: 25, w: 12, h: 6, kind: "solid" }, areaM2: 1, leaves: 2, jointCm: 1, unitWastePct: 0, mortarKgM3: 250, mortarWastePct: 0 });
    expect(b2.unitsPerM2).toBeCloseTo(219.78, 2);
    expect(b2.mortarPerM2).toBeCloseTo(0.1144, 4);
    const aac = tradeMasonry({ unit: { l: 60, w: 10, h: 20, kind: "aac" }, areaM2: 10, leaves: 0.5, jointCm: 1, unitWastePct: 0, mortarKgM3: 250, mortarWastePct: 25, thinBed: true });
    expect(aac.unitsPerM2).toBeCloseTo(8.17, 2);
    expect(aac.adhesiveKg).toBeCloseTo(22, 6);
    expect(aac.sandM3).toBe(0);
    expect(aac.cementKg).toBe(0);
  });
  it("9 bar spacing: 29 bars, 754.0 mm²/m, 102.95 m, 91.42 kg", () => {
    const b = tradeBarSpacing({ clearM: 4.2, coverMm: 25, spacingMm: 150, d: 12, otherLenM: 3.55 });
    expect(b.bars).toBe(29);
    expect(b.asMm2PerM).toBeCloseTo(754.0, 1);
    expect(b.totalM).toBeCloseTo(102.95, 6);
    expect(b.kg).toBeCloseTo(91.42, 2);
  });
  it("10 falls: 1 % over 12 m from 30 mm → 120 / 150 / 90 mm, 10.8 m³ over 12 × 10; bathroom 18 mm", () => {
    const f = tradeFalls({ slopePct: 1, runM: 12, minMm: 30, areaM2: 120 });
    expect(f.dropMm).toBeCloseTo(120, 6);
    expect(f.maxMm).toBeCloseTo(150, 6);
    expect(f.avgMm).toBeCloseTo(90, 6);
    expect(f.volumeM3).toBeCloseTo(10.8, 6);
    expect(tradeFalls({ slopePct: 1, runM: 1.8, minMm: 0 }).dropMm).toBeCloseTo(18, 6);
  });
});

describe("trades beyond civil", () => {
  it("electrician: 6 rooms × 8 points, runs 180 m → 198 m wire, 48 boxes", () => {
    const e = tradeElectric({ rooms: 6, pointsPerRoom: 8, runsM: 180 });
    expect(e.wireM).toBeCloseTo(198, 6);
    expect(e.boxes).toBe(48);
  });
  it("plumber: 7.5 + 12.0 + 5.3 m → 7 lengths of 4 m, 17 fittings", () => {
    const p = tradePlumbing({ runsM: [7.5, 12, 5.3] });
    expect(p.lengths).toBe(7);
    expect(p.fittings).toBe(17);
  });
  it("drywall: 6.0 × 3.0 m, both sides, waste 10 % → 14 boards, 11 studs, 12 m track", () => {
    const d = tradeDrywall({ lengthM: 6, heightM: 3, sides: 2, layers: 1, wastePct: 10 });
    expect(d.boardsExact).toBeCloseTo(13.75, 6);
    expect(d.boards).toBe(14);
    expect(d.studs).toBe(11);
    expect(d.trackM).toBe(12);
  });
  it("structural steel: 12 × IPE 200 × 6.0 m → 1612.8 kg", () => {
    expect(tradeSteel({ section: "IPE 200", lengthM: 6, n: 12 }).kg).toBeCloseTo(1612.8, 6);
  });
});
