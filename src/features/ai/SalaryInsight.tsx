// =====================================================================
//  «قراءة المهندس الذكي للسوق» — salary intelligence under the live explorer (docs/AI.md → salary insights).
//  · The model never sees a report: the proxy calls salary_explorer AS the member (their give-to-get access and the 5-report
//    floor apply) and forwards only the aggregates — percentiles, n, and track / governorate rows of 5+. No company rows.
//  · The member's own net salary travels only if they tick «قارن براتبي»; it is not stored anywhere.
//  · One answer per cell is kept for 24 h on the phone, so reopening the market costs nothing.
// =====================================================================
import { useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { L2, say } from "../../i18n/i18n";
import { yearsRange } from "../../backend/map";
import { aiAvailable, ask, type AiError } from "../../services/ai-service";
import { DAY, cached, remember } from "../../services/ai-cache";
import { Markdown } from "../../ui/markdown";
import { Panel } from "../../ui/primitives";

const X = {
  title: L2("قراءة المهندس الذكي لسوقك", "The Smart Engineer reads your market"),
  sub: L2("تحليل من أرقام مجمّعة فقط (5 تقارير أو أكثر لكل خلية) — لا يرى أي راتب فردي.", "Built from aggregates only (5+ reports per cell) — it never sees an individual salary."),
  go: L2("حلّل السوق", "Analyse the market"),
  ask: L2("سؤال محدد (اختياري)", "A specific question (optional)"),
  askPh: L2("مثال: لو انتقلت للمكتب الفني هزيد كام؟", "e.g. how much more if I move to the technical office?"),
  mine: L2("قارن براتبي الحالي ({n} ج.م صافي) — يُرسل رقمك فقط ولا يُحفظ", "Compare with my current salary (EGP {n} net) — only your figure is sent, never stored"),
  busy: L2("بيقرا الأرقام…", "Reading the numbers…"),
  again: L2("تحليل جديد", "New analysis"),
  cached: L2("تحليل محفوظ من آخر 24 ساعة", "Saved analysis from the last 24 hours"),
};

export function SalaryInsightCard({ app, disc, exp, gov, track, unlocked }: any) {
  const t = (x: any) => say(app, x);
  const en = app.lang === "en";
  const log = app.salaryLog || [];
  const mine = log.length ? Number(log[log.length - 1].salary) || 0 : 0;
  const [useMine, setUseMine] = useState(false);
  const [q, setQ] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<AiError | null>(null);
  const [fromCache, setFromCache] = useState(false);
  if (!aiAvailable() || !unlocked || app.moneyAccess === "none") return null;

  const [lo, hi] = yearsRange(exp);
  const cellKey = `${disc}|${track || ""}|${exp}|${gov || ""}|${en ? "en" : "ar"}|${useMine ? mine : 0}`;
  const run = async (fresh = false) => {
    const question = q.trim() || (en ? "Analyse my market cell and tell me where I stand and what moves pay more." : "حلّل خلية السوق دي وقولي أنا فين، وإيه الخطوات اللي بتزوّد الراتب.");
    if (!fresh && !q.trim()) {
      const hit = cached("salary-insights", question, cellKey, DAY);
      if (hit) {
        setText(hit);
        setFromCache(true);
        return;
      }
    }
    setBusy(true);
    setErr(null);
    setText("");
    setFromCache(false);
    const r = await ask({
      feature: "salary-insights",
      messages: [{ role: "user", text: question.slice(0, 600) }],
      context: { disc, track: track || undefined, yearsMin: lo, yearsMax: hi, years: exp, gov: gov || undefined, mySalary: useMine && mine > 0 ? mine : undefined },
      onDelta: (_d, all) => setText(all),
    });
    setBusy(false);
    if (r.ok === true) {
      setText(r.text);
      if (!q.trim()) remember("salary-insights", question, cellKey, r.text);
    } else {
      setErr(r.error);
      if (!r.text) setText("");
    }
  };

  return (
    <Panel className="p-4" data-ai-salary>
      <h3 className="text-[14px] font-semibold inline-flex items-center gap-1.5"><Sparkles size={15} className="text-accent" /> {t(X.title)}</h3>
      <p className="mt-1 text-[11.5px] text-ink-3 leading-relaxed">{t(X.sub)}</p>
      {!text && !busy && (
        <>
          <label className="mt-3 block">
            <span className="block text-[12px] text-ink-2 mb-1">{t(X.ask)}</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} dir="auto" translate="no" maxLength={300} placeholder={t(X.askPh)} className="w-full h-11 px-3 rounded-xl bg-canvas border border-line-2 text-[13.5px] focus:outline-none focus:border-accent" data-ai-salary-q />
          </label>
          {mine > 0 && (
            <label className="mt-2 flex items-start gap-2 min-h-11 text-[12px] text-ink-2 leading-snug cursor-pointer">
              <input type="checkbox" checked={useMine} onChange={(e) => setUseMine(e.target.checked)} className="mt-0.5 w-5 h-5 accent-[rgb(var(--accent))]" data-ai-salary-mine />
              <span>{t(X.mine).replace("{n}", mine.toLocaleString("en-US"))}</span>
            </label>
          )}
          <button type="button" onClick={() => run()} className="press mt-3 w-full min-h-11 inline-flex items-center justify-center gap-1.5 rounded-xl btn-primary text-[13.5px] font-medium" data-ai-salary-go>
            <Sparkles size={15} /> {t(X.go)}
          </button>
        </>
      )}
      {busy && !text && <p className="mt-3 text-[12.5px] text-ink-3 inline-flex items-center gap-2"><Sparkles size={14} className="text-accent" /> {t(X.busy)}</p>}
      {text && <div className="mt-3 msg-in" data-ai-salary-answer><Markdown text={text} /></div>}
      {err && <p className="mt-2 text-[12px] text-warn" data-ai-salary-error={err.code}>{en ? err.en : err.ar}</p>}
      {(text || err) && !busy && (
        <div className="mt-2 flex items-center justify-between gap-2">
          {fromCache ? <span className="text-[11px] text-ink-3" data-ai-cached>{t(X.cached)}</span> : <span />}
          <button type="button" onClick={() => { setText(""); setErr(null); if (fromCache) run(true); }} className="press min-h-11 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-accent">
            <RefreshCw size={14} /> {t(X.again)}
          </button>
        </div>
      )}
    </Panel>
  );
}
