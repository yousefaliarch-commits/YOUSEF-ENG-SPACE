import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { strFromU8, unzipSync } from "fflate";
import { demoAs, noClipped, noCrash, noOverflow, settle, tab, watch } from "./helpers";

// The technical office suite in the demo: a quantity take-off line with openings under the IS 1200 rules, an interim payment
// certificate with its previous · current · total summary and the next certificate carried forward, live Excel copies of both,
// and the money gate (site supervisors take off quantities but never open a payment certificate).
const xlsxFormulas = (bytes: Buffer) => {
  const files = unzipSync(new Uint8Array(bytes));
  return Object.keys(files).filter((k) => k.startsWith("xl/worksheets/")).map((k) => strFromU8(files[k])).join("").match(/<f>[^<]+<\/f>/g) || [];
};
const download = async (page: any, sel: string) => {
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 60_000 }), page.locator(sel).click()]);
  return { name: dl.suggestedFilename() as string, bytes: readFileSync((await dl.path())!) };
};

test("QTO: plaster on both faces with a door — the rule applied is shown, and the workbook computes", async ({ page }) => {
  test.setTimeout(120_000);
  const errs = watch(page);
  await demoAs(page, "engineer", {}, "#app/tooldoc/qto:new");
  const line = page.locator("[data-row='0']").first();
  await line.getByLabel("البيان").first().fill("بياض حوائط الشقة 3");
  await line.getByLabel("الطول").fill("5");
  await line.getByLabel("الارتفاع").first().fill("3");
  await line.getByRole("button", { name: "الوجهان" }).click();
  await line.getByRole("button", { name: "فتحة" }).click();
  const op = line.locator("[data-row='0']");
  await op.getByLabel("الوصف").fill("باب D1");
  await op.getByLabel("العرض").fill("0.9");
  await op.getByLabel("الارتفاع").fill("2.1");
  await settle(page, 500);
  const working = page.locator("[data-qto-working]");
  await expect(working).toContainText("يُخصم من وجه واحد");
  await expect(working).toContainText("28.11");           // 30 − 1.89
  await expect(page.locator("[data-tool-result=hero]")).toContainText("28.11");
  await noOverflow(page, "qto");
  const x = await download(page, "[data-tool-xlsx]");
  expect(x.name).toMatch(/\.xlsx$/);
  const fs = xlsxFormulas(x.bytes);
  expect(fs.some((f) => /E\d+\*F\d+\*H\d+\*I\d+/.test(f))).toBe(true);   // the wall's gross
  expect(fs.some((f) => /MAX\(0,J\d+-K\d+\)/.test(f))).toBe(true);       // net = gross − deductions
  await noCrash(page, errs, "qto");
});

test("IPC: a certificate's summary, its live workbook, and the next certificate carried forward", async ({ page }) => {
  test.setTimeout(150_000);
  const errs = watch(page);
  await demoAs(page, "engineer", {}, "#app/tooldoc/ipc:new");
  await page.getByLabel("قيمة العقد (بدون ضريبة)").fill("10000000");
  const item = page.locator("[data-row='0']").first();
  await item.getByLabel("رقم البند").fill("2.1");
  await item.getByLabel("بيان الأعمال").fill("خرسانة مسلحة");
  await item.getByLabel("الفئة").fill("4500");
  await item.getByLabel("كمية العقد").fill("2000");
  await item.getByLabel("الكمية السابقة").fill("800");
  await item.getByLabel("كمية الفترة").fill("400");
  await settle(page, 500);
  // gross 1,800,000 − 5 % retention 90,000 + 14 % VAT 252,000 = 1,962,000 due this period
  await expect(page.locator("[data-tool-result=hero]")).toContainText("1,962,000.00");
  await expect(page.locator("[data-ipc-summary]")).toContainText("5,400,000");
  await noOverflow(page, "ipc");
  const x = await download(page, "[data-tool-xlsx]");
  const fs = xlsxFormulas(x.bytes);
  expect(fs.some((f) => /\$B\$\d+/.test(f))).toBe(true);                 // terms read from parameter cells
  expect(fs.some((f) => /^<f>E\d+-C\d+<\/f>$/.test(f))).toBe(true);       // current = total − previous
  await page.locator("[data-ipc-next]").click();
  await settle(page, 1200);
  await expect(page).toHaveURL(/#app\/tooldoc\/ipc:d[a-z2-7]{20}$/);
  await expect(page.getByLabel("رقم المستخلص")).toHaveValue("2");
  await expect(page.locator("[data-row='0']").first().getByLabel("الكمية السابقة")).toHaveValue("1200");
  await noCrash(page, errs, "ipc");
});

test("supervisor: the take-off opens, the payment certificate never — by tile or address", async ({ page }) => {
  await demoAs(page, "supervisor", { disc: "civil" });
  await tab(page, "tools");
  await expect(page.locator("[data-tool-tile=qto]")).toBeVisible();
  await expect(page.locator("[data-tool-tile=ipc]")).toHaveCount(0);
  await page.goto("/?backend=demo#app/tooldoc/ipc:new");
  await page.locator("[data-tour=tabbar]").waitFor({ state: "attached" });
  await settle(page, 800);
  await expect(page.getByLabel("قيمة العقد (بدون ضريبة)")).toHaveCount(0);
});

test("both technical office screens fit a 360 px phone", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 760 });
  for (const kind of ["qto", "ipc"]) {
    await demoAs(page, "engineer", {}, `#app/tooldoc/${kind}:new`);
    await page.locator("[data-tool-xlsx]").waitFor({ timeout: 20_000 });
    await noOverflow(page, `${kind} 360`);
    await noClipped(page, `${kind} 360`);
  }
});
