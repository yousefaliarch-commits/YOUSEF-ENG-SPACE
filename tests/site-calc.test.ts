// src/domain/site-calc.ts — rebar, concrete, masonry and unit conversions
import { describe, expect, it } from "vitest";
import { concreteMaterials, convert, elementVolume, masonry, rebarKgPerM, rebarOrder } from "../src/domain/site-calc";

describe("rebar", () => {
  it("weight per metre matches the d²/162 rule and the standard tables", () => {
    expect(rebarKgPerM(10)).toBeCloseTo(0.617, 3); expect(rebarKgPerM(12)).toBeCloseTo(0.888, 3); expect(rebarKgPerM(16)).toBeCloseTo(1.578, 3);
    expect(rebarKgPerM(25)).toBeCloseTo(3.853, 3); expect(Math.abs(rebarKgPerM(20) - 400 / 162)).toBeLessThan(0.01);
  });
  it("orders whole 12 m stock bars from the cut lengths", () => {
    const r = rebarOrder(16, 40, 5.5, 12, 0); // two 5.5 m pieces per 12 m bar
    expect(r.perBar).toBe(2); expect(r.bars).toBe(20); expect(r.totalLength).toBe(220); expect(r.kg).toBeCloseTo(220 * 1.578, 0);
    expect(rebarOrder(20, 10, 14, 12, 0).bars).toBe(12); // longer than stock: by length (laps not included)
  });
});

describe("concrete", () => {
  it("volumes of common elements", () => {
    expect(elementVolume({ kind: "slab", a: 10, b: 8, c: 0.15 })).toBeCloseTo(12);
    expect(elementVolume({ kind: "column", count: 12, a: 0.3, b: 0.6, c: 3 })).toBeCloseTo(6.48);
    expect(elementVolume({ kind: "round", count: 4, a: 0.5, c: 3 })).toBeCloseTo(4 * Math.PI * 0.0625 * 3);
  });
  it("materials for a volume with waste", () => {
    const m = concreteMaterials(10, 5); expect(m.volume).toBeCloseTo(10.5); expect(m.cementKg).toBeCloseTo(3675); expect(m.cementBags).toBe(74);
    expect(m.sand).toBeCloseTo(4.2); expect(m.gravel).toBeCloseTo(8.4);
  });
});

describe("masonry", () => {
  it("red brick, half-brick wall: about 54 bricks a square metre with 1 cm joints", () => {
    const w = masonry({ length: 5, height: 3, unit: "red", leaves: 1, wastePct: 0 }); expect(w.area).toBe(15);
    expect(w.perM2).toBeGreaterThan(53); expect(w.perM2).toBeLessThan(55); expect(w.thickness).toBeCloseTo(0.12);
  });
  it("one-brick wall doubles the bricks; openings are deducted", () => {
    const one = masonry({ length: 5, height: 3, unit: "red", leaves: 2, wastePct: 0 }); expect(one.perM2).toBeGreaterThan(105);
    expect(masonry({ length: 5, height: 3, openings: 3, unit: "block20" }).area).toBe(12);
  });
});

describe("units", () => {
  it("Egyptian land units and engineering units", () => {
    expect(convert("area", 1, "feddan", "qirat")).toBeCloseTo(24, 1); expect(convert("area", 1, "qirat", "sahm")).toBeCloseTo(24, 1);
    expect(convert("stress", 1, "MPa", "kgcm2")).toBeCloseTo(10.197, 2); expect(convert("force", 1, "t", "kN")).toBeCloseTo(9.807, 2);
    expect(convert("length", 1, "ft", "m")).toBeCloseTo(0.3048);
  });
});
