// Copies the OCR engine's worker script and its LSTM WebAssembly cores from node_modules into public/vendor/tesseract,
// so the app loads them from its own files (web and native builds alike) instead of a CDN.
import { copyFileSync, mkdirSync } from "node:fs";
const out = "public/vendor/tesseract";
mkdirSync(`${out}/core`, { recursive: true });
copyFileSync("node_modules/tesseract.js/dist/worker.min.js", `${out}/worker.min.js`);
for (const f of ["tesseract-core-lstm.wasm.js", "tesseract-core-simd-lstm.wasm.js"]) copyFileSync(`node_modules/tesseract.js-core/${f}`, `${out}/core/${f}`);
console.log("vendor files copied to", out);
