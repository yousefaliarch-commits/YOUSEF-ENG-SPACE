// =====================================================================
//  The live salary explorer (cloud mode) — real member reports above the reference model in «السوق ← الرواتب».
//  · Headline cell: discipline × experience band × the chosen governorate, all tracks together (so early data is not
//    spread too thin); under 5 reports there it widens to all of Egypt, and says so.
//  · Give-to-get, enforced by the server (salary_explorer / salary_shares RLS): an engineer who has not shared in the
//    last 12 months sees the headline median only; one share unlocks the range, the breakdowns and individual reports.
//    HR and owners see aggregates; field staff never reach this screen.
//  In the demo nothing here renders and the screen is exactly the reference model, as before.
// =====================================================================
import { useEffect, useState } from "react";
import { BadgeCheck, Building2, LockKeyhole, MapPin, Radio, Users } from "lucide-react";
import { isCloud } from "../../backend/config";
import * as cloud from "../../backend/cloud";
import { govName } from "../../data/geo";
import { label, EXP, trackLabel } from "../../domain/taxonomy";
import { Money } from "../../lib/helpers";
import { Percentiles } from "../../ui/chrome";
import { Chip, Num, Panel, Primary } from "../../ui/primitives";
import { fmt } from "../../ui/theme";

// live = { loading, data (the explorer's answer), wide (true when widened to all of Egypt), shares (individual reports) }
export function useLiveSalary(disc?: any, exp?: any, g?: any, rev: any = 0) {
  const [live, setLive] = useState<any>({ loading: isCloud(), data: null, wide: false, shares: [], rev });
  useEffect(() => {
    if (!isCloud()) return; let gone = false; setLive((l) => ({ ...l, loading: true }));
    (async () => {
      let data = await cloud.salaryExplorer(disc, exp, g); let wide = false;
      if (data.access !== "none" && data.n < data.min && g) { const all = await cloud.salaryExplorer(disc, exp, null); if (all.n >= all.min) { data = all; wide = true; } }
      const shares = data.access === "full" ? await cloud.latestShares(disc, exp, wide ? null : g) : [];
      if (!gone) setLive({ loading: false, data, wide, shares, rev });
    })().catch((e) => { if (!gone) setLive({ loading: false, data: null, wide: false, shares: [], error: e.message, rev }); });
    return () => { gone = true; };
  }, [disc, exp, g, rev]);
  // «loading» is true in the very render where the inputs changed (a share was recorded), not one effect later — no frame of stale lock
  return live.rev !== rev ? { ...live, loading: true } : live;
}

const Row = ({ l, r, me = false }: any) => (
  <li className={`py-2.5 flex items-center justify-between gap-3 text-[13px] ${me ? "-mx-2 px-2 rounded-lg bg-wash" : ""}`}>
    <span className="text-ink-2 leading-snug">{l} <span className="text-[10.5px] text-ink-3">· <Num>{r.n}</Num> تقرير</span></span>
    <span className="shrink-0"><Num className="font-semibold">{fmt(r.p50)}</Num> <span className="text-[11px] text-ink-3">ج.م</span></span>
  </li>
);

export function LiveSalaryPanel({ app, live, disc, exp, g, track }: any) {
  if (!isCloud()) return null;
  const d = live.data; const share = () => app.openSheet("contribute", { disc, exp, gov: g });
  const where = `${label(EXP, exp)} · ${live.wide ? "كل مصر" : govName(g)}`;
  const head = <div className="flex items-center justify-between gap-2"><span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-good"><Radio size={14} /> من تقارير الأعضاء — حيّ</span>{d && d.n > 0 && <Chip tone="good" className="h-6 px-2 text-[10.5px] shrink-0"><Num>{d.n}</Num> تقرير</Chip>}</div>;
  if (live.error) return <Panel className="p-4">{head}<p className="mt-2 text-[12.5px] text-ink-2">{live.error}</p></Panel>;
  // right after a share the old «teaser» answer is still on screen while the new one loads: show a skeleton, not the lock
  if (live.loading && (!d || (app.contributed && d.access === "teaser"))) return <Panel className="p-4">{head}<div className="mt-3 h-12 rounded-xl bg-canvas/60 animate-pulse" /></Panel>;
  if (!d || d.access === "none") return null;
  // not enough reports yet, even across Egypt: say how far the cell is, and invite a share
  if (d.n < d.min) return (
    <Panel className="p-4">{head}
      <p className="mt-2 text-[12.5px] leading-relaxed text-ink-2">تقارير هذه الخلية (<span className="text-ink">{where}</span>): <Num className="text-ink">{d.n}</Num> من <Num>{d.min}</Num> — نعرض الأرقام الحية من <Num>{d.min}</Num> تقارير حتى لا يُستدل على أحد. حتى ذلك الحين، النموذج المرجعي أدناه.</p>
      <div className="mt-2 h-1.5 rounded-full bg-track overflow-hidden"><span className="block h-full bg-good" style={{ width: `${Math.min(100, (d.n / d.min) * 100)}%` }} /></div>
      {app.moneyAccess === "full" && <Primary onClick={share} className="mt-3 w-full h-11 press">شارك راتبك — كل تقرير يقرّب الأرقام الحية</Primary>}
    </Panel>
  );
  const spread = d.p90 > d.p10;
  return (
    <Panel className="p-4">{head}
      <p className="mt-1 text-[11px] text-ink-2">{where}{live.wide && " — محافظتك أقل من 5 تقارير بعد"}</p>
      <div className="mt-1"><Money n={d.p50} size="text-[34px]" /></div>
      {d.access === "teaser" ? (
        <div className="mt-3 p-3.5 rounded-xl bg-wash border border-accent/20 text-center">
          <LockKeyhole size={18} className="mx-auto text-accent" />
          <p className="mt-1.5 text-[13px] font-medium">النطاق والتفصيل والتقارير الفردية تُفتح بعد مشاركة راتبك</p>
          <p className="mt-1 text-[11.5px] text-ink-2 leading-relaxed">مرة واحدة تكفي لسنة كاملة — مجهولًا، ولا يظهر رقمك إلا ضمن خلية من 5 تقارير أو أكثر.</p>
          <Primary onClick={share} className="mt-3 w-full h-11 press">شارك راتبك وافتح السوق</Primary>
        </div>
      ) : <>
        {spread && <><p className="mt-3 text-[11px] text-ink-2">من P10 إلى P90 — النطاق الغامق هو الربعان الأوسطان</p><div className="mt-1"><Percentiles m={d} /></div></>}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">{[["الربع الأدنى", d.p25], ["الوسيط", d.p50], ["الربع الأعلى", d.p75]].map(([l, v]: any) => <div key={l} className="p-2 rounded-xl bg-canvas/60 border border-line"><p className="text-ink-3">{l}</p><p className="mt-0.5 text-[13px] text-ink"><Num>{fmt(v)}</Num></p></div>)}</div>
        {d.byTrack && d.byTrack.length > 0 && <><h3 className="mt-4 text-[12.5px] font-medium inline-flex items-center gap-1.5"><BadgeCheck size={14} className="text-accent" /> حسب المسار</h3><ul className="mt-1 divide-y divide-line">{d.byTrack.map((r) => <Row key={r.key} l={trackLabel(r.key, disc)} r={r} me={r.key === track} />)}</ul></>}
        {d.byGov && d.byGov.length > 1 && <><h3 className="mt-4 text-[12.5px] font-medium inline-flex items-center gap-1.5"><MapPin size={14} className="text-accent" /> حسب المحافظة</h3><ul className="mt-1 divide-y divide-line">{d.byGov.map((r) => <Row key={r.key} l={govName(r.key)} r={r} me={r.key === g} />)}</ul></>}
        {d.byCompany && d.byCompany.length > 0 && <><h3 className="mt-4 text-[12.5px] font-medium inline-flex items-center gap-1.5"><Building2 size={14} className="text-accent" /> حسب الشركة</h3><ul className="mt-1 divide-y divide-line">{d.byCompany.map((r) => <Row key={r.key} l={r.key} r={r} />)}</ul></>}
      </>}
      <p className="mt-3 pt-3 border-t border-line text-[10.5px] text-ink-3 inline-flex items-center gap-1.5"><Users size={12} /> <Num>{fmt(d.platform)}</Num> تقرير راتب على المنصة · كل خلية وكل سطر من <Num>{d.min}</Num> تقارير على الأقل</p>
    </Panel>
  );
}
