// =====================================================================
//  Document kit — lossless page encoding (pure; runs on the main thread or in a worker)
//  · A page drawn on white maps every pixel to the 16-colour PALETTE (theme.ts), packs 4 bits per pixel, applies the PNG
//    "Up" row filter and deflates with fflate: the PDF reads it as /Indexed + /FlateDecode with /Predictor 15.
//  · The nearest colour is looked up in a 32 768-entry table (5 bits per channel), built once per palette.
// =====================================================================
import { zlibSync } from "fflate";

export const hexRgb = (h: string): [number, number, number] => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const LUTS = new Map<string, Uint8Array>();

export function paletteLut(palette: string[]): Uint8Array {
  const key = palette.join(",");
  const hit = LUTS.get(key);
  if (hit) return hit;
  const rgb = palette.map(hexRgb);
  const lut = new Uint8Array(32768);
  for (let i = 0; i < 32768; i++) {
    const r = ((i >> 10) << 3) + 4, g = (((i >> 5) & 31) << 3) + 4, b = ((i & 31) << 3) + 4;
    let best = 0, bd = Infinity;
    for (let k = 0; k < rgb.length; k++) {
      const [pr, pg, pb] = rgb[k];
      // luminance-weighted distance: text edges stay on the grey ramp
      const d = 3 * (r - pr) ** 2 + 4 * (g - pg) ** 2 + 2 * (b - pb) ** 2;
      if (d < bd) {
        bd = d;
        best = k;
      }
    }
    lut[i] = best;
  }
  // exact palette colours always map to themselves
  rgb.forEach(([r, g, b], k) => (lut[((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)] = k));
  LUTS.set(key, lut);
  return lut;
}

// RGBA → filtered 4-bit rows (1 filter byte + ceil(w / 2) bytes per row)
export function packIndexed(rgba: Uint8ClampedArray | Uint8Array, w: number, h: number, lut: Uint8Array): Uint8Array {
  const rowBytes = (w + 1) >> 1;
  const out = new Uint8Array(h * (rowBytes + 1));
  let prev = new Uint8Array(rowBytes);
  let cur = new Uint8Array(rowBytes);
  for (let y = 0; y < h; y++) {
    cur.fill(0);
    let p = y * w * 4;
    for (let x = 0; x < w; x++, p += 4) {
      const idx = lut[((rgba[p] >> 3) << 10) | ((rgba[p + 1] >> 3) << 5) | (rgba[p + 2] >> 3)];
      if (x & 1) cur[x >> 1] |= idx;
      else cur[x >> 1] = idx << 4;
    }
    const o = y * (rowBytes + 1);
    out[o] = 2; // PNG "Up"
    for (let i = 0; i < rowBytes; i++) out[o + 1 + i] = (cur[i] - prev[i]) & 255;
    const t = prev;
    prev = cur;
    cur = t;
  }
  return out;
}

export function encodeIndexed(rgba: Uint8ClampedArray | Uint8Array, w: number, h: number, palette: string[]) {
  const packed = packIndexed(rgba, w, h, paletteLut(palette));
  return { w, h, data: zlibSync(packed, { level: 6 }), palette };
}

// the inverse, for tests: inflated rows → palette indices
export function unpackIndexed(rows: Uint8Array, w: number, h: number): Uint8Array {
  const rowBytes = (w + 1) >> 1;
  const out = new Uint8Array(w * h);
  const prev = new Uint8Array(rowBytes);
  for (let y = 0; y < h; y++) {
    const o = y * (rowBytes + 1);
    for (let i = 0; i < rowBytes; i++) prev[i] = (rows[o + 1 + i] + prev[i]) & 255;
    for (let x = 0; x < w; x++) out[y * w + x] = x & 1 ? prev[x >> 1] & 15 : prev[x >> 1] >> 4;
  }
  return out;
}
