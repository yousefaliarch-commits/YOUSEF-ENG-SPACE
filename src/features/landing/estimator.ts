// =====================================================================
//  The public page's slab estimator — the same engines the app's tools use (concrete take-off and pour planner, bar
//  spacing), with the pour tool's own defaults, so the figures a visitor sees are the figures the app prints.
//  · One solid slab: length × width × thickness, one layer of bars both ways at one spacing.
//  · An estimate to try the product, said as such: no laps, hooks or top steel (the bar bending schedule does those).
//  Pure: tests pin it to the concrete tool's document.
// =====================================================================
import { concPour, concTakeoff } from "../../domain/tools/concrete-calc";
import { kgPerM } from "../../domain/tools/bbs-calc";
import { tradeBarSpacing } from "../../domain/tools/trade-calc";

export type SlabInput = { L: number; B: number; tCm: number; d: number; spacingMm: number };

export const SLAB_DEFAULT: SlabInput = { L: 6, B: 4, tCm: 15, d: 12, spacingMm: 150 };
export const SLAB_RANGE = { L: { min: 2, max: 14, step: 0.25 }, B: { min: 2, max: 10, step: 0.25 }, tCm: { min: 10, max: 40, step: 1 } };
export const SLAB_BARS = [10, 12, 16];
export const SLAB_SPACINGS = [100, 125, 150, 200];
export const SLAB_COVER_MM = 25;
// the pour tool's defaults (features/tools/concrete/concrete.tsx → blank().order)
export const POUR_DEFAULTS = { primingM3: 0.5, loadM3: 9, pumpM3h: 30, plantM3h: 60, crewM3h: 40, travelMin: 25, loadMin: 10, washMin: 12, setupMin: 45, cleanupMin: 30, start: "07:00" };

const clamp = (x: number, lo: number, hi: number) => (Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : lo);
export const clampSlab = (i: SlabInput): SlabInput => ({
  L: clamp(i.L, SLAB_RANGE.L.min, SLAB_RANGE.L.max),
  B: clamp(i.B, SLAB_RANGE.B.min, SLAB_RANGE.B.max),
  tCm: clamp(i.tCm, SLAB_RANGE.tCm.min, SLAB_RANGE.tCm.max),
  d: SLAB_BARS.includes(i.d) ? i.d : SLAB_DEFAULT.d,
  spacingMm: SLAB_SPACINGS.includes(i.spacingMm) ? i.spacingMm : SLAB_DEFAULT.spacingMm,
});

export type SlabStep = { label: string; expr: string; value: string };
export type SlabEstimate = {
  netM3: number; wastePct: number; orderM3: number; trucks: number; formworkM2: number;
  bars: { alongL: number; alongB: number }; steelKg: number; kgPerM3: number; steps: SlabStep[];
};

const f = (x: number, dp: number) => x.toFixed(dp);

export function slabEstimate(input: SlabInput): SlabEstimate {
  const i = clampSlab(input);
  const t = i.tCm / 100;
  const take = concTakeoff([{ id: "1", kind: "slab", label: "", n: 1, dims: { L: i.L, B: i.B, t, open: null } }]);
  const pour = concPour({ orderM3: take.orderM3, ...POUR_DEFAULTS });
  // bars running along the length are spaced across the width, and the other way round
  const alongL = tradeBarSpacing({ clearM: i.B, coverMm: SLAB_COVER_MM, spacingMm: i.spacingMm, d: i.d, otherLenM: i.L });
  const alongB = tradeBarSpacing({ clearM: i.L, coverMm: SLAB_COVER_MM, spacingMm: i.spacingMm, d: i.d, otherLenM: i.B });
  const steelKg = alongL.kg + alongB.kg;
  const w = take.rows[0].wastePct;
  return {
    netM3: take.netM3, wastePct: w, orderM3: pour.vOrderM3, trucks: pour.trucks, formworkM2: take.formworkM2,
    bars: { alongL: alongL.bars, alongB: alongB.bars }, steelKg, kgPerM3: take.netM3 > 0 ? steelKg / take.netM3 : 0,
    steps: [
      { label: "الحجم الصافي", expr: `${f(i.L, 2)} × ${f(i.B, 2)} × ${f(t, 2)}`, value: `${f(take.netM3, 2)} m³` },
      { label: "الطلب من المحطة", expr: `${f(take.netM3, 2)} × (1 + ${w}%) + ${POUR_DEFAULTS.primingM3}`, value: `${f(pour.vOrderM3, 2)} m³` },
      { label: "عدد الخلاطات", expr: `⌈${f(pour.vOrderM3, 2)} ÷ ${POUR_DEFAULTS.loadM3}⌉`, value: String(pour.trucks) },
      { label: "الأسياخ في الاتجاهين", expr: `⌈(B − 2×${SLAB_COVER_MM} mm) ÷ ${i.spacingMm}⌉ + 1 · ⌈(L − 2×${SLAB_COVER_MM} mm) ÷ ${i.spacingMm}⌉ + 1`, value: `${alongL.bars} + ${alongB.bars}` },
      { label: "وزن الحديد", expr: `(${alongL.bars} × ${f(i.L, 2)} + ${alongB.bars} × ${f(i.B, 2)}) × ${kgPerM(i.d)} kg/m`, value: `${f(steelKg, 0)} kg` },
    ],
  };
}
