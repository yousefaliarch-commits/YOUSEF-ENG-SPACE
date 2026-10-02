// Renders the brand source images in assets/ from one drawing of the EngSpace mark (the two arches of ui/primitives.tsx →
// ArchMark): the full icon, the Android adaptive icon's two layers, and light / dark splash screens with the wordmark.
// Then `npx @capacitor/assets generate` makes every Android and iOS size from them.  Usage: node scripts/brand/render.mjs
// Needs Playwright (not a project dependency) — or redraw assets/*.png by hand at the same sizes.
import { createRequire } from "node:module";
import { readFileSync, mkdirSync } from "node:fs";
const require = createRequire(process.cwd() + "/");
const { chromium } = require("playwright");
const root = new URL("../../", import.meta.url).pathname;
const font = readFileSync(root + "node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-600-normal.woff2").toString("base64");

const C = { ink: "#09090b", deep: "#151129", accent: "#A89CFF", accentLight: "#5B4BC9", paper: "#fafafa" };

// the mark, as in the app: a bright arch and, offset behind it, a fainter shorter one (0.7 wide, rounded tops, open below)
const mark = (s, color) => {
  const w = 0.7 * s, r = w / 2, sw = 0.1 * s, H = 1.1 * s;
  const arch = (x, h, op) => `<path d="M ${x + sw / 2} ${H} V ${H - h + r} A ${r - sw / 2} ${r - sw / 2} 0 0 1 ${x + w - sw / 2} ${H - h + r} V ${H}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="butt" opacity="${op}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${H}" viewBox="0 0 ${s} ${H}">${arch(0, 0.77 * s, 0.5)}${arch(0.3 * s, 0.97 * s, 1)}</svg>`;
};

const page = (w, h, body, bg) => `<!doctype html><html><head><style>
@font-face { font-family: SG; src: url(data:font/woff2;base64,${font}) format("woff2"); font-weight: 600; }
html, body { margin: 0; width: ${w}px; height: ${h}px; overflow: hidden; background: ${bg}; }
.c { width: 100%; height: 100%; display: grid; place-items: center; }
.word { font: 600 ${Math.round(w * 0.06)}px SG, sans-serif; letter-spacing: -0.03em; margin-top: ${Math.round(w * 0.035)}px; }
</style></head><body>${body}</body></html>`;

const glow = (accent) => `radial-gradient(circle at 50% 42%, ${accent}33 0%, transparent 55%), linear-gradient(160deg, ${C.deep}, ${C.ink} 70%)`;

const shots = [
  // the full icon (iOS, legacy Android): mark on the deep gradient, nothing near the edges
  ["icon-only.png", 1024, 1024, `<div class="c" style="background:${glow(C.accent)}">${mark(500, C.accent)}</div>`, C.ink],
  // adaptive icon: the system masks it to a circle / squircle, so the mark stays inside the central 66 %
  ["icon-foreground.png", 1024, 1024, `<div class="c">${mark(380, C.accent)}</div>`, "transparent"],
  ["icon-background.png", 1024, 1024, `<div class="c" style="background:${glow(C.accent)}"></div>`, C.ink],
  // splash screens: the mark and the wordmark, centred in a square the generator crops to every screen shape
  ["splash-dark.png", 2732, 2732, `<div class="c"><div style="display:grid;justify-items:center">${mark(520, C.accent)}<div class="word" style="color:#f4f4f5">EngSpace<span style="color:${C.accent}">.</span></div></div></div>`, C.ink],
  ["splash.png", 2732, 2732, `<div class="c"><div style="display:grid;justify-items:center">${mark(520, C.accentLight)}<div class="word" style="color:#18181b">EngSpace<span style="color:${C.accentLight}">.</span></div></div></div>`, C.paper],
];

mkdirSync(root + "assets", { recursive: true });
const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
for (const [name, w, h, body, bg] of shots) {
  const pg = await b.newPage({ viewport: { width: w, height: h } });
  await pg.setContent(page(w, h, body, bg)); await pg.evaluate(() => document.fonts.ready);
  await pg.screenshot({ path: root + "assets/" + name, omitBackground: bg === "transparent" });
  await pg.close(); console.log("assets/" + name);
}
await b.close();
