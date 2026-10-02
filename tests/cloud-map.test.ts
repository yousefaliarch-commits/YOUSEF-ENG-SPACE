// src/backend/map.ts: server rows → the app's shapes, and back. No network.
import { describe, expect, it } from "vitest";
import { authorFields, commentTree, jobOf, jobRow, postOf, postRow, profilePatch, shareRow, yearsOfBand } from "../src/backend/map";
import { THIS_YEAR } from "../src/domain/identity";

const anonSnap = { as: "anon", anon: "a1b2c3", gender: "male", userRole: "engineer", disc: "civil", years: 4, verified: true, verifyKind: "syndicate", level: 1 };
const pubSnap = { as: "public", pid: "u-1", name: "منى خالد", gender: "female", userRole: "engineer", disc: "civil", track: "tech", pos: "mid", gov: "cairo", gradYear: 2016, verified: false };
const T = new Date(Date.now() - 2 * 3600e3).toISOString();

describe("author snapshots", () => {
  it("anonymous: the ghost-mode title, never a name", () => {
    const a = authorFields(anonSnap, "posts:x");
    expect(a).toMatchObject({ as: "anon", anon: "a1b2c3", verified: true, ref: "posts:x" });
    expect(a.role).toBe("مهندس مدني · 4 سنوات خبرة · عضوية نقابة موثّقة");
    expect(a.name).toBeUndefined(); expect(a.pid).toBeUndefined();
  });
  it("public: name and the full professional title", () => {
    const a = authorFields(pubSnap);
    expect(a).toMatchObject({ as: "public", pid: "u-1", name: "منى خالد", gradYear: 2016 });
    expect(a.role).toContain("مكتب فني");
  });
});

describe("posts", () => {
  it("own reaction and ballot are taken out of the totals (the UI adds them back)", () => {
    const p = postOf({ id: "p", room: "tech", type: "poll", body: "?", author: anonSnap, data: { poll: { q: "أيهما؟", options: ["Revit", "AutoCAD"] } },
      reactions: { agree: 3, disagree: 0, useful: 5 }, tally: { 0: 4, 1: 2 }, created_at: T }, [], { reacts: { agree: true, useful: true }, ballot: 0 });
    expect(p.reactions).toEqual({ agree: 2, disagree: 0, useful: 4 });
    expect(p.poll.options).toEqual([["Revit", 3], ["AutoCAD", 2]]);
    expect(p.when).toBe("منذ ساعتين");
  });
  it("a vote post maps ballots 0/1 to yes/no", () => {
    const p = postOf({ id: "v", type: "vote", body: "أقبل؟", author: anonSnap, data: { vote: { ends: "ينتهي بعد 24 ساعة" } }, tally: { 0: 7, 1: 3 }, created_at: T });
    expect(p.vote).toEqual({ ends: "ينتهي بعد 24 ساعة", yes: 7, no: 3 });
  });
  it("postRow never sends an author or counters", () => {
    const r = postRow({ room: "tech", type: "poll", body: "x", poll: { q: "q", options: [["A", 0], ["B", 0]] }, author: { name: "fake" }, reactions: { agree: 99 } }, "public");
    expect(r).toEqual({ room: "tech", type: "poll", body: "x", data: { poll: { q: "q", options: ["A", "B"] } }, author_mode: "public", dm: true });
  });
  it("comments become a reply tree, oldest first", () => {
    const rows = [
      { id: "c2", parent_id: "c1", text: "رد", author: anonSnap, created_at: new Date(Date.now() - 60e3).toISOString() },
      { id: "c1", parent_id: null, text: "تعليق", author: pubSnap, created_at: T },
    ];
    const tree = commentTree(rows);
    expect(tree.map((c) => c.id)).toEqual(["c1"]); expect(tree[0].replies.map((c: any) => c.id)).toEqual(["c2"]);
    expect(tree[0].ref).toBe("comments:c1");
  });
});

describe("jobs, shares, profile", () => {
  it("a job's year range round-trips through Postgres int4range", () => {
    expect(jobRow({ title: "t", gov: "cairo", disc: "civil", years: [3, 5] }).years).toBe("[3,5]");
    expect(jobOf({ id: "j", years: "[3,6)", created_at: T }).years).toEqual([3, 5]);
  });
  it("a salary share keeps the lower bound of its experience band", () => {
    expect(yearsOfBand("3-5")).toBe(3); expect(yearsOfBand("12+")).toBe(12); expect(yearsOfBand(undefined)).toBe(0);
    expect(shareRow({ disc: "civil", exp: "5-8", salary: "21000", as: "anon" })).toMatchObject({ years: 5, salary: 21000, author_mode: "anon" });
  });
  it("profilePatch writes member columns only — never verification, staff or standing", () => {
    const out = profilePatch({ name: "x", gradYear: "2019", verified: true, staff: "admin", strikes: 0, notify: false, identity: "public" });
    expect(out).toEqual({ name: "x", grad_year: 2019, default_identity: "public", settings: { notify: false } });
    expect(THIS_YEAR).toBeGreaterThan(2025);
  });
});
