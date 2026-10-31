// W6: motion that comes from physics, not taste — the CSS spring tokens are the generator's output (so they can never drift),
// the curves behave like their names, every new animation stops under prefers-reduced-motion, and nothing animates layout.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { SPRINGS, settleTime, springAt, springCurve } from "../src/ui/motion";
import { isSegmented } from "../src/ui/kit";

const css = readFileSync(new URL("../src/styles/app.css", import.meta.url), "utf8");

describe("spring physics", () => {
  it("starts at rest, ends at rest", () => {
    for (const s of Object.values(SPRINGS)) {
      expect(springAt(s, 0)).toBeCloseTo(0, 9);
      expect(springAt(s, settleTime(s))).toBeCloseTo(1, 2);
    }
  });
  it("«snap» and «soft» barely overshoot (< 2 %), «pop» bounces (10–20 %)", () => {
    const peak = (s: any) => Math.max(...Array.from({ length: 600 }, (_, i) => springAt(s, (i / 600) * settleTime(s))));
    expect(peak(SPRINGS.snap)).toBeLessThan(1.02);
    expect(peak(SPRINGS.soft)).toBeLessThan(1.02);
    expect(peak(SPRINGS.pop)).toBeGreaterThan(1.1);
    expect(peak(SPRINGS.pop)).toBeLessThan(1.2);
  });
  it("a critically damped spring never overshoots", () => {
    const s = { stiffness: 100, damping: 20 };
    for (let t = 0; t < 1; t += 0.01) expect(springAt(s, t)).toBeLessThanOrEqual(1 + 1e-12);
  });
});

describe("the CSS tokens are the generator's output", () => {
  for (const [name, s] of Object.entries(SPRINGS)) {
    it(`--spring-${name} and --spring-${name}-d`, () => {
      const c = springCurve(s);
      expect(css).toContain(`--spring-${name}: ${c.easing};`);
      expect(css).toContain(`--spring-${name}-d: ${c.ms}ms;`);
    });
  }
  it("older WebViews get a cubic-bezier fallback before the @supports block", () => {
    const fallback = css.indexOf("--spring-snap: cubic-bezier(");
    const modern = css.indexOf("@supports (transition-timing-function: linear(0, 1))");
    expect(fallback).toBeGreaterThan(-1);
    expect(modern).toBeGreaterThan(fallback);
  });
});

describe("rules kept", () => {
  it("every new animation and transition is switched off under prefers-reduced-motion", () => {
    const block = css.slice(css.indexOf("Motion (W6"));
    const reduced = block.slice(block.indexOf("@media (prefers-reduced-motion: reduce)"));
    for (const cls of [".seg-ind", ".chev", ".ring-arc", ".unfold", ".tick path", ".ring-in"]) expect(reduced).toContain(cls);
  });
  it("the W6 animations move only transform and opacity (and a stroke, once) — never width, height or top", () => {
    const block = css.slice(css.indexOf("Motion (W6"), css.indexOf("typography: Arabic"));
    expect(block).not.toMatch(/transition:\s*(width|height|top|left|margin|padding)/);
    expect(block).not.toMatch(/@keyframes [\w-]+ \{[^}]*(width|height|top|margin)\s*:/);
  });
  it("Arabic is never letter-spaced; headings balance", () => {
    expect(css).toContain('[lang="ar"] :not(bdi)[class*="tracking-"] { letter-spacing: normal; }');
    expect(css).toContain("h1, h2, h3 { text-wrap: balance; }");
  });
});

describe("the segmented control", () => {
  it("a few short options become one control with a sliding pill; long or many options stay chips", () => {
    expect(isSegmented([["1", "طبقة واحدة"], ["2", "طبقتان"]])).toBe(true);
    expect(isSegmented([["docs", "المستندات"], ["log", "السجل"]])).toBe(true);
    expect(isSegmented([["a", "x"]])).toBe(false);
    expect(isSegmented([["a", "1"], ["b", "2"], ["c", "3"], ["d", "4"]])).toBe(false);
    expect(isSegmented([["galv", "صاج مجلفن (وصلات طولية)"], ["smooth", "PVC / ألومنيوم أملس"]])).toBe(false);
  });
});
