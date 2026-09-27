import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" keeps every asset path relative, so the same build runs from a web server and inside the Capacitor apps.
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 1600,
    rolldownOptions: {
      // pdf.js keeps a Node-only `eval("require")` fallback that never runs in the browser
      onwarn(warning, next) { if (warning.code === "EVAL" && /pdfjs-dist/.test(String(warning.id || ""))) return; next(warning); },
    },
  },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
});
