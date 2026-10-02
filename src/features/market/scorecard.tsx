// =====================================================================
//  Company scorecard (Feature 3) — five factors from anonymous reviews: pay vs market, raises, paying on time, overtime,
//  site conditions. Live: public.company_scorecard() (each factor from 5 different reviewers up; nobody reads anyone's
//  individual ratings). Demo: the same rules on a modeled base plus this browser's ratings, labelled as such.
// =====================================================================
import { useEffect, useState } from "react";
import { ClipboardList, LockKeyhole } from "lucide-react";
import { isCloud } from "../../backend/config";
import * as cloud from "../../backend/cloud";
import { FACTORS, SCORE_MIN, demoScorecard, nearest } from "../../domain/scorecard";
import { Num, Panel } from "../../ui/primitives";

export function useScorecard(app?: any, c?: any) {
  const mine = ((app && c && app.reviews[c.id]) || []).filter((r) => r && r.mine);
  const [live, setLive] = useState<any>(null);
  // reload after the member's own review reaches the server (its id stops being the temporary one)
  const rev = mine.map((r) => r.id).join();
  useEffect(() => {
    if (!isCloud() || !c) return; let gone = false;
    cloud.companyScorecard(c.id).then((d) => { if (!gone) setLive(d); }, () => { if (!gone) setLive({ error: true }); });
    return () => { gone = true; };
  }, [c && c.id, rev]);
  if (!c) return null;
  return isCloud() ? live : { access: "demo", ...demoScorecard(c, mine) };
}

export function ScorecardPanel({ app, c }: any) {
  const sc = useScorecard(app, c);
  if (!sc || sc.access === "none") return null;
  if (sc.error) return <Panel className="p-4 text-[12px] text-ink-2">تعذّر تحميل بطاقة الشركة — اسحب للتحديث.</Panel>;
  const open = FACTORS.filter((f) => sc.factors[f.id] && sc.factors[f.id].avg != null);
  return (
    <Panel className="p-4">
      <div className="flex items-center justify-between gap-2"><h3 className="text-[13.5px] font-medium inline-flex items-center gap-1.5"><ClipboardList size={15} className="text-accent" /> بطاقة الشركة</h3>
        <span className="text-[10.5px] text-ink-3"><Num>{sc.n}</Num> مهندس قيّموا{sc.access === "demo" ? " · نموذجي (عرض تجريبي)" : ""}</span></div>
      <ul className="mt-3 space-y-3">{FACTORS.map((f) => { const x = sc.factors[f.id] || { n: 0 }; const on = x.avg != null; return (
        <li key={f.id}>
          <div className="flex items-baseline justify-between gap-2 text-[12.5px]"><span className="text-ink">{f.label}</span>
            {on ? <span className="text-ink-2"><span className="text-ink font-medium">{nearest(f.id, x.avg)}</span> · <Num>{x.avg.toFixed(1)}</Num>/5</span> : <span className="text-[11px] text-ink-3 inline-flex items-center gap-1"><LockKeyhole size={11} /> يحتاج <Num>{SCORE_MIN - x.n}</Num> تقييمات أخرى</span>}</div>
          <div className="mt-1.5 h-2 rounded-full bg-line overflow-hidden" aria-hidden="true">{on && <div className={`h-full rounded-full ${x.avg >= 3.5 ? "bg-good" : x.avg >= 2.5 ? "bg-accent" : "bg-warn"}`} style={{ width: `${(x.avg / 5) * 100}%` }} />}</div>
          {on && <p className="mt-1 text-[10.5px] text-ink-3"><Num>{x.good}</Num>% إيجابي · من <Num>{x.n}</Num> مهندسين</p>}
        </li>); })}</ul>
      <p className="mt-3 text-[10.5px] text-ink-3 leading-relaxed">{open.length ? "" : "لا يظهر أي عامل قبل أن يقيّمه 5 مهندسين مختلفين. "}كل عضو يُحسب مرة واحدة (آخر تقييم له) خلال آخر 24 شهرًا، ولا يرى أحد إجابات عضو بعينه.</p>
    </Panel>
  );
}
