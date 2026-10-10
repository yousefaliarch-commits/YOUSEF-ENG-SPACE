// =====================================================================
//  Document kit — layout: DocSpec → DrawPages (pure arithmetic, mm from each page's top-left)
//  · The page count is known before anything is drawn, so a backend draws, encodes and releases each page in one pass.
//  · Page 1 carries the issuer's title block (خرطوشة); pages 2+ a running header; every page the footer line, the only
//    EngSpace attribution. The colophon closes the last page.
//  · Reading direction is decided here only: fromStart() places a box from the reading start (the right edge in Arabic).
//  · Layout never throws on content: long words break, over-wide tables are scaled down and reported in `warnings`.
//  · Tables repeat their header on every page and, with `carry`, print «يُرحّل» / «ما قبله» sums at each break.
//  See docs/TOOLS-BLUEPRINT.md §5a.
// =====================================================================
import MARK_SHAPE from "../ui/brand-mark.json";
import type {
  DocBlock, DocCol, DocFont, DocLang, DocLayoutResult, DocMeasurer, DocRow, DocSpec, DrawOp, DrawPage, Ink, RevRow, TitleParty, VPath,
} from "./model";
import { MM_PER_PT, TYPE, frame, lineMm } from "./theme";
import { clampLines, flatText, fmtNum, hasArabic, iso, stripIsolates, wrapText } from "./text";

type O = "portrait" | "landscape";
type Align = "start" | "end" | "center";

let LANG: DocLang = "ar";
// copy in both languages: the document's language picks one (no dictionary entry needed)
const L2 = (ar: string, en: string) => (LANG === "ar" ? ar : en);

const GAP = 4.2;          // between blocks (12 pt)
const PAD = 2;            // cell padding, horizontal
const VPAD = 1.06;        // cell padding, vertical (3 pt)
const ROW_MIN = 7.4;
const HAIR = 0.35, RULE = 0.5, HEAVY = 1;

const STATUS_WORD = () => ({
  draft: L2("مسودة", "Draft"),
  issued: L2("صادر", "Issued"),
  superseded: L2("مُستبدَل", "Superseded"),
  void: L2("ملغى", "Void"),
});

// ---------------------------------------------------------------------
//  The pager: pages, the current op list, the cursor
// ---------------------------------------------------------------------
class Pager {
  pages: { orientation: O; ops: DrawOp[] }[] = [];
  ops: DrawOp[] = [];
  o: O = "portrait";
  y = 0;
  top = 0;
  bottom = 0;
  firstTop = 0;
  constructor(public m: DocMeasurer, public rtl: boolean, public warnings: string[]) {}
  get fr() {
    return frame(this.o);
  }
  open(o: O) {
    this.o = o;
    this.ops = [];
    this.pages.push({ orientation: o, ops: this.ops });
    this.top = this.pages.length === 1 ? this.firstTop : this.fr.bodyTop;
    this.y = this.top;
    this.bottom = this.fr.bodyBottom;
  }
  room() {
    return this.bottom - this.y;
  }
  atTop() {
    return this.y <= this.top + 0.01;
  }
  // a fresh page when h does not fit (never on an empty page: an oversize unit is drawn and clipped by the margin)
  need(h: number) {
    if (h > this.room() && !this.atTop()) this.open(this.o);
  }
  gap(g = GAP) {
    if (!this.atTop()) this.y += g;
  }
  // the left edge of a box `off` mm from the reading start
  fromStart(off: number, w: number) {
    const f = this.fr;
    return this.rtl ? f.right - off - w : f.left + off;
  }
}

// ---------------------------------------------------------------------
//  Small drawing helpers (they only push ops)
// ---------------------------------------------------------------------
const textDir = (rtl: boolean): "rtl" | "ltr" => (rtl ? "rtl" : "ltr");

function anchorX(left: number, w: number, dir: "rtl" | "ltr", align: Align, pad = PAD) {
  if (align === "center") return left + w / 2;
  const startRight = dir === "rtl";
  const atRight = align === "start" ? startRight : !startRight;
  return atRight ? left + w - pad : left + pad;
}

function baseline(m: DocMeasurer, top: number, lh: number, f: DocFont) {
  const a = m.ascent(f), d = m.descent(f);
  return top + (lh - (a + d)) / 2 + a;
}

function lines(
  ops: DrawOp[], m: DocMeasurer, ls: string[], left: number, w: number, top: number, f: DocFont, ink: Ink, dir: "rtl" | "ltr",
  align: Align = "start", lh = lineMm(f), pad = PAD,
) {
  ls.forEach((t, i) => {
    if (!t) return;
    // canvas ignores LRI/PDI: a line with no Arabic letters is drawn LTR at the same physical anchor («2–5», «48 h ≥ 21 °C»)
    let d = dir, al = align;
    if (dir === "rtl" && !hasArabic(t)) {
      d = "ltr";
      al = align === "start" ? "end" : align === "end" ? "start" : "center";
    }
    ops.push({ op: "text", x: anchorX(left, w, dir, align, pad), y: baseline(m, top + i * lh, lh, f), f, ink, dir: d, text: stripIsolates(t), align: al });
  });
}

const rect = (ops: DrawOp[], x: number, y: number, w: number, h: number, o: { fill?: Ink; stroke?: Ink; pt?: number }) =>
  ops.push({ op: "rect", x, y, w, h, ...o });

const hline = (ops: DrawOp[], x1: number, x2: number, y: number, pt: number, ink: Ink = "rule") =>
  ops.push({ op: "rule", x1, y1: y, x2, y2: y, pt, ink });

const vline = (ops: DrawOp[], x: number, y1: number, y2: number, pt: number, ink: Ink = "hair") =>
  ops.push({ op: "rule", x1: x, y1, x2: x, y2, pt, ink });

// the E+S mark from its master polygons (src/ui/brand-mark.json, never redrawn), as a path `hMm` tall
export function brandMarkPath(hMm: number): { paths: VPath[]; w: number } {
  const mk: any = MARK_SHAPE;
  const k = hMm / mk.box.h;
  const poly = (pts: number[][]) =>
    pts.map(([x, y], i) => `${i ? "L" : "M"}${((x - mk.box.x) * k).toFixed(3)} ${((y - mk.box.y) * k).toFixed(3)}`).join(" ") + " Z";
  return { paths: [{ d: poly(mk.s), fill: true }, { d: poly(mk.bar), fill: true }], w: mk.box.w * k };
}

// ---------------------------------------------------------------------
//  Title block (page 1) — §5a: rows A parties · B title · C control · D basis + the fingerprint cell
// ---------------------------------------------------------------------
const PARTY_LABEL = (role: TitleParty["role"]) =>
  ({
    client: L2("المالك · Client", "Client · المالك"),
    project: L2("المشروع · Project", "Project · المشروع"),
    consultant: L2("الاستشاري · Consultant", "Consultant · الاستشاري"),
    contractor: L2("المقاول · Contractor", "Contractor · المقاول"),
    mainContractor: L2("المقاول الرئيسي · Main contractor", "Main contractor · المقاول الرئيسي"),
    subcontractor: L2("مقاول الباطن · Subcontractor", "Subcontractor · مقاول الباطن"),
  })[role];

// the fingerprint as four groups of 4 hex («7F3A 91C2 0B5E 44D1»)
export const fingerprint = (hash: string) => (hash || "").slice(0, 16).toUpperCase().replace(/(.{4})(?=.)/g, "$1 ");

function titleBlock(p: Pager, spec: DocSpec, pageCount: { set: (n: number) => void }) {
  const { m, ops } = p;
  const f = p.fr;
  const k = f.width / 174;                   // landscape stretches every cell by 261 / 174
  const dir = textDir(p.rtl);
  const meta = spec.meta, tb = spec.title;
  const Y0 = f.top;
  const cell = (off: number, w: number, y: number, h: number, label: string, value: string, o: { font?: DocFont; ltr?: boolean; maxLines?: number } = {}) => {
    const x = p.fromStart(off * k, w * k);
    rect(ops, x, y, w * k, h, { stroke: "hair", pt: HAIR });
    rect(ops, x, y, w * k, 3.5, { fill: "fill" });
    // a bilingual label that does not fit keeps the document's language only
    const lab = m.width(label, TYPE.label) <= w * k - 2 * PAD ? label : label.split(" · ")[0];
    lines(ops, m, [clampLines([lab], 1, w * k - 2 * PAD, TYPE.label, m)[0]], x, w * k, y, TYPE.label, "ink60", dir, "start", 3.5);
    const font = o.font || TYPE.value;
    const vd = o.ltr ? "ltr" : dir;
    const ls = clampLines(wrapText(value || "—", w * k - 2 * PAD, font, m), o.maxLines || 1, w * k - 2 * PAD, font, m);
    const lh = lineMm(font, 1.35);
    const top = y + 3.5 + Math.max(0, (h - 3.5 - ls.length * lh) / 2);
    lines(ops, m, ls, x, w * k, top, font, "ink", vd, o.ltr && p.rtl ? "end" : "start", lh);
    return x;
  };

  // accent rule
  rect(ops, f.left, Y0, f.width, 0.7, { fill: "accent" });

  // row A — four party cells of 43.5 mm, in the issuer's order
  const parties = tb.parties.slice(0, 4);
  while (parties.length < 4) parties.push({ role: "project", name: "" });
  const yA = Y0 + 0.7, hA = 25.3;
  parties.forEach((pt, i) => {
    const x = p.fromStart(i * 43.5 * k, 43.5 * k);
    rect(ops, x, yA, 43.5 * k, hA, { stroke: "hair", pt: HAIR });
    rect(ops, x, yA, 43.5 * k, 3.5, { fill: "fill" });
    lines(ops, m, [PARTY_LABEL(pt.role)], x, 43.5 * k, yA, TYPE.label, "ink60", dir, "start", 3.5);
    let ny = yA + 4.5;
    if (pt.logo) {
      const lw = 34 * k, lh = 11;
      ops.push({ op: "image", ref: pt.logo, x: x + (43.5 * k - lw) / 2, y: ny, w: lw, h: lh });
      ny += lh + 0.8;
    }
    const name = LANG === "en" && pt.nameEn ? pt.nameEn : pt.name;
    const ls = clampLines(wrapText(name || "—", 43.5 * k - 2 * PAD, TYPE.value, m), pt.logo ? 2 : 3, 43.5 * k - 2 * PAD, TYPE.value, m);
    lines(ops, m, ls, x, 43.5 * k, ny, pt.issuer ? TYPE.cellBold : TYPE.value, "ink", dir, "center", lineMm(TYPE.value, 1.35));
    if (pt.issuer) hline(ops, x + 3, x + 43.5 * k - 3, yA + hA - 0.8, 0.75 * 1.4, "accent");
  });

  // row B — title 116 · type 58
  const yB = Y0 + 26, hB = 12;
  const tw = 116 * k - 2 * PAD;
  let tf = TYPE.tbTitle;
  let tl = wrapText(tb.title, tw, tf, m);
  if (tl.length > 2) {
    tf = { w: 700, pt: 11 };
    tl = clampLines(wrapText(tb.title, tw, tf, m), 2, tw, tf, m);
  }
  {
    const x = p.fromStart(0, 116 * k);
    rect(ops, x, yB, 116 * k, hB, { stroke: "hair", pt: HAIR });
    rect(ops, x, yB, 116 * k, 3.5, { fill: "fill" });
    lines(ops, m, [L2("عنوان المستند · Title", "Title · عنوان المستند")], x, 116 * k, yB, TYPE.label, "ink60", dir, "start", 3.5);
    const lh = lineMm(tf, 1.2);
    lines(ops, m, tl, x, 116 * k, yB + 3.5 + Math.max(0, (hB - 3.5 - tl.length * lh) / 2), tf, "ink", dir, "start", lh);
  }
  cell(116, 58, yB, hB, L2("نوع المستند · Type", "Type · نوع المستند"), `${meta.docType} · ${meta.docTypeName}`);

  // rows C and D (150 mm) + the fingerprint cell (24 mm, at the end side)
  const yC = Y0 + 38, hC = 13, yD = Y0 + 51, hD = 13;
  const st = STATUS_WORD()[meta.status] || meta.status;
  cell(0, 40, yC, hC, L2("رقم المستند · Doc No.", "Doc No. · رقم المستند"), meta.docNo || L2("مسودة", "Draft"), { ltr: !!meta.docNo });
  cell(40, 15, yC, hC, L2("المراجعة · Rev", "Rev · المراجعة"), meta.rev, { ltr: true });
  cell(55, 25, yC, hC, L2("الحالة · Status", "Status · الحالة"), st);
  cell(80, 25, yC, hC, L2("التاريخ · Date", "Date · التاريخ"), meta.dateIso.slice(0, 10), { ltr: true });
  cell(105, 20, yC, hC, L2("التخصص · Discipline", "Discipline · التخصص"), tb.discipline);
  cell(125, 25, yC, hC, L2("الموقع · Location", "Location · الموقع"), tb.location);
  cell(0, 50, yD, hD, L2("المرجع · Reference", "Reference · المرجع"), tb.reference);
  cell(50, 50, yD, hD, L2("ملف الكود · Code profile", "Code profile · ملف الكود"), meta.profileLabel, { ltr: true });
  cell(100, 20, yD, hD, L2("المقياس · Scale", "Scale · المقياس"), tb.scale || "—", { ltr: true });
  const pageX = cell(120, 30, yD, hD, L2("الصفحة · Page", "Page · الصفحة"), " ");
  const pageOp: DrawOp = {
    op: "text", x: anchorX(pageX, 30 * k, "ltr", p.rtl ? "end" : "start"), y: baseline(m, yD + 3.5 + (hD - 3.5 - lineMm(TYPE.value, 1.35)) / 2, lineMm(TYPE.value, 1.35), TYPE.value),
    f: TYPE.value, ink: "ink", dir: "ltr", text: "1/1", align: p.rtl ? "end" : "start",
  };
  ops.push(pageOp);
  pageCount.set = (n: number) => {
    (pageOp as any).text = `1/${n}`;
  };

  // fingerprint cell
  {
    const x = p.fromStart(150 * k, 24 * k);
    const w = 24 * k, h = hC + hD;
    rect(ops, x, yC, w, h, { stroke: "hair", pt: HAIR });
    rect(ops, x, yC, w, 3.5, { fill: "fill" });
    lines(ops, m, [L2("بصمة المستند", "Fingerprint")], x, w, yC, TYPE.label, "ink60", dir, "center", 3.5);
    if (meta.status !== "draft" && meta.hash) {
      const fp = fingerprint(meta.hash).split(" ");
      const lh = 3.4;
      const f7 = { w: 600, pt: 7.5 } as DocFont;
      lines(ops, m, [`${fp[0]} ${fp[1]}`, `${fp[2]} ${fp[3]}`], x, w, yC + 6, f7, "ink", "ltr", "center", lh);
      lines(ops, m, [meta.docNo || "", `Rev ${meta.rev}`], x, w, yC + 14.5, TYPE.foot, "ink60", "ltr", "center", 3);
    } else {
      lines(ops, m, ["—"], x, w, yC + 9, TYPE.value, "ink60", "ltr", "center", 5);
    }
  }
  // the outer frame
  rect(ops, f.left, Y0, f.width, 64, { stroke: "rule", pt: 0.75 });
  return Y0 + 64;
}

function revisionTable(p: Pager, revs: RevRow[], y: number) {
  const { m, ops } = p;
  const f = p.fr;
  const k = f.width / 174;
  const dir = textDir(p.rtl);
  const cols: [string, number, boolean][] = [
    [L2("Rev", "Rev"), 12, true], [L2("التاريخ", "Date"), 22, true], [L2("وصف التعديل", "Description"), 80, false],
    [L2("أعدّ", "Prepared"), 20, false], [L2("راجع", "Checked"), 20, false], [L2("اعتمد", "Approved"), 20, false],
  ];
  const rows = [...revs].reverse();
  const shown = rows.slice(0, 4);
  const draw = (cells: string[], top: number, head: boolean) => {
    let off = 0;
    cols.forEach(([, w, ltr], i) => {
      const x = p.fromStart(off * k, w * k);
      if (head) rect(ops, x, top, w * k, 5, { fill: "fill" });
      rect(ops, x, top, w * k, 5, { stroke: "hair", pt: HAIR });
      const font = head ? TYPE.label : TYPE.foot;
      const t = clampLines([cells[i] || ""], 1, w * k - 2 * PAD, font, m);
      lines(ops, m, t, x, w * k, top, font, head ? "ink60" : "ink", ltr && !head ? "ltr" : dir, ltr && !head && p.rtl ? "end" : "start", 5);
      off += w;
    });
  };
  draw(cols.map((c) => c[0]), y, true);
  let yy = y + 5;
  for (const r of shown) {
    draw([r.rev, r.dateIso.slice(0, 10), r.desc, r.prepared, r.checked, r.approved], yy, false);
    yy += 5;
  }
  if (rows.length > 4) {
    lines(ops, m, [L2(`و ${rows.length - 4} مراجعات سابقة — انظر ملحق المراجعات`, `and ${rows.length - 4} earlier revisions — see the revision appendix`)],
      f.left, f.width, yy, TYPE.foot, "ink60", dir, "start", 4.5);
    yy += 4.5;
  }
  return yy;
}

function draftBand(p: Pager, y: number) {
  const f = p.fr;
  rect(p.ops, f.left, y, f.width, 6, { fill: "ink60" });
  lines(p.ops, p.m, [L2("مسودة — غير صادرة · Draft — not issued", "Draft — not issued · مسودة — غير صادرة")], f.left, f.width, y, { w: 600, pt: 8.5 }, "white", textDir(p.rtl), "center", 6);
  return y + 6;
}

// ---------------------------------------------------------------------
//  Running header (pages 2+) and the footer (every page)
// ---------------------------------------------------------------------
function runningHeader(ops: DrawOp[], o: O, m: DocMeasurer, rtl: boolean, spec: DocSpec) {
  const f = frame(o);
  const dir = textDir(rtl);
  const third = f.width / 3;
  const shortTitle = clampLines([spec.title.title], 1, third - 2, TYPE.label, m)[0];
  const startX = rtl ? f.right - third : f.left;
  const endX = rtl ? f.left : f.right - third;
  lines(ops, m, [shortTitle], startX, third, f.top, TYPE.label, "ink80", dir, "start", 9, 0);
  lines(ops, m, [`${spec.meta.docNo || L2("مسودة", "Draft")} · Rev ${spec.meta.rev}`], f.left + third, third, f.top, TYPE.label, "ink80", spec.meta.docNo ? "ltr" : dir, "center", 9, 0);
  lines(ops, m, [clampLines([spec.meta.issuer], 1, third - 2, TYPE.label, m)[0]], endX, third, f.top, TYPE.label, "ink80", dir, "end", 9, 0);
  hline(ops, f.left, f.right, f.top + 9, RULE, "rule");
}

function footer(ops: DrawOp[], o: O, m: DocMeasurer, rtl: boolean, spec: DocSpec, n: number, of: number) {
  const f = frame(o);
  const dir = textDir(rtl);
  hline(ops, f.left, f.right, f.footerRule, HAIR, "hair");
  const mark = brandMarkPath(3.5);
  const base = f.footerBase;
  const markX = rtl ? f.right - mark.w : f.left;
  ops.push({ op: "path", x: markX, y: base - 3, scale: 1, d: mark.paths, ink: "ink60", pt: 0 });
  const credit = L2("أُعدّ باستخدام EngSpace · Prepared with EngSpace", "Prepared with EngSpace · أُعدّ باستخدام EngSpace");
  const cw = 80;
  const creditLeft = rtl ? f.right - mark.w - 1.5 - cw : f.left + mark.w + 1.5;
  ops.push({ op: "text", x: anchorX(creditLeft, cw, dir, "start", 0), y: base, f: TYPE.foot, ink: "ink60", dir, text: credit, align: "start" });
  const no = `${spec.meta.docNo || L2("مسودة", "Draft")} · Rev ${spec.meta.rev}`;
  ops.push({ op: "text", x: f.left + f.width / 2, y: base, f: TYPE.foot, ink: "ink60", dir: spec.meta.docNo ? "ltr" : dir, text: no, align: "center" });
  const pg = L2(`صفحة ${n} من ${of}`, `Page ${n} of ${of}`);
  const endLeft = rtl ? f.left : f.right - 40;
  ops.push({ op: "text", x: anchorX(endLeft, 40, dir, "end", 0), y: base, f: TYPE.foot, ink: "ink60", dir, text: pg, align: "end" });
}

// ---------------------------------------------------------------------
//  Blocks
// ---------------------------------------------------------------------
function heading(p: Pager, b: Extract<DocBlock, { k: "heading" }>, nextMin: number) {
  const lh = lineMm(TYPE.h1, 1.5);
  if (!p.atTop()) p.y += 6.35 - GAP;
  p.need(lh + 2.1 + nextMin);
  const dir = textDir(p.rtl);
  const f = p.fr;
  let off = 0;
  if (b.num) {
    const nw = p.m.width(b.num, TYPE.h1) + 2.5;
    lines(p.ops, p.m, [b.num], p.fromStart(0, nw), nw, p.y, TYPE.h1, "accent", "ltr", p.rtl ? "end" : "start", lh, 0);
    off = nw;
  }
  const ls = clampLines(wrapText(b.text, f.width - off, TYPE.h1, p.m), 2, f.width - off, TYPE.h1, p.m);
  lines(p.ops, p.m, ls, p.fromStart(off, f.width - off), f.width - off, p.y, TYPE.h1, "ink", dir, "start", lh, 0);
  p.y += ls.length * lh + 2.1;
}

function kv(p: Pager, b: Extract<DocBlock, { k: "kv" }>) {
  const { m } = p;
  const f = p.fr;
  const dir = textDir(p.rtl);
  const pairW = f.width / b.cols;
  const longest = Math.max(0, ...b.rows.map((r) => m.width(r.label, TYPE.label) + 2 * PAD));
  const labW = Math.min(40, Math.max(24, longest));
  // group into lines: a wide row takes a whole line
  const groups: (typeof b.rows)[] = [];
  let cur: typeof b.rows = [];
  for (const r of b.rows) {
    if (r.wide) {
      if (cur.length) groups.push(cur);
      groups.push([r]);
      cur = [];
      continue;
    }
    cur.push(r);
    if (cur.length === b.cols) {
      groups.push(cur);
      cur = [];
    }
  }
  if (cur.length) groups.push(cur);
  const lh = lineMm(TYPE.value, 1.45);
  p.gap();
  for (const g of groups) {
    const wide = g.length === 1 && g[0].wide;
    const pw = wide ? f.width : pairW;
    const prepared = g.map((r) => {
      const { text } = flatText(r.value);
      const ls = clampLines(wrapText(text || "—", pw - labW - 2 * PAD, TYPE.value, m), wide ? 6 : 3, pw - labW - 2 * PAD, TYPE.value, m);
      const ll = clampLines(wrapText(r.label, labW - 2 * PAD, TYPE.label, m), 2, labW - 2 * PAD, TYPE.label, m);
      return { r, ls, ll };
    });
    const h = Math.max(ROW_MIN, ...prepared.map((x) => Math.max(x.ls.length, x.ll.length) * lh + 2 * VPAD));
    p.need(h);
    prepared.forEach((x, i) => {
      const left = p.fromStart(i * pw, pw);
      const labLeft = p.rtl ? left + pw - labW : left;
      const valLeft = p.rtl ? left : left + labW;
      rect(p.ops, labLeft, p.y, labW, h, { fill: "fill" });
      rect(p.ops, left, p.y, pw, h, { stroke: "hair", pt: HAIR });
      lines(p.ops, m, x.ll, labLeft, labW, p.y + VPAD, TYPE.label, "ink60", dir, "start", lh);
      lines(p.ops, m, x.ls, valLeft, pw - labW, p.y + VPAD, TYPE.value, "ink", dir, "start", lh);
    });
    p.y += h;
  }
}

function markWord(mk: "ok" | "fail" | "warn" | "na" | undefined | null) {
  if (mk === "ok") return L2("مطابق ✓", "Pass ✓");
  if (mk === "fail") return L2("غير مطابق ✗", "Fail ✗");
  if (mk === "warn") return L2("مشروط", "Conditional");
  if (mk === "na") return L2("لا ينطبق", "N/A");
  return "";
}

function kpis(p: Pager, b: Extract<DocBlock, { k: "kpis" }>) {
  const { m } = p;
  const f = p.fr;
  const dir = textDir(p.rtl);
  const H = 17;
  p.gap();
  for (let i = 0; i < b.items.length; i += 5) {
    const row = b.items.slice(i, i + 5);
    const gut = 3;
    const w = (f.width - gut * (row.length - 1)) / row.length;
    p.need(H);
    row.forEach((it, j) => {
      const x = p.fromStart(j * (w + gut), w);
      const fail = it.mark === "fail";
      rect(p.ops, x, p.y, w, H, { fill: fail ? "ink" : "wash", stroke: "hair", pt: HAIR });
      const vInk: Ink = fail ? "white" : "ink";
      const unitW = it.unit ? m.width(it.unit, TYPE.value) + 1.2 : 0;
      const vw = m.width(it.value, TYPE.kpi);
      const total = vw + unitW;
      // value + unit as one LTR run, centred
      const vx = x + (w - total) / 2;
      p.ops.push({ op: "text", x: vx, y: p.y + 7.5, f: TYPE.kpi, ink: vInk, dir: "ltr", text: it.value, align: "start" });
      if (it.unit) p.ops.push({ op: "text", x: vx + vw + 1.2, y: p.y + 7.5, f: TYPE.value, ink: fail ? "white" : "ink80", dir: "ltr", text: it.unit, align: "start" });
      const lab = clampLines(wrapText(it.label, w - 2 * PAD, TYPE.label, m), 1, w - 2 * PAD, TYPE.label, m);
      lines(p.ops, m, lab, x, w, p.y + 9.2, TYPE.label, fail ? "white" : "ink60", dir, "center", 3.6);
      if (it.mark) lines(p.ops, m, [markWord(it.mark)], x, w, p.y + 12.6, TYPE.label, fail ? "white" : "ink80", dir, "center", 3.6);
    });
    p.y += H + (i + 5 < b.items.length ? gut : 0);
  }
}

// ---- tables ----
type TableBlock = Extract<DocBlock, { k: "table" }>;

function cellText(col: DocCol, v: DocRow["cells"][string]): { text: string; num: boolean; w?: 450 | 600 | 700 } {
  if (typeof v === "number") return { text: fmtNum(v, col.num ? col.num.dp : 2), num: true };
  if (v == null) return { text: "", num: !!col.num };
  const ft = flatText(v);
  return { text: ft.text, num: !!col.num, w: ft.w };
}

function table(p: Pager, b: TableBlock) {
  const { m } = p;
  const f = p.fr;
  const dir = textDir(p.rtl);
  // widths: scale down when they overflow the text block
  const sum = b.cols.reduce((a, c) => a + c.wMm, 0);
  const scale = sum > f.width + 0.01 ? f.width / sum : 1;
  if (scale < 1) p.warnings.push(`table ${b.id}: columns ${sum.toFixed(1)} mm scaled to ${f.width} mm`);
  const cols = b.cols.map((c) => ({ ...c, w: c.wMm * scale }));
  const offs: number[] = [];
  cols.reduce((a, c, i) => ((offs[i] = a), a + c.w), 0);
  const tw = cols.reduce((a, c) => a + c.w, 0);
  const tLeft = p.fromStart(0, tw);
  const colLeft = (i: number) => p.fromStart(offs[i], cols[i].w);
  const lhCell = lineMm(TYPE.cell, 1.5);
  const lhHead = lineMm(TYPE.head, 1.41);

  // header
  const headLines = cols.map((c) => {
    const label = c.unit ? `${c.label} (${c.unit})` : c.label;
    return clampLines(wrapText(label, c.w - 2 * PAD, TYPE.head, m), 3, c.w - 2 * PAD, TYPE.head, m);
  });
  const headH = Math.max(ROW_MIN, Math.max(...headLines.map((l) => l.length)) * lhHead + 2 * VPAD);

  // rows, measured once
  type Prep = { row: DocRow; h: number; cells: { ls: string[]; num: boolean; w?: 450 | 600 | 700; span?: number }[] };
  const prep = (row: DocRow): Prep => {
    if (row.kind === "section") {
      const first = flatText(row.cells[cols[0].key] ?? Object.values(row.cells)[0] ?? "").text;
      const ls = wrapText(first, tw - 2 * PAD, TYPE.cellBold, m);
      return { row, h: Math.max(ROW_MIN, ls.length * lhCell + 2 * VPAD), cells: [{ ls, num: false, w: 600 }] };
    }
    // a carry row's label runs across the empty columns that follow it
    const spanKey = (row as any).spanLabel as string | undefined;
    const spanFrom = spanKey ? cols.findIndex((c) => c.key === spanKey) : -1;
    let spanTo = spanFrom;
    if (spanFrom >= 0) while (spanTo + 1 < cols.length && row.cells[cols[spanTo + 1].key] == null) spanTo++;
    const cells = cols.map((c, i) => {
      if (i > spanFrom && i <= spanTo) return { ls: [], num: false };
      if (i === spanFrom) {
        const w = cols.slice(spanFrom, spanTo + 1).reduce((a, x) => a + x.w, 0);
        const ct = cellText(c, row.cells[c.key]);
        return { ls: clampLines([ct.text], 1, w - 2 * PAD, TYPE.cellBold, m), num: false, w: 600 as const, span: w };
      }
      if (c.mark) return { ls: [markWord(row.mark)], num: false };
      if (c.sketch) return { ls: [], num: false };
      const ct = cellText(c, row.cells[c.key]);
      const font = row.kind === "total" || row.kind === "subtotal" || ct.w === 600 || ct.w === 700 ? TYPE.cellBold : TYPE.cell;
      return { ls: ct.num ? [ct.text] : wrapText(ct.text, c.w - 2 * PAD, font, m), num: ct.num, w: ct.w };
    });
    const sk = cols.some((c) => c.sketch) && row.sketch ? 18 : 0;
    return { row, h: Math.max(ROW_MIN, sk + 2 * VPAD, ...cells.map((c) => c.ls.length * lhCell + 2 * VPAD)), cells };
  };

  const drawHeader = () => {
    rect(p.ops, tLeft, p.y, tw, headH, { fill: "fill" });
    hline(p.ops, tLeft, tLeft + tw, p.y, HEAVY, "ink");
    cols.forEach((c, i) => {
      const x = colLeft(i);
      const ls = headLines[i];
      const top = p.y + (headH - ls.length * lhHead) / 2;
      // a number column's header sits physically right, like its numbers
      const align: Align = c.num ? (p.rtl ? "start" : "end") : c.align === "center" ? "center" : "start";
      lines(p.ops, m, ls, x, c.w, top, TYPE.head, "ink", dir, align, lhHead);
      if (b.grid && i > 0) vline(p.ops, p.rtl ? x + c.w : x, p.y, p.y + headH, HAIR, "hair");
    });
    p.y += headH;
    hline(p.ops, tLeft, tLeft + tw, p.y, RULE, "rule");
  };

  let zebra = 0;
  const drawRow = (pr: Prep) => {
    const { row } = pr;
    const y = p.y;
    const strong = row.kind === "total" || row.kind === "subtotal";
    if (row.kind === "section") {
      rect(p.ops, tLeft, y, tw, pr.h, { fill: "wash" });
      lines(p.ops, m, pr.cells[0].ls, tLeft, tw, y + VPAD, TYPE.cellBold, "ink", dir, "start", lhCell);
    } else {
      if (b.zebra && row.kind !== "total" && zebra++ % 2 === 1) rect(p.ops, tLeft, y, tw, pr.h, { fill: "wash" });
      if (row.kind === "total") rect(p.ops, tLeft, y, tw, pr.h, { fill: "fill" });
      if (strong) hline(p.ops, tLeft, tLeft + tw, y, RULE, "ink");
      cols.forEach((c, i) => {
        const x = colLeft(i);
        const cell = pr.cells[i];
        if (c.sketch && row.sketch) {
          p.ops.push({ op: "path", x: x + PAD, y: y + VPAD, scale: 1, d: row.sketch, ink: "ink", pt: 0.5 });
          return;
        }
        if (c.mark) {
          const word = cell.ls[0];
          if (row.mark === "fail" && word) {
            const ww = Math.min(c.w - 2, m.width(word, TYPE.cellBold) + 3);
            rect(p.ops, x + (c.w - ww) / 2, y + (pr.h - 5) / 2, ww, 5, { fill: "ink" });
            lines(p.ops, m, [word], x, c.w, y + (pr.h - 5) / 2, TYPE.cellBold, "white", dir, "center", 5);
          } else lines(p.ops, m, cell.ls, x, c.w, y + VPAD, TYPE.cell, row.mark === "na" ? "ink60" : "ink", dir, "center", lhCell);
          return;
        }
        const font = strong || cell.w === 600 || cell.w === 700 ? TYPE.cellBold : TYPE.cell;
        if (cell.span) {
          lines(p.ops, m, cell.ls, p.fromStart(offs[i], cell.span), cell.span, y + VPAD, font, "ink", dir, "start", lhCell);
          return;
        }
        // numbers sit physically right in every language
        if (cell.num) lines(p.ops, m, cell.ls, x, c.w, y + VPAD, font, "ink", "ltr", "end", lhCell);
        else lines(p.ops, m, cell.ls, x, c.w, y + VPAD, font, "ink", dir, c.align === "center" ? "center" : c.align === "end" ? "end" : "start", lhCell);
      });
    }
    if (b.grid && row.kind !== "section")
      cols.forEach((c, i) => {
        if (i === 0 || pr.cells[i].ls.length === 0 && pr.cells.slice(0, i).some((x) => x.span)) return;
        vline(p.ops, p.rtl ? colLeft(i) + c.w : colLeft(i), y, y + pr.h, HAIR, "hair");
      });
    p.y += pr.h;
    hline(p.ops, tLeft, tLeft + tw, p.y, HAIR, "hair");
  };

  // carried sums
  const sumCols = b.carry ? b.carry.sumCols : [];
  const sums: Record<string, number> = {};
  sumCols.forEach((k) => (sums[k] = 0));
  const carryRow = (label: string): DocRow => {
    const cells: DocRow["cells"] = {};
    cols.forEach((c) => (cells[c.key] = null));
    const firstText = cols.find((c) => !sumCols.includes(c.key) && !c.mark && !c.sketch);
    if (firstText) cells[firstText.key] = { spans: [{ t: label, w: 600 }] };
    sumCols.forEach((k) => (cells[k] = sums[k]));
    return { cells, kind: "subtotal", ...(firstText ? { spanLabel: firstText.key } : {}) } as DocRow;
  };
  const carryH = sumCols.length ? ROW_MIN : 0;

  const rows = b.rows.map(prep);
  const totals = b.totals ? prep({ ...b.totals, kind: "total" }) : null;
  const minRows = Math.max(1, b.minRowsBeforeBreak ?? 3);

  // caption + header + the first rows must fit together
  p.gap();
  const capLh = lineMm(TYPE.caption, 1.5);
  const capLines = b.caption ? clampLines(wrapText(b.caption, f.width, TYPE.caption, m), 2, f.width, TYPE.caption, m) : [];
  const firstRows = rows.slice(0, minRows).reduce((a, r) => a + r.h, 0);
  p.need(capLines.length * capLh + headH + firstRows + (rows.length > minRows ? carryH : 0));
  if (capLines.length) {
    lines(p.ops, m, capLines, f.left, f.width, p.y, TYPE.caption, "ink80", dir, "start", capLh, 0);
    p.y += capLines.length * capLh + 1;
  }
  drawHeader();

  rows.forEach((pr, i) => {
    const isLast = i === rows.length - 1;
    const tail = isLast ? (totals ? totals.h : 0) : carryH;
    if (pr.h + tail > p.room() && p.y > p.top + headH + 0.01) {
      // close this page with «يُرحّل», open the next with the header and «ما قبله»
      if (sumCols.length) drawRow(prep(carryRow(L2("يُرحّل · Carried forward", "Carried forward · يُرحّل"))));
      hline(p.ops, tLeft, tLeft + tw, p.y, HEAVY, "ink");
      p.open(p.o);
      drawHeader();
      if (sumCols.length) drawRow(prep(carryRow(L2("ما قبله · Brought forward", "Brought forward · ما قبله"))));
    }
    drawRow(pr);
    if (pr.row.kind !== "section" && pr.row.kind !== "subtotal" && pr.row.kind !== "total")
      sumCols.forEach((k) => {
        const v = pr.row.cells[k];
        if (typeof v === "number") sums[k] += v;
      });
  });
  if (totals) {
    if (totals.h > p.room() && !p.atTop()) {
      hline(p.ops, tLeft, tLeft + tw, p.y, HEAVY, "ink");
      p.open(p.o);
      drawHeader();
    }
    drawRow(totals);
  }
  hline(p.ops, tLeft, tLeft + tw, p.y, HEAVY, "ink");
}

function checksTable(p: Pager, b: Extract<DocBlock, { k: "checks" }>) {
  const t: TableBlock = {
    k: "table", id: "checks", caption: "",
    cols: [
      { key: "label", label: L2("البند", "Item"), wMm: 62, align: "start" },
      { key: "value", label: L2("القيمة", "Value"), wMm: 26, align: "end" },
      { key: "limit", label: L2("الحد", "Limit"), wMm: 26, align: "end" },
      { key: "clause", label: L2("المرجع", "Reference"), wMm: 32, align: "start" },
      { key: "res", label: L2("النتيجة", "Result"), wMm: 28, align: "center", mark: true },
    ],
    rows: b.rows.map((r) => ({
      cells: { label: r.label, value: iso(r.value), limit: iso(r.limit), clause: r.unverified ? `${r.clause} ⚑ ${L2("تحقق", "verify")}` : r.clause },
      mark: r.ok === true ? "ok" : r.ok === false ? "fail" : "na",
    })),
  };
  table(p, t);
}

function basisTable(p: Pager, b: Extract<DocBlock, { k: "basis" }>) {
  table(p, {
    k: "table", id: "basis", caption: L2("أساس الحساب · القيم والمراجع", "Calculation basis · values and sources"),
    cols: [
      { key: "label", label: L2("البند", "Item"), wMm: 48, align: "start" },
      { key: "value", label: L2("القيمة", "Value"), wMm: 22, align: "end" },
      { key: "unit", label: L2("الوحدة", "Unit"), wMm: 14, align: "center" },
      { key: "source", label: L2("المصدر / البند", "Source / clause"), wMm: 44, align: "start" },
      { key: "conf", label: L2("الثقة", "Conf."), wMm: 12, align: "center" },
      { key: "ovr", label: L2("قيمة المشروع", "Project value"), wMm: 34, align: "start" },
    ],
    rows: b.rows.map((r) => ({
      cells: {
        label: r.flagged ? `${r.label} ⚑` : r.label,
        value: iso(r.value),
        unit: r.unit ? iso(r.unit) : "",
        source: r.clause ? `${r.source} · ${r.clause}` : r.source,
        conf: r.conf,
        ovr: r.override ? `${iso(r.override.value)} — ${r.override.reason}` : "",
      },
    })),
    minRowsBeforeBreak: 3,
  });
  if (b.formulas.length)
    table(p, {
      k: "table", id: "trace", caption: L2("طريقة الحساب", "Method"),
      cols: [
        { key: "label", label: L2("الخطوة", "Step"), wMm: 44, align: "start" },
        { key: "expr", label: L2("العلاقة", "Expression"), wMm: 74, align: "start" },
        { key: "value", label: L2("الناتج", "Result"), wMm: 30, align: "end" },
        { key: "clause", label: L2("البند", "Clause"), wMm: 26, align: "start" },
      ],
      rows: b.formulas.map((s) => ({ cells: { label: s.label, expr: iso(s.expr), value: iso(s.value), clause: s.clause || "" } })),
    });
}

function boxedText(p: Pager, title: string | undefined, text: string, font: DocFont, lhRatio: number, keepWith = 0) {
  const { m } = p;
  const f = p.fr;
  const dir = textDir(p.rtl);
  const inner = f.width - 2 * 3;
  const lh = lineMm(font, lhRatio);
  const ls = wrapText(text, inner, font, m);
  const titleH = title ? lineMm(TYPE.h2, 1.43) : 0;
  p.gap();
  const whole = titleH + ls.length * lh + 2 * 2.5;
  p.need(Math.min(whole + keepWith, p.bottom - p.top));
  if (title) {
    lines(p.ops, m, [title], f.left, f.width, p.y, TYPE.h2, "ink", dir, "start", titleH, 0);
    p.y += titleH;
  }
  let i = 0;
  while (i < ls.length) {
    const fit = Math.max(1, Math.floor((p.room() - 5) / lh));
    const part = ls.slice(i, i + fit);
    const h = part.length * lh + 5;
    rect(p.ops, f.left, p.y, f.width, h, { stroke: "hair", pt: HAIR });
    lines(p.ops, m, part, f.left + 3, inner, p.y + 2.5, font, "ink", dir, "start", lh, 0);
    p.y += h;
    i += part.length;
    if (i < ls.length) p.open(p.o);
  }
}

function sketch(p: Pager, b: Extract<DocBlock, { k: "sketch" }>) {
  const f = p.fr;
  const capH = b.caption ? lineMm(TYPE.caption, 1.5) : 0;
  const w = Math.min(b.wMm, f.width);
  const scale = w / b.wMm;
  const h = b.hMm * scale;
  p.gap();
  p.need(h + capH + 1);
  const x = p.fromStart(0, w);
  p.ops.push({ op: "path", x, y: p.y, scale, d: b.paths, ink: "ink", pt: 0.5 });
  p.y += h + 1;
  if (b.caption) {
    lines(p.ops, p.m, [b.caption], x, w, p.y, TYPE.caption, "ink80", textDir(p.rtl), "start", capH, 0);
    p.y += capH;
  }
}

function signatures(p: Pager, b: Extract<DocBlock, { k: "signatures" }>) {
  const { m } = p;
  const dir = textDir(p.rtl);
  const bw = 56, bh = 28, gut = 3;
  const rows = Math.ceil(b.parties.length / 3);
  const total = rows * bh + (rows - 1) * gut + (b.stamp ? gut + 40 : 0);
  p.gap();
  p.need(total);
  b.parties.forEach((s, i) => {
    const r = Math.floor(i / 3), c = i % 3;
    const x = p.fromStart(c * (bw + gut), bw);
    const y = p.y + r * (bh + gut);
    rect(p.ops, x, y, bw, bh, { stroke: "rule", pt: HAIR });
    lines(p.ops, m, [s.role], x, bw, y + 1, TYPE.label, "ink60", dir, "start", 3.6);
    const who = [s.name, s.title].filter(Boolean).join(" · ");
    if (who) lines(p.ops, m, clampLines([who], 1, bw - 2 * PAD, TYPE.value, m), x, bw, y + 4.6, TYPE.value, "ink", dir, "start", 4.2);
    if (s.syndicateNo) lines(p.ops, m, [L2(`رقم القيد: ${s.syndicateNo}`, `Syndicate No. ${s.syndicateNo}`)], x, bw, y + 8.8, TYPE.foot, "ink60", dir, "start", 3.4);
    lines(p.ops, m, [L2("التوقيع: ……………", "Signature: ……………")], x, bw, y + bh - 9, TYPE.foot, "ink60", dir, "start", 3.6);
    lines(p.ops, m, [L2("التاريخ: ……………", "Date: ……………")], x, bw, y + bh - 4.6, TYPE.foot, "ink60", dir, "start", 3.6);
  });
  let y = p.y + rows * bh + (rows - 1) * gut;
  if (b.stamp) {
    y += gut;
    const f = p.fr;
    const sx = p.rtl ? f.left : f.right - 40;
    rect(p.ops, sx, y, 40, 40, { stroke: "rule", pt: HAIR });
    lines(p.ops, m, [L2("الختم · Stamp", "Stamp · الختم")], sx, 40, y + 1, TYPE.label, "ink60", dir, "center", 3.6);
    if (b.statusBox === "ABC") {
      const lab = [["A", L2("معتمد", "Approved")], ["B", L2("معتمد بملاحظات", "Approved as noted")], ["C", L2("مرفوض · أعد التقديم", "Revise & resubmit")]];
      lab.forEach(([k, t], i) => {
        const yy = y + 4 + i * 11;
        const bx = p.rtl ? sx + 40 + 4 : sx - 4 - 6;
        rect(p.ops, bx, yy, 6, 6, { stroke: "ink", pt: HAIR });
        lines(p.ops, m, [k], bx, 6, yy, TYPE.label, "ink", "ltr", "center", 6, 0);
        const tw = 60;
        const tx = p.rtl ? bx + 6 + 2 : bx - 2 - tw;
        lines(p.ops, m, [t], tx, tw, yy, TYPE.caption, "ink80", dir, p.rtl ? "end" : "end", 6, 0);
      });
    }
    y += 40;
  }
  p.y = y;
}

function photos(p: Pager, b: Extract<DocBlock, { k: "photos" }>) {
  const { m } = p;
  const dir = textDir(p.rtl);
  const fw = 85, fh = b.grid === "2x2" ? 100 : 64, gut = 4;
  const capLh = lineMm(TYPE.caption, 1.5);
  const rowH = fh + 1 + 2 * capLh;
  p.gap();
  for (let i = 0; i < b.items.length; i += 2) {
    p.need(rowH);
    b.items.slice(i, i + 2).forEach((it, j) => {
      const x = p.fromStart(j * (fw + gut), fw);
      rect(p.ops, x, p.y, fw, fh, { fill: "wash", stroke: "hair", pt: HAIR });
      p.ops.push({ op: "image", ref: it.ref, x, y: p.y, w: fw, h: fh });
      const cap = clampLines(wrapText(it.caption, fw, TYPE.caption, m), 2, fw, TYPE.caption, m);
      lines(p.ops, m, cap, x, fw, p.y + fh + 1, TYPE.caption, "ink80", dir, "start", capLh, 0);
    });
    p.y += rowH + gut;
  }
}

function colophon(p: Pager, spec: DocSpec) {
  const c = spec.colophon;
  const dir = textDir(p.rtl);
  const lh = lineMm(TYPE.foot, 1.3);
  const ls = [
    L2(`أُنشئ ${iso(c.generatedAt)} · الإصدار ${iso(c.appVersion)} · ${iso(c.backend)}`, `Generated ${c.generatedAt} · version ${c.appVersion} · ${c.backend}`),
    spec.meta.engines.length ? L2(`المحركات: ${iso(spec.meta.engines.join(", "))}`, `Engines: ${spec.meta.engines.join(", ")}`) : "",
    c.profiles.length ? L2(`ملفات الكود: ${iso(c.profiles.join(", "))}`, `Code profiles: ${c.profiles.join(", ")}`) : "",
    L2(`قيم غير متحقق منها ⚑: ${c.unverified}`, `Unverified values ⚑: ${c.unverified}`)
      + (c.overridden.length ? L2(` · قيم معدّلة: ${iso(c.overridden.join(", "))}`, ` · changed values: ${c.overridden.join(", ")}`) : ""),
    c.hash ? `SHA-256 ${iso(c.hash.slice(0, 16).toUpperCase())}…` : "",
  ].filter(Boolean);
  const h = ls.length * lh + 2;
  if (h > p.room()) p.open(p.o);
  const f = p.fr;
  const y = p.bottom - h;
  hline(p.ops, f.left, f.left + f.width / 3, y, HAIR, "hair");
  lines(p.ops, p.m, ls, f.left, f.width, y + 1.5, TYPE.foot, "ink60", dir, "start", lh, 0);
}

// the smallest height the next block needs on the same page as a heading
function minHeight(b: DocBlock | undefined, m: DocMeasurer, width: number): number {
  if (!b) return 0;
  switch (b.k) {
    case "table":
      return ROW_MIN * 4;
    case "kv":
    case "checks":
      return ROW_MIN * 2;
    case "kpis":
      return 17;
    case "photos":
      return 64;
    case "signatures":
      return 28;
    case "sketch":
      return Math.min(b.hMm, 80);
    case "notes":
    case "disclaimer":
      return lineMm(TYPE.body) * 2 + 5;
    case "basis":
      return ROW_MIN * 4;
    default:
      return 0;
  }
}

// ---------------------------------------------------------------------
//  docLayout
// ---------------------------------------------------------------------
export function docLayout(spec: DocSpec, m: DocMeasurer): DocLayoutResult {
  LANG = spec.meta.lang;
  const rtl = spec.meta.lang === "ar";
  const warnings: string[] = [];
  const p = new Pager(m, rtl, warnings);
  const sections = spec.sections.length ? spec.sections : [{ orientation: "portrait" as O, blocks: [] }];
  const pageCount = { set: (_n: number) => {} };

  // page 1: the title block, revisions and the draft band sit above the body
  p.o = sections[0].orientation;
  p.firstTop = 0;
  p.open(p.o);
  let y = titleBlock(p, spec, pageCount);
  if (spec.revisions.length) y = revisionTable(p, spec.revisions, y + 2);
  if (spec.meta.status === "draft" || !spec.meta.docNo) y = draftBand(p, y + 1.5);
  p.top = p.firstTop = y + 4;
  p.y = p.top;

  sections.forEach((s, si) => {
    if (si > 0) p.open(s.orientation);
    s.blocks.forEach((b, bi) => {
      switch (b.k) {
        case "heading":
          heading(p, b, minHeight(s.blocks[bi + 1], m, p.fr.width));
          break;
        case "kv":
          kv(p, b);
          break;
        case "kpis":
          kpis(p, b);
          break;
        case "table":
          table(p, b);
          break;
        case "checks":
          checksTable(p, b);
          break;
        case "basis":
          basisTable(p, b);
          break;
        case "notes":
          boxedText(p, b.title, flatText(b.text).text, TYPE.body, 1.5);
          break;
        case "disclaimer": {
          const next = s.blocks[bi + 1];
          boxedText(p, undefined, b.text, TYPE.caption, 1.5, next && next.k === "signatures" ? 30 : 0);
          break;
        }
        case "sketch":
          sketch(p, b);
          break;
        case "signatures":
          signatures(p, b);
          break;
        case "photos":
          photos(p, b);
          break;
        case "pageBreak":
          if (!p.atTop()) p.open(p.o);
          break;
      }
    });
  });

  // the full revision history when the title page shows only the latest four
  if (spec.revisions.length > 4) {
    p.open(p.o);
    table(p, {
      k: "table", id: "revisions", caption: L2("ملحق المراجعات", "Revision appendix"),
      cols: [
        { key: "rev", label: "Rev", wMm: 14, align: "start" },
        { key: "date", label: L2("التاريخ", "Date"), wMm: 24, align: "start" },
        { key: "desc", label: L2("وصف التعديل", "Description"), wMm: 76, align: "start" },
        { key: "prep", label: L2("أعدّ", "Prepared"), wMm: 20, align: "start" },
        { key: "chk", label: L2("راجع", "Checked"), wMm: 20, align: "start" },
        { key: "app", label: L2("اعتمد", "Approved"), wMm: 20, align: "start" },
      ],
      rows: [...spec.revisions].reverse().map((r) => ({ cells: { rev: iso(r.rev), date: iso(r.dateIso.slice(0, 10)), desc: r.desc, prep: r.prepared, chk: r.checked, app: r.approved } })),
    });
  }

  colophon(p, spec);

  // now the count is known: running headers, footers, «1/N»
  const of = p.pages.length;
  pageCount.set(of);
  const pages: DrawPage[] = p.pages.map((pg, i) => {
    const ops = pg.ops;
    if (i > 0) runningHeader(ops, pg.orientation, m, rtl, spec);
    footer(ops, pg.orientation, m, rtl, spec, i + 1, of);
    return { n: i + 1, of, orientation: pg.orientation, ops };
  });
  return { pages, warnings };
}

// a fixed-advance measurer for tests and Node (no canvas): Arabic and Latin both ≈ 0.5 em per character
export const fixedMeasurer: DocMeasurer = {
  width: (t, f) => Array.from(t.replace(/[⁦-⁩]/g, "")).length * f.pt * MM_PER_PT * 0.5,
  ascent: (f) => f.pt * MM_PER_PT * 0.8,
  descent: (f) => f.pt * MM_PER_PT * 0.25,
};
