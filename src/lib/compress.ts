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

// ---------------------------------------------------------------- decoding
async function decode(file: Blob): Promise<{ img: CanvasImageSource; w: number; h: number; close: () => void }> {
  if (typeof createImageBitmap === "function") {
    try { const bm = await createImageBitmap(file, { imageOrientation: "from-image" } as any); return { img: bm, w: bm.width, h: bm.height, close: () => bm.close() }; }
    catch (e) { /* older WebViews: fall back to <img>, which also applies the orientation */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.decoding = "async"; i.onload = () => res(i); i.onerror = () => rej(new Error("decode")); i.src = url; });
    return { img, w: img.naturalWidth, h: img.naturalHeight, close: () => {} };
  } finally { URL.revokeObjectURL(url); }
}

// ---------------------------------------------------------------- the pipeline
export async function compressImage(file: Blob, profile: Profile = "photo", opts: { minSide?: number } = {}): Promise<Compressed> {
  if (!file) throw new Error("none"); if (file.size > MAX_INPUT) throw new Error("big");
  const rule = PROFILES[profile];
  let src; try { src = await decode(file); } catch (e) { throw new Error("decode"); }
  const { img, w: w0, h: h0 } = src;
  try {
    if (!w0 || !h0) throw new Error("decode");
    if (Math.min(w0, h0) < (opts.minSide ?? 120)) throw new Error("small");
    // crop (avatar: centred square) and the largest size the profile allows
    let sx = 0, sy = 0, sw = w0, sh = h0, W: number, H: number;
    if (rule.square) { const s = Math.min(w0, h0); sx = (w0 - s) / 2; sy = (h0 - s) / 2; sw = sh = s; W = H = Math.min(rule.square, s); }
    else { const k = Math.min(1, rule.max / Math.max(w0, h0)); W = Math.round(w0 * k); H = Math.round(h0 * k); }
    const mime: Compressed["mime"] = (await canEncodeWebp()) ? "image/webp" : rule.alpha ? "image/png" : "image/jpeg";
    const c = document.createElement("canvas"); const x = c.getContext("2d")!;
    const draw = (scale: number) => {
      const cw = Math.max(1, Math.round(W * scale)), ch = Math.max(1, Math.round(H * scale));
      if (c.width !== cw || c.height !== ch) { c.width = cw; c.height = ch; }
      x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high";
      if (!rule.alpha || mime === "image/jpeg") { x.fillStyle = "#ffffff"; x.fillRect(0, 0, cw, ch); } else x.clearRect(0, 0, cw, ch);
      x.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
    };
    let drawn = -1;
    const { blob, scale } = await fit(rule, Math.max(W, H), async (s, q) => { if (s !== drawn) { draw(s); drawn = s; } return encode(c, mime, q); });
    if (drawn !== scale) draw(scale);
    // the average colour, shown while the image loads
    const t = document.createElement("canvas"); t.width = t.height = 1; const tx = t.getContext("2d")!; tx.drawImage(c, 0, 0, 1, 1); const px = tx.getImageData(0, 0, 1, 1).data;
    const out: Compressed = { blob, mime: (blob.type || mime) as Compressed["mime"], w: c.width, h: c.height, bytes: blob.size, tone: `rgb(${px[0]},${px[1]},${px[2]})` };
    c.width = c.height = 0; t.width = t.height = 0;
    return out;
  } finally { src.close(); }
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
