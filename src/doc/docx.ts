// =====================================================================
//  Document kit — any tool document as an editable Word file (.docx), built on the device
//  · The same DocSpec the PDF draws, written as a minimal valid WordprocessingML package (OOXML) zipped with fflate —
//    the approach of the CV exporter (src/features/cv/docx.ts): content types, rels, document, styles, numbering, core.
//  · Word does its own layout, so nothing here measures text: blocks become real Word paragraphs, headings and tables
//    the engineer can edit (no pagination, carried-forward rows or running header — Word repeats the table header row).
//  · A4, 2 cm margins; Arabic documents mark every paragraph (bidi), run (rtl) and table (bidiVisual). A landscape
//    section gets its own section properties with the page turned.
//  · The issuer is the author (dc:creator), never the app; there is no docProps/app.xml (it would name the producer).
//  · Photos and sketches stay in the PDF: an image part would need relationships and the bytes from the photo store,
//    which a synchronous export cannot reach — a short line says where they are instead.
// =====================================================================
import { strToU8, zipSync } from "fflate";
import type { BasisRow, DocBlock, DocCol, DocLang, DocRow, DocSection, DocSpec, DocText, TitleParty } from "./model";
import { fmtNum } from "./text";

export const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const ACCENT = "3F33A0";
const INK2 = "52525B";
const INK3 = "71717A";
const RULE = "C9C9D1";
const HEAD_FILL = "EDEDF2";
const ROW_FILL = "F6F6F9";
const GOOD = "15803D";
const BAD = "B91C1C";

// A4 in twentieths of a point; 2 cm = 1134
const A4_W = 11906;
const A4_H = 16838;
const MARGIN = 1134;

// ---------------------------------------------------------------------
//  Text
// ---------------------------------------------------------------------
// the PDF backend needs LRI…PDI isolates and embeddings to place LTR runs inside Arabic; Word runs its own bidi
// algorithm, and the marks would only show up as invisible characters the engineer trips over while editing
const MARKS = /[⁦-⁩‪-‮]/g;
// characters XML 1.0 cannot carry at all (a stray control character would make Word refuse the whole file)
const XML_BAD = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;

const clean = (s: unknown) => String(s ?? "").replace(MARKS, "").replace(XML_BAD, "");

const esc = (s: unknown) =>
  clean(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// a DocText (or a table cell) as plain text: spans joined, numbers with the column's decimals
function textOf(t: DocText | number | null | undefined, dp?: number): string {
  if (t == null) return "";
  if (typeof t === "number") return dp != null ? fmtNum(t, dp) : String(t);
  if (typeof t === "string") return t;
  return t.spans.map((s) => s.t).join("");
}

// a span list asks for bold when any span is semibold or heavier
const isBold = (t: DocText | number | null | undefined) =>
  !!t && typeof t === "object" && t.spans.some((s) => (s.w || 450) >= 600);

// ---------------------------------------------------------------------
//  Runs, paragraphs, tables
// ---------------------------------------------------------------------
type RunOpt = { b?: boolean; i?: boolean; color?: string; sz?: number };
type ParaOpt = RunOpt & {
  style?: string;
  jc?: "start" | "end" | "center";
  keepNext?: boolean;
  bullet?: boolean;              // a real Word list item (numbering.xml, list 1)
  rule?: string;                 // a bottom border in this colour (the signature line)
  before?: number;
  after?: number;
  runs?: string;                 // prebuilt runs instead of `text`
};

// the language of the document being written (set by documentXml, which runs synchronously — as LANG in layout.ts).
// Labels are chosen by L2 — the document's language first, the other one after it; member text is never translated,
// and L2 is how the i18n extractor knows this copy carries its own English.
let LANG: DocLang = "ar";
const L2 = (ar: string, en: string) => (LANG === "ar" ? ar : en);

class Writer {
  readonly rtl: boolean;

  constructor(readonly lang: DocLang) {
    this.rtl = lang === "ar";
  }

  run(text: string, o: RunOpt = {}) {
    const pr =
      (o.b ? "<w:b/><w:bCs/>" : "") +
      (o.i ? "<w:i/><w:iCs/>" : "") +
      (o.color ? `<w:color w:val="${o.color}"/>` : "") +
      (o.sz ? `<w:sz w:val="${o.sz}"/><w:szCs w:val="${o.sz}"/>` : "") +
      (this.rtl ? "<w:rtl/>" : "");
    // a line break inside a value stays a line break (Word would otherwise fold it into a space)
    const parts = clean(text).split("\n");
    const body = parts
      .map((s, i) => `${i ? "<w:br/>" : ""}<w:t xml:space="preserve">${esc(s)}</w:t>`)
      .join("");
    return `<w:r>${pr ? `<w:rPr>${pr}</w:rPr>` : ""}${body}</w:r>`;
  }

  // paragraph properties in the schema's order (Word calls a file with them out of order corrupt)
  p(text: string, o: ParaOpt = {}) {
    const spacing =
      o.before != null || o.after != null
        ? `<w:spacing${o.before != null ? ` w:before="${o.before}"` : ""}${o.after != null ? ` w:after="${o.after}"` : ""}/>`
        : "";
    const pPr =
      (o.style ? `<w:pStyle w:val="${o.style}"/>` : "") +
      (o.keepNext ? "<w:keepNext/>" : "") +
      (o.bullet ? `<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>` : "") +
      (o.rule ? `<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="${o.rule}"/></w:pBdr>` : "") +
      (this.rtl ? "<w:bidi/>" : "") +
      spacing +
      (o.jc ? `<w:jc w:val="${o.jc}"/>` : "");
    const runs = o.runs ?? (text ? this.run(text, o) : "");
    return `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ""}${runs}</w:p>`;
  }

  // one table cell: a width, optional shading and span, and its paragraphs (a cell must hold at least one)
  tc(paras: string | string[], w: number, o: { fill?: string; span?: number } = {}) {
    const list = Array.isArray(paras) ? paras : [paras];
    const pr =
      `<w:tcW w:w="${w}" w:type="dxa"/>` +
      (o.span && o.span > 1 ? `<w:gridSpan w:val="${o.span}"/>` : "") +
      (o.fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${o.fill}"/>` : "");
    return `<w:tc><w:tcPr>${pr}</w:tcPr>${list.length ? list.join("") : this.p("")}</w:tc>`;
  }

  // rows of prebuilt cells; `head` rows repeat at the top of every page Word breaks the table onto
  tbl(widths: number[], rows: { cells: string[]; head?: boolean }[], o: { borders?: boolean } = {}) {
    const total = widths.reduce((a, b) => a + b, 0);
    const line = (side: string) => `<w:${side} w:val="single" w:sz="4" w:space="0" w:color="${RULE}"/>`;
    const borders = o.borders === false
      ? ""
      : `<w:tblBorders>${["top", "left", "bottom", "right", "insideH", "insideV"].map(line).join("")}</w:tblBorders>`;
    // table properties in the schema's order too: bidiVisual comes before the width
    const pr =
      (this.rtl ? "<w:bidiVisual/>" : "") +
      `<w:tblW w:w="${total}" w:type="dxa"/>` +
      borders +
      `<w:tblLayout w:type="fixed"/>` +
      `<w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar>`;
    const grid = `<w:tblGrid>${widths.map((w) => `<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>`;
    const trs = rows
      .map((r) => `<w:tr>${r.head ? "<w:trPr><w:tblHeader/><w:cantSplit/></w:trPr>" : "<w:trPr><w:cantSplit/></w:trPr>"}${r.cells.join("")}</w:tr>`)
      .join("");
    // Word wants a paragraph between two tables (and before a section break); an empty, tight one keeps them apart
    return `<w:tbl><w:tblPr>${pr}</w:tblPr>${grid}${trs}</w:tbl>${this.p("", { after: 60 })}`;
  }
}

// widths in twips from relative weights, summing exactly to the frame width
function spread(weights: number[], frame: number): number[] {
  const sum = weights.reduce((a, b) => a + (b > 0 ? b : 0), 0) || weights.length;
  const ws = weights.map((w) => Math.floor(((w > 0 ? w : sum / weights.length) / sum) * frame));
  ws[ws.length - 1] += frame - ws.reduce((a, b) => a + b, 0);
  return ws;
}

const frameOf = (orientation: DocSection["orientation"]) =>
  (orientation === "landscape" ? A4_H : A4_W) - 2 * MARGIN;

// ---------------------------------------------------------------------
//  Title block — parties, title, type, control row (the issuer's, never EngSpace's)
// ---------------------------------------------------------------------
function partyLabel(role: TitleParty["role"]) {
  return ({
    client: L2("المالك · Client", "Client · المالك"),
    project: L2("المشروع · Project", "Project · المشروع"),
    consultant: L2("الاستشاري · Consultant", "Consultant · الاستشاري"),
    contractor: L2("المقاول · Contractor", "Contractor · المقاول"),
    mainContractor: L2("المقاول الرئيسي · Main contractor", "Main contractor · المقاول الرئيسي"),
    subcontractor: L2("مقاول الباطن · Subcontractor", "Subcontractor · مقاول الباطن"),
  })[role] || role;
}

const STATUS = (s: DocSpec["meta"]["status"]) =>
  ({
    draft: L2("مسودة", "Draft"),
    issued: L2("صادر", "Issued"),
    superseded: L2("مُستبدَل", "Superseded"),
    void: L2("ملغى", "Void"),
  })[s] || s;

// a label over a value, as in the PDF's title-block cells
function labelled(x: Writer, label: string, value: string, o: RunOpt = {}) {
  return [
    x.p(label, { sz: 15, color: INK3, after: 0 }),
    x.p(value || "—", { sz: 19, after: 0, ...o }),
  ];
}

function titleBlock(x: Writer, spec: DocSpec, frame: number): string {
  const out: string[] = [];
  const { meta, title: tb } = spec;
  const parties = tb.parties.filter((p) => p.name || p.nameEn);
  if (parties.length) {
    const ws = spread(parties.map(() => 1), frame);
    const cells = parties.map((p, i) => {
      const name = [p.name, p.nameEn && p.nameEn !== p.name ? p.nameEn : ""].filter(Boolean).join(" · ");
      const label = p.issuer ? `${partyLabel(p.role)} — ${L2("المُصدِر · Issuer", "Issuer · المُصدِر")}` : partyLabel(p.role);
      return x.tc(labelled(x, label, name, { b: true }), ws[i], p.issuer ? { fill: ROW_FILL } : {});
    });
    out.push(x.tbl(ws, [{ cells }]));
  }
  out.push(x.p(tb.title, { style: "Title" }));
  out.push(x.p(meta.docTypeName, { style: "Subtitle" }));

  const control: [string, string][] = [
    [L2("رقم المستند · Doc No.", "Doc No. · رقم المستند"), meta.docNo || L2("مسودة — Draft", "Draft — مسودة")],
    [L2("المراجعة · Rev", "Rev · المراجعة"), meta.rev],
    [L2("الحالة · Status", "Status · الحالة"), STATUS(meta.status)],
    [L2("التاريخ · Date", "Date · التاريخ"), (meta.dateIso || "").slice(0, 10)],
    [L2("التخصص · Discipline", "Discipline · التخصص"), tb.discipline],
    [L2("الموقع · Location", "Location · الموقع"), tb.location],
    [L2("المرجع · Reference", "Reference · المرجع"), tb.reference],
  ];
  if (tb.scale) control.push([L2("المقياس · Scale", "Scale · المقياس"), tb.scale]);
  const ws = spread(control.map(([, v]) => Math.max(8, Math.min(24, clean(v).length + 4))), frame);
  out.push(x.tbl(ws, [{ cells: control.map(([l, v], i) => x.tc(labelled(x, l, v), ws[i])) }]));
  return out.join("");
}

// ---------------------------------------------------------------------
//  Blocks
// ---------------------------------------------------------------------
function markWord(mk?: string) {
  if (mk === "ok") return L2("مطابق ✓", "Pass ✓");
  if (mk === "fail") return L2("غير مطابق ✗", "Fail ✗");
  if (mk === "warn") return L2("مشروط", "Conditional");
  if (mk === "na") return L2("لا ينطبق", "N/A");
  return "—";
}

const markColor = (mk?: string) => (mk === "ok" ? GOOD : mk === "fail" ? BAD : undefined);

function headerCells(x: Writer, cols: { label: string; unit?: string; align?: DocCol["align"] }[], ws: number[]) {
  return cols.map((c, i) =>
    x.tc(x.p(c.unit ? `${c.label} (${c.unit})` : c.label, { b: true, sz: 17, after: 0, jc: c.align || "start" }), ws[i], { fill: HEAD_FILL }),
  );
}

function dataTable(x: Writer, b: Extract<DocBlock, { k: "table" }>, frame: number): string {
  const out: string[] = [];
  if (b.caption) out.push(x.p(b.caption, { style: "Caption", keepNext: true }));
  const ws = spread(b.cols.map((c) => c.wMm), frame);
  const row = (r: DocRow) => {
    const strong = r.kind === "section" || r.kind === "subtotal" || r.kind === "total";
    const fill = r.kind === "section" ? ROW_FILL : r.kind === "total" ? HEAD_FILL : undefined;
    const cells = b.cols.map((c, i) => {
      if (c.mark) {
        return x.tc(x.p(markWord(r.mark), { sz: 18, after: 0, jc: "center", b: strong, color: markColor(r.mark) }), ws[i], { fill });
      }
      if (c.sketch) return x.tc(x.p(r.sketch?.length ? "PDF" : "", { sz: 16, i: true, color: INK3, after: 0, jc: "center" }), ws[i], { fill });
      const v = r.cells[c.key];
      return x.tc(x.p(textOf(v, c.num?.dp), { sz: 18, after: 0, jc: c.align, b: strong || isBold(v as any) }), ws[i], { fill });
    });
    return { cells };
  };
  const rows = [{ cells: headerCells(x, b.cols, ws), head: true }, ...b.rows.map(row)];
  if (b.totals) rows.push(row({ ...b.totals, kind: "total" }));
  out.push(x.tbl(ws, rows));
  return out.join("");
}

function kvTable(x: Writer, b: Extract<DocBlock, { k: "kv" }>, frame: number): string {
  const pairs = b.cols;
  const n = pairs * 2;
  // labels narrower than their values: 2 : 3 per pair
  const ws = spread(Array.from({ length: n }, (_, i) => (i % 2 ? 3 : 2)), frame);
  const rows: { cells: string[] }[] = [];
  let cur: string[] = [];
  let used = 0;
  const flush = () => {
    if (!cur.length) return;
    // a short last row is padded so every row spans the grid
    for (let k = used; k < n; k++) cur.push(x.tc(x.p(""), ws[k]));
    rows.push({ cells: cur });
    cur = [];
    used = 0;
  };
  b.rows.forEach((r) => {
    const label = x.p(r.label, { sz: 17, color: INK2, after: 0 });
    const value = x.p(textOf(r.value), { sz: 19, after: 0, b: isBold(r.value) });
    if (r.wide) {
      flush();
      const rest = ws.slice(1).reduce((a, c) => a + c, 0);
      rows.push({ cells: [x.tc(label, ws[0], { fill: ROW_FILL }), x.tc(value, rest, { span: n - 1 })] });
      return;
    }
    cur.push(x.tc(label, ws[used], { fill: ROW_FILL }), x.tc(value, ws[used + 1]));
    used += 2;
    if (used >= n) flush();
  });
  flush();
  return rows.length ? x.tbl(ws, rows) : "";
}

function kpiTable(x: Writer, b: Extract<DocBlock, { k: "kpis" }>, frame: number): string {
  if (!b.items.length) return "";
  const ws = spread(b.items.map(() => 1), frame);
  const cells = b.items.map((it, i) =>
    x.tc(
      [
        x.p(it.label, { sz: 16, color: INK3, after: 0, jc: "center" }),
        x.p(it.unit ? `${it.value} ${it.unit}` : it.value, { sz: 26, b: true, after: 0, jc: "center", color: markColor(it.mark) }),
        ...(it.mark ? [x.p(markWord(it.mark), { sz: 15, after: 0, jc: "center", color: markColor(it.mark) || INK2 })] : []),
      ],
      ws[i],
      { fill: ROW_FILL },
    ),
  );
  return x.tbl(ws, [{ cells }]);
}

function checksTable(x: Writer, b: Extract<DocBlock, { k: "checks" }>, frame: number): string {
  const cols = [
    { label: L2("البند", "Item"), w: 62, align: "start" as const },
    { label: L2("القيمة", "Value"), w: 26, align: "end" as const },
    { label: L2("الحد", "Limit"), w: 26, align: "end" as const },
    { label: L2("المرجع", "Reference"), w: 32, align: "start" as const },
    { label: L2("النتيجة", "Result"), w: 28, align: "center" as const },
  ];
  const ws = spread(cols.map((c) => c.w), frame);
  const rows = b.rows.map((r) => {
    const mk = r.ok == null ? "na" : r.ok ? "ok" : "fail";
    const sign = r.ok == null ? "—" : r.ok ? "✓" : "✗";
    const clause = r.unverified ? `${r.clause} ⚑ ${L2("تحقق", "verify")}` : r.clause;
    const vals = [r.label, r.value, r.limit, clause];
    const cells = vals.map((v, i) => x.tc(x.p(v, { sz: 18, after: 0, jc: cols[i].align }), ws[i]));
    cells.push(x.tc(x.p(sign, { sz: 20, b: true, after: 0, jc: "center", color: markColor(mk) }), ws[4]));
    return { cells };
  });
  return x.tbl(ws, [{ cells: headerCells(x, cols, ws), head: true }, ...rows]);
}

function signaturesTable(x: Writer, b: Extract<DocBlock, { k: "signatures" }>, frame: number): string {
  const parties = b.parties.map((s) => ({ ...s }));
  const cols = parties.length + (b.stamp ? 1 : 0);
  if (!cols) return "";
  const ws = spread(Array.from({ length: cols }, () => 1), frame);
  // the empty line the signature goes on: a paragraph with a bottom border, tall enough to sign on paper
  const line = x.p("", { rule: INK3, before: 480, after: 40 });
  const cells = parties.map((s, i) =>
    x.tc(
      [
        x.p(s.role, { sz: 16, color: INK3, after: 20 }),
        x.p(s.name || "", { sz: 19, b: true, after: 0 }),
        ...(s.title ? [x.p(s.title, { sz: 17, after: 0 })] : []),
        ...(s.syndicateNo ? [x.p(L2(`رقم القيد: ${s.syndicateNo}`, `Syndicate No. ${s.syndicateNo}`), { sz: 16, color: INK2, after: 0 })] : []),
        line,
        x.p(L2("التوقيع · التاريخ", "Signature · Date"), { sz: 15, color: INK3, after: 0 }),
      ],
      ws[i],
    ),
  );
  if (b.stamp) {
    cells.push(x.tc([x.p(L2("الختم · Stamp", "Stamp · الختم"), { sz: 16, color: INK3, jc: "center", after: 1200 })], ws[cols - 1]));
  }
  return x.tbl(ws, [{ cells }]);
}

function basisBlock(x: Writer, b: Extract<DocBlock, { k: "basis" }>, frame: number): string {
  const out: string[] = [];
  if (b.rows.length) {
    out.push(x.p(L2("أساس الحساب · القيم والمراجع", "Calculation basis · values and sources"), { style: "Caption", keepNext: true }));
    const cols = [
      { label: L2("البند", "Item"), w: 48, align: "start" as const },
      { label: L2("القيمة", "Value"), w: 30, align: "end" as const },
      { label: L2("المصدر / البند", "Source / clause"), w: 56, align: "start" as const },
      { label: L2("قيمة المشروع", "Project value"), w: 40, align: "start" as const },
    ];
    const ws = spread(cols.map((c) => c.w), frame);
    const rows = b.rows.map((r: BasisRow) => {
      const value = r.unit ? `${r.value} ${r.unit}` : r.value;
      const source = [r.source, r.clause].filter(Boolean).join(" · ");
      const ovr = r.override ? `${r.override.value} — ${r.override.reason}` : "";
      const cells = [r.label + (r.flagged ? " ⚑" : ""), value, source, ovr].map((v, i) =>
        x.tc(x.p(v, { sz: 17, after: 0, jc: cols[i].align }), ws[i]),
      );
      return { cells };
    });
    out.push(x.tbl(ws, [{ cells: headerCells(x, cols, ws), head: true }, ...rows]));
  }
  if (b.formulas.length) {
    out.push(x.p(L2("طريقة الحساب", "Method"), { style: "Caption", keepNext: true }));
    b.formulas.forEach((f) => {
      const line = `${f.label}: ${f.expr} = ${f.value}${f.clause ? ` (${f.clause})` : ""}`;
      out.push(x.p(line, { sz: 18, after: 40 }));
    });
  }
  return out.join("");
}

function block(x: Writer, b: DocBlock, frame: number): string {
  switch (b.k) {
    case "heading":
      return x.p(b.num ? `${b.num}  ${b.text}` : b.text, { style: "Heading1" });
    case "kv":
      return kvTable(x, b, frame);
    case "kpis":
      return kpiTable(x, b, frame);
    case "table":
      return dataTable(x, b, frame);
    case "checks":
      return checksTable(x, b, frame);
    case "notes": {
      const out: string[] = [];
      if (b.title) out.push(x.p(b.title, { b: true, keepNext: true, after: 40 }));
      textOf(b.text)
        .split("\n")
        .forEach((l) => out.push(x.p(l, { b: isBold(b.text) })));
      return out.join("");
    }
    case "para": {
      if (b.bullet) {
        return x.p(b.text, {
          style: "ListBullet",
          bullet: true,
          b: b.strong,
          color: b.muted ? INK2 : undefined,
        });
      }
      return x.p(b.text, { b: b.strong, color: b.muted ? INK2 : undefined });
    }
    case "signatures":
      return signaturesTable(x, b, frame);
    case "disclaimer":
      return x.p(b.text, { sz: 15, color: INK3 });
    case "basis":
      return basisBlock(x, b, frame);
    case "photos":
    case "sketch": {
      const cap = b.k === "sketch" ? b.caption : "";
      const where = L2("الصور في نسخة PDF · Photos are in the PDF version", "Photos are in the PDF version · الصور في نسخة PDF");
      return x.p(cap ? `${cap} — ${where}` : where, { i: true, sz: 17, color: INK3 });
    }
    case "pageBreak":
      return `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
    default:
      return "";
  }
}

// ---------------------------------------------------------------------
//  Parts
// ---------------------------------------------------------------------
function sectPr(x: Writer, orientation: DocSection["orientation"]) {
  const land = orientation === "landscape";
  const size = land
    ? `<w:pgSz w:w="${A4_H}" w:h="${A4_W}" w:orient="landscape"/>`
    : `<w:pgSz w:w="${A4_W}" w:h="${A4_H}"/>`;
  return (
    `<w:sectPr>${size}` +
    `<w:pgMar w:top="${MARGIN}" w:right="${MARGIN}" w:bottom="${MARGIN}" w:left="${MARGIN}" w:header="567" w:footer="567" w:gutter="0"/>` +
    `${x.rtl ? "<w:bidi/>" : ""}</w:sectPr>`
  );
}

export function documentXml(spec: DocSpec): string {
  LANG = spec.meta.lang === "en" ? "en" : "ar";
  const x = new Writer(LANG);
  const sections = spec.sections.length ? spec.sections : [{ orientation: "portrait" as const, blocks: [] }];
  const body: string[] = [];
  sections.forEach((s, i) => {
    const frame = frameOf(s.orientation);
    if (i === 0) body.push(titleBlock(x, spec, frame));
    s.blocks.forEach((b) => body.push(block(x, b, frame)));
    // every section but the last closes with a paragraph that carries its own page setup (that is how Word
    // switches between portrait and landscape); the last one's sits at the end of the body
    if (i < sections.length - 1) {
      body.push(`<w:p><w:pPr>${sectPr(x, s.orientation)}</w:pPr></w:p>`);
    }
  });
  // the body never ends on a table (Word adds a paragraph there and then calls the file repaired)
  body.push(x.p(""));
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<w:body>${body.join("")}${sectPr(x, sections[sections.length - 1].orientation)}</w:body></w:document>`
  );
}

function stylesXml(lang: DocLang): string {
  const rtl = lang === "ar";
  const langTag = rtl ? `<w:lang w:val="ar-EG" w:bidi="ar-EG"/>` : `<w:lang w:val="en-GB" w:bidi="ar-EG"/>`;
  const font = `<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Arial" w:eastAsia="Calibri"/>`;
  const st = (id: string, name: string, ppr: string, rpr: string, extra = "") =>
    `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/><w:basedOn w:val="Normal"/>${extra}<w:qFormat/>` +
    `<w:pPr>${ppr}</w:pPr><w:rPr>${rpr}</w:rPr></w:style>`;
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
    `<w:docDefaults><w:rPrDefault><w:rPr>${font}<w:sz w:val="20"/><w:szCs w:val="20"/>${langTag}</w:rPr></w:rPrDefault>` +
    `<w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>` +
    `<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>` +
    st("Title", "Title", `<w:spacing w:before="200" w:after="40"/>`, `<w:b/><w:bCs/><w:sz w:val="36"/><w:szCs w:val="36"/>`) +
    st("Subtitle", "Subtitle", `<w:spacing w:after="120"/>`, `<w:color w:val="${ACCENT}"/><w:sz w:val="22"/><w:szCs w:val="22"/>`) +
    st(
      "Heading1",
      "heading 1",
      `<w:keepNext/><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="2" w:color="${RULE}"/></w:pBdr><w:spacing w:before="240" w:after="80"/><w:outlineLvl w:val="0"/>`,
      `<w:b/><w:bCs/><w:sz w:val="26"/><w:szCs w:val="26"/>`,
    ) +
    st("Caption", "caption", `<w:keepNext/><w:spacing w:before="120" w:after="60"/>`, `<w:b/><w:bCs/><w:color w:val="${INK2}"/><w:sz w:val="18"/><w:szCs w:val="18"/>`) +
    st("ListBullet", "List Bullet", `<w:spacing w:after="40"/><w:ind w:left="360" w:hanging="240"/>`, ``) +
    `</w:styles>`
  );
}

const NUMBERING =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
  `<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="singleLevel"/>` +
  `<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/>` +
  `<w:pPr><w:ind w:left="360" w:hanging="240"/></w:pPr><w:rPr><w:color w:val="${ACCENT}"/></w:rPr></w:lvl></w:abstractNum>` +
  `<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>`;

const CONTENT_TYPES =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
  `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
  `<Default Extension="xml" ContentType="application/xml"/>` +
  `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
  `<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>` +
  `<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>` +
  `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>` +
  `</Types>`;

const ROOT_RELS =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
  `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
  `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>` +
  `</Relationships>`;

const DOC_RELS =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
  `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
  `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>` +
  `</Relationships>`;

function coreXml(spec: DocSpec, now: Date): string {
  const who = esc(spec.meta.issuer);
  const iso = now.toISOString().replace(/\.\d{3}Z$/, "Z");
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">` +
    `<dc:title>${esc(spec.title.title)}</dc:title><dc:creator>${who}</dc:creator><cp:lastModifiedBy>${who}</cp:lastModifiedBy>` +
    `<dc:language>${spec.meta.lang === "ar" ? "ar-EG" : "en-GB"}</dc:language>` +
    `<dcterms:created xsi:type="dcterms:W3CDTF">${iso}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${iso}</dcterms:modified>` +
    `</cp:coreProperties>`
  );
}

// the .docx bytes (a zip of the parts above)
export function specDocx(spec: DocSpec, now = new Date()): Uint8Array {
  return zipSync(
    {
      "[Content_Types].xml": strToU8(CONTENT_TYPES),
      "_rels/.rels": strToU8(ROOT_RELS),
      "word/document.xml": strToU8(documentXml(spec)),
      "word/styles.xml": strToU8(stylesXml(spec.meta.lang)),
      "word/numbering.xml": strToU8(NUMBERING),
      "word/_rels/document.xml.rels": strToU8(DOC_RELS),
      "docProps/core.xml": strToU8(coreXml(spec, now)),
    },
    { level: 6 },
  );
}
