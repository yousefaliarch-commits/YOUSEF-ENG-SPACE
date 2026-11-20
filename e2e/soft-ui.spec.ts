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
