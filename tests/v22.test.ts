// v22 logic tests: English is the system's language only — community content (posts, comments, replies, polls, reviews,
// messages, reported items) is never translated; the language screen comes first; the tour and the guide are written in both
// languages side by side, with feminine Arabic, and match step for step.
// Ported from the prototype suite logic-test-v22.js — the checks are unchanged; the page scope is now tests/harness.
import { test, expect } from "vitest";
import * as H from "./harness";
const { C, store } = H;
const src = H.src;
const names = ["I18N", "tr", "trCore", "DICT", "UGC", "L3", "say", "LANG_OPTS", "LanguageScreen", "loadLang", "saveLang", "POSTS0", "THREADS0", "NOTIFS0", "COMPANIES", "MOD_SNAPS", "normalizeSeedPosts", "snapUGC", "snapshotFor", "maskMoney", "tourSteps", "guideSections", "TOUR_UI", "GUIDE_HEAD", "DEMO_PERSONA", "tabsFor", "flatten"];

test("v22 · English is the system's language only — community content (posts, comments, replies, polls, reviews,", async () => {
let pass = 0, fail = 0; const ok = (c, m, extra?) => { if (c) { pass++; console.log("  ✓ " + m); } else { fail++; console.log("  ✗ " + m + (extra !== undefined ? "  → " + JSON.stringify(extra).slice(0, 300) : "")); } };
names.forEach((n) => { if (C[n] === undefined) { fail++; console.log("  ✗ missing export " + n); } });
const AR = /[ء-ي]/;

console.log("— community content stays as written (English is the system's language only) —");
C.I18N.lang = "en";
const posts = C.normalizeSeedPosts(C.POSTS0); const walk = (cs) => (cs || []).flatMap((c) => [c, ...walk(c.replies)]);
const content = [];
posts.forEach((p) => { content.push(["post", p.body]); walk(p.comments).forEach((c) => content.push(["comment", c.text])); if (p.poll) { content.push(["poll", p.poll.q]); p.poll.options.forEach(([o]) => content.push(["poll option", o])); } });
Object.values<any>(C.THREADS0).flat().forEach((t) => t.messages.forEach((m) => content.push(["message", m.text])));
C.COMPANIES.forEach((c) => (c.reviews || []).forEach((r) => content.push(["review", r.text])));
Object.values<any>(C.MOD_SNAPS).forEach((s) => content.push(["reported item", s.text]));
const kinds = [...new Set(content.map((x) => x[0]))];
const mixed = new Set(["تأمين طبي عائلي", "مواصلات"]); // poll options that are also UI labels elsewhere — the poll shows them inside translate="no"
// On screen every item sits inside translate="no". tr() (copied text, notifications, search) must never reshape a sentence
// either: anything longer than a short phrase comes back unchanged — no «From …» + a whole Arabic paragraph.
const words = (t) => t.trim().split(/\s+/).length;
const leaked = content.filter(([k, t]) => !mixed.has(t) && AR.test(t) && words(t) > 4 && C.tr(t) !== t);
ok(content.length >= 80 && kinds.length === 7, `${content.length} seed items across ${kinds.join(", ")}`);
ok(leaked.length === 0, "no post, comment, reply, poll, message, review or reported sentence is translated or half-translated by tr()", leaked.slice(0, 3));
ok(content.filter(([, t]) => !mixed.has(t)).every(([, t]) => !C.DICT.exact.has(t.replace(/\s+/g, " ").trim())), "the shipped dictionary holds none of that text");
ok(C.tr("الرئيسية") === "Home" && C.tr("كل الوظائف") === "All jobs" && C.tr("إعدادات") !== undefined, "the system interface still translates (tabs, labels)");
ok(C.UGC.translate === "no" && C.UGC.dir === "auto", "content elements carry translate=\"no\" and dir=\"auto\" (Arabic keeps its own direction inside an English layout)");
const n1 = C.NOTIFS0.find((n) => n.id === "n1"); const n1en = C.tr(n1.body);
ok(/^#e08c replied to/.test(n1en) && /مرتبات المهندس المدني/.test(n1en), "a notification is translated, but the post it quotes stays in Arabic", n1en);
const body = posts.find((p) => /17,000/.test(p.body)).body;
ok(C.maskMoney(body) !== body && AR.test(C.maskMoney(body)) && !/17,000/.test(C.maskMoney(body)), "restricted accounts see content as written with amounts masked (no translation step in between)");
const snap = C.snapshotFor("message", "t1", { threads: C.THREADS0.engineer }); const snapEmpty = C.snapshotFor("user", "a:1", {}, { author: {} });
ok(C.snapUGC(snap) === C.UGC && C.snapUGC(snapEmpty) === null && snapEmpty.sys === true, "moderators see reported text exactly as written; the app's own placeholder («report about the account itself») still translates");
C.I18N.lang = "ar";

console.log("— the language screen comes first —");
delete store["engspace.lang"];
ok(C.loadLang() === null, "with no saved choice the app has no language yet — the language screen opens before the e-mail / registration screen");
ok(C.LANG_OPTS.map((o) => o[0]).join() === "ar,en" && C.LANG_OPTS[0][4] === "rtl" && C.LANG_OPTS[1][4] === "ltr", "it offers Arabic (right-to-left) and English (left-to-right)");
C.saveLang("en"); ok(C.loadLang() === "en", "the choice is saved and read back on the next launch"); delete store["engspace.lang"];
ok(/setAuthView\] = S\("authView", "lang"\)/.test(src) && /authView === "lang" \? <LanguageScreen/.test(src), "signed out, the app's first view is the language screen; «Continue» leads to sign-up (or sign-in when this device has an account)");
ok(/onClick=\{\(\) => app\.setAuthView\("lang"\)\} aria-label="رجوع إلى اختيار اللغة"/.test(src), "the first registration step has a Back button to the language screen");
ok(!/<LanguageGate/.test(src), "the old first-launch overlay is gone — no second language prompt over the app");

console.log("— the tour and the guide: Arabic and English side by side —");
const mk = (role, access, isCo, gender, lang) => ({ lang, profile: { ...C.DEMO_PERSONA, role, gender }, moneyAccess: access, isCo, tabs: C.tabsFor({ role }), push() {}, setTab() {}, goMarket() {}, openSheet() {} });
const roles = [["engineer", "full", false], ["supervisor", "none", false], ["hr", "aggregate", true], ["owner", "aggregate", true]];
const full = (x) => x && typeof x.ar === "string" && typeof x.arF === "string" && typeof x.en === "string" && AR.test(x.ar) && AR.test(x.arF) && !AR.test(x.en) && x.en.trim().length > 1;
let lines = 0, fem = 0; const bad = [];
roles.forEach(([role, access, co]) => {
  const t = C.tourSteps(mk(role, access, co, "male", "ar")); const g = C.guideSections(mk(role, access, co, "male", "ar"));
  t.forEach((s) => [s.title, s.body].forEach((x) => { lines++; if (!full(x)) bad.push([role, s.id, x]); if (x.arF !== x.ar) fem++; }));
  g.forEach((s) => [s.title, ...s.points, ...(s.action ? [s.action[0]] : [])].forEach((x) => { lines++; if (!full(x)) bad.push([role, s.id, x]); if (x.arF !== x.ar) fem++; }));
});
ok(bad.length === 0, `every tour and guide line (${lines} across the four account types) has Arabic, feminine Arabic and English — none missing, no Arabic left in the English`, bad.slice(0, 2));
ok(fem >= 60, `${fem} lines address a woman in the feminine («افتحي»، «تختارين»، «جاهزة للانطلاق»)`);
ok(Object.values<any>(C.TOUR_UI).every(full) && Object.values<any>(C.GUIDE_HEAD).every(full), "the tour's buttons and the guide's header are bilingual too");
roles.forEach(([role, access, co]) => {
  const ar = C.tourSteps(mk(role, access, co, "female", "ar")), en = C.tourSteps(mk(role, access, co, "female", "en"));
  ok(ar.length === en.length && ar.every((s, i) => s.id === en[i].id), `${role}: the Arabic and English tours have the same ${ar.length} steps in the same order`);
});
const appM = mk("engineer", "full", false, "male", "ar"), appF = mk("engineer", "full", false, "female", "ar"), appE = mk("engineer", "full", false, "female", "en");
const done = C.tourSteps(appM).find((s) => s.id === "done");
ok(C.say(appM, done.title) === "جاهز للانطلاق" && C.say(appF, done.title) === "جاهزة للانطلاق" && C.say(appE, done.title) === "Ready to go", "say() picks the member's language and gender: جاهز / جاهزة / Ready to go");
ok(C.say(appF, C.TOUR_UI.start) === "ابدئي الجولة" && C.say(appM, C.TOUR_UI.start) === "ابدأ الجولة" && C.say(appE, C.TOUR_UI.start) === "Start the tour", "buttons too: ابدأ / ابدئي الجولة / Start the tour");
const gEng = C.guideSections(appM); const pts = (id, k) => gEng.find((s) => s.id === id).points.map((x) => x[k]).join(" ");
ok(/الوسيط/.test(pts("salaries", "ar")) && /median/.test(pts("salaries", "en")) && /percentile/.test(pts("salaries", "en")), "the salary section explains percentiles and the median in both languages");
ok(/كما كتبها أصحابها/.test(pts("prefs", "ar")) && /exactly as their authors wrote them/.test(pts("prefs", "en")), "the guide says the language setting covers the interface only — content stays as written");
ok(/‎#a3f9/.test(gEng[0].points[0].ar), "the anonymous ID example keeps its # on the left inside Arabic text (left-to-right mark)");


  expect(fail, `${fail} failed check(s) — see the ✗ lines in the log`).toBe(0);
});
