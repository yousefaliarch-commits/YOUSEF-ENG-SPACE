import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" keeps every asset path relative, so the same build runs from a web server and inside the Capacitor apps.
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    target: "es2022",
    // the main chunk is React + the member app + the English dictionary; the admin console, the CV review, pdf.js,
    // mammoth and Tesseract are separate chunks loaded on first use
    chunkSizeWarningLimit: 1200,
    rolldownOptions: {
      // pdf.js keeps a Node-only `eval("require")` fallback that never runs in the browser
      checks: { pluginTimings: false },
      onwarn(warning, next) { if (warning.code === "EVAL" && /pdfjs-dist/.test(String(warning.id || ""))) return; next(warning); },
    },
  },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
});
