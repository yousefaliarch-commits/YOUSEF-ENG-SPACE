// v16 logic tests: reporting & moderation — report reasons per content type, grouping into cases, auto-hide by distinct reporters,
// moderator decisions (hide / warn / suspend / dismiss), strike limit, reopen, member standing and the posting gate,
// snapshots for every content type, the account directory (privacy), and the analytics helpers.
// Ported from the prototype suite logic-test-v16.js — the checks are unchanged; the page scope is now tests/harness.
import { test, expect } from "vitest";
import * as H from "./harness";
const { C, store } = H;
const names = ["ckey", "REPORT_KINDS", "REPORT_REASONS", "reasonOf", "reasonsFor", "MOD_CONFIG0", "snapshotFor", "casesOf", "fileReport", "decideCase", "reopenCase", "modUser", "standingOf", "actGate", "seedReports", "MOD0", "AUDIT0",
  "accIdOf", "memberAccId", "authorAccId", "buildAccounts", "activitySeries", "engagementOf", "salarySample", "histogram", "trendingDiscs", "jobAnalytics", "coverageOf", "jobStats0", "threadsFor0", "normalizeSeedPosts", "normalizeThreads", "POSTS0", "JOBS", "THREADS0", "DEMO_PERSONA", "authorOf", "authorKey", "screenLanguage", "detectContact", "DAY", "HOUR", "daysText", "agoText", "roleGroup", "maskEmail", "WARN_TEMPLATES", "COMPANIES", "ROLES", "PERMS", "can", "loadPersona", "storedRetiredRole", "RETIRED_ROLES", "PERSONA_KEY", "CHAR_SPECS", "SPEC_META", "DISC", "flatten"];

test("v16 · reporting & moderation — report reasons per content type, grouping into cases, auto-hide by distinct reporters,", async () => {
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log("  ✓ " + m); } else { fail++; console.log("  ✗ " + m); } };
names.forEach((n) => { if (C[n] === undefined) { fail++; console.log("  ✗ missing export " + n); } });

const cfg = { ...C.MOD_CONFIG0 }; const now = Date.now();
const snap = { text: "نص", author: { as: "anon", anon: "abcd", userRole: "engineer", role: "مهندس مدني" }, self: false, where: "x", link: null };
const rep = (id, by, reason = "abuse", key = "post:p9", extra = {}) => ({ id, kind: key.split(":")[0], key, target: key.split(":").slice(1).join(":"), reason, note: "", by, trust: 1, at: now - 1000, status: "open", snapshot: snap, acc: C.accIdOf("a:abcd"), resolution: null, ...extra });
const empty = () => ({ reports: [], mod: { content: {}, users: {} }, config: cfg });

console.log("— report reasons fit the content type —");
ok(Object.keys(C.REPORT_KINDS).join() === "post,comment,review,job,message,user", "six reportable types: post, reply, company review, job ad, private message, member");
ok(C.reasonsFor("job").some((r) => r[0] === "scam") && C.reasonsFor("job").some((r) => r[0] === "fakejob") && C.reasonsFor("job").some((r) => r[0] === "discrim"), "job ads: scam / fake job / discrimination");
ok(C.reasonsFor("review").some((r) => r[0] === "fakereview") && !C.reasonsFor("review").some((r) => r[0] === "fakejob"), "reviews: fake review, never «fake job»");
ok(C.reasonsFor("message").some((r) => r[0] === "harass") && C.reasonsFor("message").some((r) => r[0] === "scam"), "private messages: harassment and money requests");
ok(Object.keys(C.REPORT_KINDS).every((k) => C.reasonsFor(k).some((r) => r[0] === "other") && C.reasonsFor(k).some((r) => r[0] === "threat")), "every type can report a threat or «other»");
ok(C.reasonOf("doxx")[2] === 3 && C.reasonOf("spam")[2] === 1 && C.reasonOf("nope")[0] === "other", "severity: exposing identity is urgent, spam is ordinary, unknown → other");

console.log("— auto-hide counts DISTINCT reporters —");
let s = empty(); let r = C.fileReport(s, rep("r1", "u1")); ok(!r.autoHidden && r.reports.length === 1, "one report: stays visible");
s = { ...s, reports: r.reports, mod: r.mod }; r = C.fileReport(s, rep("r2", "u1")); ok(!r.autoHidden, "the same member reporting twice counts once");
s = { ...s, reports: r.reports, mod: r.mod }; r = C.fileReport(s, rep("r3", "u2")); ok(!r.autoHidden, "two distinct reporters: still visible (threshold 3)");
s = { ...s, reports: r.reports, mod: r.mod }; r = C.fileReport(s, rep("r4", "u3")); ok(r.autoHidden && r.mod.content["post:p9"].hidden && r.mod.content["post:p9"].by === "auto", "third distinct reporter: hidden for everyone pending review");
ok(!C.fileReport({ ...empty(), config: { ...cfg, autoHideAt: 0 } }, rep("x", "u9")).autoHidden, "threshold 0 switches auto-hide off");
const cleared = { reports: [rep("a", "u1"), rep("b", "u2")], mod: { content: { "post:p9": { cleared: true } }, users: {} }, config: cfg };
ok(!C.fileReport(cleared, rep("c", "u3")).autoHidden, "after a dismissal the threshold doubles: 3 reporters no longer hide it");

console.log("— cases group reports and sort by urgency —");
const many = [rep("a1", "u1", "spam", "post:pa"), rep("b1", "u1", "doxx", "comment:cb"), rep("b2", "u2", "doxx", "comment:cb"), rep("c1", "u4", "harass", "message:tc", { at: now - 9e6 })];
const cs = C.casesOf(many); ok(cs.length === 3, "reports on the same item form one case");
ok(cs[0].key === "comment:cb" && cs[1].key === "message:tc" && cs[2].key === "post:pa", "urgent first; among equally urgent, more distinct reporters first (then the oldest); ordinary last");
ok(cs[0].reporters === 2 && cs[0].top === "doxx" && cs[0].sev === 3 && cs[0].status === "open", "case carries reporters, top reason, severity, status");

console.log("— moderator decisions —");
const st0 = { reports: [rep("d1", "u1", "abuse"), rep("d2", "u2", "abuse")], mod: { content: {}, users: {} }, config: cfg };
let d = C.decideCase(st0, "post:p9", { accept: true, hide: true, warn: "لا للإهانة", suspendDays: null, note: "n" }, now);
const acc = C.accIdOf("a:abcd");
ok(d.reports.every((x) => x.status === "actioned" && x.resolution.accepted), "accept: every open report on the item is closed as actioned");
ok(d.mod.content["post:p9"].hidden && d.mod.content["post:p9"].by === "mod", "hide: removed for everyone by a moderator");
ok(d.mod.users[acc].warnings === 1 && d.mod.users[acc].strikes === 1 && d.mod.users[acc].status === "warned" && d.mod.users[acc].lastWarning === "لا للإهانة", "warn: warning + strike recorded on the ACCOUNT, with its text");
ok(C.decideCase({ ...st0, reports: d.reports }, "post:p9", { accept: true }) === null, "a closed case cannot be decided twice");
d = C.decideCase(st0, "post:p9", { accept: true, suspendDays: 7 }, now); ok(d.mod.users[acc].status === "suspended" && Math.round((d.mod.users[acc].until - now) / C.DAY) === 7 && !d.mod.users[acc].permanent, "suspend 7 days");
d = C.decideCase(st0, "post:p9", { accept: true, suspendDays: 0 }, now); ok(d.mod.users[acc].permanent && d.mod.users[acc].until === null, "suspend permanently");
const two = { ...st0, mod: { content: {}, users: { [acc]: { strikes: 2, warnings: 2, status: "warned" } } } };
d = C.decideCase(two, "post:p9", { accept: true, warn: "x" }, now); ok(d.actions.includes("auto-suspend") && d.mod.users[acc].status === "suspended" && d.mod.users[acc].strikes === 3, "third confirmed strike → automatic 7-day suspension");
d = C.decideCase({ ...two, config: { ...cfg, strikeLimit: 0 } }, "post:p9", { accept: true, warn: "x" }, now); ok(!d.actions.includes("auto-suspend"), "strike limit 0 switches automatic suspension off");
const auto = { ...st0, mod: { content: { "post:p9": { hidden: true, by: "auto" } }, users: {} } };
d = C.decideCase(auto, "post:p9", { accept: false, note: "لا مخالفة" }, now);
ok(d.reports.every((x) => x.status === "dismissed") && d.mod.content["post:p9"].hidden === false && d.mod.content["post:p9"].cleared && d.actions.includes("restore"), "dismiss: auto-hidden content comes back and is marked cleared");
ok(!d.mod.users[acc], "dismiss never touches the author's account");
const userCase = { reports: [rep("u1r", "u1", "impersonate", "user:a:abcd")], mod: { content: {}, users: {} }, config: cfg };
d = C.decideCase(userCase, "user:a:abcd", { accept: true, hide: true, warn: "x" }, now); ok(!d.actions.includes("hide") && d.actions.includes("warn"), "a member report can warn/suspend but has no content to hide");
const reo = C.reopenCase(C.decideCase(st0, "post:p9", { accept: false }, now).reports, "post:p9"); ok(reo.every((x) => x.status === "open" && !x.resolution), "reopen: the latest decision goes back to the queue");

console.log("— the member's standing and what they may do —");
ok(C.standingOf({ users: {} }, acc).status === "active" && C.actGate(C.standingOf({ users: {} }, acc), cfg).ok, "no record: active, may post");
const sus = { users: { [acc]: { status: "suspended", until: now + C.DAY, warnings: 1, strikes: 1 } } };
ok(C.standingOf(sus, acc).suspended && !C.actGate(C.standingOf(sus, acc), cfg).ok, "active suspension: posting, replying and messaging are blocked");
const expired = { users: { [acc]: { status: "suspended", until: now - 1000, warnings: 1 } } }; ok(!C.standingOf(expired, acc).suspended && C.standingOf(expired, acc).status === "warned", "an expired suspension lifts by itself (the warning stays on record)");
ok(!C.actGate(C.standingOf({ users: {} }, acc), { ...cfg, readOnly: true }).ok && /القراءة فقط/.test(C.actGate({}, { readOnly: true }).why), "read-only maintenance mode blocks everyone and says why");
ok(C.modUser({ users: {} }, acc, { verified: false }).users[acc].verified === false, "per-account overrides (badge, role) are stored on the account id");

console.log("— snapshots: what moderators see, for every content type —");
const src = { posts: C.normalizeSeedPosts(C.POSTS0), jobs: C.JOBS, threads: C.normalizeThreads(C.THREADS0.engineer), reviews: {} };
const sp = C.snapshotFor("post", "p4", src); ok(sp && sp.text.length > 10 && sp.link.type === "post" && sp.author.as, "post");
const sc = C.snapshotFor("comment", "c16", src); ok(sc && sc.link.id === "p1" && sc.author.userRole === "hr", "reply (links to its post, keeps the author's role)");
const sr = C.snapshotFor("review", "orascom#0", src); ok(sr && sr.stars > 0 && sr.link.type === "company", "company review (seed id company#index)");
const sj = C.snapshotFor("job", "j2", src); ok(sj && /مكتب فني/.test(sj.text) && sj.author.userRole === "hr" && sj.link.id === "j2", "job ad (the employer's HR identity)");
const sm = C.snapshotFor("message", "t1", src); ok(sm && sm.author.anon === "e08c" && !/شكرًا على ردّك/.test(sm.text), "private message: only the OTHER side's messages are sent as evidence");
const su = C.snapshotFor("user", "a:77aa", src, { author: { as: "anon", anon: "77aa", userRole: "hr", role: "x" } }); ok(su && su.author.anon === "77aa" && su.link === null, "member profile");
ok(C.snapshotFor("post", "nope", src) === null, "missing content → null (the sheet says so)");
const pub = C.snapshotFor("comment", "c22", src); ok(pub && pub.author.as === "public" && pub.author.name, "a public reply keeps the name the author chose to show");

console.log("— seeded moderation data —");
const seeds = C.seedReports(); ok(seeds.length >= 15 && seeds.every((x) => x.snapshot && x.acc && x.key === C.ckey(x.kind, x.target)), "every seeded report has a snapshot, an account and a consistent key");
const seedCases = C.casesOf(seeds); ok(seedCases.filter((c) => c.status === "open").length >= 7 && new Set(seedCases.map((c) => c.kind)).size === 6, "open cases across all six content types");
ok(seedCases[0].sev === 3 && seedCases[0].status === "open", "the queue opens on an urgent case");
ok(C.screenLanguage(seeds.find((x) => x.key === "message:tx-9b1e").snapshot.text).blocked, "the seeded harassment DM is also caught by the language filter (automatic signal)");
ok(C.detectContact(seeds.find((x) => x.key === "comment:cx31").snapshot.text).found, "the seeded doxxing reply contains a phone number (automatic signal)");
const m0 = C.MOD0(); ok(m0.content["job:jx7"].hidden && m0.content["job:jx7"].by === "auto", "the scam ad with 3+ reporters starts auto-hidden");
ok(C.AUDIT0().every((e) => e.at && e.action && e.target), "audit log entries carry time, action and target");

console.log("— the account directory protects anonymity —");
const posts = C.normalizeSeedPosts(C.POSTS0); const me = { ...C.DEMO_PERSONA, role: "engineer" };
const accs = C.buildAccounts({ posts, jobs: C.JOBS, reviews: {}, reports: seeds, profile: me, mod: m0, now });
ok(new Set(accs.map((a) => a.id)).size === accs.length, `unique account ids (${accs.length} accounts)`);
ok(accs[0].member && accs[0].id === C.memberAccId(me) && accs[0].anon === null && accs[0].name, "the signed-in member is listed first — by name only, never with the anonymous handle");
ok(accs.every((a) => !(a.name && a.anon)), "no account row shows a name AND an anonymous handle together");
ok(!accs.some((a) => !a.member && a.anon === me.anon), "the member's anonymous identity never appears as a separate account");
ok(accs.some((a) => a.status === "suspended") && accs.some((a) => a.status === "warned"), "seeded standings show up (suspended, warned)");
ok(["engineer", "hr", "owner", "field"].every((g) => accs.some((a) => C.roleGroup(a.role) === g)), "all four role groups present: engineer, HR, owner, field staff");
ok(C.roleGroup("supervisor") === "field" && C.roleGroup("hr") === "hr" && C.roleGroup("owner") === "owner", "field staff = site supervisors");
const mine = C.authorOf(me, "anon"); ok(C.authorAccId(mine, false, me) === C.memberAccId(me) && C.authorAccId(C.authorOf(me, "public"), false, me) === C.memberAccId(me), "both of the member's identities map to ONE account (so a suspension applies to both)");
ok(C.maskEmail("yousef@example.com") === "y•••@example.com", "e-mail is masked in the console");
const ov = C.buildAccounts({ posts, jobs: C.JOBS, reviews: {}, reports: seeds, profile: me, mod: C.modUser(m0, accs[5].id, { verified: !accs[5].verified, role: "owner" }), now }).find((a) => a.id === accs[5].id);
ok(ov.verified === !accs[5].verified && ov.role === "owner", "badge and role overrides apply to the right account");

console.log("— analytics —");
const a30 = C.activitySeries(30, now), a7 = C.activitySeries(7, now); ok(a30.length === 30 && a7.length === 7 && a30[29].dau === a7[6].dau, "daily series: right length, the same day has the same value in every range");
const fri = a30.filter((x) => new Date(x.k * C.DAY).getUTCDay() === 5), wk = a30.filter((x) => [0, 1, 2, 3].includes(new Date(x.k * C.DAY).getUTCDay()));
ok(fri.reduce((s, x) => s + x.dau, 0) / fri.length < wk.reduce((s, x) => s + x.dau, 0) / wk.length, "Fridays are quieter than working days (Egyptian weekend)");
const e = C.engagementOf(posts); ok(e.posts === posts.length && e.perPost > 0 && e.answered > 0 && e.answered <= 1 && e.byRoom.length > 0, "engagement from the live posts");
const smp = C.salarySample("3-5", "cairo"); const h = C.histogram(smp.map((x) => x.v)); ok(smp.length > 100 && h.bins.reduce((s, b) => s + b.n, 0) === smp.length, "salary histogram keeps every report");
ok(new Set(smp.map((x) => x.d)).size === 5, "the salary distribution covers all five market disciplines");
const tr = C.trendingDiscs(30, posts, C.JOBS); ok(tr.length === 5 && tr.every((t, i) => i === 0 || tr[i - 1].growth >= t.growth), "trending disciplines sorted by growth");
const ja = C.jobAnalytics(C.JOBS, C.jobStats0()); ok(ja.totals.jobs === C.JOBS.length && ja.totals.contacts > 0 && ja.totals.rate > 0 && ja.totals.rate < 1 && ja.byDisc.reduce((s, x) => s + x.jobs, 0) === C.JOBS.length, "job analytics: totals, contact rate, per-discipline split");
const cov = C.coverageOf(100); ok(cov > 0 && cov < 1 && C.coverageOf(30) >= cov, `salary transparency coverage at «موثّق» quality (≥100 reports): ${Math.round(cov * 100)}% · at ≥30: ${Math.round(C.coverageOf(30) * 100)}% · at ≥150: ${Math.round(C.coverageOf(150) * 100)}%`);
ok(C.daysText(7) === "7 أيام" && C.daysText(14) === "14 يومًا" && C.daysText(2) === "يومين", "Arabic day counts");
ok(C.agoText(now - 5 * 60000, now) === "منذ 5 دقائق" && C.agoText(now - 2 * C.HOUR, now) === "منذ ساعتين", "relative times");
ok(C.threadsFor0({ role: "hr" })[0].id === "t3" && C.threadsFor0({ role: "engineer" })[0].id === "t1", "threads follow the role (shared by app and console)");
ok(Object.keys(C.WARN_TEMPLATES).length >= 10, "warning templates for every reason");

console.log("— surveyors (surveying-institute graduates) are not part of the app —");
ok(C.ROLES.map((r) => r.id).join() === "engineer,hr,owner,supervisor" && !C.ROLES.some((r) => r.needs === "institute"), "four roles: engineer, HR, owner, site supervisor — no surveyor, no institute path");
ok(!("surveyor" in C.PERMS) && C.RETIRED_ROLES.includes("surveyor"), "no permissions row for surveyors; the role is listed as retired");
ok(["read", "post", "reveal", "review", "dm_peer", "verify"].every((cap) => !C.can({ role: "surveyor" }, cap)), "a surveyor role gets no capability at all (never falls back to engineer rights)");
localStorage.setItem(C.PERSONA_KEY, JSON.stringify({ name: "س", anon: "abcd", pid: "u-x", role: "surveyor" }));
ok(C.loadPersona() === null && C.storedRetiredRole() === true, "a profile saved as surveyor is not opened, and sign-in can say why");
localStorage.setItem(C.PERSONA_KEY, JSON.stringify({ name: "م", anon: "abcd", pid: "u-x", role: "engineer" }));
ok(C.loadPersona() && C.loadPersona().role === "engineer" && C.storedRetiredRole() === false, "an engineer profile still loads"); localStorage.removeItem(C.PERSONA_KEY);
const everyone = C.normalizeSeedPosts(C.POSTS0).flatMap((p) => [p, ...C.flatten(p.comments || [])]);
ok(!everyone.some((x) => x.userRole === "surveyor" || /مسّاح|مساحاتي|معهد (ال)?مساحة/.test((x.role || "") + " " + (x.body || x.text || ""))), "no seed post or reply by or about institute surveyors");
ok(!C.CHAR_SPECS.includes("surveyor") && !Object.values<any>(C.SPEC_META).some((m) => /مساحاتي|مسّاح/.test(m.m + m.f)), "no surveyor character (survey ENGINEERING keeps its own)");
ok(!C.buildAccounts({ posts: C.normalizeSeedPosts(C.POSTS0), jobs: C.JOBS, reports: C.seedReports(), profile: C.DEMO_PERSONA, mod: C.MOD0() }).some((a) => a.role === "surveyor"), "the admin directory has no surveyor accounts");
ok(C.DISC.some((d) => d[0] === "survey"), "survey ENGINEERING (faculty of engineering, Syndicate civil division) remains a market discipline");


  expect(fail, `${fail} failed check(s) — see the ✗ lines in the log`).toBe(0);
});
