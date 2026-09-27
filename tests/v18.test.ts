// v18 logic tests: role rules — site supervisors (one fixed title, community only, no money anywhere), company accounts
// (market aggregates within limits, never an individual's figure, per-title bands for their own company), and the employer
// Ported from the prototype suite logic-test-v18.js — the checks are unchanged; the page scope is now tests/harness.
import { test, expect } from "vitest";
import * as H from "./harness";
const { C, store } = H;
const names = ["PERMS", "CAPS", "can", "moneyAccess", "maskMoney", "COMPANY_MIN_SAMPLE", "tabsFor", "blockedFor", "SUPERVISOR_NOTIFS", "TABS", "dmRule", "personaTitle", "anonTitle", "DEMO_PERSONA",
  "normalizeSeedPosts", "POSTS0", "flatten", "threadsFor0", "threadsKind", "NOTIFS0", "CHAR_SPECS", "SPEC_META", "specOf", "specOfPersona", "characterName", "ROLES", "roleOf", "authorOf", "THREADS0", "COMPANIES", "placeName"];

test("v18 · role rules — site supervisors (one fixed title, community only, no money anywhere), company accounts", async () => {
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log("  ✓ " + m); } else { fail++; console.log("  ✗ " + m); } };
names.forEach((n) => { if (C[n] === undefined) { fail++; console.log("  ✗ missing export " + n); } });
const sup = { ...C.DEMO_PERSONA, role: "supervisor", gender: "male", gradYear: 2016 }, hr = { ...C.DEMO_PERSONA, role: "hr", companyId: "hassanallam", companyName: "حسن علام للإنشاءات" }, owner = { ...hr, role: "owner" }, eng = { ...C.DEMO_PERSONA, role: "engineer" };

console.log("— site supervisors: the community only, no money —");
["market", "salaryDetail", "jobs", "reveal", "bands", "review", "contact", "postjob", "dm_co"].forEach((cap) => ok(C.PERMS.supervisor[cap] === 0 && !C.can(sup, cap), `supervisor cannot: ${cap}`));
ok(C.can(sup, "read") && C.can(sup, "post") && C.can(sup, "dm_peer"), "supervisor can read the community, post, reply and message peers");
ok(C.moneyAccess(sup) === "none" && C.moneyAccess(hr) === "aggregate" && C.moneyAccess(owner) === "aggregate" && C.moneyAccess(eng) === "full", "money access: supervisor none · HR/owner aggregate · engineer full");
ok(C.tabsFor(sup).map((t) => t.id).join() === "community,inbox" && C.tabsFor(eng).length === C.TABS.length, "supervisor tabs: community + messages only; engineers keep all six");
const b = C.blockedFor(sup);
ok(["company", "job", "postjob", "cvreview"].every((x) => b.stack.includes(x)), "company, job, post-a-job and CV-review screens are closed to supervisors");
ok(["contribute", "review", "tool", "methodology", "logo"].every((x) => b.sheets.includes(x)), "salary sharing, company reviews, tools and methodology sheets are closed to supervisors");
ok(b.rooms.includes("nego") && b.posts.includes("reveal") && b.posts.includes("vote"), "the negotiation room, salary-reveal posts and offer votes are hidden from supervisors");
ok(C.blockedFor(eng).stack.length === 0 && C.blockedFor(hr).stack.length === 0, "nothing is closed to engineers or company accounts");
ok(!C.SUPERVISOR_NOTIFS.some((k) => ["match", "job", "saved", "company", "data", "contact"].includes(k)) && C.SUPERVISOR_NOTIFS.includes("reply"), "supervisor notifications: community only (no job matches, salary reports or market data)");
ok(!C.dmRule(sup, { role: "hr", anon: "b0d2", dm: true }, { job: "j2" }).ok, "a supervisor cannot message a company — not even from a job ad");
ok(!C.dmRule(hr, { role: "supervisor", anon: "a911", dm: true, openToRecruiters: true }).ok, "a company cannot message a supervisor");
ok(C.dmRule(sup, { role: "engineer", anon: "e08c", dm: true }).ok && C.dmRule(sup, { role: "supervisor", anon: "a911", dm: true }).ok, "supervisors message engineers and supervisors who opened their DMs");

console.log("— one fixed title for every site supervisor —");
ok(C.personaTitle(sup) === "مشرف موقع · " + C.placeName(sup.gov, sup.city) && !/Senior|Mid|Junior|رئيس|قائد|مدير/.test(C.personaTitle(sup)), "public title: «مشرف موقع · place» — no level, track or specialty");
ok(C.anonTitle(sup).startsWith("مشرف موقع") && !/مدني|مكتب فني|Mid-level/.test(C.anonTitle(sup)), "anonymous title: «مشرف موقع · years» — no specialty or level");
ok(C.personaTitle({ ...sup, gender: "female" }).startsWith("مشرفة موقع"), "feminine form «مشرفة موقع»");
const seedSup = C.normalizeSeedPosts(C.POSTS0).flatMap((p) => [p, ...C.flatten(p.comments || [])]).filter((x) => x.userRole === "supervisor");
ok(seedSup.length > 0 && seedSup.every((x) => /^مشرف(ة)? موقع/.test(x.role) && !/رئيس|Section|Senior|قائد/.test(x.role)), "seed supervisors carry only the fixed title");
ok(/مسمّى واحد ثابت/.test(C.roleOf("supervisor").desc), "the role description says the title is fixed and community-only");

console.log("— money masking in member-written text —");
const m = (s) => C.maskMoney(s);
ok(!/17,000/.test(m("عرضوا عليّ 17,000 جنيه مكتب فني")) && /•••/.test(m("عرضوا عليّ 17,000 جنيه")), "«17,000 جنيه» → masked");
ok(m("1,500 ج.م قبل الاستلام") === "••• قبل الاستلام", "the currency travels with the amount («1,500 ج.م» → «•••»)");
ok(!/\d/.test(m("13000 في مقاولات")) && !/15/.test(m("حوالي 15 ألف")) && !/25/.test(m("بياخد 25k")), "plain thousands, «15 ألف», «25k» → masked");
ok(m("دفعة 2014 · تحديث 2026-Q1") === "دفعة 2014 · تحديث 2026-Q1", "years are kept");
ok(m("رقمي 01000000909") === "رقمي 01000000909" && m("زيادة 15% بعد 4–5 سنين و3 شهور") === "زيادة 15% بعد 4–5 سنين و3 شهور", "phone numbers, percentages, counts and durations are kept");
const texts = C.normalizeSeedPosts(C.POSTS0).flatMap((p) => [p.body, ...(p.poll ? [p.poll.q, ...p.poll.options.map((o) => o[0])] : []), ...C.flatten(p.comments || []).map((c) => c.text)]);
const leaks = texts.map(m).filter((t) => /\d{1,3},\d{3}|(?<!\d)\d{4,7}(?!\d)/.test(t.replace(/(?<!\d)(19[5-9]\d|20[0-4]\d)(?!\d)/g, "")) || /\d+\s*(ألف|الف|k\b)/.test(t));
ok(leaks.length === 0, `no amount survives in any seed post, reply or poll once masked (${texts.length} texts checked)${leaks.length ? " — leak: " + leaks[0].slice(0, 80) : ""}`);

console.log("— company accounts (HR and owners): aggregates within limits —");
["salaryDetail", "reveal", "review"].forEach((cap) => ok(!C.can(hr, cap) && !C.can(owner, cap), `HR and owners cannot: ${cap}`));
ok(C.PERMS.hr.market === 2 && C.can(hr, "market") && C.PERMS.owner.market === 2, "HR and owners see the market — conditionally (aggregates only)");
ok(C.can(hr, "bands") && !C.can({ ...hr, companyId: null }, "bands"), "per-title bands need a linked company (and the company page shows them for that company only)");
ok(C.COMPANY_MIN_SAMPLE === 30, "company accounts see a market cell only with 30+ reports");
ok(C.CAPS.some((c) => c[0] === "market") && C.CAPS.some((c) => c[0] === "salaryDetail") && C.CAPS.some((c) => c[0] === "jobs"), "the relationship map lists market / individual figures / jobs as separate rights");

console.log("— employers look like employers —");
ok(C.specOfPersona(owner) === "owner" && C.specOfPersona(hr) === "hr" && C.specOfPersona(sup) === "supervisor" && C.specOfPersona(eng) === "civil", "character families: owner · HR · supervisor · engineering specialty (v19)");
ok(C.SPEC_META.owner.kind === "owner" && C.SPEC_META.hr.kind === "hr" && C.CHAR_SPECS.filter((sp) => C.SPEC_META[sp].kind).length === 2, "only owners and HR carry the employer frame and badge");
ok(C.characterName("owner", "female") === "صاحبة العمل" && C.characterName("hr", "male") === "مسؤول الموارد البشرية", "employer characters are named for the role");
const hrSeed = C.normalizeSeedPosts(C.POSTS0).flatMap((p) => [p, ...C.flatten(p.comments || [])]).filter((x) => x.userRole === "hr" || x.userRole === "owner");
ok(hrSeed.length > 0 && hrSeed.every((x) => C.specOf(x) === x.userRole), "seeded HR and owner posts render with their own characters");

console.log("— threads follow the role —");
const st = C.threadsFor0(sup); ok(C.threadsKind(sup) === "supervisor" && st.length >= 1 && st.every((t) => t.ctx.type !== "job" && C.maskMoney(t.messages.map((x) => x.text).join(" ")) === t.messages.map((x) => x.text).join(" ")), "supervisor threads: peers only, no job context, no money");
ok(C.threadsKind(hr) === "company" && C.threadsKind(eng) === "engineer", "engineers and companies keep their own threads");


  expect(fail, `${fail} failed check(s) — see the ✗ lines in the log`).toBe(0);
});
