// =====================================================================
//  The public page's live tool: a slab a visitor can resize and reinforce, with the figures the app would print.
//  · The drawing is the slab itself (ui/drafting.tsx): it moves to its new shape on a spring as a slider moves, its mesh
//    follows the bar spacing, and its labels are the true dimensions.
//  · The three results roll to their new values; «طريقة الحساب» shows the working — the product's point, on the first screen.
//  No account, nothing stored: the numbers come from the same engines as the tools (./estimator.ts).
// =====================================================================
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { DraftSheet, IsoBox } from "../../ui/drafting";
import { Pick, Working } from "../../ui/kit";
import { Num } from "../../ui/primitives";
import { RollNumber } from "../../ui/roll";
import { SLAB_BARS, SLAB_DEFAULT, SLAB_RANGE, SLAB_SPACINGS, slabEstimate, type SlabInput } from "./estimator";

const fixed = (x: number, dp: number) => x.toFixed(dp);
const grouped = (x: number) => Math.round(x).toLocaleString("en-US");

function Slider({ label, unit, value, range, dp, onChange, id }: {
  label: string; unit: string; value: number; range: { min: number; max: number; step: number }; dp: number; onChange: (v: number) => void; id: string;
}) {
  return (
    <label className="block" htmlFor={id}>
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-[12.5px] text-ink-2">{label}</span>
        <span className="text-[13px]"><Num className="font-medium">{fixed(value, dp)}</Num> <span className="text-ink-3 text-[11.5px]">{unit}</span></span>
      </span>
      <input
        id={id}
        type="range"
        className="land-range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        data-slab={id}
      />
    </label>
  );
}

export function MiniTool({ onOpenApp }: { onOpenApp: () => void }) {
  const [v, setV] = useState<SlabInput>(SLAB_DEFAULT);
  const put = (patch: Partial<SlabInput>) => setV({ ...v, ...patch });
  const e = slabEstimate(v);
  const m = (x: number) => `${fixed(x, 2)} m`;
  return (
    <div className="rounded-3xl bg-surface border border-line-2 shadow-float overflow-hidden" data-mini-tool>
      <div className="flex items-center justify-between gap-3 px-5 pt-4">
        <p className="text-[14px] font-medium">جرّب الآن: بلاطة خرسانية</p>
        <span className="shrink-0 h-6 px-2.5 inline-flex items-center rounded-full bg-wash border border-accent/25 text-[11px] text-accent">بدون تسجيل</span>
      </div>
      <div className="px-3 pt-3">
        <DraftSheet label="N.T.S">
          <IsoBox
            L={v.L} B={v.B} H={v.tCm / 100}
            labels={{ L: m(v.L), B: m(v.B), H: `${fixed(v.tCm, 0)} cm` }}
            mesh={{ sx: v.spacingMm / 1000, sy: v.spacingMm / 1000 }}
            level="+3.20"
            title="بلاطة خرسانية بأبعادها وشبكة تسليحها"
          />
        </DraftSheet>
      </div>
      <div className="px-5 pt-4 grid gap-3.5 sm:grid-cols-3">
        <Slider id="L" label="الطول" unit="m" value={v.L} range={SLAB_RANGE.L} dp={2} onChange={(L) => put({ L })} />
        <Slider id="B" label="العرض" unit="m" value={v.B} range={SLAB_RANGE.B} dp={2} onChange={(B) => put({ B })} />
        <Slider id="t" label="السمك" unit="cm" value={v.tCm} range={SLAB_RANGE.tCm} dp={0} onChange={(tCm) => put({ tCm })} />
      </div>
      <div className="px-5 pt-3.5 grid gap-3 sm:grid-cols-2">
        <Pick label="قطر السيخ" items={SLAB_BARS.map((d) => [String(d), `Ø${d}`] as [string, string])} value={String(v.d)} onChange={(d) => put({ d: Number(d) })} />
        <Pick label="التقسيط (مم)" items={SLAB_SPACINGS.map((s) => [String(s), String(s)] as [string, string])} value={String(v.spacingMm)} onChange={(s) => put({ spacingMm: Number(s) })} />
      </div>
      <dl className="mt-4 grid grid-cols-3 border-y border-line bg-canvas/60" data-slab-results>
        {[
          ["اطلب من المحطة", fixed(e.orderM3, 1), "م³"],
          ["خلاطات 9 م³", String(e.trucks), "خلاطة"],
          ["حديد التسليح", grouped(e.steelKg), "كجم"],
        ].map(([label, value, unit], i) => (
          <div key={label} className={`px-3 sm:px-5 py-3.5 ${i ? "border-s border-line" : ""}`}>
            <dt className="text-[11.5px] text-ink-2 leading-snug">{label}</dt>
            <dd className="mt-1 leading-none"><Num className="text-[26px] sm:text-[30px] font-semibold"><RollNumber value={value} /></Num><span className="ms-1.5 text-[11.5px] text-ink-3">{unit}</span></dd>
          </div>
        ))}
      </dl>
      <div className="px-5 py-3.5 space-y-2.5">
        <p className="text-[12px] text-ink-2 leading-relaxed">
          صافي <Num>{fixed(e.netM3, 2)}</Num> م³ · هالك <Num>{e.wastePct}%</Num> · <Num>{e.bars.alongL + e.bars.alongB}</Num> سيخ · <Num>{fixed(e.kgPerM3, 0)}</Num> كجم/م³
        </p>
        <Working steps={e.steps} />
        <button type="button" data-mini-open onClick={onOpenApp} className="press w-full min-h-12 inline-flex items-center justify-center gap-2 rounded-xl bg-canvas border border-line-2 text-[13.5px] font-medium hover:border-line-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          خطة الصب وجدول التفريد كاملان في التطبيق <ArrowLeft size={16} className="ltr:-scale-x-100" />
        </button>
        <p className="text-[11px] text-ink-3 leading-relaxed">تقدير أولي بمحرك التطبيق نفسه: طبقة واحدة في الاتجاهين، بلا وصلات أو حديد علوي.</p>
      </div>
    </div>
  );
}
