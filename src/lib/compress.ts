// =====================================================================
//  On-device image pipeline (Phase 1.3) — every image leaves the phone resized, re-encoded and without metadata
//  · Decoded with the camera's orientation applied, drawn onto a canvas (which keeps pixels only: EXIF, GPS, camera and date
//    are gone), then encoded as WebP — or JPEG where the WebView cannot encode WebP (older iOS).
//  · Size target per profile: quality is tuned first, then the resolution steps down, until the file fits. A photo lands in
//    the 150–250 KB band; the server (supabase/functions/_shared/media.ts) refuses anything above its own ceiling anyway.
//  · Profiles: photo (posts, support, inspections) · document (verification: legibility first) · avatar (square) · logo (alpha kept).
// =====================================================================
export type Profile = "photo" | "document" | "avatar" | "logo";
export type Compressed = { blob: Blob; mime: "image/webp" | "image/jpeg" | "image/png"; w: number; h: number; bytes: number; tone: string };
type Rule = { max: number; target: number; hardCap: number; minLong: number; qStart: number; qMin: number; square?: number; alpha?: boolean };

export const PROFILES: Record<Profile, Rule> = {
  photo: { max: 1600, target: 250 * 1024, hardCap: 600 * 1024, minLong: 960, qStart: 0.82, qMin: 0.5 },
  document: { max: 1600, target: 250 * 1024, hardCap: 600 * 1024, minLong: 1280, qStart: 0.86, qMin: 0.62 },
  avatar: { max: 256, target: 40 * 1024, hardCap: 150 * 1024, minLong: 192, qStart: 0.86, qMin: 0.5, square: 256 },
  logo: { max: 512, target: 80 * 1024, hardCap: 300 * 1024, minLong: 256, qStart: 0.9, qMin: 0.6, alpha: true },
};

export const MAX_INPUT = 25e6;   // larger files are refused before decoding (a 25 MB photo decodes to ~200 MB of pixels)

// ---------------------------------------------------------------- encoding
let webpOk: Promise<boolean> | null = null;
// a canvas that silently returns PNG for "image/webp" (Safari before 17) cannot encode WebP
export const canEncodeWebp = () => (webpOk = webpOk || new Promise<boolean>((res) => {
  try { const c = document.createElement("canvas"); c.width = c.height = 2; c.toBlob((b) => res(!!b && b.type === "image/webp"), "image/webp", 0.8); }
  catch (e) { res(false); }
}));

export function encode(c: HTMLCanvasElement, mime: string, q: number): Promise<Blob> {
  return new Promise((res, rej) => {
    try {
      if (c.toBlob) c.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), mime, q);
      else res(dataUrlToBlob(c.toDataURL(mime, q)));
    } catch (e) { rej(e); }
  });
}

export function dataUrlToBlob(u: string): Blob {
  const [head, body] = u.split(","); const mime = (/data:([^;]+)/.exec(head) || [])[1] || "application/octet-stream";
  const bin = atob(body); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return new Blob([a], { type: mime });
}

export const blobToDataUrl = (b: Blob) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsDataURL(b); });

// the next quality to try, from how far the last result missed (file size grows roughly with quality^1.5 here)
export const nextQuality = (q: number, size: number, target: number, qMin: number) => Math.max(qMin, Math.min(q - 0.04, q * Math.pow(target / size, 0.66)));

// the encode loop, pure over an `attempt(scale, quality)` function so the tests can drive it without a canvas
export async function fit(rule: Rule, long: number, attempt: (scale: number, q: number) => Promise<Blob>): Promise<{ blob: Blob; scale: number }> {
  let scale = 1, best: { blob: Blob; scale: number } | null = null;
  for (let step = 0; step < 5; step++) {
    let q = rule.qStart;
    for (let i = 0; i < 4; i++) {
      const b = await attempt(scale, q);
      if (!best || b.size < best.blob.size) best = { blob: b, scale };
      if (b.size <= rule.target) return { blob: b, scale };
      if (q <= rule.qMin) break;
      q = nextQuality(q, b.size, rule.target, rule.qMin);
    }
    if (long * scale * 0.85 < rule.minLong) break;
    scale *= 0.85;
  }
  if (!best || best.blob.size > rule.hardCap) throw new Error("big");
  return best;
}

// ---------------------------------------------------------------- reading the size without decoding
// A phone photo is 12–50 megapixels: decoded at full size it is 48–200 MB of pixels inside the web view's page process — on a
// phone with little memory, enough for Android to end that process (and, before MainActivity handled it, the whole app).
// So the size comes from the file header first, and the decoder is asked for the scaled picture directly.
export type HeaderSize = { w: number; h: number; orientation: number };
export async function headerSize(file: Blob): Promise<HeaderSize | null> {
  try { return readHeader(new Uint8Array(await file.slice(0, 512 * 1024).arrayBuffer())); } catch (e) { return null; }
}
// the shown width / height: EXIF orientations 5–8 turn the picture a quarter
export const shownSize = (d: HeaderSize) => (d.orientation >= 5 && d.orientation <= 8 ? { w: d.h, h: d.w } : { w: d.w, h: d.h });

export function readHeader(b: Uint8Array): HeaderSize | null {
  const u16 = (i: number, le = false) => (le ? b[i] | (b[i + 1] << 8) : (b[i] << 8) | b[i + 1]);
  const u32 = (i: number, le = false) => (le ? (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16)) + b[i + 3] * 16777216 : b[i] * 16777216 + ((b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]));
  const ok = (w: number, h: number, o = 1) => (w > 0 && h > 0 ? { w, h, orientation: o } : null);
  if (b.length < 30) return null;
  // PNG: IHDR right after the signature
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return ok(u32(16), u32(20));
  // GIF
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return ok(u16(6, true), u16(8, true));
  // WebP: VP8 (lossy), VP8L (lossless), VP8X (extended)
  if (u32(0) === 0x52494646 && u32(8) === 0x57454250) {
    const fourcc = String.fromCharCode(b[12], b[13], b[14], b[15]);
    if (fourcc === "VP8 ") return ok(u16(26, true) & 0x3fff, u16(28, true) & 0x3fff);
    if (fourcc === "VP8L") { const v = u32(21, true); return ok((v & 0x3fff) + 1, ((v >>> 14) & 0x3fff) + 1); }
    if (fourcc === "VP8X") return ok(1 + (b[24] | (b[25] << 8) | (b[26] << 16)), 1 + (b[27] | (b[28] << 8) | (b[29] << 16)));
    return null;
  }
  // JPEG: walk the segments; the orientation sits in APP1 Exif, the size in the first SOF
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2, orientation = 1;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null;
    const m = b[i + 1]; if (m === 0xff) { i++; continue; }
    if (m === 0xd8 || (m >= 0xd0 && m <= 0xd7) || m === 0x01) { i += 2; continue; }
    const len = u16(i + 2); if (len < 2) return null;
    if (m === 0xe1 && b[i + 4] === 0x45 && b[i + 5] === 0x78 && b[i + 6] === 0x69 && b[i + 7] === 0x66) {
      const t = i + 10; const le = b[t] === 0x49;   // "II" little-endian, "MM" big-endian
      const ifd = t + u32(t + 4, le);
      if (ifd + 2 < b.length) {
        const n = u16(ifd, le);
        for (let k = 0; k < n && ifd + 2 + k * 12 + 10 < b.length; k++) {
          const e = ifd + 2 + k * 12;
          if (u16(e, le) === 0x0112) { const o = u16(e + 8, le); if (o >= 1 && o <= 8) orientation = o; break; }
        }
      }
    }
    // SOF0–SOF15 except DHT (C4), JPG (C8) and DAC (CC)
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return ok(u16(i + 7), u16(i + 5), orientation);
    if (m === 0xda) return null;   // image data before any size: not a file we understand
    i += 2 + len;
  }
  return null;
}

// ---------------------------------------------------------------- decoding
// scale(w, h) → how much of the shown picture is needed (≤ 1). Decoders that can (createImageBitmap's resize options:
// Chrome / Android web views) hand back only that; the others return the full picture, which compressImage releases at once.
type Decoded = { img: CanvasImageSource; w: number; h: number; full: { w: number; h: number } | null; close: () => void };
async function decode(file: Blob, scale?: (w: number, h: number) => number): Promise<Decoded> {
  const head = await headerSize(file); const shown = head ? shownSize(head) : null;
  if (typeof createImageBitmap === "function") {
    try {
      const opts: any = { imageOrientation: "from-image" };
      const k = shown && scale ? scale(shown.w, shown.h) : 1;
      // only the width: the decoder keeps the aspect itself, so a wrongly read orientation can never distort the picture
      if (shown && k < 0.8) { opts.resizeWidth = Math.max(1, Math.round(shown.w * k)); opts.resizeQuality = "high"; }
      const bm = await createImageBitmap(file, opts);
      return { img: bm, w: bm.width, h: bm.height, full: shown, close: () => bm.close() };
    } catch (e) { /* older WebViews: fall back to <img>, which also applies the orientation */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.decoding = "async"; i.onload = () => res(i); i.onerror = () => rej(new Error("decode")); i.src = url; });
    return { img, w: img.naturalWidth, h: img.naturalHeight, full: shown, close: () => { img.src = ""; } };
  } finally { URL.revokeObjectURL(url); }
}

// ---------------------------------------------------------------- the pipeline
export async function compressImage(file: Blob, profile: Profile = "photo", opts: { minSide?: number } = {}): Promise<Compressed> {
  if (!file) throw new Error("none"); if (file.size > MAX_INPUT) throw new Error("big");
  const rule = PROFILES[profile];
  // the picture is needed up to the profile's size (square avatars: the short side, twice over for a clean downscale)
  const need = (w: number, h: number) => Math.min(1, rule.square ? (rule.square * 2) / Math.min(w, h) : rule.max / Math.max(w, h));
  let src: Decoded; try { src = await decode(file, need); } catch (e) { throw new Error("decode"); }
  const { img, w: w0, h: h0 } = src;
  let base: HTMLCanvasElement | null = null; let c: HTMLCanvasElement | null = null;
  try {
    if (!w0 || !h0) throw new Error("decode");
    // "too small" is about the photo the member chose, not the scaled copy
    const fw = src.full ? src.full.w : w0, fh = src.full ? src.full.h : h0;
    if (Math.min(fw, fh) < (opts.minSide ?? 120)) throw new Error("small");
    // crop (avatar: centred square) and the largest size the profile allows
    let sx = 0, sy = 0, sw = w0, sh = h0, W: number, H: number;
    if (rule.square) { const s = Math.min(w0, h0); sx = (w0 - s) / 2; sy = (h0 - s) / 2; sw = sh = s; W = H = Math.min(rule.square, s); }
    else { const k = Math.min(1, rule.max / Math.max(w0, h0)); W = Math.round(w0 * k); H = Math.round(h0 * k); }
    const mime: Compressed["mime"] = (await canEncodeWebp()) ? "image/webp" : rule.alpha ? "image/png" : "image/jpeg";
    // the picture at its final size, once; the decoded source is released right away (the full-size pixels never wait
    // through the encode loop below)
    base = document.createElement("canvas"); base.width = W; base.height = H;
    const bx = base.getContext("2d")!; bx.imageSmoothingEnabled = true; bx.imageSmoothingQuality = "high";
    bx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
    src.close();
    c = document.createElement("canvas"); const x = c.getContext("2d")!;
    const out0 = c, b0 = base;
    const draw = (scale: number) => {
      const cw = Math.max(1, Math.round(W * scale)), ch = Math.max(1, Math.round(H * scale));
      if (out0.width !== cw || out0.height !== ch) { out0.width = cw; out0.height = ch; }
      x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high";
      if (!rule.alpha || mime === "image/jpeg") { x.fillStyle = "#ffffff"; x.fillRect(0, 0, cw, ch); } else x.clearRect(0, 0, cw, ch);
      x.drawImage(b0, 0, 0, W, H, 0, 0, cw, ch);
    };
    let drawn = -1;
    const { blob, scale } = await fit(rule, Math.max(W, H), async (s, q) => { if (s !== drawn) { draw(s); drawn = s; } return encode(out0, mime, q); });
    if (drawn !== scale) draw(scale);
    // the average colour, shown while the image loads
    const t = document.createElement("canvas"); t.width = t.height = 1; const tx = t.getContext("2d")!; tx.drawImage(out0, 0, 0, 1, 1); const px = tx.getImageData(0, 0, 1, 1).data;
    const out: Compressed = { blob, mime: (blob.type || mime) as Compressed["mime"], w: out0.width, h: out0.height, bytes: blob.size, tone: `rgb(${px[0]},${px[1]},${px[2]})` };
    t.width = t.height = 0;
    return out;
  } finally {
    src.close();
    if (base) { base.width = base.height = 0; }
    if (c) { c.width = c.height = 0; }
  }
}

// a canvas already drawn by the caller (a PDF page for verification) → the same encode loop
export async function compressCanvas(c: HTMLCanvasElement, profile: Profile = "document"): Promise<Compressed> {
  const rule = PROFILES[profile]; const mime: Compressed["mime"] = (await canEncodeWebp()) ? "image/webp" : "image/jpeg";
  const W = c.width, H = c.height; const k = Math.min(1, rule.max / Math.max(W, H));
  const work = document.createElement("canvas"); const x = work.getContext("2d")!;
  const draw = (scale: number) => { work.width = Math.max(1, Math.round(W * k * scale)); work.height = Math.max(1, Math.round(H * k * scale)); x.fillStyle = "#ffffff"; x.fillRect(0, 0, work.width, work.height); x.imageSmoothingQuality = "high"; x.drawImage(c, 0, 0, work.width, work.height); };
  let drawn = -1;
  const { blob, scale } = await fit(rule, Math.max(W, H) * k, async (s, q) => { if (s !== drawn) { draw(s); drawn = s; } return encode(work, mime, q); });
  if (drawn !== scale) draw(scale);
  const out: Compressed = { blob, mime: (blob.type || mime) as Compressed["mime"], w: work.width, h: work.height, bytes: blob.size, tone: "rgb(255,255,255)" };
  work.width = work.height = 0;
  return out;
}
