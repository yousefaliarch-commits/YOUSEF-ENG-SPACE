import { useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck, Check, ChevronDown, CircleAlert, CircleCheck, CircleX, Clock, Copy, FileSearch, FileText, FileUp, 
  HardHat, Image as ImageIcon, Layers, ListChecks, LoaderCircle, LockKeyhole, PenLine, Plus, RefreshCw, 
  ScanSearch, Target, TriangleAlert, Wrench
} from "lucide-react";
import { company } from "../../data/companies";
import { TRACKS, tracksFor } from "../../domain/taxonomy";
import { CV_SAMPLE_AR, CV_SAMPLE_EN, CV_SAMPLE_FRESH, DIMS, LEVEL_L, PILLARS, TRACK_EN, auditCV, trackL2 } from "./audit";
import { extractCV, parseCV, wordsOf } from "./extract";
import { L2, say, tr } from "../../i18n/i18n";
import { useCountUp } from "../../lib/helpers";
import { reduced } from "../../lib/runtime";
import { Chip, Forward, Num, Panel, Primary, Secondary } from "../../ui/primitives";
import { fmt } from "../../ui/theme";

// =====================================================================
//  Engineering CV audit — the screen (v23): intake → one audit on the device → one report.
//  Report order: score + pillars · critical issues · technical gaps & keywords · line-by-line rewrites ·
//  portfolio & project sheets · full breakdown. All copy is written in both languages (L2) and rendered in the
//  interface language (translate="no"); rewrites stay in the CV's own language.
// =====================================================================
export function ScoreRing({ value, size = 92, label, tone = "accent" }: any) {
  const R = (size - 10) / 2, C = 2 * Math.PI * R; const v = useCountUp(value);
  const col = tone === "good" ? "rgb(var(--good))" : tone === "warn" ? "rgb(var(--warn))" : tone === "bad" ? "rgb(var(--bad))" : "rgb(var(--accent))";
  return (
    <span className="relative inline-grid place-items-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden="true"><circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="var(--line-2)" strokeWidth="6" /><circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke={col} strokeWidth="6" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - value / 100)} style={{ transition: "stroke-dashoffset .9s cubic-bezier(.2,.7,.2,1)" }} /></svg>
      <span className="text-center leading-none"><Num className="block text-[26px] font-semibold tracking-[-0.03em]">{v}</Num>{label && <span className="block mt-1 text-[9.5px] text-ink-3">{label}</span>}</span>
    </span>
  );
}

// copy as written — the report is already in the interface language and the rewrites are in the CV's language
export const copyPlain = (v?: any) => { const s = String(v); const fallback = () => { try { const t = document.createElement("textarea"); t.value = s; t.style.position = "fixed"; t.style.opacity = "0"; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove(); } catch (e) {} }; try { const r = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(s) : null; if (r && r.catch) r.catch(fallback); else if (!r) fallback(); } catch (e) { fallback(); } };

export const AX = {
  title: L2("تدقيق السيرة الذاتية الهندسية", "Engineering CV audit"),
  lead: L2("تدقيق واحد شامل بمعايير المقاولين والاستشاريين والشركات الدولية: البرامج وعمق استخدامها، حجم المشاريع بالأرقام، وضوح المسار، الأكواد والشهادات، وقراءة الـ ATS — مع إعادة كتابة بنودك سطرًا بسطر.", "One complete audit to the standard of top contractors, consultants and multinationals: software depth, project scope in figures, track alignment, codes and credentials, and ATS parsing — with your bullets rewritten line by line."),
  feats: [[LockKeyhole, L2("على جهازك — لا يُرفع الملف ولا يُحفظ", "On your device — never uploaded or stored")], [FileText, L2("PDF · Word · نص — أي قالب", "PDF · Word · text — any template")], [HardHat, L2("معايير لكل مسار: موقع، مكتب فني، تصميم، تخطيط، QS، BIM…", "Criteria per track: site, technical office, design, planning, QS, BIM…")], [PenLine, L2("إعادة كتابة بلغة سيرتك — بلا أرقام مخترعة", "Rewrites in your CV's language — no invented figures")]],
  upload: L2("ارفع سيرتك الذاتية", "Upload your CV"), paste: L2("الصق نصًا", "Paste text"), pastePh: L2("الصق نص سيرتك الذاتية كاملًا هنا…", "Paste the full text of your CV here…"), pasteRun: L2("دقّق النص", "Audit this text"),
  track: L2("المسار المستهدف", "Target track"), auto: L2("تلقائي — كما تُقرأ السيرة", "Auto — as the CV reads"), disc: L2("التخصص", "Discipline"),
  job: L2("الوظيفة المستهدفة (اختياري) — لمطابقة كلمات الإعلان", "Target job (optional) — to match the ad's keywords"), jobSet: L2("محددة", "Set"), jobPick: L2("اختر إعلانًا من وظائف EngSpace…", "Pick a job from EngSpace…"), jdPh: L2("أو الصق نص إعلان الوظيفة…", "…or paste the job ad text"),
  samples: L2("جرّب بسيرة نموذجية", "Try a sample CV"), sAr: L2("مكتب فني · عربي", "Technical office · Arabic"), sEn: L2("مهندس موقع · ضعيفة", "Site engineer · weak"), sFresh: L2("كهرباء · حديث التخرج", "Electrical · fresh grad"),
  pillarsHead: L2("على ماذا يُحاسَب المهندس؟", "What an engineering CV is judged on"),
  reading: L2("جارٍ القراءة والتدقيق…", "Reading and auditing…"), readingSub: L2("كل شيء يحدث على جهازك", "Everything happens on your device"),
  score: L2("التقييم الهندسي لـ ATS", "Engineering ATS score"), of100: L2("من 100", "out of 100"), retrack: L2("دقّق لمسار آخر", "Audit for another track"),
  pDisc: L2("التخصص", "Discipline"), pTarget: L2("المسار المستهدف", "Target track"), pReads: L2("تُقرأ كـ", "Reads as"), pYears: L2("الخبرة", "Experience"), pLevel: L2("المستوى", "Level"), pLen: L2("عدد الكلمات", "Words"),
  nav: [["crit", L2("العوائق", "Deal-breakers")], ["gaps", L2("الفجوات", "Gaps")], ["rew", L2("إعادة الكتابة", "Rewrites")], ["port", L2("المشاريع", "Portfolio")], ["det", L2("التفاصيل", "Breakdown")]],
  crit: L2("عوائق يجب إصلاحها", "Critical issues — must fix"), critSub: L2("هذه تُسقط السيرة في الفرز الآلي أو من أول نظرة.", "These get a CV rejected by software or at first glance."), critNone: L2("لا عوائق حاسمة — السيرة تعبر الفرز الأول.", "No deal-breakers — the CV clears first screening."), high: L2("أصلحها أيضًا قبل التقديم", "Also fix before applying"), why: L2("لماذا", "Why"), fix: L2("الحل", "Fix"),
  gaps: L2("الفجوات التقنية والكلمات المفتاحية", "Technical gaps & missing keywords"), sw: L2("برامج المسار وعمق استخدامها", "Track software and depth of use"), core: L2("أساسية — يفلتر عليها الـ ATS", "Core — ATS filters on these"), adv: L2("مميّزة — تفرّقك عن غيرك", "Differentiators — set you apart"),
  codes: L2("الأكواد والمعايير والعقود", "Codes, standards & contracts"), applied: L2("مطبّق في الخبرة", "Applied in work"), listed: L2("مذكور فقط", "Listed only"), missingS: L2("ناقص", "Missing"), creds: L2("الشهادات", "Credentials"), prep: L2("قيد الإعداد", "in preparation"), synd: L2("قيد نقابة المهندسين", "Engineers Syndicate registration"),
  terms: L2("مصطلحات يفلتر عليها المسؤول في مسارك", "Terms screeners filter on in your track"), dens: L2("كثافة الكلمات المفتاحية", "Keyword density"), densAll: L2("عرض كل الكلمات", "Show every keyword"), densLess: L2("عرض أقل", "Show less"), kw: L2("الكلمة", "Keyword"), cnt: L2("مرات", "Count"), where: L2("أين", "Where"), wS: L2("المهارات", "Skills"), wE: L2("الخبرات", "Experience"), wSum: L2("الملخص", "Summary"), onlyList: L2("في القائمة فقط", "Skills list only"), none: L2("غير موجودة", "Not found"),
  jd: L2("مطابقة الوظيفة المستهدفة", "Target job match"),
  rew: L2("إعادة كتابة البنود سطرًا بسطر", "Line-by-line bullet rewrites"), rewSub: L2("بلغة سيرتك. استبدل كل [ ] برقمك الحقيقي — لا تخترع أرقامًا.", "In your CV's language. Replace every [ ] with your real figure — never invent one."), sum: L2("الملخص المهني المقترح", "Drafted professional summary"), before: L2("قبل", "Before"), after: L2("بعد", "After"), kept: L2("كلماتك محفوظة", "Your words kept"), copy: L2("نسخ", "Copy"), copied: L2("نُسخ", "Copied"), copyAll: L2("نسخ كل البنود", "Copy all rewrites"), strongN: L2("بنود قوية أبقيناها كما هي:", "Strong bullets left as they are:"), noRew: L2("كل البنود قوية بالفعل — لا حاجة لإعادة كتابة.", "Every bullet is already strong — nothing to rewrite."),
  tags: { verb: L2("فعل إنجاز", "Action verb"), scope: L2("حجم المشروع", "Scope"), result: L2("نتيجة", "Result"), tool: L2("أداة", "Tool"), code: L2("كود", "Code") },
  port: L2("عرض المشاريع وملف الأعمال", "Portfolio & project presentation"), sheet: L2("بطاقة مشروع — انسخها لكل مشروع رئيسي", "Project sheet — copy it for each key project"), ready: L2("مشاريعك: ما هو موجود وما ينقص", "Your projects: what's there, what's missing"), tipsFor: L2("لمسار", "For"), general: L2("قواعد عامة", "General rules"),
  det: L2("تفاصيل التقييم", "Full breakdown"), writing: L2("اللغة والإملاء", "Spelling & grammar"),
  copyReport: L2("نسخ التقرير كاملًا", "Copy full report"), again: L2("دقّق سيرة أخرى", "Audit another CV"), reportCopied: L2("نُسخ التقرير", "Report copied"),
  privacy: L2("التدقيق قواعد خبراء تعمل على جهازك — لا يُرفع الملف ولا يُحفظ ولا يُرسل لأي خدمة. راجع النسخة النهائية بعينك قبل الإرسال.", "The audit is expert rules running on your device — the file is never uploaded, stored or sent to any service. Check the final version yourself before sending."),
  scannedT: L2("الملف صورة لا نص", "The file is an image, not text"), shortT: L2("نص غير كافٍ", "Not enough text"),
  errBig: L2("الملف أكبر من 12 ميجابايت", "The file is larger than 12 MB"), errRead: L2("تعذّرت قراءة الملف — جرّب PDF أو DOCX أو الصق النص", "Couldn't read the file — try PDF or DOCX, or paste the text"),
};

export const WK = { spelling: L2("إملاء", "Spelling"), grammar: L2("نحو", "Grammar"), casing: L2("كتابة الأسماء", "Name casing"), punct: L2("ترقيم", "Punctuation"), repeat: L2("تكرار", "Repetition"), tense: L2("زمن الأفعال", "Verb tense"), consistency: L2("اتساق", "Consistency") };

export const TONE_TXT = { good: "text-good", accent: "text-accent", warn: "text-warn", bad: "text-bad" };

export const pctTone = (p?: any) => (p >= 80 ? "good" : p >= 55 ? "accent" : p >= 35 ? "warn" : "bad");

export const LEVEL_TONE = { advanced: "verified", applied: "accent", listed: "warn", basic: "warn", missing: "default" };

export const Bracketed = ({ text }: any) => String(text).split(/(\[[^\]]+\])/g).map((s, i) => (/^\[[^\]]+\]$/.test(s) ? <mark key={i} className="px-1 rounded bg-warn/20 text-ink">{s}</mark> : s));


export function AuditIssue({ i, t, tone }: any) {
  const [open, setOpen] = useState(tone === "bad");
  return (
    <li className={`rounded-xl border ${tone === "bad" ? "bg-bad/5 border-bad/25" : "bg-canvas/60 border-line"}`}>
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="press w-full flex items-start gap-2.5 p-3 text-start rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        {tone === "bad" ? <CircleX size={17} className="shrink-0 mt-0.5 text-bad" /> : <TriangleAlert size={16} className="shrink-0 mt-0.5 text-warn" />}
        <span className="min-w-0 flex-1 text-[13.5px] font-medium leading-snug">{t(i.title)}</span><ChevronDown size={15} className={`shrink-0 mt-0.5 text-ink-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="guide-open px-3 pb-3 ps-9 space-y-2 text-[12.5px] leading-relaxed">
        <p className="text-ink-2"><span className="text-ink-3">{t(AX.why)}: </span>{t(i.why)}</p>
        {i.fix && i.fix.length > 0 && <div><p className="text-ink-3">{t(AX.fix)}:</p><ol className="mt-1 space-y-1">{i.fix.map((f, k) => <li key={k} className="flex gap-2"><Num className="shrink-0 text-ink-3">{k + 1}.</Num><span>{t(f)}</span></li>)}</ol></div>}
      </div>}
    </li>
  );
}


export function CVReviewScreen({ app }: any) {
  const t = (x?: any) => say(app, x); const en = app.lang === "en";
  const [phase, setPhase] = useState<any>("idle"); const [src, setSrc] = useState<any>(null); const [err, setErr] = useState<any>(""); const [paste, setPaste] = useState<any>(""); const [showPaste, setShowPaste] = useState(false);
  const [track, setTrack] = useState<any>(""); const [jd, setJd] = useState<any>(""); const [jobPick, setJobPick] = useState<any>(""); const [showJd, setShowJd] = useState(false); const [showAllKw, setShowAllKw] = useState(false); const [openP, setOpenP] = useState<any>(null);
  const inputRef = useRef<any>(null); const secRefs = useRef<any>({}); const rootRef = useRef<any>(null);
  // a new report (or a new CV) opens at its top, not at the scroll position of the intake form
  useEffect(() => { const sc = rootRef.current && rootRef.current.closest(".scroll-area"); if (sc) sc.scrollTop = 0; }, [phase, src]);
  const jdText = jobPick ? (() => { const j = app.jobs.find((x) => x.id === jobPick); return j ? `${j.title}\n${j.desc}\n${(j.reqs || []).join("\n")}\n${(j.skills || []).join(", ")}${j.years ? `\n${j.years[0]}-${j.years[1]} years` : ""}` : ""; })() : jd;
  const result = useMemo<any>(() => { if (!src) return null; try { return auditCV(src.text, { layout: src.layout, lines: src.lines, scanned: src.scanned, profile: app.profile, cv: src.cv, track: track || null, jd: jdText }); } catch (e) { return { error: String(e && e.message || e) }; } }, [src, track, jdText]);
  const run = (text?: any, meta?: any) => { setErr(""); let cv = null; try { cv = !meta.scanned && wordsOf(String(text || "")).length >= 40 ? parseCV(text, { lines: meta.lines, profile: app.profile }) : null; } catch (e) { cv = null; } setSrc({ text, ...meta, cv }); setPhase("done"); setOpenP(null); setShowAllKw(false); };
  const onFile = async (e?: any) => { const f = e.target.files && e.target.files[0]; if (!f) return; if (f.size > 12e6) { setErr(t(AX.errBig)); return; } setPhase("running"); setErr("");
    try { const x = await extractCV(f); run(x.text, { name: f.name, size: f.size, layout: x.layout, lines: x.lines, scanned: x.scanned }); } catch (ex) { const m = ex && ex.message; setErr(m ? (en ? tr(m) : m) : t(AX.errRead)); setPhase("idle"); } finally { if (inputRef.current) inputRef.current.value = ""; } };
  const txtMeta = (name?: any) => ({ name, size: 0, layout: { pages: 1, images: 0, columns: false, tables: 0, type: "txt", glyphs: 0 }, lines: null, scanned: false });
  const reset = () => { setPhase("idle"); setSrc(null); setTrack(""); };
  const go = (id?: any) => { const el = secRefs.current[id]; if (el) { try { el.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" }); } catch (e) { el.scrollIntoView(); } } };
  const r = phase === "done" ? result : null; const ok = r && !r.empty && !r.error;
  const copyReport = () => {
    if (!ok) return; const L: any = [];
    L.push(`${t(AX.title)} — EngSpace · ${r.overall}/100 · ${t(r.grade[0])}`, `${t(r.profile.discLabel)} · ${t(r.profile.target)} · ${t(r.profile.posLabel)}`, "");
    r.pillars.forEach((p) => L.push(`${t(p.label)}: ${p.pts}/${p.max}`)); L.push("");
    if (r.critical.length) { L.push(t(AX.crit) + ":"); r.critical.forEach((i) => { L.push(`✖ ${t(i.title)} — ${t(i.why)}`); i.fix.forEach((f) => L.push(`   • ${t(f)}`)); }); L.push(""); }
    if (r.high.length) { L.push(t(AX.high) + ":"); r.high.forEach((i) => { L.push(`! ${t(i.title)} — ${t(i.why)}`); i.fix.forEach((f) => L.push(`   • ${t(f)}`)); }); L.push(""); }
    L.push(t(AX.gaps) + ":", `${t(AX.core)}: ${r.missing.core.join(", ") || "✓"}`, `${t(AX.adv)}: ${r.missing.adv.join(", ") || "✓"}`, `${t(AX.codes)}: ${r.missing.codes.join(", ") || "✓"}`, `${t(AX.creds)}: ${r.missing.creds.join(", ") || "✓"}`, `${t(AX.terms)}: ${r.missing.terms.map(t).join(", ") || "✓"}`, "");
    L.push(t(AX.sum) + ":", r.summary.after, "", t(AX.rew) + ":"); r.rewrites.forEach((g) => { L.push(`— ${g.role}`); g.items.forEach((it) => L.push(`${t(AX.before)}: ${it.before}`, `${t(AX.after)}: ${it.after}`, "")); });
    L.push(t(AX.sheet) + ":", r.portfolio.sheet); copyPlain(L.join("\n")); app.toast(t(AX.reportCopied));
  };
  const allowedTracks = (disc?: any): string[] => tracksFor(disc).map((x) => x[0]);
  return (
    <div ref={rootRef} translate="no" lang={app.lang} className="py-4 space-y-3">
      {phase === "idle" && <>
        <Panel className="p-4">
          <div className="flex items-start gap-3"><span className="grid place-items-center w-11 h-11 shrink-0 rounded-xl bg-wash text-accent"><FileSearch size={20} /></span><div className="min-w-0"><h1 className="text-[16px] font-medium leading-snug">{t(AX.title)}</h1><p className="mt-1 text-[12px] leading-relaxed text-ink-2">{t(AX.lead)}</p></div></div>
          <ul className="mt-3 grid grid-cols-2 gap-1.5 text-[11px] text-ink-2">{AX.feats.map(([I, x]: any, i) => <li key={i} className="flex items-start gap-1.5 p-2 rounded-lg bg-canvas/60 border border-line"><I size={13} className="shrink-0 mt-0.5 text-accent" /><span className="leading-snug">{t(x)}</span></li>)}</ul>
          <input ref={inputRef} type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" onChange={onFile} className="sr-only" id="cv-file" />
          <div className="mt-3 flex gap-2"><Primary onClick={() => inputRef.current && inputRef.current.click()} className="flex-1 h-12 press"><FileUp size={17} /> {t(AX.upload)}</Primary><Secondary onClick={() => setShowPaste((v) => !v)} className="h-12 px-4 press" aria-expanded={showPaste}>{t(AX.paste)}</Secondary></div>
          {err && <p role="alert" className="mt-2 text-[12px] text-bad">{err}</p>}
          {showPaste && <div className="mt-3 pop-in"><textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={8} dir="auto" aria-label={t(AX.pastePh)} placeholder={t(AX.pastePh)} className="w-full p-4 rounded-xl bg-canvas border border-line-2 text-[13px] leading-[1.8] placeholder:text-ink-4 focus:outline-none focus:ring-2 focus:ring-accent resize-none" /><Primary disabled={paste.trim().length < 80} onClick={() => run(paste, txtMeta(en ? "Pasted text" : "نص ملصوق"))} className="mt-2 w-full h-11 press"><ScanSearch size={16} /> {t(AX.pasteRun)}</Primary></div>}
          <label className="mt-3 block"><span className="block text-[12px] text-ink-2 mb-1">{t(AX.track)}</span>
            <select value={track} onChange={(e) => setTrack(e.target.value)} className="w-full h-11 px-3 rounded-xl bg-canvas border border-line-2 text-[13px]"><option value="">{t(AX.auto)}</option>{TRACKS.map(([id]: any) => <option key={id} value={id}>{t(TRACK_EN[id] ? L2(TRACKS.find((x) => x[0] === id)[1], TRACK_EN[id]) : L2(id, id))}</option>)}</select></label>
          <button type="button" onClick={() => setShowJd((v) => !v)} aria-expanded={showJd} className="mt-3 w-full flex items-center justify-between gap-2 min-h-10 px-3 py-2 rounded-xl bg-canvas/60 border border-line text-[12.5px] text-ink-2 hover:text-ink text-start"><span className="inline-flex items-center gap-1.5"><Target size={14} className="shrink-0 text-accent" /> {t(AX.job)}</span>{jdText ? <Chip tone="accent" className="h-5 px-1.5 text-[10px]">{t(AX.jobSet)}</Chip> : <ChevronDown size={14} className={`shrink-0 ${showJd ? "rotate-180" : ""}`} />}</button>
          {showJd && <div className="mt-2 space-y-2 pop-in"><select value={jobPick} onChange={(e) => setJobPick(e.target.value)} aria-label={t(AX.jobPick)} className="w-full h-10 px-3 rounded-xl bg-canvas border border-line-2 text-[12.5px]"><option value="">{t(AX.jobPick)}</option>{app.jobs.slice(0, 20).map((j) => <option key={j.id} value={j.id}>{en ? tr(j.title) : j.title} — {j.coName || (company(j.co) || {}).name || ""}</option>)}</select><textarea value={jd} onChange={(e) => { setJd(e.target.value); if (e.target.value) setJobPick(""); }} rows={4} dir="auto" aria-label={t(AX.jdPh)} placeholder={t(AX.jdPh)} className="w-full p-3 rounded-xl bg-canvas border border-line-2 text-[12.5px] leading-[1.7] placeholder:text-ink-4 focus:outline-none focus:ring-2 focus:ring-accent resize-none" /></div>}
          <p className="mt-3 text-[11px] text-ink-3">{t(AX.samples)}</p>
          <div className="mt-1.5 grid grid-cols-3 gap-2 text-[11.5px]">{[["ar", AX.sAr, CV_SAMPLE_AR], ["en", AX.sEn, CV_SAMPLE_EN], ["fresh", AX.sFresh, CV_SAMPLE_FRESH]].map(([k, lab, txt]: any) => <button key={k} type="button" onClick={() => run(txt, txtMeta(t(lab)))} className="press min-h-10 px-2 py-1.5 rounded-xl border border-dashed border-line-3 text-accent hover:border-accent/40 leading-tight">{t(lab)}</button>)}</div>
        </Panel>
        <Panel className="p-4"><h3 className="text-[13px] font-medium">{t(AX.pillarsHead)}</h3>
          <ul className="mt-2 space-y-2">{PILLARS.map(([id, max, label, desc]: any) => <li key={id} className="flex items-start gap-3"><Num className="shrink-0 w-9 h-9 grid place-items-center rounded-xl bg-wash text-accent text-[13px] font-semibold">{max}</Num><span className="min-w-0"><span className="block text-[13px] text-ink leading-snug">{t(label)}</span><span className="block text-[11.5px] text-ink-3 leading-snug">{t(desc)}</span></span></li>)}</ul></Panel>
      </>}
      {phase === "running" && <Panel className="p-4"><div className="flex items-center gap-3"><span className="grid place-items-center w-11 h-11 rounded-xl bg-wash text-accent"><LoaderCircle size={20} className="spin" /></span><div><p className="text-[14px] font-medium">{t(AX.reading)}</p><p className="text-[11.5px] text-ink-2">{t(AX.readingSub)}</p></div></div></Panel>}
      {r && (r.empty || r.error) && <>
        <Panel className="p-4"><p className="text-[14px] font-medium inline-flex items-center gap-2 text-warn"><TriangleAlert size={16} /> {r.error ? t(AX.errRead) : t(r.scanned ? AX.scannedT : AX.shortT)}</p>
          {!r.error && <ul className="mt-3 space-y-2">{r.critical.map((i) => <AuditIssue key={i.id} i={i} t={t} tone="bad" />)}</ul>}</Panel>
        <Secondary onClick={reset} className="w-full h-11 press"><RefreshCw size={15} /> {t(AX.again)}</Secondary>
      </>}
      {ok && <>
        <Panel className="p-4">
          <div className="flex items-center gap-4"><ScoreRing value={r.overall} label={t(AX.of100)} tone={r.grade[1]} /><div className="min-w-0 flex-1"><p className="text-[11px] text-ink-3">{t(AX.score)}{src && src.name ? <span dir="auto"> · {src.name}</span> : null}</p><h2 className={`mt-0.5 text-[16px] font-medium leading-snug ${TONE_TXT[r.grade[1]] || ""}`}>{t(r.grade[0])}</h2>
            <div className="mt-2 flex flex-wrap gap-1.5"><Chip tone={r.critical.length ? "warn" : "verified"} className="h-6 px-2 text-[10.5px]">{r.critical.length ? <CircleX size={11} /> : <CircleCheck size={11} />} {t(AX.nav[0][1])}: <Num>{r.critical.length}</Num></Chip>{r.jd && <Chip tone={r.jd.coverage >= 60 ? "verified" : "warn"} className="h-6 px-2 text-[10.5px]"><Target size={11} /> <Num>{r.jd.coverage}%</Num></Chip>}</div></div></div>
          <ul className="mt-4 space-y-2.5">{r.pillars.map((p) => { const tn = pctTone(p.pct); return <li key={p.id}><div className="flex items-center justify-between gap-2 text-[12.5px]"><span className="text-ink">{t(p.label)}</span><span className="shrink-0 text-[11px] text-ink-3"><Num className={`text-[13px] font-semibold ${TONE_TXT[tn]}`}>{p.pts}</Num> / <Num>{p.max}</Num></span></div><div className="mt-1 h-1.5 rounded-full bg-elevated overflow-hidden"><span className={`block h-full rounded-full ${tn === "good" ? "bg-good" : tn === "accent" ? "bg-accent" : tn === "warn" ? "bg-warn" : "bg-bad"}`} style={{ width: `${p.pct}%`, transition: "width .7s cubic-bezier(.2,.7,.2,1)" }} /></div></li>; })}</ul>
          <div className="mt-3 pt-3 border-t border-line flex flex-wrap gap-1.5 text-[10.5px]">{[[AX.pDisc, t(r.profile.discLabel)], [AX.pReads, t(r.profile.detected)], [AX.pYears, r.years ? `≈ ${r.years}` : "—"], [AX.pLevel, t(r.profile.posLabel)], [AX.pLen, `${fmt(r.words)}${r.layout.pages > 1 ? ` · ${r.layout.pages}p` : ""}`]].map(([k, v]: any, i) => <span key={i} className="inline-flex items-center gap-1 min-h-6 px-2 rounded-full bg-elevated text-ink-2"><span className="text-ink-3">{t(k)}:</span> {v}</span>)}</div>
          <label className="mt-3 flex items-center gap-2 text-[12px]"><span className="shrink-0 text-ink-2">{t(AX.pTarget)}</span><select value={r.target} onChange={(e) => setTrack(e.target.value)} aria-label={t(AX.retrack)} className="min-w-0 flex-1 h-10 px-3 rounded-xl bg-canvas border border-line-2 text-[12.5px]">{allowedTracks(r.disc).map((id) => <option key={id} value={id}>{t(trackL2(id, r.disc))}{id === r.detected ? " ✓" : ""}</option>)}</select></label>
        </Panel>
        <nav aria-label={t(AX.det)} className="-mx-4 px-4 flex gap-1.5 overflow-x-auto no-scrollbar">{AX.nav.map(([id, lab]: any) => <button key={id} type="button" onClick={() => go(id)} className="press shrink-0 h-9 px-3 rounded-full bg-surface border border-line text-[12px] text-ink-2 hover:text-ink">{t(lab)}</button>)}</nav>

        <section ref={(el) => { secRefs.current.crit = el; }} className="scroll-mt-20"><Panel className="p-4"><h3 className="text-[14px] font-medium inline-flex items-center gap-1.5"><TriangleAlert size={15} className={r.critical.length ? "text-bad" : "text-good"} /> {t(AX.crit)} <Num className="text-ink-3 text-[12px]">({r.critical.length})</Num></h3><p className="mt-1 text-[11.5px] text-ink-3">{t(AX.critSub)}</p>
          {r.critical.length ? <ul className="mt-3 space-y-2">{r.critical.map((i) => <AuditIssue key={i.id} i={i} t={t} tone="bad" />)}</ul> : <p className="mt-3 p-3 rounded-xl bg-good/10 border border-good/25 text-[12.5px] text-good inline-flex items-center gap-2 w-full"><CircleCheck size={15} /> {t(AX.critNone)}</p>}
          {r.high.length > 0 && <><p className="mt-4 text-[12.5px] font-medium">{t(AX.high)} <Num className="text-ink-3">({r.high.length})</Num></p><ul className="mt-2 space-y-2">{r.high.map((i) => <AuditIssue key={i.id} i={i} t={t} tone="warn" />)}</ul></>}
        </Panel></section>

        <section ref={(el) => { secRefs.current.gaps = el; }} className="scroll-mt-20"><Panel className="p-4"><h3 className="text-[14px] font-medium inline-flex items-center gap-1.5"><Wrench size={15} className="text-accent" /> {t(AX.gaps)}</h3>
          <p className="mt-3 text-[12.5px] font-medium">{t(AX.sw)}</p>
          {[["core", AX.core], ["adv", AX.adv]].map(([tier, lab]: any) => { const list = r.software.filter((x) => x.tier === tier); return list.length ? <div key={tier} className="mt-2"><p className="text-[11px] text-ink-3">{t(lab)}</p><ul className="mt-1 space-y-1">{list.map((x) => <li key={x.name} className="flex items-center justify-between gap-2 py-1.5 border-b border-line last:border-0"><span className="min-w-0"><span className="block text-[12.5px] text-ink">{x.name}</span>{x.evidence && x.level !== "missing" && <span dir="auto" className="block text-[10.5px] text-ink-3 leading-snug truncate">{x.evidence}</span>}</span><Chip tone={LEVEL_TONE[x.level]} className="shrink-0 h-6 px-2 text-[10px]">{t(LEVEL_L[x.level]).split(" — ")[0]}</Chip></li>)}</ul></div> : null; })}
          <p className="mt-4 text-[12.5px] font-medium">{t(AX.codes)}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">{r.codes.map((c) => <span key={c.name} className={`inline-flex items-center gap-1 min-h-6 px-2 py-0.5 rounded-full border text-[11px] ${c.state === "applied" ? "bg-good/10 border-good/25 text-good" : c.state === "listed" ? "bg-wash border-accent/25 text-accent" : "bg-canvas/60 border-dashed border-line-3 text-ink-3"}`}>{c.state === "missing" ? <CircleX size={11} /> : <Check size={11} />}{c.name}<span className="opacity-70">· {t(c.state === "applied" ? AX.applied : c.state === "listed" ? AX.listed : AX.missingS)}</span></span>)}</div>
          <p className="mt-4 text-[12.5px] font-medium">{t(AX.creds)}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">{r.creds.map((c) => <span key={c.name} className={`inline-flex items-center gap-1 min-h-6 px-2 py-0.5 rounded-full border text-[11px] ${c.present ? "bg-good/10 border-good/25 text-good" : c.prep ? "bg-warn/10 border-warn/25 text-warn" : "bg-canvas/60 border-dashed border-line-3 text-ink-3"}`}>{c.present ? <BadgeCheck size={11} /> : c.prep ? <Clock size={11} /> : <CircleX size={11} />}{c.name}{c.prep ? <span className="opacity-70">· {t(AX.prep)}</span> : null}</span>)}<span className={`inline-flex items-center gap-1 min-h-6 px-2 py-0.5 rounded-full border text-[11px] ${r.syndicate ? "bg-good/10 border-good/25 text-good" : "bg-bad/5 border-bad/25 text-bad"}`}>{r.syndicate ? <BadgeCheck size={11} /> : <CircleX size={11} />}{t(AX.synd)}</span></div>
          <p className="mt-4 text-[12.5px] font-medium">{t(AX.terms)}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">{r.terms.map((x) => <span key={x.id} className={`inline-flex items-center gap-1 min-h-6 px-2 py-0.5 rounded-full border text-[11px] ${x.present ? (x.inExp ? "bg-good/10 border-good/25 text-good" : "bg-wash border-accent/25 text-accent") : "bg-canvas/60 border-dashed border-line-3 text-ink-3"}`}>{x.present ? <Check size={11} /> : <Plus size={11} />}{t(x.label)}</span>)}</div>
          {r.jd && <div className="mt-4 p-3 rounded-xl bg-canvas/60 border border-line"><div className="flex items-center justify-between gap-2"><p className="text-[12.5px] font-medium inline-flex items-center gap-1.5"><Target size={13} className="text-accent" /> {t(AX.jd)}</p><Chip tone={r.jd.coverage >= 60 ? "verified" : "warn"} className="h-6 px-2 text-[10.5px]"><Num>{r.jd.coverage}%</Num></Chip></div><div className="mt-2 flex flex-wrap gap-1.5">{r.jd.present.map((k, i) => <span key={"p" + i} className="inline-flex items-center gap-1 min-h-6 px-2 rounded-full bg-good/10 border border-good/25 text-good text-[11px]"><Check size={11} />{t(k)}</span>)}{r.jd.missing.map((k, i) => <span key={"m" + i} className="inline-flex items-center gap-1 min-h-6 px-2 rounded-full bg-warn/10 border border-warn/25 text-warn text-[11px]"><CircleX size={11} />{t(k)}</span>)}</div></div>}
          <p className="mt-4 text-[12.5px] font-medium">{t(AX.dens)} <Num className="text-ink-3 text-[11px]">{r.coverage}%</Num></p>
          <ul className="mt-1.5 divide-y divide-line">{(showAllKw ? r.density : r.density.slice(0, 8)).map((x, i) => <li key={i} className="py-1.5 flex items-center justify-between gap-2 text-[12px]"><span className={`min-w-0 ${x.count ? "text-ink" : "text-ink-3"}`}>{typeof x.kw === "string" ? x.kw : t(x.kw)}</span><span className="shrink-0 inline-flex items-center gap-1.5 text-[10.5px] text-ink-3">{x.count ? <>{[x.inSkills && AX.wS, x.inExp && AX.wE, x.inSummary && AX.wSum].filter(Boolean).map((w) => t(w)).join(" · ")}{x.inSkills && !x.inExp ? <span className="text-warn">· {t(AX.onlyList)}</span> : null}</> : <span>{t(AX.none)}</span>}<Num className={`min-w-[18px] text-end text-[12px] font-semibold ${x.count >= 2 ? "text-good" : x.count === 1 ? "text-accent" : "text-bad"}`}>{x.count}</Num></span></li>)}</ul>
          {r.density.length > 8 && <button type="button" onClick={() => setShowAllKw((v) => !v)} aria-expanded={showAllKw} className="mt-1 h-9 text-[12px] text-accent">{t(showAllKw ? AX.densLess : AX.densAll)}</button>}
        </Panel></section>

        <section ref={(el) => { secRefs.current.rew = el; }} className="scroll-mt-20"><Panel className="p-4"><div className="flex items-start justify-between gap-2"><h3 className="text-[14px] font-medium inline-flex items-center gap-1.5"><PenLine size={15} className="text-accent" /> {t(AX.rew)}</h3>{r.rewrites.length > 0 && <button type="button" onClick={() => { copyPlain(r.rewrites.flatMap((g) => g.items.map((it) => it.after)).join("\n")); app.toast(t(AX.copied)); }} className="press shrink-0 h-8 px-2.5 rounded-full bg-elevated text-[11px] text-ink-2 hover:text-ink inline-flex items-center gap-1"><Copy size={11} /> {t(AX.copyAll)}</button>}</div><p className="mt-1 text-[11.5px] text-ink-3">{t(AX.rewSub)}</p>
          <div className="mt-3 p-3 rounded-xl bg-wash border-s-[3px] border-accent"><div className="flex items-center justify-between gap-2"><p className="text-[11px] text-accent">{t(AX.sum)}</p><button type="button" onClick={() => { copyPlain(r.summary.after); app.toast(t(AX.copied)); }} className="press h-7 px-2.5 rounded-full bg-elevated text-[11px] text-ink-2 hover:text-ink inline-flex items-center gap-1"><Copy size={11} /> {t(AX.copy)}</button></div>{r.summary.before && <p dir="auto" className="mt-1.5 text-[11.5px] leading-[1.75] text-ink-3 line-through decoration-ink-4/60">{r.summary.before}</p>}<p dir="auto" className="mt-1.5 text-[12.5px] leading-[1.85] text-ink"><Bracketed text={r.summary.after} /></p></div>
          {r.rewrites.length === 0 ? <p className="mt-3 text-[12.5px] text-good inline-flex items-center gap-1.5"><CircleCheck size={14} /> {t(AX.noRew)}</p> : r.rewrites.map((g, gi) => <div key={gi} className="mt-4"><p dir="auto" className="text-[12px] font-medium text-ink-2">{g.role}</p><ul className="mt-1.5 space-y-2">{g.items.map((it, k) => <li key={k} className="p-3 rounded-xl bg-canvas/60 border border-line">
            <p dir="auto" className="text-[12px] leading-[1.75] text-ink-3 line-through decoration-ink-4/60">{it.before}</p>
            <p dir="auto" className="mt-1.5 text-[12.5px] leading-[1.85] text-ink"><Bracketed text={it.after} /></p>
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">{it.kept && <Chip tone="verified" className="h-5 px-1.5 text-[10px]">{t(AX.kept)}</Chip>}{it.tags.map((tg) => AX.tags[tg] ? <Chip key={tg} className="h-5 px-1.5 text-[10px]">+ {t(AX.tags[tg])}</Chip> : null)}<button type="button" onClick={() => { copyPlain(it.after); app.toast(t(AX.copied)); }} className="press ms-auto h-7 px-2.5 rounded-full bg-elevated text-[11px] text-ink-2 hover:text-ink inline-flex items-center gap-1"><Copy size={11} /> {t(AX.copy)}</button></div></li>)}</ul></div>)}
          {r.strongBullets > 0 && <p className="mt-3 text-[11.5px] text-good inline-flex items-center gap-1.5"><CircleCheck size={13} /> {t(AX.strongN)} <Num>{r.strongBullets}</Num></p>}
        </Panel></section>

        <section ref={(el) => { secRefs.current.port = el; }} className="scroll-mt-20"><Panel className="p-4"><h3 className="text-[14px] font-medium inline-flex items-center gap-1.5"><Layers size={15} className="text-accent" /> {t(AX.port)}</h3>
          {r.portfolio.projects.length > 0 && <><p className="mt-3 text-[12.5px] font-medium">{t(AX.ready)}</p><ul className="mt-1.5 space-y-2">{r.portfolio.projects.map((p, i) => <li key={i} className="p-3 rounded-xl bg-canvas/60 border border-line"><p dir="auto" className="text-[12.5px] text-ink leading-snug">{p.name}</p><div className="mt-1.5 flex flex-wrap gap-1">{p.known.map((d) => <span key={d} className="inline-flex items-center gap-1 min-h-5 px-1.5 rounded-full bg-good/10 text-good text-[10.5px]"><Check size={10} />{t(DIMS[d])}</span>)}{p.missing.map((d) => <span key={d} className="inline-flex items-center gap-1 min-h-5 px-1.5 rounded-full border border-dashed border-line-3 text-ink-3 text-[10.5px]"><Plus size={10} />{t(DIMS[d])}</span>)}</div></li>)}</ul></>}
          <div className="mt-4 p-3 rounded-xl bg-wash border-s-[3px] border-accent"><div className="flex items-center justify-between gap-2"><p className="text-[11px] text-accent">{t(AX.sheet)}</p><button type="button" onClick={() => { copyPlain(r.portfolio.sheet); app.toast(t(AX.copied)); }} className="press h-7 px-2.5 rounded-full bg-elevated text-[11px] text-ink-2 hover:text-ink inline-flex items-center gap-1"><Copy size={11} /> {t(AX.copy)}</button></div><pre dir="auto" className="mt-1.5 whitespace-pre-wrap font-sans text-[12px] leading-[1.8] text-ink"><Bracketed text={r.portfolio.sheet} /></pre></div>
          <p className="mt-4 text-[12.5px] font-medium">{t(AX.tipsFor)} {t(r.profile.target)}</p>
          <ul className="mt-1.5 space-y-1.5">{r.portfolio.tips.map((x, i) => <li key={i} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-2"><ImageIcon size={13} className="shrink-0 mt-1 text-accent" /><span>{t(x)}</span></li>)}</ul>
          <p className="mt-4 text-[12.5px] font-medium">{t(AX.general)}</p>
          <ul className="mt-1.5 space-y-1.5">{r.portfolio.general.map((x, i) => <li key={i} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-2"><span aria-hidden="true" className="mt-[9px] w-1.5 h-1.5 rounded-full bg-accent/70 shrink-0" /><span>{t(x)}</span></li>)}</ul>
        </Panel></section>

        <section ref={(el) => { secRefs.current.det = el; }} className="scroll-mt-20"><Panel className="p-4"><h3 className="text-[14px] font-medium inline-flex items-center gap-1.5"><ListChecks size={15} className="text-accent" /> {t(AX.det)}</h3>
          <div className="mt-2 space-y-2">{r.pillars.map((p) => { const on = openP === p.id; return (
            <div key={p.id} className={`rounded-xl border ${on ? "border-accent/30" : "border-line"}`}>
              <button type="button" aria-expanded={on} onClick={() => setOpenP(on ? null : p.id)} className="press w-full flex items-center gap-3 p-3 text-start rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><span className="min-w-0 flex-1"><span className="block text-[13px] text-ink">{t(p.label)}</span><span className="block text-[11px] text-ink-3 leading-snug">{t(p.desc)}</span></span><Num className={`shrink-0 text-[13px] font-semibold ${TONE_TXT[pctTone(p.pct)]}`}>{p.pts}/{p.max}</Num><ChevronDown size={15} className={`shrink-0 text-ink-3 transition-transform ${on ? "rotate-180" : ""}`} /></button>
              {on && <ul className="guide-open px-3 pb-3 space-y-2">{p.checks.map((c) => <li key={c.id} className="p-2.5 rounded-lg bg-canvas/60 border border-line"><div className="flex items-start gap-2"><span className="shrink-0 mt-0.5">{c.status === "pass" ? <CircleCheck size={14} className="text-good" /> : c.status === "partial" ? <CircleAlert size={14} className="text-warn" /> : <CircleX size={14} className="text-bad" />}</span><span className="min-w-0 flex-1 text-[12.5px] text-ink leading-snug">{t(c.label)}</span><Num className="shrink-0 text-[11.5px] text-ink-3">{c.pts}/{c.max}</Num></div><p dir="auto" className="mt-1 ms-6 text-[11.5px] text-ink-2 leading-relaxed">{t(c.detail)}</p>{c.fix && c.status !== "pass" && <p className="mt-1 ms-6 text-[11.5px] text-accent leading-relaxed">{t(c.fix)}</p>}</li>)}
                {p.id === "ats" && r.writing.length > 0 && <li className="p-2.5 rounded-lg bg-canvas/60 border border-line"><p className="text-[12.5px] text-ink">{t(AX.writing)}</p><ul className="mt-1.5 space-y-1.5">{r.writing.map((w, k) => <li key={k} className="text-[12px]"><span className="inline-flex items-center gap-1.5 flex-wrap"><Chip className="h-5 px-1.5 text-[10px]">{t(WK[w.kind] || L2(w.kind, w.kind))}</Chip><span dir="auto" className="text-bad line-through decoration-bad/60">{w.wrong}</span><Forward size={12} /><span dir="auto" className="text-good">{w.right}</span></span>{w.where && <span dir="auto" className="block mt-0.5 text-[10.5px] text-ink-3">{w.where}</span>}</li>)}</ul></li>}
              </ul>}
            </div>); })}</div>
        </Panel></section>
        <div className="flex gap-2"><Secondary onClick={copyReport} className="flex-1 h-11 press"><Copy size={15} /> {t(AX.copyReport)}</Secondary><Secondary onClick={reset} className="flex-1 h-11 press"><RefreshCw size={15} /> {t(AX.again)}</Secondary></div>
        <p className="pb-2 text-center text-[10.5px] text-ink-4 leading-relaxed">{t(AX.privacy)}</p>
      </>}
    </div>
  );
}
