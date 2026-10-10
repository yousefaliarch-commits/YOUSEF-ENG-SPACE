import { useEffect, useRef, useState } from "react";
import { toolAllowed, toolOfStack, toolRole } from "../tools/gate";
import { toolById } from "../tools/registry";
import { tapHaptic } from "../native/native";
import {
  BadgeCheck, Bell, ChevronLeft, Eye, Flag, MapPin, Moon, Search, Settings, Share2, ShieldAlert, ShieldCheck, Star, Sun, X
} from "lucide-react";
import { company, room } from "../data/companies";
import { GOVS, KIND, REGIONS, TABS, citiesOf, gov, govName } from "../data/geo";
import { authorOf, pickAuthor } from "../domain/identity";
import { FX, canVerifyRole, genderOf, roleOf, roleTitle, verifiedLabel } from "../domain/taxonomy";
import { LANGUAGE_POLICY, detectContact, screenLanguage } from "../domain/text-guard";
import { LevelRing } from "../lib/helpers";
import { reducedMotion, usePlatform } from "../lib/runtime";
import { IdentityFace, IdentityTag, WhoChip } from "./identity";
import { ArchMark, Back, Chip, FilterChip, Forward, Num, Panel, RoundButton, Secondary, Wordmark } from "./primitives";
import { fmt } from "./theme";

// =====================================================================
//  App chrome
// =====================================================================
export const Stars = ({ n }: any) => <span className="inline-flex gap-0.5 text-accent" aria-label={`${n} من 5`}>{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={12} fill={i <= n ? "currentColor" : "none"} className={i <= n ? "" : "text-ink-4"} />)}</span>;

export const SectionTitle = ({ children, action, onAction }: any) => (
  <div className="flex items-center justify-between gap-3 px-1 mb-2">
    <h2 className="text-[12px] text-ink-2">{children}</h2>
    {action && <button type="button" onClick={onAction} className="shrink-0 inline-flex items-center gap-1 min-h-8 text-[12px] text-accent hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded">{action} <Forward size={13} /></button>}
  </div>
);

export const Empty = ({ icon: Icon, title, body, action, onAction }: any) => (
  <Panel className="p-6 text-center pop-in">
    <span className="mx-auto grid place-items-center w-12 h-12 rounded-2xl bg-wash text-accent"><Icon size={22} strokeWidth={1.6} /></span>
    <h3 className="mt-3 text-[15px] font-medium">{title}</h3><p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">{body}</p>
    {action && <Secondary onClick={onAction} className="mt-4 h-10">{action}</Secondary>}
  </Panel>
);

export const Field = ({ label, value, onChange, unit = "ج.م", placeholder, type = "number", step = "any" }: any) => (
  <label className="block"><span className="block text-[12px] text-ink-2 mb-1.5">{label}</span>
    <span className="flex items-center gap-2 h-12 px-4 rounded-xl bg-canvas border border-line-2 focus-within:ring-2 focus-within:ring-accent">
      <input dir="ltr" type={type} inputMode="decimal" step={step} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="w-full min-w-0 bg-transparent font-grotesk text-[17px] text-ink placeholder:text-ink-4 focus:outline-none" />
      {unit && <span className="text-[12px] text-ink-2">{unit}</span>}
    </span></label>
);

export const TextInput = ({ value, onChange, placeholder, className = "", list, dir, ...p }: any) => <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} list={list} dir={dir} {...p} className={`w-full h-12 px-4 rounded-xl bg-canvas border border-line-2 text-[14px] placeholder:text-ink-4 focus:outline-none focus:ring-2 focus:ring-accent ${dir === "ltr" ? "font-grotesk" : ""} ${className}`} />;

export const Result = ({ children, tone = "accent", className = "" }: any) => <div className={`mt-4 p-4 rounded-xl border ${tone === "accent" ? "bg-wash border-accent/20" : tone === "good" ? "bg-good/10 border-good/20" : "bg-warn/10 border-warn/20"} ${className}`}>{children}</div>;

export const Seg = ({ items, value, onChange, className = "" }: any) => (
  <div role="tablist" className={`flex p-1 rounded-full bg-surface border border-line ${className}`}>{items.map(([id, l]: any) => <button key={id} type="button" role="tab" aria-selected={value === id} onClick={() => onChange(id)} className={`flex-1 min-h-9 px-2 rounded-full text-[12.5px] leading-tight transition-colors ${value === id ? "bg-elevated text-ink" : "text-ink-2 hover:text-ink"}`}>{l}</button>)}</div>
);


// Language guard under every text field: the only thing that blocks sending is profanity / insult / threat / hate / harassment.
// Matches are masked so the UI never echoes the word back.
export function LanguageGuard({ text, className = "" }: any) {
  const r = screenLanguage(text || "");
  if (!r.blocked && !r.warnings.length) return null;
  return (
    <div role="alert" className={`p-3 rounded-xl border text-[12px] leading-relaxed ${r.blocked ? "bg-bad/10 border-bad/25" : "bg-warn/10 border-warn/25"} ${className}`}>
      <p className={`inline-flex items-center gap-1.5 font-medium ${r.blocked ? "text-bad" : "text-warn"}`}><ShieldAlert size={14} /> {r.blocked ? "لا يمكن الإرسال — لغة غير لائقة" : "تنبيه على اللهجة"}</p>
      <ul className="mt-1 space-y-0.5 text-ink-2">{r.hits.map((h, i) => <li key={i}>· {h.label}: <span className="text-ink">{h.match}</span></li>)}{r.warnings.map((w, i) => <li key={"w" + i}>· {w}</li>)}</ul>
      {r.blocked && <p className="mt-1 text-[11px] text-ink-3">{LANGUAGE_POLICY}</p>}
    </div>
  );
}

// Soft hint on PUBLIC posts only: contact details are allowed, but a phone or e-mail in an anonymous post is visible to everyone. Never blocks.
export function ContactHint({ text, as = "anon", className = "" }: any) {
  const r = detectContact(text || ""); if (!r.found) return null; const what = r.hits.map((h) => h.label).join(" و");
  return <p className={`inline-flex items-start gap-1.5 text-[11.5px] leading-snug text-ink-2 ${className}`}><Eye size={13} className="shrink-0 mt-0.5 text-accent" /><span>{as === "public" ? `سيظهر ${what} لكل الأعضاء مع اسمك — مسموح. للتواصل الشخصي استخدم الرسائل الخاصة.` : `سيظهر ${what} لكل الأعضاء مع معرّفك المجهول — مسموح، لكنه قد يكشف هويتك الحقيقية. للتواصل الشخصي استخدم الرسائل الخاصة.`}</span></p>;
}


export function AppHeader({ app }: any) {
  const top = app.stack[app.stack.length - 1]; const pf = usePlatform();
  const glass = `shrink-0 pt-[var(--sat)] bg-canvas/[.97] border-b z-10 transition-shadow duration-300 ${app.scrolled ? "header-lift border-line-2" : "border-line"}`;
  if (top) {
    const tid = toolOfStack(top);
    const closed = (tid != null && !toolAllowed(toolRole(app.profile), tid)) || (app.blocked && (app.blocked.stack.includes(top.type) || (top.type === "room" && app.blocked.rooms.includes(top.id))));
    const titles: any = { tool: tid != null ? toolById(tid)?.name : "", tooldoc: tid != null ? toolById(tid)?.name : "", support: "الدعم الفني", ticket: "تذكرة دعم", post: "نقاش", company: company(top.id)?.name, job: "تفاصيل الوظيفة", notifications: "الإشعارات", notifprefs: "إعدادات الإشعارات", profile: "حسابك", rooms: "الغرف", room: room(top.id)?.name, chat: "رسالة خاصة", permissions: "خريطة العلاقات والصلاحيات", postjob: top.like ? "تعديل الإعلان" : "نشر وظيفة", cvreview: "تدقيق السيرة الهندسية", methodology: "المنهجية والمصادر", settings: "الإعدادات", guide: "دليل الاستخدام" };
    return (
      <header className={glass}><div className="min-h-14 py-1.5 px-1.5 flex items-center gap-1">
        <RoundButton label="رجوع" onClick={app.pop} className="press shrink-0">{pf === "ios" ? <ChevronLeft size={26} strokeWidth={2.2} className="rtl:-scale-x-100" /> : <Back />}</RoundButton>
        <h1 className="min-w-0 flex-1 text-[15px] font-medium leading-snug">{titles[top.type] || ""}</h1>
        {!closed && ["post", "job", "company", "room"].includes(top.type) && <RoundButton label="مشاركة الرابط" onClick={() => app.share(top.type, top.id)}><Share2 size={18} /></RoundButton>}
        {!closed && top.type === "post" && !(app.posts.find((x) => x.id === top.id) || { mine: true }).mine && <RoundButton label="إبلاغ عن المنشور" onClick={() => app.openSheet("report", { kind: "post", id: top.id })} className="hover:text-bad"><Flag size={18} /></RoundButton>}
        {!closed && top.type === "job" && (() => { const j = app.jobs.find((x) => x.id === top.id); return j && !j.mine && !(app.isCo && j.co === app.profile.companyId) ? <RoundButton label="إبلاغ عن الإعلان" onClick={() => app.openSheet("report", { kind: "job", id: top.id })} className="hover:text-bad"><Flag size={18} /></RoundButton> : null; })()}
        {top.type === "profile" && <RoundButton label="الإعدادات" onClick={() => app.push({ type: "settings" })} className="press"><Settings size={19} /></RoundButton>}
        {top.type === "settings" && <ThemeQuick app={app} />}
      </div></header>
    );
  }
  return (
    <header className={glass}><div className="h-14 px-3 flex items-center justify-between gap-2">
      {/* narrow phones (under 400px): a smaller wordmark next to the mark, a compact staff button, and the theme toggle in Settings */}
      <div className="flex items-center gap-1.5 min-w-0 shrink"><ArchMark size={20} /><span className="min-w-0 truncate"><Wordmark size="text-[14.5px] min-[400px]:text-[17px]" /></span></div>
      <div className="flex items-center shrink-0">
        {/* staff (moderators, administrators) reach the console from every screen size, the Android app included */}
        {app.openAdmin && <button type="button" onClick={app.openAdmin} aria-label="لوحة الإدارة" className="press shrink-0 inline-flex items-center gap-1 h-8 px-2 min-[400px]:h-9 min-[400px]:px-2.5 me-0.5 rounded-full bg-accent text-on-accent text-[11.5px] min-[400px]:text-[12px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><ShieldCheck size={15} /> الإدارة</button>}
        <span className="hidden min-[400px]:contents"><ThemeQuick app={app} /></span>
        <RoundButton label="الإعدادات" data-tour="settings" onClick={() => app.push({ type: "settings" })} className="press w-10"><Settings size={19} /></RoundButton>
        <RoundButton label={`الإشعارات${app.unread ? ` · ${app.unread} غير مقروء` : ""}`} data-tour="notifs" onClick={() => app.push({ type: "notifications" })} className="relative press w-10">
          <span className="relative grid place-items-center"><Bell size={20} />{app.unread > 0 && <span className="pop-in absolute -top-2 -end-2.5 min-w-4 h-4 px-1 grid place-items-center rounded-full bg-accent text-on-accent font-grotesk text-[9.5px] font-semibold leading-none ring-2 ring-canvas">{app.unread}</span>}</span>
        </RoundButton>
        <button type="button" aria-label="حسابك" data-tour="profile" onClick={() => app.push({ type: "profile" })} className="press h-11 ps-1 grid place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <LevelRing pts={app.pts} size={38}><IdentityFace a={authorOf(app.profile, app.profile.identity)} size={28} /></LevelRing>
        </button>
      </div>
    </div></header>
  );
}


// Tab bar: iOS-style icons + 10pt labels; inside the Android preview it takes Material 3 proportions (80dp, pill indicator, 12sp labels)
// Floating "liquid glass" tab bar: it overlays the feed (the scroller pads its bottom by --tabbar-space), so the frosted
// layer has content to blur. One indicator slides under the active tab with transform only (composited), the icons do not
// re-layout, and the layer is promoted once (translateZ). Android draws the same glass without the live blur when the
// device cannot afford it (html[data-glass="lite"], set by src/native/native.ts) — see the .glass rules in app.css.
export function TabBar({ tabs = TABS, active: current, onChange, badge = {}, off = false }: any) {
  // the tapped tab lights up at once (only this bar re-renders); the app switches screens in a concurrent render after it
  const [tap, setTap] = useState<any>(null); useEffect(() => { setTap(null); }, [current]); const active = tap || current;
  const idx = Math.max(0, tabs.findIndex((t) => t.id === active)); const n = tabs.length;
  return (
    <nav aria-label="التنقل الرئيسي" data-tour="tabbar" {...(off ? { inert: "", "aria-hidden": true } : {})} className={`tabbar absolute inset-x-3 z-20 bottom-[calc(8px+var(--sab))] glass glass-bar rounded-[26px] ${off ? "is-off" : ""}`}>
      <ul className="relative grid h-[64px] p-1.5" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        <span aria-hidden="true" className="tab-ind absolute top-1.5 bottom-1.5 rounded-[20px]" style={{ width: `calc((100% - 12px) / ${n})`, insetInlineStart: 6, ["--i" as any]: idx }} />
        {tabs.map((t) => { const on = t.id === active; const Icon = t.icon; const b = badge[t.id]; return (
          <li key={t.id} className="relative"><button type="button" data-tour={"tab-" + t.id} onClick={() => { if (!on) { tapHaptic(); setTap(t.id); } onChange(t.id); }} aria-current={on ? "page" : undefined}
            className={`press w-full h-full flex flex-col items-center justify-center gap-[3px] rounded-[20px] text-[10.5px] font-medium leading-none transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${on ? "text-accent" : "text-ink-3 hover:text-ink-2"}`}>
            <span className="relative grid place-items-center w-6 h-6"><Icon size={20} strokeWidth={on ? 2.2 : 1.8} />{b > 0 && <span key={b} className="pop-in absolute -top-1.5 -end-2 min-w-[16px] h-4 px-1 grid place-items-center rounded-full bg-accent text-on-accent font-grotesk text-[9.5px] font-semibold ring-2 ring-surface">{b}</span>}</span>
            <span className="max-w-full truncate px-0.5">{t.label}</span>
          </button></li>); })}
      </ul>
    </nav>
  );
}


// Bottom sheet: focus moves into it on open and back to the opener on close; Escape closes it; the app behind is inert
export function Sheet({ title, onClose, children, tall = false }: any) {
  const pf = usePlatform(); const corner = pf === "ios" ? "rounded-t-[12px]" : pf === "android" ? "rounded-t-[28px]" : "rounded-t-3xl"; const panel = useRef<any>(null); const scrim = useRef<any>(null); const drag = useRef<any>(null); const leaving = useRef(false); const alive = useRef(true); useEffect(() => () => { alive.current = false; }, []);
  // every close slides the sheet down first; dragging the grab area follows the finger and dismisses past 110 px (or a quick flick)
  const dismiss = () => { if (leaving.current) return; leaving.current = true; const el = panel.current; const quiet = reducedMotion(); if (!el || quiet) { onClose(); return; } el.style.transform = ""; el.classList.add("sheet-out"); if (scrim.current) scrim.current.classList.add("scrim-out"); setTimeout(() => { if (alive.current) onClose(); }, 230); };
  const close = useRef<any>(dismiss); close.current = dismiss;
  useEffect(() => { const prev = document.activeElement as HTMLElement | null; try { if (panel.current) panel.current.focus({ preventScroll: true }); } catch (e) {} const onKey = (e?: any) => { if (e.key === "Escape") close.current(); }; window.addEventListener("keydown", onKey); return () => { window.removeEventListener("keydown", onKey); try { if (prev && prev.isConnected && prev.focus) prev.focus({ preventScroll: true }); } catch (e) {} }; }, []);
  const onDown = (e?: any) => { if (e.button > 0 || e.target.closest("button")) return; drag.current = { y: e.clientY, t: performance.now(), dy: 0 }; try { e.currentTarget.setPointerCapture(e.pointerId); } catch (x) {} };
  const onMove = (e?: any) => { const d = drag.current; if (!d || !panel.current) return; d.dy = Math.max(0, e.clientY - d.y); panel.current.style.transition = "none"; panel.current.style.transform = `translateY(${d.dy}px)`; };
  const onUp = () => { const d = drag.current; drag.current = null; const el = panel.current; if (!d || !el) return; const v = d.dy / Math.max(1, performance.now() - d.t); if (d.dy > 110 || (d.dy > 30 && v > 0.6)) { el.style.transition = "transform .22s cubic-bezier(.4,0,1,1)"; el.style.transform = "translateY(105%)"; leaving.current = true; setTimeout(() => { if (alive.current) onClose(); }, 210); } else { el.style.transition = "transform .42s cubic-bezier(.22,1.2,.36,1)"; el.style.transform = ""; } };
  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <button ref={scrim} type="button" aria-label="إغلاق" onClick={dismiss} className="scrim-in absolute inset-0 bg-scrim/50 backdrop-blur-sm" />
      <div ref={panel} tabIndex={-1} className={`sheet relative focus:outline-none ${tall ? "h-[92%]" : "max-h-[90%]"} flex flex-col ${corner} bg-surface border-t border-line-2 shadow-float`}>
        <div className="sheet-grab px-5 pt-3" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}><span aria-hidden="true" className={`block mx-auto rounded-full bg-track mb-3 ${pf === "ios" ? "w-9 h-[5px]" : "w-8 h-1"}`} />
          <div className="flex items-center justify-between gap-3 mb-3"><h3 className="text-[18px] font-medium leading-snug">{title}</h3><RoundButton label="إغلاق" onClick={dismiss} className="w-9 h-9 -me-2 shrink-0"><X size={18} /></RoundButton></div></div>
        <div className="scroll-area flex-1 px-5 pb-[max(1.25rem,var(--sab))]">{children}</div>
      </div>
    </div>
  );
}


// Region → governorate → city / markaz / district picker (27 governorates, every city and markaz)
export function GovPicker({ gov: g, city, onChange, compact = false }: any) {
  const [region, setRegion] = useState<any>(() => gov(g)[2]); const [q, setQ] = useState<any>("");
  const govs = GOVS.filter((x) => x[2] === region); const cities = citiesOf(g).filter((c) => !q || c[1].includes(q));
  return (
    <div className="space-y-2">
      <div className="-mx-5 px-5 flex gap-1.5 overflow-x-auto no-scrollbar">{REGIONS.map(([id, l]: any) => <FilterChip key={id} on={region === id} onClick={() => { setRegion(id); const first = GOVS.find((x) => x[2] === id); if (first && gov(g)[2] !== id) onChange(first[0], null); }}>{l}</FilterChip>)}</div>
      <div className="-mx-5 px-5 flex gap-1.5 overflow-x-auto no-scrollbar">{govs.map(([id, l]: any) => <FilterChip key={id} on={g === id} onClick={() => { onChange(id, null); setQ(""); }}><MapPin size={12} />{l}</FilterChip>)}</div>
      {!compact && (
        <div className="p-3 rounded-xl bg-canvas/60 border border-line">
          <div className="flex items-center justify-between gap-2 mb-2"><span className="text-[11.5px] text-ink-2">المدينة / المركز / الحي في {govName(g)} <Num className="text-ink-3">({citiesOf(g).length})</Num></span>{city && <button type="button" onClick={() => onChange(g, null)} className="text-[11px] text-accent hover:underline underline-offset-4">كل {govName(g)}</button>}</div>
          {citiesOf(g).length > 10 && <label className="flex items-center gap-2 h-9 px-3 mb-2 rounded-lg bg-surface border border-line-2 focus-within:ring-2 focus-within:ring-accent"><Search size={13} className="text-ink-3 shrink-0" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن مدينة أو مركز" aria-label="بحث عن مدينة" className="w-full min-w-0 bg-transparent text-[12.5px] placeholder:text-ink-4 focus:outline-none" /></label>}
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto scroll-area">{cities.map(([id, l, kind]: any) => <button key={id} type="button" aria-pressed={city === id} onClick={() => onChange(g, id)} className={`inline-flex items-center gap-1 min-h-8 px-2.5 rounded-full border text-[11.5px] transition-colors ${city === id ? "bg-wash border-accent/40 text-ink" : "bg-surface border-line-2 text-ink-2 hover:text-ink"}`}>{l}<span className="text-[9.5px] text-ink-4">{KIND[kind]}</span></button>)}{cities.length === 0 && <span className="text-[11.5px] text-ink-3">لا نتائج</span>}</div>
        </div>
      )}
    </div>
  );
}

export const Percentiles = ({ m, compact = false }: any) => (
  <div>
    <div className={`relative ${compact ? "h-6" : "h-8"}`} role="img" aria-label={`من ${fmt(m.p10)} إلى ${fmt(m.p90)} جنيه، المتوسط ${fmt(m.p50)}`}>
      <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-track" />
      <span className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full bg-accent/40" style={{ insetInlineStart: "8%", width: "84%" }} />
      <span className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-accent/90" style={{ insetInlineStart: `${8 + ((m.p25 - m.p10) / (m.p90 - m.p10)) * 84}%`, width: `${((m.p75 - m.p25) / (m.p90 - m.p10)) * 84}%`, transition: "all .5s cubic-bezier(.2,.7,.2,1)" }} />
      <span className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-accent border-[3px] border-surface shadow-[0_0_0_1px_rgb(var(--accent)),0_0_16px_rgb(var(--accent)/0.6)]" style={{ insetInlineStart: `calc(${8 + ((m.p50 - m.p10) / (m.p90 - m.p10)) * 84}% - 6px)`, transition: "inset-inline-start .5s cubic-bezier(.2,.7,.2,1)" }} />
    </div>
    <div className="grid grid-cols-5 text-[10px] text-ink-3 tabular-nums"><span className="text-start">P10 <Num className="text-ink-2">{fmt(m.p10)}</Num></span><span className="text-center">P25 <Num className="text-ink-2">{fmt(m.p25)}</Num></span><span className="text-center text-accent">P50 <Num>{fmt(m.p50)}</Num></span><span className="text-center">P75 <Num className="text-ink-2">{fmt(m.p75)}</Num></span><span className="text-end">P90 <Num className="text-ink-2">{fmt(m.p90)}</Num></span></div>
  </div>
);

// Expected range for a job: EngSpace estimate, never an employer figure
export const EstimateBar = ({ e, compact = false }: any) => (
  <div>
    <div className="flex items-baseline gap-1.5 flex-wrap"><Num className={`${compact ? "text-[17px]" : "text-[26px]"} font-semibold tracking-[-0.03em] leading-none`}>{fmt(e.lo)}–{fmt(e.hi)}</Num><span className="text-[11px] text-ink-2">ج.م صافي / شهر</span>{e.ccy && <span className="text-[10.5px] text-info">≈ {fmt(Math.round(e.lo / FX[e.ccy]))}–{fmt(Math.round(e.hi / FX[e.ccy]))} {e.ccy}</span>}</div>
    {!compact && <div className="relative h-5 mt-1"><span className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-track" /><span className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-accent/80" style={{ insetInlineStart: "18%", width: "64%" }} /><span className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-accent border-2 border-surface" style={{ insetInlineStart: `calc(${18 + ((e.mid - e.lo) / Math.max(1, e.hi - e.lo)) * 64}% - 5px)` }} /></div>}
  </div>
);


// =====================================================================
//  Role badges and author headers
// =====================================================================
// Verification is optional, so "not verified" is a neutral fact, never a warning
// Employer accounts (HR, business owners) are never verified: their badge is the role itself — «موارد بشرية» / «صاحب عمل»
export const RoleBadge = ({ role, verified: v, gender, className = "", compact = false }: any) => { const r = roleOf(role); const verified = !!v && canVerifyRole(role); const I = verified ? BadgeCheck : r.icon; const eng = role === "engineer"; const f = genderOf(gender) === "female"; return <Chip tone={role === "owner" ? "owner" : role === "hr" ? "hr" : verified ? "verified" : eng ? "default" : "accent"} className={`${compact ? "h-5 px-1.5 text-[10px] gap-1" : ""} ${className}`}><I size={compact ? 10 : 12} />{eng ? (verified ? verifiedLabel(gender) : f ? "مهندسة · غير موثّقة" : "مهندس · غير موثّق") : roleTitle(role, gender) + (verified ? " · موثّق" : "")}</Chip>; };

// Header used on every post/comment/reply: the author as they chose to appear — a public name (square monogram) or an anonymous
// hash (round character) — then the role chip and the title line. Tapping opens that identity's profile, and only that identity's.
export const Author = ({ a, app, when, mine }: any) => (
  <div className="min-w-0">
    <div className="flex items-center gap-1.5 flex-wrap text-[11.5px] text-ink-2">
      <WhoChip a={a} onOpen={() => app.openSheet("user", pickAuthor(a))} />
      <RoleBadge role={a.userRole || "engineer"} verified={a.verified !== false} gender={a.gender} compact />
      {a.as === "public" && <IdentityTag as="public" />}
      {mine && <Chip tone="accent" className="h-5 px-1.5 text-[10px]">أنت</Chip>}
      {when && <span className="ms-auto text-[10.5px] text-ink-3">{when}</span>}
    </div>
    {a.role && <p className="mt-1 text-[11.5px] leading-snug text-ink-2">{a.role}</p>}
  </div>
);


// Quick light / dark switch in the main header (the choice is saved and survives reloads)
export function ThemeQuick({ app }: any) {
  const dark = app.mode === "dark";
  return (
    <RoundButton label={dark ? "التبديل إلى الوضع الفاتح" : "التبديل إلى الوضع الداكن"} data-tour="theme" onClick={() => app.setTheme(dark ? "light" : "dark")} className="press w-10 overflow-hidden">
      <span key={app.mode} className="theme-swap grid place-items-center">{dark ? <Sun size={19} /> : <Moon size={19} />}</span>
    </RoundButton>
  );
}
