// =====================================================================
//  الكابل وهبوط الجهد — cable & voltage-drop check, one row per circuit (screen + landscape cable schedule PDF).
//  Engine: src/domain/tools/mep-calc.ts (IEC 60364-5-52, 2009).
//  · Two bases, never mixed: «من الجدول (تحقق)» — the bundled transcription, unverified ⚑, so a pass reads «ضمن الحد ⚑» — or
//    «من كتالوج المصنّع»: the member types It from the maker's datasheet, printed as the source.
// =====================================================================
import { numInputParse } from "../../../lib/num-input";
import {
  CAB_DATASET, CAB_ENGINE, CAB_K, cabAdiabatic, cabAmpacity, cabCoord, cabDerate, cabIb, cabLmax, cabSelect, cabVd, type CabArr, type CabMethod,
} from "../../../domain/tools/mep-calc";
import type { DocBlock } from "../../../doc/model";
import { fmtNum, iso } from "../../../doc/text";
import type { ToolDoc } from "../../../data/tool-docs";
import { Card, Grid2, Note, NumField, Pick, ResultHero, RowCards, TextField } from "../../../ui/kit";
import type { ToolModule } from "../module";
import { buildSpec } from "../spec";

type Circuit = {
  tag: string; from: string; to: string; phases: "1" | "3"; load: "kw" | "motor" | "ib"; kw: string; eta: string; ib: string; cosphi: string;
  insul: "pvc" | "xlpe"; method: CabMethod; groupN: string; arr: CabArr; device: "breaker" | "gG"; inA: string;
  len: string; isc: string; t: string; basis: "table" | "maker"; makerIt: string; makerS: string; makerRef: string;
};
type Body = { u0: string; u: string; limitPct: string; airC: string; groundC: string; soil: string; circuits: Circuit[] };
const N = (s: string) => numInputParse(s || "") ?? 0;

const blankC = (): Circuit => ({
  tag: "", from: "", to: "", phases: "3", load: "kw", kw: "", eta: "0.95", ib: "", cosphi: "0.85", insul: "xlpe", method: "C", groupN: "1", arr: "bunched",
  device: "breaker", inA: "", len: "", isc: "", t: "0.1", basis: "table", makerIt: "", makerS: "", makerRef: "",
});

function calc(b: Body, c: Circuit) {
  const ph = c.phases === "3" ? 3 : 1;
  const u = ph === 3 ? N(b.u) : N(b.u0);
  const ib = c.load === "ib" ? N(c.ib) : cabIb({ phases: ph, kw: N(c.kw), cosphi: N(c.cosphi) || 0.85, uV: u, eta: c.load === "motor" ? N(c.eta) || 1 : 1 });
  const d = cabDerate({ insul: c.insul, method: c.method, airC: N(b.airC) || 40, groundC: N(b.groundC) || 30, groupN: N(c.groupN) || 1, groupArr: c.arr, soilRho: N(b.soil) || 2.5 });
  const inA = N(c.inA) || Math.ceil(ib);
  let s = 0, it = 0, iz = 0, needIt = inA / d.k, parallel = false;
  if (c.basis === "maker") {
    s = N(c.makerS);
    it = N(c.makerIt);
    iz = it * d.k;
  } else {
    const sel = cabSelect(c.device === "gG" ? inA / (1.45 / 1.6) : inA, d.k, cabAmpacity(c.insul, c.method));
    if ("parallel" in sel) parallel = true;
    else ({ s, it, iz } = sel);
    needIt = sel.itRequired;
  }
  const coord = cabCoord(c.device, inA, iz);
  const vd = s ? cabVd({ phases: ph, sMm2: s, lenM: N(c.len), ibA: ib, cosphi: N(c.cosphi) || 0.85, mat: "cu", u0V: N(b.u0), uV: N(b.u) }) : null;
  const lmax = s ? cabLmax({ phases: ph, sMm2: s, ibA: ib, cosphi: N(c.cosphi) || 0.85, mat: "cu", u0V: N(b.u0), limitPct: N(b.limitPct) || 5 }) : null;
  const ad = N(c.isc) ? cabAdiabatic(N(c.isc) * 1000, N(c.t), CAB_K[`cu-${c.insul}`]) : null;
  const sMin = ad && "sMinMm2" in ad ? ad.sMinMm2 : null;
  const ok = !parallel && !!s && ib <= inA + 1e-9 && coord.ok && (!vd || vd.pct <= (N(b.limitPct) || 5) + 1e-9) && (sMin == null || s >= sMin);
  return { ib, d, inA, s, it, iz, needIt, parallel, coord, vd, lmax, ad, sMin, ok };
}

const word = (ok: boolean, maker: boolean) => (ok ? (maker ? "مطابق" : "ضمن الحد ⚑") : "غير مطابق");

function Editor({ body: b, set, ctx }: { body: Body; set: (b: Body) => void; ctx: any }) {
  const ro = ctx.readOnly;
  const put = (p: Partial<Body>) => !ro && set({ ...b, ...p });
  const res = b.circuits.map((c) => calc(b, c));
  const fails = res.filter((r) => !r.ok).length;
  return (
    <div className="space-y-3">
      <ResultHero label="الدوائر" value={String(b.circuits.length)} unit="دائرة" sub={`${b.circuits.length - fails} ضمن الحد · ${fails} تحتاج مراجعة`} tone={fails ? "bad" : "accent"} />
      <Card title="المصدر والحدود">
        <Grid2>
          <NumField label="جهد الطور U₀" unit="V" value={b.u0} onChange={(v) => put({ u0: v })} />
          <NumField label="جهد الخط U" unit="V" value={b.u} onChange={(v) => put({ u: v })} />
          <NumField label="هبوط الجهد المسموح" unit="%" value={b.limitPct} onChange={(v) => put({ limitPct: v })} hint="3 % إنارة / 5 % أخرى" />
          <NumField label="حرارة الهواء" unit="°C" value={b.airC} onChange={(v) => put({ airC: v })} />
          <NumField label="حرارة التربة" unit="°C" value={b.groundC} onChange={(v) => put({ groundC: v })} />
          <NumField label="مقاومة التربة الحرارية" unit="K·m/W" value={b.soil} onChange={(v) => put({ soil: v })} />
        </Grid2>
      </Card>
      <RowCards<Circuit>
        rows={b.circuits} onChange={(circuits) => put({ circuits })} blank={blankC} addLabel="دائرة جديدة" max={300}
        summary={(c, i) => `${c.tag || `C${i + 1}`} · ${res[i].s ? `${res[i].s} mm²` : "—"} · Δu ${res[i].vd ? fmtNum(res[i].vd!.pct, 2) : "—"} % · ${word(res[i].ok, c.basis === "maker")}`}
        render={(c, s, i) => {
          const r = res[i];
          return (
            <>
              <Grid2>
                <TextField label="الرقم" dir="ltr" value={c.tag} onChange={(v) => s({ ...c, tag: v })} />
                <TextField label="من ← إلى" value={c.from} onChange={(v) => s({ ...c, from: v })} />
              </Grid2>
              <Pick items={[["3", "ثلاثي الأوجه"], ["1", "أحادي"]]} value={c.phases} onChange={(phases) => s({ ...c, phases })} />
              <Pick items={[["kw", "قدرة داخلة kW"], ["motor", "خرج موتور kW"], ["ib", "تيار Ib"]]} value={c.load} onChange={(load) => s({ ...c, load })} />
              <Grid2>
                {c.load === "ib" ? <NumField label="Ib" unit="A" value={c.ib} onChange={(v) => s({ ...c, ib: v })} /> : <NumField label="القدرة" unit="kW" value={c.kw} onChange={(v) => s({ ...c, kw: v })} />}
                {c.load === "motor" && <NumField label="الكفاءة η" value={c.eta} onChange={(v) => s({ ...c, eta: v })} />}
                <NumField label="cosφ" value={c.cosphi} onChange={(v) => s({ ...c, cosphi: v })} />
                <NumField label="القاطع In" unit="A" value={c.inA} onChange={(v) => s({ ...c, inA: v })} />
                <NumField label="الطول" unit="m" value={c.len} onChange={(v) => s({ ...c, len: v })} />
                <NumField label="تيار القصر" unit="kA" value={c.isc} onChange={(v) => s({ ...c, isc: v })} />
                <NumField label="زمن الفصل" unit="s" value={c.t} onChange={(v) => s({ ...c, t: v })} />
                <NumField label="عدد الدوائر المتجمعة" value={c.groupN} onChange={(v) => s({ ...c, groupN: v })} rule={{ integer: true, min: 1 }} />
              </Grid2>
              <Pick label="العزل" items={[["xlpe", "XLPE"], ["pvc", "PVC"]]} value={c.insul} onChange={(insul) => s({ ...c, insul })} />
              <Pick label="طريقة التمديد" items={[["C", "C على حائط"], ["E", "E حامل مثقب"], ["D1", "D1 مدفون في ماسورة"]]} value={c.method} onChange={(method) => s({ ...c, method })} />
              {c.method !== "D1" && <Pick label="التجميع" items={[["bunched", "متجمعة"], ["trayPerforated", "حامل مثقب طبقة واحدة"]]} value={c.arr} onChange={(arr) => s({ ...c, arr })} />}
              <Pick label="جهاز الحماية" items={[["breaker", "قاطع"], ["gG", "فيوز gG"]]} value={c.device} onChange={(device) => s({ ...c, device })} />
              <Pick label="أساس السعة" items={[["table", "من الجدول (تحقق) ⚑"], ["maker", "من كتالوج المصنّع"]]} value={c.basis} onChange={(basis) => s({ ...c, basis })} />
              {c.basis === "maker" && <Grid2>
                <NumField label="المقطع" unit="mm²" value={c.makerS} onChange={(v) => s({ ...c, makerS: v })} />
                <NumField label="It من الكتالوج" unit="A" value={c.makerIt} onChange={(v) => s({ ...c, makerIt: v })} />
                <TextField label="مرجع الكتالوج" value={c.makerRef} onChange={(v) => s({ ...c, makerRef: v })} />
              </Grid2>}
              <ul className="text-[12px] space-y-0.5">
                <li>Ib = <bdi dir="ltr" className="font-grotesk">{fmtNum(r.ib, 2)} A</bdi> · Πk = <bdi dir="ltr" className="font-grotesk">{fmtNum(r.d.k, 4)}</bdi> ({r.d.tempTable})</li>
                <li>It المطلوب <bdi dir="ltr" className="font-grotesk">{fmtNum(r.needIt, 2)} A</bdi> → {r.parallel ? "يحتاج كابلات متوازية" : <bdi dir="ltr" className="font-grotesk">{r.s} mm² · Iz {fmtNum(r.iz, 2)} A</bdi>}</li>
                <li className={r.coord.ok ? "text-good" : "text-bad"}>التنسيق In ≤ {c.device === "gG" ? "0.906·Iz" : "Iz"} ({fmtNum(r.coord.limitA, 1)} A) {r.coord.ok ? "✓" : "✗"}</li>
                {r.vd && <li className={r.vd.pct <= (N(b.limitPct) || 5) ? "text-good" : "text-bad"}>هبوط الجهد <bdi dir="ltr" className="font-grotesk">{fmtNum(r.vd.pct, 3)} %</bdi> · أقصى طول <bdi dir="ltr" className="font-grotesk">{fmtNum(r.lmax || 0, 1)} m</bdi></li>}
                {r.ad && ("refused" in r.ad ? <li className="text-warn">زمن أقل من 0.1 ث — أدخل I²t من المصنّع</li> : <li className={r.s >= (r.sMin || 0) ? "text-good" : "text-bad"}>أقل مقطع للقصر <bdi dir="ltr" className="font-grotesk">{fmtNum(r.sMin || 0, 2)} mm²</bdi></li>)}
              </ul>
            </>
          );
        }}
      />
      {!CAB_DATASET.verified && <Note tone="warn">جدول السعات منقول من IEC 60364-5-52 وغير مُراجع بعد ⚑ — النتيجة «ضمن الحد ⚑» وليست «مطابق». للاعتماد استخدم كتالوج المصنّع.</Note>}
      <Note>وفق IEC 60364-5-52 (2009)؛ لا يقرر المطابقة للكود المصري. ليس للتنفيذ دون توقيع مهندس مختص.</Note>
    </div>
  );
}

function build(doc: ToolDoc<Body>, project: any) {
  const b = doc.body;
  const res = b.circuits.map((c) => calc(b, c));
  const blocks: DocBlock[] = [
    { k: "kv", cols: 3, rows: [
      { label: "الكود", value: iso("IEC 60364-5-52:2009") }, { label: "السعات", value: CAB_DATASET.verified ? "IEC" : "IEC — غير مُراجعة ⚑ / كتالوج" }, { label: "الجهد", value: iso(`${b.u0}/${b.u} V`) },
      { label: "الهواء", value: iso(`${b.airC} °C`) }, { label: "التربة", value: iso(`${b.groundC} °C · ${b.soil} K·m/W`) }, { label: "هبوط مسموح", value: iso(`${b.limitPct} %`) },
    ] },
    {
      k: "table", id: "cbl", caption: "", grid: true,
      cols: [
        { key: "tag", label: "الدائرة", wMm: 16, align: "center" }, { key: "ft", label: "من ← إلى", wMm: 30, align: "start" },
        { key: "kw", label: "kW", wMm: 13, align: "end" }, { key: "cos", label: "cosφ", wMm: 12, align: "end" },
        { key: "ib", label: "Ib", unit: "A", wMm: 15, align: "end", num: { dp: 1 } }, { key: "dev", label: "الحماية", wMm: 20, align: "center" },
        { key: "m", label: "التمديد", wMm: 14, align: "center" }, { key: "k", label: "Πk", wMm: 14, align: "end", num: { dp: 3 } },
        { key: "it", label: "It", unit: "A", wMm: 15, align: "end", num: { dp: 0 } }, { key: "iz", label: "Iz", unit: "A", wMm: 16, align: "end", num: { dp: 1 } },
        { key: "s", label: "المقطع", unit: "mm²", wMm: 17, align: "end" }, { key: "du", label: "Δu", unit: "%", wMm: 14, align: "end", num: { dp: 2 } },
        { key: "lm", label: "L max", unit: "m", wMm: 16, align: "end", num: { dp: 1 } }, { key: "smin", label: "S min", wMm: 15, align: "end", num: { dp: 1 } },
        { key: "r", label: "النتيجة", wMm: 34, align: "center" },
      ],
      rows: b.circuits.map((c, i) => {
        const r = res[i];
        return {
          cells: {
            tag: iso(c.tag), ft: c.from, kw: iso(c.load === "ib" ? "—" : c.kw), cos: iso(c.cosphi), ib: r.ib, dev: iso(`${c.device === "gG" ? "gG" : "MCB"} ${r.inA} A`),
            m: iso(c.method), k: r.d.k, it: r.it || null, iz: r.iz || null, s: iso(r.parallel ? "‖" : `${r.s}`), du: r.vd ? r.vd.pct : null, lm: r.lmax, smin: r.sMin,
            r: { spans: [{ t: word(r.ok, c.basis === "maker"), w: 600 }] },
          },
        };
      }),
    },
    { k: "notes", title: "الفرضيات", text: "Ib = P/(√3·U·cosφ·η) · Iz = It·k_temp·k_group·k_soil · gG: In ≤ 1.45/1.6·Iz · Δu = b(ρ·L/S·cosφ + λ·L·sinφ)·Ib، ρ = 0.0225، λ = 0.08 mΩ/m · S ≥ I·√t/k (0.1–5 s). جداول الحرارة: B.52.14 للهواء و B.52.15 للمدفون." },
  ];
  return buildSpec({ doc, meta: module, project, sections: [{ orientation: "landscape", blocks }], signRoles: ["prepared", "checked", "approved"],
    basis: { rows: [{ key: "amp", label: "جداول السعة", value: CAB_DATASET.id, source: "IEC 60364-5-52", conf: "M", flagged: !CAB_DATASET.verified }, { key: "k", label: "معامل k للقصر", value: "115 / 143", source: "IEC 60364-5-54", conf: "H", flagged: false }], formulas: [] } });
}

export const module: ToolModule<Body> = {
  kind: "cableCheck", v: 1, docType: "CBL", docTypeName: "جدول الكابلات · Cable schedule", discipline: "كهرباء", engine: CAB_ENGINE,
  profile: { id: CAB_DATASET.id, edition: "IEC 60364-5-52:2009", values: { rho: 0.0225, lambda: 0.00008 }, overridden: [], unverified: ["ampacity"] },
  blank: () => ({ u0: "220", u: "380", limitPct: "5", airC: "40", groundC: "30", soil: "2.5", circuits: [blankC()] }),
  defaultTitle: () => "جدول الكابلات",
  Editor,
  build,
  summary: (doc) => {
    const res = doc.body.circuits.map((c) => calc(doc.body, c));
    return [`جدول الكابلات · ⁦${res.length}⁩ دائرة`, `ضمن الحد ⁦${res.filter((r) => r.ok).length}⁩ · مراجعة ⁦${res.filter((r) => !r.ok).length}⁩`, "IEC 60364-5-52 — ليس للتنفيذ دون توقيع"].join("\n");
  },
};
