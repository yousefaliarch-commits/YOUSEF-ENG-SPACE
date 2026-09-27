// v24 logic tests: verification rules, roles and the security flow.
//  · Employer accounts (HR, business owners) are never verified — their role badge («موارد بشرية» / «صاحب عمل») is the identity.
//  · Verification is optional for engineers (and site supervisors); a request is reviewed 100 % by hand in the admin console.
//  · The member sees only plain states; nothing reads, scores or judges the documents automatically.
//  · The document images are purged the moment a request is decided (approved or rejected), withdrawn, or 7 days old —
//    from the review queue and from the member's browser — and the promise is written on the submission screen.
// Ported from the prototype suite logic-test-v24.js — the checks are unchanged; the page scope is now tests/harness.
import { test, expect } from "vitest";
import * as H from "./harness";
const { C, store } = H;
const names = ["ROLES", "roleTitle", "can", "canVerifyRole", "isCompanyRole", "RoleBadge", "authorOf", "anonTitle", "credentialOf", "normalizeAuthor", "normalizeSeedPosts", "POSTS0", "JOBS", "buildAccounts", "DEFAULT_PERSONA", "DEMO_PERSONA", "TRUST_POLICY", "PERMS", "permNote",
  "DOC_SLOTS", "docSlots", "VERIFY_REJECT", "rejectOf", "credentialL2", "newVerifyRequest", "purgeRequest", "verifySummary", "saveOwnRequest", "loadOwnRequest", "dropOwnRequest", "seedVerifs", "verifs0", "VERIFY_KEY", "VERIFY_TTL_DAYS", "DEMO_DOCS", "docSrc", "prepDoc",
  "VX", "AV", "REVIEW_CHECKS", "VerifyCenter", "AdminView", "AppView", "storeFor", "liveState", "memberAccId", "savePersona", "setSession", "saveAccount", "SUPERVISOR_NOTIFS", "L2", "say", "divOf", "AUDIT_ACTIONS", "ADMIN_SECTIONS"];

test("v24 · verification rules, roles and the security flow", async () => {
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log("  ✓ " + m); } else { fail++; console.log("  ✗ " + m); } };
names.forEach((n) => { if (C[n] === undefined) { fail++; console.log("  ✗ missing export " + n); } });
const AR = /[؀-ۿ]/; const text = (el) => (el == null || el === false ? "" : typeof el === "string" || typeof el === "number" ? String(el) : Array.isArray(el) ? el.map(text).join("") : el.$el ? text(el.props.children) : "");
const find = (el, pred, seen = new Set()) => { if (!el || typeof el !== "object" || seen.has(el)) return null; seen.add(el); if (pred(el)) return el; const kids = Array.isArray(el) ? el : el.$el ? [...Object.values<any>(el.props || {})] : []; for (const k of kids) { const r = find(k, pred, seen); if (r) return r; } return null; };
const bilingual = (x) => x && typeof x.ar === "string" && AR.test(x.ar) && typeof x.en === "string" && x.en.trim() && !AR.test(x.en);
const eng = { ...C.DEFAULT_PERSONA, name: "أحمد سامي علي", email: "a@example.com", gender: "male", age: 30, gradYear: 2018, role: "engineer", disc: "civil", track: "site", pos: "mid", gov: "cairo", city: "newcairo", anon: "4f2c", pid: "u-test" };
const hr = { ...eng, role: "hr", companyName: "حسن علام", verified: true, verifyKind: "company" };
const owner = { ...eng, role: "owner", companyName: "مكتب تجريبي", verified: true, verifyKind: "company" };
const doc = (kind) => ({ kind, src: "data:image/jpeg;base64,AAAA", w: 1600, h: 1000 });

console.log("— 1 · employer accounts are never verified: the role badge is their identity —");
ok(C.roleTitle("owner", "male") === "صاحب عمل" && C.roleTitle("owner", "female") === "صاحبة عمل" && C.roleTitle("hr", "female") === "موارد بشرية", "owner reads «صاحب عمل / صاحبة عمل» (Employer), HR reads «موارد بشرية»");
ok(!C.canVerifyRole("hr") && !C.canVerifyRole("owner") && C.canVerifyRole("engineer") && C.canVerifyRole("supervisor"), "only engineers and site supervisors can be verified");
ok(!C.can(hr, "verify") && !C.can(owner, "verify") && C.can(eng, "verify") && C.PERMS.hr.verify === 0 && C.PERMS.owner.verify === 0, "employers have no verification permission at all");
ok(C.ROLES.filter((r) => C.isCompanyRole(r.id)).every((r) => r.needs === "none"), "the role list asks employers for nothing (no company e-mail or document)");
ok(!C.authorOf(hr, "anon").verified && C.authorOf(hr, "anon").verifyKind === null && !C.authorOf(owner, "public").verified, "an employer's items never carry a verification, even from an old profile that had one");
ok(C.credentialOf(hr) === null && C.anonTitle(hr) === "موارد بشرية" && C.anonTitle({ ...owner, gender: "female" }) === "صاحبة عمل", "no «verified employer» credential — the ghost line is the role alone");
const badgeTxt = (props) => text(C.RoleBadge(props));
ok(badgeTxt({ role: "hr", verified: true, gender: "male" }) === "موارد بشرية" && badgeTxt({ role: "owner", verified: true, gender: "female" }) === "صاحبة عمل", "the role badge shows «موارد بشرية» / «صاحبة عمل» — never «· موثّق»");
ok(/موثّق/.test(badgeTxt({ role: "engineer", verified: true, gender: "male" })) && /موثّق/.test(badgeTxt({ role: "supervisor", verified: true, gender: "male" })), "engineers and supervisors still show their verified badge");
const seedHr = C.normalizeSeedPosts(C.POSTS0).filter((p) => p.userRole === "hr" || p.userRole === "owner");
ok(seedHr.length >= 2 && seedHr.every((p) => !p.verified), "seeded HR and employer posts carry no verification");
const accs = C.buildAccounts({ posts: C.normalizeSeedPosts(C.POSTS0), jobs: C.JOBS, profile: null });
ok(accs.some((a) => C.isCompanyRole(a.role)) && accs.filter((a) => C.isCompanyRole(a.role)).every((a) => !a.verified), "the admin directory lists no verified employer account");
ok(/لا يلزم/.test(C.permNote("hr", "verify")) && /يدويًا/.test(C.permNote("engineer", "verify")), "the permissions map says: employers need none; engineers are reviewed by hand");

console.log("— 2 · what an engineer submits, and the written guarantee —");
ok(C.docSlots("engineer").join() === "card,cert" && C.docSlots("supervisor").join() === "letter", "engineers: Syndicate card + graduation certificate · supervisors: certificate or experience letter");
ok(C.VX.promise.en === "Verification is reviewed manually by our administration. Your uploaded documents are permanently deleted immediately after review and are never shared with anyone.", "the submission screen states the guarantee in the user's own words");
ok(/يدويًا/.test(C.VX.promise.ar) && /تُحذف المستندات .*نهائيًا فور انتهاء المراجعة/.test(C.VX.promise.ar) && /لا تُشارك مع أي أحد/.test(C.VX.promise.ar), "…and in Arabic: manual review, deleted for good right after review, never shared");
ok(C.VX.reading.en === "Reading submitted details…" && C.VX.pendingTitle.en === "Credentials under review" && C.VX.reading.ar === "جارٍ قراءة البيانات المرسلة…" && C.VX.pendingTitle.ar === "بياناتك قيد المراجعة", "the only processing states a member sees: «Reading submitted details…» then «Credentials under review»");
const vxAll = Object.values<any>(C.VX).filter((x) => x && typeof x === "object"); const avAll = [...Object.values<any>(C.AV).filter((x) => x && x.ar), ...C.AV.rules, ...Object.values<any>(C.AV.status), ...Object.values<any>(C.AV.who)];
ok(vxAll.length > 40 && vxAll.every(bilingual), `every member-side line is written in both languages (${vxAll.length})`);
ok(avAll.length > 50 && avAll.every(bilingual), `every admin-side line is written in both languages (${avAll.length})`);
ok(Object.values<any>(C.DOC_SLOTS).every((s) => bilingual(s.title) && bilingual(s.hint) && bilingual(s.short)) && C.VERIFY_REJECT.every(([, l]) => bilingual(l)) && [...C.REVIEW_CHECKS.engineer, ...C.REVIEW_CHECKS.supervisor].every(([, l]) => bilingual(l)), "document slots, rejection reasons and the review checklist are bilingual");
ok(/يراجعها فريق إدارة EngSpace يدويًا/.test(C.TRUST_POLICY[1].body) && /قُبل الطلب أو رُفض — تُحذف الصور تلقائيًا ونهائيًا/.test(C.TRUST_POLICY[1].body) && /لا نحتفظ بأي نسخة/.test(C.TRUST_POLICY[1].body), "the written trust policy: reviewed by hand, deleted automatically and permanently after review, no copy kept");

console.log("— 3 · nothing is read or judged automatically —");
const src = H.src;
ok(!/\b(analyzeCard|judgeCard|detectCardOn|judgeDoc|readCardFields|readDocFields|detectDivision|DivisionPicker|SyndicateVerify|CertificateVerify)\b/.test(src), "the old on-device card detector, document judge and OCR reader are gone from the page");
ok(!/ocr|recognize|Tesseract/i.test(C.prepDoc.toString()) && /processImage/.test(C.prepDoc.toString()), "a submitted image is only re-encoded (no EXIF, ≤ 1600 px) — no OCR, no scoring");
const vcSrc = src.slice(src.indexOf("function VerifyCenter"), src.indexOf("function VerifyCenter") + 6000);
ok(!/محاكاة|OCR|ELA|Laplacian|الوضوح \d|تحليل/.test(vcSrc), "the member's screens mention no internal steps (no simulated checks, OCR, sharpness or analysis log)");

console.log("— 4 · a request: submit → under review → decided, and the purge —");
const r = C.newVerifyRequest(eng, [doc("card"), doc("cert")]);
ok(/^V-[0-9A-F]{6}$/.test(r.id) && r.status === "pending" && r.mine && r.acc === C.memberAccId(eng) && r.kinds.join() === "card,cert" && r.docs.length === 2 && r.name === "أحمد سامي علي", "a new request: its own number, pending, the account id, both documents and the account name to compare");
ok(!("anon" in r) && !JSON.stringify(r).includes(eng.anon), "the request never carries the member's anonymous handle");
C.DEMO_DOCS.set(r.id + ":0", "x"); const done = C.purgeRequest(r, "approved", { decision: { by: "self", at: 5 } }, 10);
ok(done.docs.length === 0 && done.purged === 2 && done.purgedAt === 10 && done.status === "approved" && done.kinds.join() === "card,cert" && !C.DEMO_DOCS.has(r.id + ":0"), "the purge empties the documents (and any drawn copy) and records how many and when");
ok(!/data:image|base64/.test(JSON.stringify(done)) && !/data:image|base64/.test(JSON.stringify(C.verifySummary(r))), "after the purge — and in the profile's summary — no image data remains anywhere");
const again = C.purgeRequest(done, "approved", {}, 20); ok(again.purged === 2 && again.purgedAt === 10, "purging twice changes nothing");

console.log("— 5 · this browser holds the member's pending request only until it ends —");
ok(C.saveOwnRequest(r) === false && localStorage.getItem(C.VERIFY_KEY) === null, "without a signed-in session nothing is written to the browser");
C.setSession(true); ok(C.saveOwnRequest(r) === true && C.loadOwnRequest().id === r.id, "a signed-in member's pending request survives a reload");
C.savePersona({ ...eng, pending: true, verifyRef: r.id }); let q = C.verifs0(); ok(q[0].id === r.id && q[0].mine && q[0].docs.length === 2 && q[0].status === "pending", "on start the queue restores it for the admin to review");
C.savePersona({ ...eng, pid: "u-other", pending: true, verifyRef: r.id }); q = C.verifs0(); ok(!q.some((x) => x.id === r.id) && localStorage.getItem(C.VERIFY_KEY) === null, "a copy that is not this account's open request is erased on start");
const old = { ...r, id: "V-0LD000", at: Date.now() - (C.VERIFY_TTL_DAYS + 1) * 864e5 }; C.saveOwnRequest(old); C.savePersona({ ...eng, pending: true, verifyRef: old.id }); q = C.verifs0();
ok(q[0].id === old.id && q[0].status === "expired" && q[0].docs.length === 0 && q[0].purged === 2 && localStorage.getItem(C.VERIFY_KEY) === null, `unreviewed for ${C.VERIFY_TTL_DAYS} days: the documents are erased and the request ends as «expired»`);
C.dropOwnRequest(); C.setSession(false); C.savePersona(null);

console.log("— 6 · the review queue —");
const seeds = C.seedVerifs(); const pend = seeds.filter((x) => x.status === "pending");
ok(pend.length >= 4 && pend.every((x) => x.docs.length > 0 && x.docs.every((d) => d.demo && !d.src)), "seeded requests wait with demo documents (invented data, drawn only when a reviewer opens them)");
ok(pend.some((x) => x.role === "supervisor") && pend.some((x) => x.docs.some((d) => d.demo.blur)) && pend.some((x) => x.docs.some((d) => d.demo.nameOnDoc && d.demo.nameOnDoc !== x.name)), "the queue includes a supervisor, a blurry card and a name mismatch — cases a reviewer must catch");
ok(seeds.filter((x) => x.status !== "pending").every((x) => x.docs.length === 0 && x.purged > 0 && x.decision), "decided requests keep only the decision — their documents are gone");
ok(C.ADMIN_SECTIONS.some((s) => s[0] === "verify") && ["verify-ok", "verify-no", "purge", "verify-out"].every((k) => C.AUDIT_ACTIONS[k]), "the console has a «طلبات التوثيق» section and audits approvals, rejections, purges and withdrawals");
ok(C.REVIEW_CHECKS.engineer.length === 3 && C.REVIEW_CHECKS.engineer[0][0] === "name", "a reviewer confirms three points before approving: the name matches, the document is genuine, the fields are legible");

console.log("— 7 · a reviewer's decision (admin console, live store) —");
const S = C.storeFor("app"); S.reset(); const L = C.liveState(); L.noDemo = false;
const mine = C.newVerifyRequest(C.DEMO_PERSONA, [doc("card"), doc("cert")]);
S.set("verifs", [mine, ...C.seedVerifs()]); S.set("persona", { ...C.DEMO_PERSONA, pending: true, verifyRef: mine.id, verifyReq: C.verifySummary(mine) });
const adminA = () => { const tree = C.AdminView({ init: { section: "verify" }, openApp() {} }); const el = find(tree, (e) => e.$el && e.props && e.props.A); return el && el.props.A; };
let A = adminA(); ok(!!A && A.verifs.some((x) => x.id === mine.id), "the member's request appears in the review queue at once");
A.decideVerify(A.verifs.find((x) => x.id === mine.id), { approve: true, division: "architecture", gradYear: 2017, kind: "syndicate" });
let v = S.get("verifs").find((x) => x.id === mine.id); let pr = S.get("persona"); let notifs = S.get("notifs"); let audit = S.get("audit");
ok(v.status === "approved" && v.docs.length === 0 && v.purged === 2 && v.decision.division === "architecture", "approve: the request is approved and its two documents purged in the same step");
ok(pr.verified && !pr.pending && pr.verifyKind === "syndicate" && pr.division === "architecture" && pr.gradYear === 2017 && pr.verifyReq.status === "approved" && pr.verifyReq.purged === 2, "the member's profile gets the badge, the division and graduation year as written on the document");
ok(notifs[0].kind === "verify" && /وُثّق/.test(notifs[0].title) && /حُذفت المستندات نهائيًا/.test(notifs[0].body) && /permanently deleted/.test(notifs[0].en.body) && notifs[0].target.sheet === "verify", "the member is told — in both languages — that the documents were deleted");
ok(audit[0].action === "purge" && audit[1].action === "verify-ok" && /\(2\)/.test(audit[0].detail), "the audit log records the decision and the purge");
ok(C.divOf(pr.division) && C.anonTitle(pr).includes("عضوية نقابة موثّقة"), "the anonymous line now says «عضوية نقابة موثّقة»");
// rejection of a seeded request (not the signed-in member): purge, no profile change
A = adminA(); const blurry = A.verifs.find((x) => x.status === "pending" && x.docs.some((d) => d.demo && d.demo.blur)); const before = S.get("persona");
A.decideVerify(blurry, { approve: false, reason: "unclear", note: "صوّر الكارنيه في إضاءة أفضل" }); v = S.get("verifs").find((x) => x.id === blurry.id);
ok(v.status === "rejected" && v.docs.length === 0 && v.purged === 1 && v.decision.reason === "unclear" && S.get("persona") === before, "reject: documents purged, the reason recorded, nobody else's profile touched");
ok(S.get("mod").users[blurry.acc] && S.get("mod").users[blurry.acc].verified === false, "the rejected account stays unverified in the directory");
// a moderator can take a badge away, never grant one without documents
A = adminA(); const me = A.accounts.find((a) => a.member); A.setVerified(me, true); ok(S.get("persona").verified === true && S.get("audit")[0].action === "purge", "granting a badge from the member page does nothing — only a document review grants it");
A.setVerified(me, false); ok(S.get("persona").verified === false && S.get("audit")[0].action === "unverify" && S.get("notifs")[0].kind === "verify", "revoking works, is audited, and the member is told");
const emp = A.accounts.find((a) => C.isCompanyRole(a.role)); const auditLen = S.get("audit").length; A.setVerified(emp, false); ok(S.get("audit").length === auditLen, "employer accounts have no badge to grant or revoke");

console.log("— 8 · the member's side (app, live store) —");
S.reset(); L.noDemo = false; const init = { view: "app", tab: "home", stack: [], market: "salaries", skipOnboarding: true };
const appOf = () => { const tree = C.AppView({ init, theme: "dark", setTheme() {}, mode: "dark", lang: "ar", setLang() {}, langChosen: true }); const el = find(tree, (e) => e.$el && e.props && e.props.app && e.props.app.submitVerification); return el && el.props.app; };
let app = appOf(); ok(!!app && app.profile.role === "engineer" && !app.profile.pending, "the demo engineer starts unverified, nothing pending");
const id = app.submitVerification([doc("card")]); app = appOf();
ok(app.profile.pending && app.profile.verifyRef === id && app.verifs.some((x) => x.id === id && x.status === "pending" && x.docs.length === 1), "submitting puts the request in the queue and the profile «under review»");
ok(app.profile.verifyReq && !/data:image/.test(JSON.stringify(app.profile)), "the profile keeps a summary of the request — never the image");
app.withdrawVerification(); app = appOf(); v = app.verifs.find((x) => x.id === id);
ok(!app.profile.pending && app.profile.verifyReq.status === "withdrawn" && v.status === "withdrawn" && v.docs.length === 0 && v.purged === 1, "withdrawing ends the request and purges its document");
ok(S.get("audit")[0].action === "verify-out" && /حُذفت المستندات \(1\)/.test(S.get("audit")[0].detail), "the withdrawal is audited with the purge");
ok(C.SUPERVISOR_NOTIFS.includes("verify"), "site supervisors receive verification notices too");


  expect(fail, `${fail} failed check(s) — see the ✗ lines in the log`).toBe(0);
});
