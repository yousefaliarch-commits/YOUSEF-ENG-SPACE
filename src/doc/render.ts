// =====================================================================
//  Document kit — rendering a DocSpec to a PDF (raster backend, wave 1)
//  · Fonts load at export time only (FontFace via document.fonts with an Arabic + Latin sample, so the glyphs are real).
//  · One page canvas at a time (240 dpi), released as soon as its pixels are read; the page is stored as a lossless
//    16-colour image (encode.ts) and each photo as its own JPEG. A failed palette encode falls back to a JPEG page.
//  · renderDoc never rejects: it resolves ok / cancelled / failed (handlers can always end in a toast).
// =====================================================================
import type { DocBackend, DocMeasurer, DocMeta, DocSpec, DrawPage, LogoRef, PhotoRef } from "./model";
import { docLayout } from "./layout";
import { drawPage, fitRect } from "./draw";
import { encodeIndexed } from "./encode";
import { PdfWriter, type PdfPlacement } from "./pdf-writer";
import { DPI, FONT_FAMILY, MM_PER_PT, PALETTE, PX_PER_MM, canvasFont } from "./theme";

export type ImageSource = (ref: PhotoRef | LogoRef) => Promise<Blob | null>;
export type RenderResult = { status: "ok"; pdf: Blob; pages: number; log: string[] } | { status: "cancelled" } | { status: "failed"; error: string };

// live page canvases (the preview and export together stay ≤ 2) — read by e2e through window.__engspaceDoc
export const docStats = { liveCanvases: 0, maxCanvases: 0 };
export function pageCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  docStats.liveCanvases++;
  docStats.maxCanvases = Math.max(docStats.maxCanvases, docStats.liveCanvases);
  return c;
}
export function releaseCanvas(c: HTMLCanvasElement) {
  c.width = c.height = 0;
  docStats.liveCanvases = Math.max(0, docStats.liveCanvases - 1);
}
if (typeof window !== "undefined" && (import.meta as any).env?.DEV) (window as any).__engspaceDoc = docStats;

let fontsReady: Promise<void> | null = null;
export function loadDocFonts() {
  if (!fontsReady) {
    fontsReady = (async () => {
      try {
        const fonts = (document as any).fonts;
        await Promise.all([400, 600, 700].map((w) => fonts.load(`${w} 24px ${FONT_FAMILY}`, "ءA1Ø")));
      } catch {
        /* the system font then */
      }
    })();
  }
  return fontsReady;
}

// widths from the canvas at the export resolution, so the layout's line breaks are the drawing's
let measureCtx: CanvasRenderingContext2D | null = null;
const widthCache = new Map<string, number>();
export const canvasMeasurer: DocMeasurer = {
  width(text, f) {
    const key = `${f.w}|${f.pt}|${text}`;
    const hit = widthCache.get(key);
    if (hit != null) return hit;
    if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
    if (!measureCtx) return text.length * f.pt * MM_PER_PT * 0.5;
    measureCtx.font = canvasFont(f, PX_PER_MM);
    const w = measureCtx.measureText(text).width / PX_PER_MM;
    if (widthCache.size > 5000) widthCache.clear();
    widthCache.set(key, w);
    return w;
  },
  ascent: (f) => f.pt * MM_PER_PT * 0.8,
  descent: (f) => f.pt * MM_PER_PT * 0.28,
};

const blobBytes = async (b: Blob) => new Uint8Array(await b.arrayBuffer());
const canvasBlob = (c: HTMLCanvasElement, type: string, q: number) =>
  new Promise<Blob | null>((res) => c.toBlob((b) => res(b), type, q));

export function rasterBackend(images?: ImageSource, log: string[] = []): DocBackend {
  let writer: PdfWriter | null = null;
  let aborted = false;
  return {
    id: "raster",
    async begin(meta: DocMeta) {
      writer = new PdfWriter({
        title: `${meta.docTypeName}${meta.docNo ? ` · ${meta.docNo}` : ""}`,
        author: meta.issuer,
        subject: meta.docType,
        creator: `EngSpace ${meta.appVersion}`,
        lang: meta.lang,
      });
    },
    async page(p: DrawPage) {
      if (!writer || aborted) return;
      const land = p.orientation === "landscape";
      const wMm = land ? 297 : 210, hMm = land ? 210 : 297;
      const W = Math.round((wMm / 25.4) * DPI), H = Math.round((hMm / 25.4) * DPI);
      const c = pageCanvas(W, H);
      const items: PdfPlacement[] = [];
      try {
        const ctx = c.getContext("2d");
        if (!ctx) throw new Error("no 2d context");
        drawPage(ctx, p, PX_PER_MM, { skipImages: true });
        try {
          const px = ctx.getImageData(0, 0, W, H).data;
          const img = encodeIndexed(px, W, H, PALETTE);
          items.push({ img: { kind: "indexed", ...img }, x: 0, y: 0, w: wMm / MM_PER_PT, h: hMm / MM_PER_PT });
        } catch (e) {
          log.push(`page ${p.n}: palette encode failed, JPEG fallback (${String((e as any)?.message || e)})`);
          const b = await canvasBlob(c, "image/jpeg", 0.92);
          if (!b) throw new Error("page encode failed");
          items.push({ img: { kind: "dct", w: W, h: H, data: await blobBytes(b) }, x: 0, y: 0, w: wMm / MM_PER_PT, h: hMm / MM_PER_PT });
        }
      } finally {
        releaseCanvas(c);
      }
      // photos and logos, one at a time, decoded at their frame size
      for (const op of p.ops) {
        if (op.op !== "image" || !images) continue;
        try {
          const blob = await images(op.ref);
          if (!blob) continue;
          const probe = await createImageBitmap(blob);
          const r = fitRect(probe.width, probe.height, op.x, op.y, op.w, op.h);
          probe.close();
          const pw = Math.max(1, Math.round((r.w / 25.4) * DPI)), ph = Math.max(1, Math.round((r.h / 25.4) * DPI));
          const bmp = await createImageBitmap(blob, { resizeWidth: pw, resizeHeight: ph, resizeQuality: "high" } as any);
          const cc = document.createElement("canvas");
          cc.width = pw;
          cc.height = ph;
          cc.getContext("2d")!.drawImage(bmp, 0, 0);
          bmp.close();
          const jpg = await canvasBlob(cc, "image/jpeg", 0.85);
          cc.width = cc.height = 0;
          if (!jpg) continue;
          items.push({
            img: { kind: "dct", w: pw, h: ph, data: await blobBytes(jpg) },
            x: r.x / MM_PER_PT, y: (hMm - r.y - r.h) / MM_PER_PT, w: r.w / MM_PER_PT, h: r.h / MM_PER_PT,
          });
        } catch (e) {
          log.push(`page ${p.n}: image ${op.ref.id} skipped (${String((e as any)?.message || e)})`);
        }
      }
      writer.addPage({ wPt: wMm / MM_PER_PT, hPt: hMm / MM_PER_PT, items });
    },
    async end() {
      if (!writer) throw new Error("not begun");
      const bytes = writer.finish();
      writer = null;
      return new Blob([bytes as BlobPart], { type: "application/pdf" });
    },
    abort() {
      aborted = true;
      writer = null;
    },
  };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

export async function renderDoc(
  spec: DocSpec,
  o: { images?: ImageSource; signal?: AbortSignal; onPage?: (n: number, of: number) => void; pages?: DrawPage[] } = {},
): Promise<RenderResult> {
  const log: string[] = [];
  const backend = rasterBackend(o.images, log);
  try {
    await loadDocFonts();
    const pages = o.pages || docLayout(spec, canvasMeasurer).pages;
    await backend.begin(spec.meta);
    for (const p of pages) {
      if (o.signal?.aborted) {
        backend.abort();
        return { status: "cancelled" };
      }
      await backend.page(p);
      o.onPage?.(p.n, p.of);
      await tick();
    }
    const pdf = await backend.end();
    return { status: "ok", pdf, pages: pages.length, log };
  } catch (e) {
    backend.abort();
    return { status: "failed", error: String((e as any)?.message || e) };
  }
}
