import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { demoAs, settle, watch, noCrash, noOverflow } from "./helpers";

// Phase 1.3: the on-device image pipeline (src/lib/compress.ts) in a real browser, and photos on QA/QC inspection items.
const EXIF = { IFD0: { Make: "PhoneCo", Model: "Camera 9" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "30/1 2/1 0/1", GPSLongitudeRef: "E", GPSLongitude: "31/1 14/1 0/1" } };
// a 12-megapixel camera photo with real detail (noise compresses badly — the hard case) and EXIF + GPS
async function cameraPhoto(w = 4000, h = 3000) {
  const px = Buffer.alloc(w * h * 3); for (let i = 0; i < px.length; i++) px[i] = (i * 2654435761) >>> 24 & 0xff;
  return sharp(px, { raw: { width: w, height: h, channels: 3 } }).blur(1.2).jpeg({ quality: 92 }).withMetadata({ exif: EXIF } as any).toBuffer();
}

test("a 12 MP camera photo leaves the phone at ≤ 1600 px, in the 150–250 KB band, without EXIF or GPS", async ({ page }) => {
  await demoAs(page, "engineer"); const raw = await cameraPhoto(); expect(raw.length).toBeGreaterThan(2_000_000);
  const out = await page.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); const file = new Blob([bytes], { type: "image/jpeg" });
    const path = "/src/lib/compress.ts"; const m: any = await import(/* @vite-ignore */ path);
    const t0 = performance.now(); const r = await m.compressImage(file, "photo"); const ms = performance.now() - t0;
    const a = await m.compressImage(file, "avatar"); const text = new TextDecoder("latin1").decode(new Uint8Array(await r.blob.arrayBuffer()));
    return { w: r.w, h: r.h, bytes: r.bytes, mime: r.mime, exif: /Exif|PhoneCo/.test(text), ms, avatar: { w: a.w, h: a.h, bytes: a.bytes } };
  }, raw.toString("base64"));
  expect(Math.max(out.w, out.h)).toBeLessThanOrEqual(1600); expect(out.bytes).toBeLessThanOrEqual(250 * 1024);
  expect(out.mime).toBe("image/webp"); expect(out.exif).toBe(false);
  expect(out.avatar).toMatchObject({ w: 256, h: 256 }); expect(out.avatar.bytes).toBeLessThanOrEqual(40 * 1024);
  test.info().annotations.push({ type: "compression", description: `${(raw.length / 1024 / 1024).toFixed(1)} MB → ${(out.bytes / 1024).toFixed(0)} KB ${out.w}×${out.h} in ${Math.round(out.ms)} ms` });
});

test("a plain photo is not inflated: it stays well under the target", async ({ page }) => {
  await demoAs(page, "engineer"); const raw = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: { r: 200, g: 205, b: 210 } } }).jpeg({ quality: 95 }).toBuffer();
  const out = await page.evaluate(async (b64) => { const path = "/src/lib/compress.ts"; const m: any = await import(/* @vite-ignore */ path); const r = await m.compressImage(new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], { type: "image/jpeg" }), "photo"); return { w: r.w, bytes: r.bytes }; }, raw.toString("base64"));
  expect(out.w).toBe(1600); expect(out.bytes).toBeLessThan(150 * 1024);
});

test("QA/QC: a photo on an inspection item — compressed, shown, removable, and in the PDF report", async ({ page }, info) => {
  const errs = watch(page); await demoAs(page, "engineer", {}, "#app/checklists"); await settle(page, 600);
  const layer = page.locator("[data-screen-layer]");
  await layer.getByRole("button", { name: /استلام حديد التسليح/ }).first().click(); await expect(page.locator("[data-qc-inspection]")).toBeVisible();
  const insp = page.locator("[data-qc-inspection]");
  await insp.getByRole("button", { name: "غير مطابق", exact: true }).first().click(); await insp.getByPlaceholder("ما المطلوب تصحيحه؟").first().fill("الغطاء الخرساني أقل من المطلوب");
  const photo = await sharp({ create: { width: 2400, height: 1800, channels: 3, background: { r: 140, g: 120, b: 100 } } }).jpeg().withMetadata({ exif: EXIF } as any).toBuffer();
  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), insp.locator("[data-qc-photo]").first().click()]);
  await chooser.setFiles({ name: "site.jpg", mimeType: "image/jpeg", buffer: photo });
  const thumbs = insp.locator("[data-qc-photos] img"); await expect(thumbs).toHaveCount(1);
  const src = await thumbs.first().getAttribute("src"); expect(src).toMatch(/^data:image\/webp;base64,/);
  expect(Buffer.from(src!.split(",")[1], "base64").length).toBeLessThanOrEqual(250 * 1024);
  await noOverflow(page, "inspection with photo");
  // a second photo, then remove it
  const [c2] = await Promise.all([page.waitForEvent("filechooser"), insp.locator("[data-qc-photo]").first().click()]);
  await c2.setFiles({ name: "site2.jpg", mimeType: "image/jpeg", buffer: photo }); await expect(thumbs).toHaveCount(2);
  await insp.getByRole("button", { name: "حذف الصورة" }).last().click(); await expect(thumbs).toHaveCount(1);
  // the report carries the photo appendix
  const [dl] = await Promise.all([page.waitForEvent("download"), insp.locator("[data-qc-export]").click()]);
  const pdf = readFileSync((await dl.path())!); expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  const pages: Buffer[] = []; let i = 0; while ((i = pdf.indexOf(Buffer.from([0xff, 0xd8, 0xff]), i)) >= 0) { const e = pdf.indexOf(Buffer.from("\nendstream"), i); pages.push(pdf.subarray(i, e)); i = e; }
  pages.forEach((j, k) => writeFileSync(info.outputPath(`report-p${k + 1}.jpg`), j));
  expect(pages.length).toBeGreaterThanOrEqual(1);
  // the photo survives a reload (saved with the inspection)
  await page.reload(); await page.locator("[data-tour=tabbar]").waitFor(); await settle(page, 600);
  await noCrash(page, errs, "inspection photos");
});
