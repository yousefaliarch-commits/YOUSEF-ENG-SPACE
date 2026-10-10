// =====================================================================
//  التوعية الصباحية وتمام المهمات — toolbox talk & PPE muster (screen + PDF). Engine: src/domain/tools/site-calc.ts
//  · A topic card with three plain key points, today's hazards, one tap per attendee, PPE all ✓ by default; a missing
//    item needs an action (issued / sent off / other) before the record is complete.
//  · Workers' names stay in the member's own account and appear only in documents they share.
// =====================================================================
import { PPE_ITEMS, TBT_ENGINE, tbtSummary, type PpeItem, type TbtAttendee } from "../../../domain/tools/site-calc";
import type { DocBlock } from "../../../doc/model";
import { fmtNum, iso } from "../../../doc/text";
import type { ToolDoc } from "../../../data/tool-docs";
import { AreaField, Card, Check, Grid2, Note, NumField, Pick, ResultHero, RowCards, TextField } from "../../../ui/kit";
import { numInputParse } from "../../../lib/num-input";
import type { ToolModule } from "../module";
import { buildSpec } from "../spec";

const TOPICS: { id: string; name: string; points: string[] }[] = [
  { id: "heat", name: "الإجهاد الحراري", points: ["اشرب ماء كل 20 دقيقة حتى لو مش عطشان", "استرح في الظل وقت الظهيرة", "لو حسيت بدوخة أو صداع بلّغ فورًا"] },
  { id: "height", name: "العمل على ارتفاع", points: ["الحزام مربوط في نقطة تثبيت قوية دائمًا", "السقالة لازم عليها بطاقة خضراء", "ممنوع الوقوف على الدرابزين أو الحافة"] },
  { id: "excavation", name: "الحفر", points: ["ممنوع النزول بدون سند أو ميول آمنة", "الردم بعيد عن الحافة 60 سم على الأقل", "السلم داخل الحفر في متناول الكل"] },
  { id: "lifting", name: "الرفع بالونش", points: ["ممنوع الوقوف تحت الحمل", "الإشارات من شخص واحد معروف", "افحص الحبال والشناكل قبل الرفع"] },
  { id: "hot", name: "الأعمال الساخنة", points: ["طفاية جنب مكان اللحام", "شيل المواد القابلة للاشتعال 11 متر", "مراقب حريق بعد الانتهاء 60 دقيقة"] },
  { id: "housekeeping", name: "النظافة والترتيب", points: ["الممرات فاضية من المخلفات", "المسامير البارزة تتشال أو تتثني", "المخلفات في أماكنها المحددة"] },
  { id: "electrical", name: "الكهرباء", points: ["ممنوع لمس الكابلات المكشوفة", "القاطع الأرضي شغال في كل لوحة مؤقتة", "الفصل والإغلاق قبل أي صيانة"] },
  { id: "manual", name: "الرفع اليدوي", points: ["اثني ركبك مش ظهرك", "اطلب مساعدة للأحمال التقيلة", "شيل الحمل قريب من جسمك"] },
  { id: "ppe", name: "مهمات الوقاية", points: ["الخوذة والجزمة والسترة طول الوقت", "النظارة مع الصاروخ والتكسير", "المهمات التالفة تتغير فورًا"] },
  { id: "scaffold", name: "السقالات", points: ["البطاقة الخضراء قبل الطلوع", "الألواح مثبتة والدرابزين كامل", "ممنوع تعديل السقالة بدون المختص"] },
  { id: "confined", name: "الأماكن المحصورة", points: ["قياس الغاز قبل الدخول", "مراقب برة طول الوقت", "تصريح عمل ساري"] },
  { id: "traffic", name: "المعدات والحركة", points: ["ابعد عن نطاق دوران المعدة", "التواصل بالنظر مع السائق", "الإشارة قبل الرجوع للخلف"] },
];

const PPE_LABEL: Record<PpeItem, string> = { helmet: "خوذة", shoes: "حذاء", vest: "سترة", gloves: "جوانتي", glasses: "نظارة", harness: "حزام" };

type Person = { name: string; trade: string; company: string; badge: string; ppe: Partial<Record<PpeItem, boolean>>; needsHarness: boolean; action: "" | "issued" | "sentOff" | "other" };
type Body = { start: string; duration: string; zone: string; presenter: string; topic: string; hazards: string; attendees: Person[] };

const blank = (): Body => ({ start: "07:00", duration: "15", zone: "", presenter: "", topic: "heat", hazards: "", attendees: [] });

const startIso = (dateIso: string, t: string) => `${dateIso}T${t || "07:00"}:00`;

function summary(doc: ToolDoc<Body>, nowIso = new Date().toISOString()) {
  const b = doc.body;
  return tbtSummary({ attendees: b.attendees as TbtAttendee[], durationMin: numInputParse(b.duration) ?? 15, presenter: b.presenter, startIso: startIso(doc.dateIso, b.start) }, nowIso);
}

function Editor({ body: b, set, ctx }: { body: Body; set: (b: Body) => void; ctx: any }) {
  const ro = ctx.readOnly;
  const put = (p: Partial<Body>) => !ro && set({ ...b, ...p });
  const s = tbtSummary({ attendees: b.attendees as TbtAttendee[], durationMin: numInputParse(b.duration) ?? 15, presenter: b.presenter, startIso: "1970-01-01T00:00:00Z" }, new Date().toISOString());
  const topic = TOPICS.find((x) => x.id === b.topic) || TOPICS[0];
  return (
    <div className="space-y-3">
      <ResultHero label="الحضور" value={String(s.n)} unit="فرد" sub={`${fmtNum(s.manHours, 2)} ساعة · المهمات ${s.ppePct == null ? "—" : fmtNum(s.ppePct, 0) + " %"}`} tone={s.missingNoAction.length || s.dupBadges.length ? "bad" : "accent"} />
      <Card title="الموضوع">
        <Pick items={TOPICS.map((x) => [x.id, x.name] as [string, string])} value={b.topic} onChange={(topic) => put({ topic })} />
        <ul className="mt-2 space-y-1 text-[13px] list-disc ps-5">{topic.points.map((p) => <li key={p}>{p}</li>)}</ul>
      </Card>
      <Card title="البيانات">
        <Grid2>
          <TextField label="المقدِّم" value={b.presenter} onChange={(v) => put({ presenter: v })} />
          <TextField label="المنطقة" value={b.zone} onChange={(v) => put({ zone: v })} />
          <label className="block"><span className="block text-[12px] text-ink-2 mb-1">البداية</span>
            <input type="time" dir="ltr" value={b.start} onChange={(e) => put({ start: e.target.value })} className="w-full h-12 px-3 rounded-xl bg-canvas border border-line-2 font-grotesk text-[15px]" /></label>
          <NumField label="المدة" unit="د" value={b.duration} onChange={(v) => put({ duration: v })} />
        </Grid2>
        <div className="mt-2.5"><AreaField label="مهام اليوم ومخاطرها" value={b.hazards} onChange={(v) => put({ hazards: v })} rows={2} /></div>
      </Card>
      <Card title="الحضور والمهمات">
        <RowCards<Person>
          rows={b.attendees} onChange={(attendees) => put({ attendees })} max={120} addLabel="عامل جديد"
          blank={() => ({ name: "", trade: b.attendees[b.attendees.length - 1]?.trade || "", company: b.attendees[b.attendees.length - 1]?.company || "", badge: "", ppe: {}, needsHarness: false, action: "" })}
          summary={(p) => {
            const miss = PPE_ITEMS.filter((k) => (k !== "harness" || p.needsHarness) && p.ppe[k] === false);
            return `${p.name || "اسم"} · ${p.trade || "—"}${miss.length ? ` · ✗ ${miss.map((k) => PPE_LABEL[k]).join("، ")}` : " · ✓"}`;
          }}
          render={(p, setP) => (
            <>
              <Grid2>
                <TextField label="الاسم" value={p.name} onChange={(v) => setP({ ...p, name: v })} />
                <TextField label="المهنة" value={p.trade} onChange={(v) => setP({ ...p, trade: v })} />
                <TextField label="الشركة" value={p.company} onChange={(v) => setP({ ...p, company: v })} />
                <TextField label="رقم البطاقة" dir="ltr" value={p.badge} onChange={(v) => setP({ ...p, badge: v })} />
              </Grid2>
              <Check label="يعمل على ارتفاع (حزام مطلوب)" on={p.needsHarness} onChange={(v) => setP({ ...p, needsHarness: v })} />
              <div className="flex flex-wrap gap-2">
                {PPE_ITEMS.filter((k) => k !== "harness" || p.needsHarness).map((k) => {
                  const ok = p.ppe[k] !== false;
                  return <button key={k} type="button" aria-pressed={ok} onClick={() => setP({ ...p, ppe: { ...p.ppe, [k]: !ok } })} className={`h-10 px-3 rounded-full border text-[12.5px] ${ok ? "bg-good/10 border-good/40" : "bg-bad/10 border-bad/50 text-bad"}`}>{ok ? "✓" : "✗"} {PPE_LABEL[k]}</button>;
                })}
              </div>
              {PPE_ITEMS.some((k) => (k !== "harness" || p.needsHarness) && p.ppe[k] === false) && (
                <Pick label="الإجراء" items={[["issued", "سُلّمت"], ["sentOff", "أُبعد عن العمل"], ["other", "أخرى"]]} value={p.action as any} onChange={(action) => setP({ ...p, action })} />
              )}
            </>
          )}
        />
      </Card>
      {s.missingNoAction.length > 0 && <Note tone="warn">محتاجين إجراء: {s.missingNoAction.join("، ")}</Note>}
      {s.dupBadges.length > 0 && <Note tone="warn">بطاقة مكررة: {s.dupBadges.join("، ")}</Note>}
      <Note>سجل توعية وحضور؛ لا يغني عن تقييم المخاطر وخطة السلامة المعتمدة. بيانات العمال محفوظة في حسابك فقط.</Note>
    </div>
  );
}

function build(doc: ToolDoc<Body>, project: any) {
  const b = doc.body;
  const s = summary(doc);
  const topic = TOPICS.find((x) => x.id === b.topic) || TOPICS[0];
  const actionWord = { issued: "سُلّمت", sentOff: "أُبعد", other: "أخرى", "": "" } as const;
  const blocks: DocBlock[] = [
    { k: "kv", cols: 3, rows: [
      { label: "الموضوع", value: topic.name }, { label: "المقدِّم", value: b.presenter || "—" }, { label: "المنطقة", value: b.zone || "—" },
      { label: "البداية", value: iso(b.start) }, { label: "المدة", value: iso(`${b.duration} min`) }, { label: "التاريخ", value: iso(doc.dateIso) },
    ] },
    { k: "kpis", items: [
      { label: "الحضور", value: String(s.n) }, { label: "ساعات", value: fmtNum(s.manHours, 2) },
      { label: "المهمات كاملة", value: s.ppePct == null ? "—" : fmtNum(s.ppePct, 1), unit: "%", mark: s.missingNoAction.length ? "fail" : undefined },
    ] },
    { k: "notes", title: "النقاط الرئيسية", text: topic.points.map((p) => `• ${p}`).join("\n") + (b.hazards ? `\n\nمهام اليوم ومخاطرها: ${b.hazards}` : "") },
    {
      k: "table", id: "att", caption: "كشف الحضور والمهمات", grid: true,
      cols: [
        { key: "n", label: "#", wMm: 8, align: "center", num: { dp: 0 } }, { key: "name", label: "الاسم", wMm: 40, align: "start" },
        { key: "trade", label: "المهنة", wMm: 24, align: "start" }, { key: "badge", label: "البطاقة", wMm: 18, align: "center" },
        ...PPE_ITEMS.map((k) => ({ key: k, label: PPE_LABEL[k], wMm: 11, align: "center" as const })),
        { key: "act", label: "الإجراء", wMm: 18, align: "center" },
      ],
      rows: b.attendees.map((p, i) => ({
        cells: {
          n: i + 1, name: p.name, trade: p.trade, badge: iso(p.badge || ""),
          ...Object.fromEntries(PPE_ITEMS.map((k) => [k, k === "harness" && !p.needsHarness ? "—" : p.ppe[k] === false ? "✗" : "✓"])),
          act: actionWord[p.action || ""],
        },
      })),
    },
  ];
  return buildSpec({ doc, meta: module, project, sections: [{ orientation: "portrait", blocks }], signRoles: ["prepared", "supervisor", "hseOfficer"] });
}

export const module: ToolModule<Body> = {
  kind: "toolboxTalk", v: 1, docType: "TBT", docTypeName: "التوعية الصباحية · Toolbox talk", discipline: "سلامة", engine: TBT_ENGINE,
  profile: { id: "hse-intl@1", edition: "HSE practice", values: { durationMin: 15 }, overridden: [], unverified: ["topics"] },
  blank,
  defaultTitle: () => "التوعية الصباحية",
  Editor,
  build,
  summary: (doc) => {
    const s = summary(doc);
    return [`التوعية الصباحية · ⁦${doc.dateIso}⁩`, `حضور ⁦${s.n}⁩ · مهمات ⁦${s.ppePct == null ? "—" : fmtNum(s.ppePct, 0) + " %"}⁩`, "راجع المستند الكامل"].join("\n");
  },
};
