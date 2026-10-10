import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { demoAs, noCrash, noOverflow, settle, tab, watch } from "./helpers";

// The Tools suite in the demo: a document tool end to end (new → type → result → preview → PDF), documents that survive a
// reload, and the role gate (supervisors never reach money tools, HR reaches no field tool) from the tab and from typed addresses.

test("engineer: concrete pour plan — type, result, preview, PDF, and it survives a reload", async ({ page }) => {
  test.setTimeout(180_000);
  const errs = watch(page);
  await demoAs(page, "engineer", {}, "#app/tool/concrete");
  await page.locator("[data-tool-new]").click();
  await settle(page, 900);
  const fields = page.locator('[data-screen-layer] input[inputmode="decimal"]:visible');
  // the first element (a slab): length, width; thickness has a default
  const card = page.locator("[data-row='0']");
  const inputs = card.locator('input[inputmode="decimal"]');
  await inputs.nth(1).fill("20");
  await inputs.nth(2).fill("12");
  await settle(page, 600);
  const hero = page.locator("[data-tool-result=hero]");
  await expect(hero).toContainText("37.2");
  expect(await fields.count()).toBeGreaterThan(4);
  await noCrash(page, errs, "concrete");
  await noOverflow(page, "concrete");

  await page.locator("[data-tool-preview]").click();
  await expect(page.getByRole("dialog", { name: "معاينة التقرير" }).locator("canvas")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "إغلاق" }).click();

  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 60_000 }), page.locator("[data-tool-export]").click()]);
  if (process.env.E2E_PDF_OUT) await dl.saveAs(process.env.E2E_PDF_OUT);
  const bytes = readFileSync((await dl.path())!);
  const head = bytes.subarray(0, 8).toString("latin1");
  const all = bytes.toString("latin1");
  expect(head.startsWith("%PDF-")).toBe(true);
  expect(all.trimEnd().endsWith("%%EOF")).toBe(true);
  expect(all).toContain("/Indexed /DeviceRGB 15");
  expect(all).toContain("/Lang (ar)");
  const pages = (all.match(/\/Type \/Page\b/g) || []).length;
  expect(pages).toBeGreaterThanOrEqual(1);
  expect(bytes.length / pages).toBeLessThan(320_000);

  // the new document got its own address on the first edit, and a reload reopens it from the phone's store
  expect(page.url()).toMatch(/#app\/tooldoc\/concrete:d[a-z2-7]{20}$/);
  await page.reload();
  await page.locator("[data-tool-export]").waitFor({ timeout: 20_000 });
  await expect(page.locator("[data-tool-result=hero]")).toContainText("37.2");
  await noCrash(page, errs, "concrete after reload");
});

test("supervisor: field tools open, money tools never — from the tab or a typed address", async ({ page }) => {
  const errs = watch(page);
  await demoAs(page, "supervisor", { disc: "civil" });
  await tab(page, "tools");
  await expect(page.locator("[data-tool-tile=concrete]")).toBeVisible();
  const text = await page.locator("body").innerText();
  for (const n of ["تقييم عرض عمل", "مقارن العروض", "الزيادة والتضخم"]) expect(text).not.toContain(n);
  await page.goto("/?backend=demo#app/tool/offer");
  await settle(page, 900);
  await expect(page.locator("[data-tool-new]")).toHaveCount(0);
  await noCrash(page, errs, "supervisor money address");
});

test("HR: no field tool by tab or address", async ({ page }) => {
  const errs = watch(page);
  await demoAs(page, "hr", {}, "#app/tool/concrete");
  await settle(page, 900);
  await expect(page.locator("[data-tool-new]")).toHaveCount(0);
  await page.goto("/?backend=demo#app/tooldoc/concrete:new");
  await settle(page, 900);
  await expect(page.locator("[data-tool-export]")).toHaveCount(0);
  await noCrash(page, errs, "hr tool address");
});

test("engineer: bar bending schedule — a U-bar line, the cutting plan, a landscape PDF", async ({ page }) => {
  test.setTimeout(180_000);
  const errs = watch(page);
  await demoAs(page, "engineer", {}, "#app/tooldoc/bbs:new");
  await page.locator("[data-tool-export]").waitFor();
  const card = page.locator("[data-row='0']");
  await card.getByRole("button", { name: /21/ }).first().click();
  const nums = card.locator('input[inputmode="decimal"]');
  await nums.nth(0).fill("300");
  await nums.nth(1).fill("1500");
  await nums.nth(2).fill("300");
  await nums.nth(3).fill("4");
  await nums.nth(4).fill("6");
  await settle(page, 500);
  await expect(page.locator("[data-tool-result=hero]")).toContainText("0.0");
  await page.getByRole("button", { name: "احسب خطة القص" }).click();
  await expect(page.getByText(/سيخ جديد/).first()).toBeVisible();
  await noCrash(page, errs, "bbs");
  await noOverflow(page, "bbs");
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 60_000 }), page.locator("[data-tool-export]").click()]);
  if (process.env.E2E_PDF_OUT) await dl.saveAs(process.env.E2E_PDF_OUT.replace(/\.pdf$/, "-bbs.pdf"));
  const all = readFileSync((await dl.path())!).toString("latin1");
  expect(all).toContain("/MediaBox [0 0 841.89 595.276]");
  expect((all.match(/\/Type \/Page\b/g) || []).length).toBeGreaterThanOrEqual(3);
});

test("foreman kit: half-brick wall → 577 bricks, added to a material request, PDF", async ({ page }) => {
  test.setTimeout(120_000);
  const errs = watch(page);
  await demoAs(page, "supervisor", { disc: "civil" }, "#app/tooldoc/tradeKit:new");
  await page.locator("[data-tool-export]").waitFor();
  const nums = page.locator('[data-screen-layer] input[inputmode="decimal"]');
  await nums.nth(0).fill("4");
  await nums.nth(1).fill("2.5");
  await settle(page, 400);
  await expect(page.locator("[data-tool-result=hero]")).toContainText("577");
  await page.getByRole("button", { name: /أضِف لطلب الخامات/ }).click();
  await expect(page.getByText(/طلب الخامات \(3\)/)).toBeVisible();
  await noCrash(page, errs, "trade kit");
  await noOverflow(page, "trade kit");
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 60_000 }), page.locator("[data-tool-export]").click()]);
  expect(readFileSync((await dl.path())!).subarray(0, 5).toString("latin1")).toBe("%PDF-");
});

test("surveyor: a closed levelling loop shows its misclosure live and prints the field book", async ({ page }) => {
  test.setTimeout(120_000);
  const errs = watch(page);
  await demoAs(page, "engineer", { disc: "survey" }, "#app/tooldoc/levelBook:new");
  await page.locator("[data-tool-export]").waitFor();
  await page.getByLabel("منسوبه").first().fill("50");
  await page.getByRole("button", { name: "حلقة مغلقة" }).click();
  await page.getByLabel("طول المسار K").fill("0.2");
  const row = (i: number) => page.locator(`[data-row='${i}']`);
  await row(0).getByLabel("القراءة").fill("1.5");
  await page.getByRole("button", { name: /قراءة جديدة/ }).click();
  await row(1).getByRole("button", { name: /CP/ }).click();
  await row(1).getByLabel("FS مقدمة").fill("2.0");
  await row(1).getByLabel("BS مؤخرة").fill("1.2");
  await page.getByRole("button", { name: /قراءة جديدة/ }).click();
  await row(2).getByRole("button", { name: /FS مقدمة/ }).click();
  await row(2).getByLabel("القراءة").fill("0.690");
  await expect(page.getByText(/e = 10 mm/)).toBeVisible();
  await expect(page.getByText(/أعد الميزانية/).first()).toBeVisible();
  await noCrash(page, errs, "level book");
  await noOverflow(page, "level book");
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 60_000 }), page.locator("[data-tool-export]").click()]);
  expect(readFileSync((await dl.path())!).toString("latin1")).toContain("/MediaBox [0 0 841.89 595.276]");
});

for (const kind of ["siteDiary", "toolboxTalk", "workPermit", "acInstall", "drainRun", "sprinklerCheck", "cableCheck"]) {
  test(`${kind}: opens for a supervisor, takes input, exports a PDF`, async ({ page }) => {
    test.setTimeout(120_000);
    const errs = watch(page);
    await demoAs(page, "supervisor", { disc: "civil" }, `#app/tooldoc/${kind}:new`);
    await page.locator("[data-tool-export]").waitFor();
    const field = page.locator('[data-screen-layer] input[inputmode="decimal"]:visible').first();
    if (await field.count()) await field.fill("3");
    await settle(page, 400);
    await noCrash(page, errs, kind);
    await noOverflow(page, kind);
    const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 60_000 }), page.locator("[data-tool-export]").click()]);
    expect(readFileSync((await dl.path())!).subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });
}

test("permit: a draft can never be authorised without names, the paper signature and a passing gas test", async ({ page }) => {
  await demoAs(page, "supervisor", { disc: "civil" }, "#app/tooldoc/workPermit:new");
  await page.locator("[data-tool-export]").waitFor();
  await expect(page.getByText("مسودة — غير مصرّح بالعمل").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "تصريح العمل" })).toBeDisabled();
});
