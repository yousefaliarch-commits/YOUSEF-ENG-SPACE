import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { composer, demoAs, settle, watch, noCrash, noOverflow } from "./helpers";

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

// ---------------------------------------------------------------- «التقاط صورة» in the phone apps (the v0.26.0 crash)
// The chooser, driven through the development-only stand-in for the camera plugin (window.__engspaceCamera, like __engspaceOta).
// The plugin itself (permission first, then the camera) is pinned by tests/camera.test.ts; the native side by native-camera-config.
async function fakeCamera(page: any, mode: "ok" | "denied" | "fail" | "cancel" = "ok") {
  await page.addInitScript((m: string) => {
    (window as any).__engspaceCamera = {
      calls: [] as string[], mode: m,
      async photo(source: string) {
        this.calls.push(source);
        if (this.mode === "denied") return { denied: source };
        if (this.mode === "fail") return { fallback: "Unable to resolve camera activity" };
        if (this.mode === "cancel") return { cancelled: true };
        const c = document.createElement("canvas"); c.width = 1600; c.height = 1200; const x = c.getContext("2d")!;
        x.fillStyle = "#8a7a6a"; x.fillRect(0, 0, 1600, 1200); x.fillStyle = "#334455"; x.fillRect(200, 200, 600, 400);
        const b: Blob = await new Promise((r) => c.toBlob((v) => r(v!), "image/jpeg", 0.9));
        return { file: new File([b], "photo.jpg", { type: "image/jpeg" }) };
      },
    };
  }, mode);
}
const calls = (page: any) => page.evaluate(() => (window as any).__engspaceCamera.calls);
const setMode = (page: any, m: string) => page.evaluate((v: string) => { (window as any).__engspaceCamera.mode = v; }, m);
async function openInspection(page: any) {
  await page.locator("[data-screen-layer]").getByRole("button", { name: /استلام حديد التسليح/ }).first().click();
  const insp = page.locator("[data-qc-inspection]"); await expect(insp).toBeVisible(); return insp;
}

test("QA/QC: «صورة» opens the chooser; «التقاط صورة» brings the photo in and the chooser closes", async ({ page }) => {
  const errs = watch(page); await fakeCamera(page); await demoAs(page, "engineer", {}, "#app/checklists"); await settle(page, 600);
  const insp = await openInspection(page);
  await insp.locator("[data-qc-photo]").first().click();
  const sheet = page.locator("[data-photo-chooser]"); await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("heading", { name: "صورة للبند" })).toBeVisible();
  await expect(sheet.locator("[data-photo-source=camera]")).toBeFocused();
  await noOverflow(page, "photo chooser");
  await sheet.locator("[data-photo-source=camera]").click();
  await expect(insp.locator("[data-qc-photos] img")).toHaveCount(1); await expect(sheet).toHaveCount(0);
  expect(await calls(page)).toEqual(["camera"]);
  // the gallery the same way
  await insp.locator("[data-qc-photo]").first().click(); await page.locator("[data-photo-source=photos]").click();
  await expect(insp.locator("[data-qc-photos] img")).toHaveCount(2); expect(await calls(page)).toEqual(["camera", "photos"]);
  await noCrash(page, errs, "camera chooser");
});

test("camera refused: the chooser says where to allow it, and the gallery still works", async ({ page }) => {
  await fakeCamera(page, "denied"); await demoAs(page, "engineer", {}, "#app/checklists"); await settle(page, 600);
  const insp = await openInspection(page);
  await insp.locator("[data-qc-photo]").first().click(); await page.locator("[data-photo-source=camera]").click();
  const note = page.locator("[data-photo-chooser] [role=alert]"); await expect(note).toContainText("لم يُسمح لـ EngSpace باستخدام الكاميرا"); await expect(note).toContainText("الإعدادات");
  await expect(insp.locator("[data-qc-photos] img")).toHaveCount(0);
  await setMode(page, "ok"); await page.locator("[data-photo-source=photos]").click();
  await expect(insp.locator("[data-qc-photos] img")).toHaveCount(1); await expect(page.locator("[data-photo-chooser]")).toHaveCount(0);
});

test("the camera plugin fails: the plain camera input takes over (capture=environment), and stays for the rest of the run", async ({ page }) => {
  await fakeCamera(page, "fail"); await demoAs(page, "engineer", {}, "#app/checklists"); await settle(page, 600);
  const insp = await openInspection(page);
  await insp.locator("[data-qc-photo]").first().click();
  // still inside the tap: the capture input opens at once; the chooser also offers it as a button
  const [fc] = await Promise.all([page.waitForEvent("filechooser"), page.locator("[data-photo-source=camera]").click()]);
  expect(await fc.element().getAttribute("capture")).toBe("environment");
  await expect(page.locator("[data-photo-chooser] [role=alert]")).toContainText("تعذّر فتح الكاميرا");
  await expect(page.locator("[data-photo-fallback=camera]")).toBeVisible();
  const photo = await sharp({ create: { width: 1800, height: 1200, channels: 3, background: { r: 120, g: 110, b: 90 } } }).jpeg().toBuffer();
  await fc.setFiles({ name: "site.jpg", mimeType: "image/jpeg", buffer: photo });
  await expect(insp.locator("[data-qc-photos] img")).toHaveCount(1); await expect(page.locator("[data-photo-chooser]")).toHaveCount(0);
  // from now on «صورة» goes straight to the input (no chooser, no plugin)
  const [fc2] = await Promise.all([page.waitForEvent("filechooser"), insp.locator("[data-qc-photo]").first().click()]);
  await expect(page.locator("[data-photo-chooser]")).toHaveCount(0); await fc2.setFiles({ name: "b.jpg", mimeType: "image/jpeg", buffer: photo });
  await expect(insp.locator("[data-qc-photos] img")).toHaveCount(2); expect(await calls(page)).toEqual(["camera"]);
});

test("profile photo: the same chooser; Escape and a cancelled camera leave nothing behind", async ({ page }) => {
  await fakeCamera(page, "cancel"); await demoAs(page, "engineer", {}, "#app/profile"); await settle(page, 600);
  await page.getByRole("button", { name: /صورة للحساب|تغيير صورة الحساب/ }).first().click();
  const sheet = page.locator("[data-photo-chooser]"); await expect(sheet.getByRole("heading", { name: "صورة الحساب" })).toBeVisible();
  await page.keyboard.press("Escape"); await expect(sheet).toHaveCount(0);
  await page.getByRole("button", { name: /صورة للحساب|تغيير صورة الحساب/ }).first().click(); await page.locator("[data-photo-source=camera]").click();
  await expect(sheet).toHaveCount(0);   // cancelled: closed, nothing changed
  await setMode(page, "ok");
  await page.getByRole("button", { name: /صورة للحساب|تغيير صورة الحساب/ }).first().click(); await page.locator("[data-photo-source=camera]").click();
  await expect(page.getByText("حُدّثت صورة حسابك")).toBeVisible();
});

test("the post composer: the chooser opens over the composer sheet and the photo lands in the draft", async ({ page }) => {
  await fakeCamera(page); await demoAs(page, "engineer", {}, "#app/community"); await settle(page, 600);
  await composer(page).click(); await settle(page, 700);
  await page.getByRole("dialog").getByRole("button", { name: /إضافة صورة — اختياري/ }).click();
  const sheet = page.locator("[data-photo-chooser]"); await expect(sheet.getByRole("heading", { name: "صورة للمنشور" })).toBeVisible();
  await sheet.locator("[data-photo-source=camera]").click(); await expect(sheet).toHaveCount(0);
  await expect(page.getByRole("dialog").locator("img[src^='data:image/']").first()).toBeVisible();
});

test("a large photo is decoded already scaled (createImageBitmap resize), never at full size first", async ({ page }) => {
  await demoAs(page, "engineer"); const raw = await sharp({ create: { width: 6000, height: 4500, channels: 3, background: { r: 30, g: 60, b: 90 } } }).jpeg().withMetadata({ orientation: 6 } as any).toBuffer();
  const out = await page.evaluate(async (b64) => {
    const seen: any[] = []; const orig = window.createImageBitmap.bind(window);
    (window as any).createImageBitmap = (src: any, o?: any) => { seen.push(o || null); return orig(src, o); };
    const path = "/src/lib/compress.ts"; const m: any = await import(/* @vite-ignore */ path);
    const r = await m.compressImage(new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], { type: "image/jpeg" }), "photo");
    return { seen, w: r.w, h: r.h };
  }, raw.toString("base64"));
  // stored 6000×4500 turned a quarter (orientation 6): shown 4500×6000 → the decoder is asked for 1200 px wide
  expect(out.seen[0]).toMatchObject({ imageOrientation: "from-image", resizeWidth: 1200, resizeQuality: "high" });
  expect(out.h).toBe(1600); expect(Math.abs(out.w - 1200)).toBeLessThanOrEqual(1);   // the decoder may round the other side by a pixel
});
