// =====================================================================
//  اعتماد خامة — material submittal (screen + PDF + Word). What the material is, who makes it, its key properties, where it
//  goes and how much, the specification clause it answers and what is attached; the consultant's A / B / C / D code is
//  ticked on the printed copy. «املأ بالمهندس الذكي» drafts it from a plain description.
// =====================================================================
import type { DocBlock } from "../../../doc/model";
import { iso } from "../../../doc/text";
import type { ToolDoc } from "../../../data/tool-docs";
import { AreaField, Card, Check, Grid2, Note, RowCards, TextField } from "../../../ui/kit";
import { AiFillCard, str, strs } from "../../ai/AiFill";
import type { ToolModule } from "../module";
import { buildSpec } from "../spec";

type Spec = { property: string; value: string };
type Att = { name: string; on: boolean };
type Body = {
  material: string; manufacturer: string; model: string; origin: string; supplier: string;
  specs: Spec[]; area: string; quantity: string; specRef: string; attachments: Att[]; remarks: string;
};

const ATTACH = ["كتالوج / Datasheet", "شهادات اختبار", "عينة", "شهادة منشأ", "خطاب الضمان", "سابقة أعمال"];

const blank = (): Body => ({
  material: "", manufacturer: "", model: "", origin: "", supplier: "", specs: [], area: "", quantity: "", specRef: "",
  attachments: ATTACH.map((name, i) => ({ name, on: i === 0 })), remarks: "",
});

export function submittalFromAi(b: Body, d: any): Body & { title?: string } {
  const specs = Array.isArray(d && d.specs)
    ? d.specs.map((r: any) => ({ property: str(r && r.property, 120), value: str(r && r.value, 200) })).filter((r: Spec) => r.property || r.value).slice(0, 30)
    : [];
  const att = strs(d && d.attachments, 12, 120);
  const known = b.attachments.map((a) => a.name);
  return {
    ...b,
    title: str(d && d.title, 140) || undefined,
    material: str(d && d.material, 200) || b.material,
    manufacturer: str(d && d.manufacturer, 160) || b.manufacturer,
    model: str(d && d.model, 160) || b.model,
    origin: str(d && d.origin, 80) || b.origin,
    specs: specs.length ? specs : b.specs,
    area: str(d && d.areaOfUse, 300) || b.area,
    quantity: str(d && d.quantity, 120) || b.quantity,
    specRef: str(d && d.specReference, 200) || b.specRef,
    attachments: att.length ? [...b.attachments.map((a) => ({ ...a, on: a.on })), ...att.filter((x) => !known.includes(x)).map((name) => ({ name, on: true }))] : b.attachments,
    remarks: str(d && d.remarks, 1500) || b.remarks,
  };
}

function Editor({ body: b, set, ctx }: { body: Body; set: (b: Body) => void; ctx: any }) {
  const ro = ctx.readOnly;
  const put = (p: Partial<Body>) => !ro && set({ ...b, ...p });
  return (
    <div className="space-y-3">
      <AiFillCard
        app={ctx.app}
        form="submittal"
        disabled={ro}
        project={ctx.project ? { name: ctx.project.name, contractNo: ctx.project.contractNo } : null}
        placeholder={{ ar: "مثال: عايز اعتماد بلاط بورسلين 60×60 من شركة ... للممرات في الأدوار المتكررة، حوالي 1200 م²…", en: "e.g. approval for 60×60 porcelain tiles from … for the typical-floor corridors, about 1,200 m²…" }}
        onFill={(d) => {
          const { title, ...next } = submittalFromAi(b, d);
          if (ctx.fill) ctx.fill(next, title);
          else set(next);
        }}
      />
      <Card title="الخامة">
        <TextField label="الخامة / البند" value={b.material} onChange={(v) => put({ material: v })} />
        <div className="mt-2.5"><Grid2>
          <TextField label="المصنّع" value={b.manufacturer} onChange={(v) => put({ manufacturer: v })} />
          <TextField label="الموديل / الدرجة" dir="auto" value={b.model} onChange={(v) => put({ model: v })} />
          <TextField label="بلد المنشأ" value={b.origin} onChange={(v) => put({ origin: v })} />
          <TextField label="المورّد" value={b.supplier} onChange={(v) => put({ supplier: v })} />
          <TextField label="مكان الاستخدام" value={b.area} onChange={(v) => put({ area: v })} />
          <TextField label="الكمية التقريبية" dir="auto" value={b.quantity} onChange={(v) => put({ quantity: v })} />
        </Grid2></div>
        <div className="mt-2.5"><TextField label="بند المواصفات" dir="auto" value={b.specRef} onChange={(v) => put({ specRef: v })} /></div>
      </Card>
      <Card title="الخصائص الفنية">
        <RowCards<Spec> rows={b.specs} onChange={(specs) => put({ specs })} max={40} addLabel="خاصية" blank={() => ({ property: "", value: "" })} summary={(r) => `${r.property || "خاصية"}: ${r.value || "—"}`}
          render={(r, setR) => <Grid2><TextField label="الخاصية" value={r.property} onChange={(v) => setR({ ...r, property: v })} /><TextField label="القيمة" dir="auto" value={r.value} onChange={(v) => setR({ ...r, value: v })} /></Grid2>} />
      </Card>
      <Card title="المرفقات">
        {b.attachments.map((a, i) => (
          <Check key={a.name + i} label={a.name} on={a.on} onChange={(on) => put({ attachments: b.attachments.map((x, j) => (j === i ? { ...x, on } : x)) })} />
        ))}
      </Card>
      <Card title="ملاحظات"><AreaField label="ملاحظات" value={b.remarks} onChange={(v) => put({ remarks: v })} rows={3} /></Card>
      <Note>القيم الفنية من كتالوج المصنّع وشهادات الاختبار فقط — راجع كل خانة بين [ ] قبل الإصدار.</Note>
    </div>
  );
}

function build(doc: ToolDoc<Body>, project: any) {
  const b = doc.body;
  const blocks: DocBlock[] = [
    { k: "kv", cols: 3, rows: [
      { label: "الخامة", value: b.material || "—", wide: true }, { label: "المصنّع", value: b.manufacturer || "—" }, { label: "الموديل / الدرجة", value: b.model || "—" },
      { label: "بلد المنشأ", value: b.origin || "—" }, { label: "المورّد", value: b.supplier || "—" }, { label: "مكان الاستخدام", value: b.area || "—" },
      { label: "الكمية", value: b.quantity || "—" }, { label: "بند المواصفات", value: b.specRef || "—" }, { label: "تاريخ التقديم", value: iso(doc.dateIso) },
    ] },
    {
      k: "table", id: "specs", caption: "الخصائص الفنية · Technical data", grid: true,
      cols: [{ key: "n", label: "#", wMm: 10, align: "center", num: { dp: 0 } }, { key: "p", label: "الخاصية", wMm: 70, align: "start" }, { key: "v", label: "القيمة المقدمة", wMm: 90, align: "start" }],
      rows: (b.specs.length ? b.specs : [{ property: "—", value: "—" }]).map((r, i) => ({ cells: { n: i + 1, p: r.property, v: r.value } })),
    },
    { k: "notes", title: "المرفقات · Attachments", text: b.attachments.map((a) => `${a.on ? "☑" : "☐"} ${a.name}`).join("\n") },
    ...(b.remarks.trim() ? [{ k: "notes", title: "ملاحظات · Remarks", text: b.remarks } as DocBlock] : []),
    { k: "notes", title: "قرار الاستشاري · Consultant's action", text: "☐ A معتمد   ☐ B معتمد بملاحظات   ☐ C يُعاد التقديم   ☐ D مرفوض\n\nالملاحظات:\n\n" },
  ];
  return buildSpec({ doc, meta: module, project, sections: [{ orientation: "portrait", blocks }], signRoles: ["contractorRep", "consultantRep"] });
}

export const module: ToolModule<Body> = {
  kind: "submittal", v: 1, docType: "MAS", docTypeName: "اعتماد خامة · Material approval submittal", discipline: "مكتب فني", engine: "submittal@1.0.0",
  profile: { id: "office@1", edition: "Technical office practice", values: {}, overridden: [], unverified: [] },
  blank,
  defaultTitle: () => "اعتماد خامة",
  Editor,
  build,
  summary: (doc) => [`اعتماد خامة · ⁦${doc.docNo || doc.dateIso}⁩`, doc.body.material, [doc.body.manufacturer, doc.body.model].filter(Boolean).join(" · "), doc.body.area ? `الاستخدام: ${doc.body.area}` : ""].filter(Boolean).join("\n"),
};
