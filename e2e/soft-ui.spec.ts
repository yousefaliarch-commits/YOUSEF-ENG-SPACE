import { test, expect } from "@playwright/test";
import { demoAs, noOverflow, watch } from "./helpers";

// v0.41 preview: the interface style switch (Settings → المظهر → شكل الواجهة). «ناعم» is the preview's default.
test("interface style: soft by default, switches to classic and back, and survives a reload", async ({ page }) => {
  const errs = watch(page);
  await demoAs(page, "engineer", {}, "#app/settings");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-style", "soft");
  const picker = page.locator("[data-ui-style]");
  await picker.scrollIntoViewIfNeeded();
  await expect(picker.locator('[data-ui-style-option="soft"]')).toHaveAttribute("aria-checked", "true");
  await noOverflow(page, "settings soft");

  await picker.locator('[data-ui-style-option="classic"]').click();
  await expect(html).toHaveAttribute("data-style", "classic");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-style", "classic");

  await page.locator('[data-ui-style-option="soft"]').click();
  await expect(page.locator("html")).toHaveAttribute("data-style", "soft");
  expect(errs).toEqual([]);
});

test("soft style: the tab bar is a raised slab with no live blur, and the current tab is pressed in", async ({ page }) => {
  await demoAs(page, "engineer");
  const bar = page.locator("nav.tabbar");
  test.skip(!(await bar.isVisible()), "the desktop shell uses the side menu instead of the tab bar");
  const style = await bar.evaluate((el) => {
    const s = getComputedStyle(el);
    return { shadow: s.boxShadow, blur: s.backdropFilter || s.getPropertyValue("-webkit-backdrop-filter") };
  });
  expect(style.shadow).not.toBe("none");
  expect(style.blur === "none" || style.blur === "").toBe(true);
  const ind = await page.locator(".tab-ind").evaluate((el) => getComputedStyle(el).boxShadow);
  expect(ind).toContain("inset");
});

// ---- every interaction state in «ناعم»: read from computed styles, not eyeballed ----
const shadowOf = (page: import("@playwright/test").Page, sel: string) => page.locator(sel).first().evaluate((el) => getComputedStyle(el).boxShadow);
const softAs = async (page: import("@playwright/test").Page, hash: string, theme = "light") => {
  await page.addInitScript((t) => { localStorage.setItem("engspace.style", "soft"); localStorage.setItem("engspace.theme", t); }, theme);
  await demoAs(page, "engineer", {}, hash);
};

test("soft states: a chip is raised, a chosen chip is pressed in, and a press swaps raised → inset while the finger is down", async ({ page }) => {
  await softAs(page, "#app/community");
  const off = page.locator('button.hit44[aria-pressed="false"]').first();
  const on = page.locator('button.hit44[aria-pressed="true"]').first();
  expect(await off.evaluate((el) => getComputedStyle(el).boxShadow)).not.toContain("inset");
  expect(await on.evaluate((el) => getComputedStyle(el).boxShadow)).toContain("inset");
  const box = await off.boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  expect(await off.evaluate((el) => getComputedStyle(el).boxShadow)).toContain("inset");
  await page.mouse.up();
});

test("soft states: keyboard focus is an outline in the accent colour that no depth shadow can hide", async ({ page }) => {
  await softAs(page, "#app/settings");
  const option = page.locator('[data-ui-style-option="classic"]');
  await option.scrollIntoViewIfNeeded();
  await option.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  const outline = await page.evaluate(() => { const el = document.activeElement as HTMLElement; const cs = getComputedStyle(el); return { style: cs.outlineStyle, width: parseFloat(cs.outlineWidth) }; });
  expect(outline.style).toBe("solid");
  expect(outline.width).toBeGreaterThanOrEqual(2);
});

test("soft states: switches, segmented choices, fields and the result well take the right depth", async ({ page }) => {
  await softAs(page, "#app/settings");
  const sw = page.locator('button[role="switch"]').first();
  await sw.scrollIntoViewIfNeeded();
  expect(await sw.evaluate((el) => getComputedStyle(el).boxShadow)).toContain("inset");
  // the style picker is an in-track group: the track is inset, the chosen option is a raised thumb
  expect(await shadowOf(page, "[data-ui-style] [role=radiogroup]")).toContain("inset");
  expect(await shadowOf(page, '[data-ui-style-option="soft"]')).not.toContain("inset");

  // a hash-only goto is a same-document navigation the app does not route on: change the query so the page really loads
  await page.goto("/?backend=demo&step=2#app/tooldoc/concrete:new");
  await page.locator("[data-seg]").first().waitFor();
  expect(await shadowOf(page, "[data-seg]")).toContain("inset");
  expect(await shadowOf(page, "[data-seg] .seg-ind")).not.toContain("inset");
  // a field at rest is pressed in; while typing it shows its focus ring instead
  const field = page.locator("label .bg-canvas:has(> input)").first();
  expect(await field.evaluate((el) => getComputedStyle(el).boxShadow)).toContain("inset");
  await field.locator("input").focus();
  const focused = await field.evaluate((el) => ({ shadow: getComputedStyle(el).boxShadow, outline: getComputedStyle(el).outlineStyle }));
  expect(focused.shadow.includes("inset") && focused.outline !== "solid").toBe(false);
});

test("soft states: a disabled primary button is pressed in and dimmed, never raised", async ({ page }) => {
  // the new-post sheet: «نشر» stays disabled until something is written
  await softAs(page, "#app/community");
  await page.getByText(/اسأل، أو اعرض رقمك/).first().click();
  const disabled = page.locator(".btn-primary:disabled").first();
  await disabled.waitFor();
  // every shadow on it is inset (computed styles write «inset» at the end of each one)
  const parts = (await disabled.evaluate((el) => getComputedStyle(el).boxShadow)).split(/,(?![^(]*\))/);
  expect(parts.length).toBeGreaterThan(0);
  for (const part of parts) expect(part.trim()).toMatch(/inset$/);
});
