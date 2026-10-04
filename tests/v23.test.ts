// v23 logic tests: the engineering CV audit — one pass, five pillars, engineering knowledge base, scope extraction,
// software depth, track alignment, codes & credentials, ATS, rewrites that never invent a figure, bilingual report.
// Ported from the prototype suite logic-test-v23.js — the checks are unchanged; the page scope is now tests/harness.
import { test, expect } from "vitest";
import * as H from "./harness";
const { C, store } = H;
const names = ["auditCV", "parseCV", "analyseBullet", "scopeOf", "rewriteEng", "toolEvidence", "trackShares", "kbFor", "KB", "KB_DISC", "PILLARS", "DIMS", "ENG_CODES", "ENG_CREDS", "ENG_TERMS", "TERM", "CV_TOOLS", "TRACKS", "tracksFor", "LEVEL_L", "PORTFOLIO_TIPS", "PORTFOLIO_GENERAL", "CV_SAMPLE_AR", "CV_SAMPLE_EN", "CV_SAMPLE_FRESH", "CV_PERSONAL", "DESIGN_BY_DISC", "TASKS", "L2"];

test("v23 · the engineering CV audit — one pass, five pillars, engineering knowledge base, scope extraction,", async () => {
let pass = 0, fail = 0; const ok = (c, m, extra?) => { if (c) { pass++; console.log("  ✓ " + m); } else { fail++; console.log("  ✗ " + m + (extra !== undefined ? "  → " + JSON.stringify(extra).slice(0, 400) : "")); } };
names.forEach((n) => { if (C[n] === undefined) { fail++; console.log("  ✗ missing export " + n); } });
const AR = /[ء-ي]/; const isL2 = (x) => x && typeof x.ar === "string" && typeof x.en === "string" && AR.test(x.ar) && !AR.test(x.en) && x.en.trim().length > 0;

console.log("— the knowledge base is consistent —");
ok(C.PILLARS.reduce((a, p) => a + p[1], 0) === 100 && C.PILLARS.length === 5, "five pillars worth 100 points: " + C.PILLARS.map((p) => p[0] + " " + p[1]).join(" · "));
const toolNames = new Set(C.CV_TOOLS.map((t) => t.name)), codeNames = new Set(C.ENG_CODES.map((c) => c[0])), credNames = new Set(C.ENG_CREDS.map((c) => c[0]));
const kbs = [...Object.entries<any>(C.KB), ...Object.entries<any>(C.KB_DISC)]; const bad = [];
kbs.forEach(([k, v]) => { [...(v.core || []), ...(v.adv || [])].forEach((n) => toolNames.has(n) || bad.push(k + " tool " + n)); [...(v.codes || []), ...(v.contracts || [])].forEach((n) => codeNames.has(n) || bad.push(k + " code " + n)); (v.creds || []).forEach((n) => credNames.has(n) || bad.push(k + " cred " + n)); (v.terms || []).forEach((n) => C.TERM[n] || bad.push(k + " term " + n)); (v.dims || []).forEach((n) => C.DIMS[n] || bad.push(k + " dim " + n)); });
ok(bad.length === 0, `every tool, code, credential, term and scope dimension named by the ${kbs.length} track profiles exists in the dictionaries`, bad);
ok(C.TRACKS.every(([id]) => C.KB[id]), "every app track (site, technical office, design, supervision, planning, QS, QA/QC, BIM, GIS, PM) has an audit profile");
ok(Object.values<any>(C.DIMS).every(isL2) && Object.values<any>(C.LEVEL_L).every(isL2) && C.ENG_TERMS.every((t) => isL2(t.label)) && C.PILLARS.every((p) => isL2(p[2]) && isL2(p[3])), "all labels are written in Arabic and English (no Arabic left in the English)");
ok(Object.values<any>(C.PORTFOLIO_TIPS).flat().every(isL2) && C.PORTFOLIO_GENERAL.every(isL2), `${Object.values<any>(C.PORTFOLIO_TIPS).flat().length + C.PORTFOLIO_GENERAL.length} portfolio tips, every one bilingual`);

console.log("— scope extraction (English and Arabic) —");
const se = C.scopeOf("Managed a G+12 residential tower of 32,000 m² BUA worth EGP 450M under a FIDIC Red Book contract, leading a team of 25 engineers; delivered 8 days ahead of schedule.");
ok(["floors", "area", "value", "contract", "team", "result", "type"].every((d) => se.dims.has(d)), "English: height, BUA, value, contract, team, result and project type", [...se.dims]);
const sa = C.scopeOf("أشرفت على تنفيذ برج سكني 20 دور بمسطحات 45,000 م² بقيمة 600 مليون جنيه بعقد فيديك، وسلّمت قبل الموعد بـ 3 أسابيع.");
ok(["floors", "area", "value", "contract", "type", "result"].every((d) => sa.dims.has(d)), "Arabic: الأدوار، المساحة، القيمة، العقد، النوع، النتيجة", [...sa.dims]);
ok(C.scopeOf("Designed post-tensioned flat slabs for a hospital").dims.has("system") && C.scopeOf("Installed 2 x 1500 kVA transformers").dims.has("capacity"), "structural systems (post-tensioned flat slabs) and MEP capacities (kVA) are recognised");

console.log("— the three sample CVs —");
const RA = C.auditCV(C.CV_SAMPLE_AR), RE = C.auditCV(C.CV_SAMPLE_EN), RF = C.auditCV(C.CV_SAMPLE_FRESH);
ok(RA.target === "tech" && RA.disc === "civil" && RA.critical.length === 0 && RA.overall >= 60 && RA.overall <= 82, `Arabic technical-office CV: civil · technical office · ${RA.overall}/100 · no deal-breakers`);
ok(RA.high.some((i) => i.id === "drafting") && RA.software.filter((s) => s.tier === "core").every((s) => s.level === "listed"), "…its tools are only listed, never proven in experience → «drafting level only» is flagged");
ok(RA.creds.find((c) => c.name === "PMP").prep === true && !RA.creds.find((c) => c.name === "PMP").present && !/PMP/.test(RA.summary.after), "…a «PMP (تحضيري)» prep course is not counted as PMP, and the drafted summary doesn't claim it");
ok(RE.overall < 45 && ["nometrics", "dates", "thin"].every((id) => RE.critical.some((i) => i.id === id)), `weak English site CV: ${RE.overall}/100 with the deal-breakers «no metrics», «no dates», «too thin»`, RE.critical.map((i) => i.id));
ok(["email", "syndicate", "tooltypo"].every((id) => RE.high.some((i) => i.id === id)) && !RE.high.some((i) => i.id === "personal"), "…and the high-priority fixes: unprofessional e-mail, Syndicate, misspelled tool names — regional personal data (birth date, marital status) is not a flaw (v24)", RE.high.map((i) => i.id));
ok(RF.disc === "electrical" && RF.target === "design" && RF.fresh && RF.critical.length === 0, `fresh electrical graduate: read as electrical design, ${RF.overall}/100, no deal-breakers`);
const etap = RF.software.find((s) => s.name === "ETAP"), revm = RF.software.find((s) => s.name === "Revit MEP"), dial = RF.software.find((s) => s.name === "DIALux");
ok(etap.level === "advanced" && revm.level === "basic" && dial.level !== "basic", "software depth: ETAP advanced (load flow / short circuit), «Revit MEP (basic)» basic — and «basic» doesn't spill onto DIALux on the same line", [etap.level, revm.level, dial.level]);

console.log("— track alignment —");
const RP = C.auditCV(C.CV_SAMPLE_AR, { track: "planning" });
ok(RP.target === "planning" && RP.detected === "tech" && RP.pillars.find((p) => p.id === "track").pts < RA.pillars.find((p) => p.id === "track").pts && [...RP.critical, ...RP.high].some((i) => i.id === "misaligned"), "auditing the technical-office CV for Planning: flagged as misaligned, track pillar drops", [RP.pillars.find((p) => p.id === "track").pts]);
const RD = C.auditCV(C.CV_SAMPLE_AR, { track: "design" });
ok(RD.critical.some((i) => i.id === "core") && RD.software.some((s) => s.name === "ETABS" && s.level === "missing"), "…for Structural Design: ETABS / SAFE missing → a deal-breaker");

console.log("— codes applied vs. listed —");
const codeCV = "Karim Adel\nStructural Design Engineer\nkarim@example.com · 01001234567 · Cairo\n\nSUMMARY\nStructural design engineer with 6 years on residential towers and public buildings up to 45,000 m² BUA, working to ECP 203, ECP 201 and ACI 318 on ETABS, SAFE and PLAXIS.\n\nWORK EXPERIENCE\nStructural Design Engineer — Dar Al-Handasah — Cairo · Jan 2020 – Present\n- Designed post-tensioned flat slabs for a G+20 tower (45,000 m² BUA) on ETABS and SAFE per ECP 203 and ACI 318, including response-spectrum seismic analysis to ECP 201.\n- Reviewed 120 reinforcement shop drawings and closed consultant comments within 3 days on average.\n- Optimised the raft foundation of a 3-basement car park with PLAXIS staged-construction checks, cutting concrete by 11%.\n- Led a team of 4 design engineers across 6 residential towers for New Urban Communities (NUCA) under a FIDIC Yellow Book contract.\nJunior Structural Engineer — ECG — Cairo · Jul 2018 – Dec 2019\n- Modelled 14 school buildings on ETABS and prepared calculation notes and reinforcement details for consultant approval.\n- Checked punching shear and deflection of flat slabs on SAFE for a 9,000 m² hospital extension.\n\nEDUCATION\nB.Sc. Civil Engineering — Cairo University · 2019\n\nSKILLS\nETABS · SAFE · AutoCAD · Revit · Eurocode 2\n\nCERTIFICATIONS\nMember, Egyptian Engineers Syndicate";
const RC = C.auditCV(codeCV, { track: "design" }); const st = (n) => (RC.codes.find((c) => c.name === n) || {}).state;
ok(st("ECP 203") === "applied" && st("ACI 318") === "applied" && st("ECP 201") === "applied" && st("Eurocode") === "listed", "ECP 203 / ACI 318 / ECP 201 named inside a design bullet → applied; Eurocode only in Skills → listed", RC.codes.map((c) => c.name + ":" + c.state));
ok(RC.software.find((s) => s.name === "ETABS").level === "advanced" && RC.software.find((s) => s.name === "SAFE").level === "advanced", "ETABS with seismic analysis and SAFE with post-tensioned flat slabs → advanced");
ok(RC.overall >= 70 && RC.critical.length === 0, `a well-scoped design CV scores ${RC.overall}/100 with no deal-breakers`);

console.log("— rewrites never invent a figure —");
const figures = (s) => (String(s).replace(/\[[^\]]*\]/g, " ").match(/\d[\d,.]*/g) || []).map((x) => x.replace(/[.,]+$/, ""));
const invented = []; [[RA, C.CV_SAMPLE_AR], [RE, C.CV_SAMPLE_EN], [RF, C.CV_SAMPLE_FRESH], [RC, codeCV]].forEach(([R, text]) => { const pool = text.replace(/\s+/g, " "); R.rewrites.forEach((g) => g.items.forEach((it) => figures(it.after).forEach((n) => { if (!pool.includes(n)) invented.push(n + " in «" + it.after.slice(0, 60) + "»"); }))); figures(R.summary.after).forEach((n) => { if (!pool.includes(n)) invented.push(n + " in the summary"); }); });
ok(invented.length === 0, "every figure in every rewrite and drafted summary comes from the CV itself — anything else is a [bracket]", invented);
const all = [RA, RE, RF].flatMap((R) => R.rewrites.flatMap((g) => g.items));
ok(all.length >= 8 && all.every((it) => it.after !== it.before && /\.$/.test(it.after)), `${all.length} rewrites, each a complete sentence different from the original`);
const en1 = RE.rewrites.flatMap((g) => g.items).find((it) => /^Responsible of supervising/.test(it.before));
ok(en1 && /^Supervised concrete works and finishing works/.test(en1.after) && /\[X\] m² BUA/.test(en1.after) && /achieving \[X\]%/.test(en1.after), "«Responsible of supervising concrete works…» → «Supervised concrete works … ([X] m² BUA …), achieving [X]% …»", en1 && en1.after);
const ar1 = RA.rewrites.flatMap((g) => g.items).find((it) => /^قمت بمتابعة/.test(it.before));
ok(ar1 && /^تابعت مقاولي الباطن وأعددت تقارير الإنجاز اليومية/.test(ar1.after), "«قمت بمتابعة مقاولي الباطن وإعداد…» → «تابعت مقاولي الباطن وأعددت…» — the engineer's own verbs, in the past tense", ar1 && ar1.after);
const ar2 = RA.rewrites.flatMap((g) => g.items).find((it) => /^مسؤول عن التنسيق/.test(it.before));
ok(ar2 && /^نسّقت بين الموقع والتصميم/.test(ar2.after), "«مسؤول عن التنسيق بين الموقع والتصميم» → «نسّقت بين الموقع والتصميم…» (a noun after «بين» stays a noun)", ar2 && ar2.after);
const kept = RA.rewrites.flatMap((g) => g.items).find((it) => /^راجعت اللوحات التنفيذية/.test(it.before));
ok(kept && kept.kept && kept.after.startsWith(kept.before.replace(/\.$/, "")) && RA.strongBullets >= 1, "a bullet that already leads with a verb and a figure keeps its own words; only the missing result is added — and a complete one is left alone");
ok(!all.some((it) => /English|العربية: اللغة/.test(it.before)), "a languages line that slipped under a role is never rewritten");
const fd = RF.rewrites.flatMap((g) => g.items).find((it) => /single line diagrams/.test(it.before));
ok(fd && /voltage drop/.test(fd.after) && !/concrete|G\+\[N\]/.test(fd.after), "electrical design work gets an electrical result (voltage drop, cable cost) — not structural quantities or floors", fd && fd.after);

console.log("— parser fixes that the audit depends on —");
ok(C.analyseBullet("أعددت الحصر والمستخلصات الشهرية لمشروع إداري.", "ar").action === true && C.analyseBullet("راجعت اللوحات التنفيذية.", "ar").action === true, "Arabic action verbs are recognised (\\b does not work after Arabic letters — fixed)");
ok(!C.CV_PERSONAL["العنوان التفصيلي"].test("Supervised a 12-storey office building for 3 floors") && !C.CV_PERSONAL["العنوان التفصيلي"].test("لمشروع إسكان اجتماعي 12 عمارة") && C.CV_PERSONAL["العنوان التفصيلي"].test("Address: 12 Nile Street"), "«12-storey building» / «12 عمارة» are no longer read as a home address");
const pc = C.parseCV(C.CV_SAMPLE_AR); ok(!pc.experience.some((e) => e.bullets.some((b) => /English: Very good/.test(b.text))), "«العربية: اللغة الأم · English…» is not lifted into Experience any more");

console.log("— ATS gates, target job, the report —");
const RL = C.auditCV(C.CV_SAMPLE_AR, { layout: { pages: 2, images: 1, columns: true, tables: 1, type: "pdf", glyphs: 0 } });
ok(RL.high.some((i) => i.id === "layout") && !RL.critical.some((i) => i.id === "layout") && RL.pillars.find((p) => p.id === "ats").pts < RA.pillars.find((p) => p.id === "ats").pts, "a two-column PDF with a table is a high-priority fix (portals parse it; local HR reads by eye) and costs ATS points");
const RS = C.auditCV("", { scanned: true, layout: { pages: 1, images: 1, columns: false, tables: 0, type: "pdf" } });
ok(RS.empty && RS.scanned && RS.critical[0].id === "scanned" && isL2(RS.critical[0].title), "a scanned PDF returns a single bilingual deal-breaker with the fix");
const RJ = C.auditCV(C.CV_SAMPLE_AR, { jd: "Technical Office Engineer — 3-5 years. Revit, Navisworks, AutoCAD, shop drawings, BOQ, IPCs, FIDIC, Primavera P6." });
ok(RJ.jd && RJ.jd.coverage > 0 && RJ.jd.coverage < 100 && RJ.jd.missing.some((k) => /Navisworks|FIDIC/.test(k.en)), `a pasted job ad is matched: ${RJ.jd.coverage}% covered, missing ${RJ.jd.missing.map((k) => k.en).join(", ")}`);
const issuesAll = [RA, RE, RF, RP, RD, RL].flatMap((R) => [...R.critical, ...R.high]);
ok(issuesAll.every((i) => isL2(i.title) && isL2(i.why) && i.fix.every(isL2)), `${issuesAll.length} issues — every title, reason and fix written in both languages`);
const checks = [RA, RE, RF].flatMap((R) => R.pillars.flatMap((p) => p.checks));
ok(checks.every((c) => isL2(c.label) && c.detail && typeof c.detail.ar === "string" && typeof c.detail.en === "string" && (!c.fix || isL2(c.fix))), `${checks.length} scored checks, each with a bilingual label, evidence and fix`);
ok([RA, RE, RF].every((R) => Math.abs(R.overall - R.pillars.reduce((a, p) => a + p.pts, 0)) <= 1 && R.pillars.every((p) => p.pts >= 0 && p.pts <= p.max)), "the overall score is the sum of the five pillars, each within its maximum");
const t0 = Date.now(); for (let i = 0; i < 20; i++) C.auditCV(C.CV_SAMPLE_AR, { cv: pc }); const per = (Date.now() - t0) / 20;
ok(per < 150, `re-auditing for another track takes ≈ ${per.toFixed(1)} ms (instant, on the device)`);


  expect(fail, `${fail} failed check(s) — see the ✗ lines in the log`).toBe(0);
});
