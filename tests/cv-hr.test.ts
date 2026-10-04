// CV review v0.1.14: regional HR realism — personal details Egyptian / Gulf CVs normally carry are not flaws, military-service
// status is checked for male Egyptian engineers, and every report carries a Senior Engineering HR Director's assessment.
import { describe, expect, it } from "vitest";
import { CV_SAMPLE_AR, CV_SAMPLE_EN, CV_SAMPLE_FRESH, auditCV } from "../src/features/cv/audit";
import { candidateGender, egyptian, militaryRelevance } from "../src/features/cv/hr";

const BASE = `Ahmed Hassan
Site Engineer
Mobile: +20 100 123 4567 · ahmed.hassan@gmail.com · Cairo, Egypt
Date of birth: 3/4/1996 · Marital status: Married · Nationality: Egyptian
Work Experience
Site Engineer — Hassan Allam Construction · 03/2020 – Present
- Supervised reinforced concrete works for a 12-floor residential tower (24,000 m² BUA) worth EGP 300M.
- Prepared shop drawings in AutoCAD and quantity take-offs in Excel for the structural package.
- Led a team of 4 foremen and coordinated inspections with the consultant to the Egyptian Code ECP 203.
Junior Site Engineer — Redcon · 07/2018 – 02/2020
- Executed finishing works for 3 villas and tracked daily progress reports.
Education
B.Sc. Civil Engineering — Cairo University, 2018
Skills
AutoCAD, Excel, Primavera P6, ETABS
Member of the Egyptian Engineers Syndicate — No. 123456`;
const ids = (r: any) => [...r.critical, ...r.high].map((i: any) => i.id);
const run = (text: string, ctx: any = {}) => auditCV(text, ctx) as any;

describe("regional personal details", () => {
  it("date of birth, marital status and nationality cost nothing and raise no issue", () => {
    const r = run(BASE); expect(ids(r)).not.toContain("personal");
    const g = (k: string) => r.regional.find((x: any) => x.key === k);
    expect(g("dob").state).toBe("ok"); expect(g("marital").state).toBe("ok"); expect(g("phone").state).toBe("ok"); expect(g("city").state).toBe("ok");
    expect(g("dob").note.ar).toContain("ليس عيبًا");
  });
  it("an Egyptian mobile number in any local format is recognised", () => {
    for (const p of ["+20 100 123 4567", "01001234567", "0020 112 345 6789", "+201551234567"]) { const r = run(BASE.replace("+20 100 123 4567", p)); expect(r.regional.find((x: any) => x.key === "phone").note.en).toMatch(/valid Egyptian/); }
  });
  it("only the national ID number is flagged (identity-fraud risk)", () => {
    const r = run(BASE.replace("Nationality: Egyptian", "Nationality: Egyptian · National ID: 29601010101234"));
    expect(ids(r)).toContain("nid"); expect(r.regional.find((x: any) => x.key === "nid").state).toBe("advice");
  });
});

describe("military-service status (موقف التجنيد)", () => {
  it("matters for male Egyptian engineers, not for women or non-Egyptian CVs", () => {
    expect(candidateGender("Gender: Male")).toBe("male"); expect(candidateGender("المهندسة سارة")).toBe("female"); expect(candidateGender("John")).toBeNull();
    const cv = (text: string) => ({ text, contact: {}, syndicate: false });
    expect(militaryRelevance(cv("Cairo University\nGender: Male"), null)).toBe("yes");
    expect(militaryRelevance(cv("Cairo University\nGender: Female"), null)).toBe("no");
    expect(militaryRelevance(cv("Cairo University"), null)).toBe("maybe");
    expect(militaryRelevance(cv("University of Leeds, UK"), null)).toBe("no"); expect(egyptian(cv("University of Leeds, UK"))).toBe(false);
    // an engineer reviewing their own CV: their profile gender fills the gap; HR reviewing a candidate never uses its own profile
    expect(militaryRelevance(cv("Cairo University"), { role: "engineer", gender: "female" })).toBe("no");
    expect(militaryRelevance(cv("Cairo University"), { role: "hr", gender: "female" })).toBe("maybe");
  });
  it("a male engineer with no status gets a high-priority fix and a decisive gap in the HR view", () => {
    const r = run(BASE.replace("Marital status: Married", "Gender: Male · Marital status: Married"));
    expect(r.high.some((i: any) => i.id === "military")).toBe(true); expect(r.regional.find((x: any) => x.key === "military").state).toBe("missing");
    expect(r.hr.missing.map((m: any) => m.title.en)).toContain("Military service status");
  });
  it("completed / exempt is fine; postponed asks for the year; unknown gender is advised, never penalised", () => {
    const done = run(BASE.replace("Marital status: Married", "Gender: Male · Military status: Completed")); expect(ids(done)).not.toContain("military"); expect(done.regional.find((x: any) => x.key === "military").state).toBe("ok");
    const post = run(BASE.replace("Marital status: Married", "Gender: Male · Military status: Postponed")); expect(post.regional.find((x: any) => x.key === "military")).toMatchObject({ state: "advice" }); expect(post.regional.find((x: any) => x.key === "military").note.en).toMatch(/until \[year\]/);
    const unk = run(BASE); expect(ids(unk)).not.toContain("military"); expect(unk.regional.find((x: any) => x.key === "military")).toMatchObject({ state: "missing", rel: "maybe" });
  });
  it("the Arabic sample (الموقف من التجنيد: معاف) reads as exempt", () => { expect(run(CV_SAMPLE_AR).regional.find((x: any) => x.key === "military").state).toBe("ok"); });
});

describe("the HR director's assessment", () => {
  it("every report has verdict, level, fit, experience, software, gaps, actions and stand-out moves — in both languages", () => {
    for (const s of [BASE, CV_SAMPLE_AR, CV_SAMPLE_EN, CV_SAMPLE_FRESH]) {
      const h = run(s).hr; expect(h.verdict.label.ar && h.verdict.label.en).toBeTruthy(); expect(["good", "accent", "warn", "bad"]).toContain(h.verdict.tone);
      expect(h.fit.ar.length).toBeGreaterThan(40); expect(h.experience.length).toBeGreaterThan(0); expect(h.software.en).toBeTruthy(); expect(h.actions.length).toBeLessThanOrEqual(7); expect(h.standOut.length).toBeGreaterThanOrEqual(3);
      for (const x of [h.fit, h.software, ...h.experience, ...h.actions, ...h.standOut]) { expect(x.ar).not.toMatch(/undefined|\[object/); expect(x.en).not.toMatch(/undefined|\[object/); }
    }
  });
  it("level follows real years: a fresh graduate is junior, six years is senior", () => {
    expect(run(CV_SAMPLE_FRESH).hr.level.en).toBe("Junior engineer"); expect(run(CV_SAMPLE_FRESH).hr.fit.en).toMatch(/^An Electrical graduate/);
    expect(run(CV_SAMPLE_AR).hr.level.en).toBe("Senior engineer");
  });
  it("a weak CV is filed as not ready, with dates and project scale as decisive gaps", () => {
    const h = run(CV_SAMPLE_EN).hr; expect(h.verdict.tone).toBe("bad"); const gaps = h.missing.map((m: any) => m.title.en);
    expect(gaps).toEqual(expect.arrayContaining(["Role dates", "Project scale and your role in it"])); expect(h.fit.en).toMatch(/no countable experience/);
  });
  it("software is split into proven by use, listed only and missing core — English names project types in English", () => {
    const h = run(BASE).hr; expect(h.software.en).toMatch(/AutoCAD/); expect(h.experience.join ? h.experience.map((x: any) => x.en).join(" ") : "").not.toMatch(/[؀-ۿ]{3,}/);
  });
});
