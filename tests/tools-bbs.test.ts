// Bar bending schedule and the 12 m cutting optimiser (src/domain/tools/bbs-calc.ts) against the blueprint's vectors (§3.3).
import { describe, expect, it } from "vitest";
import { bbsCutLength, bbsLd, bbsLine, bbsRadius, bbsSummary, cutLowerBound, cutNaive, cutPlan, type BbsLine } from "../src/domain/tools/bbs-calc";

const cut = (shape: any, dims: any, d: number, rounding = 25) => bbsCutLength(shape, dims, d, { rounding });
const line = (l: Partial<BbsLine>): BbsLine => ({ id: "1", member: "B1", mark: "01", d: 16, shape: "00", dims: {}, nMembers: 1, nPer: 1, pos: "other", ...l });
const O = { rounding: 25, fy: 500, fcu: 25, grade: "B500DWR", stockMm: 12000 };

describe("bend radius", () => {
  it("BS 8666 table where listed, 2d ≤ 16, 3.5d above — Ø18 never on the small mandrel", () => {
    expect([6, 8, 10, 12, 16, 20, 25, 32, 40].map(bbsRadius)).toEqual([12, 16, 20, 24, 32, 70, 87, 112, 140]);
    expect([14, 18, 22, 28, 36].map(bbsRadius)).toEqual([28, 63, 77, 98, 126]);
  });
});

describe("cut lengths", () => {
  it("shape 11 Ø16 1200/400 → 1568, rounded 1575, exact 1566.8; 24 pieces 59.648 kg", () => {
    const c = cut("11", { A: 1200, B: 400 }, 16);
    expect(c.formulaMm).toBeCloseTo(1568, 6);
    expect(c.roundedMm).toBe(1575);
    expect(c.exactMm).toBeCloseTo(1566.8, 1);
    const l = bbsLine(line({ shape: "11", dims: { A: 1200, B: 400 }, nMembers: 4, nPer: 6 }), O);
    expect(l.totalM).toBeCloseTo(37.8, 6);
    expect(l.kg).toBeCloseTo(59.648, 3);
  });
  it("1b: Ø18 shape 11 → 1550.5 → 1575", () => {
    expect(cut("11", { A: 1200, B: 400 }, 18).formulaMm).toBeCloseTo(1550.5, 6);
    expect(cut("11", { A: 1200, B: 400 }, 18).roundedMm).toBe(1575);
  });
  it("shape 21 Ø20 → 1990 → 2000; shape 51 Ø8 500/200 → 1560 → 1575", () => {
    expect(cut("21", { A: 300, B: 1500, C: 300 }, 20).formulaMm).toBe(1990);
    expect(cut("21", { A: 300, B: 1500, C: 300 }, 20).roundedMm).toBe(2000);
    expect(cut("51", { A: 500, B: 200 }, 8).formulaMm).toBe(1560);
    expect(cut("51", { A: 500, B: 200 }, 8).roundedMm).toBe(1575);
  });
  it("B2: Ø12 shape 21 → 2052 → 2075, exact 2050.25; 20 bars 36.852 kg", () => {
    const c = cut("21", { A: 300, B: 1500, C: 300 }, 12);
    expect(c.formulaMm).toBe(2052);
    expect(c.roundedMm).toBe(2075);
    expect(c.exactMm).toBeCloseTo(2050.25, 2);
    expect(bbsLine(line({ d: 12, shape: "21", dims: { A: 300, B: 1500, C: 300 }, nMembers: 1, nPer: 20 }), O).kg).toBeCloseTo(36.852, 3);
  });
  it("B4: Ø25 shape 21 → 2863 → 2875, exact 2864.59, the site rule 2900 is flagged", () => {
    const c = cut("21", { A: 500, B: 2000, C: 500 }, 25);
    expect(c.formulaMm).toBe(2863);
    expect(c.roundedMm).toBe(2875);
    expect(c.exactMm).toBeCloseTo(2864.59, 1);
    expect(c.siteRuleMm).toBe(2900);
    expect(c.checks.some((x) => x.id === "bbs.siteRuleDelta")).toBe(true);
  });
  it("shape 99: two 45° cranks Ø16 r32 → 2483.3 → 2500; Ø20 r70 → 2476.5", () => {
    const segs = [{ len: 1000, angle: 45 }, { len: 500, angle: 45 }, { len: 1000, angle: 0 }];
    const a = cut("99", { segs }, 16);
    expect(a.exactMm).toBeCloseTo(2483.3, 1);
    expect(a.roundedMm).toBe(2500);
    expect(cut("99", { segs }, 20).exactMm).toBeCloseTo(2476.5, 1);
  });
  it("B5: summary by Ø → 325.923 kg", () => {
    const rows = [
      bbsLine(line({ d: 16, shape: "00", dims: { A: 5000 }, nMembers: 4, nPer: 6 }), O),
      bbsLine(line({ d: 12, shape: "21", dims: { A: 300, B: 1500, C: 300 }, nPer: 20 }), O),
      bbsLine(line({ d: 8, shape: "51", dims: { A: 250, B: 550 }, nPer: 40 }), O),
      bbsLine(line({ d: 25, shape: "11", dims: { A: 1200, B: 400 }, nPer: 12 }), O),
    ].map((x, i) => ({ d: [16, 12, 8, 25][i], totalM: x.totalM }));
    const s = bbsSummary(rows);
    expect(s.rows.map((x) => x.kg)).toEqual([28.045, 36.852, 189.36, 71.666]);
    expect(s.kg).toBeCloseTo(325.923, 3);
  });
});

describe("development and lap length (ECP 203)", () => {
  it("fy 500, fcu 25, Ø16: top 86.53Φ → 1400, bottom 66.56Φ → 1075; laps 1800 / 1400; staggered top 1400", () => {
    const top = bbsLd({ fy: 500, fcu: 25, d: 16, grade: "B500DWR", pos: "top" });
    expect(top.fbu).toBeCloseTo(1.2247, 4);
    expect(top.ldPhi).toBeCloseTo(86.53, 2);
    expect(top.ldRoundedMm).toBe(1400);
    expect(top.lapRoundedMm).toBe(1800);
    const bot = bbsLd({ fy: 500, fcu: 25, d: 16, grade: "B500DWR", pos: "other" });
    expect(bot.ldPhi).toBeCloseTo(66.56, 2);
    expect(bot.ldRoundedMm).toBe(1075);
    expect(bot.lapRoundedMm).toBe(1400);
    expect(bbsLd({ fy: 500, fcu: 25, d: 16, grade: "B500DWR", pos: "top", staggered: true }).lapRoundedMm).toBe(1400);
  });
  it("other grades; unknown position is the conservative top case; plain bars and other profiles are typed", () => {
    expect(bbsLd({ fy: 400, fcu: 30, d: 16, grade: "B400DWR", pos: "other" }).ldPhi).toBeCloseTo(48.61, 2);
    expect(bbsLd({ fy: 400, fcu: 25, d: 16, grade: "B400DWR", pos: "other" }).ldMm).toBeCloseTo(852.0, 1);
    expect(bbsLd({ fy: 500, fcu: 25, d: 16, grade: "B500DWR", pos: "unknown" }).ldRoundedMm).toBe(1400);
    expect(bbsLd({ fy: 240, fcu: 25, d: 16, grade: "B240B-P", pos: "other" }).typedRequired).toBe(true);
    expect(bbsLd({ fy: 420, fcu: 28, d: 16, grade: "B420DWR", pos: "other", profile: "aci318" }).typedRequired).toBe(true);
  });
});

describe("cutting optimiser (12 m stock)", () => {
  it("v1: 4500×10, 3000×6, 2400×8 → 7 bars (the bound), one 1800 remnant, no scrap; naive 9", () => {
    const dem = [{ mark: "a", lenMm: 4500, n: 10 }, { mark: "b", lenMm: 3000, n: 6 }, { mark: "c", lenMm: 2400, n: 8 }];
    const p = cutPlan(dem, 12000);
    expect(cutLowerBound(dem, 12000)).toBe(7);
    expect(p.newBars).toBe(7);
    expect(p.scrapMm).toBe(0);
    expect(p.remnantsMm).toEqual([1800]);
    expect(p.naiveBars).toBe(9);
    expect(p.optimality).toBe("proven");
  });
  it("v2: the pattern optimiser beats FFD — 4 bars [4400, 3800, 3600] × 4, FFD 5, naive 6", () => {
    const dem = [{ mark: "a", lenMm: 4400, n: 4 }, { mark: "b", lenMm: 3800, n: 4 }, { mark: "c", lenMm: 3600, n: 4 }];
    const p = cutPlan(dem, 12000);
    expect(p.newBars).toBe(4);
    expect(p.ffdBars).toBe(5);
    expect(p.naiveBars).toBe(6);
    expect(p.patterns).toHaveLength(1);
    expect(p.patterns[0].reps).toBe(4);
    expect(p.optimality).toBe("proven");
  });
  it("v3: 24 × 1575 → [1575 × 6] × 4, offcut 2550 each, no scrap (7 per bar would leave 975 of scrap)", () => {
    const p = cutPlan([{ mark: "01", lenMm: 1575, n: 24 }], 12000, { minRemnantMm: 1000 });
    expect(p.newBars).toBe(4);
    expect(p.scrapMm).toBe(0);
    expect(p.remnantsMm).toEqual([2550, 2550, 2550, 2550]);
  });
  it("v3b: at 1568 the longest-remnant tie-break picks 7/7/7/3 (1024 × 3 + 7296)", () => {
    const p = cutPlan([{ mark: "01", lenMm: 1568, n: 24 }], 12000, { minRemnantMm: 1000 });
    expect(p.newBars).toBe(4);
    expect([...p.remnantsMm].sort((a, b) => a - b)).toEqual([1024, 1024, 1024, 7296]);
  });
  it("C2: 3 × (5000 + 4000 + 3000) → 3 bars, no scrap, proven", () => {
    const p = cutPlan([{ mark: "a", lenMm: 5000, n: 3 }, { mark: "b", lenMm: 4000, n: 3 }, { mark: "c", lenMm: 3000, n: 3 }], 12000);
    expect(p.newBars).toBe(3);
    expect(p.scrapMm).toBe(0);
    expect(p.optimality).toBe("proven");
  });
  it("C3: 10 × 2600 → 4/4/2 (longest remnant 6800); with store remnant R-01 6800 → 2 new bars", () => {
    const p = cutPlan([{ mark: "a", lenMm: 2600, n: 10 }], 12000, { minRemnantMm: 1000 });
    expect(p.newBars).toBe(3);
    expect(Math.max(...p.remnantsMm)).toBe(6800);
    const q = cutPlan([{ mark: "a", lenMm: 2600, n: 10 }], 12000, { minRemnantMm: 1000, remnants: [{ id: "R-01", lenMm: 6800 }] });
    expect(q.newBars).toBe(2);
    expect(q.remnantsUsed).toEqual(["R-01"]);
  });
  it("naive count: each mark cut alone", () => {
    expect(cutNaive([{ mark: "a", lenMm: 5000, n: 3 }], 12000)).toBe(2);
  });
});
