import { fileURLToPath } from "node:url";

// The Tailwind config is named explicitly (resolved from this file), so a build or dev server started from any folder uses it
export default {
  plugins: {
    tailwindcss: { config: fileURLToPath(new URL("./tailwind.config.js", import.meta.url)) },
    autoprefixer: {},
  },
};
