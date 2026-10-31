import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { strFromU8, unzipSync } from "fflate";
import { demoAs, noClipped, noCrash, noOverflow, settle, watch } from "./helpers";

// The export triad from a real tool screen: the A4 PDF, the editable Word copy and the live Excel workbook all download from
// the concrete tool, the workbook carries real formulas and no app name, and the five-button bar fits a 360 px phone.
test("concrete: PDF, Word and Excel download; the workbook has live formulas and is white-label", async ({ page }) => {
  test.setTimeout(180_000);
  const errs = watch(page);
  await demoAs(page, "engineer", {}, "#app/tool/concrete");
  await page.locator("[data-tool-new]").click();
  await settle(page, 900);
  const inputs = page.locator("[data-row='0']").locator('input[inputmode="decimal"]');
  await inputs.nth(1).fill("20");
  await inputs.nth(2).fill("12");
  await settle(page, 600);
  await expect(page.locator("[data-tool-result=hero]")).toContainText("37.2");

  const grab = async (sel: string) => {
    const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 60_000 }), page.locator(sel).click()]);
    return { name: dl.suggestedFilename(), bytes: readFileSync((await dl.path())!) };
  };
  const pdf = await grab("[data-tool-export]");
  expect(pdf.name).toMatch(/\.pdf$/);
  expect(pdf.bytes.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  // no app credit printed in the document text layer or metadata
  expect(pdf.bytes.toString("latin1")).not.toMatch(/EngSpace/);

  const docx = await grab("[data-tool-docx]");
  expect(docx.name).toMatch(/\.docx$/);
  expect(Object.keys(unzipSync(new Uint8Array(docx.bytes)))).toContain("word/document.xml");

  const xlsx = await grab("[data-tool-xlsx]");
  expect(xlsx.name).toMatch(/\.xlsx$/);
  const files = unzipSync(new Uint8Array(xlsx.bytes));
  expect(Object.keys(files)).toContain("xl/workbook.xml");
  const sheetsXml = Object.keys(files).filter((k) => k.startsWith("xl/worksheets/")).map((k) => strFromU8(files[k])).join("");
  expect(sheetsXml).toMatch(/<f>SUM\([A-Z]+\d+:[A-Z]+\d+\)<\/f>/);   // the take-off totals are live sums
  expect(sheetsXml).toContain(`state="frozen"`);
  for (const [k, v] of Object.entries(files)) expect(strFromU8(v), k).not.toMatch(/EngSpace/i);
  await noCrash(page, errs, "export triad");
});

test("the five export controls fit a 360 px phone", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 760 });
  await demoAs(page, "engineer", {}, "#app/tooldoc/concrete:new");
  await page.locator("[data-tool-xlsx]").waitFor({ timeout: 20_000 });
  for (const sel of ["[data-tool-preview]", "[data-tool-export]", "[data-tool-docx]", "[data-tool-xlsx]"]) {
    const box = (await page.locator(sel).boundingBox())!;
    expect(box.width, sel).toBeGreaterThanOrEqual(44);
    expect(box.height, sel).toBeGreaterThanOrEqual(44);
    expect(box.x, sel).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, sel).toBeLessThanOrEqual(360);
  }
  await noOverflow(page, "export bar 360");
  await noClipped(page, "export bar 360");
});
