// =====================================================================
//  مقاسات الدكت — equal-friction duct sizer (W4): one card per duct run, auto or chosen size, round or rectangular (the
//  ceiling void fixes the height), velocity and aspect checks, and the index path's pressure loss. Engine: duct-calc.ts.
//  · Fittings, terminals and the unit's internal losses are the engineer's figures (ASHRAE fitting data is licensed).
// =====================================================================
import { numInputParse } from "../../../lib/num-input";
import { AIR, DUCT_ENGINE, ROUGH, sizeDucts, toLs, type DuctLimits, type DuctMat, type DuctRun, type FlowUnit } from "../../../domain/tools/duct-calc";
import type { DocBlock } from "../../../doc/model";
import { fmtNum, iso } from "../../../doc/text";
import type { ToolDoc } from "../../../data/tool-docs";
import { Card, Check, Checks, Grid2, Note, NumField, Pick, ResultHero, RowCards, TextField, Working } from "../../../ui/kit";
import type { ToolModule } from "../module";
import { buildSpec } from "../spec";

type Run = { tag: string; desc: string; q: string; len: string; shape: "round" | "rect"; d: string; w: string; h: string; fit: string; index: boolean };
type Body = { unit: FlowUnit; paPerM: string; vMax: string; aspectMax: string; step: "25" | "50"; mat: DuctMat; extra: string; runs: Run[] };

const N = (s: string) => numInputParse(s || "") ?? 0;
const UNIT: Record<FlowUnit, string> = { ls: "L/s", cfm: "CFM", m3h: "m³/h" };
const blankRun = (): Run => ({ tag: "", desc: "", q: "", len: "", shape: "rect", d: "", w: "", h: "", fit: "", index: true });

const limitsOf = (b: Body): DuctLimits => ({
  paPerM: N(b.paPerM), vMax: N(b.vMax) || 7.5, aspectMax: N(b.aspectMax) || 4, step: b.step === "25" ? 25 : 50, mat: b.mat,
});
const runOf = (b: Body, x: Run): DuctRun => ({
  tag: x.tag, q: toLs(N(x.q), b.unit), len: N(x.len), shape: x.shape,
  d: N(x.d) || undefined, w: N(x.w) || undefined, h: N(x.h) || undefined, fit: N(x.fit), index: x.index,
});
export const calc = (b: Body) => {
  const o = sizeDucts(b.runs.map((x) => runOf(b, x)), limitsOf(b));
  return { ...o, total: o.indexPa + N(b.extra) };
};

function Editor({ body: b, set, ctx }: { body: Body; set: (b: Body) => void; ctx: any }) {
  const put = (p: Partial<Body>) => !ctx.readOnly && set({ ...b, ...p });
  const c = calc(b);
  return (
    <div className="space-y-3">
      <ResultHero
        label="فقد الضغط على مسار المؤشر"
        value={fmtNum(c.total, 0)}
        unit="Pa"
        sub={`${b.runs.length} مسار · ${c.warnings ? `${c.warnings} تنبيه` : "بدون تنبيهات"} · يشمل الفقود الأخرى ${fmtNum(N(b.extra), 0)} Pa`}
        tone={c.warnings ? "bad" : "accent"}
      />
      <Card title="أساس التصميم">
        <Pick label="وحدة التصرف" items={[["ls", "L/s"], ["cfm", "CFM"], ["m3h", "m³/h"]]} value={b.unit} onChange={(unit) => put({ unit })} />
        <div className="mt-2.5">
          <Grid2>
            <NumField label="معدل الاحتكاك التصميمي" unit="Pa/m" value={b.paPerM} onChange={(v) => put({ paPerM: v })} hint="0.8 – 1.0 شائع" />
            <NumField label="أقصى سرعة" unit="m/s" value={b.vMax} onChange={(v) => put({ vMax: v })} />
            <NumField label="أقصى نسبة أبعاد" unit=": 1" value={b.aspectMax} onChange={(v) => put({ aspectMax: v })} />
            <NumField label="فقود أخرى على المسار" unit="Pa" value={b.extra} onChange={(v) => put({ extra: v })} hint="ناشر، فلتر، دامبر…" />
          </Grid2>
        </div>
        <div className="mt-2.5 space-y-2">
          <Pick label="مادة الدكت" items={(Object.keys(ROUGH) as DuctMat[]).map((k) => [k, ROUGH[k].label] as [DuctMat, string])} value={b.mat} onChange={(mat) => put({ mat })} />
          <Pick label="تقريب المقاسات" items={[["50", "كل 50 مم"], ["25", "كل 25 مم"]]} value={b.step} onChange={(step) => put({ step })} />
        </div>
      </Card>
      <RowCards<Run>
        rows={b.runs}
        onChange={(runs) => put({ runs })}
        blank={blankRun}
        addLabel="مسار جديد"
        max={200}
        summary={(x, i) => {
          const o = c.runs[i];
          return `${x.tag || `D${i + 1}`} · ${o.ready ? `${o.size} · ${fmtNum(o.v, 1)} m/s · ${fmtNum(o.pa, 2)} Pa/m` : "—"}${x.index ? " · مؤشر" : ""}`;
        }}
        render={(x, s, i) => {
          const o = c.runs[i];
          return (
            <>
              <Grid2>
                <TextField label="الرمز" dir="ltr" value={x.tag} onChange={(v) => s({ ...x, tag: v })} placeholder="SA-01" />
                <TextField label="الوصف" value={x.desc} onChange={(v) => s({ ...x, desc: v })} placeholder="الخط الرئيسي — الدور 02" />
                <NumField label="التصرف" unit={UNIT[b.unit]} value={x.q} onChange={(v) => s({ ...x, q: v })} />
                <NumField label="الطول" unit="m" value={x.len} onChange={(v) => s({ ...x, len: v })} />
              </Grid2>
              <Pick items={[["rect", "مستطيل"], ["round", "دائري"]]} value={x.shape} onChange={(shape) => s({ ...x, shape })} />
              <Grid2>
                {x.shape === "rect" ? (
                  <>
                    <NumField label="الارتفاع (فراغ السقف)" unit="mm" value={x.h} onChange={(v) => s({ ...x, h: v })} hint="فارغ = تلقائي" />
                    <NumField label="العرض (اختياري)" unit="mm" value={x.w} onChange={(v) => s({ ...x, w: v })} hint="فارغ = تلقائي" />
                  </>
                ) : (
                  <NumField label="القطر (اختياري)" unit="mm" value={x.d} onChange={(v) => s({ ...x, d: v })} hint="فارغ = تلقائي" />
                )}
                <NumField label="فقد القطع والملحقات" unit="Pa" value={x.fit} onChange={(v) => s({ ...x, fit: v })} />
              </Grid2>
              <Check label="على مسار المؤشر (أطول / أصعب مسار)" on={x.index} onChange={(index) => s({ ...x, index })} />
              {o.ready && (
                <div className="space-y-2" data-duct-result>
                  <p className="text-[12.5px]">
                    <bdi dir="ltr" className="font-grotesk">D req {fmtNum(o.dReq, 1)} → {o.size}{x.shape === "rect" ? ` (De ${fmtNum(o.de, 1)})` : ""} · {fmtNum(o.v, 2)} m/s · {fmtNum(o.pa, 3)} Pa/m · ΔP {fmtNum(o.dpTotal, 1)} Pa</bdi>
                  </p>
                  <Checks items={o.checks} />
                  <Working steps={o.trace} />
                </div>
              )}
            </>
          );
        }}
      />
      <Note>طريقة الاحتكاك المتساوي (Darcy مع Altshul–Tsal، وقطر هوبشر المكافئ). فقد القطع والفلاتر والملفات والضغط الاستاتيكي للمروحة أرقام المهندس — لا تُحسب هنا.</Note>
    </div>
  );
}

function build(doc: ToolDoc<Body>, project: any) {
  const b = doc.body;
  const c = calc(b);
  const lim = limitsOf(b);
  const blocks: DocBlock[] = [
    { k: "kv", cols: 3, rows: [
      { label: "الطريقة", value: "احتكاك متساوٍ" }, { label: "معدل الاحتكاك", value: iso(`${b.paPerM} Pa/m`) }, { label: "المادة", value: `${ROUGH[b.mat].label} · ${iso(`ε = ${ROUGH[b.mat].eps} mm`)}` },
      { label: "الهواء", value: iso(`ρ ${AIR.rho} kg/m³ · μ ${AIR.mu * 1e6} µPa·s`) }, { label: "أقصى سرعة", value: iso(`${lim.vMax} m/s`) }, { label: "نسبة الأبعاد", value: iso(`≤ ${lim.aspectMax} : 1`) },
    ] },
    { k: "kpis", items: [
      { label: "مسار المؤشر — الاستقامات والقطع", value: fmtNum(c.indexPa, 0), unit: "Pa" },
      { label: "فقود أخرى", value: fmtNum(N(b.extra), 0), unit: "Pa" },
      { label: "الإجمالي", value: fmtNum(c.total, 0), unit: "Pa", mark: c.warnings ? "warn" : "ok" },
    ] },
    {
      k: "table", id: "duct", caption: "جدول المسارات", grid: true,
      cols: [
        { key: "tag", label: "الرمز", wMm: 16, align: "center" }, { key: "desc", label: "الوصف", wMm: 40, align: "start" },
        { key: "q", label: "Q", unit: "L/s", wMm: 16, align: "end", num: { dp: 1 } }, { key: "len", label: "L", unit: "m", wMm: 13, align: "end", num: { dp: 1 } },
        { key: "dreq", label: "D req", unit: "mm", wMm: 16, align: "end", num: { dp: 0 } }, { key: "size", label: "المقاس", unit: "mm", wMm: 22, align: "center" },
        { key: "de", label: "De", unit: "mm", wMm: 14, align: "end", num: { dp: 0 } }, { key: "v", label: "V", unit: "m/s", wMm: 14, align: "end", num: { dp: 2 } },
        { key: "pa", label: "Δp/L", unit: "Pa/m", wMm: 16, align: "end", num: { dp: 3 } },
        { key: "dps", label: "استقامات", unit: "Pa", wMm: 17, align: "end", num: { dp: 1 }, xl: { f: "{pa}*{len}" } },
        { key: "fit", label: "قطع", unit: "Pa", wMm: 14, align: "end", num: { dp: 1 } },
        { key: "tot", label: "الإجمالي", unit: "Pa", wMm: 17, align: "end", num: { dp: 1 }, xl: { f: "{dps}+{fit}" } },
        { key: "ix", label: "مؤشر", wMm: 13, align: "center" }, { key: "r", label: "الفحص", wMm: 18, align: "center", mark: true },
      ],
      rows: b.runs.map((x, i) => {
        const o = c.runs[i];
        return {
          cells: {
            tag: iso(x.tag || `D${i + 1}`), desc: x.desc, q: o.ready ? toLs(N(x.q), b.unit) : null, len: N(x.len),
            dreq: o.ready ? o.dReq : null, size: iso(o.size), de: o.ready ? o.de : null, v: o.ready ? o.v : null, pa: o.ready ? o.pa : null,
            dps: o.ready ? o.dpStraight : null, fit: N(x.fit), tot: o.ready ? o.dpTotal : null, ix: x.index ? "✓" : "",
          },
          mark: o.ready ? (o.checks.some((k) => k.ok === false) ? "fail" : "ok") : "na",
        };
      }),
    },
    { k: "notes", title: "المعادلات", text: "Δp/L = f/D · ρV²/2 (Darcy–Weisbach) · f′ = 0.11(ε/D + 68/Re)^0.25؛ f = f′ إذا f′ ≥ 0.018 وإلا 0.85f′ + 0.0028 (Altshul–Tsal) · De = 1.30(ab)^0.625/(a + b)^0.25 (Huebscher) · المقاسات تُقرّب لأعلى. فقد القطع والملحقات والفلاتر والملفات أرقام المهندس." },
  ];
  return buildSpec({
    doc, meta: module, project, sections: [{ orientation: "landscape", blocks }], signRoles: ["prepared", "checked", "approved"],
    basis: { rows: [
      { key: "rho", label: "كثافة الهواء القياسي", value: String(AIR.rho), unit: "kg/m³", source: "ASHRAE Fundamentals — Duct Design", conf: "H", flagged: false },
      { key: "mu", label: "اللزوجة الديناميكية", value: String(AIR.mu), unit: "Pa·s", source: "ASHRAE Fundamentals — Duct Design", conf: "H", flagged: false },
      { key: "eps", label: "خشونة السطح ε", value: String(ROUGH[b.mat].eps), unit: "mm", source: "ASHRAE — فئات الخشونة", conf: ROUGH[b.mat].conf, flagged: ROUGH[b.mat].conf !== "H" },
      { key: "vmax", label: "أقصى سرعة", value: String(lim.vMax), unit: "m/s", source: "مدخل المهندس (اعتبارات الضوضاء)", conf: "M", flagged: true },
      { key: "ar", label: "أقصى نسبة أبعاد", value: String(lim.aspectMax), source: "SMACNA — توصية", conf: "M", flagged: true },
    ], formulas: [] },
  });
}

export const module: ToolModule<Body> = {
  kind: "ductSizer", v: 1, docType: "DCT", docTypeName: "جدول مقاسات الدكت · Duct sizing schedule", discipline: "تكييف", engine: DUCT_ENGINE,
  profile: { id: "ashrae-duct@1", edition: "ASHRAE Fundamentals — Duct Design", values: { rho: AIR.rho, mu: AIR.mu }, overridden: [], unverified: ["vMax", "aspectMax"] },
  blank: () => ({ unit: "ls", paPerM: "0.8", vMax: "7.5", aspectMax: "4", step: "50", mat: "galv", extra: "", runs: [blankRun()] }),
  defaultTitle: () => "جدول مقاسات الدكت",
  Editor,
  build,
  summary: (doc) => {
    const c = calc(doc.body);
    return [`مقاسات الدكت · ⁦${doc.body.runs.length}⁩ مسار`, `مسار المؤشر ⁦${fmtNum(c.total, 0)}⁩ Pa`, c.warnings ? `⁦${c.warnings}⁩ تنبيه` : "بدون تنبيهات"].join("\n");
  },
};
