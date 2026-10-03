// The web icons from the master icon and the mark: public/favicon.svg and public/apple-touch-icon.png (180 px, no alpha).
// Usage: node scripts/brand/web.mjs   (sharp comes with @capacitor/assets)
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { BRAND, markPolys } from "./mark.mjs";
const require = createRequire(import.meta.url); const sharp = require("sharp");
const root = new URL("../../", import.meta.url).pathname;
writeFileSync(root + "public/favicon.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><rect width="1024" height="1024" rx="224" fill="${BRAND.bg}"/>${markPolys(BRAND.accent)}</svg>\n`);
await sharp(root + "assets/icon-only.png").resize(180, 180).flatten({ background: BRAND.bg }).removeAlpha().png().toFile(root + "public/apple-touch-icon.png");
console.log("public/favicon.svg, public/apple-touch-icon.png");
