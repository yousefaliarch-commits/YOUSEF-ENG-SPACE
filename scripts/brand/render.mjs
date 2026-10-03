// Renders the brand source images in assets/ from the EngSpace mark (scripts/brand/mark.mjs): the Android adaptive icon's two
// layers and the light / dark splash screens with the wordmark. assets/icon-only.png is the MASTER icon supplied by the owner and
// is never redrawn here. Then `npx @capacitor/assets generate` makes every Android and iOS size from these files, and
// `node scripts/brand/web.mjs` makes the favicon and apple-touch icon.   Usage: node scripts/brand/render.mjs
// Needs Playwright (not a project dependency) — or redraw assets/*.png by hand at the same sizes.
import { createRequire } from "node:module";
import { readFileSync, mkdirSync } from "node:fs";
import { BRAND, MARK_BOX, markPolys, markSvg } from "./mark.mjs";
const require = createRequire(process.cwd() + "/");
const { chromium } = require("playwright");
const root = new URL("../../", import.meta.url).pathname;
const font = readFileSync(root + "node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-600-normal.woff2").toString("base64");

const C = { ...BRAND, paper: "#fafafa" };

const page = (w, h, body, bg) => `<!doctype html><html><head><style>
@font-face { font-family: SG; src: url(data:font/woff2;base64,${font}) format("woff2"); font-weight: 600; }
html, body { margin: 0; width: ${w}px; height: ${h}px; overflow: hidden; background: ${bg}; }
.c { width: 100%; height: 100%; display: grid; place-items: center; }
.word { font: 600 ${Math.round(w * 0.06)}px SG, sans-serif; letter-spacing: -0.03em; margin-top: ${Math.round(w * 0.04)}px; }
</style></head><body>${body}</body></html>`;

const glow = `radial-gradient(circle at 50% 42%, ${C.accent}22 0%, transparent 55%), ${C.bg}`;

// adaptive icon: the system masks the layer to a circle / squircle and only the central 66/108 is guaranteed to show, so every
// point of the mark sits inside that circle (the farthest corner, 463 px from the centre of the 1024 layer, scales to 313 px)
const cx = MARK_BOX.x + MARK_BOX.w / 2, cy = MARK_BOX.y + MARK_BOX.h / 2, k = 313 / 463.6;
const foreground = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><g transform="translate(512 512) scale(${k}) translate(${-cx} ${-cy})">${markPolys(C.accent)}</g></svg>`;
const splashMark = (fill) => markSvg(fill, `width="560" height="${Math.round(560 * MARK_BOX.h / MARK_BOX.w)}"`);

const shots = [
  ["icon-foreground.png", 1024, 1024, `<div class="c">${foreground}</div>`, "transparent"],
  ["icon-background.png", 1024, 1024, `<div class="c"></div>`, C.bg],
  // splash screens: the mark and the wordmark, centred in a square the generator crops to every screen shape
  ["splash-dark.png", 2732, 2732, `<div class="c" style="background:${glow}"><div style="display:grid;justify-items:center">${splashMark(C.accent)}<div class="word" style="color:#f4f4f5">EngSpace<span style="color:${C.accent}">.</span></div></div></div>`, C.bg],
  ["splash.png", 2732, 2732, `<div class="c"><div style="display:grid;justify-items:center">${splashMark(C.accentLight)}<div class="word" style="color:#18181b">EngSpace<span style="color:${C.accentLight}">.</span></div></div></div>`, C.paper],
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
