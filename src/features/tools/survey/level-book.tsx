// =====================================================================
//  دفتر الميزانية — levelling field book + two-peg test (screen + «رفع مشترك» PDF). Engine: src/domain/tools/level-calc.ts
//  · One reading per card (type chip BS / IS / FS / CP + one number in metres; a minus sign is an inverted staff).
//  · A sticky check bar shows ΣBS − ΣFS, Σrise − Σfall and last − first as you type, then the misclosure against the
//    chosen allowance; the adjustment is refused while the run fails («أعد الميزانية»).
// =====================================================================
import { numInputParse } from "../../../lib/num-input";
import {
  LVL_ALLOW_PRESETS, LVL_ENGINE, lvlAdjust, lvlChecks, lvlCutFill, lvlMisclosure, lvlReduce, lvlTrace, lvlTwoPeg, lvlValidate, type LvlRow,
} from "../../../domain/tools/level-calc";
import type { DocBlock } from "../../../doc/model";
import { iso } from "../../../doc/text";
import type { ToolDoc } from "../../../data/tool-docs";
import { Card, Checks, Grid2, Note, NumField, Pick, RowCards, TextField, Working } from "../../../ui/kit";
import type { ToolModule } from "../module";
import { buildSpec } from "../spec";

type RType = "bs" | "is" | "fs" | "cp";
type Reading = { pt: string; type: RType; v: string; v2: string; dist: string; design: string; remark: string };
type Body = {
  purpose: "tbm" | "ogl" | "slab" | "road" | "other"; method: "hi" | "rf";
  instrument: string; staffLen: string;
  openId: string; openRl: string; openSource: string;
  close: "bm" | "loop" | "none"; closeId: string; closeRl: string;
  allow: string; routeKm: string; adjustBy: "setups" | "distance";
  observer: string; booker: string; weather: string;
  rows: Reading[];
  peg: { a1: string; b1: string; a2: string; b2: string; sa: string; sb: string };
};

const mm = (s: string) => {
  const v = numInputParse(s || "", { allowNegative: true });
  return v == null ? null : Math.round(v * 1000);
};
const m3 = (x: number | null | undefined) => (x == null ? "" : (x / 1000).toFixed(3));

const blank = (): Body => ({
  purpose: "tbm", method: "hi", instrument: "", staffLen: "5", openId: "BM1", openRl: "", openSource: "", close: "bm", closeId: "BM2", closeRl: "",
  allow: "eng", routeKm: "", adjustBy: "setups", observer: "", booker: "", weather: "",
  rows: [{ pt: "BM1", type: "bs", v: "", v2: "", dist: "", design: "", remark: "" }],
  peg: { a1: "", b1: "", a2: "", b2: "", sa: "5", sb: "55" },
});

const toRows = (rs: Reading[]): LvlRow[] =>
  rs.map((r, i) => {
    const a = mm(r.v), b = mm(r.v2);
    return {
      id: String(i), pt: r.pt || `P${i + 1}`,
      bs: r.type === "bs" ? a : r.type === "cp" ? b : null,
      is: r.type === "is" ? a : null,
      fs: r.type === "fs" || r.type === "cp" ? a : null,
      distM: numInputParse(r.dist || ""), designMm: mm(r.design), remark: r.remark,
    };
  });

function compute(b: Body) {
  const rows = toRows(b.rows);
  const open = mm(b.openRl) ?? 0;
  const red = lvlReduce(rows, open);
  const chk = lvlChecks(red);
  const preset = LVL_ALLOW_PRESETS.find((p) => p.id === b.allow) || LVL_ALLOW_PRESETS[0];
  const closeMm = b.close === "loop" ? open : b.close === "bm" ? mm(b.closeRl) : null;
  const mis = closeMm != null && red.pts.length > 1 ? lvlMisclosure(red, closeMm, preset.rule, numInputParse(b.routeKm || "") ?? 0) : null;
  const adj = mis && mis.ok ? lvlAdjust(red, mis.eMm, b.adjustBy) : null;
  const checks = lvlValidate(rows, Math.round((numInputParse(b.staffLen) ?? 5) * 1000));
  const peg = (() => {
    const p = b.peg;
    const v = [p.a1, p.b1, p.a2, p.b2].map(mm);
    const sa = numInputParse(p.sa), sb = numInputParse(p.sb);
    return v.every((x) => x != null) && sa != null && sb != null && sa !== sb ? lvlTwoPeg({ a1: v[0]!, b1: v[1]!, a2: v[2]!, b2: v[3]!, saM: sa, sbM: sb }, 1) : null;
  })();
  return { rows, red, chk, mis, adj, checks, peg, preset };
}

const TYPES: [RType, string][] = [["bs", "BS مؤخرة"], ["is", "IS متوسطة"], ["fs", "FS مقدمة"], ["cp", "CP نقطة دوران"]];

function Editor({ body: b, set, ctx }: { body: Body; set: (b: Body) => void; ctx: any }) {
  const c = compute(b);
  const ro = ctx.readOnly;
  const put = (p: Partial<Body>) => !ro && set({ ...b, ...p });
  const rlOf = new Map(c.red.pts.map((p) => [p.id, p]));
  const ok = (x: boolean) => (x ? "✓" : "✗");
  return (
    <div className="space-y-3">
      <div className="sticky top-0 z-[5] -mx-4 px-4 py-2 bg-canvas/[.97] border-b border-line text-[12px] leading-relaxed">
        <bdi dir="ltr" className="font-grotesk">ΣBS−ΣFS {m3(c.chk.bsMinusFs)} {ok(c.chk.check1)} · Σ↑−Σ↓ {m3(c.chk.riseMinusFall)} {ok(c.chk.checkRf)} · HI {ok(c.chk.check2)}</bdi>
        {c.mis && <span className={`block ${c.mis.ok ? "text-good" : "text-bad"}`}>خطأ القفل <bdi dir="ltr" className="font-grotesk">e = {c.mis.eMm} mm · المسموح {c.mis.allowMm.toFixed(1)} mm</bdi> {c.mis.ok ? "✓ مقبول" : "✗ أعد الميزانية"}</span>}
      </div>

      <Card title="البيانات">
        <div className="space-y-2.5">
          <Pick label="الغرض" items={[["tbm", "نقل روبير"], ["ogl", "مناسيب أرض طبيعية"], ["slab", "مناسيب بلاطة"], ["road", "قطاع طريق"], ["other", "أخرى"]]} value={b.purpose} onChange={(v) => put({ purpose: v })} />
          <Grid2>
            <TextField label="الجهاز (النوع والرقم)" value={b.instrument} onChange={(v) => put({ instrument: v })} />
            <NumField label="طول القامة" unit="m" value={b.staffLen} onChange={(v) => put({ staffLen: v })} />
            <TextField label="روبير البداية" dir="ltr" value={b.openId} onChange={(v) => put({ openId: v })} />
            <NumField label="منسوبه" unit="m" value={b.openRl} onChange={(v) => put({ openRl: v })} rule={{ allowNegative: true }} />
          </Grid2>
          <TextField label="مصدر الروبير (هيئة المساحة / شهادة)" value={b.openSource} onChange={(v) => put({ openSource: v })} />
          <Pick label="القفل" items={[["bm", "على روبير معلوم"], ["loop", "حلقة مغلقة"], ["none", "مسار مفتوح"]]} value={b.close} onChange={(v) => put({ close: v })} />
          {b.close === "bm" && <Grid2>
            <TextField label="روبير القفل" dir="ltr" value={b.closeId} onChange={(v) => put({ closeId: v })} />
            <NumField label="منسوبه المعلوم" unit="m" value={b.closeRl} onChange={(v) => put({ closeRl: v })} rule={{ allowNegative: true }} />
          </Grid2>}
          {b.close !== "none" && <>
            <Pick label="الخطأ المسموح" items={LVL_ALLOW_PRESETS.map((p) => [p.id, p.name] as [string, string])} value={b.allow} onChange={(v) => put({ allow: v })} />
            {c.preset.rule.kind === "sqrtK" && <NumField label="طول المسار K" unit="km" value={b.routeKm} onChange={(v) => put({ routeKm: v })} />}
            <Pick label="توزيع الخطأ" items={[["setups", "بعدد الأوضاع"], ["distance", "بالمسافة"]]} value={b.adjustBy} onChange={(v) => put({ adjustBy: v })} />
          </>}
        </div>
      </Card>

      <Card title={`القراءات (${b.rows.length})`}>
        <RowCards<Reading>
          rows={b.rows}
          onChange={(rows) => put({ rows })}
          blank={() => {
            const last = b.rows[b.rows.length - 1];
            return { pt: `P${b.rows.length + 1}`, type: last && (last.type === "bs" || last.type === "cp" || last.type === "is") ? "is" : "bs", v: "", v2: "", dist: "", design: "", remark: "" };
          }}
          addLabel="قراءة جديدة"
          max={1500}
          summary={(r, i) => {
            const p = rlOf.get(String(i));
            const cf = p && r.design ? lvlCutFill(p.rlMm, mm(r.design) ?? 0).label : "";
            return `${r.pt} · ${r.type.toUpperCase()} ${r.v || "—"}${r.type === "cp" ? ` / ${r.v2 || "—"}` : ""} → RL ${p ? m3(p.rlMm) : "—"}${cf ? ` · ${cf}` : ""}`;
          }}
          render={(r, setR) => (
            <>
              <Pick items={TYPES} value={r.type} onChange={(type) => setR({ ...r, type })} />
              <Grid2>
                <TextField label="النقطة" dir="ltr" value={r.pt} onChange={(v) => setR({ ...r, pt: v })} />
                <NumField label={r.type === "cp" ? "FS مقدمة" : "القراءة"} unit="m" value={r.v} onChange={(v) => setR({ ...r, v })} rule={{ allowNegative: true }} hint="سالب = قامة مقلوبة" />
                {r.type === "cp" && <NumField label="BS مؤخرة" unit="m" value={r.v2} onChange={(v) => setR({ ...r, v2: v })} rule={{ allowNegative: true }} />}
                {(r.type === "fs" || r.type === "cp") && <NumField label="طول الوضع (مؤخرة + مقدمة)" unit="m" value={r.dist} onChange={(v) => setR({ ...r, dist: v })} />}
                <NumField label="المنسوب التصميمي" unit="m" value={r.design} onChange={(v) => setR({ ...r, design: v })} rule={{ allowNegative: true }} />
                <TextField label="ملاحظة" value={r.remark} onChange={(v) => setR({ ...r, remark: v })} />
              </Grid2>
            </>
          )}
        />
      </Card>

      {c.mis && !c.mis.ok && <Note tone="warn">الخطأ أكبر من المسموح — لا يُوزَّع. أعد الميزانية.</Note>}
      {c.adj && <Note>تُطبَّق التصحيحات في التقرير (عمود «المنسوب المصحح»).</Note>}

      <Card title="اختبار الوتدين (ضبط خط النظر)">
        <Grid2>
          {([["a1", "a₁ (من المنتصف)"], ["b1", "b₁ (من المنتصف)"], ["a2", "a₂ (قرب A)"], ["b2", "b₂ (بعيد)"], ["sa", "المسافة إلى A"], ["sb", "المسافة إلى B"]] as const).map(([k, l]) => (
            <NumField key={k} label={l} unit="m" value={b.peg[k]} onChange={(v) => put({ peg: { ...b.peg, [k]: v } })} />
          ))}
        </Grid2>
        {c.peg && <p className={`mt-2 text-[12.5px] ${c.peg.ok ? "text-good" : "text-bad"}`}><bdi dir="ltr" className="font-grotesk">e = {c.peg.eMmPerM.toFixed(3)} mm/m · {c.peg.per20Mm.toFixed(1)} mm/20 m · {c.peg.arcSec.toFixed(2)}″</bdi> {c.peg.ok ? "✓ مقبول" : "✗ يحتاج ضبط"}</p>}
      </Card>

      {c.checks.length > 0 && <Card title="المراجعات"><Checks items={c.checks} /></Card>}
      <Working steps={lvlTrace(c.red, c.chk)} />
      <Note>دفتر ميداني بحسابات تحقق آلية؛ حدود الخطأ حسب الإعداد أو مواصفات المشروع، ولا يغني عن اعتماد المساح المختص.</Note>
    </div>
  );
}

function build(doc: ToolDoc<Body>, project: any) {
  const b = doc.body;
  const c = compute(b);
  const adj = new Map((c.adj || []).map((x) => [x.id, x]));
  const rlOf = new Map(c.red.pts.map((p) => [p.id, p]));
  const rows = c.rows.map((r) => {
    const p = rlOf.get(r.id);
    const a = adj.get(r.id);
    const cf = p && r.designMm != null ? lvlCutFill(a ? a.adjRlMm : p.rlMm, r.designMm) : null;
    const n = (x: number | null | undefined) => (x == null ? null : x / 1000);
    return {
      cells: {
        pt: iso(r.pt), bs: n(r.bs), is: n(r.is), fs: n(r.fs), rise: n(p?.riseMm), fall: n(p?.fallMm), rl: n(p?.rlMm),
        dist: r.distM ?? null, corr: a ? a.corrMm : null, adj: a ? a.adjRlMm / 1000 : null, design: n(r.designMm), cf: cf ? iso(cf.label) : "",
        rem: [r.remark, [r.bs, r.is, r.fs].some((x) => x != null && x < 0) ? "مقلوبة" : ""].filter(Boolean).join(" · "),
      },
    };
  });
  const blocks: DocBlock[] = [
    { k: "kv", cols: 3, rows: [
      { label: "الغرض", value: { tbm: "نقل روبير", ogl: "أرض طبيعية", slab: "مناسيب بلاطة", road: "قطاع طريق", other: "أخرى" }[b.purpose] },
      { label: "الطريقة", value: b.method === "hi" ? "منسوب الجهاز" : "الارتفاع والانخفاض" },
      { label: "الجهاز", value: b.instrument || "—" },
      { label: "روبير البداية", value: iso(`${b.openId} = ${b.openRl || "—"} m`) },
      { label: "القفل", value: b.close === "loop" ? "حلقة مغلقة" : b.close === "bm" ? iso(`${b.closeId} = ${b.closeRl || "—"} m`) : "مسار مفتوح" },
      { label: "المصدر", value: b.openSource || "—" },
      { label: "الراصد", value: b.observer || "—" }, { label: "الكاتب", value: b.booker || "—" }, { label: "الطقس", value: b.weather || "—" },
    ] },
    {
      k: "table", id: "lb", caption: "", grid: true, carry: { sumCols: ["bs", "is", "fs", "rise", "fall"] },
      cols: [
        { key: "pt", label: "النقطة", wMm: 20, align: "center" },
        { key: "bs", label: "BS", wMm: 17, align: "end", num: { dp: 3 } }, { key: "is", label: "IS", wMm: 17, align: "end", num: { dp: 3 } },
        { key: "fs", label: "FS", wMm: 17, align: "end", num: { dp: 3 } }, { key: "rise", label: "ارتفاع", wMm: 17, align: "end", num: { dp: 3 } },
        { key: "fall", label: "انخفاض", wMm: 17, align: "end", num: { dp: 3 } }, { key: "rl", label: "المنسوب", wMm: 21, align: "end", num: { dp: 3 } },
        { key: "dist", label: "المسافة", unit: "m", wMm: 16, align: "end", num: { dp: 1 } }, { key: "corr", label: "تصحيح", unit: "mm", wMm: 16, align: "end", num: { dp: 1 } },
        { key: "adj", label: "المصحح", wMm: 21, align: "end", num: { dp: 3 } }, { key: "design", label: "التصميمي", wMm: 21, align: "end", num: { dp: 3 } },
        { key: "cf", label: "حفر/ردم", wMm: 20, align: "center" }, { key: "rem", label: "ملاحظات", wMm: 41, align: "start" },
      ],
      rows,
    },
    { k: "checks", rows: [
      { label: "ΣBS − ΣFS = آخر − أول", value: m3(c.chk.bsMinusFs), limit: m3(c.chk.diffMm), clause: "تحقق 1", ok: c.chk.check1 },
      { label: "Σارتفاع − Σانخفاض", value: m3(c.chk.riseMinusFall), limit: m3(c.chk.diffMm), clause: "تحقق R/F", ok: c.chk.checkRf },
      { label: "Σ(HI·n) − ΣIS − ΣFS = ΣRL", value: m3(c.chk.check2Lhs), limit: m3(c.chk.check2Rhs), clause: "تحقق 2", ok: c.chk.check2 },
      ...(c.mis ? [{ label: "خطأ القفل", value: `${c.mis.eMm} mm`, limit: `± ${c.mis.allowMm.toFixed(1)} mm (${c.preset.formula})`, clause: b.adjustBy === "setups" ? "توزيع بالأوضاع" : "توزيع بالمسافة", ok: c.mis.ok, unverified: b.allow === "eg" }] : []),
      ...(c.peg ? [{ label: "اختبار الوتدين", value: `${c.peg.per20Mm.toFixed(1)} mm / 20 m`, limit: "≤ 1 mm / 20 m", clause: `${c.peg.arcSec.toFixed(1)}″`, ok: c.peg.ok, unverified: true }] : []),
    ] },
  ];
  return buildSpec({
    doc, meta: module, project, sections: [{ orientation: "landscape", blocks }],
    basis: { rows: [{ key: "allow", label: "الخطأ المسموح", value: c.preset.formula, source: c.preset.id === "eg" ? "نقطة مرجعية — ليست قاعدة الهيئة" : "ممارسة هندسية", conf: c.preset.id === "eg" ? "L" : "H", flagged: c.preset.id === "eg" }], formulas: lvlTrace(c.red, c.chk) },
    signRoles: ["prepared", "siteEngineer", "consultantRep"],
  });
}

export const module: ToolModule<Body> = {
  kind: "levelBook", v: 1, docType: "LB", docTypeName: "دفتر الميزانية · Level book", discipline: "مساحة", engine: LVL_ENGINE,
  profile: { id: "survey-eng@1", edition: "Engineering levelling practice", values: {}, overridden: [], unverified: [] },
  blank,
  defaultTitle: () => "دفتر الميزانية",
  Editor,
  build,
  summary: (doc) => {
    const c = compute(doc.body);
    return [
      doc.title,
      `⁦${doc.body.openId} ${doc.body.openRl} m⁩ · ⁦${c.red.pts.length}⁩ نقطة`,
      c.mis ? `خطأ القفل ⁦${c.mis.eMm} mm⁩ من ⁦${c.mis.allowMm.toFixed(1)} mm⁩ ${c.mis.ok ? "مقبول" : "مرفوض"}` : "",
      "راجع الدفتر الكامل",
    ].filter(Boolean).join("\n");
  },
};
