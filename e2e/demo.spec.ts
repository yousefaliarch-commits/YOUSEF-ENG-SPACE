import { test, expect } from "@playwright/test";
import { demoAs, tab, watch, noCrash, noOverflow, settle } from "./helpers";

// The demo (no backend) in each member role, on both phone profiles: every tab and every tool opens, takes numbers, and nothing crashes.
const ROLES = ["engineer", "supervisor", "hr", "owner"] as const;
const TABS: Record<string, string[]> = { engineer: ["home", "community", "jobs", "market", "tools", "inbox"], supervisor: ["community", "tools", "inbox"], hr: ["home", "community", "jobs", "market", "tools", "inbox"], owner: ["home", "community", "jobs", "market", "tools", "inbox"] };

test("pinch-zoom is locked in the page", async ({ page }) => {
  await demoAs(page);
  const vp = await page.locator('meta[name="viewport"]').getAttribute("content");
  for (const k of ["user-scalable=no", "maximum-scale=1", "minimum-scale=1", "initial-scale=1"]) expect(vp).toContain(k);
  // the browser's own gesture events are cancelled and the page declares touch-action
  const ta = await page.evaluate(() => getComputedStyle(document.body).touchAction);
  expect(ta).toMatch(/manipulation|pan-x|pan-y|none/);
  const prevented = await page.evaluate(() => { const e = new Event("gesturestart", { cancelable: true }); document.dispatchEvent(e); return e.defaultPrevented; });
  expect(prevented).toBe(true);
});

for (const role of ROLES) {
  test(`${role}: every tab opens without errors or overflow`, async ({ page }) => {
    const errs = watch(page); await demoAs(page, role);
    for (const t of TABS[role]) { await tab(page, t); await noCrash(page, errs, `${role}/${t}`); await noOverflow(page, `${role}/${t}`); }
  });
}

test("engineer: every tool opens and accepts numbers", async ({ page }) => {
  test.setTimeout(240_000);
  const errs = watch(page); await demoAs(page, "engineer"); await tab(page, "tools");
  const names = ["حصر الخرسانة", "أوزان الحديد", "حصر المباني", "تحويل الوحدات", "تقييم عرض عمل", "الصافي والإجمالي", "مقارن العروض", "سكريبت التفاوض", "توقيت الزيادة", "خريطة المسار", "فاحص العقد", "تكلفة الانتقال", "الزيادة والتضخم"];
  for (const n of names) {
    await page.goto("/?backend=demo#app/tools"); await page.locator("[data-tour=tabbar]").waitFor(); await settle(page, 500);
    const card = page.getByRole("button", { name: new RegExp(n) }).first();
    expect(await card.count(), `tool card ${n}`).toBeGreaterThan(0);
    await card.evaluate((el: HTMLElement) => { el.scrollIntoView({ block: "center" }); el.click(); }); await settle(page, 900);
    // fill every visible numeric field with a sensible number, then make sure the tool still renders
    const inputs = page.locator('main input[inputmode="decimal"]:visible, main input[type="number"]:visible, [role=dialog] input[inputmode="decimal"]:visible'); const c = Math.min(await inputs.count(), 6);
    for (let i = 0; i < c; i++) await inputs.nth(i).fill(String(10 + i * 5)).catch(() => {});
    await settle(page, 400); await noCrash(page, errs, `tool ${n}`); await noOverflow(page, `tool ${n}`);
  }
});

test("supervisor sees only site tools and checklists, no money", async ({ page }) => {
  await demoAs(page, "supervisor", { disc: "civil" }); await tab(page, "tools");
  const t = await page.locator("body").innerText();
  for (const n of ["حصر الخرسانة", "أوزان الحديد"]) expect(t).toContain(n);
  for (const n of ["تقييم عرض عمل", "مقارن العروض", "الزيادة والتضخم"]) expect(t).not.toContain(n);
});

test("language switch keeps layout intact (English, LTR)", async ({ page }) => {
  const errs = watch(page); await demoAs(page, "engineer");
  await page.goto("/?backend=demo&lang=en#app/home"); await page.locator("[data-tour=tabbar]").waitFor();
  expect(await page.evaluate(() => document.documentElement.dir)).toBe("ltr");
  for (const t of ["home", "community", "jobs", "tools"]) { await tab(page, t); await noCrash(page, errs, `en/${t}`); await noOverflow(page, `en/${t}`); }
});

test("compose a post: shows once, immediately, with mixed numerals isolated", async ({ page }) => {
  const errs = watch(page); await demoAs(page, "engineer"); await tab(page, "community");
  await page.getByText("اسأل، أو اعرض رقمك").first().click(); await settle(page, 600);
  const d = page.getByRole("dialog"); const body = `سؤال عن 3 طوابق و 12 م و ${Date.now() % 1000} جنيه`;
  await d.locator("textarea").first().fill(body); await d.getByRole("button", { name: /^نشر/ }).last().click(); await settle(page, 1500);
  await expect(page.getByText(body).locator("visible=true")).toHaveCount(1); // other tabs stay mounted (hidden), so only what is on screen counts
  const el = page.getByText(body).locator("visible=true").first(); expect(await el.evaluate((n) => getComputedStyle(n).unicodeBidi)).toMatch(/isolate/);
  await noCrash(page, errs, "post");
});

test("pull to refresh always lets go", async ({ page, context }) => {
  const errs = watch(page); await demoAs(page, "engineer"); await tab(page, "community");
  const cdp = await context.newCDPSession(page); const x = 200;
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: 140 }] });
  for (let y = 150; y <= 330; y += 15) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await settle(page, 3000);
  await expect(page.locator(".spin")).toHaveCount(0); await noCrash(page, errs, "refresh");
});

test("admin console fits a phone (demo staff)", async ({ page }) => {
  const errs = watch(page); await demoAs(page, "engineer", { staff: "admin" }); await tab(page, "home");
  const btn = page.getByRole("button", { name: "لوحة الإدارة" }).first(); test.skip(!(await btn.count()), "demo persona has no console entry");
  await btn.click(); await settle(page, 1200);
  const sections = ["نظرة عامة", "البلاغات", "المحتوى", "طلبات التوثيق", "دليل الأعضاء", "تذاكر الدعم", "سجل التدقيق", "التحليلات", "الإعدادات"];
  for (const s of sections) { const b = page.getByRole("button", { name: new RegExp(s) }).first(); if (await b.count()) { await b.click(); await settle(page, 700); await noCrash(page, errs, `admin/${s}`); await noOverflow(page, `admin/${s}`); } }
});
