// =====================================================================
//  أمر تغيير — variation order (W7; money tool: engineers and owners, never site supervisors). What changed and why (client
//  request, design change, site condition, omission), the instruction it rests on, priced additions and omissions, the time
//  asked for, and the engineer's decision (approved / partly / rejected, value, days, date, reference). Engine: vo-calc.ts.
//  Every variation order feeds the VO register (register.tsx).
// =====================================================================
import { numInputParse } from "../../../lib/num-input";
import { VO_ENGINE, computeVo, type VoItem } from "../../../domain/tools/vo-calc";
import type { DocBlock } from "../../../doc/model";
import { fmtNum, iso } from "../../../doc/text";
import type { ToolDoc } from "../../../data/tool-docs";
import { AreaField, Card, Checks, DateField, Grid2, Note, NumField, Pick, ResultHero, RowCards, TextField } from "../../../ui/kit";
import type { ToolModule } from "../module";
import { buildSpec } from "../spec";

type Item = { item: string; desc: string; unit: string; qty: string; rate: string; omit: boolean };
type Body = {
  contract: string; alertPct: string; origin: string; instruction: string; reason: string; items: Item[];
  daysReq: string; status: "draft" | "submitted" | "approved" | "partial" | "rejected";
  approvedValue: string; approvedDays: string; approvedOn: string; approvedRef: string;
};

export const ORIGINS: [string, string][] = [["client", "طلب المالك"], ["design", "تعديل تصميم"], ["site", "ظروف موقع"], ["omission", "إلغاء أعمال"], ["other", "أخرى"]];
export const VO_STATUS: [Body["status"], string][] = [["draft", "مسودة"], ["submitted", "مقدَّم"], ["approved", "معتمد"], ["partial", "معتمد جزئيًا"], ["rejected", "مرفوض"]];

const N = (s: string) => numInputParse(s || "") ?? 0;
const blankItem = (): Item => ({ item: "", desc: "", unit: "م³", qty: "", rate: "", omit: false });
export const itemsOf = (b: Body): VoItem[] => b.items.map((i) => ({ item: i.item, desc: i.desc, unit: i.unit, qty: N(i.qty), rate: N(i.rate), omit: i.omit }));
export const voOf = (b: Body) => computeVo(itemsOf(b), { contract: N(b.contract), alertPct: N(b.alertPct), approved: b.approvedValue.trim() ? N(b.approvedValue) : null });
const money = (x: number) => fmtNum(x, 2);
const word = (list: [string, string][], v: string) => (list.find((x) => x[0] === v) || ["", "—"])[1];

function Editor({ body: b, set, ctx }: { body: Body; set: (b: Body) => void; ctx: any }) {
  const ro = ctx.readOnly;
  const put = (p: Partial<Body>) => !ro && set({ ...b, ...p });
  const vo = voOf(b);
  const decided = b.status === "approved" || b.status === "partial" || b.status === "rejected";
  return (
    <div className="space-y-3">
      <ResultHero
        label="صافي التغيير"
        value={money(vo.net)}
        unit="ج.م"
        sub={`إضافات ${money(vo.additions)} · إلغاءات ${money(vo.omissions)}${vo.pct != null ? ` · ${fmtNum(vo.pct, 2)} % من العقد` : ""}`}
        tone={vo.checks.some((c) => c.ok === false) ? "bad" : "accent"}
      />
      <Card title="البيانات">
        <Pick label="سبب التغيير" items={ORIGINS} value={b.origin} onChange={(origin) => put({ origin })} />
        <div className="mt-2.5"><Grid2>
          <TextField label="مرجع التعليمات" dir="auto" value={b.instruction} onChange={(v) => put({ instruction: v })} placeholder="SI-014 / خطاب الاستشاري" />
          <NumField label="قيمة العقد" unit="ج.م" value={b.contract} onChange={(v) => put({ contract: v })} />
          <NumField label="حد التنبيه (من العقد)" unit="%" value={b.alertPct} onChange={(v) => put({ alertPct: v })} hint="كما في شروط العقد" />
          <NumField label="المدة الإضافية المطلوبة" unit="يوم" value={b.daysReq} onChange={(v) => put({ daysReq: v })} />
        </Grid2></div>
        <div className="mt-2.5"><AreaField label="وصف التغيير وسببه" value={b.reason} onChange={(v) => put({ reason: v })} rows={3} /></div>
      </Card>
      <RowCards<Item>
        rows={b.items} onChange={(items) => put({ items })} blank={blankItem} addLabel="بند" max={200}
        summary={(it, i) => `${it.item || i + 1} · ${it.desc || "—"} · ${money(vo.lines[i]?.amount || 0)}`}
        render={(it, s, i) => (
          <>
            <Grid2>
              <TextField label="رقم البند" dir="auto" value={it.item} onChange={(v) => s({ ...it, item: v })} />
              <TextField label="الوحدة" dir="auto" value={it.unit} onChange={(v) => s({ ...it, unit: v })} />
            </Grid2>
            <TextField label="البيان" value={it.desc} onChange={(v) => s({ ...it, desc: v })} />
            <Grid2>
              <NumField label="الكمية" value={it.qty} onChange={(v) => s({ ...it, qty: v })} />
              <NumField label="الفئة" unit="ج.م" value={it.rate} onChange={(v) => s({ ...it, rate: v })} />
            </Grid2>
            <Pick items={[["add", "إضافة"], ["omit", "إلغاء"]]} value={it.omit ? "omit" : "add"} onChange={(v) => s({ ...it, omit: v === "omit" })} />
            <p className="text-[12.5px]">القيمة <bdi dir="ltr" className="font-grotesk">{money(vo.lines[i]?.amount || 0)}</bdi></p>
          </>
        )}
      />
      <Card title="قرار المهندس">
        <Pick label="الحالة" items={VO_STATUS} value={b.status} onChange={(status) => put({ status })} />
        {decided && (
          <div className="mt-2.5"><Grid2>
            <NumField label="القيمة المعتمدة" unit="ج.م" value={b.approvedValue} onChange={(v) => put({ approvedValue: v })} />
            <NumField label="المدة المعتمدة" unit="يوم" value={b.approvedDays} onChange={(v) => put({ approvedDays: v })} />
            <DateField label="تاريخ الاعتماد" value={b.approvedOn} onChange={(v) => put({ approvedOn: v })} readOnly={ro} />
            <TextField label="مرجع الاعتماد" dir="auto" value={b.approvedRef} onChange={(v) => put({ approvedRef: v })} />
          </Grid2></div>
        )}
      </Card>
      {vo.checks.length > 0 && <Checks items={vo.checks} />}
      <Note>الإضافة تُقيَّم بفئات العقد أو بفئة جديدة متفق عليها؛ الإلغاء يُخصم بفئة العقد. أمر التغيير لا يُنفَّذ قبل تعليمات مكتوبة من المهندس.</Note>
    </div>
  );
}

function build(doc: ToolDoc<Body>, project: any) {
  const b = doc.body;
  const vo = voOf(b);
  const decided = b.status === "approved" || b.status === "partial" || b.status === "rejected";
  const blocks: DocBlock[] = [
    { k: "kv", cols: 3, rows: [
      { label: "سبب التغيير", value: word(ORIGINS, b.origin) }, { label: "مرجع التعليمات", value: b.instruction || "—" }, { label: "الحالة", value: word(VO_STATUS, b.status) },
      { label: "قيمة العقد", value: iso(b.contract ? money(N(b.contract)) : "—") }, { label: "المدة المطلوبة", value: iso(`${N(b.daysReq)} يوم`) }, { label: "التاريخ", value: iso(doc.dateIso) },
    ] },
    { k: "notes", title: "وصف التغيير وسببه · Description and reason", text: b.reason || "—" },
    {
      k: "table", id: "vo", caption: "البنود · Items (الإلغاء بقيمة سالبة)", grid: true,
      cols: [
        { key: "item", label: "البند", wMm: 16, align: "center" }, { key: "desc", label: "البيان", wMm: 62, align: "start" },
        { key: "unit", label: "الوحدة", wMm: 14, align: "center" }, { key: "qty", label: "الكمية", wMm: 22, align: "end", num: { dp: 3 } },
        { key: "rate", label: "الفئة", wMm: 24, align: "end", num: { dp: 2 } },
        { key: "amt", label: "القيمة", wMm: 30, align: "end", num: { dp: 2 }, xl: { f: "{qty}*{rate}" } },
      ],
      rows: vo.lines.map((l) => ({ cells: { item: iso(l.item), desc: l.desc, unit: l.unit, qty: l.signedQty, rate: l.rate, amt: l.amount } })),
      carry: { sumCols: ["amt"] },
      totals: { kind: "total", cells: { desc: "صافي التغيير", amt: vo.net } },
    },
    { k: "kpis", items: [
      { label: "الإضافات", value: money(vo.additions), unit: "ج.م" },
      { label: "الإلغاءات", value: money(vo.omissions), unit: "ج.م" },
      { label: "الصافي", value: money(vo.net), unit: "ج.م", mark: vo.checks.some((c) => c.ok === false) ? "warn" : "ok" },
      { label: "من العقد", value: vo.pct != null ? fmtNum(vo.pct, 2) : "—", unit: "%" },
    ] },
  ];
  if (vo.checks.length) blocks.push({ k: "checks", rows: vo.checks.map((c) => ({ label: c.label, value: c.value, limit: c.limit, clause: c.clause || "", ok: c.ok })) });
  blocks.push({
    k: "kv", cols: 2, rows: decided
      ? [
          { label: "القرار", value: word(VO_STATUS, b.status) }, { label: "القيمة المعتمدة", value: iso(b.status === "rejected" ? "0.00" : money(b.approvedValue.trim() ? N(b.approvedValue) : vo.net)) },
          { label: "المدة المعتمدة", value: iso(`${N(b.approvedDays)} يوم`) }, { label: "التاريخ والمرجع", value: iso([b.approvedOn, b.approvedRef].filter(Boolean).join(" · ") || "—") },
        ]
      : [{ label: "قرار المهندس", value: "☐ معتمد   ☐ معتمد جزئيًا   ☐ مرفوض", wide: true }],
  });
  return buildSpec({ doc, meta: module, project, sections: [{ orientation: "portrait", blocks }], signRoles: ["contractorRep", "consultantRep", "approved"] });
}

export const module: ToolModule<Body> = {
  kind: "vo", v: 1, docType: "VO", docTypeName: "أمر تغيير · Variation order", discipline: "مكتب فني", engine: VO_ENGINE,
  profile: { id: "office@1", edition: "Technical office practice", values: {}, overridden: [], unverified: [] },
  blank: () => ({
    contract: "", alertPct: "", origin: "client", instruction: "", reason: "", items: [blankItem()], daysReq: "0",
    status: "draft", approvedValue: "", approvedDays: "", approvedOn: "", approvedRef: "",
  }),
  defaultTitle: () => "أمر تغيير",
  Editor,
  build,
  summary: (doc) => {
    const vo = voOf(doc.body);
    return [`أمر تغيير · ⁦${doc.docNo || doc.dateIso}⁩`, word(ORIGINS, doc.body.origin), `الصافي ⁦${money(vo.net)}⁩ ج.م · ${word(VO_STATUS, doc.body.status)}`].join("\n");
  },
};
