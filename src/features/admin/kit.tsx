// Migrated from the prototype part(s): app_4c_moderation
import { useSyncExternalStore } from "react";
import {
  Minus, Plus, Search
} from "lucide-react";
import { SEVERITY } from "../../domain/moderation";
import { DIV_SPECS } from "../../ui/characters";
import { Num, Panel } from "../../ui/primitives";
import { fmt } from "../../ui/theme";

export function usePeek(store, key, fallback) { const get = () => (store.has(key) ? store.get(key) : fallback); return useSyncExternalStore(store.subscribe, get, get); }

export const SevChip = ({ n, className = "" }) => { const [l, cls] = SEVERITY[n] || SEVERITY[1]; return <span className={`inline-flex items-center gap-1.5 h-6 px-2 rounded-full border text-[11px] whitespace-nowrap ${cls} ${className}`}><span className="w-1.5 h-1.5 rounded-full bg-current" />{l}</span>; };

export const ToneChip = ({ tone = "default", children, className = "" }) => <span className={`inline-flex items-center gap-1 h-6 px-2 rounded-full border text-[11px] whitespace-nowrap ${tone === "bad" ? "text-bad bg-bad/15 border-bad/25" : tone === "warn" ? "text-warn bg-warn/15 border-warn/25" : tone === "good" ? "text-good bg-good/15 border-good/25" : tone === "accent" ? "text-accent bg-wash border-accent/25" : "text-ink-2 bg-elevated/80 border-line"} ${className}`}>{children}</span>;

export const STATUS_CHIP = { active: ["نشط", "good"], warned: ["تحذير", "warn"], suspended: ["موقوف", "bad"] };

export const faceOf = (acc) => (acc.as === "public" ? { as: "public", name: acc.name, userRole: acc.role, photo: acc.photo || undefined } : { as: "anon", anon: acc.anon, gender: acc.gender, userRole: acc.role, spec: acc.role !== "engineer" ? acc.role : acc.verified && DIV_SPECS.includes(acc.division) ? acc.division : acc.disc });

export const accName = (acc) => (acc.name ? acc.name : `#${acc.anon}`);

export const Kpi = ({ icon: I, label, value, sub, tone = "text-accent" }) => (<Panel className="p-4"><div className="flex items-center gap-2 text-[11.5px] text-ink-2 leading-snug"><I size={14} className={`shrink-0 ${tone}`} />{label}</div><div className="mt-1.5 text-[24px] leading-tight font-semibold tracking-[-0.03em]">{value}</div>{sub && <div className="mt-1 text-[11px] text-ink-3 leading-snug">{sub}</div>}</Panel>);

export const PanelHead = ({ icon: I, title, children }) => <div className="flex items-center justify-between gap-2 flex-wrap mb-3"><h3 className="text-[14px] font-medium inline-flex items-center gap-2">{I && <I size={16} className="text-accent" />}{title}</h3>{children}</div>;

// Column chart: one bar per point, oldest on the left; values on hover and in the accessible label
export const Columns = ({ data, value, label: aria, h = 120, tone = "bg-accent", xLabel = (d) => d.label }) => { const max = Math.max(1, ...data.map(value)); return (
  <div dir="ltr" role="img" aria-label={aria}>
    <div className="flex items-end gap-[2px]" style={{ height: h }}>{data.map((d, i) => <span key={i} title={`${xLabel(d)} · ${fmt(value(d))}`} className={`flex-1 min-w-[2px] rounded-t-[3px] ${tone} opacity-75 hover:opacity-100 transition-opacity`} style={{ height: `${Math.max(2, (value(d) / max) * 100)}%` }} />)}</div>
    <div className="mt-1 flex justify-between text-[10px] text-ink-3 font-grotesk"><span>{data[0] ? xLabel(data[0]) : ""}</span><span>{data.length > 2 ? xLabel(data[Math.floor(data.length / 2)]) : ""}</span><span>{data.length ? xLabel(data[data.length - 1]) : ""}</span></div>
  </div>); };

export const HBar = ({ label: l, value, max, shown, tone = "bg-accent", note = null }) => (<div className="text-[12px]"><div className="flex items-center justify-between gap-2"><span className="text-ink-2 truncate">{l}</span><span className="shrink-0 text-ink">{shown != null ? shown : <Num>{fmt(value)}</Num>}</span></div><div className="mt-1 h-2 rounded-full bg-elevated overflow-hidden"><span className={`block h-full rounded-full ${tone}`} style={{ width: `${Math.max(1.5, Math.min(100, (Math.abs(value) / (max || 1)) * 100))}%`, transition: "width .6s cubic-bezier(.2,.7,.2,1)" }} /></div>{note && <div className="mt-0.5 text-[10.5px] text-ink-3">{note}</div>}</div>);

export const BoxRow = ({ label: l, m, lo, hi }) => { const x = (v) => Math.max(0, Math.min(100, ((v - lo) / (hi - lo || 1)) * 100)); return (
  <div className="grid grid-cols-[84px_1fr] md:grid-cols-[112px_1fr] items-center gap-3 py-2 border-t border-line first:border-0">
    <span className="text-[12px] text-ink-2 leading-snug">{l}</span>
    <div><div dir="ltr" className="relative h-6" role="img" aria-label={`${l}: الربع الأدنى ${fmt(m.p25)}، الوسط ${fmt(m.p50)}، الربع الأعلى ${fmt(m.p75)}`}>
      <span className="absolute top-1/2 h-px bg-ink-4" style={{ left: `${x(m.p10)}%`, width: `${x(m.p90) - x(m.p10)}%` }} />
      <span className="absolute top-1 bottom-1 rounded-md bg-wash border border-accent/40" style={{ left: `${x(m.p25)}%`, width: `${Math.max(1, x(m.p75) - x(m.p25))}%` }} />
      <span className="absolute top-0 bottom-0 w-0.5 rounded bg-accent" style={{ left: `${x(m.p50)}%` }} />
    </div><div dir="ltr" className="flex justify-between text-[10px] text-ink-3 font-grotesk"><span>P10 {fmt(m.p10)}</span><span className="text-ink-2">P50 {fmt(m.p50)}</span><span>P90 {fmt(m.p90)}</span></div></div>
  </div>); };

export const Stepper = ({ value, onChange, min = 0, max = 10, label: l, unit = "" }) => (
  <div className="inline-flex items-center gap-1 rounded-xl border border-line-2 bg-canvas p-1" role="group" aria-label={l}>
    <button type="button" aria-label={`إنقاص ${l}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))} className="grid place-items-center w-9 h-9 rounded-lg text-ink-2 hover:bg-elevated disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><Minus size={15} /></button>
    <span className="min-w-[4.5rem] text-center text-[14px]"><Num>{value}</Num>{unit && <span className="text-[11px] text-ink-3"> {unit}</span>}</span>
    <button type="button" aria-label={`زيادة ${l}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} className="grid place-items-center w-9 h-9 rounded-lg text-ink-2 hover:bg-elevated disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><Plus size={15} /></button>
  </div>);

export const SearchBox = ({ value, onChange, placeholder }) => <label className="flex items-center gap-2 h-10 px-3 rounded-xl bg-canvas border border-line-2 focus-within:ring-2 focus-within:ring-accent min-w-0 flex-1"><Search size={15} className="text-ink-3 shrink-0" /><input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="w-full min-w-0 bg-transparent text-[13px] placeholder:text-ink-4 focus:outline-none" /></label>;

export const Choice = ({ items, value, onChange, label: l }) => <div role="radiogroup" aria-label={l} className="flex flex-wrap gap-1.5">{items.map(([v, t]) => <button key={String(v)} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)} className={`press h-9 px-3 rounded-full border text-[12.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${value === v ? "bg-wash border-accent/40 text-ink" : "bg-surface border-line-2 text-ink-2 hover:text-ink"}`}>{t}</button>)}</div>;


// ---- settings ----
export const SettingRow = ({ title, desc, children }) => <div className="py-3.5 flex items-start justify-between gap-4 flex-wrap border-t border-line first:border-0"><div className="min-w-0 max-w-[52ch]"><p className="text-[13.5px] font-medium">{title}</p><p className="mt-0.5 text-[11.5px] text-ink-2 leading-relaxed">{desc}</p></div><div className="shrink-0">{children}</div></div>;
