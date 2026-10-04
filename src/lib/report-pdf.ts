// =====================================================================
//  Inspection reports as PDF, drawn on this device (Feature 7)
//  Each A4 page is drawn on a canvas — the browser shapes Arabic and lays out right-to-left itself — and the pages are
//  written into a small PDF as JPEG images (no PDF library, no font embedding). On a phone the file goes to the system
//  share sheet (WhatsApp, e-mail, Drive…); in a browser it downloads. Nothing is uploaded.
// =====================================================================
import { Capacitor } from "@capacitor/core";
import { isEn, tr } from "../i18n/i18n";
import MARK_SHAPE from "../ui/brand-mark.json";

const A4 = { w: 1240, h: 1754 }; // 150 dpi
const PT = { w: 595.28, h: 841.89 };

// ---- the minimal PDF: one JPEG per page, scaled to A4 ----
export function pdfFromJpegs(pages: Uint8Array[]) {
  const enc = new TextEncoder(); const parts: Uint8Array[] = []; const offsets: number[] = []; let len = 0;
  const push = (b: Uint8Array | string) => { const u = typeof b === "string" ? enc.encode(b) : b; parts.push(u); len += u.length; };
  const obj = (n: number, body: () => void) => { offsets[n] = len; push(`${n} 0 obj\n`); body(); push("\nendobj\n"); };
  push("%PDF-1.4\n%âãÏÓ\n");
  const n = pages.length; const kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(" ");
  obj(1, () => push("<< /Type /Catalog /Pages 2 0 R >>"));
  obj(2, () => push(`<< /Type /Pages /Kids [${kids}] /Count ${n} >>`));
  pages.forEach((jpg, i) => {
    const page = 3 + i * 3, content = page + 1, img = page + 2;
    obj(page, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PT.w} ${PT.h}] /Resources << /XObject << /Im${i} ${img} 0 R >> >> /Contents ${content} 0 R >>`));
    const draw = `q ${PT.w} 0 0 ${PT.h} 0 0 cm /Im${i} Do Q`;
    obj(content, () => push(`<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`));
    obj(img, () => { push(`<< /Type /XObject /Subtype /Image /Width ${A4.w} /Height ${A4.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`); push(jpg); push("\nendstream"); });
  });
  const xref = len; const count = 3 + n * 3;
  push(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let i = 1; i < count; i++) push(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  push(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  const out = new Uint8Array(len); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

// ---- drawing the report ----
// An executive A4 inspection report in the style consultants issue: EngSpace letterhead with the E+S mark, document number and date,
// the project block as a ruled table, a summary strip (result + counts + compliance), the inspection table (# · item · result · notes)
// with its header repeated on every page, general notes, three signature blocks (contractor · consultant · receiving engineer), and a
// quiet footer on every page: the platform line and «page x of y». Arabic reads from the right edge, English from the left.
type Row = { section?: string; text?: string; mark?: string; note?: string };
export type InspectionReport = {
  title: string; scope: string; category?: string; docNo: string; head: [string, string][]; rows: Row[]; general?: string;
  verdict: string; verdictLabel: string; counts: { pass: number; fail: number; na: number; open: number; total: number };
  names?: { contractor?: string; consultant?: string; inspector?: string };
};
const C = { brand: "#5B4BC9", brandDark: "#3F33A0", wash: "#F3F1FF", ink: "#18181B", body: "#3F3F46", muted: "#71717A", faint: "#A1A1AA", line: "#E4E4E7", zebra: "#FAFAFA", pass: "#15803D", fail: "#B91C1C", na: "#71717A", amber: "#B45309" };
const MARK: Record<string, [string, string, string]> = { pass: ["مطابق", C.pass, "#DCFCE7"], fail: ["غير مطابق", C.fail, "#FEE2E2"], na: ["لا ينطبق", C.na, "#F4F4F5"], "": ["—", C.faint, "#FFFFFF"] };
const VERDICT_COLOR: Record<string, [string, string]> = { accepted: [C.pass, "#DCFCE7"], conditional: [C.amber, "#FEF3C7"], rejected: [C.fail, "#FEE2E2"], "": [C.muted, "#F4F4F5"] };
export const REPORT_PROMO = "تم إنشاء التقرير عبر تطبيق EngSpace — منصة المهندسين الرسمية | engspace.org";

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const words = String(text || "").split(/\s+/).filter(Boolean); const lines: string[] = []; let cur = "";
  for (const w of words) { const t = cur ? cur + " " + w : w; if (ctx.measureText(t).width > width && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); return lines.length ? lines : [""];
}
// the E+S mark from its master polygons (src/ui/brand-mark.json — never redrawn by hand), `size` px tall
function drawMark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  const m: any = MARK_SHAPE; const k = size / m.box.h; ctx.save(); ctx.fillStyle = color;
  for (const poly of [m.s, m.bar]) { ctx.beginPath(); poly.forEach(([px, py]: number[], i: number) => { const X = x + (px - m.box.x) * k, Y = y + (py - m.box.y) * k; if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }); ctx.closePath(); ctx.fill(); }
  ctx.restore(); return m.box.w * k;
}

export async function inspectionPdf(r: InspectionReport) {
  const FONT = '"IBM Plex Sans Arabic", system-ui, sans-serif';
  try { await Promise.all([600, 500, 400].map((w) => (document as any).fonts.load(`${w} 24px ${FONT}`))); } catch (e) { /* system font then */ }
  const en = isEn(); const M = 72, W = A4.w - 2 * M, FOOT = 120;
  // horizontal positions measured from the reading start (right edge in Arabic, left in English)
  const X = (off: number) => (en ? M + off : A4.w - M - off);                 // a point at `off` from the start edge
  const L = (off: number, w: number) => (en ? M + off : A4.w - M - off - w);   // the left edge of a box starting at `off` with width `w`
  const canvases: HTMLCanvasElement[] = []; let ctx!: CanvasRenderingContext2D; let y = 0; let inTable = false;
  const font = (w: number, px: number) => { ctx.font = `${w} ${px}px ${FONT}`; };
  const text = (s: string, off: number, yy: number, align: "start" | "end" | "center" = "start") => { ctx.textAlign = align; ctx.fillText(s, X(off), yy); ctx.textAlign = "start"; };
  const box = (off: number, w: number, yy: number, h: number, fill?: string, stroke?: string, rad = 0) => {
    ctx.beginPath(); if (rad && (ctx as any).roundRect) (ctx as any).roundRect(L(off, w), yy, w, h, rad); else ctx.rect(L(off, w), yy, w, h);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
  };
  // table columns: # · item · result · notes
  const COL = { n: [0, 64], item: [64, 560], res: [624, 170], note: [794, W - 794] } as Record<string, [number, number]>;
  const tableHead = () => {
    box(0, W, y, 50, C.brand); ctx.fillStyle = "#fff"; font(600, 19); ctx.textBaseline = "middle";
    text("#", COL.n[0] + COL.n[1] / 2, y + 25, "center"); text(tr("البند"), COL.item[0] + 16, y + 25); text(tr("النتيجة"), COL.res[0] + COL.res[1] / 2, y + 25, "center"); text(tr("ملاحظات"), COL.note[0] + 16, y + 25);
    ctx.textBaseline = "top"; y += 50;
  };
  const page = () => {
    const cv = document.createElement("canvas"); cv.width = A4.w; cv.height = A4.h; canvases.push(cv); ctx = cv.getContext("2d")!;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, A4.w, A4.h); ctx.direction = en ? "ltr" : "rtl"; ctx.textBaseline = "top";
    // letterhead: mark + wordmark at the start, document number and date at the end, a brand rule beneath
    const mw = drawMark(ctx, en ? M : A4.w - M - 64 * (666 / 645), 44, 64, C.brand);
    ctx.fillStyle = C.ink; font(600, 34); ctx.direction = "ltr"; ctx.textAlign = en ? "left" : "right"; ctx.fillText("EngSpace", en ? M + mw + 18 : A4.w - M - mw - 18, 44); ctx.direction = en ? "ltr" : "rtl";
    ctx.fillStyle = C.muted; font(400, 18); ctx.textAlign = en ? "left" : "right"; ctx.fillText(tr("تقرير فحص واستلام أعمال · QA/QC Inspection Report"), en ? M + mw + 18 : A4.w - M - mw - 18, 88); ctx.textAlign = "start";
    font(400, 16); ctx.fillStyle = C.muted; text(tr("رقم المستند"), W, 46, "end"); font(600, 21); ctx.fillStyle = C.ink; ctx.direction = "ltr"; ctx.textAlign = en ? "right" : "left"; ctx.fillText(r.docNo, en ? A4.w - M : M, 70); ctx.textAlign = "start"; ctx.direction = en ? "ltr" : "rtl";   // a Latin number, anchored to the page's end edge
    ctx.fillStyle = C.brand; ctx.fillRect(M, 128, W, 4); ctx.fillStyle = C.line; ctx.fillRect(M, 132, W, 1);
    y = 160; if (inTable && canvases.length > 1) tableHead();
  };
  const need = (h: number) => { if (y + h > A4.h - FOOT) { page(); return true; } return false; };

  page();
  // title block
  ctx.fillStyle = C.ink; font(600, 40); wrap(ctx, r.title, W).forEach((l) => { ctx.fillText(l, X(0), y); y += 54; });
  const sub = [r.category, r.scope].filter(Boolean).join(" · "); if (sub) { ctx.fillStyle = C.muted; font(400, 21); ctx.fillText(sub, X(0), y); y += 40; }
  y += 14;
  // project block: a ruled two-column table of label · value pairs
  // the label column fits the longest label (English labels run longer than Arabic ones)
  font(500, 18); const rowH = 52, half = W / 2, lab = Math.min(270, Math.max(170, Math.ceil(Math.max(...r.head.map(([l]) => ctx.measureText(l).width))) + 30));
  for (let i = 0; i < r.head.length; i += 2) {
    for (let j = 0; j < 2; j++) { const pair = r.head[i + j]; if (!pair) continue; const off = j * half;
      box(off, lab, y, rowH, C.wash, C.line); box(off + lab, half - lab, y, rowH, "#fff", C.line);
      ctx.textBaseline = "middle"; ctx.fillStyle = C.brandDark; font(500, 18); text(pair[0], off + 14, y + rowH / 2); ctx.fillStyle = C.ink; font(400, 19);
      const v = pair[1] || "—"; let shown = v; while (ctx.measureText(shown).width > half - lab - 28 && shown.length > 4) shown = shown.slice(0, -2); if (shown !== v) shown = shown.slice(0, -1) + "…";
      text(shown, off + lab + 14, y + rowH / 2); ctx.textBaseline = "top"; }
    y += rowH;
  }
  y += 30;
  // summary strip: the result, the counts, the compliance rate
  const [vc, vb] = VERDICT_COLOR[r.verdict] || VERDICT_COLOR[""]; const k = r.counts; const answered = k.pass + k.fail;
  box(0, 330, y, 112, vb, vc, 14); ctx.fillStyle = C.muted; font(400, 17); text(tr("النتيجة النهائية"), 20, y + 16); ctx.fillStyle = vc; font(600, 26); wrap(ctx, r.verdictLabel || tr("لم تُحدد"), 290).slice(0, 2).forEach((l, i) => text(l, 20, y + 46 + i * 32));
  const kpis: [string, string, string][] = [[tr("مطابق"), String(k.pass), C.pass], [tr("غير مطابق"), String(k.fail), C.fail], [tr("لا ينطبق"), String(k.na), C.na], [tr("نسبة المطابقة"), answered ? Math.round((k.pass / answered) * 100) + "%" : "—", C.brand]];
  const kw = (W - 350 - 3 * 14) / 4;
  kpis.forEach(([l, v, col], i) => { const off = 350 + i * (kw + 14); box(off, kw, y, 112, "#fff", C.line, 14); ctx.fillStyle = col; font(600, 36); ctx.direction = "ltr"; text(v, off + kw / 2, y + 22, "center"); ctx.direction = en ? "ltr" : "rtl"; ctx.fillStyle = C.muted; font(400, 16); text(l, off + kw / 2, y + 74, "center"); });
  y += 112 + 16; ctx.fillStyle = C.muted; font(400, 16); text(tr(`عدد البنود ${k.total}`) + (k.open ? tr(` · لم يُفحص ${k.open}`) : ""), 0, y); y += 40;
  // the inspection table
  need(160); inTable = true; tableHead(); let n = 0, zebra = false;
  for (const row of r.rows) {
    if (row.section) { if (need(54 + 60)) {} box(0, W, y, 48, C.wash, C.line); ctx.fillStyle = C.brandDark; font(600, 20); ctx.textBaseline = "middle"; text(row.section, 16, y + 24); ctx.textBaseline = "top"; y += 48; zebra = false; continue; }
    font(400, 19); const lines = wrap(ctx, row.text || "", COL.item[1] - 32); const notes = row.note ? wrap(ctx, row.note, COL.note[1] - 32) : [];
    const h = Math.max(lines.length, notes.length, 1) * 28 + 26; need(h); n++;
    box(0, W, y, h, zebra ? C.zebra : "#fff", C.line); zebra = !zebra;
    ctx.strokeStyle = C.line; ctx.lineWidth = 2; for (const c of [COL.item[0], COL.res[0], COL.note[0]]) { const xx = X(c); ctx.beginPath(); ctx.moveTo(xx, y); ctx.lineTo(xx, y + h); ctx.stroke(); }
    ctx.fillStyle = C.muted; font(500, 18); ctx.direction = "ltr"; text(String(n), COL.n[0] + COL.n[1] / 2, y + 14, "center"); ctx.direction = en ? "ltr" : "rtl";
    ctx.fillStyle = C.ink; font(400, 19); lines.forEach((l, i) => text(l, COL.item[0] + 16, y + 13 + i * 28));
    const [label, col, bg] = MARK[row.mark || ""] || MARK[""]; const pw = 140; box(COL.res[0] + (COL.res[1] - pw) / 2, pw, y + 10, 34, bg, row.mark ? col : C.line, 17);
    ctx.fillStyle = col; font(600, 17); ctx.textBaseline = "middle"; text(tr(label), COL.res[0] + COL.res[1] / 2, y + 27, "center"); ctx.textBaseline = "top";
    ctx.fillStyle = row.mark === "fail" ? C.fail : C.body; font(400, 17); notes.forEach((l, i) => text(l, COL.note[0] + 16, y + 14 + i * 28));
    y += h;
  }
  inTable = false; y += 30;
  // general notes
  if (r.general && r.general.trim()) {
    font(400, 19); const gl = wrap(ctx, r.general.trim(), W - 40); const gh = gl.length * 30 + 66; need(gh);
    box(0, W, y, gh, "#fff", C.line, 12); ctx.fillStyle = C.brandDark; font(600, 19); text(tr("ملاحظات عامة والإجراءات التصحيحية"), 20, y + 16);
    ctx.fillStyle = C.body; font(400, 19); gl.forEach((l, i) => text(l, 20, y + 52 + i * 30)); y += gh + 30;
  }
  // signatures: contractor · consultant · receiving engineer
  need(250); ctx.fillStyle = C.ink; font(600, 21); text(tr("الاعتماد والتوقيعات"), 0, y); y += 40;
  const sigs: [string, string][] = [[tr("مهندس المقاول"), r.names?.contractor || ""], [tr("مهندس الاستشاري (الإشراف)"), r.names?.consultant || ""], [tr("المهندس المستلم"), r.names?.inspector || ""]];
  const sw = (W - 2 * 20) / 3;
  sigs.forEach(([role, name], i) => { const off = i * (sw + 20); box(off, sw, y, 190, "#fff", C.line, 12); ctx.fillStyle = C.brandDark; font(600, 18); text(role, off + 18, y + 16);
    ctx.fillStyle = C.muted; font(400, 16); text(tr("الاسم:"), off + 18, y + 56); ctx.fillStyle = C.ink; font(400, 17); text(name, off + 18 + 70, y + 56);
    ctx.fillStyle = C.muted; font(400, 16); text(tr("التوقيع:"), off + 18, y + 104); text(tr("التاريخ:"), off + 18, y + 150);
    ctx.strokeStyle = C.faint; ctx.lineWidth = 1.5; for (const yy of [y + 128, y + 174]) { ctx.beginPath(); ctx.moveTo(X(off + 90), yy); ctx.lineTo(X(off + sw - 18), yy); ctx.stroke(); } });
  y += 190 + 24; ctx.fillStyle = C.faint; font(400, 15); text(tr("قائمة استرشادية — المرجع هو اللوحات والمواصفات المعتمدة للمشروع والكود المتبع."), 0, y);
  // every page: a quiet footer with the platform line and «page x of y»
  const total = canvases.length;
  canvases.forEach((cv, i) => {
    ctx = cv.getContext("2d")!; ctx.direction = en ? "ltr" : "rtl"; ctx.textBaseline = "top";
    const fy = A4.h - 82; ctx.fillStyle = C.line; ctx.fillRect(M, fy - 16, W, 1.5);
    const mw = drawMark(ctx, en ? M : A4.w - M - 22 * (666 / 645), fy, 22, C.brand);
    ctx.fillStyle = C.muted; font(400, 15); ctx.textAlign = en ? "left" : "right"; ctx.fillText(tr(REPORT_PROMO), en ? M + mw + 10 : A4.w - M - mw - 10, fy + 2); ctx.textAlign = "start";
    ctx.fillStyle = C.faint; font(400, 15); text(tr(`صفحة ${i + 1} من ${total}`), W, fy + 2, "end");
  });
  return pdfFromJpegs(canvases.map((cv) => dataUrlBytes(cv.toDataURL("image/jpeg", 0.9))));
}

const dataUrlBytes = (u: string) => { const b = atob(u.split(",")[1]); const a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; };

// ---- handing the file to the member ----
export async function saveOrShare(bytes: Uint8Array, filename: string, title: string) {
  if (Capacitor.isNativePlatform()) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([import("@capacitor/filesystem"), import("@capacitor/share")]);
    let bin = ""; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    const w = await Filesystem.writeFile({ path: filename, data: btoa(bin), directory: Directory.Cache });
    await Share.share({ title, files: [w.uri], dialogTitle: title }); return;
  }
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
  const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
