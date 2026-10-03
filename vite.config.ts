import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execSync } from "node:child_process";
import pkg from "./package.json" with { type: "json" };

// the build stamp shown in Settings → so a phone always tells which build it runs (CI passes the commit and run number)
const sha = (process.env.GITHUB_SHA || (() => { try { return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim(); } catch (e) { return "local"; } })()).slice(0, 7);
const BUILD = { version: pkg.version, sha, run: process.env.GITHUB_RUN_NUMBER || "", date: new Date().toISOString().slice(0, 10) };

// base "./" keeps every asset path relative, so the same build runs from a web server and inside the Capacitor apps.
export default defineConfig({
  base: "./",
  plugins: [react()],
  define: { __BUILD__: JSON.stringify(BUILD) },
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
