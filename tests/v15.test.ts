// v15 logic tests (v24): the Syndicate divisions (الشعب) and how a reviewed division maps to the member's specialty and titles.
// The on-device reader of cards and certificates (v15) was retired in v24: an admin reviews every document by hand.
// Ported from the prototype suite logic-test-v15.js — the checks are unchanged; the page scope is now tests/harness.
import { test, expect } from "vitest";
import * as H from "./harness";
const { C, store } = H;
const names = ["DIVISIONS", "divOf", "divisionForDisc", "discForDivision", "divConflict", "divTitle", "authorOf", "anonTitle", "publicTitle", "DEFAULT_PERSONA", "THIS_YEAR", "detectDivision", "readCardFields", "DivisionPicker"];

test("v15 · v15 logic tests (v24): the Syndicate divisions (الشعب) and how a reviewed division maps to the member's specialty and titles", async () => {
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log("  ✓ " + m); } else { fail++; console.log("  ✗ " + m); } };

console.log("— v24: the division is set by the admin who reviewed the documents — nothing reads it automatically —");
ok(C.DIVISIONS.length === 7 && C.DIVISIONS.map((d) => d.id).join() === "civil,architecture,mechanical,electrical,chemical,mining,textile", "seven divisions: civil, architecture, mechanical, electrical, chemical, mining & petroleum, textile");
ok(C.DIVISIONS.every((d) => d.label && d.short && d.m && d.f && d.note), "every division has its label, short name, both titles and scope note");
ok(C.detectDivision === undefined && C.readCardFields === undefined && C.DivisionPicker === undefined, "the automatic reader of cards and certificates is gone (v24: 100 % manual review)");

console.log("— mapping to the member's specialty and titles —");
ok(C.divisionForDisc("survey") === "civil" && C.divisionForDisc("architecture") === "architecture" && C.divisionForDisc("x") === null, "registered specialty → its division (survey sits in civil)");
ok(C.discForDivision("civil", "survey") === "survey" && C.discForDivision("civil", "civil") === "civil" && C.discForDivision("civil", "mechanical") === "civil", "civil division keeps survey for surveyors");
ok(C.discForDivision("chemical", "mechanical") === null, "chemical has no market discipline → specialty kept");
const c1 = C.divConflict("architecture", "civil"); ok(c1.conflict && c1.mapped === "architecture", "division architecture, registered civil → offer to update the specialty");
ok(!C.divConflict("civil", "survey").conflict && !C.divConflict("civil", "civil").conflict && !C.divConflict("chemical", "mechanical").conflict, "no conflict when the division already covers the specialty");
const chem = { ...C.DEFAULT_PERSONA, name: "منى أحمد الشريف", gender: "female", age: 30, gradYear: 2018, role: "engineer", disc: "mechanical", track: "site", pos: "senior", verified: true, verifyKind: "syndicate", division: "chemical", anon: "b1c2", pid: "u-9" };
ok(C.divTitle(chem) === "مهندسة كيميائية" && /^مهندسة كيميائية · /.test(C.anonTitle(chem)) && /^مهندسة كيميائية · /.test(C.publicTitle(chem)), "a verified chemical engineer is titled «مهندسة كيميائية» in both identities");
ok(C.divTitle({ ...chem, verified: false }) === null, "an unverified division never changes the title");
const an = C.authorOf(chem, "anon"), pu = C.authorOf(chem, "public"); ok(an.division === "chemical" && pu.division === "chemical" && !("name" in an), "the verified division travels with both identities; the anonymous one still has no name");


  expect(fail, `${fail} failed check(s) — see the ✗ lines in the log`).toBe(0);
});
