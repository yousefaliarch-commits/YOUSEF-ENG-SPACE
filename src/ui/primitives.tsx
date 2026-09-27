import {
  ArrowLeft, ArrowRight, Check
} from "lucide-react";
import { usePlatform } from "../lib/runtime";
import { fmt } from "./theme";

// =====================================================================
//  Primitives
// =====================================================================
export const Num = ({ children, className = "" }: any) => <bdi dir="ltr" className={`font-grotesk tabular-nums ${className}`}>{children}</bdi>;

export const Forward = ({ size = 16 }: any) => <ArrowRight size={size} className="rtl:-scale-x-100" />;

export const Back = ({ size = 20 }: any) => <ArrowLeft size={size} className="rtl:-scale-x-100" />;


export const ArchMark = ({ size = 30 }: any) => (
  <span aria-hidden="true" className="relative inline-block" style={{ width: size, height: size * 1.1 }}>
    <span className="absolute bottom-0 start-0 border-accent" style={{ width: size * 0.7, height: size * 0.97, borderWidth: 3, borderBottom: 0, borderRadius: `${size * 0.47}px ${size * 0.47}px 0 0` }} />
    <span className="absolute bottom-0 border-accent opacity-50" style={{ insetInlineStart: size * 0.3, width: size * 0.7, height: size * 0.77, borderWidth: 3, borderBottom: 0, borderRadius: `${size * 0.47}px ${size * 0.47}px 0 0` }} />
  </span>
);

export const Wordmark = ({ size = "text-[22px]" }: any) => (
  <span dir="ltr" className={`font-grotesk font-bold tracking-[-0.03em] text-ink ${size}`}>EngSpace<span className="text-accent">.</span></span>
);

export const Panel = ({ children, className = "", onClick }: any) => (
  <article onClick={onClick} className={`rounded-2xl bg-surface border border-line shadow-card ${className}`}>{children}</article>
);

export const Chip = ({ children, tone = "default", className = "" }: any) => {
  const tones: any = {
    default: "bg-elevated/80 border-line text-ink-2",
    verified: "bg-good/15 border-good/20 text-good",
    warn: "bg-warn/15 border-warn/20 text-warn",
    info: "bg-info/15 border-info/20 text-info",
    accent: "bg-wash border-accent/25 text-accent",
    owner: "bg-owner/15 border-owner/30 text-owner",
    hr: "bg-hr/15 border-hr/30 text-hr",
    en: "bg-elevated/80 border-line text-ink-2 font-grotesk uppercase tracking-[0.08em]",
  };
  return <span dir={tone === "en" ? "ltr" : undefined} className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-full border text-[12px] whitespace-nowrap ${tones[tone]} ${className}`}>{children}</span>;
};

export const FilterChip = ({ on, children, onClick }: any) => (
  <button type="button" aria-pressed={on} onClick={onClick}
    className={`shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border text-[12.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        on ? "bg-wash border-accent/40 text-ink" : "bg-surface border-line-2 text-ink-2 hover:text-ink"}`}>{children}</button>
);

export const BTN = "inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-xl text-[14px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";

export const Primary = ({ children, className = "", ...p }: any) => <button type="button" {...p} className={`${BTN} btn-primary ${className}`}>{children}</button>;

export const Secondary = ({ children, className = "", ...p }: any) => (
  <button type="button" {...p} className={`${BTN} bg-elevated border border-line-2 text-ink transition-colors hover:bg-track/80 active:translate-y-px disabled:text-ink-3 disabled:border-line ${className}`}>{children}</button>
);

export const Quiet = ({ children, className = "", ...p }: any) => <button type="button" {...p} className={`${BTN} px-3 text-ink-2 transition-colors hover:text-ink ${className}`}>{children}</button>;

export const IconButton = ({ label, active, className = "", children, ...p }: any) => (
  <button type="button" aria-label={label} {...p}
    className={`grid place-items-center w-11 h-11 rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        active ? "border-accent/40 text-accent bg-wash" : "border-line-2 text-ink-2 hover:text-ink hover:bg-elevated"} ${className}`}>{children}</button>
);

export const RoundButton = ({ label, active, className = "", children, ...p }: any) => (
  <button type="button" aria-label={label} {...p}
    className={`grid place-items-center w-11 h-11 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        active ? "text-accent" : "text-ink-2 hover:text-ink hover:bg-elevated/70"} ${className}`}>{children}</button>
);

// Switch: iOS pill by default; Material 3 track + check thumb when the app runs inside the Android preview
export const Toggle = ({ on, onChange, label }: any) => {
  if (usePlatform() === "android") return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={`relative shrink-0 w-[52px] h-8 rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${on ? "bg-solid border-solid" : "bg-elevated border-ink-4"}`}>
      <span style={{ transitionTimingFunction: "cubic-bezier(.22,1.2,.36,1)", transitionDuration: ".38s" }} className={`absolute top-1/2 -translate-y-1/2 rounded-full grid place-items-center transition-all ${on ? "w-6 h-6 bg-white start-[calc(100%-1.5rem-2px)]" : "w-4 h-4 bg-ink-3 start-1.5"}`}>{on && <Check size={14} className="text-solid" />}</span>
    </button>
  );
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={`relative shrink-0 w-12 h-7 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${on ? "bg-solid border-accent/40" : "bg-elevated border-line-2"}`}>
      <span style={{ transitionTimingFunction: "cubic-bezier(.22,1.2,.36,1)", transitionDuration: ".38s" }} className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all ${on ? "start-[calc(100%-1.625rem)]" : "start-0.5"}`} />
    </button>
  );
};


export function RangeBar({ min, max, median, compact = false, labels = true }: any) {
  const pos = 16 + ((median - min) / (max - min)) * 68;
  return (
    <div>
      <div className={`relative ${compact ? "h-5" : "h-6"}`} role="img" aria-label={`نطاق من ${fmt(min)} إلى ${fmt(max)} جنيه، المتوسط ${fmt(median)}`}>
        <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-track" />
        <span className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full bg-accent/80" style={{ insetInline: "16%" }} />
        <span className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-accent border-[3px] border-surface shadow-[0_0_0_1px_rgb(var(--accent)),0_0_16px_rgb(var(--accent)/0.6)]" style={{ insetInlineStart: `calc(${pos}% - 6px)` }} />
      </div>
      {labels && <div className="flex justify-between text-[11px] text-ink-2"><span><Num>{fmt(min)}</Num> ج.م</span><span><Num>{fmt(max)}</Num> ج.م</span></div>}
    </div>
  );
}
