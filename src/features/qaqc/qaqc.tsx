// =====================================================================
//  QA/QC inspection checklists (Feature 7) — «فحص واستلام الأعمال»
//  Pick a template, fill the header (project, zone, drawing reference), mark each item مطابق / غير مطابق / لا ينطبق with a
//  note where needed, set the verdict, export a signed-off PDF. Inspections are saved on this device at once (sites often
//  have no signal) and, on the live platform, synced to the member's own private storage so the laptop sees them too.
// =====================================================================
import { useState } from "react";
import { ClipboardCheck, FileDown, Plus, Trash2 } from "lucide-react";
import { RESULT, TEMPLATES, VERDICT, newInspection, tally } from "../../data/checklists";
import { tr } from "../../i18n/i18n";
import { inspectionPdf, saveOrShare } from "../../lib/report-pdf";
import { Empty, SectionTitle, TextInput } from "../../ui/chrome";
import { Chip, FilterChip, Num, Panel, Primary, Secondary } from "../../ui/primitives";

const tplOf = (id?: any) => TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];

export function ChecklistsScreen({ app, id }: any) {
  if (id) return <Inspection app={app} id={id} />;
  const list = [...(app.inspections || [])].sort((a, b) => b.at - a.at);
  return (
    <div className="py-4 space-y-4">
      <div className="px-1"><h1 className="text-[22px] font-medium">فحص واستلام الأعمال</h1><p className="text-[12px] text-ink-2">قوائم QA/QC للموقع والمكتب الفني — تُحفظ على جهازك فورًا، وتُصدَّر تقرير PDF للتوقيع.</p></div>
      <section><SectionTitle>قائمة جديدة</SectionTitle>
        <div className="grid grid-cols-2 gap-2.5">{TEMPLATES.map((t) => <button key={t.id} type="button" onClick={() => app.push({ type: "inspection", id: "new:" + t.id })} className="press p-3.5 rounded-2xl bg-surface border border-line text-start hover:border-accent/40 transition-colors">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-wash text-accent"><Plus size={17} /></span>
          <span className="block mt-2 text-[13.5px] font-medium leading-snug">{t.title}</span><span className="block mt-0.5 text-[11px] text-ink-2 leading-snug">{t.scope}</span></button>)}</div>
      </section>
      <section><SectionTitle>قوائمي</SectionTitle>
        {list.length === 0 ? <Empty icon={ClipboardCheck} title="لا قوائم محفوظة بعد" body="ابدأ قائمة من الأعلى — تُحفظ تلقائيًا أثناء الملء." /> :
          <div className="space-y-2">{list.map((x) => { const t = tplOf(x.template); const c = tally(t, x.marks); return (
            <button key={x.id} type="button" onClick={() => app.push({ type: "inspection", id: x.id })} className="press w-full p-3.5 rounded-2xl bg-surface border border-line text-start">
              <div className="flex items-center justify-between gap-2"><span className="text-[13.5px] font-medium">{t.title}</span>{x.verdict ? <Chip tone={x.verdict === "accepted" ? "good" : x.verdict === "rejected" ? "bad" : "warn"} className="h-6 px-2 text-[10.5px]">{VERDICT[x.verdict]}</Chip> : <span className="text-[11px] text-ink-3">مسودة</span>}</div>
              <p className="mt-1 text-[11.5px] text-ink-2">{[x.project, x.zone, x.date].filter(Boolean).join(" · ") || "—"} · <Num>{c.pass + c.fail + c.na}</Num>/<Num>{c.total}</Num></p>
            </button>); })}</div>}
      </section>
    </div>
  );
}

function Inspection({ app, id }: any) {
  const isNew = String(id).startsWith("new:");
  const [x, setX] = useState<any>(() => (isNew ? newInspection(tplOf(String(id).slice(4)), app.profile && app.profile.name) : (app.inspections || []).find((i) => i.id === id)));
  const [busy, setBusy] = useState(false);
  if (!x) return <Empty icon={ClipboardCheck} title="القائمة غير موجودة" body="ربما حُذفت من جهاز آخر." action="رجوع" onAction={app.pop} />;
  const t = tplOf(x.template); const c = tally(t, x.marks);
  // every change is saved at once (a dropped signal or a closed app never loses a half-filled inspection)
  const up = (patch?: any) => { const n = { ...x, ...patch, at: Date.now() }; setX(n); app.saveInspection(n); };
  const mark = (k?: any, m?: any) => up({ marks: { ...x.marks, [k]: x.marks[k] === m ? "" : m } });
  const exportPdf = async () => {
    setBusy(true);
    try {
      const rows: any[] = []; t.sections.forEach(([title, items], s) => { rows.push({ section: tr(title) }); items.forEach((text, i) => rows.push({ text: tr(text), mark: x.marks[`${s}.${i}`] || "", note: x.notes[`${s}.${i}`] || "" })); });
      // the template's own words follow the interface language; what the member typed (project, zone, notes) is never translated
      const head: [string, string][] = [["المشروع", x.project], ["المنطقة / الدور", x.zone], ["مرجع اللوحة", x.ref], ["التاريخ", x.date], ["المهندس المستلم", x.inspector]];
      const bytes = await inspectionPdf({ title: tr(t.title), scope: tr(t.scope), head: head.map(([k, v]) => [tr(k), v]), rows,
        verdict: VERDICT[x.verdict] ? tr(VERDICT[x.verdict]) : "", counts: tr(`مطابق ${c.pass} · غير مطابق ${c.fail} · لا ينطبق ${c.na} · من ${c.total} بندًا`), footer: tr("أُعد على EngSpace — قائمة استرشادية؛ المرجع هو اللوحات والمواصفات المعتمدة للمشروع") });
      await saveOrShare(bytes, `QC-${t.id}-${x.date}.pdf`, t.title);
    } catch (e) { app.toast("تعذّر إنشاء التقرير — أعد المحاولة"); }
    setBusy(false);
  };
  const field = (k?: any, label?: any, ph?: any) => <label className="block"><span className="text-[11.5px] text-ink-2">{label}</span><TextInput value={x[k]} onChange={(v) => up({ [k]: v })} placeholder={ph} className="mt-1 h-11 w-full px-3 rounded-xl bg-surface border border-line-2 text-[13.5px]" /></label>;
  return (
    <div className="py-4 space-y-4">
      <div className="px-1"><h1 className="text-[21px] font-medium">{t.title}</h1><p className="text-[12px] text-ink-2">{t.scope}</p></div>
      <Panel className="p-4 grid grid-cols-2 gap-3">{field("project", "المشروع", "اسم المشروع")}{field("zone", "المنطقة / الدور", "مثال: الدور الثالث — محور B")}{field("ref", "مرجع اللوحة", "S-103 Rev.2")}{field("date", "التاريخ", "")}<div className="col-span-2">{field("inspector", "المهندس المستلم", "")}</div></Panel>
      {t.sections.map(([title, items], s) => <section key={title}><SectionTitle>{title}</SectionTitle><div className="space-y-2">{items.map((text, i) => { const k = `${s}.${i}`; const m = x.marks[k] || ""; return (
        <Panel key={k} className={`p-3.5 ${m === "fail" ? "border-bad/40" : ""}`}>
          <p className="text-[13px] leading-relaxed">{text}</p>
          <div className="mt-2 flex gap-1.5 flex-wrap">{(["pass", "fail", "na"] as const).map((r) => <FilterChip key={r} on={m === r} onClick={() => mark(k, r)}>{RESULT[r]}</FilterChip>)}</div>
          {(m === "fail" || x.notes[k]) && <TextInput value={x.notes[k] || ""} onChange={(v) => up({ notes: { ...x.notes, [k]: v } })} placeholder={m === "fail" ? "ما المطلوب تصحيحه؟" : "ملاحظة"} className="mt-2 h-10 w-full px-3 rounded-xl bg-canvas/60 border border-line-2 text-[12.5px]" />}
        </Panel>); })}</div></section>)}
      <Panel className="p-4">
        <p className="text-[12.5px] text-ink-2"><Num className="text-ink">{c.pass}</Num> مطابق · <Num className="text-bad">{c.fail}</Num> غير مطابق · <Num>{c.na}</Num> لا ينطبق · <Num>{c.open}</Num> لم يُفحص</p>
        <div className="mt-3 flex gap-1.5 flex-wrap">{Object.entries(VERDICT).map(([k, l]) => <FilterChip key={k} on={x.verdict === k} onClick={() => up({ verdict: x.verdict === k ? "" : k })}>{l}{c.suggested === k && x.verdict !== k ? " ← مقترح" : ""}</FilterChip>)}</div>
      </Panel>
      <div className="flex gap-2"><Primary onClick={exportPdf} disabled={busy} className="flex-1 h-12 press"><FileDown size={16} /> {busy ? "جارٍ إنشاء التقرير…" : "تصدير تقرير PDF"}</Primary>
        <Secondary onClick={() => { app.deleteInspection(x.id); app.pop(); }} aria-label="حذف القائمة" className="h-12 px-4 text-bad"><Trash2 size={16} /></Secondary></div>
    </div>
  );
}

