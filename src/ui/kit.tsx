// =====================================================================
//  Tools UI kit — the pieces every tool screen is built from (docs/TOOLS-BLUEPRINT.md §5d)
//  · Thumb-first: 48 px targets, numbers typed in any digits (num-input.ts), a problem shown under the field, never a zero
//    for "nothing typed". Results are big and LTR; every calculation can show its working.
//  · The export bar is a `.foot` bar (pads for the home indicator itself); the preview draws the same pages as the PDF.
// =====================================================================
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronUp, Copy, Eye, FileDown, Plus, Share2, Trash2, X } from "lucide-react";
import { numInputProblem, type NumInputRule } from "../lib/num-input";
import { FilterChip, Num } from "./primitives";
import type { DrawPage, TraceStep } from "../doc/model";

// ---- inputs ----
export function NumField({ label, value, onChange, unit, hint, rule, compact = false, ...p }: {
  label: string; value: string; onChange: (v: string) => void; unit?: string; hint?: string; rule?: NumInputRule; compact?: boolean;
  [k: string]: any;
}) {
  const problem = value ? numInputProblem(value, rule) : null;
  return (
    <label className="block min-w-0">
      <span className="block text-[12px] text-ink-2 mb-1 leading-snug">{label}</span>
      <span className={`flex items-center gap-2 ${compact ? "h-11 px-3" : "h-12 px-3.5"} rounded-xl bg-canvas border ${problem ? "border-bad" : "border-line-2"} focus-within:ring-2 focus-within:ring-accent`}>
        <input
          {...p}
          dir="ltr"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-w-0 bg-transparent font-grotesk text-[17px] text-ink placeholder:text-ink-4 focus:outline-none"
        />
        {unit && <span className="shrink-0 text-[12px] text-ink-2">{unit}</span>}
      </span>
      {problem ? <span className="block mt-1 text-[11px] text-bad">{problem}</span> : hint ? <span className="block mt-1 text-[11px] text-ink-3">{hint}</span> : null}
    </label>
  );
}

export function TextField({ label, value, onChange, placeholder, dir, ...p }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; dir?: string; [k: string]: any }) {
  return (
    <label className="block min-w-0">
      <span className="block text-[12px] text-ink-2 mb-1">{label}</span>
      <input
        {...p}
        dir={dir || "auto"}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-12 px-3.5 rounded-xl bg-canvas border border-line-2 text-[15px] text-ink placeholder:text-ink-4 focus:outline-none focus:ring-2 focus:ring-accent"
      />
    </label>
  );
}

export function AreaField({ label, value, onChange, placeholder, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <label className="block">
      <span className="block text-[12px] text-ink-2 mb-1">{label}</span>
      <textarea
        dir="auto"
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line-2 text-[15px] leading-relaxed text-ink placeholder:text-ink-4 focus:outline-none focus:ring-2 focus:ring-accent"
      />
    </label>
  );
}

export function Pick<T extends string>({ label, items, value, onChange }: { label?: string; items: [T, string][]; value: T; onChange: (v: T) => void }) {
  return (
    <div>
      {label && <span className="block text-[12px] text-ink-2 mb-1.5">{label}</span>}
      <div className="-mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar">
        {items.map(([id, l]) => (
          <FilterChip key={id} on={value === id} onClick={() => onChange(id)}>{l}</FilterChip>
        ))}
      </div>
    </div>
  );
}

export function Check({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="checkbox" aria-checked={on} onClick={() => onChange(!on)}
      className={`press w-full min-h-12 flex items-center gap-3 px-3.5 rounded-xl border text-start text-[14px] ${on ? "bg-wash border-accent/40" : "bg-surface border-line-2"}`}>
      <span className={`grid place-items-center w-5 h-5 shrink-0 rounded-md border ${on ? "bg-accent border-accent text-on-accent" : "border-line-3"}`}>{on ? "✓" : ""}</span>
      <span className="min-w-0 flex-1 leading-snug">{label}</span>
    </button>
  );
}

// ---- layout ----
export function Card({ title, children, action, className = "" }: { title?: string; children: any; action?: any; className?: string }) {
  return (
    <section className={`p-4 rounded-2xl bg-surface border border-line ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-2 mb-3">
          {title && <h2 className="text-[14px] font-medium">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export const Grid2 = ({ children }: { children: any }) => <div className="grid grid-cols-2 gap-2.5">{children}</div>;

export const Note = ({ children, tone = "quiet" }: { children: any; tone?: "quiet" | "warn" }) => (
  <p className={`text-[11.5px] leading-relaxed ${tone === "warn" ? "p-3 rounded-xl bg-warn/10 text-warn border border-warn/25" : "text-ink-3"}`}>{children}</p>
);

// ---- results ----
export function ResultHero({ label, value, unit, sub, tone = "accent" }: { label: string; value: string; unit?: string; sub?: string; tone?: "accent" | "good" | "bad" }) {
  const ring = tone === "bad" ? "border-bad/40 bg-bad/5" : tone === "good" ? "border-good/40 bg-good/5" : "border-accent/25 bg-wash";
  return (
    <div className={`p-4 rounded-2xl border ${ring}`} data-tool-result="hero">
      <p className="text-[12px] text-ink-2">{label}</p>
      <p className="mt-1 leading-none"><Num className="text-[34px] font-semibold">{value}</Num>{unit && <span className="ms-1.5 text-[13px] text-ink-2">{unit}</span>}</p>
      {sub && <p className="mt-2 text-[12px] text-ink-2 leading-snug">{sub}</p>}
    </div>
  );
}

export function Rows({ rows }: { rows: [string, string, string?][] }) {
  return (
    <ul className="space-y-1.5 text-[13px]">
      {rows.map(([k, v, u], i) => (
        <li key={k + i} className="flex items-baseline justify-between gap-3 text-ink-2">
          <span className="min-w-0">{k}</span>
          <span className="shrink-0"><Num className="text-ink font-medium">{v}</Num>{u ? <span className="ms-1 text-[11px]">{u}</span> : null}</span>
        </li>
      ))}
    </ul>
  );
}

export type CheckLine = { label: string; value: string; limit: string; ok: boolean | null; clause?: string };

export function Checks({ items }: { items: CheckLine[] }) {
  return (
    <ul className="space-y-2">
      {items.map((c, i) => (
        <li key={i} className={`p-3 rounded-xl border text-[12.5px] ${c.ok === false ? "border-bad/40 bg-bad/5" : c.ok ? "border-line bg-surface" : "border-line-2 bg-canvas"}`}>
          <div className="flex items-start justify-between gap-2">
            <span className="min-w-0 leading-snug">{c.label}</span>
            <span className={`shrink-0 text-[12px] font-medium ${c.ok === false ? "text-bad" : c.ok ? "text-good" : "text-ink-3"}`}>{c.ok === false ? "غير مطابق ✗" : c.ok ? "مطابق ✓" : "—"}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 text-ink-3 text-[11.5px]">
            <span><Num>{c.value}</Num></span>
            <span>الحد: <Num>{c.limit}</Num></span>
            {c.clause && <span>{c.clause}</span>}
          </div>
        </li>
      ))}
    </ul>
  );
}

// «طريقة الحساب»: the working, step by step
export function Working({ steps }: { steps: TraceStep[] }) {
  const [open, setOpen] = useState(false);
  if (!steps.length) return null;
  return (
    <div>
      <button type="button" onClick={() => setOpen(!open)} className="press inline-flex items-center gap-1 min-h-10 text-[12.5px] text-accent">
        طريقة الحساب {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>
      {open && (
        <ol className="mt-1 space-y-1.5 text-[12px] text-ink-2">
          {steps.map((s, i) => (
            <li key={i} className="p-2.5 rounded-lg bg-canvas border border-line">
              <span className="block text-ink">{s.label}</span>
              <bdi dir="ltr" className="block font-grotesk text-[12px]">{s.expr} = {s.value}</bdi>
              {s.clause && <span className="block text-[11px] text-ink-3">{s.clause}</span>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// ---- repeating rows (elements, bars, readings, workers…) as cards ----
export function RowCards<R>({ rows, onChange, blank, render, summary, addLabel = "أضف بندًا", max = 400 }: {
  rows: R[]; onChange: (rows: R[]) => void; blank: () => R; render: (r: R, set: (r: R) => void, i: number) => any;
  summary: (r: R, i: number) => string; addLabel?: string; max?: number;
}) {
  const [open, setOpen] = useState<number>(rows.length ? rows.length - 1 : -1);
  const set = (i: number, r: R) => onChange(rows.map((x, j) => (j === i ? r : x)));
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} data-row={i} className={`rounded-2xl border ${open === i ? "border-accent/40 bg-surface" : "border-line bg-surface"}`}>
          <div className="flex items-center gap-1 ps-3.5 pe-1">
            <button type="button" onClick={() => setOpen(open === i ? -1 : i)} className="min-w-0 flex-1 min-h-12 text-start text-[13.5px] leading-snug">
              <span className="text-ink-3 me-1.5 font-grotesk">{i + 1}</span>{summary(r, i)}
            </button>
            <button type="button" aria-label="تكرار" onClick={() => { onChange([...rows.slice(0, i + 1), structuredClone(r), ...rows.slice(i + 1)]); setOpen(i + 1); }} className="press grid place-items-center w-10 h-10 text-ink-3"><Copy size={16} /></button>
            <button type="button" aria-label="حذف" onClick={() => { onChange(rows.filter((_, j) => j !== i)); setOpen(-1); }} className="press grid place-items-center w-10 h-10 text-ink-3 hover:text-bad"><Trash2 size={16} /></button>
          </div>
          {open === i && <div className="px-3.5 pb-3.5 space-y-2.5">{render(r, (x) => set(i, x), i)}</div>}
        </div>
      ))}
      {rows.length < max && (
        <button type="button" onClick={() => { onChange([...rows, blank()]); setOpen(rows.length); }} className="press w-full min-h-12 inline-flex items-center justify-center gap-2 rounded-2xl border border-dashed border-line-3 text-[13.5px] text-accent">
          <Plus size={17} /> {addLabel}
        </button>
      )}
    </div>
  );
}

// ---- the export bar (bottom of a document screen) ----
export function ExportBar({ busy, onPreview, onPdf, onShare, note }: { busy?: string | null; onPreview: () => void; onPdf: () => void; onShare?: () => void; note?: string }) {
  return (
    <div className="foot sticky bottom-[var(--tabbar-space)] z-[6] mt-auto -mx-4 px-4 pt-2.5 pb-[max(0.75rem,var(--sab))] bg-canvas/[.97] border-t border-line">
      {note && <p className="mb-2 text-[11px] text-ink-3 text-center">{note}</p>}
      <div className="flex gap-2">
        <button type="button" data-tool-preview onClick={onPreview} disabled={!!busy} className="press flex-1 min-h-12 inline-flex items-center justify-center gap-1.5 rounded-xl bg-surface border border-line-2 text-[13.5px]"><Eye size={17} /> معاينة</button>
        <button type="button" data-tool-export onClick={onPdf} disabled={!!busy} className="press flex-[1.4] min-h-12 inline-flex items-center justify-center gap-1.5 rounded-xl btn-primary text-[14px] font-medium"><FileDown size={17} /> {busy || "تقرير PDF"}</button>
        {onShare && <button type="button" aria-label="مشاركة الملخص" onClick={onShare} disabled={!!busy} className="press w-12 min-h-12 grid place-items-center rounded-xl bg-surface border border-line-2"><Share2 size={17} /></button>}
      </div>
    </div>
  );
}

// dialogs live on <body>: a pushed screen is a transformed layer, which would trap position: fixed under the header
const onBody = (node: any) => (typeof document !== "undefined" ? createPortal(node, document.body) : node);

// ---- the preview: the PDF's own pages, drawn for the screen (only the visible page and its neighbours exist) ----
export function DocPreview({ pages, onClose, draw }: { pages: DrawPage[]; onClose: () => void; draw: (c: HTMLCanvasElement, p: DrawPage, pxPerMm: number) => void }) {
  const [i, setI] = useState(0);
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c || !pages[i]) return;
    const p = pages[i];
    const wMm = p.orientation === "landscape" ? 297 : 210;
    const cssW = Math.min(window.innerWidth - 24, 820);
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const s = (cssW * dpr) / wMm;
    draw(c, p, s);
    c.style.width = `${cssW}px`;
    return () => {
      c.width = c.height = 0;
    };
  }, [i, pages]);
  return onBody(
    <div role="dialog" aria-modal="true" aria-label="معاينة التقرير" className="fixed inset-0 z-[60] flex flex-col bg-[#3a3a3e]">
      <div className="pt-[var(--sat)] flex items-center gap-2 px-2 h-14 text-white">
        <button type="button" aria-label="إغلاق" onClick={onClose} className="press grid place-items-center w-11 h-11"><X size={22} /></button>
        <span className="flex-1 text-center text-[13px]"><Num>{i + 1} / {pages.length}</Num></span>
        <span className="w-11" />
      </div>
      <div className="flex-1 overflow-auto px-3 pb-3 grid place-items-start justify-center">
        <canvas ref={ref} className="bg-white shadow-xl rounded-sm" />
      </div>
      <div className="pb-[max(0.75rem,var(--sab))] px-3 flex gap-2">
        <button type="button" disabled={i === 0} onClick={() => setI(i - 1)} className="press flex-1 min-h-12 rounded-xl bg-white/10 text-white text-[13.5px] disabled:opacity-40">السابقة</button>
        <button type="button" disabled={i >= pages.length - 1} onClick={() => setI(i + 1)} className="press flex-1 min-h-12 rounded-xl bg-white/10 text-white text-[13.5px] disabled:opacity-40">التالية</button>
      </div>
    </div>,
  );
}

// ---- confirm (destructive actions always ask first) ----
export function ConfirmDialog({ title, body, yes, onYes, onNo }: { title: string; body: string; yes: string; onYes: () => void; onNo: () => void }) {
  return onBody(
    <div role="alertdialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[60] grid place-items-end sm:place-items-center bg-black/40 p-3">
      <div className="w-full max-w-sm p-5 rounded-2xl bg-elevated border border-line shadow-xl pb-[max(1.25rem,var(--sab))]">
        <h2 className="text-[16px] font-medium">{title}</h2>
        <p className="mt-1.5 text-[13px] text-ink-2 leading-relaxed">{body}</p>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onNo} className="press flex-1 min-h-12 rounded-xl bg-surface border border-line-2 text-[14px]">إلغاء</button>
          <button type="button" onClick={onYes} className="press flex-1 min-h-12 rounded-xl bg-bad text-white text-[14px] font-medium">{yes}</button>
        </div>
      </div>
    </div>,
  );
}
