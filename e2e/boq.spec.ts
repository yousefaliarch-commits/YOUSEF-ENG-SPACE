import { test, expect } from "@playwright/test";
import { demoAs, noCrash, noOverflow, settle, tab, watch } from "./helpers";

// W8 in the demo: a BOQ pasted from Excel or picked as a CSV file (Arabic digits, a duplicate code caught before anything is
// saved) fills the payment certificate; the take-off's measured quantities go to that certificate as this period's quantities
// (current = measured − previous); and a site supervisor's take-off never offers to send to a money document.
const TSV = (rows: string[][]) => rows.map((r) => r.join("\t")).join("\n");

test("BOQ import: a duplicate blocks the import; fixed, it fills the certificate; a CSV with Arabic digits reads the same", async ({ page }) => {
  test.setTimeout(120_000);
  const errs = watch(page);
  await demoAs(page, "engineer", {}, "#app/tooldoc/ipc:new");
  await page.locator("[data-boq-open]").click();
  const paste = page.getByLabel(/الصق الصفوف من Excel/);
  await paste.fill(TSV([
    ["رقم البند", "البيان", "الوحدة", "الكمية", "الفئة"],
    ["", "الباب الثاني: الخرسانة", "", "", ""],
    ["2.1", "خرسانة عادية للأساسات", "م³", "120", "1800"],
    ["2.2", "خرسانة مسلحة للأسقف", "م³", "420", "4500"],
    ["2.2", "بند مكرر", "م³", "10", "100"],
  ]));
  await expect(page.locator("[data-boq-errors]")).toHaveAttribute("data-boq-errors", "1");
  await expect(page.locator("[data-boq-issues]")).toContainText("مكرر");
  await expect(page.locator("[data-boq-replace]")).toBeDisabled();

  await paste.fill(TSV([
    ["رقم البند", "البيان", "الوحدة", "الكمية", "الفئة"],
    ["", "الباب الثاني: الخرسانة", "", "", ""],
    ["2.1", "خرسانة عادية للأساسات", "م³", "120", "1800"],
    ["2.2", "خرسانة مسلحة للأسقف", "م³", "420", "4500"],
  ]));
  await expect(page.locator("[data-boq-errors]")).toHaveAttribute("data-boq-errors", "0");
  await page.locator("[data-boq-replace]").click();
  await settle(page, 500);
  await expect(page.locator("[data-row]")).toHaveCount(2);
  await expect(page.locator("[data-row='1']")).toContainText("2.2");
  await noOverflow(page, "boq import");

  // the same BOQ as a CSV file, typed with Arabic digits and separators
  await page.locator("[data-boq-open]").click();
  await page.locator("[data-boq-file]").setInputFiles({
    name: "boq.csv", mimeType: "text/csv",
    buffer: Buffer.from('﻿رقم البند,البيان,الوحدة,الكمية,الفئة\n3.1,"مباني طوب, 25 سم",م³,٨٦٠,"١٬٢٥٠"\n', "utf8"),
  });
  await expect(page.locator("[data-boq-summary]")).toContainText("1");
  await page.locator("[data-boq-append]").click();
  await settle(page, 500);
  await expect(page.locator("[data-row]")).toHaveCount(3);
  await noCrash(page, errs, "boq");
});

test("take-off → certificate: measured 180 m³ on item 2.2, 120 already certified → 60 this period", async ({ page }) => {
  test.setTimeout(150_000);
  const errs = watch(page);
  await demoAs(page, "engineer", {}, "#app/tooldoc/ipc:new");
  await page.getByLabel("عنوان المستند").fill("مستخلص رقم 3");
  await page.locator("[data-boq-open]").click();
  await page.getByLabel(/الصق الصفوف من Excel/).fill(TSV([
    ["رقم البند", "البيان", "الوحدة", "الكمية", "الفئة"],
    ["2.2", "خرسانة مسلحة للأسقف", "م³", "420", "4500"],
  ]));
  await page.locator("[data-boq-replace]").click();
  await page.locator("[data-row='0']").first().getByLabel("الكمية السابقة").fill("120");
  await settle(page, 900);

  // a new query string makes the browser load the app again (a change of hash alone would not)
  await page.goto("/?backend=demo&n=2#app/tooldoc/qto:new");
  await page.locator("[data-tour=tabbar]").waitFor({ timeout: 20_000 });
  const line = page.locator("[data-row='0']").first();
  await line.getByRole("button", { name: "خرسانة", exact: true }).click();
  await line.getByLabel("البيان", { exact: true }).fill("سقف الدور الثالث");
  await line.locator("[data-qto-boq]").fill("2.2");
  await line.getByLabel("الطول").fill("10");
  await line.getByLabel("العرض").fill("6");
  await line.getByLabel("الارتفاع").first().fill("3");
  await settle(page, 600);
  const send = page.locator("[data-send-ipc]");
  await expect(send).toBeVisible();
  await send.getByRole("button", { name: /مستخلص رقم 3/ }).click();
  await expect(page.locator("[data-send-preview]")).toContainText("60");
  await page.locator("[data-send-go]").click();
  await expect(page.locator("[data-send-open]")).toBeVisible();
  await page.locator("[data-send-open]").click();
  await expect(page.locator("[data-row='0']").first().getByLabel("كمية الفترة")).toHaveValue("60");
  await noCrash(page, errs, "qto to ipc");
});

test("a site supervisor's take-off never offers to send to the certificate (a money document)", async ({ page }) => {
  const errs = watch(page);
  await demoAs(page, "supervisor", { disc: "civil" }, "#app/tooldoc/qto:new");
  await page.locator("[data-row='0']").first().locator("[data-qto-boq]").fill("2.2");
  await settle(page, 500);
  await expect(page.locator("[data-qto-boq]")).toBeVisible();
  await expect(page.getByText("أرسل للمستخلص")).toHaveCount(0);
  await noCrash(page, errs, "supervisor qto");
});

test("a new document keeps the field you are typing in when it takes its own id (no remount, no lost keyboard)", async ({ page }) => {
  const errs = watch(page);
  await demoAs(page, "engineer", {}, "#app/tooldoc/concrete:new");
  const title = page.getByLabel("عنوان المستند");
  await title.click();
  await title.pressSequentially("صب سقف", { delay: 20 });
  await expect(page).toHaveURL(/#app\/tooldoc\/concrete:d[a-z2-7]{20}$/);   // the first save gave it its id
  await page.keyboard.type(" الدور الأول");                                // still typing into the same field
  await expect(title).toBeFocused();
  await expect(title).toHaveValue(/صب سقف.* الدور الأول/);
  await noCrash(page, errs, "focus kept");
});
