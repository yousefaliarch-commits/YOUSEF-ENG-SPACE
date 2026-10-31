// The quantity take-off engine (src/domain/tools/qto-calc.ts), against figures worked by hand: plaster on both faces with
// openings under each IS 1200 band, masonry in m³ with a void under the threshold, tiles, waterproofing with upturns, skirting
// less a door, and the «deduct every opening» profile for contrast.
import { describe, expect, it } from "vitest";
import { RULES, computeQto, type QtoItem } from "../src/domain/tools/qto-calc";

const base = (o: Partial<QtoItem>): QtoItem => ({ id: "x", kind: "plaster", wbs: "B1/L1", desc: "", n: 1, L: 0, W: 0, H: 0, t: 0, faces: 1, byArea: false, upturn: 0, ceiling: false, openings: [], ...o });
const plaster = base({
  id: "p", kind: "plaster", desc: "بياض حائط", L: 5, H: 3, faces: 2, openings: [
    { id: "d", label: "باب", n: 1, w: 0.9, h: 2.1 },      // 1.89 m² → one face
    { id: "w", label: "شباك", n: 1, w: 1.5, h: 1.2 },     // 1.80 m² → one face
    { id: "v", label: "فتحة تهوية", n: 1, w: 0.4, h: 0.4 }, // 0.16 m² → none
    { id: "o", label: "فتحة كبيرة", n: 1, w: 2, h: 2 },   // 4.00 m² → both faces
  ],
});
const masonry = base({ id: "m", kind: "masonry", desc: "مباني 25 سم", n: 2, L: 6, H: 3, t: 0.25, openings: [{ id: "d", label: "باب", n: 1, w: 0.9, h: 2.1 }, { id: "v", label: "فتحة", n: 1, w: 0.3, h: 0.3 }] });
const tiles = base({ id: "t", kind: "tiles", desc: "بلاط", L: 4, W: 5, openings: [{ id: "s", label: "بئر", n: 1, w: 0.6, h: 0.6 }] });
const wp = base({ id: "w", kind: "waterproof", desc: "عزل", L: 4, W: 3, upturn: 0.3 });
const skirt = base({ id: "s", kind: "skirting", desc: "وزرة", L: 18, openings: [{ id: "d", label: "باب", n: 1, w: 0.9, h: 2.1 }] });

describe("quantity take-off — IS 1200 measurement rules", () => {
  const r = computeQto([plaster, masonry, tiles, wp, skirt], RULES.is1200);
  const by = (id: string) => r.lines.find((l) => l.id === id)!;
  it("plaster on two faces: ≤ 0.5 m² kept, 0.5–3 m² one face, > 3 m² both faces", () => {
    const l = by("p");
    expect(l.gross).toBeCloseTo(30, 9);
    expect(l.deductions.map((d) => d.faces)).toEqual([1, 1, 0, 2]);
    expect(l.deduct).toBeCloseTo(11.69, 9);
    expect(l.net).toBeCloseTo(18.31, 9);
    expect(l.deductions[2].rule).toMatch(/لا يُخصم/);
    expect(l.deductions[3].rule).toMatch(/الوجهين/);
  });
  it("masonry in m³: openings over 0.1 m² deducted through the wall thickness, for every repeated wall", () => {
    const l = by("m");
    expect(l.gross).toBeCloseTo(9, 9);
    expect(l.deduct).toBeCloseTo(0.945, 9);   // 2 walls × 1.89 m² × 0.25 m; the 0.09 m² void stays
    expect(l.net).toBeCloseTo(8.055, 9);
    expect(l.unit).toBe("م³");
  });
  it("tiles, waterproofing with upturns, skirting less the door width", () => {
    expect(by("t").net).toBeCloseTo(19.64, 9);
    expect(by("w").gross).toBeCloseTo(16.2, 9);  // 4 × 3 + 2 × (4 + 3) × 0.3
    expect(by("s").net).toBeCloseTo(17.1, 9);
    expect(by("s").unit).toBe("م.ط");
  });
  it("totals by kind and unit", () => {
    const t = r.totals.find((x) => x.kind === "plaster")!;
    expect(t.net).toBeCloseTo(18.31, 9);
    expect(r.totals.find((x) => x.kind === "masonry")!.unit).toBe("م³");
  });
  it("the «deduct every opening» profile deducts every face of every opening", () => {
    const all = computeQto([plaster], RULES.all).lines[0];
    expect(all.deduct).toBeCloseTo(15.7, 9);   // (1.89 + 1.8 + 0.16 + 4) × 2
  });
  it("flags missing dimensions, an opening taller than the wall and deductions larger than the area", () => {
    const bad = computeQto([base({ id: "z", desc: "حائط", L: 1, H: 1, faces: 1, openings: [{ id: "o", label: "باب", n: 2, w: 0.9, h: 2.1 }] }), base({ id: "e", desc: "فارغ" })], RULES.is1200);
    expect(bad.issues.some((i) => /أكبر من ارتفاع الحائط/.test(i.text))).toBe(true);
    expect(bad.issues.some((i) => /الخصومات/.test(i.text))).toBe(true);
    expect(bad.issues.some((i) => /أبعاد ناقصة/.test(i.text))).toBe(true);
    expect(bad.lines[0].net).toBe(0);
  });
});
