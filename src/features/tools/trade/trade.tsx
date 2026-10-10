// =====================================================================
//  حاسبة الصنايعي — the trade quick kit and its material request («طلب خامات»). Engine: src/domain/tools/trade-calc.ts
//  · Twelve trades as big tiles; each mode is one short form with sensible defaults, a hero number in purchase units,
//    and «أضف لطلب الخامات», which adds its material lines to this document. The request prints with signatures for the
//    foreman, the responsible engineer and the store keeper. No prices, ever.
// =====================================================================
import { numInputParse } from "../../../lib/num-input";
import {
  CALIB_DEFAULT, PLASTER_PRESETS, STEEL_SECTIONS, TRADE_ENGINE, UNIT_PRESETS, tradeBagBatch, tradeBarSpacing, tradeDrywall, tradeElectric,
  tradeFalls, tradeFormwork, tradeFormworkContact, tradeMasonry, tradePaint, tradePlaster, tradePlumbing, tradeRoomArea, tradeSteel, tradeTiles,
} from "../../../domain/tools/trade-calc";
import { BBS_DIAMETERS } from "../../../domain/tools/bbs-calc";
import type { DocBlock } from "../../../doc/model";
import { fmtNum, iso } from "../../../doc/text";
import type { ToolDoc } from "../../../data/tool-docs";
import { Card, Grid2, Note, NumField, Pick, ResultHero, RowCards, Rows, TextField } from "../../../ui/kit";
import type { ToolModule } from "../module";
import { buildSpec } from "../spec";

type Mode = "batch" | "masonry" | "plaster" | "tiles" | "paint" | "formwork" | "bars" | "falls" | "electric" | "plumbing" | "drywall" | "steel";
type Field = { k: string; label: string; unit?: string; def: string; pick?: [string, string][]; int?: boolean };
type MatLine = { label: string; qty: number; unit: string; desc: string };
type Out = { hero: [string, string, string]; rows: [string, string, string?][]; lines: MatLine[]; warn?: string[] };

const N = (v: string | undefined) => numInputParse(v || "") ?? 0;
const f2 = (x: number, d = 2) => fmtNum(x, d);

const MODES: { id: Mode; name: string; emoji: string; fields: Field[]; calc: (v: Record<string, string>, calib: { bucketL: number }) => Out }[] = [
  {
    id: "batch", name: "خلطة الشكارة", emoji: "🪣",
    fields: [{ k: "c", label: "أسمنت لكل م³", unit: "kg", def: "350" }, { k: "s", label: "رمل لكل م³", unit: "m³", def: "0.4" }, { k: "g", label: "زلط لكل م³", unit: "m³", def: "0.8" }, { k: "wc", label: "نسبة الماء/الأسمنت", def: "0.5" }, { k: "bags", label: "عدد الشكاير", def: "1", int: true }],
    calc: (v, cal) => {
      const b = tradeBagBatch({ bagKg: 50, cementKgM3: N(v.c), sandM3: N(v.s), gravelM3: N(v.g), wc: N(v.wc) }, cal.bucketL);
      const n = Math.max(1, N(v.bags));
      return {
        hero: [f2(b.sandBuckets * n, 1), `جردل رمل · ${f2(b.gravelBuckets * n, 1)} جردل زلط`, `لكل ${n} شكارة`],
        rows: [["ناتج الخلطة", f2(b.yieldM3 * n, 3), "m³"], ["ماء", f2(b.waterL * n, 0), "L"], ["الجردل", String(cal.bucketL), "L ⚑"]],
        lines: [{ label: "أسمنت", qty: n, unit: "شكارة", desc: `خلطة ${v.c} كجم/م³` }, { label: "رمل", qty: Number((N(v.s) * b.yieldM3 * n).toFixed(3)), unit: "m³", desc: "" }, { label: "زلط / سن", qty: Number((N(v.g) * b.yieldM3 * n).toFixed(3)), unit: "m³", desc: "" }],
        warn: b.warn,
      };
    },
  },
  {
    id: "masonry", name: "المباني", emoji: "🧱",
    fields: [
      { k: "unit", label: "نوع الطوب", def: "red", pick: UNIT_PRESETS.map((u) => [u.id, u.name]) },
      { k: "leaves", label: "سمك الحائط", def: "0.5", pick: [["0.5", "نصف طوبة"], ["1", "طوبة"], ["1.5", "طوبة ونص"], ["2", "طوبتين"]] },
      { k: "L", label: "طول الحائط", unit: "m", def: "" }, { k: "H", label: "ارتفاع الحائط", unit: "m", def: "" },
      { k: "open", label: "مساحة الفتحات", unit: "m²", def: "0" }, { k: "mix", label: "أسمنت لكل م³ رمل", unit: "kg", def: "250" },
    ],
    calc: (v) => {
      const p = UNIT_PRESETS.find((u) => u.id === v.unit) || UNIT_PRESETS[0];
      const area = Math.max(0, N(v.L) * N(v.H) - N(v.open));
      const m = tradeMasonry({ unit: p.u, areaM2: area, leaves: Number(v.leaves) as any, jointCm: 1, unitWastePct: p.waste, mortarKgM3: N(v.mix), mortarWastePct: 25, thinBed: p.u.kind === "aac" });
      return {
        hero: [String(m.units), p.u.kind === "solid" ? "طوبة" : "بلوكة", `${f2(area, 2)} م² صافي · هالك ${p.waste} %`],
        rows: m.adhesiveKg != null ? [["لاصق", f2(m.adhesiveKg, 1), "kg"]] : [["أسمنت", String(m.cementBags), "شكارة"], ["رمل", f2(m.sandM3, 2), "m³"], ["عدد / م²", f2(m.unitsPerM2, 2)]],
        lines: [
          { label: p.name, qty: m.units, unit: p.u.kind === "solid" ? "طوبة" : "بلوكة", desc: `${f2(area, 2)} م²` },
          ...(m.adhesiveKg != null ? [{ label: "لاصق خفاف", qty: Math.ceil(m.adhesiveKg), unit: "kg", desc: "" }] : [{ label: "أسمنت مونة", qty: m.cementBags, unit: "شكارة", desc: `${v.mix} كجم/م³ رمل` }, { label: "رمل مونة", qty: Number(m.sandM3.toFixed(2)), unit: "m³", desc: "هالك 25 % ⚑" }]),
        ],
      };
    },
  },
  {
    id: "plaster", name: "البياض", emoji: "🧰",
    fields: [{ k: "area", label: "المساحة الصافية", unit: "m²", def: "" }, { k: "preset", label: "النوع", def: "internal", pick: Object.entries(PLASTER_PRESETS).map(([k, x]) => [k, x.name]) }, { k: "waste", label: "الهالك", unit: "%", def: "20" }],
    calc: (v, cal) => {
      const p = tradePlaster({ areaM2: N(v.area), layers: (PLASTER_PRESETS[v.preset] || PLASTER_PRESETS.internal).layers, wastePct: N(v.waste) });
      return {
        hero: [String(p.cementBags), "شكارة أسمنت", `رمل ${f2(p.sandM3, 2)} م³ = ${f2((p.sandM3 * 1000) / cal.bucketL, 0)} جردل`],
        rows: [["أسمنت", f2(p.cementKg, 0), "kg"], ["رمل", f2(p.sandM3, 3), "m³"]],
        lines: [{ label: "أسمنت بياض", qty: p.cementBags, unit: "شكارة", desc: `${v.area} م²` }, { label: "رمل بياض", qty: Number(p.sandM3.toFixed(2)), unit: "m³", desc: "" }],
      };
    },
  },
  {
    id: "tiles", name: "البلاط والترويب", emoji: "🔲",
    fields: [{ k: "area", label: "المساحة", unit: "m²", def: "" }, { k: "a", label: "طول البلاطة", unit: "mm", def: "600" }, { k: "b", label: "عرض البلاطة", unit: "mm", def: "600" }, { k: "j", label: "العراميس", unit: "mm", def: "2" }, { k: "w", label: "الهالك", unit: "%", def: "10" }, { k: "box", label: "م² في الكرتونة", unit: "m²", def: "1.44" }],
    calc: (v) => {
      const t = tradeTiles({ areaM2: N(v.area), aMm: N(v.a), bMm: N(v.b), jointMm: N(v.j), wastePct: N(v.w), boxM2: N(v.box) || undefined, depthMm: 9 });
      return {
        hero: [String(t.tiles), "بلاطة", t.boxes != null ? `${t.boxes} كرتونة · بدقة ${f2(t.tilesExact, 1)}` : ""],
        rows: [["ترويب", f2(t.groutKg || 0, 1), "kg"]],
        lines: [{ label: `بلاط ${v.a}×${v.b}`, qty: t.boxes ?? t.tiles, unit: t.boxes != null ? "كرتونة" : "بلاطة", desc: `${v.area} م² · هالك ${v.w} %` }, { label: "ترويب", qty: Math.ceil(t.groutKg || 0), unit: "kg", desc: "" }],
      };
    },
  },
  {
    id: "paint", name: "الدهانات", emoji: "🎨",
    fields: [{ k: "l", label: "طول الغرفة", unit: "m", def: "" }, { k: "w", label: "عرض الغرفة", unit: "m", def: "" }, { k: "h", label: "الارتفاع", unit: "m", def: "3" }, { k: "open", label: "الفتحات", unit: "m²", def: "0" }, { k: "ceil", label: "السقف", def: "yes", pick: [["yes", "مع السقف"], ["no", "بدون"]] }, { k: "coats", label: "عدد الأوجه", def: "2", int: true }, { k: "spread", label: "الفرد من نشرة المنتج", unit: "m²/L", def: "10" }, { k: "pack", label: "العبوة", unit: "L", def: "3.6" }],
    calc: (v) => {
      const a = tradeRoomArea({ l: N(v.l), w: N(v.w), h: N(v.h), openingsM2: N(v.open), ceiling: v.ceil === "yes" });
      const p = tradePaint({ areaM2: a.areaM2, coats: N(v.coats), spreadM2L: N(v.spread), practical: 1, wastePct: 10, packL: N(v.pack) });
      return {
        hero: [String(p.packs), `عبوة ${v.pack} لتر`, `${f2(p.litres, 2)} لتر · ${f2(a.areaM2, 2)} م²`],
        rows: [["الحوائط", f2(a.wallsM2, 2), "m²"]],
        lines: [{ label: "دهان", qty: p.packs, unit: `عبوة ${v.pack} L`, desc: `${v.coats} وجه · ${f2(a.areaM2, 1)} م²` }],
        warn: N(v.spread) && (N(v.spread) < 8 || N(v.spread) > 14) ? ["معدل الفرد خارج 8–14 م²/لتر — راجع النشرة ⚑"] : [],
      };
    },
  },
  {
    id: "formwork", name: "خشب الشدة", emoji: "🪵",
    fields: [{ k: "kind", label: "العنصر", def: "column", pick: [["column", "أعمدة"], ["beam", "كمرات"], ["slab", "بلاطة"], ["wall", "حوائط"]] }, { k: "a", label: "البعد الأول (أو الطول)", unit: "m", def: "" }, { k: "b", label: "البعد الثاني (أو العرض)", unit: "m", def: "" }, { k: "h", label: "الارتفاع / الساقط", unit: "m", def: "" }, { k: "n", label: "العدد", def: "1", int: true }, { k: "w", label: "الهالك", unit: "%", def: "10" }],
    calc: (v) => {
      const c = tradeFormworkContact({ kind: v.kind as any, a: N(v.a), b: N(v.b), h: N(v.h), n: N(v.n) });
      const s = tradeFormwork({ contactM2: c, wastePct: N(v.w) });
      return { hero: [String(s.sheets), "لوح بلاكاش 1.22×2.44", `مساحة التلامس ${f2(c, 2)} م²`], rows: [["بدقة", f2(s.exact, 2), "لوح"]], lines: [{ label: "بلاكاش 1.22×2.44", qty: s.sheets, unit: "لوح", desc: `${f2(c, 1)} م² + ${v.w} %` }] };
    },
  },
  {
    id: "bars", name: "تقسيط الحديد", emoji: "📏",
    fields: [{ k: "clear", label: "الطول الصافي", unit: "m", def: "" }, { k: "s", label: "المسافة بين الأسياخ", unit: "mm", def: "150" }, { k: "d", label: "القطر", def: "12", pick: BBS_DIAMETERS.slice(0, 9).map((d) => [String(d), `Ø${d}`]) }, { k: "other", label: "طول السيخ في الاتجاه الآخر", unit: "m", def: "" }, { k: "cover", label: "الغطاء عند الطرف", unit: "mm", def: "25" }],
    calc: (v) => {
      const b = tradeBarSpacing({ clearM: N(v.clear), coverMm: N(v.cover), spacingMm: N(v.s), d: N(v.d), otherLenM: N(v.other) });
      return {
        hero: [String(b.bars), "سيخ", `Ø${v.d} @ ${v.s} · ${f2(b.asMm2PerM, 0)} مم²/م`],
        rows: [["الطول الكلي", f2(b.totalM, 2), "m"], ["الوزن", f2(b.kg, 2), "kg"]],
        lines: [{ label: `حديد Ø${v.d}`, qty: Number(b.kg.toFixed(1)), unit: "kg", desc: `${b.bars} سيخ × ${v.other} م` }],
        warn: b.tight ? ["المسافة أقل من 2Ø + 20 مم"] : [],
      };
    },
  },
  {
    id: "falls", name: "الميول", emoji: "📐",
    fields: [{ k: "slope", label: "الميل", unit: "%", def: "1" }, { k: "run", label: "المسافة", unit: "m", def: "" }, { k: "min", label: "أقل سمك عند الصفاية", unit: "mm", def: "30" }, { k: "area", label: "المساحة (للحجم)", unit: "m²", def: "" }],
    calc: (v) => {
      const f = tradeFalls({ slopePct: N(v.slope), runM: N(v.run), minMm: N(v.min), areaM2: N(v.area) || undefined });
      return { hero: [f2(f.dropMm, 0), "مم فرق منسوب", `أقصى سمك ${f2(f.maxMm, 0)} مم · المتوسط ${f2(f.avgMm, 0)} مم`], rows: f.volumeM3 != null ? [["حجم الميول", f2(f.volumeM3, 2), "m³"]] : [], lines: f.volumeM3 != null ? [{ label: "خرسانة / مونة ميول", qty: Number(f.volumeM3.toFixed(2)), unit: "m³", desc: `${v.slope} % على ${v.run} م` }] : [] };
    },
  },
  {
    id: "electric", name: "الكهربائي", emoji: "💡",
    fields: [{ k: "rooms", label: "عدد الغرف", def: "", int: true }, { k: "pts", label: "مخارج لكل غرفة", def: "8", int: true }, { k: "runs", label: "مجموع أطوال المسارات", unit: "m", def: "" }],
    calc: (v) => {
      const e = tradeElectric({ rooms: N(v.rooms), pointsPerRoom: N(v.pts), runsM: N(v.runs) });
      return { hero: [f2(e.wireM, 0), "متر سلك / خرطوم", `${e.boxes} علبة`], rows: [], lines: [{ label: "سلك / خرطوم", qty: Math.ceil(e.wireM), unit: "m", desc: "+10 % ⚑" }, { label: "علب", qty: e.boxes, unit: "علبة", desc: "" }], warn: ["للتوريد فقط — مقاس الكابل من أداة الكابلات"] };
    },
  },
  {
    id: "plumbing", name: "السباك", emoji: "🔧",
    fields: [{ k: "runs", label: "أطوال المسارات (افصل بـ +)", def: "" }, { k: "len", label: "طول الماسورة", unit: "m", def: "4" }],
    calc: (v) => {
      const runs = String(v.runs || "").split(/[+،,\s]+/).map((x) => numInputParse(x) ?? 0).filter((x) => x > 0);
      const p = tradePlumbing({ runsM: runs, lengthM: N(v.len) || 4 });
      return { hero: [String(p.lengths), `ماسورة ${v.len || 4} م`, `${f2(p.totalM, 1)} م · ${p.fittings} وصلة`], rows: [], lines: [{ label: "مواسير", qty: p.lengths, unit: "ماسورة", desc: `${f2(p.totalM, 1)} متر` }, { label: "قطع ووصلات", qty: p.fittings, unit: "قطعة", desc: "1 لكل 1.5 م ⚑" }] };
    },
  },
  {
    id: "drywall", name: "الجبس بورد", emoji: "🧱",
    fields: [{ k: "L", label: "طول القاطوع", unit: "m", def: "" }, { k: "H", label: "الارتفاع", unit: "m", def: "" }, { k: "sides", label: "الأوجه", def: "2", pick: [["2", "وجهين"], ["1", "وجه"]] }, { k: "w", label: "الهالك", unit: "%", def: "10" }],
    calc: (v) => {
      const d = tradeDrywall({ lengthM: N(v.L), heightM: N(v.H), sides: Number(v.sides) as 1 | 2, layers: 1, wastePct: N(v.w) });
      return { hero: [String(d.boards), "لوح 1.2×2.4", `${d.studs} قائم · ${f2(d.trackM, 1)} م مجرى`], rows: [["مسامير", String(d.screws)]], lines: [{ label: "ألواح جبس بورد", qty: d.boards, unit: "لوح", desc: "" }, { label: "قوائم", qty: d.studs, unit: "قائم", desc: "كل 60 سم" }, { label: "مجاري", qty: d.trackM, unit: "m", desc: "" }] };
    },
  },
  {
    id: "steel", name: "حديد الهياكل", emoji: "🏗️",
    fields: [{ k: "sec", label: "القطاع", def: "IPE 200", pick: Object.keys(STEEL_SECTIONS).map((k) => [k, k]) }, { k: "len", label: "الطول", unit: "m", def: "" }, { k: "n", label: "العدد", def: "1", int: true }],
    calc: (v) => {
      const s = tradeSteel({ section: v.sec, lengthM: N(v.len), n: N(v.n) });
      return { hero: [f2(s.kg, 1), "كجم", `${v.n} × ${v.sec} × ${v.len} م · ${s.kgPerM} كجم/م`], rows: [], lines: [{ label: v.sec, qty: Number(s.kg.toFixed(1)), unit: "kg", desc: `${v.n} × ${v.len} م` }] };
    },
  },
];

type Body = {
  zone: string; element: string; neededBy: string; requester: string;
  calib: { bucketL: string; barrowL: string };
  mode: Mode; inputs: Partial<Record<Mode, Record<string, string>>>;
  lines: MatLine[];
};

const blank = (): Body => ({ zone: "", element: "", neededBy: "", requester: "", calib: { bucketL: String(CALIB_DEFAULT.bucketL), barrowL: String(CALIB_DEFAULT.barrowL) }, mode: "masonry", inputs: {}, lines: [] });

const valuesOf = (b: Body, m: (typeof MODES)[number]) => Object.fromEntries(m.fields.map((f) => [f.k, b.inputs[m.id]?.[f.k] ?? f.def]));

function Editor({ body: b, set, ctx }: { body: Body; set: (b: Body) => void; ctx: any }) {
  const ro = ctx.readOnly;
  const put = (p: Partial<Body>) => !ro && set({ ...b, ...p });
  const m = MODES.find((x) => x.id === b.mode) || MODES[0];
  const v = valuesOf(b, m);
  const cal = { bucketL: N(b.calib.bucketL) || 20 };
  const out = m.calc(v, cal);
  const setV = (k: string, x: string) => put({ inputs: { ...b.inputs, [m.id]: { ...v, [k]: x } } });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {MODES.map((x) => (
          <button key={x.id} type="button" aria-pressed={x.id === m.id} onClick={() => put({ mode: x.id })}
            className={`press min-h-20 p-2 rounded-2xl border text-center ${x.id === m.id ? "bg-wash border-accent/40" : "bg-surface border-line"}`}>
            <span className="block text-[26px] leading-none" aria-hidden="true">{x.emoji}</span>
            <span className="block mt-1.5 text-[12px] leading-tight">{x.name}</span>
          </button>
        ))}
      </div>
      <Card title={m.name}>
        <div className="space-y-2.5">
          {m.fields.filter((f) => f.pick).map((f) => <Pick key={f.k} label={f.label} items={f.pick!} value={v[f.k]} onChange={(x) => setV(f.k, x)} />)}
          {m.id === "plumbing"
            ? <TextField label={m.fields[0].label} dir="ltr" value={v.runs} onChange={(x) => setV("runs", x)} placeholder="7.5 + 12 + 5.3" />
            : null}
          <Grid2>
            {m.fields.filter((f) => !f.pick && !(m.id === "plumbing" && f.k === "runs")).map((f) => (
              <NumField key={f.k} label={f.label} unit={f.unit} value={v[f.k]} onChange={(x) => setV(f.k, x)} rule={{ min: 0, integer: f.int }} />
            ))}
          </Grid2>
        </div>
      </Card>
      <ResultHero label={m.name} value={out.hero[0]} unit={out.hero[1]} sub={out.hero[2]} />
      {out.rows.length > 0 && <Rows rows={out.rows} />}
      {(out.warn || []).map((w, i) => <Note key={i} tone="warn">{w}</Note>)}
      <button type="button" disabled={ro || !out.lines.some((l) => l.qty > 0)} onClick={() => put({ lines: [...b.lines, ...out.lines.filter((l) => l.qty > 0)].slice(0, 60) })}
        className="press w-full min-h-12 rounded-xl bg-surface border border-accent/40 text-accent text-[14px] font-medium disabled:opacity-40">+ أضِف لطلب الخامات</button>

      <Card title={`طلب الخامات (${b.lines.length})`}>
        <div className="space-y-2.5">
          <Grid2>
            <TextField label="المنطقة / الدور" value={b.zone} onChange={(x) => put({ zone: x })} />
            <TextField label="العنصر" value={b.element} onChange={(x) => put({ element: x })} />
            <TextField label="الطالب" value={b.requester} onChange={(x) => put({ requester: x })} />
            <label className="block"><span className="block text-[12px] text-ink-2 mb-1">مطلوب يوم</span>
              <input type="date" dir="ltr" value={b.neededBy} onChange={(e) => put({ neededBy: e.target.value })} className="w-full h-12 px-3 rounded-xl bg-canvas border border-line-2 font-grotesk text-[15px]" /></label>
          </Grid2>
          <RowCards<MatLine>
            rows={b.lines}
            onChange={(lines) => put({ lines })}
            blank={() => ({ label: "", qty: 0, unit: "", desc: "" })}
            addLabel="بند يدوي"
            max={60}
            summary={(l) => `${l.label || "بند"} — ${fmtNum(l.qty, Number.isInteger(l.qty) ? 0 : 2)} ${l.unit}`}
            render={(l, setL) => (
              <Grid2>
                <TextField label="البند" value={l.label} onChange={(x) => setL({ ...l, label: x })} />
                <NumField label="الكمية" value={String(l.qty || "")} onChange={(x) => setL({ ...l, qty: numInputParse(x) ?? 0 })} />
                <TextField label="الوحدة" value={l.unit} onChange={(x) => setL({ ...l, unit: x })} />
                <TextField label="ملاحظات" value={l.desc} onChange={(x) => setL({ ...l, desc: x })} />
              </Grid2>
            )}
          />
          <Grid2>
            <NumField label="الجردل بتاعك كام لتر؟" unit="L" value={b.calib.bucketL} onChange={(x) => put({ calib: { ...b.calib, bucketL: x } })} />
            <NumField label="عربية اليد" unit="L" value={b.calib.barrowL} onChange={(x) => put({ calib: { ...b.calib, barrowL: x } })} />
          </Grid2>
        </div>
      </Card>
      <Note>تقدير للطلب والتجهيز على الموقع؛ نسب الخلطات والهالك قيم شائعة قابلة للتعديل ولا تغني عن الخلطة المعتمدة. أحجام الجردل والعربية حسب معايرتك.</Note>
    </div>
  );
}

function build(doc: ToolDoc<Body>, project: any) {
  const b = doc.body;
  const blocks: DocBlock[] = [
    { k: "kv", cols: 2, rows: [
      { label: "المنطقة / الدور", value: b.zone || "—" }, { label: "العنصر", value: b.element || "—" },
      { label: "مطلوب يوم", value: iso(b.neededBy || "—") }, { label: "الطالب", value: b.requester || "—" },
    ] },
    {
      k: "table", id: "mr", caption: "", cols: [
        { key: "n", label: "#", wMm: 10, align: "center", num: { dp: 0 } }, { key: "item", label: "البند", wMm: 48, align: "start" },
        { key: "desc", label: "الوصف والفرضيات", wMm: 54, align: "start" }, { key: "qty", label: "الكمية", wMm: 22, align: "end" },
        { key: "unit", label: "الوحدة", wMm: 20, align: "center" }, { key: "note", label: "ملاحظات", wMm: 20, align: "start" },
      ],
      rows: b.lines.map((l, i) => ({ cells: { n: i + 1, item: l.label, desc: l.desc, qty: iso(fmtNum(l.qty, Number.isInteger(l.qty) ? 0 : 2)), unit: l.unit, note: "" } })),
    },
    { k: "notes", title: "الفرضيات", text: `الشكارة 50 كجم · الجردل ${b.calib.bucketL} لتر ⚑ · عربية اليد ${b.calib.barrowL} لتر ⚑ · نسب الخلطات والهالك حسب ملف الموقع eg-site@1 ⚑` },
  ];
  return buildSpec({
    doc, meta: module, project, sections: [{ orientation: "portrait", blocks }],
    signRoles: ["requester", "siteEngineer", "storeKeeper"],
  });
}

export const module: ToolModule<Body> = {
  kind: "tradeKit", v: 1, docType: "MR", docTypeName: "طلب خامات · Material request", discipline: "موقع", engine: TRADE_ENGINE,
  profile: { id: "eg-site@1", edition: "Egyptian site practice", values: { bagKg: 50 }, overridden: [], unverified: ["bucketL", "barrowL", "mixes", "waste"] },
  blank,
  defaultTitle: () => "طلب خامات",
  Editor,
  build,
  summary: (doc) => [
    `${doc.title}${doc.docNo ? ` · ⁦${doc.docNo}⁩` : " · مسودة"}`,
    ...doc.body.lines.slice(0, 4).map((l) => `${l.label} ⁦${fmtNum(l.qty, Number.isInteger(l.qty) ? 0 : 2)}⁩ ${l.unit}`),
    "تقدير — راجع المستند الكامل",
  ].join("\n"),
};
