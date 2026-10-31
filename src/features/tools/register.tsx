// =====================================================================
//  السجلات — the technical office's logs (W7): the RFI log, the submittal log and the variation-order log, built from the
//  saved documents themselves (domain/tools/registers.ts). Shown under the tool («المستندات | السجل»): counts, late items in
//  red, a row per document (tap → the document), and the same export triad as every document — a dated log, numbered
//  <code>-<TYPE>-LOG, «as of» today (it is a snapshot, so it prints without a fingerprint).
// =====================================================================
import { useEffect, useMemo, useState } from "react";
import { REG_ENGINE, STATUS_LABEL, STATUS_TONE, registerOf, type RegDoc, type RegKind, type RegRow, type RegStatus } from "../../domain/tools/registers";
import type { DocBlock, DocCol, DocSpec } from "../../doc/model";
import { fmtNum, iso } from "../../doc/text";
import type { ToolDoc, ToolHeader } from "../../data/tool-docs";
import type { ToolProject } from "../../data/tool-projects";
import { searchDocs } from "../../tools/doc-search";
import { buildSpec, snapOf } from "./spec";
import { FilterChip, Num } from "../../ui/primitives";
import { FileDown, FileSpreadsheet, FileText } from "lucide-react";
import { renderDoc } from "../../doc/render";
import { saveOrShare } from "../../lib/report-pdf";

export const REGISTER_OF: Record<string, RegKind> = { rfi: "rfi", submittal: "submittal", vo: "vo" };

const META: Record<RegKind, { docType: string; title: string; docTypeName: string }> = {
  rfi: { docType: "RFI", title: "سجل طلبات الاستيضاح", docTypeName: "سجل طلبات الاستيضاح · RFI log" },
  submittal: { docType: "MAS", title: "سجل اعتمادات الخامات", docTypeName: "سجل اعتمادات الخامات · Submittal log" },
  vo: { docType: "VO", title: "سجل أوامر التغيير", docTypeName: "سجل أوامر التغيير · Variation order log" },
};

const money = (x: unknown) => (x == null || x === "" ? null : Number(x));

// the register as a document: one landscape table (+ the counts), through the same kit as every tool document
export function registerSpec(kind: RegKind, docs: RegDoc[], project: ToolProject | null, today: string): DocSpec {
  const reg = registerOf(kind, docs, today);
  const m = META[kind];
  const status = (x: RegRow) => STATUS_LABEL[x.status] + (x.late ? ` · ${x.late} يوم تأخير` : "");
  const base: DocCol[] = [
    { key: "n", label: "#", wMm: 9, align: "center", num: { dp: 0 } },
    { key: "no", label: "الرقم", wMm: 30, align: "center" },
    { key: "title", label: "الموضوع", wMm: 62, align: "start" },
    { key: "date", label: "التاريخ", wMm: 20, align: "center" },
  ];
  let cols: DocCol[];
  let cells: (x: RegRow, i: number) => Record<string, any>;
  if (kind === "vo") {
    cols = [
      ...base,
      { key: "claimed", label: "المطلوب", unit: "ج.م", wMm: 28, align: "end", num: { dp: 2 } },
      { key: "approved", label: "المعتمد", unit: "ج.م", wMm: 28, align: "end", num: { dp: 2 } },
      { key: "dA", label: "مدة مطلوبة", unit: "يوم", wMm: 18, align: "end", num: { dp: 0 } },
      { key: "dG", label: "مدة معتمدة", unit: "يوم", wMm: 18, align: "end", num: { dp: 0 } },
      { key: "st", label: "الحالة", wMm: 34, align: "center" },
    ];
    cells = (x, i) => ({ n: i + 1, no: iso(x.no), title: x.title, date: iso(x.date), claimed: money(x.extra.claimed), approved: money(x.extra.approved), dA: money(x.extra.daysAsked), dG: money(x.extra.daysApproved), st: status(x) });
  } else {
    cols = [
      ...base,
      ...(kind === "submittal" ? [{ key: "mat", label: "الخامة / المصنّع", wMm: 40, align: "start" } as DocCol] : [{ key: "to", label: "إلى", wMm: 40, align: "start" } as DocCol]),
      { key: "due", label: "الرد قبل", wMm: 20, align: "center" },
      { key: "done", label: "تاريخ الرد", wMm: 20, align: "center" },
      { key: "days", label: "أيام", wMm: 13, align: "end", num: { dp: 0 } },
      { key: "st", label: "الحالة", wMm: 36, align: "center" },
    ];
    cells = (x, i) => ({
      n: i + 1, no: iso(x.no), title: x.title, date: iso(x.date),
      mat: [x.extra.material, x.extra.manufacturer].filter(Boolean).join(" · "), to: x.extra.to || "",
      due: iso(x.due || "—"), done: iso(x.doneOn || "—"), days: x.days, st: status(x),
    });
  }
  const order: RegStatus[] = ["draft", "open", "pending", "submitted", "overdue", "answered", "approved", "approvedNoted", "partial", "revise", "rejected", "closed"];
  // a status is a state, not a compliance verdict: printed as words (a «mark» would print «مطابق / غير مطابق»)
  const kpis = order.filter((s) => reg.counts[s]).map((s) => ({ label: STATUS_LABEL[s], value: String(reg.counts[s]) }));
  // the VO log ends in a SUM of what was asked and what was approved (live formulas in the Excel copy)
  const voTotals = kind === "vo"
    ? {
        carry: { sumCols: ["claimed", "approved"] },
        totals: { kind: "total" as const, cells: { title: "الإجمالي", claimed: reg.rows.reduce((s, x) => s + Number(x.extra.claimed || 0), 0), approved: reg.rows.reduce((s, x) => s + Number(x.extra.approved || 0), 0) } },
      }
    : {};
  const blocks: DocBlock[] = [
    { k: "kv", cols: 3, rows: [
      { label: "حتى تاريخ", value: iso(today) }, { label: "العدد", value: iso(String(reg.total)) },
      kind === "vo" && reg.money
        ? { label: "المعتمد / المطلوب", value: iso(`${fmtNum(reg.money.approved, 2)} / ${fmtNum(reg.money.claimed, 2)}`) }
        : { label: "متوسط مدة الرد", value: iso(reg.avgTurnaround != null ? `${reg.avgTurnaround} يوم` : "—") },
    ] },
    ...(kpis.length ? [{ k: "kpis", items: kpis.slice(0, 6) } as DocBlock] : []),
    {
      k: "table", id: `reg-${kind}`, caption: m.title, grid: true, cols,
      rows: reg.rows.map((x, i) => ({ cells: cells(x, i) })),
      ...voTotals,
    },
    { k: "notes", title: "قراءة السجل", text: kind === "vo"
      ? "المطلوب = صافي الإضافات والإلغاءات في كل أمر تغيير؛ المعتمد كما في قرار المهندس (المرفوض صفر). المسودات لم تُقدَّم بعد."
      : "الرد قبل = تاريخ الطلب + مدة الرد المحددة فيه. «متأخر» = لم يُرد بعد وتجاوز موعده؛ المسودات لم تُرسل بعد فلا تُحسب متأخرة. الأيام = من التاريخ حتى الرد (أو حتى اليوم)." },
  ];
  const code = project ? project.code : "GEN";
  const doc: ToolDoc = {
    id: `reg-${kind}`, kind, v: 1, at: 0, createdAt: 0, projectId: project ? project.id : null, title: `${m.title} — حتى ${today}`,
    dateIso: today, docNo: `${code}-${m.docType}-LOG`, rev: "00", status: "issued", profile: { id: "office@1", edition: "Technical office practice", values: {}, overridden: [], unverified: [] },
    body: {}, photos: {}, log: [],
  };
  return buildSpec({
    doc, meta: { kind, docType: `${m.docType}-LOG`, docTypeName: m.docTypeName, discipline: "مكتب فني", engine: REG_ENGINE },
    project: project ? snapOf(project) : null, sections: [{ orientation: "landscape", blocks }], signRoles: ["prepared", "checked"],
  });
}

const TONE: Record<string, string> = { good: "text-good bg-good/10", bad: "text-bad bg-bad/10", warn: "text-warn bg-warn/10", muted: "text-ink-3 bg-surface" };
const GROUPS: [string, string, (s: RegStatus) => boolean][] = [
  ["all", "الكل", () => true],
  ["waiting", "بانتظار الرد", (s) => s === "open" || s === "pending" || s === "submitted"],
  ["late", "متأخر", (s) => s === "overdue"],
  ["done", "تم الرد", (s) => ["answered", "closed", "approved", "approvedNoted", "partial", "revise", "rejected"].includes(s)],
  ["draft", "مسودات", (s) => s === "draft"],
];

export function RegisterView({ app, kind, project, today }: { app: any; kind: RegKind; project: ToolProject | null; today: string }) {
  const [docs, setDocs] = useState<RegDoc[] | null>(null);
  const [group, setGroup] = useState("all");
  const headers: ToolHeader[] = searchDocs(app.toolIndex || [], "", { kinds: [kind], projectId: project ? project.id : null });
  const sig = headers.map((h) => `${h.id}:${h.at}`).join();
  useEffect(() => {
    let live = true;
    app.toolStore().then((s: any) => {
      if (live) setDocs(headers.map((h) => s.get(h.id)).filter(Boolean));
    });
    return () => {
      live = false;
    };
  }, [sig]);
  const reg = useMemo(() => (docs ? registerOf(kind, docs, today) : null), [docs, kind, today]);
  const [busy, setBusy] = useState<string | null>(null);
  if (!reg) return <div className="skeleton h-24 rounded-2xl" />;
  const name = (ext: string) => `${project ? project.code : "GEN"}-${META[kind].docType}-LOG-${today}.${ext}`;
  const exp = async (what: "pdf" | "docx" | "xlsx") => {
    if (busy || !docs) return;
    setBusy(what);
    try {
      const spec = registerSpec(kind, docs, project, today);
      if (what === "pdf") {
        const r = await renderDoc(spec);
        if (r.status !== "ok") throw new Error(r.status);
        await saveOrShare(new Uint8Array(await r.pdf.arrayBuffer()), name("pdf"), spec.title.title);
      } else if (what === "docx") {
        const { specDocx, DOCX_MIME } = await import("../../doc/docx");
        await saveOrShare(specDocx(spec), name("docx"), spec.title.title, DOCX_MIME);
      } else {
        const { specXlsx, XLSX_MIME } = await import("../../doc/xlsx");
        await saveOrShare(specXlsx(spec), name("xlsx"), spec.title.title, XLSX_MIME);
      }
    } catch {
      app.toast("تعذّر تصدير السجل");
    } finally {
      setBusy(null);
    }
  };
  const btn = "press flex-1 min-h-12 inline-flex items-center justify-center gap-1.5 rounded-xl border border-line-2 bg-surface text-[13px] disabled:opacity-50";
  const pick = GROUPS.find((g) => g[0] === group) || GROUPS[0];
  const rows = reg.rows.filter((x) => pick[2](x.status));
  return (
    <section className="space-y-3" data-register={kind}>
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-2xl bg-surface border border-line"><p className="text-[11.5px] text-ink-2">العدد</p><p className="text-[20px] font-semibold"><Num>{reg.total}</Num></p></div>
        <div className={`p-3 rounded-2xl border ${reg.overdue ? "border-bad/40 bg-bad/5" : "border-line bg-surface"}`} data-register-late={reg.overdue}><p className="text-[11.5px] text-ink-2">متأخر</p><p className={`text-[20px] font-semibold ${reg.overdue ? "text-bad" : ""}`}><Num>{reg.overdue}</Num></p></div>
        <div className="p-3 rounded-2xl bg-surface border border-line">
          {kind === "vo" && reg.money
            ? <><p className="text-[11.5px] text-ink-2">المعتمد</p><p className="text-[15px] font-semibold"><Num>{fmtNum(reg.money.approved, 0)}</Num></p></>
            : <><p className="text-[11.5px] text-ink-2">متوسط الرد</p><p className="text-[20px] font-semibold"><Num>{reg.avgTurnaround != null ? reg.avgTurnaround : "—"}</Num><span className="text-[11px] text-ink-2 ms-1">يوم</span></p></>}
        </div>
      </div>
      <div className="-mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar">
        {GROUPS.map(([id, label, f]) => {
          const n = reg.rows.filter((x) => f(x.status)).length;
          return <FilterChip key={id} on={group === id} onClick={() => setGroup(id)}>{label} <Num>{n}</Num></FilterChip>;
        })}
      </div>
      <div className="flex gap-2">
        <button type="button" data-register-pdf disabled={!!busy || !reg.total} onClick={() => void exp("pdf")} className={btn}><FileDown size={16} /> {busy === "pdf" ? "جارٍ…" : "PDF"}</button>
        <button type="button" data-register-docx disabled={!!busy || !reg.total} onClick={() => void exp("docx")} className={btn}><FileText size={16} /> Word</button>
        <button type="button" data-register-xlsx disabled={!!busy || !reg.total} onClick={() => void exp("xlsx")} className={btn}><FileSpreadsheet size={16} /> Excel</button>
      </div>
      {!rows.length && <p className="p-4 rounded-2xl border border-dashed border-line-2 text-[12.5px] text-ink-3 text-center">لا مستندات في هذا التصنيف.</p>}
      <ul className="desk-grid space-y-2">
        {rows.map((x) => (
          <li key={x.id}>
            <button type="button" data-register-row={x.status} onClick={() => app.push({ type: "tooldoc", id: `${kind}:${x.id}` })} className="press w-full text-start p-3.5 rounded-2xl bg-surface border border-line hover:border-line-3">
              <span className="flex items-start justify-between gap-2">
                <span className="min-w-0 text-[14px] leading-snug truncate" dir="auto">{x.title}</span>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium ${TONE[STATUS_TONE[x.status]]}`}>{STATUS_LABEL[x.status]}</span>
              </span>
              <span className="mt-1 flex flex-wrap gap-x-3 text-[11.5px] text-ink-3">
                <bdi dir="ltr" className="font-grotesk">{x.no}</bdi>
                <bdi dir="ltr" className="font-grotesk">{x.date}{x.due ? ` → ${x.due}` : ""}</bdi>
                {x.days != null && <span><Num>{x.days}</Num> يوم</span>}
                {x.late > 0 && <span className="text-bad">تأخير <Num>{x.late}</Num> يوم</span>}
                {kind === "vo" && <span><Num>{fmtNum(Number(x.extra.claimed || 0), 2)}</Num> ج.م</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
