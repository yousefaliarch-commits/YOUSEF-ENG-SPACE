// v14 logic tests: registration validation, password hashing, dual identity (public vs anonymous), seed normalisation,
// Ported from the prototype suite logic-test-v14.js — the checks are unchanged; the page scope is now tests/harness.
import { test, expect } from "vitest";
import nodeCrypto from "node:crypto";
import * as H from "./harness";
const { C, store } = H;
const names = ["emailError", "passwordError", "passwordChecks", "passwordScore", "confirmError", "nameError", "ageError", "gradError", "sha256hex", "hashSecret", "createAccountRecord", "checkPassword", "authorOf", "anonTitle", "publicTitle", "yearsText", "expYears", "credentialOf", "seedAnonLine", "normalizeSeedPosts", "normalizeThreads", "THREADS0", "normalizeAuthor", "authorKey", "sameAuthor", "isSelf", "pickAuthor", "POSTS0", "DEMO_PERSONA", "DEFAULT_PERSONA", "dmRule", "applyReaction", "THIS_YEAR", "GOVS", "CITIES", "saveAccount", "loadAccount", "setSession", "hasSession", "loadPersona", "savePersona", "displayName", "TRUST_POLICY", "can", "PUB_MONA", "COMPANIES"];

test("v14 · registration validation, password hashing, dual identity (public vs anonymous), seed normalisation,", async () => {
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log("  ✓ " + m); } else { fail++; console.log("  ✗ " + m); } };

await (async () => {
  console.log("— registration validation —");
  ok(C.emailError("") && C.emailError("mona@") && !C.emailError("mona.sherif@example.com"), "e-mail: empty and malformed rejected, valid accepted");
  ok(C.passwordError("abc") && C.passwordError("abcdefgh") && C.passwordError("12345678") && !C.passwordError("Engineer2026"), "password: needs 8+ chars, a letter and a digit");
  ok(C.passwordScore("") === 0 && C.passwordScore("abc12345") === 3 && C.passwordScore("abc12345!") === 4, "strength meter 0 → 3 → 4");
  ok(C.confirmError("Engineer2026", "Engineer2025") && !C.confirmError("Engineer2026", "Engineer2026"), "confirmation must match");
  ok(!C.nameError("منى أحمد الشريف") && !C.nameError("Mona El-Sherif") && C.nameError("منى") && C.nameError("منى 2") && C.nameError(""), "full name: two parts, letters only (Arabic or Latin)");
  ok(!C.ageError("29") && C.ageError("17") && C.ageError("80") && C.ageError("") && C.ageError("2.5"), "age: whole years between 18 and 75");
  ok(!C.gradError(String(C.THIS_YEAR - 5), "29") && C.gradError("1950", "29") && C.gradError(String(C.THIS_YEAR - 20), "29"), "graduation year: in range and consistent with age");

  console.log("— password storage —");
  const secret = "Test-" + Math.random().toString(36).slice(2) + "9";
  const acc = await C.createAccountRecord(" Mona@Example.com ", secret);
  ok(acc.email === "mona@example.com", "e-mail normalised to lower case");
  ok(acc.algo === "PBKDF2-SHA256" && acc.iter >= 100000 && /^[0-9a-f]{64}$/.test(acc.hash) && /^[0-9a-f]{32}$/.test(acc.salt), "PBKDF2-SHA256, ≥100k iterations, 256-bit hash, 128-bit random salt");
  ok(!JSON.stringify(acc).includes(secret), "the stored record never contains the password");
  ok(await C.checkPassword(acc, secret), "correct password verifies");
  ok(!(await C.checkPassword(acc, secret + "x")) && !(await C.checkPassword(acc, "")), "wrong or empty password rejected");
  const acc2 = await C.createAccountRecord("mona@example.com", secret); ok(acc2.salt !== acc.salt && acc2.hash !== acc.hash, "same password, different salt → different hash");
  for (const s of ["", "abc", "مهندس مدني", "x".repeat(200)]) ok(C.sha256hex(s) === nodeCrypto.createHash("sha256").update(s, "utf8").digest("hex"), "fallback SHA-256 matches Node for " + JSON.stringify(s.slice(0, 12)));
  // the page ran a second time with WebCrypto minus `subtle` (an insecure context); the modules read `crypto` per call now
  const realCrypto = Object.getOwnPropertyDescriptor(globalThis, "crypto"); const noSubtle = C;
  Object.defineProperty(globalThis, "crypto", { value: { getRandomValues: (a) => nodeCrypto.webcrypto.getRandomValues(a) }, configurable: true, writable: true });
  try {
    const accF = await noSubtle.createAccountRecord("a@b.co", secret); ok(accF.algo === "SHA256-x3000" && (await noSubtle.checkPassword(accF, secret)) && !(await noSubtle.checkPassword(accF, "nope")), "without WebCrypto: iterated SHA-256 fallback still verifies");
  } finally { Object.defineProperty(globalThis, "crypto", realCrypto); }

  console.log("— dual identity —");
  const p = { ...C.DEFAULT_PERSONA, name: "منى أحمد الشريف", email: "mona@example.com", gender: "female", age: 31, gradYear: C.THIS_YEAR - 5, role: "engineer", disc: "civil", track: "bim", pos: "senior", gov: "giza", city: "zayed", verified: true, verifyKind: "syndicate", anon: "a7f3", pid: "u-123" };
  const an = C.authorOf(p, "anon", 2), pu = C.authorOf(p, "public", 2);
  ok(C.anonTitle(p) === "مهندسة مدنية · 5 سنوات خبرة · عضوية نقابة موثّقة", "ghost line: " + C.anonTitle(p));
  ok(C.anonTitle({ ...p, gender: "male" }) === "مهندس مدني · 5 سنوات خبرة · عضوية نقابة موثّقة", "male form: مهندس مدني · 5 سنوات خبرة · عضوية نقابة موثّقة");
  ok(C.anonTitle({ ...p, verifyKind: "certificate" }).endsWith("شهادة هندسية موثّقة") && !C.anonTitle({ ...p, verified: false }).includes("موثّق"), "credential follows the verification (certificate / none)");
  ok(C.anonTitle({ ...p, role: "hr", verifyKind: "company", gender: "male" }) === "موارد بشرية", "company account ghost line: the role only — no years, never a verification (v24)");
  const anonJson = JSON.stringify(an);
  ok(!("name" in an) && !("pid" in an) && !("age" in an) && !("gradYear" in an) && !("email" in an), "anonymous snapshot carries no name, profile id, age, graduation year or e-mail");
  ok(!anonJson.includes("منى") && !anonJson.includes("الشيخ زايد") && !anonJson.includes("الجيزة") && !anonJson.includes("31") && !anonJson.includes("mona"), "…and no trace of the name, city, governorate, age or e-mail anywhere in it");
  ok(!("anon" in pu) && !("avatar" in pu) && pu.name === "منى أحمد الشريف" && pu.age === 31 && pu.gradYear === C.THIS_YEAR - 5 && /الشيخ زايد/.test(pu.role), "public snapshot: full name, age, graduation year, full title with city — and no hash or cartoon");
  ok(!C.sameAuthor(an, pu) && C.authorKey(an) !== C.authorKey(pu), "the member's anonymous and public items are different authors");
  ok(C.isSelf(an, p) && C.isSelf(pu, p) && !C.isSelf({ as: "anon", anon: "ffff" }, p), "own items recognised in both identities, others not");
  ok(C.displayName(pu) === "م. منى أحمد الشريف" && C.displayName({ ...pu, userRole: "hr" }) === "منى أحمد الشريف", "engineers get the م. honorific");
  const picked = C.pickAuthor({ ...an, body: "x", comments: [1], replies: [2] }); ok(!("body" in picked) && !("comments" in picked) && picked.anon === "a7f3", "profile sheet receives author fields only");
  ok(C.dmRule(p, { as: "public", pid: "u-123", role: "engineer" }).why === "هذا أنت" && C.dmRule(p, { as: "anon", anon: "a7f3", role: "engineer" }).why === "هذا أنت" && C.dmRule(p, { as: "public", pid: "u-9", role: "engineer", dm: true }).ok, "messaging rule detects yourself in either identity");

  console.log("— seed data —");
  ok(C.seedAnonLine("مهندس مدني · مكتب فني · مهندس (Mid-level) · القاهرة الجديدة · القاهرة") === "مهندس مدني · 4 سنوات خبرة · عضوية نقابة موثّقة", "seed line reduced: " + C.seedAnonLine("مهندس مدني · مكتب فني · مهندس (Mid-level) · القاهرة الجديدة · القاهرة"));
  ok(C.seedAnonLine("موارد بشرية · مقاولات عامة · القاهرة الجديدة · القاهرة", "hr", false) === "موارد بشرية · مقاولات عامة", "company seed line keeps role + sector only");
  ok(C.seedAnonLine("مهندس مدني · تصميم · 7 سنوات") === "مهندس مدني · 7 سنوات خبرة · عضوية نقابة موثّقة", "review seed with explicit years");
  const posts = C.normalizeSeedPosts(C.POSTS0); const all = posts.flatMap(function f(x) { return [x, ...(x.comments || []).flatMap(f), ...(x.replies || []).flatMap(f)]; });
  const places = new Set([...C.GOVS.map((g) => g[1]), ...Object.values<any>(C.CITIES).flat().map((c) => c[1].replace(/\s*\(.*\)$/, ""))].filter((s) => s.length >= 4));
  const leaks = all.filter((x) => x.as === "anon" && [...places].some((pl) => x.role.includes(pl)));
  ok(all.every((x) => x.as === "anon" || x.as === "public"), "every seeded item has an identity (" + all.length + " items)");
  ok(leaks.length === 0, "no anonymous seed author shows a city or governorate" + (leaks.length ? ": " + leaks.slice(0, 3).map((x) => x.role).join(" | ") : ""));
  const pubs = all.filter((x) => x.as === "public"); ok(pubs.length >= 3 && pubs.every((x) => x.name && x.pid && !x.anon), "public seed items (" + pubs.length + ") carry a name and profile id, never a hash");
  ok(all.filter((x) => x.as === "anon").every((x) => typeof x.verified === "boolean"), "anonymous seeds have an explicit verified flag");
  ok(all.filter((x) => x.as === "anon" && x.userRole === "hr").every((x) => x.verified === false), "seeded HR accounts are not shown as verified");
  const th = C.normalizeThreads(C.THREADS0.engineer); ok(th.every((t) => t.meAs === "anon" && t.with.as === "anon" && !/مدينة نصر|القاهرة/.test(t.with.title)), "seeded threads: anonymous both ways, ghost titles");

  console.log("— storage & session —");
  C.saveAccount(acc); C.savePersona({ ...p }); C.setSession(true);
  ok(C.loadAccount().hash === acc.hash && C.hasSession() && C.loadPersona().name === "منى أحمد الشريف", "account, profile and session round-trip");
  C.setSession(false); ok(!C.hasSession() && C.loadAccount(), "sign-out ends the session, keeps the account for sign-in");
  C.saveAccount(null); C.savePersona(null); ok(!C.loadAccount() && !C.loadPersona(), "delete removes account and profile");
  ok(!Object.values<any>(store).join("").includes(secret), "nothing in storage contains the password");

  console.log("— rules —");
  ok(C.can({ role: "engineer" }, "verify") && C.can({ role: "supervisor" }, "verify") && !C.can({ role: "hr" }, "verify"), "verification offered to every engineering role, optional");
  ok(C.TRUST_POLICY.length === 3 && /أي صاحب عمل أو جهة حكومية أو شركة توظيف أو أي طرف ثالث/.test(C.TRUST_POLICY[0].body) && /يراجعها فريق إدارة EngSpace يدويًا/.test(C.TRUST_POLICY[1].body) && /فور انتهاء المراجعة — قُبل الطلب أو رُفض — تُحذف الصور تلقائيًا ونهائيًا/.test(C.TRUST_POLICY[1].body) && /لا تُشارك مع أي أحد/.test(C.TRUST_POLICY[1].body) && /لا اسم ولا عمر ولا بيانات تواصل/.test(C.TRUST_POLICY[2].body), "the three written commitments are present word for word");
  let m = C.applyReaction({}, "agree"); m = C.applyReaction(m, "disagree"); ok(m.disagree && !m.agree, "reactions unchanged: agree/disagree still exclusive");

})();

  expect(fail, `${fail} failed check(s) — see the ✗ lines in the log`).toBe(0);
});
