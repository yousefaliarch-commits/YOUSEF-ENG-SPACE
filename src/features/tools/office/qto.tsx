// =====================================================================
//  حصر الكميات — quantity take-off sheet (screen + PDF + Word + live Excel). Engine: src/domain/tools/qto-calc.ts
//  · One line per measured item, filed by its WBS location (zone / building · level · element), with its kind's geometry;
//    openings are deducted only as the chosen measurement rules allow, and every deduction states the rule it followed.
//  · Rules are a profile: IS 1200, «deduct every opening», or the contract's own thresholds — never presented as a code clause
//    they are not.
//  · The Excel copy computes: each line's gross is its geometry formula, each deduction a formula under its line, the net
//    gross − deductions, and the totals by trade are sums of the nets.
//  Field-and-office tool: no prices (the BOQ amounts live in the payment certificate).
// =====================================================================
import { computeQto, QTO_ENGINE, RULES, type QtoItem, type QtoKind, type QtoResult, type QtoRules } from "../../../domain/tools/qto-calc";
import type { DocBlock } from "../../../doc/model";
import { fmtNum, iso } from "../../../doc/text";
import { evalFormula, ref, type Workbook, type XCell, type XFmt, type XRow } from "../../../doc/xlsx";
import type { ToolDoc } from "../../../data/tool-docs";
import { Card, Check, Grid2, Note, NumField, Pick, ResultHero, RowCards, Rows, TextField } from "../../../ui/kit";
import { numInputParse } from "../../../lib/num-input";
import type { ToolModule } from "../module";
import { buildSpec, issuerName } from "../spec";

type Op = { id: string; label: string; n: string; w: string; h: string };
type Line = {
  id: string; kind: QtoKind; wbs: string; desc: string;
  n: string; L: string; W: string; H: string; t: string; faces: "1" | "2"; byArea: boolean; upturn: string; ceiling: boolean;
  openings: Op[];
};
type Body = {
  rules: "is1200" | "all" | "contract";
  custom: { masonryMin: string; finishMin: string; finishOneFace: string; tilesMin: string };
  lines: Line[];
};

const uid = () => Math.random().toString(36).slice(2, 9);
const N = (s: string | undefined) => numInputParse(s || "") ?? 0;

export const KINDS: [QtoKind, string][] = [
  ["excavation", "حفر"], ["backfill", "ردم"], ["fill", "إحلال / تربة"], ["concrete", "خرسانة"], ["masonry", "مباني"],
  ["plaster", "بياض / محارة"], ["paint", "دهانات"], ["tiles", "بلاط / أرضيات"], ["screed", "مونة / سيراميك أرضي"],
  ["waterproof", "عزل"], ["skirting", "وزرة"], ["other", "أخرى"],
];
const kindName = (k: QtoKind) => (KINDS.find((x) => x[0] === k) || KINDS[KINDS.length - 1])[1];

const blankLine = (prev?: Line): Line => ({
  id: uid(), kind: prev?.kind || "plaster", wbs: prev?.wbs || "", desc: "", n: "1", L: "", W: "", H: prev?.H || "", t: prev?.t || "0.25",
  faces: prev?.faces || "1", byArea: prev?.byArea || false, upturn: prev?.upturn || "0.3", ceiling: false, openings: [],
});
const blank = (): Body => ({ rules: "is1200", custom: { masonryMin: "0.1", finishMin: "0.5", finishOneFace: "3", tilesMin: "0.1" }, lines: [blankLine()] });

const rulesOf = (b: Body): QtoRules =>
  b.rules === "contract"
    ? { id: "contract", masonryMin: N(b.custom.masonryMin), finishMin: N(b.custom.finishMin), finishOneFace: N(b.custom.finishOneFace), tilesMin: N(b.custom.tilesMin) }
    : RULES[b.rules];
const itemOf = (l: Line): QtoItem => ({
  id: l.id, kind: l.kind, wbs: l.wbs, desc: l.desc, n: N(l.n) || 1, L: N(l.L), W: N(l.W), H: N(l.H), t: N(l.t),
  faces: l.faces === "2" ? 2 : 1, byArea: l.byArea, upturn: N(l.upturn), ceiling: l.ceiling,
  openings: l.openings.map((o) => ({ id: o.id, label: o.label, n: N(o.n) || 1, w: N(o.w), h: N(o.h) })),
});
const compute = (b: Body): QtoResult => computeQto(b.lines.map(itemOf), rulesOf(b));
const q3 = (x: number) => fmtNum(x, 3);

const RULE_NAME: Record<Body["rules"], string> = {
  is1200: "IS 1200 — المباني: تُخصم الفتحات > 0.1 م² · البياض والدهان: ≤ 0.5 م² لا يُخصم، 0.5–3 م² وجه واحد، > 3 م² الوجهان",
  all: "خصم كل الفتحات بالكامل",
  contract: "حسب طريقة القياس في العقد",
};

function LineFields({ l, set }: { l: Line; set: (l: Line) => void }) {
  const p = (x: Partial<Line>) => set({ ...l, ...x });
  const wall = l.kind === "masonry" || ((l.kind === "plaster" || l.kind === "paint") && !l.ceiling);
  return (
    <>
      <Pick items={KINDS} value={l.kind} onChange={(kind) => p({ kind })} />
      <TextField label="الموقع (WBS): مبنى / دور / عنصر" value={l.wbs} onChange={(v) => p({ wbs: v })} placeholder="برج A / الدور 02 / حوائط الشقة 3" />
      <TextField label="البيان" value={l.desc} onChange={(v) => p({ desc: v })} />
      {(l.kind === "plaster" || l.kind === "paint") && <Check label="سقف (طول × عرض)" on={l.ceiling} onChange={(ceiling) => p({ ceiling })} />}
      {l.kind === "masonry" && <Check label="القياس بالمتر المسطح (بدون سمك)" on={l.byArea} onChange={(byArea) => p({ byArea })} />}
      <Grid2>
        <NumField label="العدد" value={l.n} onChange={(v) => p({ n: v })} />
        <NumField label={l.kind === "skirting" ? "المحيط" : "الطول"} unit="م" value={l.L} onChange={(v) => p({ L: v })} />
        {!wall && l.kind !== "skirting" && <NumField label="العرض" unit="م" value={l.W} onChange={(v) => p({ W: v })} />}
        {(wall || ["excavation", "backfill", "fill", "concrete", "other"].includes(l.kind)) && <NumField label={wall ? "الارتفاع" : "العمق / الارتفاع"} unit="م" value={l.H} onChange={(v) => p({ H: v })} />}
        {l.kind === "masonry" && !l.byArea && <NumField label="السمك" unit="م" value={l.t} onChange={(v) => p({ t: v })} />}
        {l.kind === "waterproof" && <NumField label="الرفرف (الرجوع على الحوائط)" unit="م" value={l.upturn} onChange={(v) => p({ upturn: v })} />}
      </Grid2>
      {(l.kind === "plaster" || l.kind === "paint") && !l.ceiling && (
        <Pick label="الأوجه المقاسة" items={[["1", "وجه واحد"], ["2", "الوجهان"]]} value={l.faces} onChange={(faces) => p({ faces })} />
      )}
      {l.kind !== "excavation" && l.kind !== "backfill" && (
        <div>
          <p className="text-[12px] text-ink-2 mb-1.5">{l.kind === "skirting" ? "الأبواب (يُخصم عرضها)" : "الفتحات"}</p>
          <RowCards<Op>
            rows={l.openings} onChange={(openings) => p({ openings })} max={40} addLabel={l.kind === "skirting" ? "باب" : "فتحة"}
            blank={() => ({ id: uid(), label: l.kind === "skirting" ? "باب" : "", n: "1", w: "", h: "" })}
            summary={(o) => `${o.label || "فتحة"} · ${o.n || 1} × ${o.w || "—"}${l.kind === "skirting" ? "" : ` × ${o.h || "—"}`}`}
            render={(o, setO) => (
              <>
                <TextField label="الوصف" value={o.label} onChange={(v) => setO({ ...o, label: v })} placeholder="باب D1، شباك W2…" />
                <Grid2>
                  <NumField label="العدد" value={o.n} onChange={(v) => setO({ ...o, n: v })} />
                  <NumField label="العرض" unit="م" value={o.w} onChange={(v) => setO({ ...o, w: v })} />
                  {l.kind !== "skirting" && <NumField label="الارتفاع" unit="م" value={o.h} onChange={(v) => setO({ ...o, h: v })} />}
                </Grid2>
              </>
            )}
          />
        </div>
      )}
    </>
  );
}

function Editor({ body: b, set, ctx }: { body: Body; set: (b: Body) => void; ctx: any }) {
  const ro = ctx.readOnly;
  const put = (p: Partial<Body>) => !ro && set({ ...b, ...p });
  const r = compute(b);
  const top = [...r.totals].sort((x, y) => y.net - x.net)[0];
  return (
    <div className="space-y-3">
      <ResultHero
        label={`${b.lines.length} بند · ${r.totals.length} نوع أعمال`}
        value={top ? q3(top.net) : "0"}
        unit={top ? `${top.unit} ${kindName(top.kind)}` : ""}
        sub={r.totals.length > 1 ? r.totals.map((t) => `${kindName(t.kind)} ${q3(t.net)} ${t.unit}`).join(" · ") : undefined}
        tone={r.issues.length ? "bad" : "accent"}
      />
      <Card title="قواعد القياس والخصم">
        <Pick items={[["is1200", "IS 1200"], ["all", "خصم كل الفتحات"], ["contract", "حسب العقد"]]} value={b.rules} onChange={(rules) => put({ rules })} />
        <p className="mt-2 text-[12px] text-ink-2 leading-relaxed">{RULE_NAME[b.rules]}</p>
        {b.rules === "contract" && (
          <div className="mt-2"><Grid2>
            <NumField label="المباني: لا يُخصم ما دون" unit="م²" value={b.custom.masonryMin} onChange={(v) => put({ custom: { ...b.custom, masonryMin: v } })} />
            <NumField label="البياض/الدهان: لا يُخصم ما دون" unit="م²" value={b.custom.finishMin} onChange={(v) => put({ custom: { ...b.custom, finishMin: v } })} />
            <NumField label="وجه واحد حتى" unit="م²" value={b.custom.finishOneFace} onChange={(v) => put({ custom: { ...b.custom, finishOneFace: v } })} />
            <NumField label="الأرضيات/العزل: لا يُخصم ما دون" unit="م²" value={b.custom.tilesMin} onChange={(v) => put({ custom: { ...b.custom, tilesMin: v } })} />
          </Grid2></div>
        )}
        <Note>طرق القياس تختلف بين العقود — راجع طريقة القياس المعتمدة في عقدك قبل الإصدار.</Note>
      </Card>
      <Card title={`البنود (${b.lines.length})`}>
        <RowCards<Line>
          rows={b.lines} onChange={(lines) => put({ lines })} max={400} addLabel="بند جديد"
          blank={() => blankLine(b.lines[b.lines.length - 1])}
          summary={(l, i) => `${kindName(l.kind)} · ${l.desc || l.wbs || "بند"} — ${q3(r.lines[i]?.net || 0)} ${r.lines[i]?.unit || ""}${r.lines[i]?.issues.length ? " ⚠" : ""}`}
          render={(l, setL, i) => {
            const res = r.lines[i];
            return (
              <>
                <LineFields l={l} set={setL} />
                {res && (
                  <div className="p-2.5 rounded-xl bg-canvas border border-line text-[12px] space-y-1" data-qto-working>
                    <bdi dir="ltr" className="block font-grotesk">{res.expr} = {q3(res.gross)} {res.unit}</bdi>
                    {res.deductions.map((d, j) => (
                      <p key={j} className={d.qty ? "text-ink-2" : "text-ink-3"}>− {d.label || "فتحة"} ×{d.n}: <bdi dir="ltr">{q3(d.qty)}</bdi> · {d.rule}</p>
                    ))}
                    <p className="font-medium">الصافي <bdi dir="ltr">{q3(res.net)}</bdi> {res.unit}</p>
                    {res.issues.map((x, k) => <p key={k} className="text-warn">{x}</p>)}
                  </div>
                )}
              </>
            );
          }}
        />
      </Card>
      {r.totals.length > 0 && (
        <Card title="الإجماليات حسب نوع الأعمال">
          <Rows rows={r.totals.map((t) => [`${kindName(t.kind)} (${t.lines} بند)`, q3(t.net), t.unit] as [string, string, string])} />
        </Card>
      )}
      {r.issues.length > 0 && <Note tone="warn">{r.issues.map((x) => x.text).join(" · ")}</Note>}
    </div>
  );
}

function build(doc: ToolDoc<Body>, project: any) {
  const b = doc.body;
  const r = compute(b);
  const lineRows = b.lines.map((l, i) => {
    const res = r.lines[i];
    const third = l.kind === "masonry" && !l.byArea ? N(l.t) : (l.kind === "plaster" || l.kind === "paint") && !l.ceiling ? Number(l.faces) : null;
    return { cells: { wbs: l.wbs, desc: l.desc, kind: kindName(l.kind), unit: res.unit, n: N(l.n) || 1, L: N(l.L), W: N(l.W) || null, H: l.kind === "waterproof" ? N(l.upturn) : N(l.H) || null, x: third, g: res.gross, d: res.deduct, net: res.net }, mark: res.issues.length ? "fail" as const : undefined };
  });
  const dedRows = b.lines.flatMap((l, i) => r.lines[i].deductions.map((d) => ({ cells: { line: `${i + 1}. ${l.desc || kindName(l.kind)}`, op: d.label, n: d.n, a: d.area, f: d.faces, q: d.qty, rule: d.rule } })));
  const blocks: DocBlock[] = [
    { k: "kv", cols: 2, rows: [{ label: "قواعد القياس", value: RULE_NAME[b.rules], wide: true }, { label: "عدد البنود", value: iso(String(b.lines.length)) }] },
    { k: "heading", num: "1", text: "بنود الحصر" },
    {
      k: "table", id: "lines", caption: "", grid: true,
      cols: [
        { key: "wbs", label: "الموقع", wMm: 34, align: "start" }, { key: "desc", label: "البيان", wMm: 46, align: "start" },
        { key: "kind", label: "النوع", wMm: 22, align: "center" }, { key: "unit", label: "الوحدة", wMm: 12, align: "center" },
        { key: "n", label: "العدد", wMm: 12, align: "end", num: { dp: 0 } }, { key: "L", label: "الطول", wMm: 15, align: "end", num: { dp: 2 } },
        { key: "W", label: "العرض", wMm: 15, align: "end", num: { dp: 2 } }, { key: "H", label: "الارتفاع", wMm: 15, align: "end", num: { dp: 2 } },
        { key: "x", label: "السمك/الأوجه", wMm: 17, align: "end", num: { dp: 2 } }, { key: "g", label: "الإجمالي", wMm: 22, align: "end", num: { dp: 3 } },
        { key: "d", label: "الخصم", wMm: 20, align: "end", num: { dp: 3 } }, { key: "net", label: "الصافي", wMm: 22, align: "end", num: { dp: 3 }, xl: { f: "{g}-{d}" } },
      ],
      rows: lineRows,
    },
  ];
  if (dedRows.length) {
    blocks.push({ k: "heading", num: "2", text: "تفاصيل الخصومات وقاعدتها" });
    blocks.push({
      k: "table", id: "deds", caption: "", grid: true,
      cols: [
        { key: "line", label: "البند", wMm: 50, align: "start" }, { key: "op", label: "الفتحة", wMm: 34, align: "start" },
        { key: "n", label: "العدد", wMm: 14, align: "end", num: { dp: 0 } }, { key: "a", label: "المساحة/العرض", wMm: 22, align: "end", num: { dp: 3 } },
        { key: "f", label: "المضاعف", wMm: 16, align: "end", num: { dp: 0 } }, { key: "q", label: "الخصم", wMm: 22, align: "end", num: { dp: 3 } },
        { key: "rule", label: "القاعدة", wMm: 94, align: "start" },
      ],
      rows: dedRows,
    });
  }
  blocks.push({ k: "heading", num: String(dedRows.length ? 3 : 2), text: "الإجماليات حسب نوع الأعمال" });
  blocks.push({
    k: "table", id: "totals", caption: "", grid: true,
    cols: [{ key: "k", label: "نوع الأعمال", wMm: 80, align: "start" }, { key: "n", label: "عدد البنود", wMm: 30, align: "end", num: { dp: 0 } }, { key: "u", label: "الوحدة", wMm: 30, align: "center" }, { key: "q", label: "الكمية الصافية", wMm: 50, align: "end", num: { dp: 3 } }],
    rows: r.totals.map((t) => ({ cells: { k: kindName(t.kind), n: t.lines, u: t.unit, q: t.net } })),
  });
  if (r.issues.length) blocks.push({ k: "notes", title: "ملاحظات المراجعة", text: r.issues.map((x) => `• ${x.text}`).join("\n") });
  return buildSpec({ doc, meta: module, project, sections: [{ orientation: "landscape", blocks }], signRoles: ["prepared", "checked", "approved"] });
}

// ---------------------------------------------------------------------
//  The live Excel take-off
// ---------------------------------------------------------------------
const F = {
  title: { b: true, sz: 14 } as XFmt,
  sub: { color: "muted" } as XFmt,
  head: { b: true, fill: "head", border: true, center: true, wrap: true } as XFmt,
  cell: { border: true } as XFmt,
  num2: { border: true, num: "#,##0.00" } as XFmt,
  num3: { border: true, num: "#,##0.000" } as XFmt,
  net: { b: true, border: true, num: "#,##0.000" } as XFmt,
  ded: { border: true, color: "muted" } as XFmt,
  dedNum: { border: true, color: "muted", num: "#,##0.000" } as XFmt,
  total: { b: true, fill: "total", border: true, top2: true, num: "#,##0.000" } as XFmt,
};

function resolve(rows: XRow[]) {
  const vals = new Map<string, number>();
  const cells: { r: string; c: { v?: any; f?: string } }[] = [];
  rows.forEach((row, ri) => {
    let col = 0;
    row.cells.forEach((c) => {
      const a = ref(col, ri + 1);
      if (c && typeof c === "object") {
        if (typeof c.v === "number" && !c.f) vals.set(a, c.v);
        if (c.f) cells.push({ r: a, c });
        col += c.span || 1;
      } else {
        if (typeof c === "number") vals.set(a, c);
        col += 1;
      }
    });
  });
  for (let pass = 0; pass < 4; pass++) {
    for (const x of cells) {
      const v = evalFormula(x.c.f!, (k) => vals.get(k) ?? null);
      if (v != null) { x.c.v = v; vals.set(x.r, v); }
    }
  }
}

// a line's gross as an Excel formula over E (count) F (L) G (W) H (H or upturn) I (thickness or faces) of row n
function grossFormula(l: Line, n: number): string {
  switch (l.kind) {
    case "masonry": return l.byArea ? `E${n}*F${n}*H${n}` : `E${n}*F${n}*H${n}*I${n}`;
    case "plaster":
    case "paint": return l.ceiling ? `E${n}*F${n}*G${n}` : `E${n}*F${n}*H${n}*I${n}`;
    case "tiles":
    case "screed": return `E${n}*F${n}*G${n}`;
    case "waterproof": return `E${n}*(F${n}*G${n}+2*(F${n}+G${n})*H${n})`;
    case "skirting": return `E${n}*F${n}`;
    default: return `E${n}*F${n}*G${n}*H${n}`;
  }
}

// SUM over many separate cells, kept under Excel's 255 arguments per function
const sumOf = (cells: string[]) => {
  const chunks: string[] = [];
  for (let i = 0; i < cells.length; i += 200) chunks.push(`SUM(${cells.slice(i, i + 200).join(",")})`);
  return chunks.length === 1 ? chunks[0] : `SUM(${chunks.join(",")})`;
};

function workbook(doc: ToolDoc<Body>, project: any): Workbook {
  const b = doc.body;
  const r = compute(b);
  const rows: XRow[] = [];
  const row = (cells: XCell[], ht?: number) => { rows.push({ cells, ht }); return rows.length; };
  row([{ v: doc.title, s: F.title, span: 12 }], 24);
  row([{ v: `قواعد القياس: ${RULE_NAME[b.rules]}`, s: F.sub, span: 12 }]);
  row([{ v: [issuerName(project), project?.name].filter(Boolean).join(" · "), s: F.sub, span: 12 }]);
  row([]);
  const headRow = row(["الموقع (WBS)", "البيان", "النوع", "الوحدة", "العدد", "الطول", "العرض", "الارتفاع / الرفرف", "السمك / الأوجه", "الإجمالي", "الخصم", "الصافي"].map((v) => ({ v, s: F.head })), 32);
  const netCells = new Map<string, string[]>();
  b.lines.forEach((l, i) => {
    const res = r.lines[i];
    const n = rows.length + 1;
    const blanksAsOne = l.kind === "other";
    const dim = (x: number) => (blanksAsOne && !x ? 1 : x);
    const H = l.kind === "waterproof" ? N(l.upturn) : dim(N(l.H));
    const I = l.kind === "masonry" && !l.byArea ? N(l.t) : (l.kind === "plaster" || l.kind === "paint") && !l.ceiling ? Number(l.faces) : "";
    const dedRows = res.deductions.length;
    row([
      { v: l.wbs, s: { ...F.cell, wrap: true } }, { v: l.desc, s: { ...F.cell, wrap: true } }, { v: kindName(l.kind), s: { ...F.cell, center: true } }, { v: res.unit, s: { ...F.cell, center: true } },
      { v: N(l.n) || 1, s: F.num2 }, { v: dim(N(l.L)), s: F.num2 }, { v: dim(N(l.W)), s: F.num2 }, { v: H, s: F.num2 }, { v: I as any, s: F.num2 },
      { f: grossFormula(l, n), s: F.num3 },
      dedRows ? { f: `SUM(K${n + 1}:K${n + dedRows})`, s: F.num3 } : { v: 0, s: F.num3 },
      { f: `MAX(0,J${n}-K${n})`, s: F.net },
    ]);
    // a deduction row under its line: count × measure (area, or a door's width for skirting) × multiplier (faces / thickness / 0)
    res.deductions.forEach((d) => {
      const m = rows.length + 1;
      const mult = d.n * d.area > 0 ? d.qty / (d.n * d.area) : 0;
      row([
        { v: "", s: F.ded }, { v: `↳ ${d.label || "فتحة"} — ${d.rule}`, s: { ...F.ded, wrap: true } }, { v: "", s: F.ded }, { v: "", s: F.ded },
        { v: d.n, s: F.dedNum }, { v: d.w, s: F.dedNum }, { v: d.h, s: F.dedNum },
        { f: `F${m}*G${m}`, s: F.dedNum }, { v: mult, s: F.dedNum }, { v: "", s: F.ded }, { f: `E${m}*H${m}*I${m}`, s: F.dedNum }, { v: "", s: F.ded },
      ]);
    });
    const key = `${kindName(l.kind)}|${res.unit}`;
    netCells.set(key, [...(netCells.get(key) || []), `L${n}`]);
  });
  row([]);
  row([{ v: "نوع الأعمال", s: F.head, span: 3 }, { v: "الوحدة", s: F.head }, { v: "الكمية الصافية", s: F.head }]);
  for (const [key, cells] of netCells) {
    const [name, unit] = key.split("|");
    row([{ v: name, s: { ...F.cell, b: true }, span: 3 }, { v: unit, s: { ...F.cell, center: true } }, { f: sumOf(cells), s: F.total }]);
  }
  resolve(rows);
  return {
    lang: "ar",
    title: doc.title,
    author: issuerName(project) || "—",
    sheets: [{ name: "حصر الكميات", rows, widths: [22, 40, 13, 8, 9, 10, 10, 12, 12, 13, 12, 13], freeze: headRow, filter: { row: headRow, cols: 12 }, printTitles: headRow, landscape: true }],
  };
}

export const module: ToolModule<Body> = {
  kind: "qto", v: 1, docType: "QTO", docTypeName: "حصر كميات · Quantity take-off", discipline: "مكتب فني · حصر", engine: QTO_ENGINE,
  profile: { id: "measure@1", edition: "IS 1200 / contract method of measurement", values: {}, overridden: [], unverified: [] },
  blank,
  defaultTitle: () => "حصر كميات",
  Editor,
  build,
  workbook,
  summary: (doc) => {
    const r = compute(doc.body);
    return ["حصر كميات", ...r.totals.map((t) => `${kindName(t.kind)}: ⁦${q3(t.net)} ${t.unit}⁩`), "راجع المستند الكامل"].join("\n");
  },
};

