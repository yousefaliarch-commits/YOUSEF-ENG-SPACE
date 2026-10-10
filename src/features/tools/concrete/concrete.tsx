// =====================================================================
//  حصر وصب الخرسانة — concrete take-off & pour planner (screen + PDF). Engine: src/domain/tools/concrete-calc.ts
//  · Two scopes: «خطة صب» (one pour: order, trucks, arrival schedule, cold joints, cubes, calendar) and «حصر» (the whole
//    building: net / order m³, formwork, site-mix materials).
//  · Fields keep what the member typed (any digits); the engine reads numbers through numInputParse.
// =====================================================================
import { numInputParse } from "../../../lib/num-input";
import {
  CONC_ENGINE, CONC_KINDS, CONC_PROFILE, CUBES_DEFAULT, concCalendar, concColdJoint, concCubes, concMaterials, concMixYield, concPour,
  concTakeoff, concVolume, kindName, mixFor, type ConcElement, type ConcKind,
} from "../../../domain/tools/concrete-calc";
import { r, type Check as EngineCheck } from "../../../domain/tools/common";
import type { DocBlock, DocRow, TraceStep } from "../../../doc/model";
import { fmtNum, iso } from "../../../doc/text";
import type { ToolDoc } from "../../../data/tool-docs";
import { Card, Check, Checks, Grid2, Note, NumField, Pick, ResultHero, RowCards, Rows, TextField, Working } from "../../../ui/kit";
import { Seg } from "../../../ui/chrome";
import type { ToolModule } from "../module";
import { buildSpec } from "../spec";

type Row = { kind: ConcKind; label: string; n: string; dims: Record<string, string>; waste: string; soil?: boolean };
type Body = {
  scope: "pour" | "takeoff";
  zone: string; level: string; start: string; grade: string; supplier: string; slump: string; cement: "opc" | "blended"; airC: string;
  rows: Row[];
  order: Record<"load" | "pump" | "plant" | "crew" | "travel" | "priming" | "loadMin" | "wash" | "setup" | "cleanup", string>;
  cj: { layer: string; area: string; len: string };
  cubeRule: "perVolume" | "first50then100"; spares: boolean;
  spans: { slab: string; beam: string };
  siteMixed: boolean;
};

const N = (s: string | undefined, rule = {}) => numInputParse(s || "", rule);
const NN = (s: string | undefined) => N(s) ?? 0;

const blankRow = (kind: ConcKind = "slab"): Row => ({
  kind, label: "", n: "1",
  dims: kind === "slab" ? { L: "", B: "", t: "0.15", open: "" } : kind === "column" ? { a: "", b: "", hFF: "3.20", ts: "0.15" } : kind === "beam" ? { b: "0.25", h: "", ts: "0.15", L: "" } : {},
  waste: "",
});

const blank = (): Body => ({
  scope: "pour", zone: "", level: "", start: "07:00", grade: "C30", supplier: "", slump: "", cement: "opc", airC: "25",
  rows: [blankRow("slab")],
  order: { load: "9", pump: "30", plant: "60", crew: "40", travel: "25", priming: "0.5", loadMin: "10", wash: "12", setup: "45", cleanup: "30" },
  cj: { layer: "0.5", area: "", len: "" },
  cubeRule: "perVolume", spares: true, spans: { slab: "", beam: "" }, siteMixed: false,
});

const toEl = (x: Row, i: number): ConcElement => ({
  id: String(i + 1), kind: x.kind, label: x.label || kindName(x.kind), n: N(x.n, { integer: true }) ?? 0,
  dims: Object.fromEntries(Object.entries(x.dims).map(([k, v]) => [k, N(v)])), wastePct: N(x.waste), againstSoil: x.soil,
});

function compute(b: Body) {
  const els = b.rows.map(toEl);
  const take = concTakeoff(els);
  const airC = N(b.airC, { allowNegative: true }) ?? 25;
  const o = b.order;
  const pour = concPour({
    orderM3: take.orderM3 * (b.siteMixed ? 1.04 : 1), primingM3: b.siteMixed ? 0 : NN(o.priming), loadM3: NN(o.load), pumpM3h: NN(o.pump), plantM3h: NN(o.plant),
    crewM3h: NN(o.crew), travelMin: NN(o.travel), loadMin: NN(o.loadMin), washMin: NN(o.wash), setupMin: NN(o.setup), cleanupMin: NN(o.cleanup), start: b.start,
  });
  const tCover = CONC_PROFILE.tCover(airC);
  const cj = concColdJoint(pour.qEff, tCover, NN(b.cj.layer), NN(b.cj.area), NN(b.cj.len));
  const cubes = concCubes(pour.vOrderM3, { ...CUBES_DEFAULT, rule: b.cubeRule, spares: b.spares });
  // materials per mix (lean for blinding, RC otherwise)
  const byMix = new Map<string, number>();
  els.forEach((e, i) => {
    const m = mixFor(e.kind);
    byMix.set(m.id, (byMix.get(m.id) || 0) + take.rows[i].orderM3 * (b.siteMixed ? 1.04 : 1));
  });
  const mats = [...byMix].map(([id, v]) => {
    const mix = (CONC_PROFILE.mixes as any)[id];
    return { mix, orderM3: v, ...concMaterials(v, mix), yld: concMixYield(mix) };
  });
  const checks: EngineCheck[] = [...take.checks];
  if (b.scope === "pour" && NN(b.cj.area) > 0)
    checks.push({ id: "conc.coldJoint", label: "الوصلة الباردة: مساحة الشريحة", value: `${r(NN(b.cj.area), 1)} m²`, limit: `≤ ${r(cj.aMaxM2, 0)} m²${cj.maxWidthM ? ` (عرض ≤ ${r(cj.maxWidthM, 1)} m)` : ""}`, ok: cj.ok, level: cj.ok ? undefined : "warn", unverified: true });
  if (b.scope === "pour" && airC > 32)
    checks.push({ id: "conc.hot", label: "صب في جو حار", value: `${r(airC, 0)} °C`, limit: "≤ 32 °C — احتياطات الصب صيفًا", ok: false, level: "warn" });
  mats.forEach((m) => {
    if (Math.abs(m.yld - 1) > 0.05) checks.push({ id: "conc.yield", label: `ناتج خلطة ${m.mix.name}`, value: r(m.yld, 3), limit: "1 ± 0.05", ok: false, level: "warn", unverified: true });
  });
  const cal = concCalendar(new Date().toISOString().slice(0, 10), { slabSpanM: N(b.spans.slab), beamSpanM: N(b.spans.beam), airC, cement: b.cement });
  const trace: TraceStep[] = [...els.flatMap((e) => concVolume(e).trace.map((t) => ({ ...t, label: `${e.label} — ${t.label}` }))), ...(b.scope === "pour" ? pour.trace : [])];
  return { els, take, pour, cj, tCover, cubes, mats, checks, cal, airC, trace };
}

const dimsText = (x: Row) => {
  const k = CONC_KINDS.find((c) => c.kind === x.kind)!;
  return k.fields.filter(([f]) => x.dims[f]).map(([f]) => x.dims[f]).join(" × ");
};

function Editor({ body: b, set, ctx }: { body: Body; set: (b: Body) => void; ctx: any }) {
  const c = compute(b);
  const ro = ctx.readOnly;
  const put = (p: Partial<Body>) => !ro && set({ ...b, ...p });
  const o = (k: keyof Body["order"]) => (v: string) => put({ order: { ...b.order, [k]: v } });
  const pour = b.scope === "pour";
  return (
    <div className="space-y-3">
      <Seg items={[["pour", "خطة صب"], ["takeoff", "حصر الدور / المبنى"]]} value={b.scope} onChange={(v: any) => put({ scope: v })} />
      {pour && (
        <Card title="البيانات">
          <div className="space-y-2.5">
            <Grid2>
              <TextField label="العنصر / المنطقة" value={b.zone} onChange={(v) => put({ zone: v })} placeholder="سقف الدور الثالث" />
              <TextField label="المنسوب" value={b.level} onChange={(v) => put({ level: v })} dir="ltr" placeholder="+9.60" />
              <label className="block"><span className="block text-[12px] text-ink-2 mb-1">بداية الصب</span>
                <input type="time" dir="ltr" value={b.start} onChange={(e) => put({ start: e.target.value })} className="w-full h-12 px-3 rounded-xl bg-canvas border border-line-2 font-grotesk text-[15px]" /></label>
              <NumField label="حرارة الجو" unit="°C" value={b.airC} onChange={(v) => put({ airC: v })} rule={{ allowNegative: true }} />
            </Grid2>
            <Pick label="الرتبة" items={[["C20", "C20"], ["C25", "C25"], ["C30", "C30"], ["C35", "C35"], ["C40", "C40"], ["C50", "C50"]]} value={b.grade as any} onChange={(v) => put({ grade: v })} />
            <Grid2>
              <TextField label="المورد" value={b.supplier} onChange={(v) => put({ supplier: v })} />
              <NumField label="الهبوط المستهدف" unit="mm" value={b.slump} onChange={(v) => put({ slump: v })} hint="⚑ حسب المواصفات" />
            </Grid2>
            <Pick label="نوع الأسمنت" items={[["opc", "بورتلاندي عادي"], ["blended", "مخلوط / مقاوم"]]} value={b.cement} onChange={(v) => put({ cement: v })} />
          </div>
        </Card>
      )}

      <Card title="العناصر">
        <RowCards<Row>
          rows={b.rows}
          onChange={(rows) => put({ rows })}
          blank={() => blankRow(b.rows.length ? b.rows[b.rows.length - 1].kind : "slab")}
          addLabel="أضف عنصرًا"
          summary={(x, i) => `${x.label || kindName(x.kind)} ×${x.n || 0} — ${fmtNum(c.take.rows[i]?.netM3 || 0, 2)} م³`}
          render={(x, setX) => {
            const k = CONC_KINDS.find((q) => q.kind === x.kind)!;
            return (
              <>
                <Pick items={CONC_KINDS.map((q) => [q.kind, q.name] as [ConcKind, string])} value={x.kind} onChange={(kind) => setX({ ...blankRow(kind), label: x.label, n: x.n })} />
                {k.hint && <Note>{k.hint}</Note>}
                <Grid2>
                  <TextField label="الوصف / المحور" value={x.label} onChange={(v) => setX({ ...x, label: v })} />
                  <NumField label="العدد" value={x.n} onChange={(v) => setX({ ...x, n: v })} rule={{ integer: true, min: 0 }} />
                  {k.fields.map(([f, l]) => (
                    <NumField key={f} label={l} unit={/\(م²\)/.test(l) ? "" : f === "nSteps" ? "" : "m"} value={x.dims[f] || ""} onChange={(v) => setX({ ...x, dims: { ...x.dims, [f]: v } })} rule={{ min: 0, integer: f === "nSteps" }} />
                  ))}
                  <NumField label="الهالك" unit="%" value={x.waste} onChange={(v) => setX({ ...x, waste: v })} hint={`افتراضي ${CONC_PROFILE.waste[x.kind]} % ⚑`} />
                </Grid2>
                {x.kind === "tieBeam" && <Check label="تُصب ملاصقة للتربة (بدون شدة جانبية)" on={!!x.soil} onChange={(soil) => setX({ ...x, soil })} />}
              </>
            );
          }}
        />
      </Card>

      {pour ? (
        <ResultHero
          label="اطلب من المحطة"
          value={fmtNum(c.pour.vOrderM3, 1)}
          unit={`م³ ${b.grade}`}
          sub={`${c.pour.trucks} خلاطة · خلاطة كل ${fmtNum(c.pour.intervalMin, 0)} د · ${c.pour.fleet} على الطريق · ${c.pour.startAt} ← ${c.pour.endAt}`}
        />
      ) : (
        <ResultHero label="الحجم المطلوب بالهالك" value={fmtNum(c.take.orderM3, 2)} unit="م³" sub={`الصافي ${fmtNum(c.take.netM3, 2)} م³ · الشدة ${fmtNum(c.take.formworkM2, 1)} م²`} />
      )}
      <Rows rows={[
        ["الحجم الصافي", fmtNum(c.take.netM3, 2), "م³"],
        ["الشدة الخشبية", fmtNum(c.take.formworkM2, 1), "م²"],
        ...(c.take.blocks ? [["بلوك الهوردي", String(c.take.blocks), "بلوكة"] as [string, string, string]] : []),
        ...(pour ? [["معدل الصب (يحكمه " + (c.pour.governs === "pump" ? "المضخة" : c.pour.governs === "plant" ? "المحطة" : "الطاقم") + ")", fmtNum(c.pour.qEff, 0), "م³/س"] as [string, string, string], ["مدة الصب", `${Math.floor(c.pour.durationMin / 60)} س ${Math.round(c.pour.durationMin % 60)} د`]] as [string, string, string?][] : []),
      ]} />

      {pour && (
        <Card title="الطلب والخلاطات">
          <Grid2>
            <NumField label="حمولة الخلاطة" unit="م³" value={b.order.load} onChange={o("load")} />
            <NumField label="إنتاجية المضخة" unit="م³/س" value={b.order.pump} onChange={o("pump")} />
            <NumField label="مخصص المحطة" unit="م³/س" value={b.order.plant} onChange={o("plant")} />
            <NumField label="قدرة الطاقم" unit="م³/س" value={b.order.crew} onChange={o("crew")} />
            <NumField label="المشوار (ذهاب)" unit="د" value={b.order.travel} onChange={o("travel")} />
            <NumField label="فاقد تحضير المضخة" unit="م³" value={b.order.priming} onChange={o("priming")} />
            <NumField label="التجهيز قبل الصب" unit="د" value={b.order.setup} onChange={o("setup")} />
            <NumField label="التنظيف بعد الصب" unit="د" value={b.order.cleanup} onChange={o("cleanup")} />
          </Grid2>
          <div className="mt-3">
            <p className="text-[12px] text-ink-2 mb-1.5">مواعيد وصول الخلاطات</p>
            <ul className="grid grid-cols-3 gap-1.5 text-[12px]">
              {c.pour.schedule.slice(0, 12).map((s) => (
                <li key={s.n} className="px-2 py-1.5 rounded-lg bg-canvas border border-line"><bdi dir="ltr" className="font-grotesk">#{s.n} {s.at}</bdi></li>
              ))}
            </ul>
            {c.pour.schedule.length > 12 && <Note>… والجدول كاملًا في التقرير ({c.pour.schedule.length} خلاطة)</Note>}
          </div>
        </Card>
      )}

      {pour && (
        <Card title="الوصلات الباردة والمكعبات">
          <Grid2>
            <NumField label="سمك الطبقة" unit="m" value={b.cj.layer} onChange={(v) => put({ cj: { ...b.cj, layer: v } })} />
            <NumField label="مساحة الشريحة" unit="م²" value={b.cj.area} onChange={(v) => put({ cj: { ...b.cj, area: v } })} />
            <NumField label="طول الشريحة" unit="m" value={b.cj.len} onChange={(v) => put({ cj: { ...b.cj, len: v } })} />
          </Grid2>
          <Note>أقصى مساحة قبل أن تبرد الطبقة: {fmtNum(c.cj.aMaxM2, 0)} م² (زمن التغطية {c.tCover} د عند {fmtNum(c.airC, 0)} °C ⚑)</Note>
          <div className="mt-3 space-y-2">
            <Pick items={[["perVolume", "مجموعة لكل 50 م³"], ["first50then100", "أول 50 ثم كل 100 م³"]]} value={b.cubeRule} onChange={(v) => put({ cubeRule: v })} />
            <Check label="3 مكعبات احتياطية لكل مجموعة" on={b.spares} onChange={(v) => put({ spares: v })} />
            <Note>{c.cubes.sets} مجموعات · {c.cubes.cubes} مكعبًا (7 و 28 يومًا) ⚑</Note>
          </div>
        </Card>
      )}

      <Card title={pour ? "الفك والمعالجة" : "الخامات (خلط في الموقع)"}>
        {pour ? (
          <>
            <Grid2>
              <NumField label="أكبر بحر بلاطة" unit="m" value={b.spans.slab} onChange={(v) => put({ spans: { ...b.spans, slab: v } })} />
              <NumField label="أكبر بحر كمرة" unit="m" value={b.spans.beam} onChange={(v) => put({ spans: { ...b.spans, beam: v } })} />
            </Grid2>
            <Note>تُحسب التواريخ من تاريخ المستند في التقرير ⚑ حسب ملف الكود.</Note>
          </>
        ) : (
          <>
            <Check label="خلط في الموقع (+4 % ⚑)" on={b.siteMixed} onChange={(v) => put({ siteMixed: v })} />
            <div className="mt-2 space-y-2">
              {c.mats.map((m) => (
                <div key={m.mix.id}>
                  <p className="text-[12px] text-ink-2 mb-1">{m.mix.name} — {fmtNum(m.orderM3, 2)} م³</p>
                  <Rows rows={[["أسمنت", String(m.bags), "شكارة 50 كجم"], ["رمل", fmtNum(m.sandM3, 2), "م³"], ["سن / زلط", fmtNum(m.gravelM3, 2), "م³"], ["ماء", fmtNum(m.waterM3, 1), "م³"]]} />
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {c.checks.length > 0 && <Card title="المراجعات"><Checks items={c.checks} /></Card>}
      <Working steps={c.trace} />
      <Note>تقدير للحصر وتخطيط الصب؛ القيم المعلَّمة ⚑ افتراضات تُطابق بالمواصفات المعتمدة والكود المصري 203 والخلطة التصميمية.</Note>
    </div>
  );
}

function build(doc: ToolDoc<Body>, project: any) {
  const b = doc.body;
  const c = compute(b);
  const cal = concCalendar(doc.dateIso, { slabSpanM: N(b.spans.slab), beamSpanM: N(b.spans.beam), airC: c.airC, cement: b.cement });
  const pour = b.scope === "pour";
  const rows: DocRow[] = b.rows.map((x, i) => ({
    cells: {
      n: i + 1, el: x.label ? `${kindName(x.kind)} — ${x.label}` : kindName(x.kind), cnt: N(x.n) ?? 0, dims: iso(dimsText(x)),
      net: c.take.rows[i].netM3, w: c.take.rows[i].wastePct, ord: c.take.rows[i].orderM3, fw: c.take.rows[i].formworkM2,
    },
  }));
  const blocks: DocBlock[] = [];
  if (pour) {
    blocks.push({ k: "kv", cols: 2, rows: [
      { label: "العنصر / المنطقة", value: b.zone || "—" }, { label: "المنسوب", value: iso(b.level || "—") },
      { label: "التاريخ", value: iso(doc.dateIso) }, { label: "البداية ← النهاية", value: iso(`${c.pour.startAt} → ${c.pour.endAt}`) },
      { label: "الرتبة", value: iso(b.grade) }, { label: "المورد", value: b.supplier || "—" },
      { label: "الهبوط", value: b.slump ? iso(`${b.slump} mm`) : "—" }, { label: "الأسمنت", value: b.cement === "opc" ? "بورتلاندي عادي" : "مخلوط / مقاوم" },
    ] });
    blocks.push({ k: "kpis", items: [
      { label: "كمية الطلب", value: fmtNum(c.pour.vOrderM3, 1), unit: "m³" },
      { label: "عدد الخلاطات", value: String(c.pour.trucks) },
      { label: "خلاطة كل", value: fmtNum(c.pour.intervalMin, 0), unit: "min" },
      { label: "على الطريق", value: String(c.pour.fleet) },
      { label: "المدة", value: fmtNum(c.pour.durationMin / 60, 1), unit: "h" },
    ] });
  } else {
    blocks.push({ k: "kpis", items: [
      { label: "الصافي", value: fmtNum(c.take.netM3, 2), unit: "m³" },
      { label: "المطلوب بالهالك", value: fmtNum(c.take.orderM3, 2), unit: "m³" },
      { label: "الشدة", value: fmtNum(c.take.formworkM2, 1), unit: "m²" },
    ] });
  }
  blocks.push({ k: "heading", num: "1", text: "حصر العناصر" });
  blocks.push({
    k: "table", id: "els", caption: "", grid: true, carry: { sumCols: ["net", "ord", "fw"] },
    cols: [
      { key: "n", label: "#", wMm: 8, align: "center", num: { dp: 0 } },
      { key: "el", label: "العنصر", wMm: 44, align: "start" },
      { key: "cnt", label: "العدد", wMm: 12, align: "end", num: { dp: 0 } },
      { key: "dims", label: "الأبعاد", unit: "م", wMm: 36, align: "start" },
      { key: "net", label: "الصافي", unit: "م³", wMm: 19, align: "end", num: { dp: 3 } },
      { key: "w", label: "الهالك", unit: "%", wMm: 13, align: "end", num: { dp: 0 } },
      { key: "ord", label: "المطلوب", unit: "م³", wMm: 19, align: "end", num: { dp: 3 } },
      { key: "fw", label: "الشدة", unit: "م²", wMm: 23, align: "end", num: { dp: 2 } },
    ],
    rows,
    totals: { cells: { el: "الإجمالي", net: c.take.netM3, ord: c.take.orderM3, fw: c.take.formworkM2 } },
  });
  if (pour) {
    blocks.push({ k: "heading", num: "2", text: "اللوجستيات ومواعيد الخلاطات" });
    blocks.push({ k: "kv", cols: 2, rows: [
      { label: "يحكم المعدل", value: c.pour.governs === "pump" ? "المضخة" : c.pour.governs === "plant" ? "المحطة" : "الطاقم" },
      { label: "المعدل الفعلي", value: iso(`${fmtNum(c.pour.qEff, 0)} m³/h`) },
      { label: "زمن الدورة", value: iso(`${fmtNum(c.pour.cycleMin, 0)} min`) },
      { label: "حمولة الخلاطة", value: iso(`${b.order.load} m³`) },
    ] });
    blocks.push({
      k: "table", id: "arrivals", caption: "جدول وصول الخلاطات", zebra: false,
      cols: [
        { key: "n", label: "الخلاطة", wMm: 30, align: "center", num: { dp: 0 } },
        { key: "at", label: "موعد الوصول", wMm: 50, align: "center" },
        { key: "cum", label: "التراكمي", unit: "م³", wMm: 50, align: "end", num: { dp: 1 } },
        { key: "ok", label: "ملاحظات", wMm: 44, align: "start" },
      ],
      rows: c.pour.schedule.map((s) => ({ cells: { n: s.n, at: iso(s.at), cum: s.cumM3, ok: "" } })),
    });
    blocks.push({ k: "heading", num: "3", text: "المكعبات والفك والمعالجة" });
    blocks.push({ k: "kv", cols: 3, rows: [
      { label: "مجموعات المكعبات", value: String(c.cubes.sets) },
      { label: "عدد المكعبات", value: String(c.cubes.cubes) },
      { label: "القاعدة", value: b.cubeRule === "perVolume" ? "مجموعة لكل 50 م³ ⚑" : "أول 50 ثم كل 100 م³ ⚑" },
    ] });
    blocks.push({
      k: "table", id: "cal", caption: "", cols: [
        { key: "item", label: "البند", wMm: 80, align: "start" }, { key: "date", label: "التاريخ", wMm: 44, align: "center" }, { key: "basis", label: "الأساس", wMm: 50, align: "start" },
      ],
      rows: cal.map((x) => ({ cells: { item: x.item, date: iso(x.dateIso), basis: iso(x.basis) } })),
    });
  } else {
    blocks.push({ k: "heading", num: "2", text: "الخامات حسب الخلطة" });
    blocks.push({
      k: "table", id: "mats", caption: b.siteMixed ? "خلط في الموقع (+4 % ⚑)" : "", cols: [
        { key: "mix", label: "الخلطة", wMm: 44, align: "start" }, { key: "v", label: "الحجم", unit: "م³", wMm: 24, align: "end", num: { dp: 2 } },
        { key: "bags", label: "أسمنت", unit: "شكارة", wMm: 26, align: "end", num: { dp: 0 } }, { key: "sand", label: "رمل", unit: "م³", wMm: 26, align: "end", num: { dp: 2 } },
        { key: "grav", label: "سن", unit: "م³", wMm: 26, align: "end", num: { dp: 2 } }, { key: "water", label: "ماء", unit: "م³", wMm: 28, align: "end", num: { dp: 2 } },
      ],
      rows: c.mats.map((m) => ({ cells: { mix: m.mix.name, v: m.orderM3, bags: m.bags, sand: m.sandM3, grav: m.gravelM3, water: m.waterM3 } })),
    });
  }
  if (c.checks.length)
    blocks.push({ k: "checks", rows: c.checks.map((x) => ({ label: x.label, value: x.value, limit: x.limit, clause: x.clause || "ECP 203", ok: x.ok, unverified: x.unverified })) });
  const basis = {
    rows: [
      { key: "waste", label: "الهالك حسب العنصر", value: "2–5", unit: "%", source: "ممارسة الموقع", conf: "M" as const, flagged: true },
      { key: "mix.rc", label: "خلطة المسلحة لكل م³", value: "350 kg · 0.4 · 0.8", source: "ممارسة مصرية", conf: "M" as const, flagged: true },
      ...(pour ? [
        { key: "tCover", label: "زمن تغطية الطبقة", value: String(c.tCover), unit: "min", source: "ACI 304 / ممارسة", conf: "M" as const, flagged: true },
        { key: "cubes", label: "قاعدة المكعبات", value: b.cubeRule === "perVolume" ? "1 / 50 m³" : "50 + 100", source: "مواصفات المشروع", conf: "L" as const, flagged: true },
        { key: "strike", label: "أزمنة الفك", value: "48h–21d", source: "ECP 203 / ممارسة", conf: "L" as const, flagged: true },
      ] : []),
    ],
    formulas: c.trace.slice(0, 30),
  };
  return buildSpec({
    doc, meta: module, project,
    sections: [{ orientation: "portrait", blocks }],
    basis,
    signRoles: pour ? ["siteEngineer", "consultantRep", "approved"] : ["prepared", "checked", "approved"],
  });
}

function summary(doc: ToolDoc<Body>) {
  const b = doc.body;
  const c = compute(b);
  if (b.scope === "pour")
    return [
      `${b.zone ? `صب ${b.zone}` : doc.title}${b.level ? ` · منسوب ⁦${b.level}⁩` : ""}`,
      `صافي ⁦${fmtNum(c.take.netM3, 1)} m³⁩ · اطلب ⁦${fmtNum(c.pour.vOrderM3, 1)} m³ ${b.grade}⁩`,
      `⁦${c.pour.trucks}⁩ خلاطة كل ⁦${fmtNum(c.pour.intervalMin, 0)}⁩ د · البداية ⁦${c.pour.startAt}⁩`,
      `⁦${c.cubes.sets}⁩ مجموعات مكعبات`,
      "تقدير — راجع المستند الكامل",
    ].join("\n");
  return [doc.title, `صافي ⁦${fmtNum(c.take.netM3, 2)} m³⁩ · بالهالك ⁦${fmtNum(c.take.orderM3, 2)} m³⁩`, `الشدة ⁦${fmtNum(c.take.formworkM2, 1)} m²⁩`, "تقدير — راجع المستند الكامل"].join("\n");
}

export const module: ToolModule<Body> = {
  kind: "concrete", v: 1, docType: "PP", docTypeName: "خطة صب · Pour plan", discipline: "إنشائي", engine: CONC_ENGINE,
  profile: { id: CONC_PROFILE.id, edition: CONC_PROFILE.edition, values: { airPct: CONC_PROFILE.airPct, bulkKgM3: CONC_PROFILE.bulkKgM3 }, overridden: [], unverified: ["waste", "tCover", "cubes", "strike"] },
  blank,
  defaultTitle: () => "خطة صب",
  Editor,
  build: (doc, project) => {
    const spec = build(doc, project);
    if (doc.body.scope === "takeoff") spec.meta = { ...spec.meta, docType: "CT", docTypeName: "كشف حصر الخرسانة والشدات · Concrete take-off" };
    return spec;
  },
  summary,
};
