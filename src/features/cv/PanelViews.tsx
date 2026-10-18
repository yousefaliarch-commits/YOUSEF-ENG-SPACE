// =====================================================================
//  CV review — the hiring-panel views (v25): the before / after projection, the four readers with the honesty line,
//  the graduation-grade advice, the tough interview questions and the rebuilt draft (copy · A4 PDF).
//  Everything renders from the audit result (./panel.ts, ./rebuild.ts); the PDF is drawn on the device by the
//  document kit, loaded only when the member asks for it.
// =====================================================================
import { useEffect, useMemo, useState } from "react";
import { useCountUp } from "../../lib/helpers";
import { reduced } from "../../lib/runtime";
import { Bot, Briefcase, ChevronDown, FileText, CircleCheck, CircleHelp, CircleX, Copy, FileDown, GraduationCap, Handshake, LoaderCircle, Quote, Scale, Timer, TriangleAlert, Users } from "lucide-react";
import { L2 } from "../../i18n/i18n";
import { Chip, Num, Panel, Secondary } from "../../ui/primitives";
import { REVIEWERS, type Reviewer, type ReviewerId } from "./panel";
import { DRAFT_NOTE, applyFills, draftSpec, draftText, rebuildCV, rescreen, slotsOf } from "./rebuild";
import { DOCX_MIME, draftDocx } from "./docx";

export const PX = {
  panel: L2("لجنة التوظيف", "The hiring panel"),
  panelSub: L2("أربعة قرّاء مستقلين لنفس السيرة — كلٌّ يسأل سؤاله فقط. على جهازك، بلا ذكاء اصطناعي ولا رفع للملف.", "Four independent readers of the same CV — each asks only their own question. On your device: no AI, no upload."),
  snapshot: L2("الملخص التنفيذي", "Executive snapshot"),
  of100: L2("من 100", "out of 100"),
  top3: L2("أهم 3 إصلاحات الآن", "Top 3 fixes to make now"),
  sev: { critical: L2("عائق حاسم", "Deal-breaker"), high: L2("أولوية عالية", "High priority"), rec: L2("توصية", "Recommendation") },
  actions: L2("خطة الإصلاح", "Action plan"),
  actionsSub: L2("مرتبة حسب الأثر — افتح مجموعة واحدة في كل مرة.", "Ordered by impact — open one group at a time."),
  group: { critical: L2("عوائق حاسمة", "Critical"), high: L2("أولوية عالية", "High priority"), rec: L2("توصيات", "Recommendations") },
  docx: L2("Word قابل للتعديل", "Editable Word"),
  verdict: { pass: L2("يمرّرها", "Passes"), maybe: L2("متردد", "Maybe"), reject: L2("يرفضها", "Rejects") },
  flagged: L2("رصده", "Flagged by"),
  more: L2("التفاصيل", "Details"),
  now: L2("الدرجة الآن", "Score now"),
  projected: L2("بعد تطبيق التوصيات", "After the fixes"),
  projNote: L2("بافتراض أنك تطبّق كل توصية وتملأ كل [أضف] بأرقامك الحقيقية — لا تُفترض برامج أو أكواد أو شهادات ليست في سيرتك.", "Assumes you apply every fix and fill each [ADD] with your real figures — no tool, code or certificate you don't have is assumed."),
  screenAB: L2("الفرز الآلي", "Automated screen"),
  grade: L2("التقدير الدراسي", "Graduation grade"),
  gradeTiers: { high: L2("مرتفع", "Strong"), mid: L2("جيد", "Solid"), low: L2("متوسط", "Modest"), none: L2("غير مذكور", "Not stated") },
  q: L2("أسئلة مقابلة صعبة متوقعة", "Tough interview questions to expect"),
  qSub: L2("مبنية على ثغرات سيرتك أنت — جهّز إجابتها قبل المقابلة.", "Built from the gaps in your own CV — prepare the answers before the interview."),
  qWhy: L2("لماذا سيُسأل", "Why it comes up"),
  qTip: L2("كيف تجيب", "How to answer"),
  draft: L2("السيرة بعد إعادة البناء", "Your rebuilt CV"),
  draftSub: L2("نفس الحقائق مع كل الإصلاحات: عمود واحد، عناوين قياسية، ملخص، وبنود معاد صياغتها — بالإنجليزية أو بالعربية، وكل ما ينقص في [أضف: …].", "The same facts with every fix: one column, standard headings, a summary and rewritten bullets — in English or Arabic, with every gap as [ADD: …]."),
  asks: L2("املأ البيانات الناقصة", "Fill in the missing details"),
  leftWarn: L2("{n} خانة ما زالت فارغة — ستظهر في الملف كما هي", "{n} field(s) still empty — they will print as they are"),
  langPick: L2("لغة السيرة", "CV language"),
  pairsEn: L2("{n} بند أُعيد بناؤه بالإنجليزية من سطورك العربية — راجعه", "{n} bullet(s) rebuilt in English from your Arabic lines — check them"),
  pairsAr: L2("{n} بند أُعيد بناؤه بالعربية من سطورك الإنجليزية — راجعه", "{n} bullet(s) rebuilt in Arabic from your English lines — check them"),
  whiteLabel: L2("الملف باسمك فقط — بلا اسم التطبيق ولا علامة مائية. يُنشأ على جهازك.", "The file carries only your name — no app name, no watermark. Built on your device."),
  pdf: L2("تنزيل PDF", "Download PDF"),
  copy: L2("نسخ النص", "Copy the text"),
  copied: L2("نُسخت المسودة", "Draft copied"),
  pdfBusy: L2("جارٍ إنشاء الملف…", "Building the file…"),
  pdfFail: L2("تعذّر إنشاء الملف", "Couldn't build the file"),
  showDraft: L2("عرض المسودة", "Show the draft"),
  hideDraft: L2("إخفاء المسودة", "Hide the draft"),
};

const ICON: Record<ReviewerId, any> = { screen: Bot, manager: Briefcase, recruiter: Timer, teammate: Handshake };
const VTONE = { pass: "verified", maybe: "warn", reject: "default" } as const;
const VCLS = { pass: "text-good", maybe: "text-warn", reject: "text-bad" };

// «رصده: الفرز الآلي · مدير التوظيف» under each issue
export function FlaggedBy({ by, t }: { by?: ReviewerId[]; t: (x: any) => string }) {
  if (!by || !by.length) return null;
  return (
    <p className="flex flex-wrap items-center gap-1 text-[10.5px] text-ink-3" data-flagged-by={by.join(" ")}>
      <Users size={11} className="shrink-0" /> {t(PX.flagged)}:
      {by.map((id) => (
        <span key={id} className="inline-flex items-center h-5 px-1.5 rounded-full bg-elevated/80 border border-line text-ink-2">{t(REVIEWERS[id].short)}</span>
      ))}
    </p>
  );
}

// the fixes worth doing first: every deal-breaker, then the high-priority issues, then the checks with the most points left
export type Fix = { id: string; sev: "critical" | "high" | "rec"; title: any; why?: any; fix: any[]; by?: ReviewerId[]; gain?: number };
export function actionPlan(r: any): { critical: Fix[]; high: Fix[]; recs: Fix[]; top: Fix[] } {
  const asFix = (sev: "critical" | "high") => (i: any): Fix => ({ id: i.id, sev, title: i.title, why: i.why, fix: i.fix || [], by: i.by });
  const critical = r.critical.map(asFix("critical"));
  const high = r.high.map(asFix("high"));
  const proj = new Map<string, number>((r.projection?.pillars || []).map((p: any) => [p.id, p.projected - p.now]));
  const recs: Fix[] = r.pillars
    .flatMap((p: any) => p.checks.filter((c: any) => c.status !== "pass" && c.fix).map((c: any) => ({ p, c })))
    .sort((a: any, b: any) => (b.c.max - b.c.pts) - (a.c.max - a.c.pts))
    .map(({ p, c }: any) => ({ id: `chk:${p.id}.${c.id}`, sev: "rec" as const, title: c.label, why: c.detail, fix: [c.fix], gain: Math.min(c.max - c.pts, proj.get(p.id) || 0) }));
  const top = [...critical, ...high, ...recs].slice(0, 3);
  return { critical, high, recs, top };
}

// the two-arc ring: the current score draws in first, then the projected score grows as a lighter arc around it
export function DualRing({ now, projected, tone, size = 116, label }: any) {
  const R = (size - 12) / 2;
  const C = 2 * Math.PI * R;
  const [on, setOn] = useState(false);
  const [late, setLate] = useState(false);
  useEffect(() => {
    if (reduced()) {
      setOn(true);
      setLate(true);
      return;
    }
    const f = requestAnimationFrame(() => setOn(true));
    const t2 = window.setTimeout(() => setLate(true), 760);
    return () => {
      cancelAnimationFrame(f);
      window.clearTimeout(t2);
    };
  }, []);
  const v = useCountUp(on ? now : 0, 720);
  const pv = useCountUp(late ? projected : now, 720);
  const col = tone === "good" ? "rgb(var(--good))" : tone === "warn" ? "rgb(var(--warn))" : tone === "bad" ? "rgb(var(--bad))" : "rgb(var(--accent))";
  const arc = (value: number) => C * (1 - Math.max(0, Math.min(100, value)) / 100);
  const ease = "stroke-dashoffset .9s cubic-bezier(.2,.7,.2,1)";
  return (
    <span className="relative inline-grid place-items-center shrink-0" style={{ width: size, height: size }} data-cv-ring={`${now}>${projected}`}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="var(--line-2)" strokeWidth="7" />
        <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="rgb(var(--good))" strokeOpacity=".32" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={arc(late ? projected : on ? now : 0)} style={{ transition: ease }} />
        <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke={col} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={arc(on ? now : 0)} style={{ transition: ease }} />
      </svg>
      <span className="text-center leading-none">
        <Num className="block text-[30px] font-semibold tracking-[-0.03em]">{v}</Num>
        {projected > now && <span className={`mt-1 block text-[11.5px] font-medium text-good transition-opacity duration-300 ${late ? "opacity-100" : "opacity-0"}`}><bdi dir="ltr">→ <Num>{pv}</Num></bdi></span>}
        {label && <span className="mt-1 block text-[9.5px] text-ink-3">{label}</span>}
      </span>
    </span>
  );
}

// the top of the report: status, now → projected, the screen before → after, and the three fixes worth doing first
export function ExecutiveSnapshot({ r, t, ctx, srcName, onFix }: any) {
  const p = r.projection;
  const rs = useMemo(() => rescreen(r, ctx), [r]);
  const plan = useMemo(() => actionPlan(r), [r]);
  return (
    <div data-cv-snapshot>
      <div className="flex items-center gap-4">
        <DualRing now={p.now} projected={p.projected} tone={r.grade[1]} label={t(PX.of100)} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-ink-3 truncate">{t(PX.snapshot)}{srcName ? <span dir="auto"> · {srcName}</span> : null}</p>
          <h2 className={`mt-0.5 text-[16.5px] font-semibold leading-snug ${r.grade[1] === "good" ? "text-good" : r.grade[1] === "warn" ? "text-warn" : r.grade[1] === "bad" ? "text-bad" : "text-accent"}`}>{t(r.grade[0])}</h2>
          <div className="mt-2.5 grid grid-cols-2 gap-1.5" data-cv-projection>
            <div className="px-2.5 py-2 rounded-xl bg-canvas/60 border border-line">
              <p className="text-[10px] text-ink-3">{t(PX.now)} → {t(PX.projected)}</p>
              <p className="mt-0.5 text-[14px] font-semibold"><bdi dir="ltr"><Num>{p.now}</Num> → <span className="text-good"><Num>{p.projected}</Num></span></bdi></p>
            </div>
            <div className="px-2.5 py-2 rounded-xl bg-canvas/60 border border-line" data-rescreen={`${rs.before}>${rs.after}`}>
              <p className="text-[10px] text-ink-3">{t(PX.screenAB)}</p>
              <p className="mt-0.5 text-[12.5px] font-semibold truncate"><span className={VCLS[rs.before]}>{t(PX.verdict[rs.before])}</span> <span className="text-ink-3">→</span> <span className={VCLS[rs.after]}>{t(PX.verdict[rs.after])}</span></p>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-2.5 text-[10.5px] leading-relaxed text-ink-3">{t(PX.projNote)}</p>
      {rs.still.length > 0 && <p className="mt-1 text-[10.5px] leading-relaxed text-warn">{rs.still.map(t).join(" · ")}</p>}
      {plan.top.length > 0 && (
        <div className="mt-3.5" data-cv-topfixes={plan.top.length}>
          <p className="text-[12.5px] font-semibold">{t(PX.top3)}</p>
          <ol className="mt-2 space-y-1.5">
            {plan.top.map((f, i) => (
              <li key={f.id}>
                <button type="button" onClick={() => onFix && onFix(f.sev)} data-top-fix={f.id}
                  className="press w-full min-h-[48px] flex items-center gap-3 px-3 py-2 rounded-xl bg-canvas/60 border border-line text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                  <span className={`grid place-items-center w-7 h-7 shrink-0 rounded-full text-[12px] font-semibold ${f.sev === "critical" ? "bg-bad/10 text-bad" : f.sev === "high" ? "bg-warn/15 text-warn" : "bg-wash text-accent"}`}><Num>{i + 1}</Num></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium leading-snug">{t(f.title)}</span>
                    <span className="mt-0.5 block text-[10.5px] text-ink-3">{t(PX.sev[f.sev])}{f.by && f.by.length ? ` · ${f.by.map((b) => t(REVIEWERS[b].short)).join(" · ")}` : ""}</span>
                  </span>
                  {f.gain ? <span className="shrink-0 text-[11px] font-semibold text-good"><bdi dir="ltr">+<Num>{f.gain}</Num></bdi></span> : null}
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

// the four readers as segmented tabs; the active card fades in, the indicator slides
export function HiringPanelCard({ r, t, rtl }: any) {
  const panel: Reviewer[] = r.panel || [];
  const lowest = useMemo(() => (panel.length ? [...panel].sort((a, b) => a.score - b.score)[0].id : "screen"), [r]);
  const [sel, setSel] = useState<ReviewerId>(lowest);
  if (!panel.length) return null;
  const idx = Math.max(0, panel.findIndex((v) => v.id === sel));
  const v = panel[idx];
  const h = r.honesty;
  return (
    <Panel className="p-4">
      <h3 className="text-[14px] font-semibold inline-flex items-center gap-1.5"><Scale size={15} className="text-accent" /> {t(PX.panel)}</h3>
      <p className="mt-1 text-[11.5px] text-ink-3 leading-relaxed">{t(PX.panelSub)}</p>
      {h && <p data-cv-honesty={h.strong ? "strong" : "toughest"} className={`mt-3 p-3 rounded-xl border text-[12.5px] leading-relaxed ${h.strong ? "bg-good/10 border-good/25" : "bg-warn/10 border-warn/25"}`}>{t(h.text)}</p>}
      <div role="tablist" aria-label={t(PX.panel)} className="relative mt-3 grid grid-cols-4 p-1 rounded-2xl bg-canvas/70 border border-line">
        <span aria-hidden="true" className="seg-thumb absolute top-1 bottom-1 rounded-xl bg-surface border border-line-2 shadow-card"
          style={{ width: "calc((100% - 0.5rem) / 4)", insetInlineStart: "0.25rem", transform: `translateX(${(rtl ? -1 : 1) * idx * 100}%)` }} />
        {panel.map((x) => {
          const I = ICON[x.id];
          const on = x.id === sel;
          return (
            <button key={x.id} type="button" role="tab" aria-selected={on} onClick={() => setSel(x.id)} data-reviewer={x.id} data-verdict={x.verdict}
              className={`press relative z-[1] min-h-[56px] px-1 py-1.5 flex flex-col items-center justify-center gap-0.5 rounded-xl text-[10.5px] leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${on ? "text-ink font-semibold" : "text-ink-3"}`}>
              <span className="relative"><I size={17} className={on ? "text-accent" : ""} /><span className={`absolute -top-0.5 -end-1.5 w-2 h-2 rounded-full ${x.verdict === "pass" ? "bg-good" : x.verdict === "maybe" ? "bg-warn" : "bg-bad"}`} /></span>
              <span className="truncate max-w-full">{t(x.short).replace(/^the /, "").replace(/^./, (c: string) => c.toUpperCase())}</span>
            </button>
          );
        })}
      </div>
      <div key={v.id} className="tab-in mt-3" role="tabpanel" data-reviewer-card={v.id}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13.5px] font-semibold">{t(v.label)}</p>
          <Chip tone={VTONE[v.verdict]} className={`shrink-0 h-7 px-2.5 text-[11px] ${v.verdict === "reject" ? "!text-bad !border-bad/25 !bg-bad/5" : ""}`}>{t(PX.verdict[v.verdict])} · <Num>{v.score}</Num></Chip>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-elevated overflow-hidden"><span className={`block h-full rounded-full ${v.verdict === "pass" ? "bg-good" : v.verdict === "maybe" ? "bg-warn" : "bg-bad"}`} style={{ width: `${v.score}%`, transition: "width .6s cubic-bezier(.2,.7,.2,1)" }} /></div>
        <p className="mt-2 text-[11.5px] text-ink-3 leading-relaxed">{t(v.asks)}</p>
        <ul className="mt-2.5 space-y-2">
          {v.reasons.map((x, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[12.5px] leading-relaxed">
              {x.good ? <CircleCheck size={15} className="shrink-0 mt-0.5 text-good" /> : <CircleX size={15} className="shrink-0 mt-0.5 text-bad" />}
              <span className="min-w-0">
                <span className="text-ink">{t(x.text)}</span>
                {x.quote && <span dir="auto" translate="no" className="mt-0.5 flex items-start gap-1 text-[11px] text-ink-3"><Quote size={10} className="shrink-0 mt-1" /><span className="min-w-0 break-words">{x.quote}</span></span>}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}

// the action list in three collapsible groups, so the engineer meets one group at a time
export function ActionPlan({ r, t, Issue, open, setOpen }: any) {
  const plan = useMemo(() => actionPlan(r), [r]);
  const groups: ["critical" | "high" | "rec", Fix[]][] = [["critical", plan.critical], ["high", plan.high], ["rec", plan.recs]];
  return (
    <Panel className="p-4">
      <h3 className="text-[14px] font-semibold inline-flex items-center gap-1.5"><TriangleAlert size={15} className={plan.critical.length ? "text-bad" : "text-accent"} /> {t(PX.actions)}</h3>
      <p className="mt-1 text-[11.5px] text-ink-3 leading-relaxed">{t(PX.actionsSub)}</p>
      <div className="mt-3 space-y-2">
        {groups.map(([g, list]) => {
          const on = open === g;
          return (
            <div key={g} className={`rounded-2xl border transition-colors ${on ? "border-accent/30 bg-canvas/40" : "border-line"}`} data-action-group={g} data-count={list.length}>
              <button type="button" aria-expanded={on} disabled={!list.length} onClick={() => setOpen(on ? null : g)}
                className="press w-full min-h-[52px] flex items-center gap-3 px-3.5 text-start rounded-2xl disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                <span className={`w-2.5 h-2.5 shrink-0 rounded-full ${g === "critical" ? "bg-bad" : g === "high" ? "bg-warn" : "bg-accent"}`} />
                <span className="min-w-0 flex-1 text-[13.5px] font-medium">{t(PX.group[g])}</span>
                <Num className={`shrink-0 min-w-7 h-7 px-2 grid place-items-center rounded-full text-[12px] font-semibold ${list.length ? (g === "critical" ? "bg-bad/10 text-bad" : g === "high" ? "bg-warn/15 text-warn" : "bg-wash text-accent") : "bg-good/10 text-good"}`}>{list.length || "✓"}</Num>
                <ChevronDown size={16} className={`shrink-0 text-ink-3 transition-transform duration-300 ${on ? "rotate-180" : ""}`} />
              </button>
              {on && list.length > 0 && (
                <ul className="guide-open px-2.5 pb-2.5 space-y-2">
                  {g === "rec"
                    ? list.map((f) => (
                        <li key={f.id} className="p-3 rounded-xl bg-surface border border-line">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-[13px] font-medium leading-snug">{t(f.title)}</p>
                            {f.gain ? <span className="shrink-0 text-[11px] font-semibold text-good"><bdi dir="ltr">+<Num>{f.gain}</Num></bdi></span> : null}
                          </div>
                          {f.why && <p className="mt-1 text-[11.5px] text-ink-3 leading-relaxed">{t(f.why)}</p>}
                          {f.fix[0] && <p className="mt-1.5 text-[12px] text-ink-2 leading-relaxed">{t(f.fix[0])}</p>}
                        </li>
                      ))
                    : list.map((f) => <Issue key={f.id} i={r[g === "critical" ? "critical" : "high"].find((x: any) => x.id === f.id)} t={t} tone={g === "critical" ? "bad" : "warn"} />)}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

export function GradeCard({ r, t }: any) {
  const g = r.gradeIntel;
  if (!g) return null;
  const cls = g.state === "ok" ? "bg-good/10 border-good/25" : g.state === "advice" ? "bg-warn/10 border-warn/25" : "bg-canvas/60 border-line";
  return (
    <Panel className="p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[14px] font-medium inline-flex items-center gap-1.5"><GraduationCap size={15} className="text-accent" /> {t(PX.grade)}</h3>
        <Chip className="h-6 px-2 text-[10.5px]">{t(PX.gradeTiers[g.tier as "high"])}{g.label ? <> · <bdi dir="auto" translate="no">{g.label}</bdi></> : null}</Chip>
      </div>
      <p data-cv-grade={g.tier} className={`mt-3 p-3 rounded-xl border text-[12.5px] leading-relaxed ${cls}`}>{t(g.advice)}</p>
    </Panel>
  );
}

export function QuestionsCard({ r, t }: any) {
  const qs = r.questions || [];
  if (!qs.length) return null;
  return (
    <Panel className="p-4">
      <h3 className="text-[14px] font-medium inline-flex items-center gap-1.5"><CircleHelp size={15} className="text-accent" /> {t(PX.q)}</h3>
      <p className="mt-1 text-[11.5px] text-ink-3 leading-relaxed">{t(PX.qSub)}</p>
      <ol className="mt-3 space-y-2.5">
        {qs.map((q: any, i: number) => (
          <li key={q.from} data-question={q.from} className="p-3 rounded-xl bg-canvas/60 border border-line">
            <p className="flex gap-2 text-[13px] font-medium leading-snug"><Num className="shrink-0 text-accent">{i + 1}.</Num><span>{t(q.q)}</span></p>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-3"><span className="text-ink-2">{t(PX.qWhy)}: </span>{t(q.why)}</p>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-3"><span className="text-ink-2">{t(PX.qTip)}: </span>{t(q.tip)}</p>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

export function DraftCard({ r, t, app, copyPlain, Bracketed }: any) {
  // English by default (Egyptian and Gulf corporate convention); Arabic on request
  const [lang, setLang] = useState<"en" | "ar">("en");
  const base = useMemo(() => rebuildCV(r, lang), [r, lang]);
  const [fills, setFills] = useState<Record<string, Record<string, string>>>({ en: {}, ar: {} });
  const d = useMemo(() => applyFills(base, fills[lang] || {}), [base, fills, lang]);
  const slots = useMemo(() => slotsOf(base), [base]);
  const left = slots.filter((x) => !(fills[lang] || {})[x.id]?.trim()).length;
  const [show, setShow] = useState(false);
  const [showFill, setShowFill] = useState(false);
  const [showPairs, setShowPairs] = useState(false);
  const [busy, setBusy] = useState<"" | "pdf" | "docx">("");
  const setFill = (id: string, v: string) => setFills((f) => ({ ...f, [lang]: { ...(f[lang] || {}), [id]: v } }));
  // one group per line, in reading order
  const groups = useMemo(() => {
    const out: { line: string; slots: typeof slots }[] = [];
    slots.forEach((x) => {
      const g = out[out.length - 1];
      if (g && g.line === x.line) g.slots.push(x);
      else out.push({ line: x.line, slots: [x] });
    });
    return out;
  }, [slots]);
  // <Name>-CV-EN.pdf / .docx — ASCII, no app name: browsers drop non-Latin download names, and it travels safely by WhatsApp or e-mail
  const fileBase = () => {
    const latin = String(d.name).replace(/\[[^\]]*\]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return `${latin ? `${latin}-` : ""}CV-${lang.toUpperCase()}`;
  };
  const docx = async () => {
    if (left) app.toast(t(PX.leftWarn).replace("{n}", String(left)));
    setBusy("docx");
    try {
      const { saveOrShare } = await import("../../lib/report-pdf");
      await saveOrShare(draftDocx(d), `${fileBase()}.docx`, d.lang === "ar" ? "السيرة الذاتية" : "Curriculum Vitae", DOCX_MIME);
    } catch {
      app.toast(t(PX.pdfFail));
    } finally {
      setBusy("");
    }
  };
  const pdf = async () => {
    if (left) app.toast(t(PX.leftWarn).replace("{n}", String(left)));
    setBusy("pdf");
    try {
      const [{ renderDoc }, { saveOrShare }] = await Promise.all([import("../../doc/render"), import("../../lib/report-pdf")]);
      const res = await renderDoc(draftSpec(d));
      if (res.status !== "ok") {
        app.toast(t(PX.pdfFail));
        return;
      }
      const bytes = new Uint8Array(await res.pdf.arrayBuffer());
      await saveOrShare(bytes, `${fileBase()}.pdf`, d.lang === "ar" ? "السيرة الذاتية" : "Curriculum Vitae");
    } catch {
      app.toast(t(PX.pdfFail));
    } finally {
      setBusy("");
    }
  };
  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[14px] font-medium inline-flex items-center gap-1.5"><FileDown size={15} className="text-accent" /> {t(PX.draft)}</h3>
        <div role="group" aria-label={t(PX.langPick)} className="shrink-0 inline-flex p-0.5 rounded-full bg-canvas/60 border border-line" data-cv-lang={lang}>
          {(["en", "ar"] as const).map((l) => (
            <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)} data-cv-lang-btn={l}
              className={`press h-11 min-w-[64px] px-4 rounded-full text-[12.5px] font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${lang === l ? "bg-accent text-on-accent" : "text-ink-2"}`}>
              {l === "en" ? "English" : "عربي"}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1 text-[11.5px] text-ink-3 leading-relaxed">{t(PX.draftSub)}</p>
      <p className="mt-3 p-3 rounded-xl bg-warn/10 border border-warn/25 text-[12px] leading-relaxed inline-flex gap-2"><TriangleAlert size={14} className="shrink-0 mt-0.5 text-warn" /><span>{t(DRAFT_NOTE)}</span></p>

      {base.pairs.length > 0 && (
        <div className="mt-3" data-cv-pairs={base.pairs.length}>
          <button type="button" onClick={() => setShowPairs((x) => !x)} aria-expanded={showPairs} className="w-full flex items-center justify-between gap-2 min-h-10 text-start text-[12.5px] font-medium">
            <span>{t(base.lang === "en" ? PX.pairsEn : PX.pairsAr).replace("{n}", String(base.pairs.length))}</span>
            <ChevronDown size={15} className={`shrink-0 text-ink-3 transition-transform ${showPairs ? "rotate-180" : ""}`} />
          </button>
          {showPairs && (
            <ul className="guide-open mt-1 space-y-2">
              {base.pairs.map((p, i) => (
                <li key={i} className="p-2.5 rounded-lg bg-canvas/60 border border-line text-[11.5px] leading-relaxed" translate="no">
                  <p dir="auto" className="text-ink-3">{p.from}</p>
                  <p dir="auto" className="mt-1 text-ink"><Bracketed text={p.to} /></p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {slots.length > 0 && (
        <div className="mt-3" data-cv-asks={slots.length} data-cv-left={left}>
          <button type="button" onClick={() => setShowFill((x) => !x)} aria-expanded={showFill} className="w-full flex items-center justify-between gap-2 min-h-10 text-start text-[12.5px] font-medium">
            <span>{t(PX.asks)} <Num className={left ? "text-warn" : "text-good"}>({slots.length - left}/{slots.length})</Num></span>
            <ChevronDown size={15} className={`shrink-0 text-ink-3 transition-transform ${showFill ? "rotate-180" : ""}`} />
          </button>
          {showFill && (
            <ul className="guide-open mt-1 space-y-2.5">
              {groups.map((g, gi) => (
                <li key={gi} className="p-2.5 rounded-lg bg-canvas/60 border border-line" translate="no">
                  <p dir="auto" className="text-[11px] leading-relaxed text-ink-3 line-clamp-3"><Bracketed text={g.line} /></p>
                  <div className="mt-1.5 space-y-1.5">
                    {g.slots.map((x) => (
                      <input key={x.id} dir="auto" value={(fills[lang] || {})[x.id] || ""} onChange={(e) => setFill(x.id, e.target.value)} placeholder={x.hint} aria-label={x.hint} data-cv-slot={x.id}
                        className="w-full h-11 px-3 rounded-xl bg-surface border border-line-2 text-[13.5px] text-ink placeholder:text-ink-4 focus:outline-none focus:ring-2 focus:ring-accent" />
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button type="button" onClick={() => setShow((x) => !x)} aria-expanded={show} className="press mt-2 min-h-11 px-1 text-[12.5px] font-medium text-accent">{t(show ? PX.hideDraft : PX.showDraft)}</button>
      {show && (
        <pre dir={d.lang === "ar" ? "rtl" : "ltr"} lang={d.lang} translate="no" data-cv-draft className="guide-open mt-1 p-3 rounded-xl bg-canvas/60 border border-line whitespace-pre-wrap break-words font-sans text-[12px] leading-[1.75] text-ink text-start"><Bracketed text={draftText(d)} /></pre>
      )}
      <p className="mt-2 text-[10.5px] text-ink-3 leading-relaxed">{t(PX.whiteLabel)}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Secondary onClick={pdf} disabled={!!busy} className="h-12 press" data-cv-pdf>{busy === "pdf" ? <LoaderCircle size={15} className="spin" /> : <FileDown size={15} />} {t(busy === "pdf" ? PX.pdfBusy : PX.pdf)}</Secondary>
        <Secondary onClick={docx} disabled={!!busy} className="h-12 press" data-cv-docx>{busy === "docx" ? <LoaderCircle size={15} className="spin" /> : <FileText size={15} />} {t(PX.docx)}</Secondary>
        <Secondary onClick={() => { copyPlain(draftText(d)); app.toast(t(PX.copied)); }} className="col-span-2 h-11 press"><Copy size={15} /> {t(PX.copy)}</Secondary>
      </div>
    </Panel>
  );
}
