// =====================================================================
//  Document kit — drawing a DrawPage on a canvas (the raster backend and the on-screen preview share this code)
//  · `pxPerMm` sets the resolution: 240 dpi for export, the screen's width × devicePixelRatio for the preview.
//  · Photos and logos: the preview draws them from `images`; the raster backend leaves their frames empty and places
//    each one as its own JPEG over the page (sharper, and only one decoded at a time).
// =====================================================================
import qrcode from "qrcode-generator";
import type { DrawPage, LogoRef, PhotoRef } from "./model";
import { INK, MM_PER_PT, canvasFont } from "./theme";

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export type DrawOptions = {
  images?: Map<string, CanvasImageSource & { width: number; height: number }>;
  skipImages?: boolean;
};

// an image fitted (never cropped) into its frame, centred
export function fitRect(iw: number, ih: number, x: number, y: number, w: number, h: number) {
  const k = Math.min(w / iw, h / ih);
  const fw = iw * k, fh = ih * k;
  return { x: x + (w - fw) / 2, y: y + (h - fh) / 2, w: fw, h: fh };
}

export const imageKey = (r: PhotoRef | LogoRef) => r.id;

export function drawPage(ctx: Ctx, page: DrawPage, s: number, o: DrawOptions = {}) {
  const { w, h } = page.orientation === "landscape" ? { w: 297, h: 210 } : { w: 210, h: 297 };
  ctx.save();
  ctx.fillStyle = INK.white;
  ctx.fillRect(0, 0, w * s, h * s);
  ctx.textBaseline = "alphabetic";
  for (const op of page.ops) {
    switch (op.op) {
      case "rect": {
        if (op.fill) {
          ctx.fillStyle = INK[op.fill];
          ctx.fillRect(op.x * s, op.y * s, op.w * s, op.h * s);
        }
        if (op.stroke) {
          ctx.strokeStyle = INK[op.stroke];
          ctx.lineWidth = Math.max(1, (op.pt || 0.35) * MM_PER_PT * s);
          ctx.setLineDash(op.dash ? op.dash.map((d) => d * s) : []);
          ctx.strokeRect(op.x * s, op.y * s, op.w * s, op.h * s);
        }
        break;
      }
      case "rule": {
        ctx.strokeStyle = INK[op.ink];
        ctx.lineWidth = Math.max(1, op.pt * MM_PER_PT * s);
        ctx.setLineDash(op.dash ? op.dash.map((d) => d * s) : []);
        ctx.beginPath();
        ctx.moveTo(op.x1 * s, op.y1 * s);
        ctx.lineTo(op.x2 * s, op.y2 * s);
        ctx.stroke();
        break;
      }
      case "text": {
        ctx.font = canvasFont(op.f, s);
        ctx.fillStyle = INK[op.ink];
        (ctx as any).direction = op.dir;
        ctx.textAlign = op.align || "start";
        ctx.fillText(op.text, op.x * s, op.y * s);
        break;
      }
      case "path": {
        ctx.save();
        ctx.translate(op.x * s, op.y * s);
        ctx.scale(op.scale * s, op.scale * s);
        ctx.fillStyle = INK[op.ink];
        ctx.strokeStyle = INK[op.ink];
        ctx.lineWidth = Math.max(1 / (op.scale * s), (op.pt * MM_PER_PT) / op.scale);
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        for (const vp of op.d) {
          const path = new Path2D(vp.d);
          ctx.setLineDash(vp.dash ? vp.dash : []);
          if (vp.fill) ctx.fill(path);
          else ctx.stroke(path);
          if (vp.label) {
            ctx.font = canvasFont({ w: 450, pt: 7 }, 1);
            (ctx as any).direction = "ltr";
            ctx.textAlign = "center";
            ctx.fillText(vp.label.t, vp.label.x, vp.label.y);
          }
        }
        ctx.restore();
        break;
      }
      case "image": {
        if (o.skipImages) break;
        const im = o.images && o.images.get(imageKey(op.ref));
        if (!im) break;
        const r = fitRect(im.width, im.height, op.x, op.y, op.w, op.h);
        ctx.drawImage(im, r.x * s, r.y * s, r.w * s, r.h * s);
        break;
      }
      case "qr": {
        const q = qrcode(0, "M");
        q.addData(op.data);
        q.make();
        const n = q.getModuleCount();
        const quiet = 4;
        const cell = op.mm / (n + 2 * quiet);
        ctx.fillStyle = INK.ink;
        for (let r = 0; r < n; r++)
          for (let c = 0; c < n; c++)
            if (q.isDark(r, c)) ctx.fillRect((op.x + (c + quiet) * cell) * s, (op.y + (r + quiet) * cell) * s, Math.ceil(cell * s), Math.ceil(cell * s));
        break;
      }
    }
  }
  ctx.restore();
}
