// =====================================================================
//  Technical-office and site tools (Feature 6): concrete, rebar, masonry, units. All on this device; every default can be
//  changed on screen, and each result says it is an estimate to check against the approved drawings and specification.
// =====================================================================
import { useState } from "react";
import { CONVERT, MIX, REBAR_SIZES, UNITS, concreteMaterials, convert, elementVolume, masonry, rebarKgPerM, rebarOrder } from "../../domain/site-calc";
import { Field, Result } from "../../ui/chrome";
import { FilterChip, Num } from "../../ui/primitives";
import { fmt } from "../../ui/theme";

const f1 = (n: number, d = 2) => (Number.isFinite(n) ? n.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: 0 }) : "—");
const Note = ({ children }: any) => <p className="mt-3 text-[11px] text-ink-3 leading-relaxed">{children}</p>;
const Rows = ({ rows }: any) => <ul className="mt-2 space-y-1.5 text-[12.5px]">{rows.map(([k, v, u]: any) => <li key={k} className="flex justify-between gap-3 text-ink-2"><span>{k}</span><span><Num className="text-ink">{v}</Num>{u ? <span className="text-[11px] text-ink-3"> {u}</span> : null}</span></li>)}</ul>;

const ELEMENTS: [string, string, [string, string][]][] = [
  ["slab", "بلاطة", [["a", "الطول"], ["b", "العرض"], ["c", "السمك"]]],
  ["beam", "كمرة", [["a", "الطول"], ["b", "العرض"], ["c", "العمق"]]],
  ["column", "عمود", [["a", "العرض"], ["b", "الطول"], ["c", "الارتفاع"]]],
  ["round", "عمود دائري", [["a", "القطر"], ["c", "الارتفاع"]]],
  ["footing", "قاعدة", [["a", "الطول"], ["b", "العرض"], ["c", "السمك"]]],
  ["wall", "حائط خرساني", [["a", "الطول"], ["b", "السمك"], ["c", "الارتفاع"]]],
];

export function ConcreteTool() {
  const [kind, setKind] = useState<any>("slab"); const [v, setV] = useState<any>({ count: "1", a: "10", b: "8", c: "0.15" });
  const [waste, setWaste] = useState<any>("5"); const [cement, setCement] = useState<any>(String(MIX.cement));
  const el = ELEMENTS.find((e) => e[0] === kind); const vol = elementVolume({ kind, count: Number(v.count), a: Number(v.a), b: Number(v.b), c: Number(v.c) });
  const m = concreteMaterials(vol, Number(waste) || 0, { ...MIX, cement: Number(cement) || MIX.cement });
  return (<div>
    <div className="-mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar">{ELEMENTS.map(([id, l]) => <FilterChip key={id} on={kind === id} onClick={() => setKind(id)}>{l}</FilterChip>)}</div>
    <div className="mt-3 grid grid-cols-2 gap-2"><Field label="العدد" value={v.count} onChange={(x) => setV({ ...v, count: x })} unit="" />{el[2].map(([k, l]) => <Field key={k} label={l} value={v[k]} onChange={(x) => setV({ ...v, [k]: x })} unit="م" />)}<Field label="هالك %" value={waste} onChange={setWaste} unit="%" /><Field label="أسمنت / م³" value={cement} onChange={setCement} unit="كجم" /></div>
    <Result><p className="text-[11px] text-ink-2">حجم الخرسانة مع الهالك</p><p className="mt-1"><Num className="text-[32px] font-semibold">{f1(m.volume)}</Num> <span className="text-[13px] text-ink-2">م³</span></p>
      <Rows rows={[["الحجم الصافي", f1(vol), "م³"], ["أسمنت", fmt(Math.round(m.cementKg)), "كجم"], ["شكائر أسمنت (50 كجم)", fmt(m.cementBags), "شيكارة"], ["رمل", f1(m.sand), "م³"], ["زلط / سن", f1(m.gravel), "م³"]]} /></Result>
    <Note>تقدير للحصر والطلب: نسب الخلطة الشائعة للخرسانة المسلحة في مصر (350 كجم أسمنت، 0.4 م³ رمل، 0.8 م³ زلط لكل م³) — غيّرها حسب تصميم الخلطة المعتمد. الخرسانة الجاهزة تُطلب بالمتر المكعب مباشرة.</Note>
  </div>);
}

export function RebarTool() {
  const [d, setD] = useState<any>(16); const [count, setCount] = useState<any>("40"); const [len, setLen] = useState<any>("5.5"); const [waste, setWaste] = useState<any>("5");
  const r = rebarOrder(d, Number(count) || 0, Number(len) || 0, 12, Number(waste) || 0);
  return (<div>
    <div className="-mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar">{REBAR_SIZES.map((x) => <FilterChip key={x} on={d === x} onClick={() => setD(x)}>Ø<Num>{x}</Num></FilterChip>)}</div>
    <div className="mt-3 grid grid-cols-3 gap-2"><Field label="عدد الأسياخ" value={count} onChange={setCount} unit="" /><Field label="طول السيخ" value={len} onChange={setLen} unit="م" /><Field label="هالك %" value={waste} onChange={setWaste} unit="%" /></div>
    <Result><p className="text-[11px] text-ink-2">وزن Ø{d} المطلوب</p><p className="mt-1"><Num className="text-[32px] font-semibold">{f1(r.tons, 3)}</Num> <span className="text-[13px] text-ink-2">طن</span></p>
      <Rows rows={[["الوزن", fmt(Math.round(r.kg)), "كجم"], ["الطول الكلي", f1(r.totalLength, 1), "م"], ["وزن المتر الطولي", f1(rebarKgPerM(d), 3), "كجم/م"], ["أسياخ 12 م للطلب", fmt(r.bars), "سيخ"], ...(r.perBar ? [["قطع من كل سيخ 12 م", r.perBar, ""]] : [])]} /></Result>
    <details className="mt-3 rounded-xl border border-line bg-surface"><summary className="px-3 py-2.5 text-[12.5px] cursor-pointer">جدول أوزان الحديد</summary>
      <ul className="px-3 pb-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[12px]">{REBAR_SIZES.map((x) => <li key={x} className="flex justify-between"><span>Ø<Num>{x}</Num></span><span><Num>{f1(rebarKgPerM(x), 3)}</Num> كجم/م</span></li>)}</ul></details>
    <Note>الوزن = π × ق² ÷ 4 × 7850 كجم/م³ (≈ ق² ÷ 162). أطوال الرباط والجنشات غير محسوبة هنا — أضفها لطول السيخ حسب اللوحات والكود.</Note>
  </div>);
}

export function MasonryTool() {
  const [o, setO] = useState<any>({ length: "5", height: "3", openings: "2", unit: "red", leaves: 1, joint: "1", waste: "5" });
  const w = masonry({ length: Number(o.length), height: Number(o.height), openings: Number(o.openings), unit: o.unit, leaves: o.leaves, joint: Number(o.joint), wastePct: Number(o.waste) });
  const brick = o.unit === "red" || o.unit === "cement";
  return (<div>
    <div className="-mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar">{Object.entries(UNITS).map(([id, u]) => <FilterChip key={id} on={o.unit === id} onClick={() => setO({ ...o, unit: id, leaves: id.startsWith("block") ? 1 : o.leaves })}>{u.name}</FilterChip>)}</div>
    {brick && <div className="mt-2 flex gap-2">{[[1, "نص طوبة"], [2, "طوبة كاملة"]].map(([n, l]: any) => <FilterChip key={n} on={o.leaves === n} onClick={() => setO({ ...o, leaves: n })}>{l}</FilterChip>)}</div>}
    <div className="mt-3 grid grid-cols-2 gap-2"><Field label="طول الحائط" value={o.length} onChange={(x) => setO({ ...o, length: x })} unit="م" /><Field label="الارتفاع" value={o.height} onChange={(x) => setO({ ...o, height: x })} unit="م" /><Field label="مساحة الفتحات" value={o.openings} onChange={(x) => setO({ ...o, openings: x })} unit="م²" /><Field label="سمك العرموس" value={o.joint} onChange={(x) => setO({ ...o, joint: x })} unit="سم" /><Field label="هالك %" value={o.waste} onChange={(x) => setO({ ...o, waste: x })} unit="%" /></div>
    <Result><p className="text-[11px] text-ink-2">العدد المطلوب مع الهالك</p><p className="mt-1"><Num className="text-[32px] font-semibold">{fmt(w.units)}</Num> <span className="text-[13px] text-ink-2">{brick ? "طوبة" : "بلوكة"}</span></p>
      <Rows rows={[["المساحة الصافية", f1(w.area), "م²"], ["سمك الحائط", fmt(Math.round(w.thickness * 100)), "سم"], ["العدد لكل م²", f1(w.perM2, 1), ""], ["حجم المونة تقريبًا", f1(w.mortar, 3), "م³"]]} /></Result>
    <Note>تقدير: يعتمد على مقاس الوحدة وسمك العرموس. راجع مقاس الطوب الفعلي في الموقع (يختلف بين المصانع) وأضف هالك الكسر والقص.</Note>
  </div>);
}

export function UnitsTool() {
  const [kind, setKind] = useState<any>("area"); const u = CONVERT[kind].units; const [from, setFrom] = useState<any>("feddan"); const [val, setVal] = useState<any>("1");
  const pick = (k?: any) => { setKind(k); setFrom(CONVERT[k].units[1] ? CONVERT[k].units[1][0] : CONVERT[k].units[0][0]); };
  const x = Number(val) || 0;
  return (<div>
    <div className="-mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar">{Object.entries(CONVERT).map(([id, c]) => <FilterChip key={id} on={kind === id} onClick={() => pick(id)}>{c.label}</FilterChip>)}</div>
    <div className="mt-3"><Field label="القيمة" value={val} onChange={setVal} unit="" /></div>
    <div className="mt-2 -mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar">{u.map(([id, l]) => <FilterChip key={id} on={from === id} onClick={() => setFrom(id)}>{l}</FilterChip>)}</div>
    <Result><ul className="space-y-2 text-[13.5px]">{u.filter(([id]) => id !== from).map(([id, l]) => <li key={id} className="flex justify-between gap-3"><span className="text-ink-2">{l}</span><Num className="font-semibold">{f1(convert(kind, x, from, id), 4)}</Num></li>)}</ul></Result>
    {kind === "area" && <Note>الفدان = 24 قيراطًا ≈ 4,200.83 م² · القيراط = 24 سهمًا ≈ 175.03 م².</Note>}
  </div>);
}

export const SITE_TOOL_VIEWS = { concrete: ConcreteTool, rebar: RebarTool, masonry: MasonryTool, units: UnitsTool };
