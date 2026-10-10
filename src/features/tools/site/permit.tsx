// =====================================================================
//  تصاريح العمل — permit to work with safety calculators (screen + PDF). Engine: src/domain/tools/site-calc.ts
//  · State machine: مسودة → مصرّح → ساري → موقوف → مغلق | ملغى. «تصريح» needs the issuer, performing authority and
//    acceptor names, a «وُقّع ورقيًا» confirmation and, for confined space and hot work, a passing gas test.
//    Only an authorised or active permit inside its window reads «ساري».
//  · Calculators by type: excavation (OSHA 1926.651/652), height (fall clearance, ladder), confined space (gas limits),
//    lifting near power lines (OSHA 1926.1408 Table A), hot work (distances, fire watch).
// =====================================================================
import { numInputParse } from "../../../lib/num-input";
import { PTW_ENGINE, ptwExcavation, ptwFallClearance, ptwGas, ptwLadder, ptwLineClearance, ptwStatus, type PtwState } from "../../../domain/tools/site-calc";
import type { DocBlock } from "../../../doc/model";
import { fmtNum, iso } from "../../../doc/text";
import type { ToolDoc } from "../../../data/tool-docs";
import { AreaField, Card, Check, Checks, Grid2, Note, NumField, Pick, RowCards, Rows, TextField } from "../../../ui/kit";
import type { ToolModule } from "../module";
import { buildSpec } from "../spec";

type PType = "hot" | "height" | "confined" | "excavation" | "lifting" | "electrical";
type Gas = { at: string; o2: string; lel: string; h2s: string; co: string };
type Body = {
  type: PType; location: string; work: string; start: string; hours: string;
  state: PtwState; authorisedAt?: number; paperSigned: boolean; cancelReason: string;
  issuer: string; performer: string; acceptor: string;
  controls: Record<string, "y" | "n" | "na">;
  calc: Record<string, string>;
  gas: Gas[];
  closeNote: string;
};

const N = (s: string | undefined) => numInputParse(s || "");

const TYPES: [PType, string][] = [["hot", "أعمال ساخنة"], ["height", "عمل على ارتفاع"], ["confined", "أماكن محصورة"], ["excavation", "حفر"], ["lifting", "رفع قرب خطوط كهرباء"], ["electrical", "عزل كهربائي"]];

const CONTROLS: Record<PType, string[]> = {
  hot: ["إزالة المواد القابلة للاشتعال 11 م أو تغطيتها", "طفاية مناسبة في المكان", "مراقب حريق أثناء العمل و60 دقيقة بعده", "اسطوانات الأكسجين بعيدة 6.1 م عن الغاز"],
  height: ["حزام كامل مع حبل امتصاص", "نقطة تثبيت ≥ 22.2 kN", "سقالة ببطاقة خضراء", "منطقة أسفل العمل مؤمّنة"],
  confined: ["قياس الغاز قبل الدخول (O₂ ← LEL ← سموم)", "تهوية مستمرة", "مراقب خارج الفتحة", "خطة إنقاذ ومعدات جاهزة"],
  excavation: ["ميول أو سند حسب نوع التربة", "الردم بعيد 0.61 م عن الحافة", "سلم كل 15 م من الطول", "فحص يومي من شخص مختص"],
  lifting: ["تأكيد جهد الخط من شركة التوزيع", "مراقب مسافات مخصص", "منطقة العمل محددة بحواجز", "فحص الونش والحبال"],
  electrical: ["فصل المصدر وقفل وتعليق بطاقة", "التأكد من انعدام الجهد", "تأريض مؤقت عند الحاجة", "المفاتيح مع المنفّذ"],
};

const STATE_WORD: Record<PtwState, string> = { draft: "مسودة — غير مصرّح بالعمل", authorised: "مصرّح", active: "ساري", suspended: "موقوف", closed: "مغلق", cancelled: "ملغى" };

const blank = (): Body => ({
  type: "hot", location: "", work: "", start: "07:00", hours: "8", state: "draft", paperSigned: false, cancelReason: "",
  issuer: "", performer: "", acceptor: "", controls: {}, calc: {}, gas: [], closeNote: "",
});

function calcOut(b: Body): { rows: [string, string, string?][]; checks: { label: string; value: string; limit: string; ok: boolean | null; clause?: string }[]; block: string } {
  const c = b.calc;
  if (b.type === "excavation") {
    const e = ptwExcavation({ depthM: N(c.depth) ?? 0, baseM: N(c.base) ?? 0, lengthM: N(c.len) ?? 0, soil: (c.soil as any) || "B", water: c.water === "y", gas: c.gas === "y" });
    return { rows: [["عرض الحفر من أعلى", fmtNum(e.topWidthM, 2), "m"], ["الميل H:V", String(e.slopeHV)], ["عدد السلالم", String(e.ladders)], ["بُعد الردم عن الحافة ≥", "0.61", "m"]] as [string, string, string?][],
      checks: [
        { label: "نظام حماية للجوانب", value: `${c.depth || 0} m`, limit: "مطلوب من 1.5 m", ok: e.protectiveRequired ? null : true },
        { label: "تصميم مهندس متخصص", value: `${c.depth || 0} m`, limit: "≤ 6.1 m", ok: !e.peRequired },
        ...(e.atmosphereTest ? [{ label: "قياس الغاز قبل النزول", value: "مطلوب", limit: "> 1.22 m مع احتمال غاز", ok: null }] : []),
      ], block: e.off ? "الحفر أعمق من 6.1 م — يتطلب تصميمًا من مهندس متخصص؛ الحاسبة متوقفة." : "" };
  }
  if (b.type === "height") {
    const f = ptwFallClearance({ lanyardM: N(c.lanyard) ?? 1.8, absorberM: N(c.absorber) ?? 1.75, anchorAboveFeetM: N(c.anchor) ?? 0, profile: (c.std as any) || "en", availableM: N(c.avail) });
    const l = ptwLadder(N(c.ladderH) ?? 0);
    return { rows: [["السقوط الحر", fmtNum(f.freeFallM, 2), "m"], ["الخلوص المطلوب أسفل سطح العمل", fmtNum(f.requiredM, 2), "m"], ...(N(c.ladderH) ? [["قاعدة السلم", fmtNum(l.baseM, 2), "m"], ["أقل طول للسلم", fmtNum(l.minLadderM, 2), "m"]] as [string, string, string][] : [])],
      checks: [
        { label: "السقوط الحر", value: `${fmtNum(f.freeFallM, 2)} m`, limit: c.std === "osha" ? "≤ 1.8 m OSHA" : "≤ 4.0 m EN 355", ok: f.freeFallOk },
        ...(f.ok != null ? [{ label: "الخلوص المتاح", value: `${c.avail} m`, limit: `≥ ${fmtNum(f.requiredM, 2)} m`, ok: f.ok }] : []),
      ], block: f.ok === false ? "الخلوص غير كافٍ — استخدم حبل ذاتي الارتداد (SRL) أو ارفع نقطة التثبيت." : "" };
  }
  if (b.type === "lifting") {
    const kv = N(c.kv);
    const x = ptwLineClearance(kv);
    return x.blocked
      ? { rows: [["مسافة التخطيط المتحفظة", "15.24", "m"]] as [string, string, string?][], checks: [], block: "الرفع ممنوع حتى تؤكد شركة التوزيع جهد الخط." }
      : { rows: [["أقل مسافة من الخط", fmtNum(x.minM, 2), "m"]] as [string, string, string?][], checks: [{ label: "مسافة الخط", value: `${kv} kV`, limit: `≥ ${fmtNum(x.minM, 2)} m`, ok: null, clause: "OSHA 1926.1408 T.A" }], block: "" };
  }
  if (b.type === "hot") return { rows: [["إزالة المواد القابلة للاشتعال", "11", "m"], ["مراقب الحريق بعد العمل", "60", "min"]] as [string, string, string?][], checks: [], block: "" };
  return { rows: [] as [string, string, string?][], checks: [], block: "" };
}

const gasOf = (g: Gas) => ptwGas({ o2: N(g.o2) ?? 0, lel: N(g.lel) ?? 0, h2s: N(g.h2s) ?? 0, co: N(g.co) ?? 0 });
const needsGas = (t: PType) => t === "confined" || t === "hot";

function status(doc: ToolDoc<Body>) {
  const b = doc.body;
  const last = b.gas[b.gas.length - 1];
  return ptwStatus({ state: b.state, startIso: `${doc.dateIso}T${b.start || "07:00"}:00`, hours: N(b.hours) ?? 8, gasOk: last ? gasOf(last).ok : null }, new Date().toISOString());
}

function Editor({ body: b, set, ctx }: { body: Body; set: (b: Body) => void; ctx: any }) {
  const ro = ctx.readOnly;
  const put = (p: Partial<Body>) => !ro && set({ ...b, ...p });
  const c = calcOut(b);
  const cv = (k: string) => b.calc[k] || "";
  const setC = (k: string) => (v: string) => put({ calc: { ...b.calc, [k]: v } });
  const lastGas = b.gas[b.gas.length - 1];
  const gasOk = lastGas ? gasOf(lastGas).ok : false;
  const missing = [!b.issuer && "مُصدِر التصريح", !b.performer && "المنفّذ", !b.acceptor && "المستلم", !b.paperSigned && "التوقيع الورقي", needsGas(b.type) && !gasOk && "قياس غاز ناجح", c.block && "مانع في الحاسبة"].filter(Boolean) as string[];
  const live = b.state === "draft" ? STATE_WORD.draft : STATE_WORD[b.state];
  return (
    <div className="space-y-3">
      <div className={`p-3 rounded-xl border text-[13px] font-medium ${b.state === "authorised" ? "border-good/40 bg-good/5 text-good" : b.state === "draft" ? "border-warn/40 bg-warn/5 text-warn" : "border-line bg-surface"}`}>{live}</div>
      <Card title="التصريح">
        <div className="space-y-2.5">
          <Pick items={TYPES} value={b.type} onChange={(type) => put({ type, controls: {} })} />
          <TextField label="المكان" value={b.location} onChange={(v) => put({ location: v })} />
          <AreaField label="وصف العمل" value={b.work} onChange={(v) => put({ work: v })} rows={2} />
          <Grid2>
            <label className="block"><span className="block text-[12px] text-ink-2 mb-1">يبدأ</span>
              <input type="time" dir="ltr" value={b.start} onChange={(e) => put({ start: e.target.value })} className="w-full h-12 px-3 rounded-xl bg-canvas border border-line-2 font-grotesk text-[15px]" /></label>
            <NumField label="المدة" unit="ساعة" value={b.hours} onChange={(v) => put({ hours: v })} rule={{ min: 0.5, max: 24 }} />
          </Grid2>
        </div>
      </Card>
      <Card title="المخاطر والاحتياطات">
        <div className="space-y-2">
          {CONTROLS[b.type].map((x) => (
            <div key={x} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 text-[13px] leading-snug">{x}</span>
              {(["y", "n", "na"] as const).map((v) => (
                <button key={v} type="button" aria-pressed={b.controls[x] === v} onClick={() => put({ controls: { ...b.controls, [x]: v } })}
                  className={`shrink-0 w-11 h-10 rounded-lg border text-[12px] ${b.controls[x] === v ? (v === "n" ? "bg-bad/10 border-bad/50" : "bg-wash border-accent/40") : "bg-surface border-line-2"}`}>{v === "y" ? "✓" : v === "n" ? "✗" : "—"}</button>
              ))}
            </div>
          ))}
        </div>
      </Card>
      {b.type === "excavation" && <Card title="حاسبة الحفر">
        <Grid2>
          <NumField label="العمق" unit="m" value={cv("depth")} onChange={setC("depth")} />
          <NumField label="عرض القاع" unit="m" value={cv("base")} onChange={setC("base")} />
          <NumField label="طول الحفر" unit="m" value={cv("len")} onChange={setC("len")} />
        </Grid2>
        <div className="mt-2 space-y-2">
          <Pick label="التربة" items={[["rock", "صخر ثابت"], ["A", "A متماسكة"], ["B", "B"], ["C", "C مفككة"]]} value={(cv("soil") || "B") as any} onChange={setC("soil")} />
          <Check label="مياه أو رشح" on={cv("water") === "y"} onChange={(v) => setC("water")(v ? "y" : "")} />
          <Check label="احتمال غازات" on={cv("gas") === "y"} onChange={(v) => setC("gas")(v ? "y" : "")} />
        </div>
      </Card>}
      {b.type === "height" && <Card title="حاسبة السقوط والسلالم">
        <Pick items={[["en", "EN 355"], ["osha", "OSHA"]]} value={(cv("std") || "en") as any} onChange={setC("std")} />
        <div className="mt-2"><Grid2>
          <NumField label="طول الحبل" unit="m" value={cv("lanyard")} onChange={setC("lanyard")} hint="افتراضي 1.8" />
          <NumField label="امتداد الممتص" unit="m" value={cv("absorber")} onChange={setC("absorber")} hint="افتراضي 1.75" />
          <NumField label="نقطة التثبيت فوق القدم" unit="m" value={cv("anchor")} onChange={setC("anchor")} hint="0 = الأسوأ" />
          <NumField label="الخلوص المتاح أسفل سطح العمل" unit="m" value={cv("avail")} onChange={setC("avail")} />
          <NumField label="ارتفاع السلم" unit="m" value={cv("ladderH")} onChange={setC("ladderH")} />
        </Grid2></div>
      </Card>}
      {b.type === "lifting" && <Card title="مسافة خطوط الكهرباء">
        <NumField label="جهد الخط (اتركه فارغًا إن لم يُعرف)" unit="kV" value={cv("kv")} onChange={setC("kv")} />
      </Card>}
      {c.rows.length > 0 && <Rows rows={c.rows} />}
      {c.checks.length > 0 && <Checks items={c.checks as any} />}
      {c.block && <Note tone="warn">{c.block}</Note>}
      {(needsGas(b.type) || b.gas.length > 0) && <Card title="قياسات الغاز">
        <RowCards<Gas> rows={b.gas} onChange={(gas) => put({ gas })} addLabel="قياس جديد" blank={() => ({ at: new Date().toTimeString().slice(0, 5), o2: "20.9", lel: "0", h2s: "0", co: "0" })}
          summary={(g) => `${g.at} · O₂ ${g.o2} · LEL ${g.lel} · ${gasOf(g).ok ? "✓ آمن" : "✗ غير آمن"}`}
          render={(g, s) => <Grid2>
            <TextField label="الوقت" dir="ltr" value={g.at} onChange={(v) => s({ ...g, at: v })} />
            <NumField label="O₂" unit="%" value={g.o2} onChange={(v) => s({ ...g, o2: v })} hint="19.5–23.5" />
            <NumField label="LEL" unit="%" value={g.lel} onChange={(v) => s({ ...g, lel: v })} hint="< 10" />
            <NumField label="H₂S" unit="ppm" value={g.h2s} onChange={(v) => s({ ...g, h2s: v })} hint="< 1 ⚑" />
            <NumField label="CO" unit="ppm" value={g.co} onChange={(v) => s({ ...g, co: v })} hint="< 25" />
          </Grid2>} />
        <Note>كل قياس صالح ساعتين ⚑ — قياس فاشل يوقف التصريح.</Note>
      </Card>}
      <Card title="التوقيعات">
        <Grid2>
          <TextField label="مُصدِر التصريح" value={b.issuer} onChange={(v) => put({ issuer: v })} />
          <TextField label="المنفّذ المسؤول" value={b.performer} onChange={(v) => put({ performer: v })} />
          <TextField label="مستلم التصريح" value={b.acceptor} onChange={(v) => put({ acceptor: v })} />
        </Grid2>
        <div className="mt-2"><Check label="وُقّع ورقيًا من الأطراف الثلاثة" on={b.paperSigned} onChange={(v) => put({ paperSigned: v })} /></div>
      </Card>
      {b.state === "draft" && (
        <button type="button" disabled={ro || missing.length > 0} onClick={() => put({ state: "authorised", authorisedAt: Date.now() })} className="press w-full min-h-12 rounded-xl btn-primary text-[14px] font-medium disabled:opacity-40">تصريح العمل</button>
      )}
      {b.state === "draft" && missing.length > 0 && <Note>ينقص: {missing.join("، ")}</Note>}
      {b.state === "authorised" && (
        <Card title="إغلاق التصريح">
          <AreaField label="ملاحظات الإغلاق (الموقع آمن ونظيف)" value={b.closeNote} onChange={(v) => put({ closeNote: v })} rows={2} />
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => put({ state: "closed" })} className="press flex-1 min-h-12 rounded-xl bg-surface border border-line-2 text-[13.5px]">إغلاق</button>
            <button type="button" onClick={() => put({ state: "cancelled", cancelReason: b.closeNote })} className="press flex-1 min-h-12 rounded-xl bg-surface border border-bad/40 text-bad text-[13.5px]">إلغاء</button>
          </div>
        </Card>
      )}
    </div>
  );
}

function build(doc: ToolDoc<Body>, project: any) {
  const b = doc.body;
  const st = status(doc);
  const c = calcOut(b);
  const word = st.valid ? "ساري" : b.state === "draft" ? STATE_WORD.draft : st.reason === "expired" ? "منتهي" : STATE_WORD[st.state as PtwState];
  const blocks: DocBlock[] = [
    { k: "kpis", items: [{ label: "الحالة", value: word, mark: st.valid ? "ok" : "fail" }, { label: "يبدأ", value: b.start }, { label: "المدة", value: b.hours, unit: "h" }] },
    { k: "kv", cols: 2, rows: [
      { label: "النوع", value: (TYPES.find((t) => t[0] === b.type) || TYPES[0])[1] }, { label: "المكان", value: b.location || "—" },
      { label: "وصف العمل", value: b.work || "—", wide: true },
    ] },
    { k: "checks", rows: CONTROLS[b.type].map((x) => ({ label: x, value: b.controls[x] === "y" ? "تم" : b.controls[x] === "n" ? "لم يتم" : b.controls[x] === "na" ? "لا ينطبق" : "—", limit: "مطلوب", clause: "PTW", ok: b.controls[x] === "y" ? true : b.controls[x] === "n" ? false : null })) },
  ];
  if (c.rows.length) blocks.push({ k: "kv", cols: 2, rows: c.rows.map(([l, v, u]) => ({ label: l, value: iso(u ? `${v} ${u}` : v) })) });
  if (c.checks.length) blocks.push({ k: "checks", rows: (c.checks as any[]).map((x) => ({ label: x.label, value: x.value, limit: x.limit, clause: x.clause || "OSHA / EN", ok: x.ok })) });
  if (b.gas.length)
    blocks.push({
      k: "table", id: "gas", caption: "قياسات الغاز", cols: [
        { key: "at", label: "الوقت", wMm: 24, align: "center" }, { key: "o2", label: "O₂ %", wMm: 26, align: "end" }, { key: "lel", label: "LEL %", wMm: 26, align: "end" },
        { key: "h2s", label: "H₂S ppm", wMm: 26, align: "end" }, { key: "co", label: "CO ppm", wMm: 26, align: "end" }, { key: "r", label: "النتيجة", wMm: 46, align: "center", mark: true },
      ],
      rows: b.gas.map((g) => ({ cells: { at: iso(g.at), o2: iso(g.o2), lel: iso(g.lel), h2s: iso(g.h2s), co: iso(g.co) }, mark: gasOf(g).ok ? "ok" : "fail" })),
    });
  blocks.push({ k: "kv", cols: 3, rows: [{ label: "مُصدِر التصريح", value: b.issuer || "—" }, { label: "المنفّذ", value: b.performer || "—" }, { label: "المستلم", value: b.acceptor || "—" }] });
  if (b.closeNote) blocks.push({ k: "notes", title: b.state === "cancelled" ? "سبب الإلغاء" : "الإغلاق", text: b.closeNote });
  return buildSpec({ doc, meta: module, project, sections: [{ orientation: "portrait", blocks }], signRoles: ["issuer", "siteEngineer", "acceptor"] });
}

export const module: ToolModule<Body> = {
  kind: "workPermit", v: 1, docType: "PTW", docTypeName: "تصريح عمل · Permit to work", discipline: "سلامة", engine: PTW_ENGINE,
  profile: { id: "hse-intl@1", edition: "OSHA 1926 · EN 355 · HSG250", values: { gasValidH: 2 }, overridden: [], unverified: ["gasValidH", "h2s"] },
  blank,
  defaultTitle: () => "تصريح عمل",
  Editor,
  build,
  summary: (doc) => {
    const st = status(doc);
    return [`تصريح عمل · ${(TYPES.find((t) => t[0] === doc.body.type) || TYPES[0])[1]}`, doc.body.location, st.valid ? `ساري حتى ⁦${(st as any).untilIso?.slice(11, 16)}⁩` : "غير ساري", "راجع المستند الكامل"].filter(Boolean).join("\n");
  },
};
