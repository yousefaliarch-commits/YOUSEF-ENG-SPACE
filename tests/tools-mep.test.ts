// MEP quick checks (src/domain/tools/mep-calc.ts) against the blueprint's vectors (§3.8–§3.11).
import { describe, expect, it } from "vitest";
import {
  acxCondensate, acxLineSet, cabAdiabatic, cabAmpacity, cabCoord, cabDerate, cabIb, cabLmax, cabSelect, cabVd, drnGradeStake, drnMinSlope, drnRun,
  drnSightRail, spkLayout, spkLimits, spkSiteCheck,
} from "../src/domain/tools/mep-calc";

describe("AC installation", () => {
  it("condensate 1000 L/s × ΔW 0.004 → 17.28 L/h; drain sizes; fall; slope", () => {
    expect(acxCondensate({ airLs: 1000, dW: 0.004, tr: 1, runM: 0, slopePct: 1 }).lph).toBeCloseTo(17.28, 2);
    expect(acxCondensate({ tr: 50, runM: 0, slopePct: 1 }).minDrainIn).toBe("1¼″");
    expect(acxCondensate({ tr: 20, runM: 0, slopePct: 1 }).minDrainIn).toBe("3/4″");
    expect(acxCondensate({ tr: 1, runM: 20, slopePct: 1 }).fallMm).toBeCloseTo(200, 6);
    expect(acxCondensate({ tr: 1, runM: 20, slopePct: 0.8 }).slopeOk).toBe(false);
  });
  it("line set: +90 g, all pass; 16 m too long; wrong gas size", () => {
    const base = { lenM: 12, liftM: 5, maxLenM: 15, maxLiftM: 8, preM: 7.5, gPerM: 20, liquidIn: "1/4", gasIn: "1/2", manualLiquidIn: "1/4", manualGasIn: "1/2" };
    expect(acxLineSet(base)).toEqual({ extraG: 90, lenOk: true, liftOk: true, sizesOk: true });
    expect(acxLineSet({ ...base, lenM: 16 }).lenOk).toBe(false);
    expect(acxLineSet({ ...base, gasIn: "3/8" }).sizesOk).toBe(false);
  });
});

describe("drain runs", () => {
  it("1.5 %: IL2 98.900 (depth 1.150), IL3 98.525 (depth 1.375)", () => {
    const r = drnRun({ startIlMm: 99200, minCoverMm: 600, profile: "metric", reaches: [{ lenM: 20, dnMm: 150, slopePct: 1.5, glMm: 100050 }, { lenM: 25, dnMm: 150, slopePct: 1.5, glMm: 99900 }] });
    expect(r.nodes.map((n) => n.ilInMm)).toEqual([98900, 98525]);
    expect(r.nodes.map((n) => n.depthMm)).toEqual([1150, 1375]);
  });
  it("1:200 with sight rails: 98.350 at 0+030, MH2 98.275 (depth 1.845); rails 100.500 / 100.275; mark 0.700", () => {
    const r = drnRun({ startIlMm: 98500, minCoverMm: 600, profile: "metric", reaches: [{ lenM: 30, dnMm: 200, slopePct: 0.5 }, { lenM: 15, dnMm: 200, slopePct: 0.5, glMm: 100120 }] });
    expect(r.nodes[0].ilInMm).toBe(98350);
    expect(r.nodes[1].ilInMm).toBe(98275);
    expect(r.nodes[1].depthMm).toBe(1845);
    expect(drnSightRail(98500, 2000, 99800)).toEqual({ railMm: 100500, markAbovePegMm: 700 });
    expect(drnSightRail(98275, 2000).railMm).toBe(100275);
  });
  it("DN100 at 1.0 %: IPC fails (1.042 %), metric passes; grade stake «C 0.750»", () => {
    expect(drnMinSlope(100, "ipc")).toBe(1.042);
    const ipc = drnRun({ startIlMm: 99000, minCoverMm: 0, profile: "ipc", reaches: [{ lenM: 10, dnMm: 100, slopePct: 1 }] });
    expect(ipc.nodes[0].checks[0].ok).toBe(false);
    const met = drnRun({ startIlMm: 99000, minCoverMm: 0, profile: "metric", reaches: [{ lenM: 10, dnMm: 100, slopePct: 1 }] });
    expect(met.nodes[0].checks[0].ok).toBe(true);
    expect(drnGradeStake(100350, 99600).label).toBe("C 0.750");
  });
});

describe("sprinklers (NFPA 13)", () => {
  it("OH1 20 × 12 → 20 heads (5 × 4), 4.0 × 3.0, 12.0 m², walls 2.0 / 1.5", () => {
    const l = spkLayout(20, 12, spkLimits("OH1"));
    expect([l.n, l.nx, l.ny]).toEqual([20, 5, 4]);
    expect(l.sx).toBeCloseTo(4, 6);
    expect(l.sy).toBeCloseTo(3, 6);
    expect(l.areaM2).toBeCloseTo(12, 6);
    expect([l.wallX, l.wallY]).toEqual([2, 1.5]);
  });
  it("LH same room → 15 (5 × 3), 16.0 m²; EH hydraulic 30 × 9 → 30 (10 × 3)", () => {
    const lh = spkLayout(20, 12, spkLimits("LH"));
    expect([lh.n, lh.nx, lh.ny]).toEqual([15, 5, 3]);
    expect(lh.areaM2).toBeCloseTo(16, 6);
    expect(spkLayout(20, 12, spkLimits("LH", "pipeSchedule")).n).toBe(15);
    const eh = spkLayout(30, 9, spkLimits("EH1"));
    expect([eh.n, eh.nx, eh.ny]).toEqual([30, 10, 3]);
  });
  it("site checks: 4.3 × 3.0 fails on area; 2.4 m wall fails; 1.7 m head-to-head fails; edge heads by the §10.2.4.1.1 rule", () => {
    const oh = spkLimits("OH1");
    expect(spkSiteCheck({ sxM: 4.3, syM: 3, wallXM: 2, wallYM: 1.5, headMinM: 3 }, oh).checks[0].ok).toBe(false);
    expect(spkSiteCheck({ sxM: 4, syM: 3, wallXM: 2.4, wallYM: 1.5, headMinM: 3 }, oh).checks[2].ok).toBe(false);
    expect(spkSiteCheck({ sxM: 4, syM: 3, wallXM: 2, wallYM: 1.5, headMinM: 1.7 }, oh).checks[3].ok).toBe(false);
    const edge = spkSiteCheck({ sxM: 3.4, syM: 3.4, wallXM: 2.0, wallYM: 1.7, headMinM: 3.4 }, oh);
    expect(edge.areaM2).toBeCloseTo(13.6, 6);
    expect(edge.ok).toBe(false);
    const ok = spkSiteCheck({ sxM: 3.4, syM: 3.4, wallXM: 1.7, wallYM: 1.7, headMinM: 3.4 }, oh);
    expect(ok.areaM2).toBeCloseTo(11.56, 6);
    expect(ok.ok).toBe(true);
    expect(spkSiteCheck({ sxM: 4.6, syM: 4.2, wallXM: 2.3, wallYM: 2.1, headMinM: 4.2 }, spkLimits("LH", "pipeSchedule")).ok).toBe(false);
    expect(spkSiteCheck({ sxM: 4.6, syM: 4.2, wallXM: 2.3, wallYM: 2.1, headMinM: 4.2 }, spkLimits("LH", "hydraulic")).ok).toBe(true);
  });
});

describe("cables (IEC 60364-5-52)", () => {
  it("90 kW feeder: Ib 160.87 A; E, 40 °C, 3 on a tray → Πk 0.7462, It 268.02 → 95 mm², Iz 222.37", () => {
    const ib = cabIb({ phases: 3, kw: 90, cosphi: 0.85, uV: 380 });
    expect(ib).toBeCloseTo(160.87, 2);
    const d = cabDerate({ insul: "xlpe", method: "E", airC: 40, groundC: 30, groupN: 3, groupArr: "trayPerforated" });
    expect(d.k).toBeCloseTo(0.7462, 4);
    const sel = cabSelect(200, d.k, cabAmpacity("xlpe", "E")) as any;
    expect(sel.itRequired).toBeCloseTo(268.02, 2);
    expect(sel.s).toBe(95);
    expect(sel.it).toBe(298);
    expect(sel.iz).toBeCloseTo(222.37, 2);
    expect((cabAdiabatic(13206, 0.1, 143) as any).sMinMm2).toBeCloseTo(29.2, 2);
    const vd = cabVd({ phases: 3, sMm2: 95, lenM: 60, ibA: ib, cosphi: 0.85, mat: "cu", u0V: 220, uV: 380 });
    expect(vd.uV).toBeCloseTo(2.35, 3);
    expect(vd.lineV!).toBeCloseTo(4.07, 3);
    expect(vd.pct).toBeCloseTo(1.071, 3);
  });
  it("single-phase lighting 2.461 % (L_max 30.48 m); socket 6.247 % FAIL (L_max 32.01 m)", () => {
    const a = cabVd({ phases: 1, sMm2: 1.5, lenM: 25, ibA: 8, cosphi: 0.9, mat: "cu", u0V: 220 });
    expect(a.uV).toBeCloseTo(5.414, 3);
    expect(a.pct).toBeCloseTo(2.461, 3);
    expect(cabLmax({ phases: 1, sMm2: 1.5, ibA: 8, cosphi: 0.9, mat: "cu", u0V: 220, limitPct: 3 })).toBeCloseTo(30.48, 2);
    const b = cabVd({ phases: 1, sMm2: 4, lenM: 40, ibA: 32, cosphi: 0.95, mat: "cu", u0V: 220 });
    expect(b.uV).toBeCloseTo(13.744, 3);
    expect(b.pct).toBeCloseTo(6.247, 3);
    expect(cabLmax({ phases: 1, sMm2: 4, ibA: 32, cosphi: 0.95, mat: "cu", u0V: 220, limitPct: 5 })).toBeCloseTo(32.01, 2);
  });
  it("buried D1 at 30 °C uses B.52.15: 0.93; It 107.53 A for In 100", () => {
    const d = cabDerate({ insul: "xlpe", method: "D1", airC: 40, groundC: 30, groupN: 1, groupArr: "bunched", soilRho: 2.5 });
    expect([d.kTemp, d.kSoil, d.kGroup, d.k]).toEqual([0.93, 1, 1, 0.93]);
    expect(d.tempTable).toBe("B.52.15");
    expect(100 / d.k).toBeCloseTo(107.53, 2);
  });
  it("motor output with η 0.95 → 169.34 A; gG allows In ≤ 201.52 A; t 0.05 s is refused", () => {
    expect(cabIb({ phases: 3, kw: 90, cosphi: 0.85, uV: 380, eta: 0.95 })).toBeCloseTo(169.34, 2);
    expect(cabCoord("gG", 200, 222.37).limitA).toBeCloseTo(201.52, 2);
    expect(cabAdiabatic(13206, 0.05, 143)).toEqual({ refused: "tBelow0.1s" });
  });
});
