// =====================================================================
//  CV review — the hiring-panel views (v25): the before / after projection, the four readers with the honesty line,
//  the graduation-grade advice, the tough interview questions and the rebuilt draft (copy · A4 PDF).
//  Everything renders from the audit result (./panel.ts, ./rebuild.ts); the PDF is drawn on the device by the
//  document kit, loaded only when the member asks for it.
// =====================================================================
import { useMemo, useState } from "react";
import { Bot, Briefcase, ChevronDown, CircleCheck, CircleHelp, CircleX, Copy, FileDown, GraduationCap, Handshake, LoaderCircle, Quote, Scale, Timer, TriangleAlert, Users } from "lucide-react";
import { L2 } from "../../i18n/i18n";
import { Chip, Num, Panel, Secondary } from "../../ui/primitives";
import { REVIEWERS, type Reviewer, type ReviewerId } from "./panel";
import { DRAFT_NOTE, applyFills, draftSpec, draftText, rebuildCV, rescreen, slotsOf } from "./rebuild";

export const PX = {
  panel: L2("لجنة التوظيف", "The hiring panel"),
  panelSub: L2("أربعة قرّاء مستقلين لنفس السيرة — كلٌّ يسأل سؤاله فقط. على جهازك، بلا ذكاء اصطناعي ولا رفع للملف.", "Four independent readers of the same CV — each asks only their own question. On your device: no AI, no upload."),
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
  pdf: L2("تنزيل السيرة PDF", "Download the CV (PDF)"),
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

// the projection strip inside the score card: «62 → 84» and the screen's verdict before → after
export function Projection({ r, t, ctx }: any) {
  const p = r.projection;
  const rs = useMemo(() => rescreen(r, ctx), [r]);
  if (!p) return null;
  const up = p.projected - p.now;
  return (
    <div className="mt-3 pt-3 border-t border-line" data-cv-projection>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-ink-3">{t(PX.now)} → {t(PX.projected)}</p>
          <p className="mt-0.5 text-[20px] font-semibold leading-none">
            <bdi dir="ltr" className="font-grotesk"><Num>{p.now}</Num> <span className="text-ink-3">→</span> <span className="text-good"><Num>{p.projected}</Num></span></bdi>
            {up > 0 && <span className="ms-2 align-middle text-[11px] font-medium text-good"><bdi dir="ltr">+{up}</bdi></span>}
          </p>
        </div>
        <div className="shrink-0 text-end" data-rescreen={`${rs.before}>${rs.after}`}>
          <p className="text-[11px] text-ink-3">{t(PX.screenAB)}</p>
          <p className="mt-0.5 text-[12.5px] font-medium">
            <span className={VCLS[rs.before]}>{t(PX.verdict[rs.before])}</span> <span className="text-ink-3">→</span> <span className={VCLS[rs.after]}>{t(PX.verdict[rs.after])}</span>
          </p>
        </div>
      </div>
      <p className="mt-1.5 text-[10.5px] leading-relaxed text-ink-3">{t(PX.projNote)}</p>
      {rs.still.length > 0 && <p className="mt-1 text-[10.5px] leading-relaxed text-warn">{rs.still.map(t).join(" · ")}</p>}
    </div>
  );
}

function ReviewerRow({ v, t }: { v: Reviewer; t: (x: any) => string }) {
  const [open, setOpen] = useState(false);
  const I = ICON[v.id];
  const first = v.reasons.find((x) => !x.good) || v.reasons[0];
  return (
    <li className="py-2.5" data-reviewer={v.id} data-verdict={v.verdict}>
      <button type="button" aria-expanded={open} onClick={() => setOpen((x) => !x)} className="press w-full flex items-start gap-2.5 text-start rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        <span className="grid place-items-center w-9 h-9 shrink-0 rounded-xl bg-wash text-accent"><I size={17} /></span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-medium leading-snug">{t(v.label)}</span>
            <Chip tone={VTONE[v.verdict]} className={`shrink-0 h-6 px-2 text-[10.5px] ${v.verdict === "reject" ? "!text-bad !border-bad/25 !bg-bad/5" : ""}`}>{t(PX.verdict[v.verdict])} · <Num>{v.score}</Num></Chip>
          </span>
          {first && <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-2">{t(first.text)}</span>}
        </span>
        <ChevronDown size={15} className={`shrink-0 mt-2 text-ink-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="guide-open mt-2 ps-11 space-y-1.5">
          <p className="text-[11px] text-ink-3 leading-relaxed">{t(v.asks)}</p>
          <ul className="space-y-1.5">
            {v.reasons.map((x, i) => (
              <li key={i} className="flex items-start gap-2 text-[12px] leading-relaxed">
                {x.good ? <CircleCheck size={13} className="shrink-0 mt-1 text-good" /> : <CircleX size={13} className="shrink-0 mt-1 text-bad" />}
                <span className="min-w-0">
                  <span className="text-ink">{t(x.text)}</span>
                  {x.quote && <span dir="auto" translate="no" className="mt-0.5 flex items-start gap-1 text-[11px] text-ink-3"><Quote size={10} className="shrink-0 mt-1" /><span className="min-w-0 break-words">{x.quote}</span></span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

export function HiringPanelCard({ r, t }: any) {
  if (!r.panel) return null;
  const h = r.honesty;
  return (
    <Panel className="p-4">
      <h3 className="text-[14px] font-medium inline-flex items-center gap-1.5"><Scale size={15} className="text-accent" /> {t(PX.panel)}</h3>
      <p className="mt-1 text-[11.5px] text-ink-3 leading-relaxed">{t(PX.panelSub)}</p>
      {h && (
        <p data-cv-honesty={h.strong ? "strong" : "toughest"} className={`mt-3 p-3 rounded-xl border text-[12.5px] leading-relaxed ${h.strong ? "bg-good/10 border-good/25 text-ink" : "bg-warn/10 border-warn/25 text-ink"}`}>{t(h.text)}</p>
      )}
      <ul className="mt-2 divide-y divide-line">{r.panel.map((v: Reviewer) => <ReviewerRow key={v.id} v={v} t={t} />)}</ul>
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
  const [busy, setBusy] = useState(false);
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
  const pdf = async () => {
    if (left) app.toast(t(PX.leftWarn).replace("{n}", String(left)));
    setBusy(true);
    try {
      const [{ renderDoc }, { saveOrShare }] = await Promise.all([import("../../doc/render"), import("../../lib/report-pdf")]);
      const res = await renderDoc(draftSpec(d));
      if (res.status !== "ok") {
        app.toast(t(PX.pdfFail));
        return;
      }
      const bytes = new Uint8Array(await res.pdf.arrayBuffer());
      // an ASCII file name with no app name: browsers drop non-Latin download names, and it travels safely by WhatsApp or e-mail
      const latin = String(d.name).replace(/\[[^\]]*\]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      await saveOrShare(bytes, `${latin ? `${latin}-` : ""}CV-${lang.toUpperCase()}.pdf`, d.lang === "ar" ? "السيرة الذاتية" : "Curriculum Vitae");
    } catch {
      app.toast(t(PX.pdfFail));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[14px] font-medium inline-flex items-center gap-1.5"><FileDown size={15} className="text-accent" /> {t(PX.draft)}</h3>
        <div role="group" aria-label={t(PX.langPick)} className="shrink-0 inline-flex p-0.5 rounded-full bg-canvas/60 border border-line" data-cv-lang={lang}>
          {(["en", "ar"] as const).map((l) => (
            <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)} data-cv-lang-btn={l}
              className={`press h-8 min-w-[52px] px-3 rounded-full text-[12px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${lang === l ? "bg-accent text-on-accent" : "text-ink-2"}`}>
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
                        className="w-full h-10 px-3 rounded-lg bg-surface border border-line-2 text-[13px] text-ink placeholder:text-ink-4 focus:outline-none focus:ring-2 focus:ring-accent" />
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button type="button" onClick={() => setShow((x) => !x)} aria-expanded={show} className="mt-2 h-9 text-[12px] text-accent">{t(show ? PX.hideDraft : PX.showDraft)}</button>
      {show && (
        <pre dir={d.lang === "ar" ? "rtl" : "ltr"} lang={d.lang} translate="no" data-cv-draft className="guide-open mt-1 p-3 rounded-xl bg-canvas/60 border border-line whitespace-pre-wrap break-words font-sans text-[12px] leading-[1.75] text-ink text-start"><Bracketed text={draftText(d)} /></pre>
      )}
      <p className="mt-2 text-[10.5px] text-ink-3 leading-relaxed">{t(PX.whiteLabel)}</p>
      <div className="mt-2 flex gap-2">
        <Secondary onClick={pdf} disabled={busy} className="flex-1 h-11 press" data-cv-pdf>{busy ? <LoaderCircle size={15} className="spin" /> : <FileDown size={15} />} {t(busy ? PX.pdfBusy : PX.pdf)}</Secondary>
        <Secondary onClick={() => { copyPlain(draftText(d)); app.toast(t(PX.copied)); }} className="flex-1 h-11 press"><Copy size={15} /> {t(PX.copy)}</Secondary>
      </div>
    </Panel>
  );
}
