import { defineConfig } from "vitest/config";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// Logic tests call components as plain functions against a stub React (tests/stubs), the way the prototype suites did.
// Every lucide icon the app imports becomes a tiny named stub, generated from the source so the list never goes stale.
const iconsUsed = () => {
  const names = new Set<string>();
  const walk = (d: string) => readdirSync(d).forEach((f) => {
    const p = join(d, f);
    if (statSync(p).isDirectory()) return walk(p);
    if (!/\.tsx?$/.test(f)) return;
    for (const m of readFileSync(p, "utf8").matchAll(/import \{([^}]*)\} from "lucide-react"/g)) m[1].split(",").map((s) => s.trim().split(/\s+as\s+/)[0]).filter(Boolean).forEach((n) => names.add(n));
  });
  walk(here("./src"));
  return [...names];
};
const lucideStub = {
  name: "lucide-stub",
  enforce: "pre" as const,
  resolveId: (id: string) => (id === "lucide-react" ? "\0lucide-stub" : null),
  load: (id: string) => id !== "\0lucide-stub" ? null : iconsUsed().map((n) => `export const ${n} = (p) => ({ $el: true, type: "svg", props: { "data-icon": "${n}", ...(p || {}), children: [] } }); ${n}.displayName = "${n}";`).join("\n"),
};

export default defineConfig({
  define: { __BUILD__: JSON.stringify({ version: "test", sha: "test", run: "", date: "" }) },
  plugins: [lucideStub],
  // never read .env / .env.local: the suites run the demo; the cloud suite gets its backend from the environment (npm run test:cloud)
  envDir: here("./tests/stubs"),
  resolve: {
    alias: [
      { find: /^react\/jsx-(dev-)?runtime$/, replacement: here("./tests/stubs/jsx-runtime.ts") },
      { find: /^react-dom(\/client)?$/, replacement: here("./tests/stubs/react-dom.ts") },
      { find: /^react$/, replacement: here("./tests/stubs/react.ts") },
    ],
  },
  test: { environment: "node", include: ["tests/**/*.test.ts"], setupFiles: ["tests/setup-globals.ts"], testTimeout: 60000, silent: "passed-only" },
});
