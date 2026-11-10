import { test, expect } from "@playwright/test";
import { demoAs, noOverflow, settle, watch } from "./helpers";

// v0.39 in the demo: document settings and firm templates, the command palette, the public page, and a rolling slab.
test("document settings: a custom revision scheme, a signature box and a scale — saved as a firm template that starts the next document", async ({ page }) => {
  test.setTimeout(120_000);
  const errs = watch(page);
  await demoAs(page, "engineer", {}, "#app/tooldoc/ipc:new");
  await page.locator("[data-doc-settings] button[aria-expanded]").first().click();
  await page.locator("[data-rev-presets] button").nth(2).click();
  await expect(page.locator("[data-doc-rev]")).toHaveValue("P01");
  await page.locator("[data-doc-scale]").fill("1:50");
  await page.locator("[data-sign-custom]").click();
  await expect(page.locator("[data-doc-sign=custom]")).toBeVisible();
  await page.locator("[data-template-name]").fill("قالب المكتب");
  await page.locator("[data-template-save]").click();
  await settle(page, 900);
  // a different query is a full reload: the template is read back from this browser's own store
  await page.goto("/?backend=demo&again=1#app/tool/ipc");
  await expect(page.locator("[data-template-list] li")).toHaveCount(1);
  await page.locator("[data-template-start]").click();
  // the card is folded by default (and says what was changed): open it to read the revision the template started with
  const card = page.locator("[data-doc-settings] button[aria-expanded]").first();
  await expect(card).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("[data-advanced-changed]").first()).toBeVisible();
  await card.click();
  await expect(page.locator("[data-doc-rev]")).toHaveValue("P01");
  await expect(page.locator("[data-doc-scale]")).toHaveValue("1:50");
  await expect(page.locator("[data-doc-sign=custom]")).toBeVisible();
  expect(errs).toEqual([]);
});

test("command palette: Ctrl K opens it, typing finds a tool, Enter opens it, Esc closes", async ({ page }) => {
  const errs = watch(page);
  await demoAs(page, "engineer", {}, "#app/home");
  await page.keyboard.press("Control+k");
  await expect(page.locator("[data-palette-input]")).toBeFocused();
  await page.keyboard.type("مستخلص");
  await expect(page.locator("[data-palette-item='tool:ipc']")).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-palette]")).toHaveCount(0);
  await expect(page.locator("[data-tool=ipc]")).toBeVisible({ timeout: 15_000 });
  await page.keyboard.press("Control+k");
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-palette]")).toHaveCount(0);
  expect(errs).toEqual([]);
});

test("a supervisor's palette never offers a money tool", async ({ page }) => {
  await demoAs(page, "supervisor", {}, "#app/tools");
  await settle(page, 1500);
  await page.keyboard.press("Control+k");
  await page.keyboard.type("مستخلص");
  await expect(page.locator("[data-palette-empty]")).toBeVisible();
  await expect(page.locator("[data-palette-item='tool:ipc']")).toHaveCount(0);
});

test("the public page: a live slab estimator, no sideways scroll, and «open the app» enters it", async ({ page }) => {
  const errs = watch(page);
  await page.goto("/?backend=demo");
  await page.locator("[data-landing]").waitFor({ timeout: 20_000 });
  const before = await page.locator("[data-slab-results]").innerText();
  await page.locator("[data-slab=L]").fill("12");
  await settle(page, 900);
  expect(await page.locator("[data-slab-results]").innerText()).not.toBe(before);
  await noOverflow(page, "landing");
  await page.locator("[data-landing-start]").click();
  await expect(page.locator("[data-landing]")).toHaveCount(0);
  expect(page.url()).toContain("#app");
  await page.goBack();
  await expect(page.locator("[data-landing]")).toHaveCount(1);
  expect(errs).toEqual([]);
});

test("a return from sign-in is never the public page", async ({ page }) => {
  await page.goto("/?backend=demo&code=abc123");
  await settle(page, 1500);
  await expect(page.locator("[data-landing]")).toHaveCount(0);
});
