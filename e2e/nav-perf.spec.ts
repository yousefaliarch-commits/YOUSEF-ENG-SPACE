import { test, expect } from "@playwright/test";
import { demoAs, tab, settle } from "./helpers";

// Back navigation cost, measured on a CPU slowed like a mid-range Android phone: the longest main-thread task between tapping «back»
// and the screen in place. Skipped unless E2E_PERF=1 (timings on shared CI runners are too noisy to gate on); run locally to compare.
test.skip(process.env.E2E_PERF !== "1", "set E2E_PERF=1");
test.use({ trace: "off", screenshot: "off" });   // the trace recorder snapshots the DOM on every action and would dominate the measurement
test("pop from a post / a job / a company back to the list", async ({ page, context }) => {
  test.setTimeout(180_000); if (process.env.E2E_NOVT) await page.emulateMedia({ reducedMotion: "reduce" }); await demoAs(page, "engineer"); const cdp = await context.newCDPSession(page);
  const results: Record<string, number[]> = {};
  const measureBack = async () => page.evaluate(async () => {
    let long = 0; const po = new PerformanceObserver((l) => l.getEntries().forEach((e) => { long = Math.max(long, e.duration); })); po.observe({ type: "longtask", buffered: false } as any);
    const btn = [...document.querySelectorAll("button")].find((b) => (b.getAttribute("aria-label") || b.getAttribute("title") || "").trim() === "رجوع") as HTMLButtonElement; if (!btn) return { long: -1, t: 0 }; const t0 = performance.now(); btn.click();
    await new Promise((r) => setTimeout(r, 700)); po.disconnect(); return { long: Math.round(long), t: Math.round(performance.now() - t0) };
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  for (const [t, sel] of [["community", "article button"], ["jobs", "article button, [class*=snap-start] button"], ["home", "article button"]] as const) {
    results[t] = [];
    for (let i = 0; i < 4; i++) {
      await tab(page, t); await settle(page, 600); const items = page.locator(`main ${sel}`).locator("visible=true"); if (!(await items.count())) break;
      await items.nth(i % Math.max(1, await items.count())).evaluate((b: HTMLElement) => b.click()); await settle(page, 900);
      const r = await measureBack(); if (r.long >= 0) results[t].push(r.long); await settle(page, 400);
    }
  }
  console.log("longest task on back (ms, 4x CPU):", JSON.stringify(results));
  expect(Object.values(results).flat().length).toBeGreaterThan(0);
});
