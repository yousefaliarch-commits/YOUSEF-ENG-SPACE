// The interim payment certificate engine (src/domain/tools/ipc-calc.ts), against figures worked by hand:
// a 10,000,000 EGP contract, three BOQ items (one over its contract quantity), 10 % retention capped at 5 % of the contract,
// a 1,000,000 advance, 14 % VAT and a 1 % withholding deduction — the cumulative previous · current · total method.
import { describe, expect, it } from "vitest";
import { computeIpc, nextCertificateItems, type IpcItem, type IpcTerms } from "../src/domain/tools/ipc-calc";

const items: IpcItem[] = [
  { id: "1", ref: "1.1", desc: "حفر", unit: "م³", qtyContract: 5000, rate: 120, qtyPrev: 3000, qtyCur: 1500 },
  { id: "2", ref: "2.1", desc: "خرسانة مسلحة", unit: "م³", qtyContract: 2000, rate: 4500, qtyPrev: 800, qtyCur: 400 },
  { id: "3", ref: "3.1", desc: "مباني", unit: "م³", qtyContract: 1000, rate: 1800, qtyPrev: 0, qtyCur: 1100 },
];
const terms = (o: Partial<IpcTerms> = {}): IpcTerms => ({
  contractAmount: 10_000_000, retentionPct: 10, retentionLimitPct: 5, advanceAmount: 1_000_000, advanceMethod: "proportional",
  fidicStartPct: 10, fidicRatePct: 25, advanceRecoveredPrev: 0, vatPct: 14, vatOn: "gross",
  deductions: [{ id: "w", name: "خصم من المنبع", mode: "pct", pct: 1, prev: 0, cur: 0 }], ...o,
});

describe("interim payment certificate — cumulative method", () => {
  const r = computeIpc(items, terms());
  it("item values: quantity × rate, cumulative quantity, progress, over-run flagged", () => {
    expect(r.lines.map((l) => [l.qtyTotal, l.amtPrev, l.amtCur, l.amtTotal])).toEqual([
      [4500, 360_000, 180_000, 540_000], [1200, 3_600_000, 1_800_000, 5_400_000], [1100, 0, 1_980_000, 1_980_000],
    ]);
    expect(r.lines[0].progress).toBe(0.9);
    expect(r.lines.map((l) => l.overrun)).toEqual([false, false, true]);
    expect(r.issues.some((i) => i.ref === "3.1" && /تتجاوز كمية العقد/.test(i.text) && /10\.0%/.test(i.text))).toBe(true);
  });
  it("gross, retention (capped at 5 % of the contract), proportional advance recovery", () => {
    expect(r.s.gross).toEqual({ prev: 3_960_000, cur: 3_960_000, total: 7_920_000 });
    expect(r.s.retention).toEqual({ prev: 396_000, cur: 104_000, total: 500_000 });
    expect(r.s.retentionCapped).toBe(true);
    expect(r.s.advance).toEqual({ prev: 396_000, cur: 396_000, total: 792_000 });
    expect(r.s.netBeforeVat).toEqual({ prev: 3_168_000, cur: 3_460_000, total: 6_628_000 });
  });
  it("VAT 14 % on the gross, a 1 % deduction, and the amount payable", () => {
    expect(r.s.vat).toEqual({ prev: 554_400, cur: 554_400, total: 1_108_800 });
    expect(r.s.deductions[0].t).toEqual({ prev: 39_600, cur: 39_600, total: 79_200 });
    expect(r.s.payable).toEqual({ prev: 3_682_800, cur: 3_974_800, total: 7_657_600 });
    // current = total − previous, everywhere
    for (const t of [r.s.gross, r.s.retention, r.s.advance, r.s.vat, r.s.payable]) expect(t.cur).toBeCloseTo(t.total - t.prev, 6);
  });
  it("VAT on the net after retention and advance when the contract says so", () => {
    expect(computeIpc(items, terms({ vatOn: "net" })).s.vat.cur).toBeCloseTo(0.14 * 3_460_000, 6);
  });
  it("FIDIC 14.2: no recovery until 10 % is certified, then 25 % of each certificate until repaid", () => {
    const early = computeIpc([{ ...items[0], qtyPrev: 0, qtyCur: 5000 }], terms({ advanceMethod: "fidic" }));
    expect(early.s.gross.total).toBe(600_000);            // ≤ 1,000,000 threshold
    expect(early.s.advance.cur).toBe(0);
    const on = computeIpc(items, terms({ advanceMethod: "fidic" }));
    expect(on.s.advance).toEqual({ prev: 0, cur: 990_000, total: 990_000 });   // 25 % × 3,960,000
    const next = nextCertificateItems(items).map((it) => (it.id === "2" ? { ...it, qtyCur: 200 } : it));
    const last = computeIpc(next, terms({ advanceMethod: "fidic", advanceRecoveredPrev: 990_000, retentionLimitPct: null }));
    expect(last.s.gross.cur).toBe(900_000);
    expect(last.s.advance).toEqual({ prev: 990_000, cur: 10_000, total: 1_000_000 }); // only the balance is left
    expect(last.s.advanceRepaid).toBe(true);
  });
  it("the next certificate carries totals into the previous column and starts the period at zero", () => {
    expect(nextCertificateItems(items).map((i) => [i.qtyPrev, i.qtyCur])).toEqual([[4500, 0], [1200, 0], [1100, 0]]);
  });
  it("explains problems in engineering terms: negative cumulative quantity, missing rate, missing contract amount", () => {
    const bad = computeIpc([{ ...items[0], qtyPrev: 10, qtyCur: -20 }, { ...items[1], rate: 0 }], terms({ contractAmount: 0 }));
    expect(bad.issues.map((i) => i.level)).toEqual(expect.arrayContaining(["error", "warn"]));
    expect(bad.issues.some((i) => /سالبة/.test(i.text))).toBe(true);
    expect(bad.issues.some((i) => /لا توجد فئة سعر/.test(i.text))).toBe(true);
    expect(bad.issues.some((i) => /أدخل قيمة العقد/.test(i.text))).toBe(true);
  });
});
