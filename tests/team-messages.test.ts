// Team threads: «فريق EngSpace» writes to any member, and every member — whatever the role — can answer it.
import { test, expect } from "vitest";
import { dmRule } from "../src/domain/taxonomy";

const team = { as: "public", pid: "team", team: true, role: "staff" };
for (const role of ["engineer", "supervisor", "hr", "owner"]) {
  test(`a ${role} can answer the platform team`, () => {
    expect(dmRule({ role, anon: "aaaa", pid: "p1" }, team, { team: true }).ok).toBe(true);
    expect(dmRule({ role, anon: "aaaa", pid: "p1" }, team).ok).toBe(true);
  });
}
test("the admin side of a team thread can always write to the member", () => {
  expect(dmRule({ role: "engineer", anon: "bbbb", pid: "p2" }, { as: "public", pid: "p3", role: "supervisor", dm: false }, { team: true }).ok).toBe(true);
});
test("ordinary rules still apply outside team threads", () => {
  expect(dmRule({ role: "owner", anon: "aaaa" }, { as: "anon", anon: "cccc", role: "engineer", openToRecruiters: false }).ok).toBe(false);
});
