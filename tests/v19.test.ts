// v19 logic tests: characters are fixed by specialty — one per engineering discipline / Syndicate division, site supervisor, HR and
// Ported from the prototype suite logic-test-v19.js — the checks are unchanged; the page scope is now tests/harness.
import { test, expect } from "vitest";
import * as H from "./harness";
const { C, store } = H;
const names = ["CHAR_SPECS", "SPEC_META", "GEARS", "PROPS", "OUTFITS", "EMBLEMS", "specOfPersona", "specOf", "specFromText", "characterName", "authorOf", "DEMO_PERSONA", "normalizeSeedPosts", "POSTS0", "flatten", "normalizeThreads", "THREADS0", "DISC", "Avatar", "CharacterGallery", "reducedMotion", "pickAuthor", "AUTHOR_FIELDS"];
const gone = ["AVATARS", "avatarOf", "avatarsFor", "randomAvatar", "nextAvatar", "avatarIndex"];

test("v19 · characters are fixed by specialty — one per engineering discipline / Syndicate division, site supervisor, HR and", async () => {
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log("  ✓ " + m); } else { fail++; console.log("  ✗ " + m); } };
names.forEach((n) => { if (C[n] === undefined) { fail++; console.log("  ✗ missing export " + n); } });

console.log("— one distinct character per specialty —");
ok(C.CHAR_SPECS.join() === "civil,architecture,mechanical,electrical,survey,chemical,mining,textile,supervisor,hr,owner", "11 characters: 5 disciplines + chemical, petroleum & mining, textile + site supervisor + HR + employer");
const metas = C.CHAR_SPECS.map((s) => C.SPEC_META[s]);
ok(new Set(metas.map((m) => m.hue)).size === 11 && new Set(metas.map((m) => m.gear)).size === 11 && new Set(metas.map((m) => m.prop)).size === 11, "each has its own colour, headgear and hologram tool");
ok(metas.every((m) => C.GEARS[m.gear] && C.PROPS[m.prop]), "every headgear and hologram is drawn");
ok(C.DISC.every(([d]) => C.CHAR_SPECS.includes(d)), "every market discipline has its character");
ok(new Set(C.CHAR_SPECS.flatMap((s) => [C.characterName(s, "male"), C.characterName(s, "female")])).size === 22, "22 distinct named characters (male and female for each)");
const hues = metas.map((m) => m.hue).sort((a, b) => a - b); const gaps = hues.map((h, i) => (i ? h - hues[i - 1] : 360 + h - hues[hues.length - 1])); ok(Math.min(...gaps) >= 12, `hues are spread around the wheel (closest pair ${Math.min(...gaps)}°)`);
ok(C.OUTFITS.owner && C.OUTFITS.hr && C.OUTFITS.supervisor && C.CHAR_SPECS.filter((s) => !C.SPEC_META[s].kind && s !== "supervisor").every((s) => C.EMBLEMS[s]), "employers and supervisors wear their outfit; engineers wear their discipline's emblem");

console.log("— tied to the profession, never random —");
ok(C.gone === undefined && ["AVATARS", "avatarOf", "avatarsFor", "randomAvatar", "nextAvatar", "avatarIndex"].every((n) => C[n] === undefined), "the random sets, the re-roll and the index picker no longer exist");
const base = { ...C.DEMO_PERSONA, role: "engineer" };
C.DISC.forEach(([d]) => ok(C.specOfPersona({ ...base, disc: d }) === d, `engineer · ${d} → ${C.characterName(d, "male")}`));
ok(C.specOfPersona({ ...base, disc: "civil", verified: true, division: "chemical" }) === "chemical" && C.specOfPersona({ ...base, disc: "mechanical", verified: true, division: "mining" }) === "mining" && C.specOfPersona({ ...base, disc: "civil", verified: true, division: "textile" }) === "textile", "a verified chemical / petroleum & mining / textile division gets its own character");
ok(C.specOfPersona({ ...base, disc: "civil", verified: false, division: "chemical" }) === "civil", "an unverified division changes nothing");
ok(C.specOfPersona({ ...base, disc: "architecture", verified: true, division: "architecture" }) === "architecture", "a division with a market discipline keeps the discipline's character");
ok(["supervisor", "hr", "owner"].every((r) => C.specOfPersona({ ...base, role: r, disc: "electrical" }) === r), "site supervisor, HR and employer each get their role's character whatever the stored discipline");
const a1 = C.authorOf({ ...base, disc: "survey", anon: "aaaa", avatar: 3 }, "anon"), a2 = C.authorOf({ ...base, disc: "survey", anon: "ffff", avatar: 9 }, "anon");
ok(C.specOf(a1) === "survey" && C.specOf(a2) === "survey", "the anonymous hash and any old stored avatar index have no effect");
const pub = C.authorOf({ ...base, disc: "mechanical" }, "public"), an = C.authorOf({ ...base, disc: "mechanical" }, "anon");
ok(pub.spec === "mechanical" && an.spec === "mechanical" && C.AUTHOR_FIELDS.includes("spec") && C.pickAuthor(an).spec === "mechanical", "every snapshot carries the specialty, so the same member looks the same everywhere");
ok(an.look === undefined && C.authorOf({ ...base, gender: "female" }, "anon").look === "hood" && C.authorOf({ ...base, gender: "female", look: "hair" }, "anon").look === "hair", "female look: techwear hood by default, hair on request — male characters carry no look");

console.log("— seeds and threads read the specialty from their title line —");
ok(C.specFromText("مهندسة معمارية · تصميم معماري") === "architecture" && C.specFromText("مهندس ميكانيكا · 6 سنوات") === "mechanical" && C.specFromText("مهندس كهرباء") === "electrical" && C.specFromText("مهندس مساحة · GIS") === "survey" && C.specFromText("مهندس كيميائي") === "chemical" && C.specFromText("مهندس بترول") === "mining" && C.specFromText("مهندسة غزل ونسيج") === "textile" && C.specFromText("مهندس مدني · مكتب فني") === "civil", "title lines map to specialties");
const people = C.normalizeSeedPosts(C.POSTS0).flatMap((p) => [p, ...C.flatten(p.comments || [])]);
ok(people.every((x) => C.CHAR_SPECS.includes(C.specOf(x))), `every seeded author gets a character (${people.length} authors)`);
ok(people.filter((x) => /معمار/.test(x.role || "")).every((x) => C.specOf(x) === "architecture") && people.filter((x) => x.userRole === "supervisor").every((x) => C.specOf(x) === "supervisor") && people.filter((x) => x.userRole === "hr").every((x) => C.specOf(x) === "hr"), "seeded architects, supervisors and HR show their own characters");
const threads = C.normalizeThreads([...C.THREADS0.engineer, ...C.THREADS0.company, ...C.THREADS0.supervisor]);
ok(threads.every((t) => C.specOf(t.with) === (t.with.role === "engineer" ? C.specFromText(t.with.title) : t.with.role)), "message partners show their role's or specialty's character");
ok(typeof C.reducedMotion() === "boolean", "reduced-motion check available to every animation");


  expect(fail, `${fail} failed check(s) — see the ✗ lines in the log`).toBe(0);
});
