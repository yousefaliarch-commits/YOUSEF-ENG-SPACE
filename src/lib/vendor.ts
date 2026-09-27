// Heavy libraries — PDF reading (pdf.js), Word reading (mammoth) and OCR (Tesseract) — ship inside the app and load only
// when a feature first needs them, as separate chunks. Nothing is fetched from a CDN at runtime.
let pdfP: Promise<any> | null = null;
export const loadPdf = () => pdfP || (pdfP = (async () => {
  const lib: any = await import("pdfjs-dist");
  const { default: workerUrl } = await import("pdfjs-dist/build/pdf.worker.min.js?url");
  lib.GlobalWorkerOptions.workerSrc = workerUrl;
  return lib;
})());

let docxP: Promise<any> | null = null;
export const loadMammoth = () => docxP || (docxP = import("mammoth/mammoth.browser.js").then((m: any) => m.default || m));

let ocrP: Promise<any> | null = null;
export const loadTesseract = () => ocrP || (ocrP = import("tesseract.js").then((m: any) => m.default || m));

// Tesseract's worker script and WebAssembly core are copied into public/vendor/tesseract by scripts/copy-vendor.mjs;
// the Arabic and English LSTM models live in public/ocr.
export const OCR_ASSETS = { worker: "vendor/tesseract/worker.min.js", core: "vendor/tesseract/core", lang: "ocr" };
