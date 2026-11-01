import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { strFromU8, unzipSync } from "fflate";
import { demoAs, noCrash, noOverflow, settle, tab, watch } from "./helpers";

// W7 in the demo: the RFI log built from the documents (an overdue query, an answered one), exported as a live workbook;
// a variation order's additions and omissions, its approval feeding the VO log; and the money gate (no VO for supervisors).
const download = async (page: any, sel: string) => {
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 60_000 }), page.locator(sel).click()]);
  return { name: dl.suggestedFilename() as string, bytes: readFileSync((await dl.path())!) };
};
const back = async (page: any) => {
  await page.getByRole("button", { name: "رجوع" }).last().click();
  await page.locator("[data-tool-new]").waitFor({ timeout: 20_000 });
  await settle(page, 400);
};
const issue = async (page: any) => {
  await page.getByRole("button", { name: "إصدار", exact: true }).click();
  await page.getByRole("button", { name: "أصدر", exact: true }).click();
  await settle(page, 900);
};

test("RFI log: an overdue query and an answered one, counted and exported", async ({ page }) => {
  test.setTimeout(150_000);
  const errs = watch(page);
  await demoAs(page, "engineer", {}, "#app/tool/rfi");

  // 1 — sent long ago, never answered → overdue
  await page.locator("[data-tool-new]").click();
  await page.getByLabel("عنوان المستند").fill("تعارض منسوب بلاطة الدور الأول");
  await page.getByLabel("التاريخ", { exact: true }).fill("2025-01-05");
  await page.getByLabel("السؤال", { exact: true }).fill("منسوب البلاطة في S-102 مختلف عن A-201 بمقدار 15 سم.");
  await settle(page, 600);
  await issue(page);
  await back(page);

  // 2 — answered three days after it was sent
  await page.locator("[data-tool-new]").click();
  await page.getByLabel("عنوان المستند").fill("مقاس فتحة شافت التكييف");
  await page.getByLabel("التاريخ", { exact: true }).fill("2025-02-01");
  await page.getByLabel("الرد", { exact: true }).fill("يُعتمد المقاس 1.20 × 0.80 م كما في اللوحة M-301.");
  await page.locator("[data-rfi-answered-on]").fill("2025-02-04");
  await settle(page, 600);
  await issue(page);
  await back(page);

  await page.locator("[data-register-switch]").getByRole("button", { name: "السجل" }).click();
  const reg = page.locator("[data-register=rfi]");
  await expect(reg).toBeVisible();
  await expect(reg.locator("[data-register-row]")).toHaveCount(2);
  await expect(reg.locator("[data-register-row=overdue]")).toContainText("تعارض منسوب");
  await expect(reg.locator("[data-register-row=answered]")).toContainText("3");
  await expect(reg.locator("[data-register-late]")).toHaveAttribute("data-register-late", "1");
  await noOverflow(page, "rfi log");

  const x = await download(page, "[data-register-xlsx]");
  expect(x.name).toMatch(/^GEN-RFI-LOG-\d{4}-\d{2}-\d{2}\.xlsx$/);
  const files = unzipSync(new Uint8Array(x.bytes));
  const sheets = Object.keys(files).filter((k) => k.startsWith("xl/worksheets/")).map((k) => strFromU8(files[k])).join("");
  expect(sheets).toContain("متأخر");
  expect(sheets).toContain("تم الرد");
  expect(sheets).not.toMatch(/EngSpace/i);
  await noCrash(page, errs, "rfi log");
});

test("variation order: additions minus omissions, the engineer's approval, and the VO log's totals", async ({ page }) => {
  test.setTimeout(120_000);
  const errs = watch(page);
  await demoAs(page, "engineer", {}, "#app/tool/vo");
  await page.locator("[data-tool-new]").click();
  await page.getByLabel("عنوان المستند").fill("أمر تغيير 1 — زيادة سمك البلاطات");
  const first = page.locator("[data-row='0']").first();
  await first.getByLabel("البيان").fill("خرسانة مسلحة إضافية");
  await first.getByLabel("الكمية").fill("40");
  await first.getByLabel("الفئة").fill("4500");
  await page.getByRole("button", { name: "بند", exact: true }).click();
  const second = page.locator("[data-row='1']").first();
  await second.getByLabel("البيان").fill("إلغاء بلاط الممرات");
  await second.getByLabel("الكمية").fill("120");
  await second.getByLabel("الفئة").fill("650");
  await second.getByRole("button", { name: "إلغاء", exact: true }).click();
  await settle(page, 500);
  // 40 × 4,500 − 120 × 650 = 180,000 − 78,000 = 102,000
  await expect(page.locator("[data-tool-result=hero]")).toContainText("102,000.00");
  await page.getByRole("button", { name: "معتمد", exact: true }).click();
  await page.getByLabel("القيمة المعتمدة").fill("95000");
  await settle(page, 600);
  await issue(page);
  await back(page);
  await page.locator("[data-register-switch]").getByRole("button", { name: "السجل" }).click();
  const reg = page.locator("[data-register=vo]");
  await expect(reg.locator("[data-register-row=approved]")).toHaveCount(1);
  await expect(reg).toContainText("95,000");
  await noOverflow(page, "vo log");
  await noCrash(page, errs, "vo");
});

test("variation orders are money: a site supervisor sees neither the tool nor its address", async ({ page }) => {
  const errs = watch(page);
  await demoAs(page, "supervisor", { disc: "civil" });
  await tab(page, "tools");
  await expect(page.locator("[data-tool-tile=rfi]")).toBeVisible();
  await expect(page.locator("[data-tool-tile=vo]")).toHaveCount(0);
  await page.goto("/?backend=demo#app/tool/vo");
  await settle(page, 1200);
  await expect(page.locator("[data-tool-new]")).toHaveCount(0);
  await noCrash(page, errs, "vo supervisor");
});
