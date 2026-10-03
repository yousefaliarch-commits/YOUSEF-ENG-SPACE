import { test, expect } from "@playwright/test";
import { signIn, tab, watch, noCrash, noOverflow, settle } from "./helpers";

// The real backend (local Supabase seeded with `npm run db:seed`, or hosted via E2E_BASE + E2E_PASSWORD): each test account signs in
// and walks what its role may see. Skipped unless E2E_LIVE=1, so the demo suite runs anywhere.
test.skip(process.env.E2E_LIVE !== "1", "set E2E_LIVE=1 with a seeded backend");

const MEMBERS: [string, string[]][] = [
  ["civil", ["home", "community", "jobs", "market", "tools", "inbox"]], ["architect", ["home", "community", "jobs", "market", "tools", "inbox"]],
  ["mep", ["home", "community", "jobs", "market", "tools", "inbox"]], ["electrical", ["home", "community", "jobs", "market", "tools", "inbox"]],
  ["survey", ["home", "community", "jobs", "market", "tools", "inbox"]], ["supervisor", ["community", "tools", "inbox"]],
  ["hr", ["home", "community", "jobs", "market", "tools", "inbox"]], ["owner", ["home", "community", "jobs", "market", "tools", "inbox"]],
];

for (const [key, tabs] of MEMBERS) {
  test(`${key}: signs in and every tab renders`, async ({ page }) => {
    const errs = watch(page); await signIn(page, key);
    for (const t of tabs) { await tab(page, t); await noCrash(page, errs, `${key}/${t}`); await noOverflow(page, `${key}/${t}`); }
    expect(await page.getByRole("button", { name: "لوحة الإدارة" }).count(), "members never see the console").toBe(0);
  });
}

test("supervisor: site tools only", async ({ page }) => {
  await signIn(page, "supervisor"); await tab(page, "tools"); const t = await page.locator("body").innerText();
  expect(t).toContain("حصر الخرسانة"); expect(t).not.toContain("تقييم عرض عمل");
});

for (const key of ["moderator", "admin"]) {
  test(`${key}: console opens, every section fits the phone`, async ({ page }) => {
    const errs = watch(page); await signIn(page, key, true);
    await page.getByRole("button", { name: "لوحة الإدارة" }).first().click(); await settle(page, 1500);
    for (const s of ["نظرة عامة", "البلاغات", "المحتوى", "طلبات التوثيق", "دليل الأعضاء", "تذاكر الدعم", "سجل التدقيق", "التحليلات", "الإعدادات"]) {
      const b = page.getByRole("button", { name: new RegExp(s) }).first(); if (!(await b.count())) continue;
      await b.click(); await settle(page, 800); await noCrash(page, errs, `${key}/${s}`); await noOverflow(page, `${key}/${s}`);
    }
  });
}

test("a post published live appears once without a reload", async ({ page }) => {
  const errs = watch(page); await signIn(page, "civil"); await tab(page, "community");
  await page.getByText("اسأل، أو اعرض رقمك").first().click(); await settle(page, 600);
  const body = `اختبار نشر ${Date.now()} لـ 3 طوابق و 12 م`; const d = page.getByRole("dialog");
  await d.locator("textarea").first().fill(body); await d.getByRole("button", { name: /^نشر/ }).last().click(); await settle(page, 3000);
  await expect(page.getByText(body).locator("visible=true")).toHaveCount(1); await noCrash(page, errs, "post");
});
