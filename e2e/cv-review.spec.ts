import { test, expect } from "@playwright/test";
import { demoAs, settle, watch, noCrash, noOverflow, noClipped } from "./helpers";

// CV review v0.1.14: the HR director's assessment and the regional personal block sit right under the score, in Arabic and English.
test("sample CV → HR director's assessment + regional personal details", async ({ page }, info) => {
  const errs = watch(page); await demoAs(page, "engineer", {}, "#app/cvreview"); await settle(page, 800);
  await page.getByRole("button", { name: "مكتب فني · عربي" }).click(); await settle(page, 600);
  const hr = page.locator("[data-cv-hr]"); await expect(hr).toBeVisible();
  await expect(hr).toContainText("تقييم مدير التوظيف الهندسي"); await expect(hr).toContainText("المستوى الوظيفي"); await expect(hr).toContainText("لتتميّز عن باقي المتقدمين");
  await expect(hr.locator("[data-regional=military]")).toContainText("الموقف من التجنيد"); await expect(hr.locator("[data-regional=military]")).toContainText("موجود");
  await expect(hr).not.toContainText("بيانات شخصية لا تحتاجها الشركة");
  await hr.scrollIntoViewIfNeeded(); await page.screenshot({ path: info.outputPath("cv-hr-ar-1.png") });
  await hr.locator("[data-cv-regional]").scrollIntoViewIfNeeded(); await settle(page, 200); await page.screenshot({ path: info.outputPath("cv-hr-ar-2.png") });
  await noOverflow(page, "cv hr"); await noClipped(page, "cv hr"); await noCrash(page, errs, "cv hr");
  // the nav chip jumps to it
  await expect(page.getByRole("button", { name: "رأي التوظيف" })).toBeVisible();
});

test("English interface: the assessment reads in English", async ({ page }, info) => {
  await demoAs(page, "engineer", {}, "#app/cvreview"); await page.addInitScript(() => localStorage.setItem("engspace.lang", "en")); await page.reload(); await page.locator("[data-tour=tabbar]").waitFor(); await settle(page, 800);
  await page.getByRole("button", { name: "Site engineer · weak" }).click(); await settle(page, 600);
  const hr = page.locator("[data-cv-hr]"); await expect(hr).toContainText("Engineering HR director's assessment"); await expect(hr).toContainText("Not ready to submit in its current form");
  await expect(hr).toContainText("Role dates"); await hr.locator("[data-cv-regional]").scrollIntoViewIfNeeded(); await settle(page, 200); await page.screenshot({ path: info.outputPath("cv-hr-en.png") }); await noOverflow(page, "cv hr en");
});
