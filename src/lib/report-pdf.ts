// =====================================================================
//  Inspection reports as PDF, drawn on this device (Feature 7)
//  Each A4 page is drawn on a canvas — the browser shapes Arabic and lays out right-to-left itself — and the pages are
//  written into a small PDF as JPEG images (no PDF library, no font embedding). On a phone the file goes to the system
//  share sheet (WhatsApp, e-mail, Drive…); in a browser it downloads. Nothing is uploaded.
// =====================================================================
import { Capacitor } from "@capacitor/core";
import { isEn, tr } from "../i18n/i18n";

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
type Row = { section?: string; text?: string; mark?: string; note?: string };
const MARK = { pass: ["مطابق", "#15803d"], fail: ["غير مطابق", "#b91c1c"], na: ["لا ينطبق", "#71717a"], "": ["—", "#a1a1aa"] } as Record<string, [string, string]>;

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const words = String(text || "").split(/\s+/); const lines: string[] = []; let cur = "";
  for (const w of words) { const t = cur ? cur + " " + w : w; if (ctx.measureText(t).width > width && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); return lines.length ? lines : [""];
}

export async function inspectionPdf(r: { title: string; scope: string; head: [string, string][]; rows: Row[]; verdict: string; counts: string; footer: string }) {
  const FONT = '"IBM Plex Sans Arabic", system-ui, sans-serif';
  try { await (document as any).fonts.load(`600 24px ${FONT}`); await (document as any).fonts.load(`400 20px ${FONT}`); } catch (e) { /* system font then */ }
  const pages: Uint8Array[] = []; let cv: HTMLCanvasElement, ctx: CanvasRenderingContext2D, y = 0, pageNo = 0;
  // the report follows the interface language: Arabic reads from the right edge, English from the left; what the member typed is drawn as typed
  const en = isEn(); const M = 80, W = A4.w - 2 * M, S = en ? M : A4.w - M, E = en ? A4.w - M : M, IN = en ? 1 : -1;
  const at = (side: "start" | "end") => { ctx.textAlign = side; };
  const start = () => {
    cv = document.createElement("canvas"); cv.width = A4.w; cv.height = A4.h; ctx = cv.getContext("2d")!; pageNo++;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, A4.w, A4.h); ctx.direction = en ? "ltr" : "rtl"; at("start"); ctx.textBaseline = "top";
    ctx.fillStyle = "#5B4BC9"; ctx.font = `600 22px ${FONT}`; ctx.fillText(tr("EngSpace · تقرير فحص واستلام"), S, 50);
    at("end"); ctx.fillStyle = "#a1a1aa"; ctx.font = `400 18px ${FONT}`; ctx.fillText(tr(`صفحة ${pageNo}`), E, 52); at("start");
    ctx.strokeStyle = "#e4e4e7"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(M, 92); ctx.lineTo(A4.w - M, 92); ctx.stroke(); y = 120;
  };
  const finish = () => { pages.push(dataUrlBytes(cv.toDataURL("image/jpeg", 0.88))); };
  const need = (h: number) => { if (y + h > A4.h - 110) { footer(); finish(); start(); } };
  const footer = () => { ctx.fillStyle = "#a1a1aa"; ctx.font = `400 16px ${FONT}`; ctx.fillText(r.footer, S, A4.h - 70); };
  start();
  ctx.fillStyle = "#18181b"; ctx.font = `600 38px ${FONT}`; ctx.fillText(r.title, S, y); y += 56;
  ctx.fillStyle = "#52525b"; ctx.font = `400 22px ${FONT}`; ctx.fillText(r.scope, S, y); y += 50;
  // header table: two columns of label · value
  ctx.font = `400 21px ${FONT}`;
  r.head.forEach(([k, v], i) => { const col = i % 2, x = col ? S + IN * W / 2 : S; if (col === 0 && i) y += 40; ctx.fillStyle = "#71717a"; ctx.fillText(k + ":", x, y); ctx.fillStyle = "#18181b"; ctx.fillText(v || "—", x + IN * (ctx.measureText(k + ": ").width + 6), y); });
  y += 60;
  for (const row of r.rows) {
    if (row.section) { need(70); ctx.fillStyle = "#f4f4f5"; ctx.fillRect(M, y - 6, W, 46); ctx.fillStyle = "#18181b"; ctx.font = `600 23px ${FONT}`; ctx.fillText(row.section, S + IN * 14, y + 4); y += 58; continue; }
    ctx.font = `400 21px ${FONT}`; const lines = wrap(ctx, row.text || "", W - 230); const noteLines = row.note ? wrap(ctx, tr("ملاحظة:") + " " + row.note, W - 230) : [];
    const h = (lines.length + noteLines.length) * 32 + 22; need(h);
    ctx.fillStyle = "#18181b"; lines.forEach((l, i) => ctx.fillText(l, S + IN * 14, y + i * 32));
    ctx.fillStyle = "#b45309"; noteLines.forEach((l, i) => ctx.fillText(l, S + IN * 14, y + (lines.length + i) * 32));
    const [label, color] = MARK[row.mark || ""] || MARK[""]; at("end"); ctx.font = `600 21px ${FONT}`; ctx.fillStyle = color; ctx.fillText(tr(label), E - IN * 10, y); at("start");
    y += h; ctx.strokeStyle = "#f4f4f5"; ctx.beginPath(); ctx.moveTo(M, y - 10); ctx.lineTo(A4.w - M, y - 10); ctx.stroke();
  }
  need(200); y += 20;
  ctx.fillStyle = "#18181b"; ctx.font = `600 28px ${FONT}`; ctx.fillText(tr("النتيجة:") + " " + (r.verdict || "—"), S, y); y += 46;
  ctx.fillStyle = "#52525b"; ctx.font = `400 21px ${FONT}`; ctx.fillText(r.counts, S, y); y += 70;
  ctx.fillText(tr("توقيع المهندس المستلم: ____________________"), S, y); at("end"); ctx.fillText(tr("توقيع مهندس التنفيذ: ____________________"), E, y); at("start");
  footer(); finish();
  return pdfFromJpegs(pages);
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
