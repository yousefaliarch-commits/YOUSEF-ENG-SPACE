import { test, expect } from "@playwright/test";
import { demoAs, noCrash, noOverflow, settle, tab, watch } from "./helpers";

// engspace.org on a desktop (W5, src/app/desk.tsx): the sidebar instead of the tab bar, two panes (the documents list beside the
// open document — what the list opens replaces the right pane), focus mode with the live A4 preview, sheets as centred
// dialogs, and the same document saved «on another device» appearing in the open editor.
const pane = (page: any, which: "master" | "detail") => page.locator(`[data-desk-pane=${which}]`);

test("the sidebar replaces the tab bar; the web preview bar steps aside; nothing overflows", async ({ page }) => {
  const errs = watch(page);
  await demoAs(page, "engineer");
  await expect(page.locator("[data-desk-nav]")).toBeVisible();
  await expect(page.locator(".tabbar")).toHaveCount(0);
  await expect(page.locator(".web-topbar")).toBeHidden();
  await tab(page, "tools");
  await expect(page.locator("[data-tool-tile=concrete]")).toBeVisible();
  await expect(page.locator("[data-tour=tab-tools]")).toHaveAttribute("aria-current", "page");
  await noOverflow(page, "desktop tools");
  const h = await page.evaluate(() => ({ doc: document.documentElement.scrollHeight, win: window.innerHeight }));
  expect(h.doc).toBeLessThanOrEqual(h.win + 1);            // one screen, the panes scroll — never the page
  await noCrash(page, errs, "desktop shell");
});

test("two panes: the list stays beside the document; opening another document replaces the right pane", async ({ page }) => {
  test.setTimeout(120_000);
  const errs = watch(page);
  await demoAs(page, "engineer", {}, "#app/tool/concrete");
  await expect(pane(page, "detail").locator("[data-tool-new]")).toBeVisible();
  // the Tools tab is still there on the left
  await expect(pane(page, "master").locator("[data-tool-tile=concrete]")).toBeVisible();

  // a first document, then a second one opened from the left pane's list
  await pane(page, "detail").locator("[data-tool-new]").click();
  await pane(page, "detail").getByLabel("عنوان المستند").fill("صب سقف الدور الأول");
  await settle(page, 900);
  await expect(pane(page, "master").locator("[data-doc-list] li")).toHaveCount(1);
  await expect(pane(page, "master").locator("[data-tool-new]")).toBeVisible();
  await pane(page, "master").locator("[data-tool-new]").click();
  await pane(page, "detail").getByLabel("عنوان المستند").fill("صب سقف الدور الثاني");
  await settle(page, 900);
  await expect(pane(page, "master").locator("[data-doc-list] li")).toHaveCount(2);
  await pane(page, "master").locator("[data-doc-list] li", { hasText: "الدور الأول" }).locator("button").first().click();
  await expect(pane(page, "detail").getByLabel("عنوان المستند")).toHaveValue("صب سقف الدور الأول");
  // still two levels: «back» closes the document and leaves the list on the right, the Tools tab on the left
  await pane(page, "detail").getByRole("button", { name: "رجوع" }).click();
  await expect(pane(page, "detail").locator("[data-tool-new]")).toBeVisible();
  await expect(pane(page, "master").locator("[data-tool-tile=concrete]")).toBeVisible();
  await noOverflow(page, "two panes");
  await noCrash(page, errs, "two panes");
});

test("focus mode: the left pane folds away and the document shows its live A4 preview, updated as you type", async ({ page }) => {
  test.setTimeout(120_000);
  const errs = watch(page);
  await demoAs(page, "engineer", {}, "#app/tooldoc/concrete:new");
  const inputs = page.locator("[data-row='0'] input[inputmode='decimal']");
  await inputs.nth(1).fill("20");
  await inputs.nth(2).fill("12");
  await settle(page, 600);
  await page.locator("[data-desk-focus]").click();
  await expect(page.locator("[data-desk-focus]")).toHaveAttribute("data-desk-focus", "on");
  await expect(page.locator("[data-desk-pane=detail]")).toHaveCount(0);
  await expect(page.locator("[data-live-page]").first()).toBeVisible({ timeout: 20_000 });
  const before = await page.locator("[data-live-page]").first().evaluate((c: HTMLCanvasElement) => c.toDataURL().length);
  await inputs.nth(1).fill("30");
  await expect.poll(async () => page.locator("[data-live-page]").first().evaluate((c: HTMLCanvasElement) => c.toDataURL().length), { timeout: 15_000 }).not.toBe(before);
  // remembered on this browser; folding it back restores the two panes
  await page.reload();
  await expect(page.locator("[data-desk-focus]")).toHaveAttribute("data-desk-focus", "on");
  await page.locator("[data-desk-focus]").click();
  await expect(page.locator("[data-desk-pane=detail]")).toHaveCount(1);
  await noCrash(page, errs, "focus");
});

test("a sheet is a centred dialog on a desktop, not a full-width bottom sheet", async ({ page }) => {
  const errs = watch(page);
  await demoAs(page, "engineer", {}, "#app/tools");
  await tab(page, "tools");
  await page.locator("button", { hasText: "الصافي والإجمالي" }).first().click();
  const sheet = page.locator(".sheet").first();
  await expect(sheet).toBeVisible();
  await settle(page, 600);
  const box = (await sheet.boundingBox())!;
  const vw = page.viewportSize()!.width;
  expect(box.width).toBeLessThanOrEqual(620);
  expect(Math.abs(box.x + box.width / 2 - vw / 2)).toBeLessThan(vw * 0.2);
  expect(box.y).toBeGreaterThan(8);
  await noCrash(page, errs, "sheet");
});

test("live sync: the same document saved on another device appears in the open editor (no local edit pending)", async ({ page }) => {
  test.setTimeout(90_000);
  const errs = watch(page);
  await demoAs(page, "engineer", {}, "#app/tooldoc/concrete:new");
  await page.getByLabel("عنوان المستند").fill("يومية الصب");
  await settle(page, 1200);
  const id = page.url().split(":").pop()!;
  expect(id).toMatch(/^d[a-z2-7]{20}$/);
  await page.evaluate(async (docId) => {
    const s = await (window as any).__engspaceTools.store();
    const d = s.get(docId);
    await s.save({ ...d, title: "يومية الصب — من الموقع" });
  }, id);
  await expect(page.getByLabel("عنوان المستند")).toHaveValue("يومية الصب — من الموقع");
  await expect(page.getByText("وصل تعديل من جهاز آخر")).toBeVisible();
  await noCrash(page, errs, "live sync");
});
