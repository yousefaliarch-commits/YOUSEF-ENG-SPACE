// Levelling field book (src/domain/tools/level-calc.ts) against the blueprint's fixture (§3.4), integer millimetres.
import { describe, expect, it } from "vitest";
import { lvlAdjust, lvlChecks, lvlCutFill, lvlMisclosure, lvlReduce, lvlTwoPeg, lvlValidate, type LvlRow } from "../src/domain/tools/level-calc";

const run: LvlRow[] = [
  { id: "bm1", pt: "BM1", bs: 1250 },
  { id: "a", pt: "A", is: 2105 },
  { id: "b", pt: "B", is: -1630 },
  { id: "cp1", pt: "CP1", fs: 985, bs: 1460, distM: 120 },
  { id: "c", pt: "C", is: 1875 },
  { id: "cp2", pt: "CP2", fs: 2310, bs: 755, distM: 130 },
  { id: "bm2", pt: "BM2", fs: 1330, distM: 110 },
];

describe("reduction and checks", () => {
  const r = lvlReduce(run, 100000);
  it("RLs, HIs and sums", () => {
    expect(r.pts.slice(1).map((p) => p.rlMm)).toEqual([99145, 102880, 100265, 99850, 99415, 98840]);
    expect(r.hiN.map((x) => x.hi)).toEqual([101250, 101725, 100170]);
    expect([r.sumBs, r.sumFs, r.sumIs, r.sumRise, r.sumFall]).toEqual([3465, 4625, 2350, 3735, 4895]);
  });
  it("check 1 (−1160 three ways) and check 2 (600.395 = 600.395)", () => {
    const c = lvlChecks(r);
    expect([c.bsMinusFs, c.riseMinusFall, c.diffMm]).toEqual([-1160, -1160, -1160]);
    expect(c.check1 && c.checkRf && c.check2).toBe(true);
    expect(c.check2Lhs).toBe(600395);
    expect(c.check2Rhs).toBe(600395);
  });
  it("misclosure −6 mm: 12√K at 0.36 km → 7.2 PASS; 5√n → 8.66 PASS; 4√K → 2.4 FAIL", () => {
    const a = lvlMisclosure(r, 98846, { kind: "sqrtK", c: 12 }, 0.36);
    expect(a.eMm).toBe(-6);
    expect(a.allowMm).toBeCloseTo(7.2, 6);
    expect(a.ok).toBe(true);
    expect(a.ratio).toBeCloseTo(0.83, 2);
    expect(lvlMisclosure(r, 98846, { kind: "sqrtN", c: 5 }).allowMm).toBeCloseTo(8.66, 2);
    expect(lvlMisclosure(r, 98846, { kind: "sqrtK", c: 4 }, 0.36).ok).toBe(false);
  });
  it("adjustment by setups (+2 / +4 / +6 → 98.846) and by distance (+2.0 / +4.17 → 99.419 / +6.0)", () => {
    const s = Object.fromEntries(lvlAdjust(r, -6, "setups").map((x) => [x.id, x]));
    expect([s.a.corrMm, s.b.corrMm, s.cp1.corrMm, s.c.corrMm, s.cp2.corrMm, s.bm2.corrMm]).toEqual([2, 2, 2, 4, 4, 6]);
    expect(s.bm2.adjRlMm).toBe(98846);
    const d = Object.fromEntries(lvlAdjust(r, -6, "distance").map((x) => [x.id, x]));
    expect(d.cp1.corrMm).toBeCloseTo(2, 6);
    expect(d.cp2.corrMm).toBeCloseTo(4.17, 2);
    expect(d.cp2.adjRlMm).toBe(99419);
    expect(d.bm2.corrMm).toBeCloseTo(6, 6);
  });
});

describe("two-peg, closed loop, cut / fill, validation", () => {
  it("two-peg: +0.12 mm/m, 2.4 mm / 20 m, 24.75″, b2 1083.4, a2 1419.4 → FAIL", () => {
    const t = lvlTwoPeg({ a1: 1523, b1: 1187, a2: 1420, b2: 1090, saM: 5, sbM: 55 }, 1);
    expect(t.eMmPerM).toBeCloseTo(0.12, 6);
    expect(t.per20Mm).toBeCloseTo(2.4, 6);
    expect(t.arcSec).toBeCloseTo(24.75, 2);
    expect(t.b2CorrMm).toBe(1083.4);
    expect(t.a2CorrMm).toBe(1419.4);
    expect(t.ok).toBe(false);
  });
  it("LV3 closed loop: +10 mm; 12√K 5.37 FAIL, 24√K 10.73 PASS, 5√n 7.07 FAIL", () => {
    const r = lvlReduce([{ id: "bm", pt: "BM", bs: 1500 }, { id: "cp", pt: "CP1", fs: 2000, bs: 1200 }, { id: "end", pt: "BM", fs: 690 }], 50000);
    const e12 = lvlMisclosure(r, 50000, { kind: "sqrtK", c: 12 }, 0.2);
    expect(e12.eMm).toBe(10);
    expect(e12.allowMm).toBeCloseTo(5.37, 2);
    expect(e12.ok).toBe(false);
    expect(lvlMisclosure(r, 50000, { kind: "sqrtK", c: 24 }, 0.2).ok).toBe(true);
    const n = lvlMisclosure(r, 50000, { kind: "sqrtN", c: 5 });
    expect(n.allowMm).toBeCloseTo(7.07, 2);
    expect(n.ok).toBe(false);
  });
  it("LV5 cut: RL 100.350, design 99.600 → +750, «C 0.750»", () => {
    expect(lvlCutFill(100350, 99600)).toEqual({ mm: 750, kind: "cut", label: "C 0.750" });
  });
  it("validation: first IS, two BS, a reading longer than the staff", () => {
    expect(lvlValidate([{ id: "1", pt: "A", is: 1000 }], 5000).some((c) => c.id === "lvl.firstNotBs")).toBe(true);
    expect(lvlValidate([{ id: "1", pt: "A", bs: 1000 }, { id: "2", pt: "B", bs: 1200 }], 5000).some((c) => c.id === "lvl.twoBs")).toBe(true);
    expect(lvlValidate([{ id: "1", pt: "A", bs: 5120 }], 5000).some((c) => c.id === "lvl.overStaff")).toBe(true);
    expect(lvlValidate([{ id: "1", pt: "A", bs: 5120 }], 7000).some((c) => c.id === "lvl.overStaff")).toBe(false);
  });
});
