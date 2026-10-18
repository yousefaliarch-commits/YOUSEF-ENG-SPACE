// CV review v25: the hiring panel — four independent readers over one on-device audit, the honesty line, graduation-grade
// advice, tough interview questions, the score projection and the rebuilt draft (never an invented fact).
import { describe, expect, it } from "vitest";
import { CV_SAMPLE_AR, CV_SAMPLE_EN, CV_SAMPLE_FRESH, auditCV } from "../src/features/cv/audit";
import { ISSUE_OWNERS, gradeOf, topThird } from "../src/features/cv/panel";
import { addMarks, applyFills, draftSpec, draftText, filledText, rebuildCV, rescreen, slotsOf } from "../src/features/cv/rebuild";
import { docLayout, fixedMeasurer } from "../src/doc/layout";

const run = (t: string, ctx: any = {}) => auditCV(t, ctx);
const reader = (r: any, id: string) => r.panel.find((p: any) => p.id === id);

const SITE = `Karim Adel
Site Engineer — Civil
+20 100 222 3344 · karim.adel@gmail.com · Cairo · linkedin.com/in/karim-adel
Gender: Male · Military status: Completed (2019)

Professional Summary
Civil site engineer with 5 years on residential and commercial projects up to 45,000 m² BUA and EGP 300 million, leading teams of 4 engineers and 60 workers.

Work Experience
Site Engineer — Hassan Allam Construction — New Capital · 03/2021 – Present
- Led a team of 4 engineers and 60 workers on a 12-storey office tower (45,000 m² BUA), handing over 2 weeks early.
- Coordinated structural and MEP shop drawings on AutoCAD and Revit with the consultant, closing 140 RFIs and 95% of WIRs at first inspection to ECP 203 and the FIDIC Red Book.
- Ran weekly progress meetings with the client and 6 subcontractors and updated the Primavera P6 look-ahead and the Excel progress report.
Site Engineer — Redcon — Cairo · 01/2019 – 02/2021
- Supervised 8,000 m³ of concrete pours for 10 residential buildings with zero lost-time injuries.
- Checked subcontractor quantities monthly in Excel, cutting disputed items by 30%, and verified rebar against ECP 203 detailing.

Education
B.Sc. Civil Engineering — Ain Shams University · 2018 · Very Good

Skills
AutoCAD · Excel · Primavera P6 · Revit
Codes: Egyptian Code (ECP 203) · FIDIC Red Book

Languages
Arabic (native) · English (very good)`;

describe("the four readers", () => {
  it("every report carries the four readers in order, each with a verdict and reasons", () => {
    for (const s of [CV_SAMPLE_AR, CV_SAMPLE_EN, CV_SAMPLE_FRESH, SITE]) {
      const r = run(s);
      expect(r.panel.map((p: any) => p.id)).toEqual(["screen", "manager", "recruiter", "teammate"]);
      r.panel.forEach((p: any) => {
        expect(["pass", "maybe", "reject"]).toContain(p.verdict);
        expect(p.score).toBeGreaterThanOrEqual(0);
        expect(p.score).toBeLessThanOrEqual(100);
        expect(p.reasons.length).toBeGreaterThan(0);
        expect(p.label.ar && p.label.en).toBeTruthy();
      });
    }
  });
  it("every issue names the reader(s) who raised it — the screen owns parsing, the recruiter owns military status", () => {
    const r = run(CV_SAMPLE_EN);
    [...r.critical, ...r.high].forEach((i: any) => expect(i.by.length).toBeGreaterThan(0));
    expect(r.critical.find((i: any) => i.id === "dates").by).toEqual(["screen"]);
    expect(r.high.find((i: any) => i.id === "email").by).toEqual(["recruiter"]);
    expect(ISSUE_OWNERS.military).toEqual(["recruiter"]);
    // a CV with no dates and no figures is rejected by the screen and the hiring manager
    expect(reader(r, "screen").verdict).toBe("reject");
    expect(reader(r, "manager").verdict).toBe("reject");
  });
  it("the recruiter reads only the top third: a latest role buried under a long skills block is missed", () => {
    const buried = SITE.replace("Work Experience", ["Skills overview", ...Array.from({ length: 30 }, (_, i) => `Skill line ${i + 1}: drawing reading and site safety`)].join("\n") + "\n\nWork Experience");
    const r = run(buried);
    expect(topThird(r.cv).some((l) => l.includes("Hassan Allam"))).toBe(false);
    expect(reader(r, "recruiter").reasons.some((x: any) => !x.good && /latest role/.test(x.text.en))).toBe(true);
    expect(reader(run(SITE), "recruiter").score).toBeGreaterThan(reader(r, "recruiter").score);
  });
  it("the teammate wants evidence of working with others, not «team player»", () => {
    const tm = reader(run(SITE), "teammate");
    expect(tm.score).toBe(100);
    expect(tm.verdict).toBe("pass");
    expect(tm.reasons.filter((x: any) => x.good && x.quote).length).toBe(4);
    const lone = reader(run(CV_SAMPLE_EN), "teammate");
    expect(lone.score).toBeLessThan(50);
    expect(lone.reasons.some((x: any) => /Team player/.test(x.text.en) && x.quote)).toBe(true);
  });
});

describe("the honesty line", () => {
  it("a strong CV names the reader who came closest to rejecting it, and why it held", () => {
    const r = run(SITE);
    expect(r.overall).toBeGreaterThanOrEqual(75);
    expect(r.honesty.strong).toBe(true);
    const low = [...r.panel].sort((a: any, b: any) => a.score - b.score)[0];
    expect(r.honesty.reviewer).toBe(low.id);
    expect(r.honesty.text.en).toMatch(/came closest to rejecting/);
    expect(r.honesty.text.ar).toMatch(/أقرب من كاد يرفضها/);
  });
  it("a weak CV is told which reader is toughest instead", () => {
    const r = run(CV_SAMPLE_EN);
    expect(r.honesty.strong).toBe(false);
    expect(r.honesty.text.en).toMatch(/toughest reader/);
  });
});

describe("graduation grade (Egyptian grading)", () => {
  const g = (line: string) => gradeOf({ education: [{ lines: [line] }] });
  it("reads Arabic and English grades, honours, percentages and GPAs", () => {
    expect(g("بكالوريوس الهندسة · بتقدير امتياز مع مرتبة الشرف").tier).toBe("high");
    expect(g("بكالوريوس الهندسة · بتقدير جيد جدًا").tier).toBe("mid");
    expect(g("بكالوريوس الهندسة · بتقدير جيد جدًا مع مرتبة الشرف").tier).toBe("high");
    expect(g("بكالوريوس الهندسة · بتقدير جيد").tier).toBe("low");
    expect(g("بكالوريوس الهندسة · بتقدير مقبول").tier).toBe("low");
    expect(g("B.Sc. · Very Good with honors").tier).toBe("high");
    expect(g("B.Sc. · Excellent").tier).toBe("high");
    expect(g("B.Sc. · Good").tier).toBe("low");
    expect(g("B.Sc. · 87%").tier).toBe("high");
    expect(g("B.Sc. · GPA 2.5 / 4").tier).toBe("low");
    expect(g("B.Sc. Civil Engineering · 2020").tier).toBe("none");
    expect(g("بكالوريوس الهندسة · بتقدير جيد جدًا").label).toBe("جيد جدًا");
  });
  const FRESH = (grade: string, summaryHasGrade = false) => `Omar Samir
Civil Engineer — Fresh Graduate
omar.samir@gmail.com · +20 111 222 3333 · Giza
Military status: Postponed until 2027

Professional Summary
Civil engineering graduate${summaryHasGrade ? ` (${grade})` : ""} with summer training at two contractors and a graduation project on a 10-storey RC building designed on ETABS and SAFE to ECP 203.

Education
B.Sc. Civil Engineering — Cairo University · 2025 · ${grade}
Graduation project: 10-storey residential RC building — ETABS, SAFE, ECP 203 · team of 6

Internships
Site Trainee — Orascom Construction · Jul 2024 – Sep 2024
- Followed concrete pours of 1,200 m³ and prepared daily reports for the site engineer.

Skills
AutoCAD · ETABS · SAFE · Excel`;
  it("a strong grade leads; a modest one stays on the education line while the project and training lead", () => {
    const hi = run(FRESH("Excellent with honors"));
    expect(hi.gradeIntel.tier).toBe("high");
    expect(hi.gradeIntel.state).toBe("ok"); // it already shows in the top third (the education line is near the top)
    const lo = run(FRESH("Good", true));
    expect(lo.gradeIntel.tier).toBe("low");
    expect(lo.gradeIntel.state).toBe("advice");
    expect(lo.gradeIntel.advice.en).toMatch(/graduation project/);
    expect(lo.gradeIntel.advice.en).toMatch(/don't delete it/i);
    // the rebuilt draft puts the graduation project before the education for a modest grade
    const d = rebuildCV(lo);
    expect(d.sections.findIndex((s) => s.id === "grad")).toBeLessThan(d.sections.findIndex((s) => s.id === "education"));
    const dh = rebuildCV(hi);
    expect(dh.lead).toMatch(/Excellent/);
  });
  it("advice only — the grade never moves the score", () => {
    expect(run(FRESH("Excellent with honors")).overall).toBe(run(FRESH("Good")).overall);
  });
  it("after five years it no longer decides", () => {
    expect(run(SITE).gradeIntel.state).toBe("neutral");
    expect(run(SITE).gradeIntel.matters).toBe(false);
  });
});

describe("tough interview questions", () => {
  it("come from this CV's own gaps, bilingual, between 4 and 8", () => {
    for (const s of [CV_SAMPLE_AR, CV_SAMPLE_EN, CV_SAMPLE_FRESH, SITE]) {
      const r = run(s);
      expect(r.questions.length).toBeGreaterThanOrEqual(4);
      expect(r.questions.length).toBeLessThanOrEqual(8);
      r.questions.forEach((q: any) => expect(q.q.ar && q.q.en && q.why.en && q.tip.en).toBeTruthy());
    }
    expect(run(CV_SAMPLE_FRESH).questions.map((q: any) => q.from)).toEqual(expect.arrayContaining(["military", "gradproj"]));
    expect(run(CV_SAMPLE_EN).questions.map((q: any) => q.from)).toEqual(expect.arrayContaining(["scope", "team"]));
  });
  it("a gap between roles, a title above the years and a tool with no project behind it are asked about", () => {
    const gap = SITE.replace("01/2019 – 02/2021", "01/2019 – 02/2020").replace("Site Engineer — Hassan Allam", "Project Manager — Hassan Allam").replace("AutoCAD · Excel · Primavera P6 · Revit", "AutoCAD · Excel · Primavera P6 · Revit · Navisworks (advanced)");
    const r = run(gap);
    const from = r.questions.map((q: any) => q.from);
    expect(from).toContain("gap0");
    expect(r.questions.find((q: any) => q.from === "gap0").q.en).toMatch(/13 months/);
    expect(from.some((f: string) => f.startsWith("tool:"))).toBe(true);
  });
});

describe("score projection", () => {
  it("moves up when every fix is applied, never past 100 or below today", () => {
    for (const s of [CV_SAMPLE_AR, CV_SAMPLE_EN, CV_SAMPLE_FRESH, SITE]) {
      const r = run(s);
      expect(r.projection.now).toBe(r.overall);
      expect(r.projection.projected).toBeGreaterThanOrEqual(r.overall);
      expect(r.projection.projected).toBeLessThanOrEqual(100);
      r.projection.pillars.forEach((p: any) => expect(p.projected).toBeLessThanOrEqual(p.max));
    }
    const en = run(CV_SAMPLE_EN);
    expect(en.projection.projected - en.overall).toBeGreaterThanOrEqual(25);
  });
  it("never assumes a tool the CV doesn't have", () => {
    // a technical-office CV with none of the track's core tools: the core-tools check stays at zero
    const r = run(SITE.replace("AutoCAD · Excel · Primavera P6 · Revit", "Primavera P6").replace(/AutoCAD|Excel|Revit/g, ""), { track: "tech" });
    const sw = r.projection.pillars.find((p: any) => p.id === "software");
    expect(sw.projected).toBeLessThan(sw.max);
  });
});

describe("the rebuilt draft", () => {
  // phone numbers are compared without their spacing («0100 555 6666» = «01005556666»)
  const digits = (s: string) => (s.replace(/\[(?:ADD|أضف):[^\]]*\]/g, " ").replace(/(\d)[ -](?=\d)/g, "$1").match(/\d+(?:[.,]\d+)?/g) || []).map((x) => x.replace(/,/g, ""));
  it("invents no figure: every number in the draft is in the original CV", () => {
    for (const s of [CV_SAMPLE_AR, CV_SAMPLE_EN, CV_SAMPLE_FRESH, SITE]) {
      // allowed besides the CV's own numbers: the years the audit computes from the role dates, and m² / m³ written as m2 / m3
      const r = run(s);
      // …and month names written as numbers («Jul 2024» → «07/2024» in the other language)
      const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      const months = s.replace(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/gi, (m) => String(MONTHS.indexOf(m.slice(0, 3).toLowerCase()) + 1).padStart(2, "0") + "/");
      const orig = new Set([...digits(months.replace(/²/g, "2").replace(/³/g, "3")), ...digits(s), String(Math.floor(r.years)), String(Math.round(r.years))]);
      for (const lang of ["en", "ar"] as const) {
        const extra = digits(draftText(rebuildCV(r, lang))).filter((n) => !orig.has(n));
        expect(extra).toEqual([]);
      }
    }
  });
  it("every gap is a structured placeholder in the CV's language, listed as a question", () => {
    const ar = rebuildCV(run(CV_SAMPLE_AR), "ar");
    expect(ar.asks.every((a) => a.startsWith("[أضف:"))).toBe(true);
    const en = rebuildCV(run(CV_SAMPLE_EN));
    expect(en.asks.length).toBeGreaterThan(0);
    expect(en.asks.every((a) => a.startsWith("[ADD:"))).toBe(true);
    expect(draftText(en)).toMatch(/\[ADD: from – to\]/);
    expect(addMarks("BUA [X] m²", false)).toBe("BUA [ADD: X] m²");
    expect(addMarks("[ADD: kept]", false)).toBe("[ADD: kept]");
  });
  it("keeps the regional block, drops the national ID and religion, asks for military status, never for the Syndicate", () => {
    const t = `Hany Fawzy
Site Engineer
+20 100 999 8877 · hany.fawzy@gmail.com · Alexandria
Gender: Male
Date of birth: 1/2/1995
Marital status: Married
National ID: 29502011234567
Religion: Muslim

Work Experience
Site Engineer — Petrojet — Alexandria · 01/2020 – Present
- Supervised steel erection for a 3,000 ton refinery pipe rack with a team of 25 fitters.

Education
B.Sc. Mechanical Engineering — Alexandria University · 2017 · Good

Skills
AutoCAD · Excel`;
    const r = run(t);
    const d = rebuildCV(r);
    const txt = draftText(d);
    expect(txt).toMatch(/Date of birth: 1\/2\/1995/);
    expect(txt).toMatch(/Marital status: Married/);
    expect(txt).not.toMatch(/29502011234567|National ID|Religion/);
    expect(txt).toMatch(/Military status: \[ADD: completed/);
    expect(txt).not.toMatch(/Syndicate|نقابة/i);
    expect(d.asks.some((a) => /Syndicate/i.test(a))).toBe(false);
  });
  it("is re-screened: a CV the screen rejects passes once the draft's placeholders are filled", () => {
    const rs = rescreen(run(CV_SAMPLE_EN));
    expect(rs.before).toBe("reject");
    expect(rs.after).toBe("pass");
    expect(filledText(rebuildCV(run(CV_SAMPLE_EN)))).not.toMatch(/\[(ADD|أضف):/);
  });
  it("prints as a white-label A4 letterhead — the name first, no title block, no app name, mark or credit anywhere", () => {
    for (const [s, lang] of [[CV_SAMPLE_AR, "ar"], [CV_SAMPLE_FRESH, "en"], [CV_SAMPLE_AR, "en"]] as const) {
      const d = rebuildCV(run(s), lang);
      const { pages } = docLayout(draftSpec(d), fixedMeasurer);
      expect(pages.length).toBeGreaterThanOrEqual(1);
      const texts = pages.flatMap((p) => p.ops.filter((o: any) => o.op === "text").map((o: any) => o.text));
      const first = pages[0].ops.find((o: any) => o.op === "text") as any;
      expect(first.text).toBe(d.name);
      expect(texts.some((t) => /Client · المالك|المالك · Client|Draft — not issued|مسودة/.test(t))).toBe(false);
      expect(texts.some((t) => /EngSpace/i.test(t))).toBe(false);
      // no brand mark: the only path op on a CV page would be the E+S mark
      expect(pages.every((p) => !p.ops.some((o: any) => o.op === "path"))).toBe(true);
      const spec = draftSpec(d);
      expect(spec.meta.plain).toBeTruthy();
      expect(JSON.stringify(spec.meta.plain)).not.toMatch(/EngSpace/);
    }
  });
});

describe("the rebuilt CV in either language (structured, on the device)", () => {
  const AR_LETTERS = /[ء-ي]/;
  // what is outside the [ADD: …] slots (a slot may quote the original line)
  const outside = (t: string) => t.replace(/\[(?:ADD|أضف):[^\]]*\]/g, " ");
  it("English is the default, and an Arabic CV comes out in English with standard terms", () => {
    const d = rebuildCV(run(CV_SAMPLE_AR));
    expect(d.lang).toBe("en");
    const t = draftText(d);
    expect(AR_LETTERS.test(outside(t))).toBe(false);
    expect(t).toMatch(/Professional Experience/);
    expect(t).toMatch(/Technical Office Engineer — Redcon Construction — Cairo · 03\/2022 – Present/);
    expect(t).toMatch(/Site Engineer — The Arab Contractors — Assiut · 07\/2020 – 02\/2022/);
    expect(t).toMatch(/B\.Sc\. Civil Engineering — Assiut University · 2020 · Very Good/);
    expect(t).toMatch(/Military status: Exempt/);
    expect(t).toMatch(/32,000 m² and EGP 40 million/);
    expect(t).toMatch(/Member, Egyptian Engineers Syndicate · 2020/);
    expect(t).toMatch(/PMP \(in preparation\) · 2024/);
    expect(t).toMatch(/Arabic \(Native\) · English \(Very good/);
    // the Arabic name is never transliterated by guess: it is asked for, quoting the original
    expect(d.name).toMatch(/^\[ADD: your name in English — «أحمد محمود عبد الرحمن»\]$/);
    expect(d.pairs.length).toBeGreaterThan(0);
    expect(d.pairs.every((p) => AR_LETTERS.test(p.from) && /\[ADD: the result/.test(p.to))).toBe(true);
  });
  it("an English CV comes out in Arabic with standard terms, and design speaks the engineer's discipline", () => {
    const d = rebuildCV(run(CV_SAMPLE_FRESH), "ar");
    const t = draftText(d);
    expect(t).toMatch(/الموقف من التجنيد: مؤجل حتى \[أضف: السنة\]/);
    expect(t).toMatch(/بكالوريوس الهندسة — قسم الهندسة الكهربية — جامعة القاهرة · 2020 – 2025 · بتقدير جيد جدًا مع مرتبة الشرف/);
    expect(t).toMatch(/متدرب — السويدي إليكتريك/);
    expect(t).toMatch(/الخبرات العملية/);
    expect(t).toMatch(/العربية \(اللغة الأم\)/);
    expect(t).not.toMatch(/النظام الإنشائي/);
    expect(/[A-Za-z]{4,}/.test(outside(d.headline))).toBe(false);
  });
  it("the same language keeps the engineer's own lines (no translation pairs)", () => {
    expect(rebuildCV(run(CV_SAMPLE_AR), "ar").pairs).toEqual([]);
    expect(rebuildCV(run(CV_SAMPLE_EN), "en").pairs).toEqual([]);
  });
  it("every slot can be filled in the app; empty answers keep the slot", () => {
    const d = rebuildCV(run(CV_SAMPLE_EN));
    const slots = slotsOf(d);
    expect(slots.length).toBe((draftText(d).match(/\[ADD:[^\]]*\]/g) || []).length);
    const all = Object.fromEntries(slots.map((x, i) => [x.id, `v${i}`]));
    const full = applyFills(d, all);
    expect(draftText(full)).not.toMatch(/\[ADD:/);
    expect(full.asks).toEqual([]);
    const one = applyFills(d, { [slots[0].id]: "mohamed.ali@gmail.com" });
    expect(slotsOf(one).length).toBe(slots.length - 1);
    expect(draftText(d)).toMatch(/\[ADD:/); // the original draft is untouched
  });
});

describe("document kit: running paragraphs", () => {
  it("long text breaks across pages line by line", () => {
    const d = rebuildCV(run(SITE));
    const many = { ...d, sections: [{ id: "x", title: "X", items: [{ head: "Role", lines: Array.from({ length: 90 }, (_, i) => `Bullet ${i} with enough words to wrap across the column width of an A4 page in the draft`) }] }] };
    const { pages } = docLayout(draftSpec(many), fixedMeasurer);
    expect(pages.length).toBeGreaterThan(1);
    pages.forEach((p) => p.ops.filter((o: any) => o.op === "text").forEach((o: any) => expect(o.y).toBeLessThan(297)));
  });
});

describe("the rebuilt CV as an editable Word document", () => {
  it("is a valid, white-label OOXML package: styles, a real bullet list, A4 with 2 cm margins, RTL for Arabic", async () => {
    const { unzipSync, strFromU8 } = await import("fflate");
    const { draftDocx } = await import("../src/features/cv/docx");
    for (const lang of ["en", "ar"] as const) {
      const d = applyFills(rebuildCV(run(CV_SAMPLE_AR), lang), { "name#0": "Ahmed Mahmoud Abdelrahman" });
      const zip = unzipSync(draftDocx(d, new Date("2026-10-17T10:00:00Z")));
      expect(Object.keys(zip).sort()).toEqual(["[Content_Types].xml", "_rels/.rels", "docProps/core.xml", "word/_rels/document.xml.rels", "word/document.xml", "word/numbering.xml", "word/styles.xml"]);
      const doc = strFromU8(zip["word/document.xml"]);
      const all = Object.values(zip).map((u) => strFromU8(u)).join("\n");
      expect(all).not.toMatch(/EngSpace/i);
      expect(zip["docProps/app.xml"]).toBeUndefined();
      expect(strFromU8(zip["docProps/core.xml"])).toMatch(/<dc:creator>(Ahmed Mahmoud Abdelrahman|أحمد محمود عبد الرحمن)<\/dc:creator>/);
      expect(doc).toMatch(/w:pgSz w:w="11906" w:h="16838"/);
      expect(doc).toMatch(/w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/);
      expect((doc.match(/<w:pStyle w:val="Heading1"\/>/g) || []).length).toBe(d.sections.length + (d.summary ? 1 : 0));
      expect((doc.match(/<w:numId w:val="1"\/>/g) || []).length).toBe(d.sections.flatMap((s) => s.items).filter((it) => it.head).reduce((a, it) => a + it.lines.length, 0));
      expect(doc.includes("<w:bidi/>")).toBe(lang === "ar");
      // every line of the draft is in the document, escaped
      draftText(d).split("\n").filter(Boolean).filter((l) => !l.startsWith("- ")).slice(0, 6).forEach((l) => expect(doc).toContain(l.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")));
    }
  });
});

describe("the executive snapshot and action plan", () => {
  it("the top three fixes are the deal-breakers first, then high priority, then the checks with most points left", async () => {
    const { actionPlan } = await import("../src/features/cv/PanelViews");
    const r = run(CV_SAMPLE_EN);
    const p = actionPlan(r);
    expect(p.critical.map((f) => f.id)).toEqual(r.critical.map((i: any) => i.id));
    expect(p.top.map((f) => f.id)).toEqual([...r.critical, ...r.high].slice(0, 3).map((i: any) => i.id));
    expect(p.recs.every((f) => f.sev === "rec" && f.fix[0])).toBe(true);
    const gaps = p.recs.map((f) => f.gain || 0);
    expect(gaps.every((g) => g >= 0)).toBe(true);
    // a CV with no issues still gets three recommendations to act on
    const strong = actionPlan(run(CV_SAMPLE_FRESH));
    expect(strong.top.length).toBe(Math.min(3, strong.critical.length + strong.high.length + strong.recs.length));
  });
});
