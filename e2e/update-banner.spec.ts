import { test, expect } from "@playwright/test";
import { demoAs, tab, settle, noCrash, noOverflow, noClipped, watch } from "./helpers";

// The live-update banner, driven through the dev-only hook window.__engspaceOta (a browser has no update plugin).
const banner = (page: any) => page.locator("[data-update-banner]");
const hook = (page: any, fn: string, arg?: string) => page.evaluate(([f, a]: any) => (window as any).__engspaceOta[f](a), [fn, arg]);

test("no banner until an update is ready; then it sits under the header with the right text", async ({ page }) => {
  const errs = watch(page); await demoAs(page, "engineer"); await expect(banner(page)).toHaveCount(0);
  await hook(page, "ready", "0.25.0-e2e"); await expect(banner(page)).toBeVisible();
  await expect(banner(page)).toContainText("يتوفر تحديث جديد للمنصة لتحسين الأداء"); await expect(banner(page).getByRole("button", { name: "تحديث الآن" })).toBeVisible(); await expect(banner(page).getByRole("button", { name: "إغلاق" })).toBeVisible();
  // below the header, above the content, never over the tab bar
  const b = await banner(page).boundingBox(); const bar = await page.locator("[data-tour=tabbar]").boundingBox(); expect(b!.y).toBeGreaterThan(30); expect(b!.y + b!.height).toBeLessThan(bar!.y);
  await noOverflow(page, "banner"); await noClipped(page, "banner"); await noCrash(page, errs, "banner");
});

test("it follows the member across tabs and screens", async ({ page }) => {
  await demoAs(page, "engineer"); await hook(page, "ready"); await expect(banner(page)).toBeVisible();
  for (const t of ["community", "jobs", "market", "tools"]) { await tab(page, t); await expect(banner(page), `on ${t}`).toBeVisible(); }
});

test("✕ dismisses it for the session without interrupting; a newer update brings it back", async ({ page }) => {
  await demoAs(page, "engineer"); await hook(page, "ready", "v1"); await banner(page).getByRole("button", { name: "إغلاق" }).click(); await expect(banner(page)).toHaveCount(0);
  await tab(page, "community"); await expect(banner(page)).toHaveCount(0); expect(await page.evaluate(() => (window as any).__engspaceOta.applied)).toBe(0);
  await hook(page, "ready", "v2"); await expect(banner(page)).toBeVisible();
});

test("«تحديث الآن» shows progress and applies the bundle in about a second", async ({ page }) => {
  await demoAs(page, "engineer"); await hook(page, "ready"); const t0 = Date.now();
  await banner(page).getByRole("button", { name: "تحديث الآن" }).click(); await expect(banner(page)).toContainText("جارٍ تطبيق التحديث");
  await expect.poll(() => page.evaluate(() => (window as any).__engspaceOta.applied), { timeout: 3000 }).toBe(1); const took = Date.now() - t0; expect(took).toBeGreaterThan(700); expect(took).toBeLessThan(2500);
  await settle(page, 1200); expect(await page.evaluate(() => (window as any).__engspaceOta.applied)).toBe(1);
});

test("fits the narrowest phones and English", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 }); await demoAs(page, "engineer"); await hook(page, "ready"); await expect(banner(page)).toBeVisible(); await noOverflow(page, "320"); await noClipped(page, "320");
  await page.goto("/?backend=demo&lang=en#app/home"); await page.locator("[data-tour=tabbar]").waitFor(); await hook(page, "ready"); await expect(banner(page)).toContainText("A new platform update is available to improve performance"); await expect(banner(page).getByRole("button", { name: "Update now" })).toBeVisible(); await noClipped(page, "en 320");
});
