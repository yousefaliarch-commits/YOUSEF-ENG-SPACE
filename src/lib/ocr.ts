// On-device OCR (Tesseract, LSTM engine, Arabic + English). The engine, its WebAssembly core and both language models are
// bundled with the app (lib/vendor) and start only when a post image is checked for money figures. Nothing is uploaded.
import { OCR_ASSETS, loadTesseract } from "./vendor";

export const withTimeout = (p, ms) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error("timeout")), ms); p.then((v) => { clearTimeout(t); res(v); }, (e) => { clearTimeout(t); rej(e); }); });

export const loadImageEl = (url): Promise<HTMLImageElement> => new Promise((res, rej) => { const i = new window.Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("decode")); i.src = url; });

const abs = (p) => new URL(p, document.baseURI).href;

// Runs inside the OCR worker before the engine loads (serialised with toString, so plain ES5 only): Leptonica's internal
// diagnostics («Error in boxClipToRectangle…», «Estimating resolution…») stay inside the worker instead of the console.
export function ocrWorkerShim() {
  var q = /^(Error in |Warning: |Estimating resolution|Detected [0-9]+ diacritics|Empty page|Too few characters)/;
  ["log", "warn"].forEach(function (k) { var w = console[k]; console[k] = function (m) { if (typeof m === "string" && q.test(m)) return; return w.apply(console, arguments); }; });
}

let OCR_WORKER_URL = null;
const ocrWorkerUrl = () => OCR_WORKER_URL || (OCR_WORKER_URL = URL.createObjectURL(new Blob(["(" + ocrWorkerShim.toString() + ")();importScripts(" + JSON.stringify(abs(OCR_ASSETS.worker)) + ");"], { type: "application/javascript" })));

export async function ocrOpen(langs, onStep) {
  const T = await loadTesseract(); if (!T || !T.createWorker) throw new Error("ocr_unavailable");
  const opts = { workerPath: ocrWorkerUrl(), workerBlobURL: false, corePath: abs(OCR_ASSETS.core), langPath: abs(OCR_ASSETS.lang), cacheMethod: "none", gzip: true, logger: (m) => { try { if (onStep) onStep(m); } catch (e) {} }, errorHandler: () => {} };
  const w: any = await withTimeout(T.createWorker(langs, 1, opts, { debug_file: "/dev/null" }), 90000);
  await w.setParameters({ preserve_interword_spaces: "1", user_defined_dpi: "300" }); return w;
}

// grayscale + 2–98 % contrast stretch on a copy scaled for OCR; mode "otsu" = one global threshold, "adaptive" = local-mean
// (Sauvola-style) threshold, which survives blur, sensor noise and uneven light far better on phone photos. Caller zeroes the canvas.
export function ocrPrep(src, sx, sy, sw, sh, targetW, mode = "gray") {
  const k = Math.min(3, targetW / Math.max(1, sw)); const W = Math.max(8, Math.round(sw * k)), H = Math.max(8, Math.round(sh * k));
  const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d", { willReadFrequently: true }); x.imageSmoothingQuality = "high"; x.drawImage(src, sx, sy, sw, sh, 0, 0, W, H);
  const im = x.getImageData(0, 0, W, H), d = im.data, n = W * H, g = new Uint8ClampedArray(n), hist = new Uint32Array(256);
  for (let i = 0; i < n; i++) { const v = (d[i * 4] * 299 + d[i * 4 + 1] * 587 + d[i * 4 + 2] * 114) / 1000 | 0; g[i] = v; hist[v]++; }
  let lo = 0, hi = 255, acc = 0; for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= n * 0.02) { lo = v; break; } } acc = 0; for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc >= n * 0.02) { hi = v; break; } }
  const span = Math.max(1, hi - lo); const st = (v) => { const y = ((v - lo) * 255 / span) | 0; return y < 0 ? 0 : y > 255 ? 255 : y; }; let thr = 128; const binar = mode === "otsu";
  if (mode === "adaptive") {
    const W1 = W + 1, I = new Float64Array(W1 * (H + 1)), I2 = new Float64Array(W1 * (H + 1));
    for (let y = 0; y < H; y++) { let s = 0, s2 = 0; for (let xx = 0; xx < W; xx++) { const v = st(g[y * W + xx]); g[y * W + xx] = v; s += v; s2 += v * v; I[(y + 1) * W1 + xx + 1] = I[y * W1 + xx + 1] + s; I2[(y + 1) * W1 + xx + 1] = I2[y * W1 + xx + 1] + s2; } }
    const r = Math.max(8, Math.round(W / 60));
    for (let y = 0; y < H; y++) { const y0 = Math.max(0, y - r), y1 = Math.min(H, y + r + 1); for (let xx = 0; xx < W; xx++) { const x0 = Math.max(0, xx - r), x1 = Math.min(W, xx + r + 1); const n2 = (x1 - x0) * (y1 - y0); const s = I[y1 * W1 + x1] - I[y0 * W1 + x1] - I[y1 * W1 + x0] + I[y0 * W1 + x0], s2 = I2[y1 * W1 + x1] - I2[y0 * W1 + x1] - I2[y1 * W1 + x0] + I2[y0 * W1 + x0]; const m = s / n2, sd = Math.sqrt(Math.max(0, s2 / n2 - m * m)); const v = g[y * W + xx] > m * (1 + 0.2 * (sd / 128 - 1)) ? 255 : 0; const k4 = (y * W + xx) * 4; d[k4] = d[k4 + 1] = d[k4 + 2] = v; d[k4 + 3] = 255; } }
    x.putImageData(im, 0, 0); return c;
  }
  if (binar) { const h2 = new Uint32Array(256); for (let i = 0; i < n; i++) h2[st(g[i])]++; let sum = 0; for (let v = 0; v < 256; v++) sum += v * h2[v]; let sB = 0, wB = 0, bestV = -1; for (let v = 0; v < 256; v++) { wB += h2[v]; if (!wB) continue; const wF = n - wB; if (!wF) break; sB += v * h2[v]; const mB = sB / wB, mF = (sum - sB) / wF, between = wB * wF * (mB - mF) * (mB - mF); if (between > bestV) { bestV = between; thr = v; } } }
  for (let i = 0; i < n; i++) { let v = st(g[i]); if (binar) v = v > thr ? 255 : 0; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }
  x.putImageData(im, 0, 0); return c;
}
