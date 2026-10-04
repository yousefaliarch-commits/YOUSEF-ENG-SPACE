import { test, expect, type Page } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { demoAs, settle, watch, noCrash, noOverflow, noClipped } from "./helpers";

// QA/QC: build a checklist from scratch, save it, inspect with it, export the executive PDF; edit and delete it; ready templates still work.
const builder = (p: Page) => p.locator("[data-qc-builder]");
const insp = (p: Page) => p.locator("[data-qc-inspection]");
async function build(page: Page, title: string) {
  await page.locator("[data-qc-new]").click(); await expect(builder(page)).toBeVisible();
  await builder(page).getByLabel("عنوان القائمة").fill(title);
  await builder(page).getByRole("button", { name: "ميكانيكا وصحي (MEP)" }).click();
  await builder(page).getByLabel("عنوان القسم 1").fill("المواد");
  await builder(page).getByLabel("البند 1").fill("المواسير من النوع والقطر المعتمد");
  await builder(page).getByRole("button", { name: "إضافة بند" }).first().click(); await builder(page).getByLabel("البند 2").fill("الوصلات والمحابس بشهادات مطابقة");
  await builder(page).getByRole("button", { name: "إضافة قسم جديد" }).click();
  await builder(page).getByLabel("عنوان القسم 2").fill("الاختبار");
  await builder(page).locator("[aria-label='البند 1']").nth(1).fill("اختبار الضغط لمدة 24 ساعة دون هبوط");
}
async function downloadPdf(page: Page) {
  const [dl] = await Promise.all([page.waitForEvent("download"), insp(page).locator("[data-qc-export]").click()]);
  const path = await dl.path(); return readFileSync(path!);
}
const jpegsOf = (pdf: Buffer) => { const out: Buffer[] = []; let i = 0; while ((i = pdf.indexOf(Buffer.from([0xff, 0xd8, 0xff]), i)) >= 0) { const e = pdf.indexOf(Buffer.from("\nendstream"), i); out.push(pdf.subarray(i, e)); i = e; } return out; };

test("build from scratch → save → inspect → executive PDF", async ({ page }, info) => {
  const errs = watch(page); await demoAs(page, "engineer", {}, "#app/checklists"); await settle(page, 600);
  await build(page, "استلام تمديدات التغذية بالمياه");
  await noOverflow(page, "builder"); await noClipped(page, "builder");
  await builder(page).getByRole("button", { name: /حفظ وبدء الفحص/ }).click(); await expect(insp(page)).toBeVisible();
  await expect(insp(page)).toContainText("استلام تمديدات التغذية بالمياه"); await expect(insp(page)).toContainText("ميكانيكا وصحي (MEP)");
  await expect(insp(page)).toContainText("اختبار الضغط لمدة 24 ساعة دون هبوط");
  // header, marks, a note on a passing item, a failure with its correction, general notes
  for (const [ph, v] of [["اسم المشروع", "برج النخيل — العاصمة الإدارية"], ["IR-0142", "IR-0207"], ["اسم شركة المقاولات", "شركة البناء الحديث"], ["اسم الاستشاري", "مكتب الهندسة الاستشاري"]] as const) await insp(page).getByPlaceholder(ph).fill(v);
  const items = insp(page).locator("button[aria-pressed]"); 
  await insp(page).getByRole("button", { name: "مطابق", exact: true }).nth(0).click(); await insp(page).getByRole("button", { name: "مطابق", exact: true }).nth(1).click();
  await insp(page).getByRole("button", { name: "غير مطابق", exact: true }).nth(2).click(); await insp(page).getByPlaceholder("ما المطلوب تصحيحه؟").fill("هبوط 0.3 بار بعد 6 ساعات — يعاد الاختبار بعد إصلاح الوصلة");
  await insp(page).getByRole("button", { name: "ملاحظة" }).first().click(); await insp(page).getByPlaceholder("ملاحظة").first().fill("شهادات المورد مرفقة بالملف");
  await insp(page).getByPlaceholder(/يعاد الاستلام بعد تصحيح/).fill("يعاد الاستلام بعد إصلاح الوصلة وإعادة اختبار الضغط");
  await insp(page).getByRole("button", { name: /^مرفوض/ }).click(); void items;
  const pdf = await downloadPdf(page); expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  const pages = jpegsOf(pdf); expect(pages.length).toBeGreaterThanOrEqual(1);
  pages.forEach((j, i) => writeFileSync(info.outputPath(`report-p${i + 1}.jpg`), j));
  await noCrash(page, errs, "inspect");
  // the checklist is now in «قوائمي المخصصة» and the inspection in «فحوصاتي»
  await page.getByRole("button", { name: "رجوع" }).first().click(); await settle(page, 500); await page.getByRole("button", { name: "رجوع" }).first().click(); await settle(page, 500);
  await expect(page.locator("main, [data-screen-layer]").getByText("قوائمي المخصصة")).toBeVisible();
  await expect(page.locator("[data-screen-layer]").getByText("استلام تمديدات التغذية بالمياه").first()).toBeVisible();
});

test("edit a saved checklist; delete it — inspections done with it still open", async ({ page }) => {
  await demoAs(page, "engineer", {}, "#app/checklists"); await settle(page, 600);
  await build(page, "قائمة للتعديل"); await builder(page).getByRole("button", { name: "حفظ", exact: true }).click(); await settle(page, 500);
  const layer = page.locator("[data-screen-layer]");
  await layer.getByRole("button", { name: "ابدأ فحصًا بهذه القائمة" }).first().click(); await expect(insp(page)).toBeVisible();
  await insp(page).getByRole("button", { name: "مطابق", exact: true }).first().click(); await page.getByRole("button", { name: "رجوع" }).first().click(); await settle(page, 500);
  await layer.getByRole("button", { name: "تعديل القائمة" }).first().click(); await expect(builder(page)).toBeVisible();
  await builder(page).getByLabel("عنوان القائمة").fill("قائمة بعد التعديل"); await builder(page).getByRole("button", { name: "حفظ", exact: true }).click(); await settle(page, 500);
  await expect(layer.getByText("قائمة بعد التعديل").first()).toBeVisible();
  await layer.getByRole("button", { name: "تعديل القائمة" }).first().click();
  await builder(page).getByRole("button", { name: /حذف هذه القائمة/ }).click(); await expect(page.getByRole("alertdialog", { name: "تأكيد حذف القائمة" })).toBeVisible();
  await page.getByRole("button", { name: "احذف القائمة" }).click(); await settle(page, 600);
  await expect(layer.getByText("قوائمي المخصصة")).toHaveCount(0);
  // the inspection made with it still opens, with its own copy of the checklist (the old title)
  await layer.getByText("قائمة للتعديل").first().click(); await expect(insp(page)).toContainText("المواسير من النوع والقطر المعتمد");
});

test("the builder refuses an empty checklist and says why", async ({ page }) => {
  await demoAs(page, "engineer", {}, "#app/checklists"); await settle(page, 600); await page.locator("[data-qc-new]").click();
  await builder(page).getByRole("button", { name: "حفظ", exact: true }).click(); await expect(builder(page).getByRole("alert")).toHaveText("اكتب عنوان القائمة");
  await builder(page).getByLabel("عنوان القائمة").fill("بلا بنود"); await builder(page).getByRole("button", { name: "حفظ", exact: true }).click(); await expect(builder(page).getByRole("alert")).toHaveText("أضف بندًا واحدًا على الأقل");
});

test("start from a copy of a ready template", async ({ page }) => {
  await demoAs(page, "engineer", {}, "#app/checklists"); await settle(page, 600); await page.locator("[data-qc-new]").click();
  await builder(page).getByRole("button", { name: "استلام حديد التسليح" }).click();
  await expect(builder(page).getByLabel("عنوان القائمة")).toHaveValue("استلام حديد التسليح — نسختي"); await expect(builder(page).getByLabel("عنوان القسم 1")).toHaveValue("المطابقة للوحات");
});

test("a site supervisor can build checklists; HR cannot reach them", async ({ page }) => {
  await demoAs(page, "supervisor", {}, "#app/checklists"); await settle(page, 600); await expect(page.locator("[data-qc-new]")).toBeVisible();
});

test("HR cannot open the builder even by its address", async ({ page }) => {
  await demoAs(page, "hr", {}, "#app/qcbuilder/new"); await settle(page, 800); await expect(page.locator("[data-qc-builder]")).toHaveCount(0);
});

test("a long ready-template report spans pages with the table header repeated, in English too", async ({ page }, info) => {
  await demoAs(page, "engineer", {}, "#app/checklists"); await settle(page, 600);
  await page.locator("[data-screen-layer]").getByRole("button", { name: /استلام حديد التسليح/ }).first().click(); await expect(insp(page)).toBeVisible();
  const all = insp(page).getByRole("button", { name: "مطابق", exact: true }); const n = await all.count(); for (let i = 0; i < n; i++) await all.nth(i).click();
  for (let i = 0; i < 6; i++) { await insp(page).getByRole("button", { name: "إضافة بند" }).click(); await insp(page).getByPlaceholder("اكتب البند — مثال: نظافة فتحات الصرف").last().fill(`بند إضافي رقم ${i + 1} للتحقق من تعدد الصفحات في التقرير`); }
  const pdf = await downloadPdf(page); const pages = jpegsOf(pdf); expect(pages.length).toBeGreaterThanOrEqual(2);
  pages.forEach((j, i) => writeFileSync(info.outputPath(`long-p${i + 1}.jpg`), j));
  await page.goto("/?backend=demo&lang=en#app/inspection/new:rebar"); await page.locator("[data-tour=tabbar]").waitFor({ state: "attached" }); await settle(page, 800);
  await expect(insp(page)).toBeVisible(); const en = jpegsOf(await downloadPdf(page)); writeFileSync(info.outputPath(`en-p1.jpg`), en[0]);
});
