// The official inflation series behind the raise tracker (Feature 4): staff add each month CAPMAS publishes.
// Live: public.inflation_rates (staff-only writes by RLS). Demo: edits stay on this screen.
import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { isCloud } from "../../backend/config";
import * as cloud from "../../backend/cloud";
import { INFLATION, INFLATION_SOURCE } from "../../data/inflation";
import { monthKey } from "../../domain/raises";
import { monthLabel } from "../market/raise-tracker";
import { Field } from "../../ui/chrome";
import { Num, Panel, Primary } from "../../ui/primitives";

export function InflationPanel({ A }: any) {
  const [series, setSeries] = useState<[string, number][]>(INFLATION); const [month, setMonth] = useState<any>(""); const [yoy, setYoy] = useState<any>(""); const [busy, setBusy] = useState(false);
  useEffect(() => { if (isCloud()) cloud.inflationSeries().then((s) => s.length && setSeries(s), () => {}); }, []);
  const last = series[series.length - 1]; const behind = last ? Math.max(0, (Number(monthKey().slice(0, 4)) - Number(last[0].slice(0, 4))) * 12 + Number(monthKey().slice(5)) - Number(last[0].slice(5)) - 1) : 0;
  const save = async () => {
    const v = Number(yoy); if (!/^\d{4}-\d{2}$/.test(month) || !Number.isFinite(v) || v < -20 || v > 100) { A.toast("اكتب الشهر والنسبة (بين −20 و100)"); return; }
    setBusy(true);
    try { if (isCloud()) await cloud.admin.setInflation(month, v); setSeries((s) => [...s.filter(([m]) => m !== month), [month, v] as [string, number]].sort((a, b) => (a[0] < b[0] ? -1 : 1))); setMonth(""); setYoy(""); A.toast(`حُفظ تضخم ${monthLabel(month)}`); }
    catch (e: any) { A.toast(e.message); }
    setBusy(false);
  };
  return (
    <Panel className="p-4">
      <div className="flex items-center gap-2"><TrendingUp size={16} className="text-accent" /><h3 className="text-[14px] font-medium">التضخم الرسمي (أداة الزيادة والتضخم)</h3></div>
      <p className="mt-1 text-[11.5px] text-ink-2 leading-relaxed">أضف كل شهر فور نشره: {INFLATION_SOURCE}. آخر شهر مسجّل: <span className="text-ink">{monthLabel(last && last[0])}</span> (<Num>{last ? last[1] : "—"}</Num>%).{behind > 0 ? <> الأداة تقدّر <Num>{behind}</Num> شهرًا بعده بآخر معدل حتى تضيفها.</> : null}</p>
      <div className="mt-3 grid grid-cols-2 gap-2"><Field label="الشهر" value={month} onChange={setMonth} type="month" unit="" /><Field label="التضخم السنوي" value={yoy} onChange={setYoy} unit="%" /></div>
      <Primary onClick={save} disabled={busy} className="w-full h-11 mt-2 press">حفظ الشهر</Primary>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[11.5px] text-ink-2">{series.slice(-6).reverse().map(([m, v]) => <li key={m} className="flex justify-between"><span>{monthLabel(m)}</span><Num className="text-ink">{v}%</Num></li>)}</ul>
    </Panel>
  );
}
