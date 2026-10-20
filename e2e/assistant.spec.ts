import { test, expect, type Page } from "@playwright/test";
import { demoAs, settle, tab, watch, noCrash, noOverflow, noClipped } from "./helpers";

// «المهندس الذكي» — the assistant tab, driven through the dev-only window.__engspaceAi fake (no network, no key): streaming
// rich text, tool chips by role, history on the phone, the 7-day cache, the allowance, errors with retry, and the tab bar
// still fitting with seven tabs.
const ANSWER = [
  "## الغطاء الخرساني",
  "أقل غطاء حسب **ECP 203**:",
  "",
  "| العنصر | الغطاء |",
  "|---|---|",
  "| القواعد | 50 مم |",
  "| الأعمدة | 25 مم |",
  "",
  "⚠️ القيم النهائية يعتمدها المصمم.",
  "",
  "تقدر تحسب الكميات من أداة حصر وصب الخرسانة، ولو عندك عرض شغل استخدم تقييم عرض عمل.",
].join("\n");

async function fakeAi(page: Page, opts: { answer?: string; fail?: string } = {}) {
  await page.addInitScript(([answer, fail]) => {
    const w = window as any;
    w.__aiReqs = [];
    let failOnce = fail;
    w.__engspaceAi = {
      delay: 4,
      remaining: 25,
      fake: (req: any) => {
        w.__aiReqs.push(req);
        if (failOnce) {
          const code = failOnce;
          failOnce = "";
          return { error: code, ar: "الخدمة مشغولة حالياً، حاول بعد دقيقة", en: "busy" };
        }
        return answer;
      },
    };
  }, [opts.answer || ANSWER, opts.fail || ""] as const);
}

test("engineer: a starter question streams a rich answer with tool chips; history and the cache survive a reload", async ({ page }, info) => {
  const errs = watch(page);
  await fakeAi(page);
  await demoAs(page, "engineer");
  await tab(page, "ai");
  const screen = page.locator("[data-ai-assistant]");
  await expect(screen).toBeVisible();
  await expect(screen.locator("[data-ai-starter]").first()).toBeVisible();
  await noOverflow(page, "assistant empty");

  await screen.locator("[data-ai-starter]").first().click();
  const answer = screen.locator("[data-ai-msg=model]").last();
  await expect(answer).toHaveAttribute("data-ai-state", "done");
  await expect(answer.locator("table")).toBeVisible();
  await expect(answer.locator(".md-warn")).toContainText("يعتمدها المصمم");
  await expect(answer.locator("strong")).toHaveText("ECP 203");
  // both tools are open to an engineer
  await expect(screen.locator("[data-ai-tool=concrete]")).toBeVisible();
  await expect(screen.locator("[data-ai-tool=offer]")).toBeVisible();
  await expect(screen.locator("[data-ai-remaining]")).toHaveAttribute("data-ai-remaining", "24");
  await noOverflow(page, "assistant answer");
  await expect(answer.locator("[aria-label=\"نسخ\"]")).toBeVisible();
  await page.screenshot({ path: info.outputPath("assistant-ar.png") });

  // the request carried the member's profile, never their name
  const req = await page.evaluate(() => (window as any).__aiReqs[0]);
  expect(req.feature).toBe("assistant");
  expect(req.context).toMatchObject({ discipline: "civil", track: "tech", uiLang: "ar" });
  expect(JSON.stringify(req)).not.toContain("أحمد سامي");

  // the conversation stays on the phone
  await page.reload();
  await page.locator("[data-tour=tabbar]").waitFor();
  await tab(page, "ai");
  await expect(page.locator("[data-ai-msg]")).toHaveCount(2);

  // a new chat, then the same first question again: answered from the cache, no request, no unit
  page.once("dialog", (d) => d.accept());
  await page.locator("[data-ai-clear]").click();
  await expect(page.locator("[data-ai-msg]")).toHaveCount(0);
  await page.locator("[data-ai-starter]").first().click();
  await expect(page.locator("[data-ai-cached]")).toBeVisible();
  expect(await page.evaluate(() => (window as any).__aiReqs.length)).toBe(0);

  // a chip opens the tool
  await page.locator("[data-ai-tool=concrete]").click();
  await settle(page, 900);
  await expect(page).toHaveURL(/#app\/tool\/concrete/);
  await noCrash(page, errs, "assistant");
});

test("typing a follow-up sends the conversation; a failure offers a retry that succeeds", async ({ page }) => {
  const errs = watch(page);
  await fakeAi(page, { fail: "busy", answer: "تمام — **50 مم** للقواعد." });
  await demoAs(page, "engineer");
  await tab(page, "ai");
  const input = page.locator("[data-ai-input]");
  await input.fill("الغطاء الخرساني للقواعد كام؟");
  await page.locator("[data-ai-send]").click();
  await expect(page.locator("[data-ai-error=busy]")).toBeVisible();
  await page.locator("[data-ai-retry]").click();
  await expect(page.locator("[data-ai-msg=model]").last()).toHaveAttribute("data-ai-state", "done");
  await input.fill("وللأعمدة؟");
  await page.locator("[data-ai-send]").click();
  await expect(page.locator("[data-ai-msg=model]")).toHaveCount(2);
  await expect(page.locator("[data-ai-msg=model]").last()).toHaveAttribute("data-ai-state", "done");
  const last = await page.evaluate(() => (window as any).__aiReqs.at(-1));
  expect(last.messages.map((m: any) => m.role)).toEqual(["user", "model", "user"]);
  await noCrash(page, errs, "assistant retry");
});

test("site supervisor: the assistant is a tab, pay is off, and no money tool is ever offered", async ({ page }) => {
  const errs = watch(page);
  await fakeAi(page);
  await demoAs(page, "supervisor");
  await expect(page.locator("[data-tour=tab-ai]")).toBeVisible();
  await expect(page.locator("[data-tour=tab-market]")).toHaveCount(0);
  await tab(page, "ai");
  await page.locator("[data-ai-starter]").first().click();
  await expect(page.locator("[data-ai-msg=model]").last()).toHaveAttribute("data-ai-state", "done");
  await expect(page.locator("[data-ai-tool=concrete]")).toBeVisible();
  await expect(page.locator("[data-ai-tool=offer]")).toHaveCount(0);
  const req = await page.evaluate(() => (window as any).__aiReqs[0]);
  expect(req.context.noMoney).toBe(true);
  expect(req.context.tools.join()).not.toMatch(/تقييم عرض عمل|الصافي/);
  await noCrash(page, errs, "assistant supervisor");
});

test("without a backend or the fake, the tab explains where the assistant works", async ({ page }) => {
  await demoAs(page, "engineer");
  await tab(page, "ai");
  await expect(page.locator("[data-ai-demo]")).toBeVisible();
  await expect(page.locator("[data-ai-input]")).toHaveCount(0);
});

test("seven tabs still fit a 360 px phone in Arabic and English", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 760 });
  await demoAs(page, "engineer");
  await noOverflow(page, "tabbar 360 ar");
  await noClipped(page, "tabbar 360 ar");
  await expect(page.locator("[data-tour=tabbar] li")).toHaveCount(7);
  await page.goto("/?backend=demo&lang=en#app/ai");
  await page.locator("[data-tour=tabbar]").waitFor();
  await settle(page, 600);
  await noOverflow(page, "tabbar 360 en");
  await noClipped(page, "tabbar 360 en");
});
