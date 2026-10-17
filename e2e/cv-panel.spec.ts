import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { demoAs, settle, watch, noCrash, noOverflow, noClipped } from "./helpers";

// CV review v25: the hiring panel — four readers, who flagged each issue, the projection, the grade, the interview
// questions and the rebuilt draft as an A4 PDF, all on the device.
test("hiring panel: four readers, flagged-by on every issue, projection, questions", async ({ page }, info) => {
  const errs = watch(page);
  await demoAs(page, "engineer", {}, "#app/cvreview");
  await settle(page, 800);
  await page.getByRole("button", { name: "مهندس موقع · ضعيفة" }).click();
  await settle(page, 600);

  // projection inside the score card: now → after, and the screen's verdict before → after
  const proj = page.locator("[data-cv-projection]");
  await expect(proj).toBeVisible();
  await expect(proj).toContainText("بعد تطبيق التوصيات");
  await expect(proj.locator("[data-rescreen]")).toHaveAttribute("data-rescreen", "reject>pass");

  // the panel: four readers in order, the toughest named
  const panel = page.locator("[data-cv-panel]");
  await panel.scrollIntoViewIfNeeded();
  await expect(panel.locator("[data-reviewer]")).toHaveCount(4);
  await expect(panel.locator("[data-reviewer=screen]")).toHaveAttribute("data-verdict", "reject");
  await expect(panel.locator("[data-cv-honesty=toughest]")).toContainText("أصعب قارئ");
  await panel.locator("[data-reviewer=teammate] button").click();
  await expect(panel.locator("[data-reviewer=teammate]")).toContainText("روح الفريق");
  await page.screenshot({ path: info.outputPath("cv-panel-ar.png") });

  // every issue names its reader(s)
  const issues = page.locator("li:has([data-flagged-by])");
  expect(await issues.count()).toBeGreaterThanOrEqual(5);
  await expect(page.locator("[data-flagged-by='screen']").first()).toContainText("الفرز الآلي");

  // questions from this CV's own gaps
  const q = page.locator("[data-cv-questions]");
  await q.scrollIntoViewIfNeeded();
  expect(await q.locator("[data-question]").count()).toBeGreaterThanOrEqual(4);
  await expect(q.locator("[data-question=scope]")).toBeVisible();
  await page.screenshot({ path: info.outputPath("cv-questions-ar.png") });

  await noOverflow(page, "cv panel");
  await noClipped(page, "cv panel");
  await noCrash(page, errs, "cv panel");
});

test("rebuilt draft: [أضف] placeholders, then a real A4 PDF from the device", async ({ page }, info) => {
  const errs = watch(page);
  await demoAs(page, "engineer", {}, "#app/cvreview");
  await settle(page, 800);
  await page.getByRole("button", { name: "مكتب فني · عربي" }).click();
  await settle(page, 600);
  const card = page.locator("[data-cv-draftcard]");
  await card.scrollIntoViewIfNeeded();
  await expect(card.locator("[data-cv-asks]")).toBeVisible();
  await card.getByRole("button", { name: "عرض المسودة" }).click();
  const draft = card.locator("[data-cv-draft]");
  await expect(draft).toContainText("الخبرات العملية");
  await expect(draft).toContainText("[أضف:");
  await expect(draft).not.toContainText("رقم القيد");
  await page.screenshot({ path: info.outputPath("cv-draft-ar.png") });

  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 60_000 }), card.locator("[data-cv-pdf]").click()]);
  expect(dl.suggestedFilename()).toMatch(/CV-draft\.pdf$/);
  if (process.env.E2E_PDF_OUT) await dl.saveAs(process.env.E2E_PDF_OUT);
  const all = readFileSync((await dl.path())!).toString("latin1");
  expect(all.startsWith("%PDF-")).toBe(true);
  expect(all.trimEnd().endsWith("%%EOF")).toBe(true);
  expect(all).toContain("/Lang (ar)");
  expect((all.match(/\/Type \/Page\b/g) || []).length).toBeGreaterThanOrEqual(1);
  await noOverflow(page, "cv draft");
  await noCrash(page, errs, "cv draft");
});

test("fresh graduate with honours: grade card, honesty line, English interface", async ({ page }, info) => {
  await demoAs(page, "engineer", {}, "#app/cvreview");
  await page.addInitScript(() => localStorage.setItem("engspace.lang", "en"));
  await page.reload();
  await page.locator("[data-tour=tabbar]").waitFor();
  await settle(page, 800);
  await page.getByRole("button", { name: "Electrical · fresh grad" }).click();
  await settle(page, 600);
  await expect(page.locator("[data-cv-grade=high]")).toContainText("with honors");
  await expect(page.locator("[data-cv-honesty=strong]")).toContainText("came closest to rejecting");
  await expect(page.locator("[data-cv-questions] [data-question=military]")).toContainText("postponed");
  await page.locator("[data-cv-panel]").scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("cv-panel-en.png") });
  await noOverflow(page, "cv panel en");
});
