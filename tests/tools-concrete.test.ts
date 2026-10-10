// Concrete take-off & pour planner (src/domain/tools/concrete-calc.ts) against the blueprint's worked vectors (§3.2).
import { describe, expect, it } from "vitest";
import {
  CONC_PROFILE, concCalendar, concColdJoint, concCubes, concMaterials, concMixYield, concPour, concTakeoff, concVolume, type ConcElement,
} from "../src/domain/tools/concrete-calc";

const el = (kind: ConcElement["kind"], dims: Record<string, number>, n = 1, extra: Partial<ConcElement> = {}): ConcElement => ({ id: kind, kind, label: kind, n, dims, ...extra });

describe("element volumes", () => {
  it("sloped footing, similar rectangles: 0.556 sloped, 1.756 m³ total", () => {
    const x = concVolume(el("footingSloped", { L: 2, B: 2, h1: 0.3, h2: 0.3, a: 0.6, b: 0.6 }));
    expect(x.netM3).toBeCloseTo(1.756, 3);
  });
  it("1b: prismoidal on a non-similar top: 1.9305 m³ (the frustum form would be 3.9 % low)", () => {
    expect(concVolume(el("footingSloped", { L: 3, B: 1.5, h1: 0.3, h2: 0.3, a: 0.3, b: 0.6 })).netM3).toBeCloseTo(1.9305, 4);
  });
  it("K1: 4 footings 2 × 2 × 0.6 → 9.600 m³, formwork 19.200 m², blinding 1.936 m³", () => {
    const f = concVolume(el("footing", { L: 2, B: 2, H: 0.6 }, 4));
    expect(f.netM3).toBeCloseTo(9.6, 3);
    expect(f.formworkM2).toBeCloseTo(19.2, 3);
    expect(concVolume(el("blinding", { L: 2, B: 2, t: 0.1 }, 4)).netM3).toBeCloseTo(1.936, 3);
  });
  it("K7: columns to the slab soffit 6.588 m³ / 65.880 m²; beams by their drop 3.1725 m³ / 32.430 m²", () => {
    const c = concVolume(el("column", { a: 0.3, b: 0.6, hFF: 3.2, ts: 0.15 }, 12));
    expect(c.netM3).toBeCloseTo(6.588, 3);
    expect(c.formworkM2).toBeCloseTo(65.88, 3);
    const b = concVolume(el("beam", { b: 0.25, h: 0.6, ts: 0.15, L: 4.7 }, 6));
    expect(b.netM3).toBeCloseTo(3.1725, 4);
    expect(b.formworkM2).toBeCloseTo(32.43, 3);
  });
  it("a beam shallower than its slab is an error, and order waste on top of element waste is refused", () => {
    expect(concVolume(el("beam", { b: 0.25, h: 0.12, ts: 0.15, L: 4 })).checks.some((c) => c.id === "conc.beamDrop" && c.level === "error")).toBe(true);
    expect(concTakeoff([el("slab", { L: 10, B: 8, t: 0.15 })], 3).checks.some((c) => c.id === "conc.doubleWaste")).toBe(true);
  });
  it("hourdi one-way 40 × 20 blocks, rib 0.10, topping 0.05 → 0.090 m³/m², 10 blocks/m²", () => {
    const h = concVolume(el("hourdi", { A: 1, ts: 0.05, hb: 0.2, bRib: 0.1, wBlock: 0.4, lBlock: 0.2 }));
    expect(h.netM3).toBeCloseTo(0.09, 3);
    expect(h.blocks).toBe(10);
  });
  it("stair flight n 10, R 0.16, G 0.30, w 1.2, t 0.15 → 0.900 m³", () => {
    const s = concVolume(el("stair", { nSteps: 10, R: 0.16, G: 0.3, w: 1.2, t: 0.15 }));
    expect(s.netM3).toBeCloseTo(0.9, 3);
    expect(s.trace[0].value).toBe("3.4");
  });
});

describe("materials and mix", () => {
  it("K5: 9.6 m³ at 5 % → 10.080 m³, 71 bags, sand 4.032, gravel 8.064, yield 1.0256", () => {
    const t = concTakeoff([el("footing", { L: 2, B: 2, H: 0.6 }, 4, { wastePct: 5 })]);
    expect(t.orderM3).toBeCloseTo(10.08, 3);
    const m = concMaterials(t.orderM3, CONC_PROFILE.mixes.rc);
    expect(m.cementKg).toBeCloseTo(3528, 1);
    expect(m.bags).toBe(71);
    expect(m.sandM3).toBeCloseTo(4.032, 3);
    expect(m.gravelM3).toBeCloseTo(8.064, 3);
    expect(concMixYield(CONC_PROFILE.mixes.rc)).toBeCloseTo(1.0256, 4);
  });
});

describe("pour planner", () => {
  it("slab pour: 122.9 m³, 14 trucks every 18 min, cycle 90, fleet 6, 320.8 min, the pump governs", () => {
    const p = concPour({ orderM3: 120 * 1.02, primingM3: 0.5, loadM3: 9, pumpM3h: 30, plantM3h: 60, crewM3h: 40, travelMin: 25, loadMin: 10, washMin: 12, setupMin: 45, cleanupMin: 30, start: "07:00" });
    expect(p.vOrderM3).toBeCloseTo(122.9, 1);
    expect(p.trucks).toBe(14);
    expect(p.intervalMin).toBeCloseTo(18, 6);
    expect(p.cycleMin).toBeCloseTo(90, 6);
    expect(p.fleet).toBe(6);
    expect(p.durationMin).toBeCloseTo(320.8, 1);
    expect(p.governs).toBe("pump");
    expect(p.schedule[0].at).toBe("07:45");
    expect(p.schedule[1].at).toBe("08:03");
    const c = concCubes(p.vOrderM3, { rule: "perVolume", volPerSet: 50, minSets: 1, perSet: 6, spares: true });
    expect(c.sets).toBe(3);
    expect(c.cubes).toBe(27);
    expect(concCubes(p.vOrderM3, { rule: "first50then100", volPerSet: 50, minSets: 1, perSet: 6, spares: false }).sets).toBe(2);
  });
  it("raft pour: 495.4 m³, 50 trucks, 15 min, cycle 100, fleet 8, 833.1 min, 10 sets", () => {
    const p = concPour({ orderM3: 480 * 1.03, primingM3: 1, loadM3: 10, pumpM3h: 40, plantM3h: 60, crewM3h: 50, travelMin: 30, loadMin: 10, washMin: 15, setupMin: 60, cleanupMin: 30, start: "06:00" });
    expect(p.vOrderM3).toBeCloseTo(495.4, 1);
    expect(p.trucks).toBe(50);
    expect(p.intervalMin).toBeCloseTo(15, 6);
    expect(p.cycleMin).toBeCloseTo(100, 6);
    expect(p.fleet).toBe(8);
    expect(p.durationMin).toBeCloseTo(833.1, 1);
    expect(concCubes(p.vOrderM3, { rule: "perVolume", volPerSet: 50, minSets: 1, perSet: 6, spares: false }).sets).toBe(10);
  });
  it("K6: cube sets for 120 / 42 / 260 m³", () => {
    const pv = { rule: "perVolume" as const, volPerSet: 50, minSets: 1, perSet: 6, spares: false };
    expect([120, 42, 260].map((x) => concCubes(x, pv).sets)).toEqual([3, 1, 6]);
    expect([120, 42, 260].map((x) => concCubes(x, pv).cubes)).toEqual([18, 6, 36]);
    expect([120, 42, 260].map((x) => concCubes(x, { ...pv, rule: "first50then100" }).sets)).toEqual([2, 1, 4]);
  });
  it("cold joint: A_max 160 m² at 120 min; a 600 m² strip warns, 8 m wide over 20 m; 120 m² at 30 °C", () => {
    const c = concColdJoint(40, 120, 0.5, 600, 20);
    expect(c.aMaxM2).toBeCloseTo(160, 6);
    expect(c.ok).toBe(false);
    expect(c.maxWidthM).toBeCloseTo(8, 6);
    expect(concColdJoint(40, CONC_PROFILE.tCover(30), 0.5, 0).aMaxM2).toBeCloseTo(120, 6);
  });
  it("calendar: pour 2026-10-10, 25 °C, OPC, slab 4.2 m, beam 6.5 m", () => {
    const cal = Object.fromEntries(concCalendar("2026-10-10", { slabSpanM: 4.2, beamSpanM: 6.5, airC: 25, cement: "opc" }).map((x) => [x.item, x.dateIso]));
    expect(cal["فك الجوانب الرأسية"]).toBe("2026-10-12");
    expect(cal["فك قوائم البلاطات"]).toBe("2026-10-17");
    expect(cal["فك قوائم الكمرات"]).toBe("2026-10-31");
    expect(cal["نهاية المعالجة"]).toBe("2026-10-17");
    expect(cal["كسر مكعبات 7 أيام"]).toBe("2026-10-17");
    expect(cal["كسر مكعبات 28 يومًا"]).toBe("2026-11-07");
  });
});
