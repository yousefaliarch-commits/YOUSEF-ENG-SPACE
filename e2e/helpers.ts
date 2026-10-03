import { expect, type Page } from "@playwright/test";

export const CRASH = "حدث خطأ غير متوقع";
export const PW = process.env.E2E_PASSWORD || "EngSpace-Local-Test-2026";
export const ADMIN_PW = process.env.E2E_ADMIN_PASSWORD || "EngSpace-Local-Admin-2026";
export const DOMAIN = "engspace.test";

// Everything the member sees is checked the same way: no error boundary, no uncaught exception, nothing wider than the screen.
export function watch(page: Page) {
  const errs: string[] = [];
  page.on("pageerror", (e) => errs.push(String(e.stack || e).slice(0, 300)));
  return errs;
}
export async function settle(page: Page, ms = 700) { await page.waitForTimeout(ms); }
export async function noCrash(page: Page, errs: string[], where = "") {
  const t = await page.locator("body").innerText();
  expect(t.includes(CRASH), `error boundary shown ${where}`).toBe(false);
  expect(errs, `uncaught errors ${where}`).toEqual([]);
}
export async function noOverflow(page: Page, where = "") {
  const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, bw: document.body.scrollWidth }));
  expect(o.sw, `page wider than screen ${where} (${o.sw} > ${o.cw})`).toBeLessThanOrEqual(o.cw + 1);
}

// Demo member of a given role (no backend): the persona the app keeps in localStorage
export async function demoAs(page: Page, role: "engineer" | "supervisor" | "hr" | "owner" | "student" = "engineer", extra: Record<string, any> = {}, hash = "#app/home") {
  await page.addInitScript(([r, x]) => {
    localStorage.setItem("engspace.lang", "ar"); localStorage.setItem("engspace.tour", "done"); localStorage.setItem("engspace.push.v1", JSON.stringify({ n: 2, at: Date.now() }));
    const base = { name: "أحمد سامي", email: "demo@example.com", gender: "male", age: 29, gradYear: 2020, anon: "4f2c", pid: "u-demo", role: r, disc: "civil", track: "tech", pos: "mid", gov: "cairo", city: "newcairo", companyName: r === "hr" || r === "owner" ? "شركة تجريبية" : "" };
    localStorage.setItem("engspace.persona.v6", JSON.stringify({ ...base, ...x }));
    // a signed-in demo member: the app only reads the stored persona when a local account and session exist
    localStorage.setItem("engspace.account.v1", JSON.stringify({ email: "demo@example.com", hash: "x", salt: "x" })); localStorage.setItem("engspace.session.v1", "1");
  }, [role, extra] as const);
  await page.goto(`/?backend=demo${hash}`);
  await page.locator("[data-tour=tabbar]").waitFor({ timeout: 20_000 });
}

export async function tab(page: Page, id: string) { await page.locator(`[data-tour=tab-${id}]`).click(); await settle(page, 900); }

// Live backend: sign in as a seeded account
export async function signIn(page: Page, key: string, admin = false) {
  await page.addInitScript(() => { localStorage.setItem("engspace.lang", "ar"); localStorage.setItem("engspace.tour", "done"); localStorage.setItem("engspace.push.v1", JSON.stringify({ n: 2, at: Date.now() })); });
  await page.goto("/#app"); await settle(page, 1800);
  const lang = page.getByText("واجهة من اليمين إلى اليسار"); if (await lang.count()) { await lang.click(); await page.getByRole("button", { name: /متابعة/ }).first().click(); await settle(page, 700); }
  if (await page.locator("#si-email").count() === 0) { const s = page.getByRole("button", { name: /تسجيل الدخول|لديك حساب|دخول/ }).first(); if (await s.count()) await s.click(); await settle(page, 700); }
  await page.fill("#si-email", `test.${key}@${DOMAIN}`); await page.fill("#si-pw", admin ? ADMIN_PW : PW);
  await page.getByRole("button", { name: /دخول/ }).last().click();
  await page.locator("[data-tour=tabbar]").waitFor({ timeout: 30_000 });
  const skip = page.getByRole("button", { name: /تخطي الجولة/ }); if (await skip.count()) await skip.click();
  await settle(page, 600);
}

// ---- posts ----
export const visibleText = (page: Page, text: string) => page.getByText(text, { exact: false }).locator("visible=true");
// the dashed «ask / share» card on the community tab (its wording differs by role, its shape does not)
export const composer = (page: Page) => page.locator("button.border-dashed").filter({ hasText: /اسأل/ }).first();
export async function publish(page: Page, body: string) {
  await tab(page, "community"); await composer(page).click(); await settle(page, 700);
  const d = page.getByRole("dialog"); await d.locator("textarea").first().fill(body); await d.getByRole("button", { name: /^نشر/ }).last().click(); await settle(page, 2200);
}
// a second member in the same browser (own context, same phone profile)
export async function newMember(page: Page, key: string, admin = false) {
  const b = page.context().browser()!; const u: any = (test_info_use());
  const ctx = await b.newContext({ viewport: u.viewport, userAgent: u.userAgent, deviceScaleFactor: u.deviceScaleFactor, isMobile: u.isMobile, hasTouch: u.hasTouch, locale: "ar-EG" });
  const p = await ctx.newPage(); await signIn(p, key, admin); return p;
}
import { test } from "@playwright/test";
const test_info_use = () => test.info().project.use;

// Nothing may stick out past the screen edge — also where a parent clips it (that hides the problem from scrollWidth): a long e-mail
// that stretched a grid column was cut off on the left of the member directory. Elements inside a scrolling strip are fine.
export async function noClipped(page: Page, where = "") {
  const bad = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth; const out: string[] = [];
    const scrolls = (e: Element | null) => { for (; e && e !== document.body; e = e.parentElement) { const o = getComputedStyle(e).overflowX; if (o === "auto" || o === "scroll") return true; } return false; };
    for (const e of Array.from(document.querySelectorAll("main *, [data-tour=tabbar] *"))) {
      const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue; const cs = getComputedStyle(e); if (cs.visibility === "hidden" || cs.display === "none" || cs.position === "fixed") continue;
      if ((r.left < -1 || r.right > vw + 1) && !scrolls(e) && !e.closest("[inert]")) out.push(`${e.tagName}.${String(e.className).slice(0, 40)} ${Math.round(r.left)}..${Math.round(r.right)} of ${vw}`);
      if (out.length > 4) break;
    }
    return out;
  });
  expect(bad, `content outside the screen ${where}`).toEqual([]);
}
