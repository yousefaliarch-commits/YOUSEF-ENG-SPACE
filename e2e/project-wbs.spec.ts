import { test, expect } from "@playwright/test";
import { demoAs, noCrash, noOverflow, settle, tab, watch } from "./helpers";

// W3 in the demo: documents filed by zone / building · level · element, listed with their place, narrowed by a zone chip,
// found by the words a site engineer types (hamza and taa marbuta typed loosely), and found again from the Tools tab.
const file = async (page: any, title: string, zone: string, level: string, element: string) => {
  await page.locator("[data-tool-new]").click();
  await page.locator("[data-wbs=zone]").waitFor({ timeout: 20_000 });
  await page.getByLabel("عنوان المستند").fill(title);
  await page.locator("[data-wbs=zone]").fill(zone);
  await page.locator("[data-wbs=level]").fill(level);
  await page.locator("[data-wbs=element]").fill(element);
  await settle(page, 900);                                  // the 400 ms autosave, then the new document's own address
  await expect(page).toHaveURL(/#app\/tooldoc\/concrete:d[a-z2-7]{20}$/);
  await page.getByRole("button", { name: "رجوع" }).first().click();
  await page.locator("[data-tool-new]").waitFor({ timeout: 20_000 });
  await settle(page, 500);
};

test("WBS: documents filed by building · level · element — listed with their place, chips, search, and from the Tools tab", async ({ page }) => {
  test.setTimeout(180_000);
  const errs = watch(page);
  await demoAs(page, "engineer", {}, "#app/tool/concrete");
  await file(page, "صب سقف الدور الثاني", "برج A", "الدور 02", "بلاطة S-04");
  await file(page, "أعمدة الدور الأرضي", "برج A", "الأرضي", "أعمدة C1–C12");
  await file(page, "خزان المياه العلوي", "المبنى الإداري", "السطح", "خزان");
  await file(page, "قواعد المبنى الإداري", "المبنى الإداري", "الأساسات", "قواعد F1–F8");

  // every saved document shows where it belongs
  const wbs = page.locator("[data-doc-wbs]");
  await expect(wbs).toHaveCount(4);
  await expect(wbs.filter({ hasText: "برج A · الدور 02 · بلاطة S-04" })).toHaveCount(1);

  // a zone chip narrows the list; tapping it again shows everything
  await page.locator('[data-zone="المبنى الإداري"]').click();
  await expect(wbs).toHaveCount(2);
  await expect(page.locator("[data-doc-wbs]", { hasText: "برج A" })).toHaveCount(0);
  await page.locator('[data-zone="المبنى الإداري"]').click();
  await expect(wbs).toHaveCount(4);

  // the words typed match title and place in any order, Arabic typed loosely (ارضي ← الأرضي)
  const q = page.locator("[data-doc-search]");
  await q.fill("ارضي برج");
  await expect(wbs).toHaveCount(1);
  await expect(wbs.first()).toContainText("الأرضي");
  await q.fill("برج Z");
  await expect(page.getByText("لا مستند يطابق البحث.")).toBeVisible();
  await q.fill("");
  await noOverflow(page, "wbs list");

  // the place is suggested the next time (the zones already used), and it prints in the title block's location
  await page.locator("[data-doc-wbs]", { hasText: "بلاطة S-04" }).click();
  await expect(page.locator("[data-wbs=element]")).toHaveValue("بلاطة S-04");
  const zones = await page.locator("datalist[id$='-z'] option").evaluateAll((os) => os.map((o: any) => o.value));
  expect(zones).toEqual(expect.arrayContaining(["برج A", "المبنى الإداري"]));
  await page.getByRole("button", { name: "رجوع" }).first().click();
  await page.locator("[data-tool-new]").waitFor({ timeout: 20_000 });

  // the Tools tab search finds saved documents by their place, too
  await page.getByRole("button", { name: "رجوع" }).first().click();
  await tab(page, "tools");
  const search = page.getByPlaceholder(/ابحث في الأدوات والمستندات/);
  await search.fill("خزان");
  const hits = page.locator("[data-doc-hits] [data-doc-hit]");
  await expect(hits).toHaveCount(1);
  await expect(hits.first()).toContainText("المبنى الإداري · السطح · خزان");
  await hits.first().click();
  await expect(page.locator("[data-wbs=zone]")).toHaveValue("المبنى الإداري");
  await noCrash(page, errs, "wbs");
});
