// =====================================================================
//  Raise & inflation tracker (Feature 4) — «الزيادة والتضخم»
//  · Your salary history (private: this device, and your own state row on the live platform — never shared).
//  · Each raise against Egypt's official inflation (CAPMAS urban headline), and what today's salary is really worth.
//  · The market's yearly raise for your discipline from members' anonymous reports (5 reports up). Sharing your own
//    raise sends a percentage and a month only — never a salary.
// =====================================================================
import { useEffect, useMemo, useState } from "react";
import { LockKeyhole, Plus, Send, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { isCloud } from "../../backend/config";
import * as cloud from "../../backend/cloud";
import { INFLATION, INFLATION_SOURCE } from "../../data/inflation";
import { lastYear, monthKey, realHistory } from "../../domain/raises";
import { ROLE } from "../../domain/taxonomy";
import { round500 } from "../../lib/helpers";
import { Field, Result } from "../../ui/chrome";
import { FilterChip, Num, Primary, Secondary } from "../../ui/primitives";
import { fmt } from "../../ui/theme";

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
export const monthLabel = (m?: string) => { if (!m) return "—"; const [y, mo] = m.split("-").map(Number); return `${MONTHS[mo - 1]} ${y}`; };
const pct = (x: number, d = 1) => `${x >= 0 ? "+" : "−"}${Math.abs(x).toFixed(d)}%`;
export const KINDS = [["annual", "زيادة سنوية"], ["promotion", "ترقية"], ["switch", "تغيير شركة"]] as const;
// the demo's market raise (modeled from the platform's reference model, labelled as such); the live platform uses reports
const DEMO_RAISES = { access: "demo", n: 0, min: 5, p25: 12, p50: 18, p75: 25, byKind: [] };

function useInflation() {
  const [series, setSeries] = useState<[string, number][]>(INFLATION);
  useEffect(() => { if (!isCloud()) return; let gone = false; cloud.inflationSeries().then((s) => { if (!gone && s.length) setSeries(s); }, () => {}); return () => { gone = true; }; }, []);
  return series;
}
function useMarketRaises(disc?: any, track?: any) {
  const [m, setM] = useState<any>(isCloud() ? null : DEMO_RAISES);
  useEffect(() => {
    if (!isCloud()) return; let gone = false;
    (async () => { let d = await cloud.marketRaises(disc, track || null); let wide = false; if (d.access !== "none" && d.n < d.min && track) { const all = await cloud.marketRaises(disc, null); if (all.n >= all.min) { d = all; wide = true; } } if (!gone) setM({ ...d, wide }); })().catch(() => { if (!gone) setM({ error: true }); });
    return () => { gone = true; };
  }, [disc, track]);
  return m;
}

export function RaiseTracker({ app }: any) {
  const pr = app.profile; const series = useInflation(); const market = useMarketRaises(pr.disc, pr.track);
  const log = app.salaryLog || []; const h = useMemo(() => realHistory(series, log), [series, log]);
  const [month, setMonth] = useState<any>(monthKey()); const [sal, setSal] = useState<any>(""); const [offer, setOffer] = useState<any>("15");
  const [kind, setKind] = useState<any>("annual"); const [sent, setSent] = useState<any>(null); const [busy, setBusy] = useState(false);
  const lastPub = series[series.length - 1]; const latest = lastPub ? lastPub[1] : 0; const step = h.steps[h.steps.length - 1];
  const add = () => { const s = Number(sal); if (!s || !/^\d{4}-\d{2}$/.test(month) || month > monthKey()) { app.toast("اكتب الشهر والراتب"); return; } app.saveSalaryLog([...log.filter((x) => x.month !== month), { month, salary: s }]); setSal(""); setSent(null); };
  const share = async () => {
    if (!step) return; setBusy(true);
    try { if (isCloud()) await cloud.reportRaise({ disc: pr.disc, track: pr.track, pos: pr.pos, pct: step.nominal, kind, month: step.to }); setSent(step.to); app.saveSalaryLog(log.map((x) => (x.month === step.to ? { ...x, shared: true } : x))); app.toast("شكرًا — أُضيفت نسبة زيادتك مجهولة إلى معدل السوق"); }
    catch (e: any) { app.toast(e.message); }
    setBusy(false);
  };
  const real = ((1 + (Number(offer) || 0) / 100) / (1 + latest / 100) - 1) * 100;
  const max = Math.max(...lastYear(series).map(([, v]) => v), 1);
  return (<div className="space-y-4">
    {h.now ? <Result tone={h.now.inflation < 3 ? "good" : "warn"} className="mt-0">
      <p className="text-[11px] text-ink-2">منذ آخر تغيير في راتبك ({monthLabel(h.now.since)})</p>
      <div className="mt-1 flex items-baseline gap-2"><Num className="text-[30px] font-semibold tracking-[-0.03em] text-warn">−{h.now.lost.toFixed(1)}%</Num><span className="text-[12px] text-ink-2">من قوّتك الشرائية</span></div>
      <ul className="mt-2 space-y-1 text-[12.5px] text-ink-2">
        <li className="flex justify-between gap-2"><span>التضخم منذ ذلك الشهر</span><Num className="text-ink">{pct(h.now.inflation)}</Num></li>
        <li className="flex justify-between gap-2"><span>راتبك بقيمة {monthLabel(h.now.since)}</span><Num className="text-ink">{fmt(Math.round(h.now.realNow))}</Num></li>
        <li className="flex justify-between gap-2"><span>لتعود لنفس المستوى اليوم</span><Num className="text-ink font-semibold">{fmt(round500(h.now.keepLevel))}</Num></li>
      </ul>
      {h.now.assumed > 0 && <p className="mt-2 text-[10.5px] text-ink-3">آخر شهر منشور رسميًا {monthLabel(h.now.lastPublished)} — الأشهر بعده (<Num>{h.now.assumed}</Num>) محسوبة بآخر معدل منشور.</p>}
    </Result> : <p className="text-[12.5px] text-ink-2 leading-relaxed">سجّل راتبك عند كل تغيير (شهر الزيادة والراتب الجديد) — نحسب كم أكل التضخم منه، وهل كانت كل زيادة زيادة فعلًا. السجل لك وحدك ولا يُشارك.</p>}

    <section><h4 className="text-[13px] font-medium mb-2">سجل راتبك</h4>
      <div className="space-y-2"><Field label="الشهر" value={month} onChange={setMonth} type="month" unit="" />
        <div className="flex gap-2 items-end"><div className="flex-1 min-w-0"><Field label="الراتب الإجمالي" value={sal} onChange={setSal} /></div><Primary onClick={add} className="h-12 px-4 press shrink-0"><Plus size={16} /> إضافة</Primary></div></div>
      {log.length > 0 && <ul className="mt-2 divide-y divide-line rounded-xl border border-line bg-surface">{[...log].sort((a, b) => (a.month < b.month ? 1 : -1)).map((x) => { const s = h.steps.find((t) => t.to === x.month); return (
        <li key={x.month} className="px-3 py-2.5 flex items-center justify-between gap-2 text-[12.5px]">
          <span className="min-w-0"><span className="block text-ink">{monthLabel(x.month)} · <Num>{fmt(x.salary)}</Num></span>{s && <span className="block text-[11px] text-ink-3">زيادة <Num>{pct(s.nominal)}</Num> · التضخم <Num>{pct(s.inflation)}</Num> · <span className={s.real >= 0 ? "text-good" : "text-warn"}>حقيقية <Num>{pct(s.real)}</Num></span></span>}</span>
          <button type="button" aria-label="حذف" onClick={() => app.saveSalaryLog(log.filter((y) => y.month !== x.month))} className="press shrink-0 grid place-items-center w-9 h-9 rounded-full text-ink-3 hover:text-bad"><Trash2 size={15} /></button>
        </li>); })}</ul>}
      {step && step.nominal > 0 && sent !== step.to && !(log.find((x) => x.month === step.to) || {}).shared && <div className="mt-2 p-3 rounded-xl bg-canvas/60 border border-line">
        <p className="text-[12px] text-ink-2 leading-relaxed">ساعد غيرك: شارك نسبة زيادتك الأخيرة (<Num>{pct(step.nominal)}</Num>، {monthLabel(step.to)}) مجهولة — نسبة وشهر فقط، دون أي رقم راتب.</p>
        <div className="mt-2 flex gap-1.5 flex-wrap">{KINDS.map(([k, l]) => <FilterChip key={k} on={kind === k} onClick={() => setKind(k)}>{l}</FilterChip>)}</div>
        <Secondary onClick={share} disabled={busy} className="w-full h-10 mt-2 press"><Send size={14} className="rtl:-scale-x-100" /> شارك النسبة مجهولة</Secondary></div>}
    </section>

    <section><h4 className="text-[13px] font-medium mb-2">الزيادة السنوية في السوق · {ROLE[pr.disc] || "مهندس"}</h4>
      {!market ? <p className="text-[12px] text-ink-3">جارٍ التحميل…</p> : market.error ? <p className="text-[12px] text-ink-3">تعذّر التحميل — أعد المحاولة لاحقًا.</p>
        : market.p50 != null ? <div className="p-3 rounded-xl bg-surface border border-line">
          <div className="flex items-baseline gap-2"><Num className="text-[24px] font-semibold">{market.p50}%</Num><span className="text-[12px] text-ink-2">الوسيط · النصف الأوسط <Num>{market.p25}</Num>–<Num>{market.p75}</Num>%</span></div>
          <p className="mt-1 text-[11px] text-ink-3">{market.access === "demo" ? "نموذجي (عرض تجريبي) — على المنصة الحية من تقارير الأعضاء" : <>من <Num>{market.n}</Num> تقريرًا خلال آخر 12 شهرًا{market.wide ? " · كل المسارات" : ""}</>}</p>
          {step && <p className={`mt-2 text-[12px] inline-flex items-center gap-1.5 ${step.nominal >= market.p50 ? "text-good" : "text-warn"}`}>{step.nominal >= market.p50 ? <TrendingUp size={14} /> : <TrendingDown size={14} />} زيادتك الأخيرة <Num>{pct(step.nominal)}</Num> {step.nominal >= market.p50 ? "عند وسط السوق أو أعلى" : "أقل من وسط السوق"}</p>}
          {(market.byKind || []).map((k) => <p key={k.key} className="mt-1 text-[11.5px] text-ink-2">{(KINDS.find((x) => x[0] === k.key) || [, k.key])[1]}: الوسيط <Num>{k.p50}</Num>% · <Num>{k.n}</Num> تقارير</p>)}
        </div> : <p className="text-[12px] text-ink-3 inline-flex items-center gap-1.5"><LockKeyhole size={13} /> يظهر المعدل من 5 تقارير — الآن <Num>{market.n || 0}</Num>. شارك نسبة زيادتك لتقريبه.</p>}
    </section>

    <section><h4 className="text-[13px] font-medium mb-2">زيادة معروضة عليك؟</h4>
      <Field label="نسبة الزيادة" value={offer} onChange={setOffer} unit="%" />
      <p className="mt-2 text-[12.5px] text-ink-2">مقابل آخر تضخم سنوي منشور (<Num>{latest}</Num>%، {monthLabel(lastPub && lastPub[0])}): <span className={real >= 0 ? "text-good font-medium" : "text-warn font-medium"}>قوّتك الشرائية <Num>{pct(real)}</Num></span>{real < 0 ? " — تخفيض مقنّع، والتضخم حجتك الأقوى في النقاش." : ""}</p>
      <Secondary onClick={() => { app.closeSheet(); app.openSheet("tool", { id: "raise" }); }} className="w-full h-11 mt-2">هل ده وقت طلب الزيادة؟</Secondary>
    </section>

    <section><h4 className="text-[13px] font-medium mb-2">التضخم الرسمي — آخر 12 شهرًا</h4>
      <ul className="space-y-1">{lastYear(series).map(([m, v]) => <li key={m} className="flex items-center gap-2 text-[11.5px]"><span className="w-24 shrink-0 text-ink-2">{monthLabel(m)}</span><span className="flex-1 h-2 rounded-full bg-line overflow-hidden" aria-hidden="true"><span className="block h-full rounded-full bg-accent" style={{ width: `${(v / max) * 100}%` }} /></span><Num className="w-12 text-end">{v}%</Num></li>)}</ul>
      <p className="mt-2 text-[10.5px] text-ink-3 leading-relaxed">المصدر: {INFLATION_SOURCE} (سنوي على أساس سنوي). الحساب الشهري = (1 + المعدل السنوي)^(1/12).</p>
    </section>
  </div>);
}
