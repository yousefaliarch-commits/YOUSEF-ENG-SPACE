// v21 logic tests: the English dictionary and translator (exact, patterns, plurals, segments, capitalisation, least-Arabic
// choice), language-aware formatting, money masking in English, search in English, and the scroll / tour / settings wiring.
// Ported from the prototype suite logic-test-v21.js — the checks are unchanged; the page scope is now tests/harness.
import { test, expect } from "vitest";
import * as H from "./harness";
const { C, store } = H;
const names = ["I18N", "i18nApply", "tr", "trCore", "isEn", "uiLocale", "loadLang", "saveLang", "LANGS", "DICT", "arResidue", "fillPattern", "maskMoney", "searchPosts", "buildSearchIndex", "POSTS0", "normalizeSeedPosts", "tourSteps", "guideSections", "SETTINGS_TOGGLES", "tourSeen", "markTourSeen", "UGC", "PLAIN_TYPES", "parseHash", "TABS", "tabsFor", "DEMO_PERSONA"];

test("v21 · the English dictionary and translator (exact, patterns, plurals, segments, capitalisation, least-Arabic", async () => {
let pass = 0, fail = 0; const ok = (c, m, extra?) => { if (c) { pass++; console.log("  ✓ " + m); } else { fail++; console.log("  ✗ " + m + (extra !== undefined ? "  → " + JSON.stringify(extra) : "")); } };
names.forEach((n) => { if (C[n] === undefined) { fail++; console.log("  ✗ missing export " + n); } });
const en = (s) => { C.I18N.lang = "en"; const t = C.trCore(s); return t; };

console.log("— the dictionary ships with the page —");
// (Phase 1) the brand board and device previews stayed in the prototype, and their ~170 strings with them
ok(C.DICT.exact.size > 2900 && C.DICT.pats.length > 300, `dictionary loaded: ${C.DICT.exact.size} exact strings, ${C.DICT.pats.length} patterns`);
ok(C.DICT.pats.every((p) => /[؀-ۿ]/.test(p.key)), "no pattern is made only of placeholders (it would match anything)");

console.log("— exact, patterns, plurals —");
ok(en("كل الوظائف") === "All jobs" && en("الرئيسية") === "Home" && en("المجتمع") === "Community", "exact strings: tabs and labels");
ok(en("مهندس موقع") === "Site Engineer" && en("المكتب الفني") === "Technical Office" && en("حصر، مستخلصات، لوحات تنفيذية") === "Quantity take-off, IPCs, shop drawings", "Egyptian engineering terms: Site Engineer, Technical Office, take-off, IPCs, shop drawings");
ok(en("1 رد") === "1 reply" && en("12 رد") === "12 replies", "plurals follow the number: 1 reply · 12 replies", [en("1 رد"), en("12 رد")]);
ok(en("7 سنوات خبرة") === "7 years of experience" && en("سنة خبرة") === "1 year of experience", "patterns with numbers", en("7 سنوات خبرة"));
ok(en("اليوم · 10:45 م") === "Today · 10:45 PM" && en("أمس · 9:12 م") === "Yesterday · 9:12 PM", "stored Arabic times read in English", en("اليوم · 10:45 م"));
ok(en("منذ 5 دقائق") === "5 minutes ago" && en("منذ 3 أيام") === "3 days ago", "relative times");

console.log("— composite strings and the least-Arabic rule —");
const med = en("متوسط مهندس مدني · مكتب فني · 3–5 سنوات · القاهرة الجديدة (التجمع) · القاهرة");
ok(med && C.arResidue(med) === 0 && /^Median Civil Engineer/.test(med), "a loosely matching pattern never beats a full translation", med);
const title = en("مهندس مدني · تصميم إنشائي · مهندس أول (Senior) · المعادي · القاهرة");
ok(title === "Civil Engineer · Structural design · Senior Engineer · Maadi · Cairo", "profile titles built from parts translate part by part", title);
ok(/^The post was temporarily hidden/.test(en("أُخفي المنشور مؤقتًا بعد بلاغات من عدة أعضاء — ينتظر مراجعة المشرفين.") || ""), "a sentence that opens with a placeholder is capitalised");
ok(en("«مفيد»") === "“Helpful”" && en("الإعدادات:") === "Settings:", "quotes and trailing punctuation are handled around a known string");
ok(C.trCore("أحمد") === null || C.trCore("أحمد") === "Ahmed", "an unknown string returns null (left as written)");
ok(C.arResidue("Reply to a٣ أحمد") === 4, "residue counts Arabic letters outside element markers only");

console.log("— language state —");
C.I18N.lang = "ar"; ok(C.tr("الرئيسية") === "الرئيسية" && !C.isEn() && C.uiLocale() === "ar-EG-u-nu-latn", "in Arabic tr() returns the source and dates use Latin digits");
C.I18N.lang = "en"; ok(C.tr("الرئيسية") === "Home" && C.isEn() && C.uiLocale() === "en-GB", "in English tr() translates and dates use en-GB");
ok(C.loadLang() === null, "no stored language → the first-launch picker shows");
C.saveLang("en"); ok(C.loadLang() === "en", "the chosen language is saved and restored on reload");
ok(C.LANGS.ar.dir === "rtl" && C.LANGS.en.dir === "ltr", "Arabic is right-to-left, English left-to-right");

console.log("— money in English —");
C.I18N.lang = "en"; const body = C.normalizeSeedPosts(C.POSTS0).find((p) => /17,000/.test(p.body)).body;
const shown = C.maskMoney(body); // v22: member text is never translated — it is masked as written
ok(C.tr(body) === body && /[ء-ي]/.test(shown) && /•••/.test(shown) && !/17,000/.test(shown), "restricted viewers get the post as written (Arabic) with the amount masked — also in English", shown.slice(0, 90));

console.log("— search understands English queries —");
C.I18N.lang = "en"; const posts = C.normalizeSeedPosts(C.POSTS0); const idx = C.buildSearchIndex(posts);
const r = C.searchPosts(posts, "salary Orascom", { index: idx });
ok(r.hits.length > 0 && r.hits.some((h) => /أوراسكوم/.test(h.post.body)), "an English query finds the Arabic seed post about Orascom salaries", r.hits.length);
C.I18N.lang = "ar";

console.log("— settings, guide, tour, routes —");
ok(C.PLAIN_TYPES.includes("settings") && C.PLAIN_TYPES.includes("guide"), "Settings and User guide are screens with their own routes (#app/settings, #app/guide)");
location.hash = "#app/settings"; ok(C.parseHash().stack[0].type === "settings", "a deep link opens Settings directly"); location.hash = "";
const mk = (role, access, isCo) => ({ profile: { ...C.DEMO_PERSONA, role }, moneyAccess: access, isCo, tabs: C.tabsFor({ role }), push() {}, setTab() {}, goMarket() {}, openSheet() {} });
const eng = C.tourSteps(mk("engineer", "full", false)), sup = C.tourSteps(mk("supervisor", "none", false)), hr = C.tourSteps(mk("hr", "aggregate", true));
ok(eng.length === 12 && eng.filter((s) => s.tab).length === 6, "engineer tour: welcome, tab bar, all 6 sections, theme, settings, account, done");
ok(sup.length === 9 && !sup.some((s) => s.tab === "market") && sup.some((s) => s.tab === "tools" && /Site tools/.test(s.title.en)) && /لا رواتب/.test(sup[1].body.ar) && /No salaries/.test(sup[1].body.en), "site-supervisor tour covers Community, site Tools and Messages only, and says there are no salaries");
ok(hr.find((s) => s.tab === "market").title.ar === "السوق — رؤية إجمالية", "HR / employer tour explains the aggregated market view");
ok(["theme", "settings", "profile", "tabbar"].every((t) => eng.some((s) => s.target === t)), "the tour spotlights the theme switch, Settings, the account button and the tab bar");
const gEng = C.guideSections(mk("engineer", "full", false)), gSup = C.guideSections(mk("supervisor", "none", false)), gCo = C.guideSections(mk("owner", "aggregate", true));
ok(gEng.some((s) => s.id === "salaries" && /الوسيط/.test(s.points.map((x) => x.ar).join(" ")) && /median/.test(s.points.map((x) => x.en).join(" "))), "the guide explains how to read salary bars (percentiles, median) for engineers");
ok(!gSup.some((s) => ["salaries", "jobs", "companies", "tools", "home"].includes(s.id)), "the guide never shows salary, job, company or tool sections to site supervisors");
ok(gCo.some((s) => s.id === "salaries" && /30/.test(s.points.map((x) => x.ar).join(" "))), "company accounts get the aggregate-only salary rules (30-contribution minimum)");
C.markTourSeen(); ok(C.tourSeen(), "finishing or skipping the tour is remembered — it auto-starts only once");
ok(C.UGC.translate === "no" && C.UGC.dir === "auto", "v22: all community content (seed included) is marked translate=no and laid out in its own direction");


  expect(fail, `${fail} failed check(s) — see the ✗ lines in the log`).toBe(0);
});
