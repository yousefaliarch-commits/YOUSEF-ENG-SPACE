// v11 logic tests: language filter, contact detection, parser contact lift, rules, avatars by gender, reactions, CV reviewer
// Ported from the prototype suite logic-test-v11.js — the checks are unchanged; the page scope is now tests/harness.
import { test, expect } from "vitest";
import * as H from "./harness";
const { C, store } = H;
const names = ["screenLanguage", "detectContact", "parseJobText", "dmRule", "can", "PERMS", "CAPS", "CHAR_SPECS", "characterName", "specOfPersona", "REACTIONS", "POSTS0", "JOBS", "THREADS0", "reviewCV", "CV_SAMPLE_AR", "CV_SAMPLE_EN", "personaTitle", "roleTitle", "posLabelG", "whenMinutes", "TABS", "matchJob", "estimateFor", "flatten", "COMPANIES", "GOVS", "CITIES", "CITY_COUNT", "reachFor"];

test("v11 · language filter, contact detection, parser contact lift, rules, avatars by gender, reactions, CV reviewer", async () => {
let fails = 0; const ok = (c, m) => { console.log((c ? "  ✓ " : "  ✗ ") + m); if (!c) fails++; };
const L = (s) => C.screenLanguage(s);
console.log("— language filter: blocks —");
[["كسمك يا حيوان", "ar profanity + insult"], ["ك.س.م.ك", "dotted"], ["ك س م ك", "spaced"], ["كسسسسمك", "stretched"], ["kosomak", "franco"], ["ya 5awal", "franco with digit"], ["يا غبي انت مش فاهم", "addressed insult"], ["انت حمار", "addressed insult 2"], ["هقتلك لو جيت الموقع", "threat"], ["fuck this company", "en profanity"], ["f*ck", "leet star"], ["sh1t", "leet digit"], ["ابعتي صورتك", "harassment"], ["يا قمر ازيك", "flirt"], ["you are an idiot", "en insult"], ["يا نصراني", "hate addressed"], ["زنجي", "hate word"], ["ابن الكلب ده", "phrase"], ["a7a ايه ده", "franco a7a"], ["you sexy thing", "en sexual"]].forEach(([s, m]) => ok(L(s).blocked, `blocked: ${m}`));
console.log("— language filter: allowed (contact & normal talk) —");
[["رقمي 01001234567 كلمني واتساب", "phone + whatsapp allowed"], ["ابعتلي على ahmed@gmail.com", "email allowed"], ["شوف www.linkedin.com/in/ahmed", "url allowed"], ["حسابي @eng_ahmed على انستا", "handle allowed"], ["الراتب 17,000 جنيه في القاهرة الجديدة", "salary talk"], ["مهندس كهرباء في مكتب استشاري — مكسب كويس", "normal words with كس inside"], ["خولة زميلتي في المكتب الفني", "name Khawla"], ["زبون الشركة اتأخر في الدفع", "زبون"], ["دخول الموقع الساعة 7", "دخول"], ["بيئة العمل ممتازة والتخلف عن الاجتماع ممنوع", "بيئة / تخلف"], ["الحالة دي شاذة عن القاعدة", "شاذة"], ["أنا حاسس إني غبي في التفاوض", "self-deprecation = not blocked"], ["Assistant engineer, class A", "assistant/class"], ["the assessment passed", "assessment"], ["honeywell BMS system", "brand containing honey"]].forEach(([s, m]) => ok(!L(s).blocked, `allowed: ${m}` + (L(s).blocked ? " → " + JSON.stringify(L(s).hits) : "")));
ok(!L("أنا حاسس إني غبي").blocked && L("أنا حاسس إني غبي").warnings.length === 1, "bare insult word = warning only");
ok(!L("الشركة دي زبالة").blocked && L("الشركة دي زبالة").warnings.length >= 1, "harsh tone about a company = warning");
ok(L("يا غبي").hits[0].match === "ي• غ••", "matches are masked: " + L("يا غبي").hits[0].match);
console.log("— contact detection (never blocks) —");
const D = (s) => C.detectContact(s);
ok(D("للتقديم على hr@company.com او 01001234567").email === "hr@company.com" && D("للتقديم على hr@company.com او 01001234567").phone === "01001234567", "email + phone lifted");
ok(D("خبرة 3-5 سنوات في 2024").found === false, "years not contact");
ok(D("+20 100 123 4567").phone === "+201001234567", "intl phone normalised");
console.log("— parser lifts contact into the ad —");
const P = C.parseJobText("مطلوب مهندس مدني مكتب فني في القاهرة الجديدة\nخبرة من 3 إلى 5 سنوات\n- إجادة Revit وAutoCAD\nالراتب 18,000 – 22,000 جنيه\nللتقديم ارسل السيرة الذاتية على jobs.company@example.com او اتصل 01000000555");
ok(P.contact.email === "jobs.company@example.com" && P.contact.phone === "01000000555", "contact extracted");
ok(!/example\.com/.test(P.desc) && !/01000000555/.test(P.desc), "contact line not in description");
ok(!!P.salaryStripped, "salary stripped: " + P.salaryStripped); ok(P.disc === "civil" && P.sub === "tech", "classification intact"); ok(P.city === "newcairo", "city: " + P.gov + "/" + P.city);
console.log("— rules —");
const eng = { anon: "a", role: "engineer" }, hr = { anon: "h", role: "hr", dm: true }, closed = { anon: "w", role: "engineer", openToRecruiters: false }, open = { anon: "o", role: "engineer", openToRecruiters: true };
ok(!C.dmRule(eng, hr).ok && C.dmRule(eng, hr, { job: "j2" }).ok, "engineer → company only via job");
ok(!C.dmRule(hr, closed).ok && C.dmRule(hr, open).ok, "company → engineer only opted-in");
ok(C.PERMS.engineer.apply === undefined && C.PERMS.hr.applicants === undefined && C.CAPS.some((c) => c[0] === "contact"), "apply/applicants capabilities removed, contact capability added");
ok(C.can({ role: "engineer" }, "contact") && !C.can({ role: "hr" }, "reveal") && C.can({ role: "owner", companyId: "x" }, "postjob"), "capability matrix");
console.log("— gender, titles, avatars —");
ok(C.roleTitle("engineer", "female") === "مهندسة" && C.roleTitle("engineer", "male") === "مهندس" && C.roleTitle("owner", "female") === "صاحبة عمل" && C.roleTitle("owner", "male") === "صاحب عمل", "gendered role titles (v24: the owner role reads «صاحب عمل» — Employer)");
ok(C.posLabelG("senior", "female") === "مهندسة أولى (Senior)" && C.posLabelG("pm", "female").startsWith("مديرة"), "feminine level labels");
const pf = C.personaTitle({ gender: "female", role: "engineer", disc: "civil", track: "tech", pos: "mid", gov: "cairo", city: "newcairo" }); ok(pf.startsWith("مهندسة مدنية") && pf.includes("مهندسة (Mid-level)"), "female persona title: " + pf);
ok(C.CHAR_SPECS.length === 11 && C.CHAR_SPECS.every((sp) => C.characterName(sp, "male") !== C.characterName(sp, "female")), "every specialty has a male and a female character (v19: fixed by specialty, no random sets)");
ok(C.characterName("civil", "female") === "المهندسة المدنية" && C.characterName("civil", "male") === "المهندس المدني", "character names follow gender");
ok(C.specOfPersona({ role: "engineer", disc: "architecture", anon: "4f2c", avatar: 7 }) === "architecture" && C.specOfPersona({ role: "engineer", disc: "architecture", anon: "a7f3", avatar: 2 }) === "architecture", "hash and stored avatar index no longer affect the character");
ok(C.specOfPersona({ role: "engineer", disc: "electrical" }) === "electrical", "the character follows the registered specialty");
ok(C.POSTS0.filter((p) => p.gender === "female").every((p) => /^(مهندسة|موارد بشرية)/.test(p.role)) && C.POSTS0.some((p) => p.gender === "female"), "female seed authors carry gender");
console.log("— reactions —");
ok(C.REACTIONS.length === 3 && C.REACTIONS.map((r) => r[0]).join() === "agree,disagree,useful", "exactly three reactions");
ok(C.flatten(C.POSTS0.flatMap((p) => p.comments)).every((c) => Object.keys(c.reactions).sort().join() === "agree,disagree,useful"), "every seed reaction object has the 3 keys only");
console.log("— jobs: off-platform contact —");
ok(C.JOBS.every((j) => j.contact && (j.contact.email || j.contact.phone) && j.screening === undefined), "every job has contact, no screening");
ok(C.THREADS0.engineer.every((t) => !t.messages.some((m) => m.blocked)) && /example\.com/.test(JSON.stringify(C.THREADS0)), "threads share contact freely, no blocked seeds");
ok(C.TABS.map((t) => t.id).join() === "home,community,jobs,market,tools,inbox", "six tabs incl. tools");
ok(C.whenMinutes("منذ يوم") === 1440 && C.whenMinutes("منذ 3 أيام") === 4320 && C.whenMinutes("منذ أسبوعين") === 20160 && C.whenMinutes("منذ ساعتين") === 120 && C.whenMinutes("منذ 11 يومًا") === 15840, "relative time parsing");
// (v23) the CV reviewer was replaced by the engineering CV audit — its tests live in logic-test-v23.js
console.log("— estimate, match, data (carried over from v10) —");
const j2 = C.JOBS.find((j) => j.id === "j2"); const e = C.estimateFor(j2); ok(e.lo < e.mid && e.mid < e.hi && e.lo > 10000 && e.hi < 40000, `j2 estimate sane ${e.lo}-${e.mid}-${e.hi}`);
const e14 = C.estimateFor(C.JOBS.find((j) => j.id === "j14")); ok(e14.mid > e.mid * 1.5 && e14.ccy === "SAR", "back-office estimate ~1.9x with currency");
const me = { role: "engineer", disc: "civil", track: "tech", pos: "mid", gov: "cairo", city: "newcairo" }; const m2 = C.matchJob(j2, me); ok(m2.score >= 85 && m2.perfect, "j2 perfect match " + m2.score);
ok(C.matchJob(j2, { role: "hr" }) === null && C.reachFor(j2).exact > 0, "no match for companies; reach computed");
const ids = new Set(); let dup = 0; C.COMPANIES.forEach((c) => { if (ids.has(c.id)) dup++; ids.add(c.id); }); ok(dup === 0 && C.GOVS.length === 27, `no duplicate companies (${C.COMPANIES.length}), 27 governorates, ${C.CITY_COUNT} places`);
const cityIds = new Set(); let cdup = 0; Object.values<any>(C.CITIES).forEach((l) => l.forEach(([id]) => { if (cityIds.has(id)) cdup++; cityIds.add(id); })); ok(cdup === 0 && C.JOBS.every((j) => C.CITIES[j.gov] && C.CITIES[j.gov].some((c) => c[0] === j.city)), "city ids unique, job cities valid");


  expect(fails, `${fails} failed check(s) — see the ✗ lines in the log`).toBe(0);
});
