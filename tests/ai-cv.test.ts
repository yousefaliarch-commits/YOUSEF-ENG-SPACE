// CV review v26: the AI panel — redaction before sending, validation of what comes back (a real Gemini answer for the Arabic
// sample, tests/fixtures/cv-ai-ar-sample.json), the number guard on the rebuilt CV, and the overlay the screen renders.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CV_SAMPLE_AR, CV_SAMPLE_EN, auditCV } from "../src/features/cv/audit";
import { allowedNumbers, factsOf, guardNumbers, overlay, sanitize } from "../src/features/cv/ai-review";
import { leaks, redactCV, restore } from "../src/services/ai-redact";
import { actionPlan } from "../src/features/cv/PanelViews";
import { draftText, slotsOf } from "../src/features/cv/rebuild";

const RAW = JSON.parse(readFileSync(new URL("./fixtures/cv-ai-ar-sample.json", import.meta.url), "utf8"));

describe("what leaves the phone", () => {
  it("name, e-mail, phone, LinkedIn, address and national ID are tokens; the rest of the CV stays", () => {
    const cv = `Ahmed Hassan\nSite Engineer\n+20 100 123 4567 · ahmed.hassan@gmail.com · linkedin.com/in/ahmed-h · Cairo\nAddress: 12 Tahrir St, Dokki\nNational ID: 29601011234567\nWork Experience\nSite Engineer — Hassan Allam · 2020 – Present`;
    const red = redactCV(cv, "Ahmed Hassan");
    expect(red.text).not.toMatch(/Ahmed Hassan|gmail|123 4567|ahmed-h|Tahrir|29601011234567/);
    expect(red.text).toMatch(/\{\{NAME\}\}[\s\S]*\{\{PHONE\}\}[\s\S]*\{\{EMAIL\}\}[\s\S]*\{\{LINKEDIN\}\}[\s\S]*\{\{ADDRESS\}\}[\s\S]*\{\{NATIONAL_ID\}\}/);
    expect(red.text).toMatch(/Hassan Allam · 2020 – Present/);
    expect(red.hadNationalId).toBe(true);
    expect(leaks(red.text, red.values)).toEqual([]);
    expect(restore("{{NAME}} · {{PHONE}} · {{NATIONAL_ID}}", red.values)).toBe("Ahmed Hassan · +20 100 123 4567");
  });
  it("the Arabic sample leaves without its name, phone, e-mail or LinkedIn", () => {
    const r = auditCV(CV_SAMPLE_AR);
    const red = redactCV(r.cv.text, r.cv.name);
    expect(red.text).not.toMatch(/أحمد محمود عبد الرحمن|01001234567|ahmed\.m\.abdelrahman|linkedin\.com/);
    expect(red.text).toMatch(/شركة ريدكون للإنشاءات/);
    const f = factsOf(r, "ar");
    expect(JSON.stringify(f)).not.toMatch(/01001234567|gmail|أحمد/);
    expect(f.discipline).toBe("civil");
  });
});

describe("the number guard on the rebuilt CV", () => {
  it("a figure the CV never states becomes a slot; the CV's own figures, dates and years stay", () => {
    const allowed = allowedNumbers("IPCs for 4 subcontractors worth EGP 40 million · 32,000 m² tower · 03/2022 – Present · Jul 2023", 6);
    expect(guardNumbers("processed IPCs exceeding EGP 120M for 4 subcontractors", allowed, false)).toEqual({ text: "processed IPCs exceeding EGP [ADD: figure]M for 4 subcontractors", caught: 1 });
    expect(guardNumbers("a 32,000 m² tower · 03/2022 – Present · 07/2023 · 6+ years", allowed, false).caught).toBe(0);
    expect(guardNumbers("نسبة [أضف: النسبة]% و 99 لوحة", allowed, true)).toEqual({ text: "نسبة [أضف: النسبة]% و [أضف: الرقم] لوحة", caught: 1 });
  });
});

describe("a real Gemini answer, validated and laid over the audit", () => {
  const r = auditCV(CV_SAMPLE_AR);
  const red = redactCV(r.cv.text, r.cv.name);
  const ai = sanitize(RAW, r, red);
  it("pillars are clamped to their maxima and add up to the overall score", () => {
    ai.pillars.forEach((p) => expect(p.pts).toBeLessThanOrEqual(r.pillars.find((x: any) => x.id === p.id).max));
    expect(ai.overall).toBe(Math.round(ai.pillars.reduce((a, p) => a + p.pts, 0)));
    expect(ai.projected).toBeGreaterThanOrEqual(ai.overall);
    expect(ai.reviewers.map((v) => v.id)).toEqual(["screen", "manager", "recruiter", "teammate"]);
  });
  it("garbage is clamped, never trusted", () => {
    const bad = sanitize({ pillars: [{ id: "software", pts: 999 }, { id: "x", pts: 50 }], projectedScore: 900, reviewers: [{ id: "screen", verdict: "lol", score: -4, findings: [{ issue: "x", severity: "boom" }] }], rebuilt: null }, r, red);
    expect(bad.pillars.find((p) => p.id === "software")!.pts).toBe(22);
    expect(bad.overall).toBe(22);
    expect(bad.projected).toBe(100);
    expect(bad.reviewers[0]).toMatchObject({ verdict: "maybe", score: 0 });
    expect(bad.reviewers[0].findings[0].severity).toBe("rec");
    expect(bad.drafts).toEqual({ en: null, ar: null });
  });
  it("the rebuilt CVs invent no figure (the real answer invented «EGP 120M» — it is caught)", () => {
    const orig = allowedNumbers(r.cv.text, r.years);
    for (const d of [ai.drafts.en!, ai.drafts.ar!]) {
      expect(d).toBeTruthy();
      const nums = (draftText(d).replace(/\[[^\]]*\]/g, " ").match(/\d[\d,٬.]*/g) || []).map((n) => n.replace(/[,٬]/g, "").replace(/[.]$/, "").replace(/^0+(?=\d)/, ""));
      expect(nums.filter((n) => !orig.has(n))).toEqual([]);
      // name and contact come from the device, never from the model
      expect(d.contact).toMatch(/01001234567/);
    }
    expect(ai.guarded).toBeGreaterThan(0);
  });
  it("the overlay feeds every card: score, panel, action plan, questions (topped up to 4), projection, drafts", () => {
    const o = overlay(r, ai);
    expect(o.ai).toBe(true);
    expect(o.overall).toBe(ai.overall);
    expect(o.panel).toHaveLength(4);
    expect(o.panel.every((v: any) => v.label && v.asks && v.reasons.length)).toBe(true);
    expect(o.questions.length).toBeGreaterThanOrEqual(4);
    expect(o.projection.projected).toBe(ai.projected);
    o.projection.pillars.forEach((p: any) => expect(p.projected).toBeLessThanOrEqual(p.max));
    const plan = actionPlan(o);
    expect(plan.top.length).toBe(Math.min(3, ai.top3.length));
    [...o.critical, ...o.high].forEach((i: any) => expect(i.by.length).toBeGreaterThan(0));
    // the fill-in slots work on the AI draft exactly like on the device draft
    expect(slotsOf(ai.drafts.en!).length).toBe((draftText(ai.drafts.en!).match(/\[ADD:[^\]]*\]/g) || []).length);
  });
  it("the Syndicate is never a finding", () => {
    const o = overlay(r, ai);
    expect([...o.critical, ...o.high].some((i: any) => /نقابة|syndicate/i.test(i.title.ar))).toBe(false);
  });
  it("an English CV's facts carry the structure the prompt relies on", () => {
    const f = factsOf(auditCV(CV_SAMPLE_EN), "en", "Site engineer, 3+ years, AutoCAD, Primavera");
    expect(f).toMatchObject({ uiLang: "en", cvLang: "en", syndicateStated: false });
    expect(f.jobAd).toMatch(/Primavera/);
  });
});
