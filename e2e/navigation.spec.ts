import { test, expect } from "@playwright/test";
import { demoAs, tab, settle, watch, noCrash } from "./helpers";

// Back navigation: the header button and the edge swipe both return to a list that is exactly where it was.
const layer = (page: any) => page.locator("[data-screen-layer]");
async function openFirstPost(page: any) { await tab(page, "community"); await settle(page, 600); await page.locator("main article button").locator("visible=true").first().evaluate((b: HTMLElement) => b.click()); await expect(layer(page)).toHaveCount(1); await settle(page, 400); }
async function swipe(page: any, context: any, fromX: number, toX: number) {
  const cdp = await context.newCDPSession(page); const y = 420;
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: fromX, y }] });
  const steps = 12; for (let i = 1; i <= steps; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: fromX + ((toX - fromX) * i) / steps, y }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

test("«back» returns to the feed at the same scroll position, with the post screen layer gone", async ({ page }) => {
  const errs = watch(page); await demoAs(page, "engineer"); await tab(page, "community");
  await page.evaluate(() => { const s = document.querySelector(".scroll-area") as HTMLElement; s.scrollTop = 600; }); await settle(page, 300);
  const before = await page.evaluate(() => (document.querySelector(".scroll-area") as HTMLElement).scrollTop);
  await page.locator("main article button").locator("visible=true").nth(2).evaluate((b: HTMLElement) => b.click()); await expect(layer(page)).toHaveCount(1);
  await page.getByRole("button", { name: "رجوع" }).first().click(); await expect(layer(page)).toHaveCount(0);
  expect(await page.evaluate(() => (document.querySelector(".scroll-area") as HTMLElement).scrollTop)).toBe(before);
  await expect(page.locator("[data-tour=tabbar]")).toBeVisible(); await noCrash(page, errs, "back");
});

test("edge swipe (Arabic: from the right edge) follows the finger: a short swipe springs back, a long one goes back", async ({ page, context }) => {
  const errs = watch(page); await demoAs(page, "engineer"); await openFirstPost(page); const w = page.viewportSize()!.width;
  await swipe(page, context, w - 6, w - 70); await settle(page, 500); await expect(layer(page)).toHaveCount(1);
  expect(await layer(page).evaluate((el: HTMLElement) => el.style.transform)).toBe("");   // sprang back, inline styles cleared
  await swipe(page, context, w - 6, w * 0.25); await settle(page, 500); await expect(layer(page)).toHaveCount(0);
  await expect(page.locator("[data-tour=tabbar]")).toBeVisible(); await noCrash(page, errs, "swipe");
});

test("a swipe that does not start at the edge does nothing", async ({ page, context }) => {
  await demoAs(page, "engineer"); await openFirstPost(page); const w = page.viewportSize()!.width;
  await swipe(page, context, w * 0.5, 10); await settle(page, 500); await expect(layer(page)).toHaveCount(1);
});

test("English (LTR): the swipe starts at the left edge", async ({ page, context }) => {
  await page.goto("/?backend=demo&lang=en#app/community"); await page.addInitScript(() => {}); await demoAs(page, "engineer", {}, "#app/community");
  await page.goto("/?backend=demo&lang=en#app/community"); await page.locator("[data-tour=tabbar]").waitFor(); await openFirstPost(page); const w = page.viewportSize()!.width;
  await swipe(page, context, 6, w * 0.75); await settle(page, 500); await expect(layer(page)).toHaveCount(0);
});

test("deeper screens: back from a room's post returns to the room, then to the tab", async ({ page }) => {
  await demoAs(page, "engineer"); await tab(page, "community"); await settle(page, 600);
  const room = page.locator("main article").filter({ hasText: "عضو" }).locator("visible=true").first().locator("button").first();
  if (!(await room.count())) test.skip(true, "no room card in the demo");
  await room.evaluate((b: HTMLElement) => b.click()); await expect(layer(page)).toHaveCount(1); await settle(page, 600);
  const posts = layer(page).locator("article button:has(p)"); if (!(await posts.count())) test.skip(true, "room has no posts");
  await posts.first().evaluate((b: HTMLElement) => b.click()); await expect(layer(page).getByRole("button", { name: "الأكثر فائدة" })).toBeVisible(); await settle(page, 300);
  await page.getByRole("button", { name: "رجوع" }).first().click(); await settle(page, 500); await expect(layer(page)).toHaveCount(1); await expect(layer(page).getByRole("button", { name: "الأكثر فائدة" })).toHaveCount(0);
  await page.getByRole("button", { name: "رجوع" }).first().click(); await settle(page, 600); await expect(layer(page)).toHaveCount(0);
});
