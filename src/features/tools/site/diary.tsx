// =====================================================================
//  يومية الموقع — daily site diary (screen + «التقرير اليومي» PDF). Engine: src/domain/tools/site-calc.ts
//  · The day's contemporary record (claim evidence): weather, manpower, equipment, work executed, pours, materials,
//    inspections, instructions (impact yes / no only — never an amount), visitors, HSE, delays, tomorrow's plan.
//  · «زي امبارح» copies yesterday's crew and equipment (hours reset) and turns its plan into today's activities.
//  · Empty sections do not print. The consultant's signature reads «استلام — لا يعني الموافقة على المحتوى».
// =====================================================================
import { useState } from "react";
import { numInputParse } from "../../../lib/num-input";
import { DIARY_ENGINE, diaryCarryOver, diaryDaysSince, diaryTotals } from "../../../domain/tools/site-calc";
import type { DocBlock, DocCol } from "../../../doc/model";
import { fmtNum, iso } from "../../../doc/text";
import type { ToolDoc } from "../../../data/tool-docs";
import { AreaField, Card, Check, Grid2, Note, NumField, Pick, ResultHero, RowCards, Rows, TextField } from "../../../ui/kit";
import type { ToolModule } from "../module";
import { buildSpec } from "../spec";

type Man = { company: string; trade: string; n: string; hours: string };
type Equip = { type: string; tag: string; owner: "own" | "hired"; work: string; idle: string; down: string };
type Work = { loc: string; activity: string; qty: string; unit: string };
type Pour = { element: string; m3: string; grade: string };
type Mat = { item: string; supplier: string; dn: string; qty: string; unit: string; status: "accepted" | "rejected" | "pending" };
type Insp = { ir: string; title: string; result: "A" | "B" | "C" | "pending" };
type Instr = { no: string; from: string; summary: string; time: boolean; commercial: boolean };
type Visit = { name: string; org: string; purpose: string };
type Delay = { cause: string; from: string; to: string; activity: string };
type Body = {
  shiftFrom: string; shiftTo: string; preparedBy: string;
  weather: string[]; maxC: string; minC: string; stopFrom: string; stopTo: string;
  manpower: Man[]; equipment: Equip[]; work: Work[]; pours: Pour[]; materials: Mat[]; inspections: Insp[]; instructions: Instr[]; visitors: Visit[];
  hse: { talk: string; lti: string; firstAid: string; nearMiss: string; property: string; lastLti: string; notes: string };
  delays: Delay[]; nextDay: string;
};

const N = (s: string) => numInputParse(s || "") ?? 0;
const WEATHER = ["صافٍ", "غائم", "رياح", "عاصفة ترابية", "مطر", "حر شديد"];
const CAUSES: [string, string][] = [["weather", "طقس"], ["owner", "معلومات المالك"], ["utilities", "مرافق"], ["materials", "خامات"], ["design", "تصميم"], ["access", "تسليم موقع"], ["third", "طرف ثالث"], ["contractor", "المقاول"]];

const blank = (): Body => ({
  shiftFrom: "07:00", shiftTo: "15:00", preparedBy: "", weather: ["صافٍ"], maxC: "", minC: "", stopFrom: "", stopTo: "",
  manpower: [], equipment: [], work: [], pours: [], materials: [], inspections: [], instructions: [], visitors: [],
  hse: { talk: "", lti: "0", firstAid: "0", nearMiss: "0", property: "0", lastLti: "", notes: "" }, delays: [], nextDay: "",
});

function totals(b: Body) {
  return diaryTotals({
    manpower: b.manpower.map((m) => ({ company: m.company || "—", trade: m.trade || "—", n: N(m.n), hours: N(m.hours) })),
    equipment: b.equipment.map((e) => ({ type: e.type, tag: e.tag, owner: e.owner, work: N(e.work), idle: N(e.idle), down: N(e.down) })),
    delays: b.delays.filter((d) => d.from && d.to),
    stoppage: b.stopFrom && b.stopTo ? { from: b.stopFrom, to: b.stopTo } : null,
    pours: b.pours.map((p) => ({ m3: N(p.m3) })),
  });
}

const time = (v: string, on: (v: string) => void, label: string) => (
  <label className="block"><span className="block text-[12px] text-ink-2 mb-1">{label}</span>
    <input type="time" dir="ltr" value={v} onChange={(e) => on(e.target.value)} className="w-full h-12 px-3 rounded-xl bg-canvas border border-line-2 font-grotesk text-[15px]" /></label>
);

function Section<R>({ title, rows, set, blank, summary, render, ro }: { title: string; rows: R[]; set: (r: R[]) => void; blank: () => R; summary: (r: R) => string; render: (r: R, s: (r: R) => void) => any; ro: boolean }) {
  return (
    <Card title={`${title}${rows.length ? ` (${rows.length})` : ""}`}>
      <RowCards<R> rows={rows} onChange={(r) => !ro && set(r)} blank={blank} summary={(r) => summary(r)} render={render} addLabel="أضف" max={80} />
    </Card>
  );
}

function Editor({ body: b, set, ctx }: { body: Body; set: (b: Body) => void; ctx: any }) {
  const ro = ctx.readOnly;
  const put = (p: Partial<Body>) => !ro && set({ ...b, ...p });
  const t = totals(b);
  const [busy, setBusy] = useState(false);
  const lti = diaryDaysSince(b.hse.lastLti, new Date().toISOString());
  const sameAsYesterday = async () => {
    setBusy(true);
    try {
      const s = await ctx.app.toolStore();
      const prev = s.headers(["siteDiary"]).find((h: any) => h.dateIso < new Date().toISOString().slice(0, 10) || h.at < Date.now() - 3600000);
      const doc = prev ? s.get(prev.id) : null;
      if (!doc) {
        ctx.app.toast("لا توجد يومية سابقة");
        return;
      }
      const carried = diaryCarryOver(doc.body as any, b as any) as any;
      put({ manpower: carried.manpower, equipment: carried.equipment, work: carried.work.map((w: any) => ({ loc: "", qty: "", unit: "", ...w })) });
      ctx.app.toast("نُسخت العمالة والمعدات من آخر يومية");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-3">
      <button type="button" disabled={ro || busy} onClick={sameAsYesterday} className="press w-full min-h-12 rounded-xl bg-surface border border-accent/40 text-accent text-[14px] font-medium disabled:opacity-40">زي امبارح — انسخ العمالة والمعدات</button>
      <ResultHero label="عمالة اليوم" value={String(t.heads)} unit="فرد" sub={`${fmtNum(t.manHours, 0)} ساعة عمل${t.poursM3 ? ` · صب ${fmtNum(t.poursM3, 1)} م³` : ""}${t.delayMin ? ` · تأخير ${t.delayMin} د` : ""}`} />

      <Card title="الوردية والطقس">
        <div className="space-y-2.5">
          <Grid2>
            {time(b.shiftFrom, (v) => put({ shiftFrom: v }), "من")}
            {time(b.shiftTo, (v) => put({ shiftTo: v }), "إلى")}
          </Grid2>
          <TextField label="أعدّها" value={b.preparedBy} onChange={(v) => put({ preparedBy: v })} />
          <div className="flex flex-wrap gap-2">
            {WEATHER.map((w) => (
              <button key={w} type="button" aria-pressed={b.weather.includes(w)} onClick={() => put({ weather: b.weather.includes(w) ? b.weather.filter((x) => x !== w) : [...b.weather, w] })}
                className={`h-9 px-3.5 rounded-full border text-[12.5px] ${b.weather.includes(w) ? "bg-wash border-accent/40" : "bg-surface border-line-2 text-ink-2"}`}>{w}</button>
            ))}
          </div>
          <Grid2>
            <NumField label="العظمى" unit="°C" value={b.maxC} onChange={(v) => put({ maxC: v })} />
            <NumField label="الصغرى" unit="°C" value={b.minC} onChange={(v) => put({ minC: v })} rule={{ allowNegative: true }} />
            {time(b.stopFrom, (v) => put({ stopFrom: v }), "توقف العمل من")}
            {time(b.stopTo, (v) => put({ stopTo: v }), "إلى")}
          </Grid2>
        </div>
      </Card>

      <Section<Man> title="العمالة" ro={ro} rows={b.manpower} set={(manpower) => put({ manpower })} blank={() => ({ company: b.manpower[b.manpower.length - 1]?.company || "", trade: "", n: "", hours: "8" })}
        summary={(m) => `${m.trade || "مهنة"} · ${m.company || "—"} · ${m.n || 0} × ${m.hours || 0} س`}
        render={(m, s) => <Grid2>
          <TextField label="المهنة" value={m.trade} onChange={(v) => s({ ...m, trade: v })} placeholder="نجارين" />
          <TextField label="الشركة" value={m.company} onChange={(v) => s({ ...m, company: v })} />
          <NumField label="العدد" value={m.n} onChange={(v) => s({ ...m, n: v })} rule={{ integer: true, min: 0 }} />
          <NumField label="الساعات" value={m.hours} onChange={(v) => s({ ...m, hours: v })} />
        </Grid2>} />

      <Section<Equip> title="المعدات" ro={ro} rows={b.equipment} set={(equipment) => put({ equipment })} blank={() => ({ type: "", tag: "", owner: "hired", work: "", idle: "", down: "" })}
        summary={(e) => `${e.type || "معدة"} ${e.tag} · ${e.work || 0}/${e.idle || 0}/${e.down || 0} س`}
        render={(e, s) => <>
          <Grid2>
            <TextField label="النوع" value={e.type} onChange={(v) => s({ ...e, type: v })} />
            <TextField label="الرقم / اللوحة" dir="ltr" value={e.tag} onChange={(v) => s({ ...e, tag: v })} />
            <NumField label="ساعات تشغيل" value={e.work} onChange={(v) => s({ ...e, work: v })} />
            <NumField label="ساعات توقف" value={e.idle} onChange={(v) => s({ ...e, idle: v })} />
            <NumField label="ساعات عطل" value={e.down} onChange={(v) => s({ ...e, down: v })} />
          </Grid2>
          <Pick items={[["own", "ملك"], ["hired", "إيجار"]]} value={e.owner} onChange={(owner) => s({ ...e, owner })} />
        </>} />

      <Section<Work> title="الأعمال المنفذة" ro={ro} rows={b.work} set={(work) => put({ work })} blank={() => ({ loc: "", activity: "", qty: "", unit: "" })}
        summary={(w) => `${w.activity || "بند"}${w.loc ? ` · ${w.loc}` : ""}${w.qty ? ` · ${w.qty} ${w.unit}` : ""}`}
        render={(w, s) => <Grid2>
          <TextField label="النشاط" value={w.activity} onChange={(v) => s({ ...w, activity: v })} />
          <TextField label="المكان" value={w.loc} onChange={(v) => s({ ...w, loc: v })} placeholder="المبنى / الدور / المحور" />
          <NumField label="الكمية" value={w.qty} onChange={(v) => s({ ...w, qty: v })} />
          <TextField label="الوحدة" value={w.unit} onChange={(v) => s({ ...w, unit: v })} />
        </Grid2>} />

      <Section<Pour> title="الصب" ro={ro} rows={b.pours} set={(pours) => put({ pours })} blank={() => ({ element: "", m3: "", grade: "C30" })}
        summary={(p) => `${p.element || "عنصر"} · ${p.m3 || 0} م³ ${p.grade}`}
        render={(p, s) => <Grid2>
          <TextField label="العنصر" value={p.element} onChange={(v) => s({ ...p, element: v })} />
          <NumField label="الكمية" unit="م³" value={p.m3} onChange={(v) => s({ ...p, m3: v })} />
          <TextField label="الرتبة" dir="ltr" value={p.grade} onChange={(v) => s({ ...p, grade: v })} />
        </Grid2>} />

      <Section<Mat> title="التوريدات" ro={ro} rows={b.materials} set={(materials) => put({ materials })} blank={() => ({ item: "", supplier: "", dn: "", qty: "", unit: "", status: "accepted" })}
        summary={(m) => `${m.item || "خامة"} · ${m.qty || 0} ${m.unit} · ${m.status === "accepted" ? "مقبول" : m.status === "rejected" ? "مرفوض" : "معلّق"}`}
        render={(m, s) => <>
          <Grid2>
            <TextField label="الخامة" value={m.item} onChange={(v) => s({ ...m, item: v })} />
            <TextField label="المورد" value={m.supplier} onChange={(v) => s({ ...m, supplier: v })} />
            <TextField label="رقم إذن التوريد" dir="ltr" value={m.dn} onChange={(v) => s({ ...m, dn: v })} />
            <NumField label="الكمية" value={m.qty} onChange={(v) => s({ ...m, qty: v })} />
            <TextField label="الوحدة" value={m.unit} onChange={(v) => s({ ...m, unit: v })} />
          </Grid2>
          <Pick items={[["accepted", "مقبول"], ["rejected", "مرفوض"], ["pending", "معلّق"]]} value={m.status} onChange={(status) => s({ ...m, status })} />
        </>} />

      <Section<Insp> title="الاستلامات" ro={ro} rows={b.inspections} set={(inspections) => put({ inspections })} blank={() => ({ ir: "", title: "", result: "pending" })}
        summary={(x) => `${x.ir || "IR"} · ${x.title} · ${x.result}`}
        render={(x, s) => <>
          <Grid2>
            <TextField label="رقم الطلب" dir="ltr" value={x.ir} onChange={(v) => s({ ...x, ir: v })} />
            <TextField label="البند" value={x.title} onChange={(v) => s({ ...x, title: v })} />
          </Grid2>
          <Pick items={[["A", "A مقبول"], ["B", "B بملاحظات"], ["C", "C مرفوض"], ["pending", "لم يُفحص"]]} value={x.result} onChange={(result) => s({ ...x, result })} />
        </>} />

      <Section<Instr> title="التعليمات والاستفسارات" ro={ro} rows={b.instructions} set={(instructions) => put({ instructions })} blank={() => ({ no: "", from: "", summary: "", time: false, commercial: false })}
        summary={(x) => `${x.no || "تعليمات"} · ${x.from}`}
        render={(x, s) => <>
          <Grid2>
            <TextField label="الرقم" dir="ltr" value={x.no} onChange={(v) => s({ ...x, no: v })} />
            <TextField label="من" value={x.from} onChange={(v) => s({ ...x, from: v })} />
          </Grid2>
          <AreaField label="الملخص" value={x.summary} onChange={(v) => s({ ...x, summary: v })} rows={2} />
          <Check label="تؤثر على المدة" on={x.time} onChange={(v) => s({ ...x, time: v })} />
          <Check label="أثر تعاقدي" on={x.commercial} onChange={(v) => s({ ...x, commercial: v })} />
        </>} />

      <Section<Visit> title="الزوار" ro={ro} rows={b.visitors} set={(visitors) => put({ visitors })} blank={() => ({ name: "", org: "", purpose: "" })}
        summary={(x) => `${x.name} · ${x.org}`}
        render={(x, s) => <Grid2>
          <TextField label="الاسم" value={x.name} onChange={(v) => s({ ...x, name: v })} />
          <TextField label="الجهة" value={x.org} onChange={(v) => s({ ...x, org: v })} />
          <TextField label="الغرض" value={x.purpose} onChange={(v) => s({ ...x, purpose: v })} />
        </Grid2>} />

      <Card title="السلامة">
        <div className="space-y-2.5">
          <TextField label="موضوع التوعية الصباحية" value={b.hse.talk} onChange={(v) => put({ hse: { ...b.hse, talk: v } })} />
          <Grid2>
            {([["lti", "إصابة مُعطِّلة"], ["firstAid", "إسعافات أولية"], ["nearMiss", "حادث وشيك"], ["property", "تلفيات"]] as const).map(([k, l]) => (
              <NumField key={k} label={l} value={b.hse[k]} onChange={(v) => put({ hse: { ...b.hse, [k]: v } })} rule={{ integer: true, min: 0 }} />
            ))}
          </Grid2>
          <label className="block"><span className="block text-[12px] text-ink-2 mb-1">تاريخ آخر إصابة مُعطِّلة</span>
            <input type="date" dir="ltr" value={b.hse.lastLti} onChange={(e) => put({ hse: { ...b.hse, lastLti: e.target.value } })} className="w-full h-12 px-3 rounded-xl bg-canvas border border-line-2 font-grotesk text-[15px]" /></label>
          {lti != null && <Note>أيام بدون إصابة مُعطِّلة: {lti}</Note>}
        </div>
      </Card>

      <Section<Delay> title="التأخيرات" ro={ro} rows={b.delays} set={(delays) => put({ delays })} blank={() => ({ cause: "weather", from: "", to: "", activity: "" })}
        summary={(x) => `${(CAUSES.find((c) => c[0] === x.cause) || CAUSES[0])[1]} · ${x.from}–${x.to}`}
        render={(x, s) => <>
          <Pick items={CAUSES} value={x.cause} onChange={(cause) => s({ ...x, cause })} />
          <Grid2>
            {time(x.from, (v) => s({ ...x, from: v }), "من")}
            {time(x.to, (v) => s({ ...x, to: v }), "إلى")}
          </Grid2>
          <TextField label="النشاط المتأثر" value={x.activity} onChange={(v) => s({ ...x, activity: v })} />
        </>} />

      <Card title="خطة الغد"><AreaField label="سطر لكل نشاط" value={b.nextDay} onChange={(v) => put({ nextDay: v })} rows={3} /></Card>
      {t.equipUtil != null && <Rows rows={[["استخدام المعدات", fmtNum(t.equipUtil * 100, 1), "%"]]} />}
      <Note>سجل يومي معاصر يعدّه المقاول؛ توقيع الاستشاري يعني الاستلام فقط.</Note>
    </div>
  );
}

const tbl = (id: string, cols: [string, string, number, ("start" | "end" | "center")?, number?][], rows: Record<string, any>[]): DocBlock => ({
  k: "table", id, caption: "",
  cols: cols.map(([key, label, wMm, align, dp]): DocCol => ({ key, label, wMm, align: align || "start", ...(dp != null ? { num: { dp } } : {}) })),
  rows: rows.map((cells) => ({ cells })),
});

function build(doc: ToolDoc<Body>, project: any) {
  const b = doc.body;
  const t = totals(b);
  const blocks: DocBlock[] = [
    { k: "kv", cols: 3, rows: [
      { label: "التاريخ", value: iso(doc.dateIso) }, { label: "الوردية", value: iso(`${b.shiftFrom}–${b.shiftTo}`) }, { label: "أعدّها", value: b.preparedBy || "—" },
      { label: "الطقس", value: b.weather.join(" · ") || "—" }, { label: "الحرارة", value: iso(`${b.maxC || "—"} / ${b.minC || "—"} °C`) },
      { label: "توقف للطقس", value: t.weatherLostH ? iso(`${fmtNum(t.weatherLostH, 1)} h`) : "لا" },
    ] },
    { k: "kpis", items: [
      { label: "العمالة", value: String(t.heads) }, { label: "ساعات العمل", value: fmtNum(t.manHours, 0) },
      { label: "الصب", value: fmtNum(t.poursM3, 1), unit: "m³" }, { label: "التأخير", value: String(t.delayMin), unit: "min" },
    ] },
  ];
  const sec = (num: string, title: string, block: DocBlock | null) => {
    if (!block) return;
    blocks.push({ k: "heading", num, text: title }, block);
  };
  let n = 0;
  const next = () => String(++n);
  if (b.manpower.length) sec(next(), "العمالة", { ...tbl("man", [["trade", "المهنة", 54], ["company", "الشركة", 54], ["n", "العدد", 22, "end", 0], ["h", "الساعات", 22, "end", 1], ["mh", "ساعات العمل", 22, "end", 1]],
    b.manpower.map((m) => ({ trade: m.trade, company: m.company, n: N(m.n), h: N(m.hours), mh: N(m.n) * N(m.hours) }))), totals: { cells: { trade: "الإجمالي", n: t.heads, mh: t.manHours } } } as DocBlock);
  if (b.equipment.length) sec(next(), "المعدات", tbl("eq", [["type", "المعدة", 50], ["tag", "الرقم", 26], ["own", "الملكية", 20], ["w", "تشغيل", 18, "end", 1], ["i", "توقف", 18, "end", 1], ["d", "عطل", 18, "end", 1], ["u", "الاستخدام %", 24, "end", 0]],
    b.equipment.map((e, i) => ({ type: e.type, tag: iso(e.tag), own: e.owner === "own" ? "ملك" : "إيجار", w: N(e.work), i: N(e.idle), d: N(e.down), u: t.equipment[i].util == null ? null : (t.equipment[i].util as number) * 100 }))));
  if (b.work.length) sec(next(), "الأعمال المنفذة", tbl("work", [["act", "النشاط", 64], ["loc", "المكان", 54], ["qty", "الكمية", 28, "end"], ["unit", "الوحدة", 28, "center"]], b.work.map((w) => ({ act: w.activity, loc: w.loc, qty: iso(w.qty), unit: w.unit }))));
  if (b.pours.length) sec(next(), "الصب", tbl("pours", [["el", "العنصر", 90], ["m3", "الكمية م³", 40, "end", 1], ["g", "الرتبة", 44, "center"]], b.pours.map((p) => ({ el: p.element, m3: N(p.m3), g: iso(p.grade) }))));
  if (b.materials.length) sec(next(), "التوريدات", tbl("mat", [["item", "الخامة", 44], ["sup", "المورد", 38], ["dn", "إذن التوريد", 26], ["qty", "الكمية", 22, "end"], ["unit", "الوحدة", 20, "center"], ["st", "الحالة", 24, "center"]],
    b.materials.map((m) => ({ item: m.item, sup: m.supplier, dn: iso(m.dn), qty: iso(m.qty), unit: m.unit, st: m.status === "accepted" ? "مقبول" : m.status === "rejected" ? "مرفوض" : "معلّق" }))));
  if (b.inspections.length) sec(next(), "الاستلامات", tbl("ir", [["ir", "رقم الطلب", 36], ["t", "البند", 108], ["r", "النتيجة", 30, "center"]], b.inspections.map((x) => ({ ir: iso(x.ir), t: x.title, r: x.result === "pending" ? "—" : x.result }))));
  if (b.instructions.length) sec(next(), "التعليمات والاستفسارات", tbl("ins", [["no", "الرقم", 26], ["from", "من", 30], ["s", "الملخص", 78], ["time", "أثر زمني", 20, "center"], ["com", "أثر تعاقدي", 20, "center"]],
    b.instructions.map((x) => ({ no: iso(x.no), from: x.from, s: x.summary, time: x.time ? "نعم" : "لا", com: x.commercial ? "نعم" : "لا" }))));
  if (b.visitors.length) sec(next(), "الزوار", tbl("vis", [["n", "الاسم", 60], ["o", "الجهة", 56], ["p", "الغرض", 58]], b.visitors.map((x) => ({ n: x.name, o: x.org, p: x.purpose }))));
  const lti = diaryDaysSince(b.hse.lastLti, doc.dateIso);
  sec(next(), "السلامة", { k: "kv", cols: 3, rows: [
    { label: "التوعية", value: b.hse.talk || "—" }, { label: "إصابة مُعطِّلة", value: b.hse.lti }, { label: "إسعافات", value: b.hse.firstAid },
    { label: "حادث وشيك", value: b.hse.nearMiss }, { label: "تلفيات", value: b.hse.property }, { label: "أيام بدون إصابة", value: lti == null ? "—" : String(lti) },
  ] });
  if (b.delays.length) sec(next(), "التأخيرات", tbl("del", [["c", "السبب", 40], ["f", "من", 24, "center"], ["t", "إلى", 24, "center"], ["a", "النشاط المتأثر", 86]],
    b.delays.map((x) => ({ c: (CAUSES.find((c) => c[0] === x.cause) || CAUSES[0])[1], f: iso(x.from), t: iso(x.to), a: x.activity }))));
  if (b.nextDay.trim()) blocks.push({ k: "notes", title: "خطة الغد", text: b.nextDay });
  return buildSpec({
    doc, meta: module, project, sections: [{ orientation: "portrait", blocks }],
    signRoles: ["siteEngineer", "approved", "consultantRep"],
  });
}

export const module: ToolModule<Body> = {
  kind: "siteDiary", v: 1, docType: "DR", docTypeName: "التقرير اليومي · Daily report", discipline: "موقع", engine: DIARY_ENGINE,
  profile: { id: "site-diary@1", edition: "FIDIC 20.1 records practice", values: {}, overridden: [], unverified: [] },
  blank,
  defaultTitle: () => "التقرير اليومي",
  Editor,
  build,
  summary: (doc) => {
    const t = totals(doc.body);
    return [
      `التقرير اليومي${doc.docNo ? ` · ⁦${doc.docNo}⁩` : ""} · ⁦${doc.dateIso}⁩`,
      `عمالة ⁦${t.heads}⁩ · ⁦${fmtNum(t.manHours, 0)}⁩ ساعة`,
      t.poursM3 ? `صب ⁦${fmtNum(t.poursM3, 1)} m³⁩` : "",
      t.delayMin ? `تأخير ⁦${t.delayMin}⁩ د` : "",
      "راجع المستند الكامل",
    ].filter(Boolean).join("\n");
  },
};
