// v13 logic tests: fuzzy/semantic search, exclusive reactions, engineering CV parser + reviewer (many layouts)
// Ported from the prototype suite logic-test-v13.js — the checks are unchanged; the page scope is now tests/harness.
import { test, expect } from "vitest";
import * as H from "./harness";
const { C, store } = H;
const names = ["searchPosts", "tokenSim", "tokenize", "searchNorm", "stemToken", "applyReaction", "POSTS0", "parseCV", "CV_SAMPLE_AR", "CV_SAMPLE_EN", "CV_SAMPLE_FRESH", "segmentCV", "parseDateToken", "parseRange", "cvNormalize", "draftSummary", "REACTIONS", "extractCV"];

test("v13 · fuzzy/semantic search, exclusive reactions, engineering CV parser + reviewer (many layouts)", async () => {
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log("  ✓ " + m); } else { fail++; console.log("  ✗ " + m); } };

console.log("— fuzzy search —");
const S = (q) => C.searchPosts(C.POSTS0, q); const ids = (r) => r.hits.map((h) => h.post.id);
ok(C.tokenSim("مرتب", "مرتبات") >= 0.8, "مرتب ≈ مرتبات: " + C.tokenSim("مرتب", "مرتبات").toFixed(2));
ok(C.tokenSim("primavira", "primavera") >= 0.8, "primavira ≈ primavera: " + C.tokenSim("primavira", "primavera").toFixed(2));
ok(C.tokenSim("اوراسكم", "اوراسكوم") >= 0.8, "اوراسكم ≈ اوراسكوم (dropped letter)");
ok(C.tokenSim("xyz", "مرتب") < 0.5, "unrelated tokens score low");
ok(ids(S("مرتبات اوراسكوم")).includes("p1"), "«مرتبات اوراسكوم» finds the Orascom salary question");
ok(ids(S("مرتب مهندس مدنى فى اوراسكم")).includes("p1"), "typo + dialect spelling still finds p1: " + ids(S("مرتب مهندس مدنى فى اوراسكم")).join(","));
ok(ids(S("salary orascom")).includes("p1"), "English synonyms find the Arabic post");
const r3 = S("انترفيو"); ok(r3.hits.length + r3.near.length > 0, "«انترفيو» matches a post via synonym (مقابلة): " + ids(r3).join(","));
ok(S("qwertyuiop").hits.length === 0 && S("qwertyuiop").near.length === 0, "nonsense query returns nothing");
ok(S("ا").hits.length === 0, "single-letter query ignored");
const rr = S("مرتبات اوراسكوم"); ok(rr.hits.every((h) => h.score >= 0.8) && rr.near.every((h) => h.score < 0.8 && h.score >= 0.6), "hits ≥ 80%, near 60–80%");
ok(rr.hits[0] && rr.hits[0].hits.length >= 1 && rr.hits[0].hits[0].sim >= 0.8, "hit explains which tokens matched");

console.log("— reactions —");
let m = C.applyReaction({}, "agree"); ok(m.agree === true && !m.disagree, "agree on");
m = C.applyReaction(m, "disagree"); ok(m.disagree === true && m.agree === false, "disagree replaces agree");
m = C.applyReaction(m, "useful"); ok(m.useful === true && m.disagree === true && !m.agree, "useful stacks with disagree");
m = C.applyReaction(m, "agree"); ok(m.agree === true && !m.disagree && m.useful === true, "agree replaces disagree, keeps useful");
m = C.applyReaction(m, "agree"); ok(!m.agree && !m.disagree && m.useful === true, "agree toggles off, useful stays");
m = C.applyReaction({ useful: true }, "useful"); ok(!m.useful, "useful toggles off alone");
ok(C.REACTIONS.length === 3 && C.REACTIONS.map((r) => r[0]).join() === "agree,disagree,useful", "exactly three reactions");

if (C.parseCV) {
  console.log("— CV parser: layouts —");
  const A = C.parseCV(C.CV_SAMPLE_AR); const E = C.parseCV(C.CV_SAMPLE_EN);
  ok(A.sections.experience && A.sections.education && A.sections.skills, "AR sample: experience/education/skills sections found");
  ok(A.experience.length === 2, "AR: 2 experience entries: " + A.experience.map((e) => e.title + "@" + e.company + " " + e.months + "m").join(" | "));
  ok(A.totalMonths >= 60 && A.totalMonths <= 80, "AR: total experience ≈ 5.5 years: " + A.totalMonths + " months");
  ok(A.discipline === "civil" && A.track === "tech", "AR: civil + technical office: " + A.discipline + "/" + A.track);
  ok(A.education.length >= 1 && /أسيوط/.test(A.education[0].university || "") && A.education[0].year === 2020, "AR: university + year parsed: " + JSON.stringify(A.education[0]));
  ok(A.tools.some((x) => x.name === "Revit") && A.tools.some((x) => x.name === "Primavera P6"), "AR: tools recognised: " + A.tools.map((x) => x.name).join(", "));
  ok(A.contact.email && A.contact.phone && A.contact.linkedin, "AR: contact incl. LinkedIn");
  ok(A.military === "exempt", "AR: military status = exempt");
  ok(E.experience.length >= 1 && E.experience[0].bullets.length >= 3, "EN sample: entry with bullets: " + E.experience.map((e) => e.title + " (" + e.bullets.length + ")").join(" | "));
  ok(E.education[0] && /cairo/i.test(E.education[0].university || ""), "EN: Cairo University parsed");
  ok(E.personal.length >= 3, "EN: personal data flagged: " + E.personal.join(", "));
  const two = "AHMED SAMIR\nMECHANICAL ENGINEER (HVAC)\nMobile: +20 100 222 3333 | Email: ahmed.samir@outlook.com | Giza, Egypt\n\nCAREER HISTORY\nMEP Site Engineer | Contrack FM | Jan 2021 - Present\n• Supervised installation of 14 AHUs and 3.2 km of chilled water piping for a 45,000 m2 hospital.\n• Coordinated with the consultant to close 120 RFIs in 4 months.\nHVAC Design Engineer | Dar Al-Handasah | 06/2018 – 12/2020\n• Designed HVAC systems using HAP and Revit MEP for 6 commercial buildings (total 80,000 m2).\n\nACADEMIC BACKGROUND\nB.Sc. Mechanical Power Engineering, Ain Shams University, 2018 – GPA 3.4\n\nTECHNICAL PROFICIENCIES\nRevit MEP, HAP, AutoCAD, Navisworks, ASHRAE, NFPA 13, SMACNA\n\nCREDENTIALS\nLEED Green Associate (2022) | NEBOSH IGC (2021)\nLANGUAGES: Arabic (native), English (fluent), French (basic)";
  const T = C.parseCV(two);
  ok(T.sections.experience && T.sections.education && T.sections.skills && T.sections.certs, "non-standard headings (CAREER HISTORY / ACADEMIC BACKGROUND / TECHNICAL PROFICIENCIES / CREDENTIALS) mapped");
  ok(T.experience.length === 2 && T.experience[0].current === true && T.experience[0].company && /contrack/i.test(T.experience[0].company), "pipe-separated entry parsed: " + JSON.stringify(T.experience.map((e) => [e.title, e.company, e.start, e.end])));
  ok(T.discipline === "mechanical", "mechanical detected: " + T.discipline);
  ok(T.codes.some((c) => /NFPA/.test(c)) && T.codes.some((c) => /ASHRAE/.test(c)), "codes/standards: " + T.codes.join(", "));
  ok(T.certs.some((c) => /LEED/i.test(c)) && T.certs.some((c) => /NEBOSH/i.test(c)), "certifications: " + T.certs.join(", "));
  ok(T.languages.length >= 2, "languages parsed inline (LANGUAGES: …): " + T.languages.map((l) => l.name + "/" + (l.level || "?")).join(", "));
  ok(T.education[0] && T.education[0].grade && /3\.4/.test(T.education[0].grade), "GPA captured: " + T.education[0].grade);
  ok(T.experience[0].bullets.filter((b) => b.quantified).length === 2, "quantified bullets counted");
  const nohead = "Sara Adel\nsara.adel@gmail.com · 01112223334 · Alexandria\nBachelor of Architecture, Alexandria University, 2024, Very Good with honors\nGraduation project: Mixed-use tower in Smouha – Revit, Lumion\nIntern, Redcon Construction, Jul 2023 – Sep 2023: assisted the technical office in shop drawings\nSkills: AutoCAD, Revit, SketchUp, Lumion, Photoshop\nArabic native, English very good";
  const N = C.parseCV(nohead);
  ok(N.education.length >= 1 && N.discipline === "architecture", "no headings at all: education + discipline still found: " + N.discipline);
  ok(N.tools.length >= 4, "no headings: tools found: " + N.tools.map((x) => x.name).join(", "));
  ok(N.experience.length >= 1 && N.experience[0].intern === true, "internship recognised as such");
  ok(N.seniority === "fresh", "fresh graduate seniority: " + N.seniority);
  const gap = "Omar Hassan\nomar@example.com 01000000000\nWork Experience\nSite Engineer, ABC Contracting, 2015 - 2017\nSenior Site Engineer, XYZ Co., Jun 2019 - Present\nEducation\nB.Sc. Civil Engineering, Helwan University, 2015";
  const G = C.parseCV(gap); ok(G.gaps.length === 1 && G.gaps[0].months >= 15, "employment gap 2017→2019 detected: " + JSON.stringify(G.gaps));
  ok(C.parseRange("March 2019 – Present").months > 60 && C.parseRange("2015 - 2017").months === 24 && C.parseRange("01/2020 – 02/2022").months === 25 && C.parseRange("يناير 2021 – حتى الآن").start.y === 2021, "date range formats (Month YYYY / YYYY / MM/YYYY / Arabic months)");
  ok(C.parseRange("2019-2021").months === 24 && C.parseRange("2019 to 2021").months === 24 && C.parseRange("2019 – 2021").months === 24 && C.parseRange("Oct 2019 - Jan 2021").months === 15, "range separators");
  // (v23) the rubric reviewer, its JD match and the AI deep-review prompt were replaced by the engineering CV audit — see logic-test-v23.js
}


  expect(fail, `${fail} failed check(s) — see the ✗ lines in the log`).toBe(0);
});
