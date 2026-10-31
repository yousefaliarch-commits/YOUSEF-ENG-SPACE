// =====================================================================
//  فحص القطاعات الخرسانية — RC section review sheet (W4): one card per member (beam or one-way slab strip), each with its
//  section drawing, utilisation, checks with clauses, a reviewer's notes and the full working. Engine: domain/tools/rc-calc.ts.
//  · ACI 318-19: every step prints its clause. ECP 203-2020: transcribed constants, every result «ضمن الحد ⚑» until the
//    printed code is checked (docs/TOOLS-BLUEPRINT.md → rcSection). Engineers and owners only — never a site supervisor.
//  · Not a design: a review of a section someone already sized. «ليس للتنفيذ دون توقيع المهندس الإنشائي».
// =====================================================================
import { numInputParse } from "../../../lib/num-input";
import { RC_ENGINE, SUPPORT_LABEL, checkRc, type RcCode, type RcIn, type RcKind, type RcOut, type RcSupport } from "../../../domain/tools/rc-calc";
import type { BasisRow, DocBlock, DocRow, VPath } from "../../../doc/model";
import { fmtNum, iso } from "../../../doc/text";
import type { ToolDoc } from "../../../data/tool-docs";
import { Card, Checks, Grid2, Note, NumField, Pick, ResultHero, RowCards, TextField, Working } from "../../../ui/kit";
import type { ToolModule } from "../module";
import { buildSpec } from "../spec";

type Member = {
  tag: string; kind: RcKind; b: string; h: string; cover: string;
  nT: string; dT: string; sT: string; layers: "1" | "2"; nC: string; dC: string;
  dS: string; legs: string; sS: string;
  mu: string; vu: string; span: string; support: RcSupport;
};
type Body = { code: RcCode; fc: string; fy: string; fyt: string; agg: string; members: Member[] };

const N = (s: string) => numInputParse(s || "") ?? 0;
const ACI = "aci318-19";

const DEFAULTS: Record<RcCode, Pick<Body, "fc" | "fy" | "fyt">> = {
  "aci318-19": { fc: "28", fy: "420", fyt: "420" },
  "ecp203-2020": { fc: "30", fy: "360", fyt: "240" },
};

const blankM = (kind: RcKind = "beam"): Member => ({
  tag: "", kind, b: kind === "beam" ? "250" : "1000", h: kind === "beam" ? "600" : "150", cover: kind === "beam" ? "25" : "20",
  nT: "3", dT: kind === "beam" ? "16" : "10", sT: "200", layers: "1", nC: "2", dC: "12",
  dS: "8", legs: "2", sS: "150", mu: "", vu: "", span: "", support: "simple",
});

export const inputOf = (b: Body, m: Member): RcIn => ({
  code: b.code, kind: m.kind, b: N(m.b), h: N(m.h), cover: N(m.cover), fc: N(b.fc), fy: N(b.fy), fyt: N(b.fyt) || N(b.fy),
  nT: N(m.nT), dT: N(m.dT), sT: N(m.sT), layers: m.layers === "2" ? 2 : 1, nC: N(m.nC), dC: N(m.dC),
  dS: N(m.dS), legs: N(m.legs), sS: N(m.sS), mu: N(m.mu), vu: N(m.vu), span: N(m.span), support: m.support, agg: N(b.agg) || 20,
});

const verdict = (o: RcOut) => {
  if (!o.ready) return "—";
  if (!o.ok) return "غير مطابق";
  const warn = o.checks.some((c) => c.ok === false);
  return o.flagged ? (warn ? "ضمن الحد ⚑ مع تنبيهات" : "ضمن الحد ⚑") : warn ? "مطابق مع تنبيهات" : "مطابق";
};
const bars = (m: Member) => (m.kind === "slab" ? `Ø${m.dT} @ ${m.sT}` : `${m.nT} Ø${m.dT}${m.layers === "2" ? " (2L)" : ""}`);
const sizeOf = (m: Member) => (m.kind === "slab" ? `h ${m.h}` : `${m.b} × ${m.h}`);
const kindName = (k: RcKind) => (k === "beam" ? "كمرة" : "بلاطة (شريحة 1 م)");
const util = (x: number) => (Number.isFinite(x) ? Math.round(x * 100) : 0);

// ---- the section, drawn: outline, stirrup, bars (screen SVG and PDF sketch share the geometry) ----
function sectionPaths(m: Member, o: RcOut, maxW = 46, maxH = 40): { w: number; h: number; paths: VPath[] } {
  const slab = m.kind === "slab";
  const B = slab ? 1000 : N(m.b), H = N(m.h);
  if (!(B > 0 && H > 0)) return { w: 0, h: 0, paths: [] };
  const k = Math.min(maxW / B, maxH / H);
  const W = B * k, Hh = H * k;
  const f = (x: number) => x.toFixed(2);
  const dot = (x: number, y: number, dia: number) => {
    const rr = Math.max((dia * k) / 2, 0.45);
    return { d: `M${f(x - rr)} ${f(y)} a${f(rr)} ${f(rr)} 0 1 0 ${f(2 * rr)} 0 a${f(rr)} ${f(rr)} 0 1 0 ${f(-2 * rr)} 0`, fill: true };
  };
  const paths: VPath[] = [{ d: `M0 0 H${f(W)} V${f(Hh)} H0 Z` }];
  const cv = N(m.cover) * k, ds = slab ? 0 : N(m.dS) * k, dT = N(m.dT);
  if (!slab) paths.push({ d: `M${f(cv)} ${f(cv)} H${f(W - cv)} V${f(Hh - cv)} H${f(cv)} Z`, dash: [0.8, 0.6] });
  if (slab) {
    const s = N(m.sT);
    if (s > 0) for (let x = s / 2; x < B; x += s) paths.push(dot(x * k, H * k - (N(m.cover) + dT / 2) * k, dT));
  } else {
    const n = Math.max(0, Math.round(N(m.nT)));
    const n1 = m.layers === "2" ? Math.ceil(n / 2) : n;
    const n2 = n - n1;
    const row = (count: number, y: number, dia: number) => {
      const x0 = cv + ds + (dia * k) / 2, x1 = W - cv - ds - (dia * k) / 2;
      for (let j = 0; j < count; j++) paths.push(dot(count === 1 ? W / 2 : x0 + ((x1 - x0) * j) / (count - 1), y, dia));
    };
    // y runs down from the compression face: the first tension layer sits at dt, the second one bar + 25 mm clear above it
    row(n1, o.geo.dt * k, dT);
    if (n2) row(n2, (o.geo.dt - (dT + Math.max(25, dT))) * k, dT);
    const nc = Math.max(0, Math.round(N(m.nC)));
    if (nc) row(nc, o.geo.dp * k, N(m.dC));
  }
  paths.push({ d: `M0 ${f(Hh + 2.2)} H${f(W)}`, label: { x: W / 2, y: Hh + 5.2, t: slab ? "1000 mm" : `b = ${m.b}` } });
  paths.push({ d: `M${f(W + 2.2)} 0 V${f(Hh)}`, label: { x: W + 9, y: Hh / 2 + 1, t: `h = ${m.h}` } });
  return { w: W + 16, h: Hh + 7, paths };
}

function SectionSvg({ m, o }: { m: Member; o: RcOut }) {
  const g = sectionPaths(m, o);
  if (!g.w) return null;
  return (
    <svg viewBox={`-1 -1 ${g.w + 2} ${g.h + 2}`} className="w-40 h-auto text-ink" role="img" aria-label="رسم القطاع" data-rc-sketch>
      {g.paths.map((p, i) => (
        <g key={i}>
          <path d={p.d} fill={p.fill ? "currentColor" : "none"} stroke="currentColor" strokeWidth={0.35} strokeDasharray={p.dash ? p.dash.join(" ") : undefined} />
          {p.label && <text x={p.label.x} y={p.label.y} fontSize={3.2} textAnchor="middle" fill="currentColor" direction="ltr">{p.label.t}</text>}
        </g>
      ))}
    </svg>
  );
}

function Editor({ body: b, set, ctx }: { body: Body; set: (b: Body) => void; ctx: any }) {
  const ro = ctx.readOnly;
  const put = (p: Partial<Body>) => !ro && set({ ...b, ...p });
  const res = b.members.map((m) => checkRc(inputOf(b, m)));
  const ready = res.filter((o) => o.ready);
  const fails = ready.filter((o) => !o.ok).length;
  const worst = ready.reduce((x, o) => Math.max(x, o.flex.util, o.shear.util), 0);
  const aci = b.code === ACI;
  const switchCode = (code: RcCode) => {
    const untouched = (["fc", "fy", "fyt"] as const).every((k) => b[k] === DEFAULTS[b.code][k]);
    put({ code, ...(untouched ? DEFAULTS[code] : {}) });
  };
  return (
    <div className="space-y-3">
      <ResultHero
        label="أعلى نسبة استغلال"
        value={ready.length ? String(util(worst)) : "—"}
        unit="%"
        sub={`${b.members.length} عنصر · ${ready.length - fails} ${aci ? "مطابق" : "ضمن الحد ⚑"} · ${fails} يحتاج مراجعة`}
        tone={fails ? "bad" : "accent"}
      />
      <Card title="الكود والمواد">
        <Pick label="الكود" items={[[ACI, "ACI 318-19"], ["ecp203-2020", "ECP 203-2020 ⚑"]]} value={b.code} onChange={switchCode} />
        <div className="mt-2.5">
          <Grid2>
            <NumField label={aci ? "مقاومة الخرسانة f′c (أسطوانة)" : "مقاومة الخرسانة fcu (مكعب)"} unit="MPa" value={b.fc} onChange={(v) => put({ fc: v })} />
            <NumField label="إجهاد خضوع الحديد الرئيسي fy" unit="MPa" value={b.fy} onChange={(v) => put({ fy: v })} />
            <NumField label="إجهاد خضوع الكانات fyt" unit="MPa" value={b.fyt} onChange={(v) => put({ fyt: v })} />
            <NumField label="أكبر مقاس للركام" unit="mm" value={b.agg} onChange={(v) => put({ agg: v })} />
          </Grid2>
        </div>
      </Card>
      {!aci && <Note tone="warn">قيم ECP 203 في هذه الأداة منقولة ولم تُراجع على النص المطبوع بعد ⚑ — النتيجة «ضمن الحد ⚑» وليست «مطابق». للاعتماد: ACI 318-19 أو مراجعة المهندس الإنشائي.</Note>}
      <RowCards<Member>
        rows={b.members}
        onChange={(members) => put({ members })}
        blank={() => blankM()}
        addLabel="عنصر جديد"
        max={60}
        summary={(m, i) => `${m.tag || `${m.kind === "beam" ? "B" : "S"}${i + 1}`} · ${sizeOf(m)} · ${bars(m)} · ${res[i].ready ? `${util(Math.max(res[i].flex.util, res[i].shear.util))} % · ${verdict(res[i])}` : "—"}`}
        render={(m, s, i) => {
          const o = res[i];
          const slab = m.kind === "slab";
          return (
            <>
              <Grid2>
                <TextField label="رمز العنصر" dir="ltr" value={m.tag} onChange={(v) => s({ ...m, tag: v })} placeholder="B12" />
                <Pick items={[["beam", "كمرة"], ["slab", "بلاطة"]]} value={m.kind} onChange={(kind) => s({ ...blankM(kind), tag: m.tag, mu: m.mu, vu: m.vu, span: m.span, support: m.support })} />
              </Grid2>
              <p className="text-[12px] text-ink-2">القطاع</p>
              <Grid2>
                {!slab && <NumField label="العرض b" unit="mm" value={m.b} onChange={(v) => s({ ...m, b: v })} />}
                <NumField label="الارتفاع الكلي h" unit="mm" value={m.h} onChange={(v) => s({ ...m, h: v })} />
                <NumField label={slab ? "الغطاء للحديد" : "الغطاء للكانة"} unit="mm" value={m.cover} onChange={(v) => s({ ...m, cover: v })} />
              </Grid2>
              <p className="text-[12px] text-ink-2">حديد الشد {slab ? "(لكل متر)" : ""}</p>
              <Grid2>
                {!slab && <NumField label="العدد" value={m.nT} onChange={(v) => s({ ...m, nT: v })} rule={{ integer: true, min: 1 }} />}
                <NumField label="القطر Ø" unit="mm" value={m.dT} onChange={(v) => s({ ...m, dT: v })} />
                {slab && <NumField label="التباعد" unit="mm" value={m.sT} onChange={(v) => s({ ...m, sT: v })} />}
              </Grid2>
              {!slab && <Pick items={[["1", "طبقة واحدة"], ["2", "طبقتان"]]} value={m.layers} onChange={(layers) => s({ ...m, layers })} />}
              {!slab && (
                <>
                  <p className="text-[12px] text-ink-2">حديد الضغط والكانات</p>
                  <Grid2>
                    <NumField label="حديد ضغط — العدد" value={m.nC} onChange={(v) => s({ ...m, nC: v })} rule={{ integer: true, min: 0 }} />
                    <NumField label="حديد ضغط — Ø" unit="mm" value={m.dC} onChange={(v) => s({ ...m, dC: v })} />
                    <NumField label="الكانة Ø" unit="mm" value={m.dS} onChange={(v) => s({ ...m, dS: v })} />
                    <NumField label="عدد الأفرع" value={m.legs} onChange={(v) => s({ ...m, legs: v })} rule={{ integer: true, min: 2 }} />
                    <NumField label="تباعد الكانات" unit="mm" value={m.sS} onChange={(v) => s({ ...m, sS: v })} />
                  </Grid2>
                </>
              )}
              <p className="text-[12px] text-ink-2">القوى التصميمية والبحر</p>
              <Grid2>
                <NumField label="العزم التصميمي Mu" unit="kN·m" value={m.mu} onChange={(v) => s({ ...m, mu: v })} />
                <NumField label="القص التصميمي Vu" unit="kN" value={m.vu} onChange={(v) => s({ ...m, vu: v })} hint="عند القطاع الحرج" />
                <NumField label="البحر" unit="m" value={m.span} onChange={(v) => s({ ...m, span: v })} />
              </Grid2>
              <Pick label="الارتكاز" items={(Object.keys(SUPPORT_LABEL) as RcSupport[]).map((k) => [k, SUPPORT_LABEL[k]] as [RcSupport, string])} value={m.support} onChange={(support) => s({ ...m, support })} />
              {o.ready && (
                <div className="space-y-2.5" data-rc-result={o.ok ? "ok" : "fail"}>
                  <div className="flex items-start gap-3">
                    <SectionSvg m={m} o={o} />
                    <ul className="min-w-0 flex-1 text-[12px] space-y-1">
                      <li>{aci ? "φMn" : "Mu,cap"} <bdi dir="ltr" className="font-grotesk">{fmtNum(o.flex.cap, 1)} kN·m</bdi> · <bdi dir="ltr" className="font-grotesk">{util(o.flex.util)} %</bdi></li>
                      <li>{aci ? "φVn" : "Qu,cap"} <bdi dir="ltr" className="font-grotesk">{fmtNum(o.shear.cap, 1)} kN</bdi> · <bdi dir="ltr" className="font-grotesk">{util(o.shear.util)} %</bdi></li>
                      <li>d <bdi dir="ltr" className="font-grotesk">{fmtNum(o.geo.d, 1)}</bdi> · As <bdi dir="ltr" className="font-grotesk">{fmtNum(o.geo.as, 0)} mm²</bdi></li>
                      <li>εt <bdi dir="ltr" className="font-grotesk">{fmtNum(o.flex.epsT, 4)}</bdi>{aci && <> · φ <bdi dir="ltr" className="font-grotesk">{fmtNum(o.flex.phi, 3)}</bdi></>}</li>
                      <li className={o.ok ? "text-good font-medium" : "text-bad font-medium"}>{verdict(o)}</li>
                    </ul>
                  </div>
                  <Checks items={o.checks} />
                  {o.advice.length > 0 && (
                    <div className="p-3 rounded-xl border border-warn/30 bg-warn/5 text-[12.5px] space-y-1" data-rc-advice>
                      <p className="font-medium">ملاحظات المراجعة</p>
                      {o.advice.map((a, j) => <p key={j} className="leading-relaxed">• {a}</p>)}
                    </div>
                  )}
                  <Working steps={o.trace} />
                </div>
              )}
            </>
          );
        }}
      />
      <Note>مراجعة قطاع محدد الأبعاد والتسليح — ليست تصميمًا ولا تغني عن حساب المنشأ. ليس للتنفيذ دون مراجعة وتوقيع المهندس الإنشائي المسؤول.</Note>
    </div>
  );
}

const noFlag = (s?: string) => (s || "").replace(/\s*⚑\s*$/, "");

function build(doc: ToolDoc<Body>, project: any) {
  const b = doc.body;
  const aci = b.code === ACI;
  const res = b.members.map((m) => checkRc(inputOf(b, m)));
  const capLabel = aci ? "φMn" : "Mu,cap";
  const vLabel = aci ? "φVn" : "Qu,cap";
  const rows: DocRow[] = b.members.map((m, i) => {
    const o = res[i];
    return {
      cells: {
        tag: iso(m.tag || `${m.kind === "beam" ? "B" : "S"}${i + 1}`), kind: kindName(m.kind), size: iso(sizeOf(m)), bars: iso(bars(m)),
        st: iso(m.kind === "slab" ? "—" : `${m.legs}L Ø${m.dS} @ ${m.sS}`),
        mu: o.ready ? N(m.mu) : null, cap: o.ready ? o.flex.cap : null, um: o.ready && N(m.mu) ? (N(m.mu) / o.flex.cap) * 100 : null,
        vu: o.ready ? N(m.vu) : null, vcap: o.ready ? o.shear.cap : null, uv: o.ready && N(m.vu) ? (N(m.vu) / o.shear.cap) * 100 : null,
        res: verdict(o),
      },
      mark: o.ready ? (o.ok ? "ok" : "fail") : "na",
    };
  });
  const blocks: DocBlock[] = [
    { k: "kv", cols: 3, rows: [
      { label: "الكود", value: iso(aci ? "ACI 318-19 (SI)" : "ECP 203-2020 ⚑") },
      { label: aci ? "f′c" : "fcu", value: iso(`${b.fc} MPa`) },
      { label: "fy / fyt", value: iso(`${b.fy} / ${b.fyt} MPa`) },
      { label: "الطريقة", value: aci ? "مقاومة القطاع، توافق الانفعالات" : "حالات الحدود القصوى" },
      { label: "الركام", value: iso(`${b.agg || 20} mm`) },
      { label: "العناصر", value: iso(String(b.members.length)) },
    ] },
    {
      k: "table", id: "rc", caption: "ملخص العناصر", grid: true,
      cols: [
        { key: "tag", label: "العنصر", wMm: 14, align: "center" }, { key: "kind", label: "النوع", wMm: 22, align: "start" },
        { key: "size", label: "القطاع", unit: "mm", wMm: 20, align: "center" }, { key: "bars", label: "حديد الشد", wMm: 22, align: "center" },
        { key: "st", label: "الكانات", wMm: 24, align: "center" },
        { key: "mu", label: "Mu", unit: "kN·m", wMm: 15, align: "end", num: { dp: 1 } }, { key: "cap", label: capLabel, unit: "kN·m", wMm: 16, align: "end", num: { dp: 1 } },
        { key: "um", label: "استغلال", unit: "%", wMm: 15, align: "end", num: { dp: 0 }, xl: { f: "{mu}/{cap}*100" } },
        { key: "vu", label: "Vu", unit: "kN", wMm: 14, align: "end", num: { dp: 1 } }, { key: "vcap", label: vLabel, unit: "kN", wMm: 16, align: "end", num: { dp: 1 } },
        { key: "uv", label: "استغلال", unit: "%", wMm: 15, align: "end", num: { dp: 0 }, xl: { f: "{vu}/{vcap}*100" } },
        { key: "res", label: "النتيجة", wMm: 28, align: "center", mark: true },
      ],
      rows,
    },
  ];
  b.members.forEach((m, i) => {
    const o = res[i];
    if (!o.ready) return;
    const tag = m.tag || `${m.kind === "beam" ? "B" : "S"}${i + 1}`;
    // the canvas drops LRI/PDI, so «300 × 600» inside an Arabic heading would flip: the figures go in their own (Latin) cells
    blocks.push({ k: "heading", num: String(i + 1), text: `${tag} — ${kindName(m.kind)}` });
    blocks.push({ k: "kv", cols: 3, rows: [
      { label: "القطاع", value: iso(m.kind === "slab" ? `1000 × ${m.h} mm` : `${m.b} × ${m.h} mm`) },
      { label: "حديد الشد", value: iso(bars(m)) },
      { label: m.kind === "slab" ? "الغطاء" : "الكانات", value: iso(m.kind === "slab" ? `${m.cover} mm` : `${m.legs}L Ø${m.dS} @ ${m.sS}`) },
      { label: "Mu / Vu", value: iso(`${m.mu || 0} kN·m / ${m.vu || 0} kN`) },
      { label: "البحر", value: iso(N(m.span) ? `${m.span} m` : "—") },
      { label: "الارتكاز", value: SUPPORT_LABEL[m.support] },
    ] });
    const g = sectionPaths(m, o, 46, 34);
    if (g.w) blocks.push({ k: "sketch", wMm: g.w, hMm: g.h, paths: g.paths, caption: `${tag} — ${aci ? "القطاع" : "القطاع ⚑"}` });
    blocks.push({ k: "kpis", items: [
      { label: capLabel, value: fmtNum(o.flex.cap, 1), unit: "kN·m", mark: o.flex.util <= 1 ? "ok" : "fail" },
      { label: vLabel, value: fmtNum(o.shear.cap, 1), unit: "kN", mark: o.shear.util <= 1 ? "ok" : "fail" },
      { label: "εt", value: fmtNum(o.flex.epsT, 4), mark: o.checks.find((c) => c.id === "duct")?.ok === false ? "fail" : "ok" },
      { label: "d", value: fmtNum(o.geo.d, 1), unit: "mm" },
    ] });
    blocks.push({ k: "checks", rows: o.checks.map((c) => ({ label: c.label, value: c.value, limit: c.limit, clause: noFlag(c.clause), ok: c.ok, unverified: c.unverified })) });
    if (o.advice.length) blocks.push({ k: "notes", title: "ملاحظات المراجعة", text: o.advice.map((a) => `• ${a}`).join("\n") });
    blocks.push({
      k: "table", id: `trace-${i}`, caption: `طريقة الحساب — ${tag}`, grid: true,
      cols: [
        { key: "s", label: "الخطوة", wMm: 46, align: "start" }, { key: "e", label: "المعادلة والتعويض", wMm: 78, align: "start" },
        { key: "v", label: "النتيجة", wMm: 28, align: "end" }, { key: "c", label: "المرجع", wMm: 30, align: "start" },
      ],
      rows: o.trace.map((t) => ({ cells: { s: t.label, e: iso(t.expr), v: iso(t.value), c: noFlag(t.clause) || "—" } })),
    });
  });
  blocks.push({ k: "notes", title: "حدود الأداة", text: "مراجعة قطاع مستطيل محدد الأبعاد والتسليح (انحناء أحادي أو مزدوج، قص، حدود التسليح والتباعد، البحر / العمق). لا تشمل اللي، القوى المحورية، الترخيم المحسوب، ولا عرض الشروخ وفق ECP. ليس للتنفيذ دون مراجعة وتوقيع المهندس الإنشائي المسؤول." });
  const basis: BasisRow[] = aci
    ? [
        { key: "es", label: "معامل مرونة الحديد Es", value: "200000", unit: "MPa", source: "ACI 318-19", clause: "20.2.2.2", conf: "H", flagged: false },
        { key: "ecu", label: "أقصى انفعال للخرسانة", value: "0.003", source: "ACI 318-19", clause: "22.2.2.1", conf: "H", flagged: false },
        { key: "blk", label: "كتلة الإجهاد", value: "0.85 f′c · β1", source: "ACI 318-19", clause: "22.2.2.4", conf: "H", flagged: false },
        { key: "phi", label: "معاملات الخفض φ", value: "0.90 / 0.65 / 0.75", source: "ACI 318-19", clause: "Table 21.2.1 · 21.2.2", conf: "H", flagged: false },
        { key: "lam", label: "خرسانة عادية الوزن λ", value: "1.0", source: "ACI 318-19", clause: "19.2.4", conf: "H", flagged: false },
      ]
    : [
        { key: "gc", label: "معامل أمان الخرسانة γc", value: "1.5", source: "ECP 203", conf: "H", flagged: false },
        { key: "gs", label: "معامل أمان الحديد γs", value: "1.15", source: "ECP 203", conf: "H", flagged: false },
        { key: "blk", label: "كتلة الإجهاد", value: "0.67 fcu/γc · 0.8c", source: "ECP 203 (منقول)", conf: "M", flagged: true },
        { key: "cmax", label: "أقصى عمق لمحور التعادل", value: "2/3 c_b", source: "ECP 203 (منقول)", conf: "M", flagged: true },
        { key: "qcu", label: "مقاومة الخرسانة للقص", value: "0.24 / 0.16 √(fcu/γc)", source: "ECP 203 (منقول)", conf: "M", flagged: true },
        { key: "min", label: "الحدود الدنيا للتسليح والكانات", value: "—", source: "ECP 203 (منقول)", conf: "L", flagged: true },
      ];
  return buildSpec({
    doc, meta: module, project, sections: [{ orientation: "portrait", blocks }], signRoles: ["prepared", "checked", "approved"],
    basis: { rows: basis, formulas: [] },
  });
}

export const module: ToolModule<Body> = {
  kind: "rcSection", v: 1, docType: "RCS", docTypeName: "مراجعة القطاعات الخرسانية · RC section review", discipline: "إنشائي", engine: RC_ENGINE,
  profile: { id: "aci318-19@1", edition: "ACI 318-19 / ECP 203-2020", values: {}, overridden: [], unverified: ["ecp203-constants"] },
  blank: () => ({ code: ACI, ...DEFAULTS[ACI], agg: "20", members: [blankM()] }),
  defaultTitle: () => "مراجعة القطاعات الخرسانية",
  Editor,
  build,
  summary: (doc) => {
    const res = doc.body.members.map((m) => checkRc(inputOf(doc.body, m)));
    const ready = res.filter((o) => o.ready);
    return [
      `مراجعة القطاعات · ⁦${doc.body.members.length}⁩ عنصر · ${doc.body.code === ACI ? "ACI 318-19" : "ECP 203 ⚑"}`,
      `مطابق ⁦${ready.filter((o) => o.ok).length}⁩ · يحتاج مراجعة ⁦${ready.filter((o) => !o.ok).length}⁩`,
      "ليس للتنفيذ دون توقيع المهندس الإنشائي",
    ].join("\n");
  },
};
