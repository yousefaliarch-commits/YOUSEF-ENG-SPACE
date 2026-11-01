// =====================================================================
//  المستخلص الجاري — interim payment certificate (screen + PDF + Word + live Excel). Engine: src/domain/tools/ipc-calc.ts
//  · BOQ items with contract quantity and rate; the previous cumulative quantity and this period's quantity give every value
//    as previous · current · total (السابق · الحالي · الإجمالي), as Egyptian certificates and FIDIC 14.3 statements read.
//  · The contract's terms are inputs: retention % and its cap, the advance and how it is recovered (proportional or FIDIC 14.2),
//    VAT (14 % since Law 157/2025 — or the contract's rate) and its base, and any other deduction.
//  · «المستخلص التالي» opens the next certificate with this one's totals as its previous column.
//  · The Excel copy is a working certificate: terms in parameter cells, every value a formula, so changing the VAT or the
//    retention cell recalculates the whole sheet.
//  Money tool: never open to site supervisors (registry roles); amounts in EGP.
// =====================================================================
import { computeIpc, IPC_ENGINE, nextCertificateItems, type IpcItem, type IpcResult, type IpcTerms, type Triple } from "../../../domain/tools/ipc-calc";
import type { DocBlock } from "../../../doc/model";
import { fmtNum, iso } from "../../../doc/text";
import { evalFormula, ref, type Workbook, type XCell, type XFmt, type XRow } from "../../../doc/xlsx";
import type { ToolDoc } from "../../../data/tool-docs";
import { Card, Grid2, Note, NumField, Pick, ResultHero, RowCards, TextField, Working } from "../../../ui/kit";
import { numInputParse } from "../../../lib/num-input";
import { Num } from "../../../ui/primitives";
import type { ToolModule } from "../module";
import { buildSpec, issuerName } from "../spec";

type Item = { id: string; section: string; ref: string; desc: string; unit: string; qc: string; rate: string; qp: string; qq: string };
type Ded = { id: string; name: string; mode: "pct" | "fixed"; pct: string; prev: string; cur: string };
type Body = {
  certNo: string; from: string; to: string; contractRef: string;
  contract: string; ret: string; retLimit: string;
  adv: string; advMethod: "proportional" | "fidic"; fStart: string; fRate: string; advPrev: string;
  vat: string; vatOn: "gross" | "net";
  items: Item[]; deductions: Ded[];
};

const uid = () => Math.random().toString(36).slice(2, 9);
const N = (s: string | undefined) => numInputParse(s || "") ?? 0;
const money = (x: number) => fmtNum(x, 2);
const whole = (x: number) => fmtNum(x, 0);

const blankItem = (prev?: Item): Item => ({ id: uid(), section: prev?.section || "", ref: "", desc: "", unit: prev?.unit || "م³", qc: "", rate: "", qp: "0", qq: "" });
const blank = (): Body => ({
  certNo: "1", from: "", to: "", contractRef: "",
  contract: "", ret: "5", retLimit: "", adv: "0", advMethod: "proportional", fStart: "10", fRate: "25", advPrev: "0",
  vat: "14", vatOn: "gross",
  items: [blankItem()], deductions: [],
});

const itemsOf = (b: Body): IpcItem[] =>
  b.items.map((i) => ({ id: i.id, ref: i.ref, desc: i.desc, unit: i.unit, section: i.section, qtyContract: N(i.qc), rate: N(i.rate), qtyPrev: N(i.qp), qtyCur: N(i.qq) }));
const termsOf = (b: Body): IpcTerms => ({
  contractAmount: N(b.contract), retentionPct: N(b.ret), retentionLimitPct: b.retLimit.trim() ? N(b.retLimit) : null,
  advanceAmount: N(b.adv), advanceMethod: b.advMethod, fidicStartPct: N(b.fStart), fidicRatePct: N(b.fRate), advanceRecoveredPrev: N(b.advPrev),
  vatPct: N(b.vat), vatOn: b.vatOn,
  deductions: b.deductions.map((d) => ({ id: d.id, name: d.name, mode: d.mode, pct: N(d.pct), prev: N(d.prev), cur: N(d.cur) })),
});
const compute = (b: Body): IpcResult => computeIpc(itemsOf(b), termsOf(b));

// the rows of the summary, in the order certificates print them
function summaryRows(r: IpcResult): [string, Triple, boolean?][] {
  const s = r.s;
  return [
    ["إجمالي الأعمال المنفذة", s.gross, true],
    ["يُخصم: التأمين المحجوز", s.retention],
    ["يُخصم: استهلاك الدفعة المقدمة", s.advance],
    ["الصافي قبل الضريبة", s.netBeforeVat, true],
    ["يُضاف: ضريبة القيمة المضافة", s.vat],
    ...s.deductions.map((d) => [`يُخصم: ${d.name || "استقطاع"}`, d.t] as [string, Triple]),
    ["صافي المستحق", s.payable, true],
  ];
}

// previous · current · total, compact enough for a 360 px phone
function TripleTable({ rows }: { rows: [string, Triple, boolean?][] }) {
  return (
    <div className="rounded-xl border border-line overflow-hidden" data-ipc-summary>
      <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-x-2 px-3 py-2 bg-canvas text-[11px] text-ink-3">
        <span>البيان</span><span className="text-end">السابق</span><span className="text-end">الحالي</span><span className="text-end">الإجمالي</span>
      </div>
      {rows.map(([label, t, strong], i) => (
        <div key={i} className={`grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-x-2 px-3 py-2 border-t border-line text-[12px] ${strong ? "font-semibold bg-wash/40" : ""}`}>
          <span className="leading-snug">{label}</span>
          <Num className="text-end">{whole(t.prev)}</Num>
          <Num className="text-end">{whole(t.cur)}</Num>
          <Num className="text-end">{whole(t.total)}</Num>
        </div>
      ))}
    </div>
  );
}

function Editor({ body: b, set, ctx }: { body: Body; set: (b: Body) => void; ctx: any }) {
  const ro = ctx.readOnly;
  const put = (p: Partial<Body>) => !ro && set({ ...b, ...p });
  const r = compute(b);
  const C = N(b.contract);
  const progress = C > 0 ? (r.s.gross.total / C) * 100 : null;
  const steps = r.trace.map((t) => ({ label: t.label, expr: t.expr, value: t.value, clause: t.clause }));
  return (
    <div className="space-y-3">
      <ResultHero
        label={`صافي المستحق — المستخلص رقم ${b.certNo || "—"}`}
        value={money(r.s.payable.cur)}
        unit="ج.م"
        sub={`أعمال الفترة ${money(r.s.gross.cur)} · التراكمي ${money(r.s.gross.total)}${progress != null ? ` · ${fmtNum(progress, 1)}% من قيمة العقد` : ""}`}
        tone={r.issues.some((i) => i.level === "error") ? "bad" : "accent"}
        ring={progress != null ? progress / 100 : null}
        ringTone="accent"
      />
      <Card title="بيانات المستخلص">
        <Grid2>
          <TextField label="رقم المستخلص" dir="ltr" value={b.certNo} onChange={(v) => put({ certNo: v })} />
          <TextField label="مرجع العقد" dir="auto" value={b.contractRef} onChange={(v) => put({ contractRef: v })} />
          <label className="block"><span className="block text-[12px] text-ink-2 mb-1">الفترة من</span>
            <input type="date" dir="ltr" value={b.from} onChange={(e) => put({ from: e.target.value })} className="w-full h-12 px-3 rounded-xl bg-canvas border border-line-2 font-grotesk text-[15px]" /></label>
          <label className="block"><span className="block text-[12px] text-ink-2 mb-1">إلى</span>
            <input type="date" dir="ltr" value={b.to} onChange={(e) => put({ to: e.target.value })} className="w-full h-12 px-3 rounded-xl bg-canvas border border-line-2 font-grotesk text-[15px]" /></label>
        </Grid2>
      </Card>
      <Card title="شروط العقد">
        <div className="space-y-2.5">
          <NumField label="قيمة العقد (بدون ضريبة)" unit="ج.م" value={b.contract} onChange={(v) => put({ contract: v })} />
          <Grid2>
            <NumField label="التأمين المحجوز" unit="%" value={b.ret} onChange={(v) => put({ ret: v })} rule={{ min: 0, max: 100 }} />
            <NumField label="حد التأمين (اختياري)" unit="% من العقد" value={b.retLimit} onChange={(v) => put({ retLimit: v })} rule={{ min: 0, max: 100 }} hint="فارغ = بدون حد" />
          </Grid2>
          <NumField label="الدفعة المقدمة" unit="ج.م" value={b.adv} onChange={(v) => put({ adv: v })} />
          <Pick label="استهلاك الدفعة المقدمة" items={[["proportional", "بالتناسب مع الأعمال"], ["fidic", "FIDIC 1999 بند 14.2"]]} value={b.advMethod} onChange={(advMethod) => put({ advMethod })} />
          {b.advMethod === "fidic" && (
            <Grid2>
              <NumField label="يبدأ بعد اعتماد" unit="% من العقد" value={b.fStart} onChange={(v) => put({ fStart: v })} />
              <NumField label="معدل الاستهلاك" unit="% من المستخلص" value={b.fRate} onChange={(v) => put({ fRate: v })} />
              <NumField label="المستهلك حتى المستخلص السابق" unit="ج.م" value={b.advPrev} onChange={(v) => put({ advPrev: v })} />
            </Grid2>
          )}
          <Pick label="ضريبة القيمة المضافة" items={[["14", "14% — قانون 157/2025"], ["5", "5% — عقد على ضريبة الجدول"], ["0", "معفى"]]} value={(["14", "5", "0"].includes(b.vat) ? b.vat : "14") as any} onChange={(vat) => put({ vat })} />
          <Pick label="وعاء الضريبة" items={[["gross", "إجمالي أعمال الفترة"], ["net", "الصافي بعد التأمين والدفعة"]]} value={b.vatOn} onChange={(vatOn) => put({ vatOn })} />
        </div>
      </Card>
      <Card title={`بنود الأعمال (${b.items.length})`}>
        <RowCards<Item>
          rows={b.items} onChange={(items) => put({ items })} max={500} addLabel="بند جديد"
          blank={() => blankItem(b.items[b.items.length - 1])}
          summary={(it, i) => {
            const l = r.lines[i];
            return `${it.ref || "—"} · ${it.desc || "بند"} — ${l ? fmtNum(l.qtyTotal, 2) : "0"} ${it.unit} · ${l ? whole(l.amtTotal) : "0"} ج.م${l?.overrun ? " ⚠" : ""}`;
          }}
          render={(it, setI, i) => {
            const l = r.lines[i];
            return (
              <>
                <Grid2>
                  <TextField label="رقم البند" dir="ltr" value={it.ref} onChange={(v) => setI({ ...it, ref: v })} />
                  <TextField label="القسم (اختياري)" value={it.section} onChange={(v) => setI({ ...it, section: v })} />
                </Grid2>
                <TextField label="بيان الأعمال" value={it.desc} onChange={(v) => setI({ ...it, desc: v })} />
                <Grid2>
                  <TextField label="الوحدة" value={it.unit} onChange={(v) => setI({ ...it, unit: v })} />
                  <NumField label="الفئة" unit="ج.م" value={it.rate} onChange={(v) => setI({ ...it, rate: v })} />
                  <NumField label="كمية العقد" value={it.qc} onChange={(v) => setI({ ...it, qc: v })} />
                  <NumField label="الكمية السابقة" value={it.qp} onChange={(v) => setI({ ...it, qp: v })} />
                  <NumField label="كمية الفترة" value={it.qq} onChange={(v) => setI({ ...it, qq: v })} />
                </Grid2>
                {l && (
                  <p className="text-[12px] text-ink-2 leading-relaxed">
                    الإجمالي <Num>{fmtNum(l.qtyTotal, 2)}</Num> {it.unit}
                    {l.progress != null && <> · الإنجاز <Num>{fmtNum(l.progress * 100, 1)}%</Num></>}
                    {" "}· قيمة الفترة <Num>{money(l.amtCur)}</Num> · الإجمالية <Num>{money(l.amtTotal)}</Num>
                  </p>
                )}
                {l?.overrun && <Note tone="warn">{r.issues.find((x) => x.ref === it.ref && /تتجاوز/.test(x.text))?.text}</Note>}
              </>
            );
          }}
        />
      </Card>
      <Card title="استقطاعات أخرى">
        <RowCards<Ded>
          rows={b.deductions} onChange={(deductions) => put({ deductions })} max={20} addLabel="استقطاع"
          blank={() => ({ id: uid(), name: "", mode: "pct", pct: "", prev: "0", cur: "" })}
          summary={(d) => `${d.name || "استقطاع"} — ${d.mode === "pct" ? `${d.pct || 0}% من إجمالي الأعمال` : `${money(N(d.cur))} ج.م للفترة`}`}
          render={(d, setD) => (
            <>
              <TextField label="البيان" value={d.name} onChange={(v) => setD({ ...d, name: v })} placeholder="مثال: ضريبة الخصم من المنبع، غرامة، تشوينات" />
              <Pick items={[["pct", "نسبة من إجمالي الأعمال"], ["fixed", "مبلغ ثابت"]]} value={d.mode} onChange={(mode) => setD({ ...d, mode })} />
              {d.mode === "pct"
                ? <NumField label="النسبة حسب العقد / القانون" unit="%" value={d.pct} onChange={(v) => setD({ ...d, pct: v })} />
                : <Grid2>
                    <NumField label="السابق" unit="ج.م" value={d.prev} onChange={(v) => setD({ ...d, prev: v })} />
                    <NumField label="الفترة" unit="ج.م" value={d.cur} onChange={(v) => setD({ ...d, cur: v })} />
                  </Grid2>}
            </>
          )}
        />
        <Note>النسب حسب العقد والقانون الساري — لا يفترض التطبيق أي نسبة استقطاع.</Note>
      </Card>
      <Card title="ملخص المستخلص">
        <TripleTable rows={summaryRows(r)} />
        <div className="mt-2"><Working steps={steps} /></div>
      </Card>
      {r.issues.map((x, i) => <Note key={i} tone={x.level === "info" ? "quiet" : "warn"}>{x.text}</Note>)}
      {!ro && ctx.spawn && (
        <button
          type="button"
          data-ipc-next
          onClick={() => ctx.spawn(nextBody(b, r), `المستخلص رقم ${nextNo(b.certNo)}`)}
          className="press w-full min-h-12 rounded-xl bg-surface border border-line-2 text-[13.5px] font-medium"
        >
          إنشاء المستخلص التالي (رقم {nextNo(b.certNo)})
        </button>
      )}
    </div>
  );
}

const nextNo = (n: string) => (/^\d+$/.test(n.trim()) ? String(Number(n) + 1) : `${n}+1`);

// the next certificate: totals become the previous column, the period starts empty, fixed deductions carry their totals
function nextBody(b: Body, r: IpcResult): Body {
  const items = nextCertificateItems(itemsOf(b));
  return {
    ...b,
    certNo: nextNo(b.certNo),
    from: b.to ? addDay(b.to) : "",
    to: "",
    advPrev: String(Math.round(r.s.advance.total * 100) / 100),
    items: b.items.map((it, i) => ({ ...it, qp: String(items[i].qtyPrev), qq: "" })),
    deductions: b.deductions.map((d) => (d.mode === "fixed" ? { ...d, prev: String(N(d.prev) + N(d.cur)), cur: "" } : d)),
  };
}
const addDay = (isoDate: string) => {
  const d = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return "";
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

function build(doc: ToolDoc<Body>, project: any) {
  const b = doc.body;
  const r = compute(b);
  const C = N(b.contract);
  const terms = [
    `${b.ret || 0}%${b.retLimit.trim() ? ` حتى ${b.retLimit}% من العقد` : ""}`,
    N(b.adv) > 0 ? `${money(N(b.adv))} ج.م — ${b.advMethod === "fidic" ? `FIDIC 14.2 (يبدأ بعد ${b.fStart}% بمعدل ${b.fRate}%)` : "بالتناسب مع الأعمال"}` : "لا يوجد",
    `${b.vat || 0}% على ${b.vatOn === "net" ? "الصافي" : "إجمالي الأعمال"}`,
  ];
  const head: DocBlock[] = [
    { k: "kv", cols: 3, rows: [
      { label: "رقم المستخلص", value: iso(b.certNo || "—") }, { label: "الفترة", value: iso(`${b.from || "—"} → ${b.to || "—"}`) }, { label: "مرجع العقد", value: b.contractRef || "—" },
      { label: "قيمة العقد", value: iso(`${money(C)} EGP`) }, { label: "التأمين المحجوز", value: terms[0] }, { label: "الدفعة المقدمة", value: terms[1] },
      { label: "ضريبة القيمة المضافة", value: terms[2], wide: true },
    ] },
  ];
  const sections = new Set(b.items.map((i) => i.section).filter(Boolean));
  const itemRows = (() => {
    const out: any[] = [];
    let cur: string | null = null;
    r.lines.forEach((l) => {
      if (sections.size && (l.section || "") !== cur) {
        cur = l.section || "";
        out.push({ kind: "section", cells: { ref: cur || "بدون قسم" } });
      }
      out.push({ cells: { ref: iso(l.ref), desc: l.desc, unit: l.unit, qc: l.qtyContract, rate: l.rate, qp: l.qtyPrev, qq: l.qtyCur, qt: l.qtyTotal, ap: l.amtPrev, ac: l.amtCur, at: l.amtTotal }, mark: l.overrun ? "fail" : undefined });
    });
    return out;
  })();
  const items: DocBlock[] = [
    { k: "heading", num: "1", text: "بنود الأعمال" },
    {
      k: "table", id: "items", caption: "", grid: true, carry: { sumCols: ["ap", "ac", "at"] },
      cols: [
        { key: "ref", label: "البند", wMm: 14, align: "center" }, { key: "desc", label: "بيان الأعمال", wMm: 58, align: "start" },
        { key: "unit", label: "الوحدة", wMm: 12, align: "center" }, { key: "qc", label: "كمية العقد", wMm: 18, align: "end", num: { dp: 2 } },
        { key: "rate", label: "الفئة", wMm: 20, align: "end", num: { dp: 2 } }, { key: "qp", label: "الكمية السابقة", wMm: 19, align: "end", num: { dp: 2 } },
        { key: "qq", label: "كمية الفترة", wMm: 18, align: "end", num: { dp: 2 } }, { key: "qt", label: "الكمية الإجمالية", wMm: 19, align: "end", num: { dp: 2 }, xl: { f: "{qp}+{qq}" } },
        { key: "ap", label: "القيمة السابقة", wMm: 25, align: "end", num: { dp: 2 }, xl: { f: "{qp}*{rate}" } },
        { key: "ac", label: "قيمة الفترة", wMm: 25, align: "end", num: { dp: 2 }, xl: { f: "{qq}*{rate}" } },
        { key: "at", label: "القيمة الإجمالية", wMm: 27, align: "end", num: { dp: 2 }, xl: { f: "{qt}*{rate}" } },
      ],
      rows: itemRows,
      totals: { cells: { desc: "الإجمالي", ap: r.s.gross.prev, ac: r.s.gross.cur, at: r.s.gross.total } },
    },
  ];
  const sum: DocBlock[] = [
    { k: "heading", num: "2", text: "ملخص المستخلص" },
    {
      k: "table", id: "summary", caption: "", grid: true,
      cols: [
        { key: "l", label: "البيان", wMm: 66, align: "start" }, { key: "p", label: "السابق", unit: "ج.م", wMm: 40, align: "end", num: { dp: 2 } },
        { key: "c", label: "الحالي", unit: "ج.م", wMm: 40, align: "end", num: { dp: 2 }, xl: { f: "{t}-{p}" } }, { key: "t", label: "الإجمالي", unit: "ج.م", wMm: 40, align: "end", num: { dp: 2 } },
      ],
      rows: summaryRows(r).map(([l, t, strong]) => ({ kind: strong ? "subtotal" : undefined, cells: { l, p: t.prev, c: t.cur, t: t.total } })),
    },
    { k: "kpis", items: [
      { label: "صافي المستحق لهذا المستخلص", value: money(r.s.payable.cur), unit: "EGP" },
      { label: "الإنجاز من قيمة العقد", value: C > 0 ? fmtNum((r.s.gross.total / C) * 100, 1) : "—", unit: "%" },
      { label: "رصيد الدفعة المقدمة", value: money(Math.max(0, N(b.adv) - r.s.advance.total)), unit: "EGP" },
    ] },
  ];
  if (r.issues.length) sum.push({ k: "notes", title: "ملاحظات المراجعة", text: r.issues.map((x) => `• ${x.text}`).join("\n") });
  return buildSpec({
    doc, meta: module, project,
    sections: [{ orientation: "landscape", blocks: [...head, ...items] }, { orientation: "portrait", blocks: sum }],
    basis: { rows: [], formulas: r.trace.map((t) => ({ label: t.label, expr: t.expr, value: t.value, clause: t.clause })) },
    signRoles: ["contractorRep", "consultantRep", "approved"],
    reference: b.contractRef || undefined,
  });
}

// ---------------------------------------------------------------------
//  The working Excel certificate: terms in parameter cells, every value a formula
// ---------------------------------------------------------------------
const F = {
  title: { b: true, sz: 14 } as XFmt,
  sub: { color: "muted" } as XFmt,
  label: { color: "muted", border: true } as XFmt,
  head: { b: true, fill: "head", border: true, center: true, wrap: true } as XFmt,
  cell: { border: true } as XFmt,
  money: { border: true, num: "#,##0.00" } as XFmt,
  qty: { border: true, num: "#,##0.00" } as XFmt,
  pct: { border: true, num: "0.00%" } as XFmt,
  total: { b: true, fill: "total", border: true, top2: true, num: "#,##0.00" } as XFmt,
  band: { b: true, fill: "band", border: true } as XFmt,
};

// cached values for every formula cell, evaluated in passes (a cell may refer to one to its right)
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
  for (let pass = 0; pass < 6; pass++) {
    for (const x of cells) {
      const v = evalFormula(x.c.f!, (k) => vals.get(k) ?? null);
      if (v != null) {
        x.c.v = v;
        vals.set(x.r, v);
      }
    }
  }
}

function workbook(doc: ToolDoc<Body>, project: any): Workbook {
  const b = doc.body;
  const r = compute(b);
  const rows: XRow[] = [];
  const row = (cells: XCell[], ht?: number) => { rows.push({ cells, ht }); return rows.length; };
  const C = N(b.contract);
  const limit = b.retLimit.trim() ? N(b.retLimit) / 100 : null;

  row([{ v: doc.title, s: F.title, span: 12 }], 24);
  row([{ v: `مستخلص جاري رقم ${b.certNo || "—"} · الفترة ${b.from || "—"} → ${b.to || "—"}${b.contractRef ? ` · ${b.contractRef}` : ""}`, s: F.sub, span: 12 }]);
  row([{ v: [issuerName(project), project?.name].filter(Boolean).join(" · "), s: F.sub, span: 12 }]);
  row([]);
  // parameters (column B): the cells every summary formula reads
  const P: Record<string, number> = {};
  const param = (key: string, label: string, v: XCell) => { P[key] = row([{ v: label, s: F.label }, v]); };
  param("C", "قيمة العقد (بدون ضريبة)", { v: C, s: F.money });
  param("ret", "نسبة التأمين المحجوز", { v: N(b.ret) / 100, s: F.pct });
  param("lim", "حد التأمين المحجوز (٪ من العقد)", limit != null ? { v: limit, s: F.pct } : { v: "بدون حد", s: F.cell });
  param("adv", "الدفعة المقدمة", { v: N(b.adv), s: F.money });
  param("method", "طريقة الاستهلاك", { v: b.advMethod === "fidic" ? "FIDIC 1999 بند 14.2" : "بالتناسب مع الأعمال", s: F.cell });
  param("fs", "بداية الاستهلاك (FIDIC)", { v: N(b.fStart) / 100, s: F.pct });
  param("fr", "معدل الاستهلاك (FIDIC)", { v: N(b.fRate) / 100, s: F.pct });
  param("ap", "المستهلك حتى المستخلص السابق", { v: N(b.advPrev), s: F.money });
  param("vat", "ضريبة القيمة المضافة", { v: N(b.vat) / 100, s: F.pct });
  param("base", "وعاء الضريبة", { v: b.vatOn === "net" ? "الصافي بعد التأمين والدفعة" : "إجمالي الأعمال", s: F.cell });
  const B = (k: string) => `$B$${P[k]}`;
  row([]);

  // the items: H = F + G, I = F × E, J = G × E, K = H × E, L = H ÷ D
  const headRow = row(["رقم البند", "بيان الأعمال", "الوحدة", "كمية العقد", "الفئة", "الكمية السابقة", "كمية الفترة", "الكمية الإجمالية", "القيمة السابقة", "قيمة الفترة", "القيمة الإجمالية", "نسبة الإنجاز"].map((v) => ({ v, s: F.head })), 32);
  const first = headRow + 1;
  let sec: string | null = null;
  const hasSections = b.items.some((i) => i.section);
  r.lines.forEach((l) => {
    if (hasSections && (l.section || "") !== sec) {
      sec = l.section || "";
      row([{ v: sec || "بدون قسم", s: F.band, span: 12 }]);
    }
    const n = rows.length + 1;
    row([
      { v: l.ref, s: F.cell }, { v: l.desc, s: { ...F.cell, wrap: true } }, { v: l.unit, s: { ...F.cell, center: true } },
      { v: l.qtyContract, s: F.qty }, { v: l.rate, s: F.money }, { v: l.qtyPrev, s: F.qty }, { v: l.qtyCur, s: F.qty },
      { f: `F${n}+G${n}`, s: F.qty }, { f: `F${n}*E${n}`, s: F.money }, { f: `G${n}*E${n}`, s: F.money }, { f: `H${n}*E${n}`, s: F.money },
      l.qtyContract > 0 ? { f: `H${n}/D${n}`, s: F.pct } : { v: "", s: F.cell },
    ]);
  });
  const last = rows.length;
  const T = row([
    { v: "", s: F.total }, { v: "الإجمالي", s: F.total }, ...Array(6).fill({ v: "", s: F.total }),
    { f: `SUM(I${first}:I${last})`, s: F.total }, { f: `SUM(J${first}:J${last})`, s: F.total }, { f: `SUM(K${first}:K${last})`, s: F.total }, { v: "", s: F.total },
  ]);
  row([]);

  // the summary: C previous, D current (= total − previous), E total
  row([{ v: "البيان", s: F.head, span: 2 }, { v: "السابق", s: F.head }, { v: "الحالي", s: F.head }, { v: "الإجمالي", s: F.head }]);
  const line = (label: string, prev: XCell, total: XCell, strong = false) => {
    const n = rows.length + 1;
    const fmt = strong ? F.total : F.money;
    const as = (c: XCell): XCell => (c && typeof c === "object" ? { ...c, s: fmt } : { v: c as any, s: fmt });
    row([{ v: label, s: strong ? { ...F.total, num: undefined } : F.label, span: 2 }, as(prev), { f: `E${n}-C${n}`, s: fmt }, as(total)]);
    return n;
  };
  const g = line("إجمالي الأعمال المنفذة", { f: `I${T}` }, { f: `K${T}` }, true);
  const retF = (col: string) => (limit != null ? `MIN(${col}${g}*${B("ret")},${B("lim")}*${B("C")})` : `${col}${g}*${B("ret")}`);
  const ret = line("يُخصم: التأمين المحجوز", { f: retF("C") }, { f: retF("E") });
  let adv: number;
  if (N(b.adv) <= 0) adv = line("يُخصم: استهلاك الدفعة المقدمة", 0, 0);
  else if (b.advMethod === "fidic") adv = line("يُخصم: استهلاك الدفعة المقدمة", { f: B("ap") }, { f: `${B("ap")}+IF(K${T}>${B("fs")}*${B("C")},MIN(${B("fr")}*J${T},${B("adv")}-${B("ap")}),0)` });
  else if (C > 0) adv = line("يُخصم: استهلاك الدفعة المقدمة", { f: `MIN(${B("adv")},C${g}*${B("adv")}/${B("C")})` }, { f: `MIN(${B("adv")},E${g}*${B("adv")}/${B("C")})` });
  else adv = line("يُخصم: استهلاك الدفعة المقدمة", r.s.advance.prev, r.s.advance.total);
  const net = line("الصافي قبل الضريبة", { f: `C${g}-C${ret}-C${adv}` }, { f: `E${g}-E${ret}-E${adv}` }, true);
  const vb = b.vatOn === "net" ? net : g;
  const vat = line("يُضاف: ضريبة القيمة المضافة", { f: `C${vb}*${B("vat")}` }, { f: `E${vb}*${B("vat")}` });
  const deds = b.deductions.map((d) => {
    const label = `يُخصم: ${d.name || "استقطاع"}`;
    if (d.mode === "pct") {
      const p = N(d.pct) / 100;
      return line(`${label} (${d.pct || 0}%)`, { f: `C${g}*${p}` }, { f: `E${g}*${p}` });
    }
    return line(label, N(d.prev), N(d.prev) + N(d.cur));
  });
  const minus = (col: string) => deds.map((n) => `-${col}${n}`).join("");
  line("صافي المستحق", { f: `C${net}+C${vat}${minus("C")}` }, { f: `E${net}+E${vat}${minus("E")}` }, true);

  resolve(rows);
  return {
    lang: "ar",
    title: doc.title,
    author: issuerName(project) || "—",
    sheets: [{
      name: `مستخلص ${b.certNo || ""}`.trim(),
      rows,
      widths: [11, 40, 9, 13, 13, 13, 13, 14, 16, 16, 17, 11],
      freeze: headRow,
      filter: { row: headRow, cols: 12 },
      printTitles: headRow,
      landscape: true,
    }],
  };
}

export const module: ToolModule<Body> = {
  kind: "ipc", v: 1, docType: "IPC", docTypeName: "مستخلص جاري · Interim payment certificate", discipline: "مكتب فني · تعاقدات", engine: IPC_ENGINE,
  profile: { id: "contract@1", edition: "Contract terms (FIDIC 1999 / Egyptian practice)", values: {}, overridden: [], unverified: [] },
  blank,
  defaultTitle: (b) => `المستخلص رقم ${b.certNo || "1"}`,
  Editor,
  build,
  workbook,
  summary: (doc) => {
    const r = compute(doc.body);
    return [`مستخلص جاري رقم ⁦${doc.body.certNo || "—"}⁩`, `أعمال الفترة ⁦${money(r.s.gross.cur)}⁩ ج.م`, `صافي المستحق ⁦${money(r.s.payable.cur)}⁩ ج.م`, "راجع المستند الكامل"].join("\n");
  },
};
