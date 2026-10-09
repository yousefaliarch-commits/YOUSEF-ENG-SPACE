// =====================================================================
//  upload-media — the pure part (Deno function and Vitest share it)
//  The app compresses every image on the phone (src/lib/compress.ts). This side never trusts that: it reads the real format
//  and dimensions from the bytes, enforces the limits of each kind, and strips every metadata block (EXIF, XMP, comments)
//  before the file is stored. Only WebP and baseline/progressive JPEG are accepted — what a canvas produces.
// =====================================================================

export type Mime = "image/webp" | "image/jpeg";
export type Kind = "post" | "avatar" | "support" | "verification" | "inspection";
export type ImageInfo = { mime: Mime; w: number; h: number };
export type KindRule = { bucket: string; prefix: string | null; maxSide: number; minSide: number; maxBytes: number; cache: string };

// public images get random names under a prefix; private ones stay in the owner's folder of a private bucket
export const KINDS: Record<Kind, KindRule> = {
  post: { bucket: "media", prefix: "p", maxSide: 2048, minSide: 32, maxBytes: 700 * 1024, cache: "31536000" },
  avatar: { bucket: "media", prefix: "a", maxSide: 640, minSide: 64, maxBytes: 200 * 1024, cache: "31536000" },
  support: { bucket: "support", prefix: null, maxSide: 2048, minSide: 32, maxBytes: 700 * 1024, cache: "3600" },
  verification: { bucket: "verification", prefix: null, maxSide: 2400, minSide: 300, maxBytes: 700 * 1024, cache: "300" },
  inspection: { bucket: "inspections", prefix: null, maxSide: 2048, minSide: 32, maxBytes: 700 * 1024, cache: "3600" },
};

export const isKind = (k: unknown): k is Kind => typeof k === "string" && Object.prototype.hasOwnProperty.call(KINDS, k);

export function pathFor(kind: Kind, owner: string, id: string, mime: Mime): string {
  const ext = mime === "image/webp" ? "webp" : "jpg"; const r = KINDS[kind];
  return r.prefix ? `${r.prefix}/${id}.${ext}` : `${owner}/${id}.${ext}`;
}

const u16be = (b: Uint8Array, i: number) => (b[i] << 8) | b[i + 1];
const u32le = (b: Uint8Array, i: number) => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;
const ascii = (b: Uint8Array, i: number, n: number) => String.fromCharCode(...b.subarray(i, i + n));

// ---------------------------------------------------------------- JPEG
// markers without a length field
const standalone = (m: number) => m === 0x01 || (m >= 0xd0 && m <= 0xd7);
// start-of-frame markers (not DHT C4, JPG C8, DAC CC)
const isSOF = (m: number) => m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc;

export function jpegInfo(b: Uint8Array): { w: number; h: number } | null {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) return null;
    const m = b[i + 1];
    if (m === 0xff) { i++; continue; }
    if (standalone(m)) { i += 2; continue; }
    if (m === 0xd9 || m === 0xda) return null;   // end of image / start of scan before any frame header
    const len = u16be(b, i + 2); if (len < 2 || i + 2 + len > b.length) return null;
    if (isSOF(m)) { if (len < 7) return null; return { h: u16be(b, i + 5), w: u16be(b, i + 7) }; }
    i += 2 + len;
  }
  return null;
}

// keep SOI, APP0 (JFIF), tables, frame and scan; drop APP1–APP15 (EXIF, XMP, ICC, maker notes) and COM. Everything from the
// start of scan onwards is image data and is copied as it is.
export function stripJpeg(b: Uint8Array): Uint8Array {
  const out: Uint8Array[] = [b.subarray(0, 2)]; let i = 2;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) break;
    const m = b[i + 1];
    if (m === 0xff) { i++; continue; }
    if (standalone(m)) { out.push(b.subarray(i, i + 2)); i += 2; continue; }
    if (m === 0xda) { out.push(b.subarray(i)); i = b.length; break; }
    const len = u16be(b, i + 2); const end = i + 2 + len;
    if (end > b.length) break;
    const drop = (m >= 0xe1 && m <= 0xef) || m === 0xfe;
    if (!drop) out.push(b.subarray(i, end));
    i = end;
  }
  if (i < b.length) out.push(b.subarray(i));
  return concat(out);
}

// ---------------------------------------------------------------- WebP
type Chunk = { id: string; data: Uint8Array };
function webpChunks(b: Uint8Array): Chunk[] | null {
  if (b.length < 20 || ascii(b, 0, 4) !== "RIFF" || ascii(b, 8, 4) !== "WEBP") return null;
  const end = Math.min(b.length, 8 + u32le(b, 4)); const out: Chunk[] = []; let i = 12;
  while (i + 8 <= end) {
    const id = ascii(b, i, 4); const size = u32le(b, i + 4); const start = i + 8;
    if (start + size > end) return null;
    out.push({ id, data: b.subarray(start, start + size) });
    i = start + size + (size & 1);
  }
  return out.length ? out : null;
}

export function webpInfo(b: Uint8Array): { w: number; h: number } | null {
  const chunks = webpChunks(b); if (!chunks) return null;
  const x = chunks.find((c) => c.id === "VP8X");
  if (x) {
    if (x.data.length < 10 || (x.data[0] & 0x02)) return null;   // animated WebP is refused
    return { w: 1 + (x.data[4] | (x.data[5] << 8) | (x.data[6] << 16)), h: 1 + (x.data[7] | (x.data[8] << 8) | (x.data[9] << 16)) };
  }
  const lossy = chunks.find((c) => c.id === "VP8 ");
  if (lossy) {
    const d = lossy.data; if (d.length < 10 || d[3] !== 0x9d || d[4] !== 0x01 || d[5] !== 0x2a) return null;
    return { w: (d[6] | (d[7] << 8)) & 0x3fff, h: (d[8] | (d[9] << 8)) & 0x3fff };
  }
  const lossless = chunks.find((c) => c.id === "VP8L");
  if (lossless) {
    const d = lossless.data; if (d.length < 5 || d[0] !== 0x2f) return null;
    const bits = d[1] | (d[2] << 8) | (d[3] << 16) | (d[4] << 24);
    return { w: (bits & 0x3fff) + 1, h: ((bits >>> 14) & 0x3fff) + 1 };
  }
  return null;
}

// drop the EXIF and XMP chunks and clear their flags in VP8X; the RIFF size is rebuilt
export function stripWebp(b: Uint8Array): Uint8Array {
  const chunks = webpChunks(b); if (!chunks) return b;
  const keep = chunks.filter((c) => c.id !== "EXIF" && c.id !== "XMP ").map((c) => {
    if (c.id !== "VP8X") return c; const d = c.data.slice(); d[0] &= ~(0x08 | 0x04); return { id: c.id, data: d };
  });
  const parts: Uint8Array[] = [];
  for (const c of keep) {
    const head = new Uint8Array(8); head.set([...c.id].map((ch) => ch.charCodeAt(0)), 0); new DataView(head.buffer).setUint32(4, c.data.length, true);
    parts.push(head, c.data); if (c.data.length & 1) parts.push(new Uint8Array(1));
  }
  const body = concat(parts); const out = new Uint8Array(12 + body.length);
  out.set([0x52, 0x49, 0x46, 0x46], 0); new DataView(out.buffer).setUint32(4, 4 + body.length, true); out.set([0x57, 0x45, 0x42, 0x50], 8); out.set(body, 12);
  return out;
}

// ---------------------------------------------------------------- the checks the function runs, in order
export type Verdict = { ok: true; info: ImageInfo; bytes: Uint8Array } | { ok: false; status: number; error: string };

export function inspect(b: Uint8Array): ImageInfo | null {
  const j = jpegInfo(b); if (j) return { mime: "image/jpeg", ...j };
  const w = webpInfo(b); if (w) return { mime: "image/webp", ...w };
  return null;
}

export function check(kind: Kind, b: Uint8Array): Verdict {
  const r = KINDS[kind];
  if (!b.length) return { ok: false, status: 400, error: "empty" };
  if (b.length > r.maxBytes) return { ok: false, status: 413, error: "too_big" };
  const info = inspect(b); if (!info) return { ok: false, status: 415, error: "unsupported" };
  const long = Math.max(info.w, info.h), short = Math.min(info.w, info.h);
  if (long > r.maxSide || short < r.minSide) return { ok: false, status: 422, error: "dimensions" };
  return { ok: true, info, bytes: info.mime === "image/jpeg" ? stripJpeg(b) : stripWebp(b) };
}

// does any metadata block survive? (used by the tests and as a last assertion before storing)
export function hasMetadata(b: Uint8Array): boolean {
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 4 <= b.length && b[i] === 0xff) {
      const m = b[i + 1]; if (m === 0xda) return false; if (standalone(m)) { i += 2; continue; }
      if ((m >= 0xe1 && m <= 0xef) || m === 0xfe) return true; i += 2 + u16be(b, i + 2);
    }
    return false;
  }
  const chunks = webpChunks(b); return !!chunks && chunks.some((c) => c.id === "EXIF" || c.id === "XMP ");
}

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-media-kind, x-media-action",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function concat(parts: Uint8Array[]): Uint8Array {
  const n = parts.reduce((a, p) => a + p.length, 0); const out = new Uint8Array(n); let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
