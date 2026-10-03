// The EngSpace mark (the E+S emblem): two polygons in the 1024×1024 space of the master icon (assets/icon-only.png) — the bold
// «S» that ends in an arrow, and the short bar of the «E» under it. The points live in src/ui/brand-mark.json, the one source
// for every size: scripts/brand/render.mjs (adaptive icon, splash), public/favicon.svg and the in-app logo (ui/primitives.tsx).
import { readFileSync } from "node:fs";
const data = JSON.parse(readFileSync(new URL("../../src/ui/brand-mark.json", import.meta.url), "utf8"));
export const { s: S_POLY, bar: BAR_POLY, box: MARK_BOX, brand: BRAND } = data;
const pts = (p) => p.map((q) => q.join(",")).join(" ");
export const markPolys = (fill) => `<polygon fill="${fill}" points="${pts(S_POLY)}"/><polygon fill="${fill}" points="${pts(BAR_POLY)}"/>`;
// the mark alone, cropped to its own box; `fill` is any CSS color
export const markSvg = (fill, extra = "") => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK_BOX.x} ${MARK_BOX.y} ${MARK_BOX.w} ${MARK_BOX.h}" ${extra}>${markPolys(fill)}</svg>`;
