// =====================================================================
//  جدول تفريد وقص الحديد — bar bending schedule + 12 m cutting plan (screen + PDF). Engine: src/domain/tools/bbs-calc.ts
//  · Lines are cards (360 px phones); the schedule PDF is A4 landscape with a mini-sketch per line, the summary by Ø and
//    one bar diagram per cutting pattern (12 m drawn 225 mm wide), scrap hatched, remnants tagged R-nn.
//  · The cutting plan runs on demand and is stored with a hash of its inputs: when the lines change, it says it is stale.
// =====================================================================
import { useMemo } from "react";
import { numInputParse } from "../../../lib/num-input";
import {
  BBS_DIAMETERS, BBS_ENGINE, BBS_GRADES, BBS_SHAPES, bbsLd, bbsLine, bbsSummary, cutPieces, cutPlan, gradeOf, shapeOf,
  type BbsDims, type BbsLine, type BbsShape, type CutPlan,
} from "../../../domain/tools/bbs-calc";
import { canonical } from "../../../doc/hash";
import type { DocBlock, DocRow, VPath } from "../../../doc/model";
import { fmtNum, iso } from "../../../doc/text";
import type { ToolDoc } from "../../../data/tool-docs";
import { Card, Checks, Grid2, Note, NumField, Pick, ResultHero, RowCards, Rows, TextField, Working } from "../../../ui/kit";
import type { ToolModule } from "../module";
import { buildSpec } from "../spec";

type Line = {
  member: string; mark: string; d: number; shape: BbsShape; dims: Record<string, string>; segs: { len: string; angle: string }[];
  nMembers: string; nPer: string; pos: "top" | "other" | "unknown"; lap: "auto" | "staggered" | "typed"; lapMm: string;
};
type Body = {
  group: string; drawingRef: string; drawingRev: string; grade: string; fcu: string; rounding: "0" | "5" | "10" | "25"; stockM: string; minRem: string;
  lines: Line[];
  plan?: Record<string, CutPlan>; planHash?: string;
};

const N = (s: string, rule = {}) => numInputParse(s || "", rule);

const blankLine = (prev?: Line, i = 0): Line => ({
  member: prev?.member || "", mark: String(i + 1).padStart(2, "0"), d: prev?.d || 16, shape: "00", dims: {}, segs: [{ len: "", angle: "45" }, { len: "", angle: "45" }, { len: "", angle: "0" }],
  nMembers: "1", nPer: "", pos: "unknown", lap: "auto", lapMm: "",
});

const blank = (): Body => ({ group: "", drawingRef: "", drawingRev: "", grade: "B500DWR", fcu: "25", rounding: "25", stockM: "12", minRem: "1000", lines: [blankLine()] });

const toLine = (l: Line, i: number): BbsLine => {
  const dims: BbsDims = {};
  (["A", "B", "C", "D", "E", "R"] as const).forEach((k) => {
    const v = N(l.dims[k]);
    if (v != null) dims[k] = v;
  });
  if (l.shape === "99") dims.segs = l.segs.map((s) => ({ len: N(s.len) ?? 0, angle: N(s.angle) ?? 0 }));
  return {
    id: String(i), member: l.member, mark: l.mark, d: l.d, shape: l.shape, dims, nMembers: N(l.nMembers, { integer: true }) ?? 0, nPer: N(l.nPer, { integer: true }) ?? 0,
    pos: l.pos, lap: { mode: l.lap, mm: N(l.lapMm) },
  };
};

function compute(b: Body) {
  const g = gradeOf(b.grade);
  const o = { rounding: Number(b.rounding), fy: g.fy, fcu: N(b.fcu) ?? 25, grade: b.grade, stockMm: Math.round((N(b.stockM) ?? 12) * 1000) };
  const lines = b.lines.map(toLine);
  const out = lines.map((l) => bbsLine(l, o));
  const sum = bbsSummary(lines.map((l, i) => ({ d: l.d, totalM: out[i].totalM })));
  const marks = new Map<string, number>();
  lines.forEach((l) => marks.set(`${l.member}|${l.mark}`, (marks.get(`${l.member}|${l.mark}`) || 0) + 1));
  const checks = out.flatMap((x, i) => x.checks.map((c) => ({ ...c, label: `${lines[i].mark}: ${c.label}` })));
  [...marks].filter(([, n]) => n > 1).forEach(([k]) => checks.push({ id: "bbs.dupMark", label: `علامة مكررة ${k.split("|")[1]}`, value: "×2", limit: "علامة واحدة", ok: false, level: "error" } as any));
  // demand per Ø for the cutting plan
  const demand = new Map<number, { mark: string; lenMm: number; n: number }[]>();
  lines.forEach((l, i) => {
    const x = out[i];
    if (!x.totalNo || x.roundedMm <= 0) return;
    for (const p of cutPieces(x.roundedMm, x.totalNo, o.stockMm, x.lapMm, x.splices)) (demand.get(l.d) || demand.set(l.d, []).get(l.d)!).push({ mark: l.mark, lenMm: p.lenMm, n: p.n });
  });
  const hash = canonical({ d: [...demand], stock: o.stockMm, minRem: b.minRem });
  return { o, lines, out, sum, checks, demand, hash };
}

// ---- sketches: each shape in a 20 × 8 mm box (mm, y down), with letters ----
export function shapeSketch(shape: BbsShape, segsDeg?: { len: number; angle: number }[]): VPath[] {
  const P = (d: string, label?: { x: number; y: number; t: string }): VPath => ({ d, label });
  switch (shape) {
    case "00": return [P("M1 4 L19 4", { x: 10, y: 3, t: "A" })];
    case "11": case "12": return [P("M2 1 L2 7 L18 7", { x: 10, y: 6.3, t: "A" }), P("M0 0 L0 0", { x: 3.6, y: 4.5, t: "B" })];
    case "13": return [P("M18 2 L4 2 A2.5 2.5 0 0 0 4 7 L14 7", { x: 11, y: 1.6, t: "A" })];
    case "21": case "23": return [P("M2 1 L2 7 L18 7 L18 1", { x: 10, y: 6.3, t: "B" })];
    case "22": case "31": return [P("M2 1 L2 7 L18 7 L18 2 L14 2", { x: 10, y: 6.3, t: "B" })];
    case "25": return [P("M1 6 L12 6 L19 2", { x: 6, y: 5.3, t: "A" })];
    case "26": return [P("M1 6 L7 6 L12 2 L19 2", { x: 4, y: 5.3, t: "A" })];
    case "33": return [P("M5 2 L2 2 L2 7 L18 7 L18 2 L15 2", { x: 10, y: 6.3, t: "B" })];
    case "41": return [P("M1 6 L5 6 L5 2 L15 2 L15 6 L19 6", { x: 10, y: 1.6, t: "C" })];
    case "51": case "63": return [P("M4 1.5 L16 1.5 L16 6.5 L4 6.5 Z M4 1.5 L6.5 3.5", { x: 10, y: 5.6, t: "A" })];
    case "77": return [P("M2 4 C4 0 6 0 8 4 C10 8 12 8 14 4 C16 0 18 0 19 4")];
    case "99": {
      const segs = segsDeg && segsDeg.length ? segsDeg : [{ len: 1, angle: 45 }, { len: 1, angle: 45 }, { len: 1, angle: 0 }];
      const total = segs.reduce((a, s) => a + (s.len || 1), 0) || 1;
      let x = 1, y = 6, dir = 0, d = `M${x} ${y}`;
      segs.forEach((s, i) => {
        const L = ((s.len || 1) / total) * 17;
        x += L * Math.cos(dir);
        y -= L * Math.sin(dir);
        d += ` L${x.toFixed(2)} ${Math.max(0.5, Math.min(7.5, y)).toFixed(2)}`;
        if (i < segs.length - 1) dir += ((s.angle || 0) * Math.PI) / 180 * (i % 2 ? -1 : 1);
      });
      return [P(d)];
    }
  }
}

const Sketch = ({ shape, segs }: { shape: BbsShape; segs?: { len: number; angle: number }[] }) => (
  <svg viewBox="0 0 20 8" className="w-16 h-7 text-ink" aria-hidden="true">
    {shapeSketch(shape, segs).map((p, i) => (
      <g key={i}>
        <path d={p.d} fill="none" stroke="currentColor" strokeWidth={0.5} strokeLinecap="round" strokeLinejoin="round" />
        {p.label && <text x={p.label.x} y={p.label.y} fontSize={2.6} textAnchor="middle" fill="currentColor">{p.label.t}</text>}
      </g>
    ))}
  </svg>
);

const POS: [Line["pos"], string][] = [["unknown", "غير محدد (علوي احتياطًا)"], ["top", "علوي"], ["other", "سفلي / غيره"]];

function Editor({ body: b, set, ctx }: { body: Body; set: (b: Body) => void; ctx: any }) {
  const c = useMemo(() => compute(b), [b]);
  const ro = ctx.readOnly;
  const put = (p: Partial<Body>) => !ro && set({ ...b, ...p });
  const stale = b.plan && b.planHash !== c.hash;
  const runPlan = () => {
    const plan: Record<string, CutPlan> = {};
    c.demand.forEach((dem, d) => (plan[String(d)] = cutPlan(dem, c.o.stockMm, { minRemnantMm: N(b.minRem) ?? 1000 })));
    put({ plan, planHash: c.hash });
  };
  const ld = bbsLd({ fy: c.o.fy, fcu: c.o.fcu, d: 16, grade: b.grade, pos: "top" });
  return (
    <div className="space-y-3">
      <Card title="بيانات الجدول">
        <div className="space-y-2.5">
          <Grid2>
            <TextField label="العنصر / المجموعة" value={b.group} onChange={(v) => put({ group: v })} placeholder="كمرات سقف الدور 3" />
            <TextField label="اللوحة والمراجعة" dir="ltr" value={b.drawingRef} onChange={(v) => put({ drawingRef: v })} placeholder="S-301 Rev B" />
            <NumField label="fcu الخرسانة" unit="MPa" value={b.fcu} onChange={(v) => put({ fcu: v })} />
            <NumField label="طول السيخ" unit="m" value={b.stockM} onChange={(v) => put({ stockM: v })} rule={{ min: 6, max: 24 }} />
          </Grid2>
          <Pick label="رتبة الحديد" items={BBS_GRADES.map((g) => [g.id, g.id] as [string, string])} value={b.grade} onChange={(v) => put({ grade: v })} />
          <Pick label="تقريب طول القص لأعلى" items={[["25", "25 مم"], ["10", "10 مم"], ["5", "5 مم"], ["0", "بدون"]]} value={b.rounding} onChange={(v) => put({ rounding: v })} />
        </div>
      </Card>

      <Card title="البنود">
        <RowCards<Line>
          rows={b.lines}
          onChange={(lines) => put({ lines, plan: b.plan })}
          blank={() => blankLine(b.lines[b.lines.length - 1], b.lines.length)}
          addLabel="أضف بندًا"
          max={800}
          summary={(l, i) => `${l.mark} · Ø${l.d} · [${l.shape}] · ${c.out[i]?.totalNo || 0} × ${c.out[i]?.roundedMm || 0} · ${fmtNum(c.out[i]?.kg || 0, 2)} كجم`}
          render={(l, setL, i) => {
            const sh = shapeOf(l.shape);
            const x = c.out[i];
            return (
              <>
                <Grid2>
                  <TextField label="العنصر" value={l.member} onChange={(v) => setL({ ...l, member: v })} placeholder="B12" />
                  <TextField label="العلامة" dir="ltr" value={l.mark} onChange={(v) => setL({ ...l, mark: v })} />
                </Grid2>
                <Pick label="القطر" items={BBS_DIAMETERS.map((d) => [String(d), `Ø${d}`] as [string, string])} value={String(l.d)} onChange={(v) => setL({ ...l, d: Number(v) })} />
                <div>
                  <span className="block text-[12px] text-ink-2 mb-1.5">الشكل (BS 8666)</span>
                  <div className="-mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar">
                    {BBS_SHAPES.map((s) => (
                      <button key={s.code} type="button" aria-pressed={l.shape === s.code} onClick={() => setL({ ...l, shape: s.code })}
                        className={`shrink-0 grid place-items-center gap-0.5 w-20 h-16 rounded-xl border ${l.shape === s.code ? "bg-wash border-accent/40" : "bg-surface border-line-2"}`}>
                        <Sketch shape={s.code} />
                        <span className="text-[10.5px] text-ink-2"><bdi dir="ltr" className="font-grotesk">{s.code}</bdi> {s.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <Note><bdi dir="ltr" className="font-grotesk">{sh.formula}</bdi></Note>
                {l.shape === "99" ? (
                  <div className="space-y-2">
                    {l.segs.map((s, j) => (
                      <Grid2 key={j}>
                        <NumField label={`القطعة ${j + 1}`} unit="mm" value={s.len} onChange={(v) => setL({ ...l, segs: l.segs.map((q, k) => (k === j ? { ...q, len: v } : q)) })} />
                        {j < l.segs.length - 1 && <NumField label="زاوية الانحراف" unit="°" value={s.angle} onChange={(v) => setL({ ...l, segs: l.segs.map((q, k) => (k === j ? { ...q, angle: v } : q)) })} rule={{ min: 0, max: 90 }} />}
                      </Grid2>
                    ))}
                    <button type="button" onClick={() => setL({ ...l, segs: [...l.segs, { len: "", angle: "0" }] })} className="press min-h-10 text-[12.5px] text-accent">+ قطعة</button>
                  </div>
                ) : (
                  <Grid2>
                    {sh.letters.map((k) => <NumField key={k} label={String(k)} unit="mm" value={l.dims[k as string] || ""} onChange={(v) => setL({ ...l, dims: { ...l.dims, [k]: v } })} rule={{ min: 0 }} />)}
                  </Grid2>
                )}
                <Grid2>
                  <NumField label="عدد العناصر" value={l.nMembers} onChange={(v) => setL({ ...l, nMembers: v })} rule={{ integer: true, min: 0 }} />
                  <NumField label="عدد الأسياخ في العنصر" value={l.nPer} onChange={(v) => setL({ ...l, nPer: v })} rule={{ integer: true, min: 0 }} />
                </Grid2>
                <Pick label="موضع السيخ (للتماسك)" items={POS} value={l.pos} onChange={(v) => setL({ ...l, pos: v })} />
                {x && x.splices > 0 && (
                  <>
                    <Pick label="الوصلات" items={[["auto", "في قطاع واحد (1.3 Ld)"], ["staggered", "متخالفة ≤ 50 % (Ld)"], ["typed", "طول مُدخل"]]} value={l.lap} onChange={(v) => setL({ ...l, lap: v })} />
                    {(l.lap === "typed" || gradeOf(b.grade).plain) && <NumField label="طول الوصلة (من اللوحة)" unit="mm" value={l.lapMm} onChange={(v) => setL({ ...l, lapMm: v })} />}
                  </>
                )}
                {x && <Rows rows={[
                  ["طول القص", String(x.roundedMm), "mm"],
                  ["العدد الكلي", String(x.totalNo)],
                  ["الطول الكلي", fmtNum(x.totalM, 2), "m"],
                  ["الوزن", fmtNum(x.kg, 2), "kg"],
                  ...(x.splices ? [["وصلات", `${x.splices} × ${x.lapMm}`, "mm"] as [string, string, string]] : []),
                ]} />}
              </>
            );
          }}
        />
      </Card>

      <ResultHero label="إجمالي وزن الحديد" value={fmtNum(c.sum.kg / 1000, 3)} unit="طن" sub={c.sum.rows.map((r) => `Ø${r.d}: ${fmtNum(r.kg, 1)} كجم`).join(" · ")} />

      <Card title="خطة القص (أسياخ 12 م)" action={<button type="button" onClick={runPlan} className="press min-h-10 px-3 rounded-lg bg-accent text-on-accent text-[12.5px]">{b.plan ? "أعد الحساب" : "احسب خطة القص"}</button>}>
        <NumField label="أقصر باقي يُخزَّن" unit="mm" value={b.minRem} onChange={(v) => put({ minRem: v })} />
        {stale && <Note tone="warn">تغيّرت البنود بعد الحساب — أعد حساب خطة القص.</Note>}
        {b.plan && Object.entries(b.plan).map(([d, p]) => (
          <div key={d} className="mt-3 p-3 rounded-xl bg-canvas border border-line">
            <p className="text-[13px] font-medium">Ø{d}: {p.newBars} سيخ جديد {p.optimality === "proven" ? "· أمثل" : p.optimality === "withinOne" ? "· في حدود سيخ من الأمثل" : ""}</p>
            <p className="text-[11.5px] text-ink-3">القص المنفصل {p.naiveBars} · الحد الأدنى {p.lowerBound} · هالك {fmtNum(p.scrapMm / 1000, 2)} م · بواقي {p.remnantsMm.length}</p>
            <ul className="mt-2 space-y-1.5">
              {p.patterns.map((pt, i) => (
                <li key={i} className="text-[11.5px]">
                  <BarStrip pattern={pt} stock={pt.fromRemnant ? pt.cuts.reduce((a, x) => a + x.lenMm, 0) + pt.offcutMm : c.o.stockMm} />
                  <span className="text-ink-2"><bdi dir="ltr" className="font-grotesk">{pt.cuts.map((x) => x.lenMm).join(" + ")} × {pt.reps}</bdi>{pt.tag ? ` · باقي ${pt.tag}` : ""}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Card>

      {c.checks.length > 0 && <Card title="المراجعات"><Checks items={c.checks} /></Card>}
      <Working steps={[...(c.out[0] ? c.out[0].trace : []), ...ld.trace]} />
      <Note>جدول للتنفيذ والطلب من أبعاد اللوحات المدخلة؛ أطوال الثني والتماسك من ملف الكود ويجب مطابقتها باللوحات المعتمدة والكود المصري 203.</Note>
    </div>
  );
}

function BarStrip({ pattern, stock }: { pattern: CutPlan["patterns"][number]; stock: number }) {
  let x = 0;
  return (
    <svg viewBox={`0 0 ${stock} 400`} preserveAspectRatio="none" className="w-full h-4 mb-0.5" aria-hidden="true">
      {pattern.cuts.map((c, i) => {
        const r = <rect key={i} x={x} y={0} width={c.lenMm - 20} height={400} fill={i % 2 ? "rgb(var(--accent) / .55)" : "rgb(var(--accent) / .85)"} />;
        x += c.lenMm;
        return r;
      })}
      {pattern.offcutMm > 0 && <rect x={x} y={0} width={pattern.offcutMm} height={400} fill="none" stroke="currentColor" strokeWidth={30} strokeDasharray={pattern.offcut === "scrap" ? "60 60" : undefined} />}
    </svg>
  );
}

// a cutting pattern drawn for the PDF (stock → wMm wide)
function barPaths(pt: CutPlan["patterns"][number], stock: number, wMm: number): VPath[] {
  const k = wMm / stock;
  const out: VPath[] = [];
  let x = 0;
  pt.cuts.forEach((c) => {
    const w = c.lenMm * k;
    out.push({ d: `M${(x * k).toFixed(2)} 0 h${w.toFixed(2)} v4 h${(-w).toFixed(2)} Z`, label: w > 9 ? { x: x * k + w / 2, y: 3, t: `${c.mark} ${c.lenMm}` } : undefined });
    x += c.lenMm;
  });
  if (pt.offcutMm > 0) {
    const w = pt.offcutMm * k;
    out.push({ d: `M${(x * k).toFixed(2)} 0 h${w.toFixed(2)} v4 h${(-w).toFixed(2)} Z`, dash: pt.offcut === "scrap" ? [0.8, 0.6] : undefined, label: w > 9 ? { x: x * k + w / 2, y: 3, t: pt.offcut === "scrap" ? `هالك ${pt.offcutMm}` : `${pt.tag} ${pt.offcutMm}` } : undefined });
  }
  return out;
}

function build(doc: ToolDoc<Body>, project: any) {
  const b = doc.body;
  const c = compute(b);
  const rows: DocRow[] = [];
  let lastMember: string | null = null;
  c.lines.forEach((l, i) => {
    const x = c.out[i];
    if (l.member !== lastMember) {
      rows.push({ kind: "section", cells: { member: l.member || "—" } });
      lastMember = l.member;
    }
    const dm = l.dims;
    rows.push({
      cells: {
        member: l.member, mark: iso(l.mark), d: iso(`Ø${l.d}`), nm: l.nMembers, ne: l.nPer, tn: x.totalNo, shape: iso(l.shape),
        A: dm.A ?? null, B: dm.B ?? null, C: dm.C ?? null, D: dm.D ?? null, E: dm.E ?? dm.R ?? null,
        cut: x.roundedMm, tm: x.totalM, kgm: x.kgPerM, kg: x.kg, rev: "",
      },
      sketch: shapeSketch(l.shape, l.dims.segs).map((p) => ({ ...p, d: p.d })),
    });
  });
  const blocks: DocBlock[] = [
    { k: "kv", cols: 3, rows: [
      { label: "العنصر", value: b.group || "—" }, { label: "اللوحة", value: iso(b.drawingRef || "—") }, { label: "رتبة الحديد", value: iso(`${b.grade} · fy ${c.o.fy} MPa`) },
      { label: "fcu", value: iso(`${c.o.fcu} MPa`) }, { label: "التقريب", value: iso(`${b.rounding} mm ↑`) }, { label: "طول السيخ", value: iso(`${c.o.stockMm} mm`) },
    ] },
    {
      k: "table", id: "bbs", caption: "", grid: true, carry: { sumCols: ["kg"] },
      cols: [
        { key: "member", label: "العنصر", wMm: 38, align: "start" }, { key: "mark", label: "العلامة", wMm: 12, align: "center" },
        { key: "d", label: "القطر", wMm: 16, align: "center" }, { key: "nm", label: "عناصر", wMm: 11, align: "end", num: { dp: 0 } },
        { key: "ne", label: "/عنصر", wMm: 11, align: "end", num: { dp: 0 } }, { key: "tn", label: "العدد", wMm: 12, align: "end", num: { dp: 0 } },
        { key: "shape", label: "الشكل", wMm: 10, align: "center" },
        { key: "A", label: "A", wMm: 12, align: "end", num: { dp: 0 } }, { key: "B", label: "B", wMm: 12, align: "end", num: { dp: 0 } },
        { key: "C", label: "C", wMm: 12, align: "end", num: { dp: 0 } }, { key: "D", label: "D", wMm: 12, align: "end", num: { dp: 0 } },
        { key: "E", label: "E/R", wMm: 12, align: "end", num: { dp: 0 } },
        { key: "sk", label: "الرسم", wMm: 22, align: "center", sketch: true },
        { key: "cut", label: "طول القص", unit: "mm", wMm: 15, align: "end", num: { dp: 0 } },
        { key: "tm", label: "الطول الكلي", unit: "m", wMm: 16, align: "end", num: { dp: 2 } },
        { key: "kgm", label: "kg/m", wMm: 12, align: "end", num: { dp: 3 } },
        { key: "kg", label: "الوزن", unit: "kg", wMm: 18, align: "end", num: { dp: 2 } },
        { key: "rev", label: "R", wMm: 8, align: "center" },
      ],
      rows,
      totals: { cells: { member: "الإجمالي", kg: c.sum.kg } },
    },
  ];
  const summary: DocBlock[] = [
    { k: "heading", num: "A", text: "ملخص الأوزان حسب القطر" },
    {
      k: "table", id: "sum", caption: "", cols: [
        { key: "d", label: "القطر", wMm: 30, align: "center" }, { key: "m", label: "الطول", unit: "m", wMm: 40, align: "end", num: { dp: 2 } },
        { key: "kgm", label: "kg/m", wMm: 30, align: "end", num: { dp: 3 } }, { key: "kg", label: "الوزن", unit: "kg", wMm: 40, align: "end", num: { dp: 3 } },
        { key: "t", label: "طن", wMm: 34, align: "end", num: { dp: 3 } },
      ],
      rows: c.sum.rows.map((r) => ({ cells: { d: iso(`Ø${r.d}`), m: r.totalM, kgm: r.kgPerM, kg: r.kg, t: r.t } })),
      totals: { cells: { d: "الإجمالي", kg: c.sum.kg, t: c.sum.kg / 1000 } },
    },
  ];
  const cutting: DocBlock[] = [];
  if (b.plan && b.planHash === c.hash) {
    cutting.push({ k: "heading", num: "B", text: "خطة القص" });
    Object.entries(b.plan).forEach(([d, p]) => {
      const kgSaved = (p.naiveBars - p.newBars) * (c.o.stockMm / 1000) * (c.sum.rows.find((r) => String(r.d) === d)?.kgPerM || 0);
      cutting.push({ k: "kpis", items: [
        { label: `Ø${d} أسياخ جديدة`, value: String(p.newBars) }, { label: "القص المنفصل", value: String(p.naiveBars) },
        { label: "الحد الأدنى", value: String(p.lowerBound) }, { label: "الهالك", value: fmtNum((p.scrapMm / Math.max(1, p.newBars * c.o.stockMm)) * 100, 1), unit: "%" },
        { label: p.optimality === "proven" ? "أمثل" : p.optimality === "withinOne" ? "في حدود سيخ من الأمثل" : "وفر", value: fmtNum(kgSaved, 1), unit: "kg" },
      ] });
      p.patterns.forEach((pt, i) => {
        const stock = pt.fromRemnant ? pt.cuts.reduce((a, x) => a + x.lenMm, 0) + pt.offcutMm : c.o.stockMm;
        cutting.push({ k: "sketch", wMm: 225 * (stock / c.o.stockMm), hMm: 4.5, paths: barPaths(pt, stock, 225 * (stock / c.o.stockMm)), caption: `${i + 1}. Ø${d} · ${pt.cuts.map((x) => x.lenMm).join(" + ")} × ${pt.reps}${pt.fromRemnant ? ` · من ${pt.fromRemnant}` : ""}${pt.tag ? ` · باقي ${pt.tag} = ${pt.offcutMm} mm` : pt.offcut === "scrap" ? ` · هالك ${pt.offcutMm} mm` : ""}` });
      });
    });
  }
  const ld = bbsLd({ fy: c.o.fy, fcu: c.o.fcu, d: 16, grade: b.grade, pos: "top" });
  return buildSpec({
    doc, meta: module, project, reference: b.drawingRef || undefined,
    sections: [
      { orientation: "landscape", blocks },
      { orientation: "portrait", blocks: summary },
      ...(cutting.length ? [{ orientation: "landscape" as const, blocks: cutting }] : []),
    ],
    basis: {
      rows: [
        { key: "radius", label: "نصف قطر الثني", value: "BS 8666 T2 · 2d / 3.5d", source: "BS 8666:2020", conf: "M", flagged: true },
        { key: "kgm", label: "الوزن لكل متر", value: "d²/162.2", unit: "kg/m", source: "جدول الأوزان", conf: "H", flagged: false },
        { key: "ld", label: "طول التماسك (Ø16 علوي)", value: `${fmtNum(ld.ldPhi, 2)}Φ`, source: "ECP 203", clause: "fbu = 0.30√(fcu/1.5)", conf: "H", flagged: false },
        { key: "lap", label: "الوصلة الافتراضية", value: "1.3·Ld", source: "ECP 203", conf: "M", flagged: true },
        { key: "minRem", label: "أقصر باقي يُخزَّن", value: b.minRem, unit: "mm", source: "ممارسة الموقع", conf: "M", flagged: true },
      ],
      formulas: ld.trace,
    },
    signRoles: ["prepared", "checked", "consultantRep"],
  });
}

function summary(doc: ToolDoc<Body>) {
  const c = compute(doc.body);
  return [
    `${doc.title}${doc.body.group ? ` · ${doc.body.group}` : ""}`,
    `الإجمالي ⁦${fmtNum(c.sum.kg / 1000, 3)} t⁩`,
    ...c.sum.rows.slice(0, 4).map((r) => `⁦Ø${r.d}: ${fmtNum(r.kg, 1)} kg⁩`),
    "تقدير — راجع المستند الكامل",
  ].join("\n");
}

export const module: ToolModule<Body> = {
  kind: "bbs", v: 1, docType: "BBS", docTypeName: "جدول تفريد الحديد · Bar bending schedule", discipline: "إنشائي", engine: BBS_ENGINE,
  profile: { id: "ecp203-2020-bbs@1", edition: "ECP 203-2020 · BS 8666:2020", values: { stock: 12000, rounding: 25 }, overridden: [], unverified: ["radius", "lap", "minRem"] },
  blank,
  defaultTitle: () => "جدول تفريد الحديد",
  Editor,
  build,
  summary,
};
