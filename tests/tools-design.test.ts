// W4: design checks that show their working — the RC section check (ACI 318-19 with clauses, ECP 203 flagged ⚑) and the
// equal-friction duct sizer (the blueprint's pins). Expected values are worked by hand here, independently of the engine.
import { describe, expect, it } from "vitest";
import { barArea, beta1, checkRc, phiFlex, solveSection, type RcIn } from "../src/domain/tools/rc-calc";
import { ductFriction, huebscher, rectForHeight, sizeDucts, sizeRound, sizeRun, toLs } from "../src/domain/tools/duct-calc";

const beam: RcIn = {
  code: "aci318-19", kind: "beam", b: 300, h: 600, cover: 40, fc: 28, fy: 420, fyt: 420,
  nT: 3, dT: 25, sT: 0, layers: 1, nC: 0, dC: 0, dS: 10, legs: 2, sS: 150,
  mu: 250, vu: 200, span: 6, support: "simple", agg: 20,
};
const close = (a: number, b: number, tol = 1e-3) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));

describe("ACI 318-19 — a singly reinforced beam, worked by hand", () => {
  const o = checkRc(beam);
  const d = 600 - 40 - 10 - 12.5;                                    // 537.5
  const as = 3 * barArea(25);                                       // 1472.6
  const a = (as * 420) / (0.85 * 28 * 300);                          // 86.6
  const mn = (as * 420 * (d - a / 2)) / 1e6;                         // 305.6 kN·m
  it("d, As, the stress block and Mn match the closed form (steel yields)", () => {
    close(o.geo.d, d);
    close(o.geo.as, as);
    close(o.flex.a, a, 1e-6);
    close(o.flex.c, a / 0.85, 1e-6);
    close(o.flex.mn, mn, 1e-6);
  });
  it("tension-controlled: εt ≥ εty + 0.003 → φ = 0.90; φMn ≥ Mu passes", () => {
    expect(o.flex.epsT).toBeGreaterThan(420 / 200000 + 0.003);
    expect(o.flex.phi).toBe(0.9);
    close(o.flex.cap, 0.9 * mn, 1e-6);
    expect(o.checks.find((c) => c.id === "flex")!.ok).toBe(true);
  });
  it("As,min = max(0.25√f′c/fy, 1.4/fy)·b·d (9.6.1.2) = 537.5 mm²", () => close(o.flex.asMin, (1.4 / 420) * 300 * d));
  it("shear: Vc = 0.17√f′c·b·d, Vs = Av·fyt·d/s, φ = 0.75; s max = d/2", () => {
    const vc = (0.17 * Math.sqrt(28) * 300 * d) / 1000;              // 145.1 kN
    const vs = (2 * barArea(10) * 420 * d) / 150 / 1000;             // 236.4 kN
    close(o.shear.vc, vc);
    close(o.shear.vs, vs);
    close(o.shear.cap, 0.75 * (vc + vs));
    close(o.shear.sMax, d / 2);
  });
  it("span / depth: ℓ/16 × (0.4 + fy/700) = 375 mm for 6 m simply supported", () => close(o.hMin!, 375));
  it("every step and every check names its ACI clause, and nothing is flagged", () => {
    expect(o.flagged).toBe(false);
    expect(o.ok).toBe(true);
    for (const c of o.checks) {
      expect(c.clause).toMatch(/^ACI 318-19 /);
      expect(c.unverified).toBe(false);
    }
    expect(o.trace.filter((s) => s.clause).length).toBeGreaterThan(8);
    expect(o.advice).toEqual([]);
  });
});

describe("ACI 318-19 — what a reviewer is told when it fails", () => {
  it("over-reinforced: εt < 0.004 fails ductility, φ is in the transition zone, and the advice says add depth or compression steel", () => {
    const o = checkRc({ ...beam, nT: 8, layers: 2, dT: 25, mu: 400 });
    expect(o.flex.epsT).toBeLessThan(0.004);
    expect(o.flex.phi).toBeGreaterThan(0.65);
    expect(o.flex.phi).toBeLessThan(0.9);
    expect(o.checks.find((c) => c.id === "duct")!.ok).toBe(false);
    expect(o.advice.join(" ")).toContain("المطيلية");
    expect(o.ok).toBe(false);
  });
  it("φ follows Table 21.2.2 exactly at its corners", () => {
    expect(phiFlex(0.0021, 420)).toBe(0.65);
    expect(phiFlex(0.0051, 420)).toBe(0.9);
    close(phiFlex(0.0036, 420), 0.775, 1e-9);
    expect(beta1(28)).toBe(0.85);
    close(beta1(35), 0.8, 1e-12);
    expect(beta1(60)).toBe(0.65);
  });
  it("under-strength: the advice gives the steel needed and a bar count", () => {
    const o = checkRc({ ...beam, mu: 400 });
    expect(o.checks.find((c) => c.id === "flex")!.ok).toBe(false);
    expect(o.flex.asReq).toBeGreaterThan(o.geo.as);
    const n = Math.ceil(o.flex.asReq! / barArea(25));
    expect(o.advice[0]).toContain(`${n} Ø25`);
  });
  it("too many bars for the width fails 25.2.1 and suggests two layers", () => {
    const o = checkRc({ ...beam, b: 250, nT: 6, dT: 25 });
    expect(o.checks.find((c) => c.id === "clear")!.ok).toBe(false);
    expect(o.advice.join(" ")).toContain("طبقتين");
  });
  it("a section too small for its shear says stirrups will not fix it (22.5.1.2)", () => {
    const o = checkRc({ ...beam, vu: 900 });
    expect(o.checks.find((c) => c.id === "secv")!.ok).toBe(false);
    expect(o.advice.join(" ")).toContain("لا تحلها الكانات");
  });
  it("compression steel: forces balance at the solved neutral axis, and Mn grows", () => {
    const base = checkRc({ ...beam, nT: 6, layers: 2, mu: 0 });
    const dbl = checkRc({ ...beam, nT: 6, layers: 2, nC: 2, dC: 16, mu: 0 });
    expect(dbl.flex.mn).toBeGreaterThan(base.flex.mn);
    expect(dbl.flex.epsT).toBeGreaterThan(base.flex.epsT);
    const s = solveSection({ b: 300, h: 600, d: dbl.geo.d, dp: dbl.geo.dp, as: dbl.geo.as, asc: dbl.geo.asc, block: 0.85 * 28, beta: 0.85, fs: 420, displaced: true });
    const C = 0.85 * 28 * 300 * s.a + dbl.geo.asc * (s.fsC - 0.85 * 28);
    close(C, dbl.geo.as * s.fsT, 1e-6);
    expect(s.fsC).toBeLessThan(420);                                  // the compression bars do not yield here
  });
});

describe("ACI 318-19 — a one-way slab strip", () => {
  const slab = checkRc({ ...beam, kind: "slab", h: 150, cover: 20, dT: 10, sT: 200, mu: 15, vu: 30, span: 3.5 });
  it("As per metre, As,min = 0.0018·b·h (7.6.1.1), s ≤ min(3h, 450) (7.7.2.3)", () => {
    close(slab.geo.as, 5 * barArea(10));
    close(slab.flex.asMin, 0.0018 * 1000 * 150);
    expect(slab.checks.find((c) => c.id === "smax")!.limit).toContain("450");
  });
  it("shear without stirrups uses the size-effect formula 22.5.5.1(c)", () => {
    const d = 150 - 20 - 5;
    const rho = (5 * barArea(10)) / (1000 * d);
    const lamS = Math.min(1, Math.sqrt(2 / (1 + d / 250)));
    close(slab.shear.vc, (0.66 * lamS * Math.cbrt(rho) * Math.sqrt(28) * 1000 * d) / 1000);
    expect(slab.trace.some((t) => t.clause?.includes("22.5.5.1(c)"))).toBe(true);
  });
  it("ℓ/20 for a simply supported slab: 175 mm > 150 mm is a warning (deflection must be calculated), not a failure", () => {
    const c = slab.checks.find((x) => x.id === "depth")!;
    expect(c.ok).toBe(false);
    expect(c.level).toBe("warn");
    expect(slab.ok).toBe(true);
    expect(slab.advice.join(" ")).toContain("الترخيم");
  });
});

describe("ECP 203 — transcribed constants, always flagged ⚑", () => {
  const ecp: RcIn = { ...beam, code: "ecp203-2020", b: 250, h: 600, cover: 25, fc: 25, fy: 360, fyt: 240, nT: 4, dT: 16, dS: 8, sS: 150, mu: 120, vu: 150 };
  const o = checkRc(ecp);
  it("the limit-state block 0.67fcu/γc over 0.8c with fy/γs reproduces the hand calculation", () => {
    const d = 600 - 25 - 8 - 8;
    const as = 4 * barArea(16);
    const block = (0.67 * 25) / 1.5;
    const a = (as * (360 / 1.15)) / (block * 250);
    close(o.geo.d, d);
    close(o.flex.a, a, 1e-6);
    close(o.flex.cap, (as * (360 / 1.15) * (d - a / 2)) / 1e6, 1e-6);
    expect(o.checks.find((c) => c.id === "flex")!.ok).toBe(true);
  });
  it("shear: qcu = 0.24√(fcu/γc), stirrups carry qu − qcu/2", () => {
    const root = Math.sqrt(25 / 1.5);
    const qs = (2 * barArea(8) * (240 / 1.15)) / (250 * 150);
    close(o.shear.cap, (Math.max(0.24 * root, 0.12 * root + qs) * 250 * 559) / 1000);
  });
  it("every check is flagged, the result is marked as such, and no clause pretends to be verified", () => {
    expect(o.flagged).toBe(true);
    for (const c of o.checks) {
      expect(c.unverified, c.id).toBe(true);
      expect(c.clause).toMatch(/⚑/);
    }
  });
});

describe("duct sizer — the blueprint's pins", () => {
  it("1,000 L/s at 1.0 Pa/m → D 441.2 mm", () => expect(Number(sizeRound(1000, 1.0).toFixed(1))).toBe(441.2));
  it("Ø450 at 1,000 L/s → 0.907 Pa/m", () => expect(Number(ductFriction(1000, 450).pa.toFixed(3))).toBe(0.907));
  it("600 × 300 (Huebscher De) at 1,000 L/s → 0.840 Pa/m", () => {
    expect(Number(huebscher(600, 300).toFixed(1))).toBe(457.0);
    expect(Number(ductFriction(1000, huebscher(600, 300)).pa.toFixed(3))).toBe(0.84);
  });
  it("flow units: CFM and m³/h convert to L/s", () => {
    close(toLs(2119, "cfm"), 1000.06, 1e-4);
    close(toLs(3600, "m3h"), 1000, 1e-12);
  });
});

describe("duct sizer — runs, rectangular ducts and the index path", () => {
  const lim = { paPerM: 1.0, vMax: 7.5, aspectMax: 4, step: 50, mat: "galv" as const };
  it("auto round size is the required diameter rounded up to the step", () => {
    const o = sizeRun({ tag: "M1", q: 1000, len: 20, shape: "round", fit: 0, index: true }, lim);
    expect(o.size).toBe("Ø450");
    close(o.pa, ductFriction(1000, 450).pa, 1e-9);
    close(o.dpStraight, o.pa * 20, 1e-9);
  });
  it("a rectangular duct of fixed height gets the narrowest width whose De covers D required", () => {
    const w = rectForHeight(441.2, 300);
    expect(huebscher(w, 300)).toBeGreaterThanOrEqual(441.2);
    expect(huebscher(w - 50, 300)).toBeLessThan(441.2);
    const o = sizeRun({ tag: "M2", q: 1000, len: 10, shape: "rect", h: 300, fit: 25, index: true }, lim);
    expect(o.size).toBe(`${w} × 300`);
    close(o.dpTotal, o.pa * 10 + 25, 1e-9);
  });
  it("velocity above the limit and a flat duct beyond 4 : 1 are warnings with the limit shown", () => {
    const o = sizeRun({ tag: "X", q: 2000, len: 5, shape: "rect", w: 1200, h: 200, fit: 0, index: false }, lim);
    expect(o.checks.find((c) => c.id === "ar")!.ok).toBe(false);
    const fast = sizeRun({ tag: "Y", q: 2000, len: 5, shape: "round", d: 400, fit: 0, index: false }, lim);
    expect(fast.checks.find((c) => c.id === "v")!.ok).toBe(false);
  });
  it("the index path sums only the runs marked on it (straights + fittings)", () => {
    const runs = [
      { tag: "A", q: 1000, len: 20, shape: "round" as const, fit: 30, index: true },
      { tag: "B", q: 600, len: 10, shape: "round" as const, fit: 20, index: true },
      { tag: "C", q: 400, len: 15, shape: "round" as const, fit: 10, index: false },
    ];
    const o = sizeDucts(runs, lim);
    close(o.indexPa, o.runs[0].dpTotal + o.runs[1].dpTotal, 1e-9);
  });
});
