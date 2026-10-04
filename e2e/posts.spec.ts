import { test, expect, type Page } from "@playwright/test";
import { demoAs, tab, watch, noCrash, noOverflow, settle, signIn, publish, newMember, CRASH, DOMAIN } from "./helpers";

// Post flow end to end: publish → feed → author controls (edit with a visible, server-counted «معدّل» badge; delete after a confirmation).
const card = (page: Page, text: string) => page.locator("article").filter({ hasText: text }).locator("visible=true");
const badge = (c: ReturnType<typeof card>) => c.locator("[data-edited]");
const edit = async (page: Page, current: string, next: string) => {
  const c = card(page, current); await c.getByRole("button", { name: /^تعديل$/ }).click(); const g = page.getByRole("group", { name: "تعديل المنشور" });
  await g.locator("textarea").fill(next); await g.getByRole("button", { name: /حفظ التعديل/ }).click(); await settle(page, 1200);
};

async function authorFlow(page: Page, errs: string[], body: string, live: boolean) {
  await publish(page, body);
  await expect(card(page, body), "the new post shows once").toHaveCount(1);
  await expect(card(page, body).locator("[data-author-controls]"), "the author gets edit / delete").toHaveCount(1);
  await expect(badge(card(page, body)), "not edited yet").toHaveCount(0);
  if (live) { await page.reload(); await page.locator("[data-tour=tabbar]").waitFor(); await tab(page, "community"); await expect(card(page, body), "still once after a reload").toHaveCount(1); await expect(card(page, body).locator("[data-author-controls]"), "ownership survives a reload").toHaveCount(1); }
  // edit ×3: the badge counts, the text changes in place
  let cur = body;
  for (const [n, label] of [[1, /معدّل · مرة$/], [2, /معدّل · مرتان$/], [3, /معدّل · 3 مرات$/]] as const) {
    const next = `${body} — تعديل ${n}`; await edit(page, cur, next); cur = next;
    await expect(card(page, cur)).toHaveCount(1); await expect(badge(card(page, cur))).toHaveText(label); await expect(badge(card(page, cur))).toHaveAttribute("data-edited", String(n));
  }
  // saving the same text, or cancelling, is not an edit
  await card(page, cur).getByRole("button", { name: /^تعديل$/ }).click(); const g = page.getByRole("group", { name: "تعديل المنشور" });
  await g.getByRole("button", { name: /حفظ التعديل/ }).click(); await settle(page, 600); await expect(badge(card(page, cur))).toHaveAttribute("data-edited", "3");
  await card(page, cur).getByRole("button", { name: /^تعديل$/ }).click(); await page.getByRole("group", { name: "تعديل المنشور" }).locator("textarea").fill("نص لن يُحفظ"); await page.getByRole("button", { name: /^إلغاء$/ }).last().click();
  await expect(card(page, cur)).toHaveCount(1);
  if (live) { await page.reload(); await page.locator("[data-tour=tabbar]").waitFor(); await tab(page, "community"); await expect(badge(card(page, cur)), "the server's count survives a reload").toHaveAttribute("data-edited", "3"); }
  // delete: asks first; cancel keeps it; confirm removes it
  await card(page, cur).getByRole("button", { name: /^حذف$/ }).click(); await expect(page.getByRole("alertdialog", { name: "تأكيد حذف المنشور" })).toBeVisible();
  await page.getByRole("alertdialog").getByRole("button", { name: /^إلغاء$/ }).click(); await expect(card(page, cur)).toHaveCount(1);
  await card(page, cur).getByRole("button", { name: /^حذف$/ }).click(); await page.getByRole("alertdialog").getByRole("button", { name: /احذف نهائيًا/ }).click(); await settle(page, 1500);
  await expect(card(page, cur), "deleted").toHaveCount(0);
  if (live) { await page.reload(); await page.locator("[data-tour=tabbar]").waitFor(); await tab(page, "community"); await expect(card(page, body), "still gone after a reload").toHaveCount(0); }
  await noCrash(page, errs, "author flow"); await noOverflow(page, "author flow");
}

test("demo: publish, edit three times, delete — and other members' posts have no controls", async ({ page }) => {
  const errs = watch(page); await demoAs(page, "engineer"); await tab(page, "community");
  await expect(page.locator("[data-author-controls]:visible"), "seeded posts of others carry no controls").toHaveCount(0);
  await authorFlow(page, errs, `منشور اختبار ${Date.now()} عن 3 طوابق`, false);
});

test("demo: the post's own screen offers the same controls, and deleting leaves it", async ({ page }) => {
  const errs = watch(page); await demoAs(page, "engineer"); const body = `منشور داخل الشاشة ${Date.now()}`; await publish(page, body);
  await card(page, body).getByRole("button").filter({ hasText: body }).first().click(); await settle(page, 900);
  // the feed stays in place under the post's screen layer; the controls that count are the ones on the screen itself
  const onScreen = page.locator("[data-screen-layer] [data-author-controls]");
  await expect(onScreen).toHaveCount(1);
  await onScreen.getByRole("button", { name: /^حذف$/ }).click(); await page.getByRole("alertdialog").getByRole("button", { name: /احذف نهائيًا/ }).click(); await settle(page, 1200);
  await expect(page.locator("[data-tour=tabbar]")).toBeVisible(); await expect(visible(page, body)).toHaveCount(0); await noCrash(page, errs, "post screen delete");
});
const visible = (page: Page, t: string) => page.getByText(t).locator("visible=true");

// ---- the seeded accounts, against the real backend ----
test.describe("live", () => {
  test.skip(process.env.E2E_LIVE !== "1", "set E2E_LIVE=1 with a seeded backend");
  for (const key of ["civil", "architect", "mep", "electrical", "supervisor", "hr", "owner"]) {
    test(`${key}: publishes, edits (counted), deletes`, async ({ page }) => {
      test.setTimeout(150_000); const errs = watch(page); await signIn(page, key);
      await authorFlow(page, errs, `اختبار ${key} ${Date.now()}`, true);
    });
  }

  test("a civil engineer's post across roles: visible to all, controls only for the author, edits and deletes arrive live, no leaks, money masked by role", async ({ page, browser }) => {
    test.setTimeout(240_000); const errs = watch(page); const tag = `${Date.now()}`; const body = `قبلت عرضًا براتب 17500 جنيه صافي ${tag}`;
    await signIn(page, "civil"); await publish(page, body); await expect(card(page, tag)).toHaveCount(1);
    const others: Record<string, Page> = {}; for (const k of ["architect", "supervisor", "hr", "owner"]) others[k] = await newMember(page, k);
    try {
      for (const [k, p] of Object.entries(others)) {
        await tab(p, "community"); await settle(p, 1500);
        await expect(card(p, tag), `${k} sees the post once`).toHaveCount(1);
        await expect(card(p, tag).locator("[data-author-controls]"), `${k} has no edit/delete on someone else's post`).toHaveCount(0);
        const t = await card(p, tag).innerText();
        if (k === "architect") expect(t, "engineers see the figure").toContain("17500"); else expect(t, `${k} never sees an individual figure`).not.toContain("17500");
        const all = await p.locator("body").innerText();
        expect(all, `${k}: no account email leaks`).not.toContain(`test.civil@${DOMAIN}`); expect(all, `${k}: the anonymous author's name does not leak`).not.toContain("مهندس مدني — حساب تجريبي");
      }
      // the author edits: everyone watching sees «معدّل» without a reload
      await edit(page, tag, `${body} (بعد التعديل)`);
      for (const [k, p] of Object.entries(others)) await expect(badge(card(p, tag)), `${k} sees the edit live`).toHaveAttribute("data-edited", "1", { timeout: 15_000 });
      // the author deletes it: it leaves everyone's feed
      await card(page, tag).getByRole("button", { name: /^حذف$/ }).click(); await page.getByRole("alertdialog").getByRole("button", { name: /احذف نهائيًا/ }).click(); await settle(page, 1500);
      for (const [k, p] of Object.entries(others)) await expect(card(p, tag), `${k}: gone live`).toHaveCount(0, { timeout: 15_000 });
      for (const [k, p] of Object.entries(others)) { const t = await p.locator("body").innerText(); expect(t.includes(CRASH), `${k} crash`).toBe(false); }
      await noCrash(page, errs, "cross-role");
    } finally { for (const p of Object.values(others)) await p.context().close(); }
  });
});
