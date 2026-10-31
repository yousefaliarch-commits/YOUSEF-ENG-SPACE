import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { strFromU8, unzipSync } from "fflate";
import { demoAs, noCrash, noOverflow, settle, tab, watch } from "./helpers";

// W4 in the demo: an RC beam reviewed under ACI 318-19 (utilisation, checks with clauses, the working, a reviewer's note when it
// fails, live Excel), the same beam under ECP 203 (every pass «ضمن الحد ⚑»), the supervisor gate, and the duct sizer's pins.
const formulas = (bytes: Buffer) => {
  const files = unzipSync(new Uint8Array(bytes));
  return Object.keys(files).filter((k) => k.startsWith("xl/worksheets/")).map((k) => strFromU8(files[k])).join("").match(/<f>[^<]+<\/f>/g) || [];
};
const download = async (page: any, sel: string) => {
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 60_000 }), page.locator(sel).click()]);
  return { name: dl.suggestedFilename() as string, bytes: readFileSync((await dl.path())!) };
};

test("RC section: a beam passes with its clauses shown, fails with a reviewer's note, exports live Excel; ECP is flagged", async ({ page }) => {
  test.setTimeout(150_000);
  const errs = watch(page);
  await demoAs(page, "engineer", {}, "#app/tooldoc/rcSection:new");
  const m = page.locator("[data-row='0']").first();
  await m.getByLabel("رمز العنصر").fill("B12");
  await m.getByLabel("العرض b").fill("300");
  await m.getByLabel("الارتفاع الكلي h").fill("600");
  await m.getByLabel("الغطاء للكانة").fill("40");
  await m.getByLabel("العدد", { exact: true }).fill("3");
  await m.getByLabel("القطر Ø").fill("25");
  await m.getByLabel("حديد ضغط — العدد").fill("0");
  await m.getByLabel("الكانة Ø").fill("10");
  await m.getByLabel("تباعد الكانات").fill("150");
  await m.getByLabel("العزم التصميمي Mu").fill("250");
  await m.getByLabel("القص التصميمي Vu").fill("200");
  await m.getByLabel("البحر").fill("6");
  await settle(page, 500);

  // φMn = 0.9 × 305.6 = 275.1 kN·m → 250 / 275.1 = 91 %
  await expect(page.locator("[data-rc-result]")).toHaveAttribute("data-rc-result", "ok");
  await expect(page.locator("[data-tool-result=hero]")).toContainText("91");
  await expect(page.locator("[data-rc-sketch]")).toBeVisible();
  await expect(m.locator("[data-check=ok]").first()).toBeVisible();
  await m.getByRole("button", { name: /طريقة الحساب/ }).click();
  await expect(m.getByText("ACI 318-19 Table 21.2.2")).toBeVisible();
  await noOverflow(page, "rc ok");

  // 400 kN·m: fails, and the note names the steel needed
  await m.getByLabel("العزم التصميمي Mu").fill("400");
  await settle(page, 500);
  await expect(page.locator("[data-rc-result]")).toHaveAttribute("data-rc-result", "fail");
  await expect(page.locator("[data-rc-advice]")).toContainText("Ø25");

  const x = await download(page, "[data-tool-xlsx]");
  expect(x.name).toMatch(/\.xlsx$/);
  expect(formulas(x.bytes).some((f) => /<f>[A-Z]+\d+\/[A-Z]+\d+\*100<\/f>/.test(f))).toBe(true);

  // ECP 203: transcribed constants — a pass never reads «مطابق»
  await m.getByLabel("العزم التصميمي Mu").fill("120");
  await page.getByRole("button", { name: "ECP 203-2020 ⚑" }).click();
  await settle(page, 500);
  await expect(page.getByText(/قيم ECP 203 في هذه الأداة منقولة/)).toBeVisible();
  await expect(m.locator("[data-check=ok]")).toHaveCount(0);
  await expect(m.locator("[data-check=flag]").first()).toBeVisible();
  await noCrash(page, errs, "rc");
});

test("RC section is a design review: a site supervisor never reaches it", async ({ page }) => {
  const errs = watch(page);
  await demoAs(page, "supervisor", { disc: "civil" });
  await tab(page, "tools");
  await expect(page.locator("[data-tool-tile=concrete]")).toBeVisible();
  await expect(page.locator("[data-tool-tile=rcSection]")).toHaveCount(0);
  await page.goto("/?backend=demo#app/tooldoc/rcSection:new");
  await settle(page, 1200);
  await expect(page.locator("[data-rc-result]")).toHaveCount(0);
  await expect(page.locator("[data-tool-export]")).toHaveCount(0);
  await noCrash(page, errs, "rc supervisor");
});

test("Duct sizer: 1,000 L/s at 1.0 Pa/m → Ø450 at 0.907 Pa/m, and the schedule's losses are live formulas", async ({ page }) => {
  test.setTimeout(120_000);
  const errs = watch(page);
  await demoAs(page, "supervisor", { disc: "mechanical" }, "#app/tooldoc/ductSizer:new");
  await page.getByLabel("معدل الاحتكاك التصميمي").fill("1.0");
  const run = page.locator("[data-row='0']").first();
  await run.getByLabel("الرمز").fill("SA-01");
  await run.getByLabel("التصرف").fill("1000");
  await run.getByLabel("الطول").fill("20");
  await run.getByLabel("فقد القطع والملحقات").fill("30");
  await run.getByRole("button", { name: "دائري" }).click();
  await settle(page, 500);
  const r = run.locator("[data-duct-result]");
  await expect(r).toContainText("D req 441.2");
  await expect(r).toContainText("Ø450");
  await expect(r).toContainText("0.907 Pa/m");
  // 0.907 × 20 + 30 = 48.1 Pa on the index path
  await expect(page.locator("[data-tool-result=hero]")).toContainText("48");
  await noOverflow(page, "duct");
  const x = await download(page, "[data-tool-xlsx]");
  const fs = formulas(x.bytes);
  expect(fs.some((f) => /<f>[A-Z]+\d+\*[A-Z]+\d+<\/f>/.test(f))).toBe(true);
  expect(fs.some((f) => /<f>[A-Z]+\d+\+[A-Z]+\d+<\/f>/.test(f))).toBe(true);
  await noCrash(page, errs, "duct");
});
