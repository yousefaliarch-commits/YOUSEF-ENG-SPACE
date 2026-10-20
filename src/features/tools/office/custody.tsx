// =====================================================================
//  محضر تسليم عهدة — custody handover (screen + PDF + Word): who hands what to whom and why, item by item with quantity,
//  unit, condition and serial number; both sides sign. «املأ بالمهندس الذكي» turns «سلّمت لعم سيد 2 هيلتي و5 سقالات…» into
//  the table. Names stay in the member's own account and appear only in documents they share.
// =====================================================================
import type { DocBlock } from "../../../doc/model";
import { fmtNum, iso } from "../../../doc/text";
import type { ToolDoc } from "../../../data/tool-docs";
import { AreaField, Card, Grid2, Note, NumField, Pick, ResultHero, RowCards, TextField } from "../../../ui/kit";
import { numInputParse } from "../../../lib/num-input";
import { AiFillCard, str } from "../../ai/AiFill";
import type { ToolModule } from "../module";
import { buildSpec } from "../spec";

type Cond = "new" | "good" | "fair" | "repair";
type Item = { desc: string; qty: string; unit: string; cond: Cond; serial: string };
type Body = { from: string; fromRole: string; to: string; toRole: string; purpose: string; returnBy: string; items: Item[]; remarks: string };

const COND: [Cond, string][] = [["new", "جديد"], ["good", "جيد"], ["fair", "مقبول"], ["repair", "يحتاج صيانة"]];
const COND_OF: Record<string, Cond> = { new: "new", good: "good", fair: "fair", "needs repair": "repair", repair: "repair" };

const blank = (): Body => ({ from: "", fromRole: "", to: "", toRole: "", purpose: "", returnBy: "", items: [], remarks: "" });

export function custodyFromAi(b: Body, d: any): Body {
  const items: Item[] = Array.isArray(d && d.items)
    ? d.items.map((r: any) => ({
        desc: str(r && r.description, 200),
        qty: Number(r && r.qty) > 0 ? String(Math.round(Number(r.qty) * 100) / 100) : "",
        unit: str(r && r.unit, 30),
        cond: COND_OF[str(r && r.condition).toLowerCase()] || "good",
        serial: str(r && r.serial, 60),
      })).filter((r: Item) => r.desc).slice(0, 80)
    : [];
  return {
    ...b,
    from: str(d && d.from, 120) || b.from,
    to: str(d && d.to, 120) || b.to,
    purpose: str(d && d.purpose, 400) || b.purpose,
    items: items.length ? [...b.items, ...items] : b.items,
    remarks: str(d && d.remarks, 1000) || b.remarks,
  };
}

const totalQty = (b: Body) => b.items.reduce((a, r) => a + (numInputParse(r.qty) || 0), 0);

function Editor({ body: b, set, ctx }: { body: Body; set: (b: Body) => void; ctx: any }) {
  const ro = ctx.readOnly;
  const put = (p: Partial<Body>) => !ro && set({ ...b, ...p });
  return (
    <div className="space-y-3">
      <AiFillCard
        app={ctx.app}
        form="custody"
        disabled={ro}
        project={ctx.project ? { name: ctx.project.name } : null}
        placeholder={{ ar: "مثال: سلّمت لريس النجارين 2 هيلتي بوش جديد، 5 سقالات معدن، و1 ميزان ليزر حالته جيدة رقمه LZ-204، للشغل في البلوك B…", en: "e.g. handed the carpentry foreman 2 new Bosch hammer drills, 5 steel scaffold frames and 1 laser level (good, LZ-204) for block B…" }}
        onFill={(d) => {
          const next = custodyFromAi(b, d);
          if (ctx.fill) ctx.fill(next);
          else set(next);
        }}
      />
      <ResultHero label="بنود العهدة" value={String(b.items.length)} unit="بند" sub={`إجمالي الكميات ${fmtNum(totalQty(b), 2)}`} />
      <Card title="الطرفان">
        <Grid2>
          <TextField label="المسلِّم" value={b.from} onChange={(v) => put({ from: v })} />
          <TextField label="صفته" value={b.fromRole} onChange={(v) => put({ fromRole: v })} />
          <TextField label="المستلِم" value={b.to} onChange={(v) => put({ to: v })} />
          <TextField label="صفته" value={b.toRole} onChange={(v) => put({ toRole: v })} />
        </Grid2>
        <div className="mt-2.5"><TextField label="الغرض / مكان الاستخدام" value={b.purpose} onChange={(v) => put({ purpose: v })} /></div>
        <label className="mt-2.5 block"><span className="block text-[12px] text-ink-2 mb-1">تُرد قبل (اختياري)</span>
          <input type="date" dir="ltr" value={b.returnBy} onChange={(e) => put({ returnBy: e.target.value })} className="w-full h-12 px-3 rounded-xl bg-canvas border border-line-2 font-grotesk text-[15px]" /></label>
      </Card>
      <Card title="البنود">
        <RowCards<Item> rows={b.items} onChange={(items) => put({ items })} max={150} addLabel="بند"
          blank={() => ({ desc: "", qty: "1", unit: b.items[b.items.length - 1]?.unit || "عدد", cond: "good", serial: "" })}
          summary={(r) => `${r.desc || "بند"} · ${r.qty || 0} ${r.unit || ""} · ${(COND.find((c) => c[0] === r.cond) || COND[1])[1]}`}
          render={(r, setR) => (
            <>
              <TextField label="الوصف" value={r.desc} onChange={(v) => setR({ ...r, desc: v })} />
              <Grid2>
                <NumField label="الكمية" value={r.qty} onChange={(v) => setR({ ...r, qty: v })} />
                <TextField label="الوحدة" value={r.unit} onChange={(v) => setR({ ...r, unit: v })} />
              </Grid2>
              <TextField label="الرقم التسلسلي / الكود" dir="ltr" value={r.serial} onChange={(v) => setR({ ...r, serial: v })} />
              <Pick label="الحالة" items={COND} value={r.cond} onChange={(cond) => setR({ ...r, cond })} />
            </>
          )}
        />
      </Card>
      <Card title="ملاحظات"><AreaField label="ملاحظات" value={b.remarks} onChange={(v) => put({ remarks: v })} rows={2} /></Card>
      <Note>المستلِم مسؤول عن العهدة حتى ردّها أو تسليمها بمحضر. الأسماء محفوظة في حسابك فقط.</Note>
    </div>
  );
}

function build(doc: ToolDoc<Body>, project: any) {
  const b = doc.body;
  const blocks: DocBlock[] = [
    { k: "kv", cols: 2, rows: [
      { label: "المسلِّم", value: [b.from, b.fromRole].filter(Boolean).join(" — ") || "—" },
      { label: "المستلِم", value: [b.to, b.toRole].filter(Boolean).join(" — ") || "—" },
      { label: "الغرض", value: b.purpose || "—" },
      { label: "التاريخ", value: iso(doc.dateIso) },
      ...(b.returnBy ? [{ label: "تُرد قبل", value: iso(b.returnBy) }] : []),
    ] },
    {
      k: "table", id: "items", caption: "بنود العهدة · Items", grid: true,
      cols: [
        { key: "n", label: "#", wMm: 9, align: "center", num: { dp: 0 } }, { key: "d", label: "الوصف", wMm: 68, align: "start" },
        { key: "q", label: "الكمية", wMm: 18, align: "center", num: { dp: 2 } }, { key: "u", label: "الوحدة", wMm: 18, align: "center" },
        { key: "c", label: "الحالة", wMm: 24, align: "center" }, { key: "s", label: "الرقم / الكود", wMm: 33, align: "center" },
      ],
      rows: b.items.map((r, i) => ({ cells: { n: i + 1, d: r.desc, q: numInputParse(r.qty) ?? null, u: r.unit, c: (COND.find((c) => c[0] === r.cond) || COND[1])[1], s: iso(r.serial || "") } })),
    },
    { k: "notes", text: `أقر أنا المستلِم باستلام البنود الموضحة أعلاه بالحالة المبينة، وأتعهد بالمحافظة عليها وردّها عند الطلب.${b.remarks.trim() ? `\n\nملاحظات: ${b.remarks}` : ""}` },
  ];
  return buildSpec({ doc, meta: module, project, sections: [{ orientation: "portrait", blocks }], signRoles: ["storeKeeper", "requester", "siteEngineer"] });
}

export const module: ToolModule<Body> = {
  kind: "custody", v: 1, docType: "CUS", docTypeName: "محضر تسليم عهدة · Custody handover", discipline: "إدارة الموقع", engine: "custody@1.0.0",
  profile: { id: "office@1", edition: "Site practice", values: {}, overridden: [], unverified: [] },
  blank,
  defaultTitle: () => "محضر تسليم عهدة",
  Editor,
  build,
  summary: (doc) => [`محضر تسليم عهدة · ⁦${doc.docNo || doc.dateIso}⁩`, `${doc.body.from || "—"} ← ${doc.body.to || "—"}`, `⁦${doc.body.items.length}⁩ بند`].join("\n"),
};
