// The client's match score follows the server's rule: the discipline is a hard requirement, decided before anything else.
import { describe, expect, it } from "vitest";
import { matchJob } from "../src/lib/helpers";
import { DISC } from "../src/domain/taxonomy";

const job = (disc: string) => ({ id: "j", title: "مهندس", disc, sub: "tech", pos: "mid", years: [3, 6], gov: "cairo", city: "nasr", mode: "site", type: "full" });
const member = (disc: string) => ({ role: "engineer", disc, track: "tech", pos: "mid", gov: "cairo", city: "nasr" });

describe("matchJob: discipline first", () => {
  it("the same discipline, same track, level and place: a perfect match", () => { const m = matchJob(job("civil"), member("civil"))!; expect(m.score).toBeGreaterThanOrEqual(85); expect(m.perfect).toBe(true); expect((m as any).mismatch).toBeUndefined(); });
  it("every other discipline scores zero — even with the same track, level, experience and city", () => {
    for (const [d] of DISC.filter((x: any) => x[0] !== "civil")) {
      const m: any = matchJob(job("civil"), member(d))!; expect([d, m.score, m.perfect, m.mismatch]).toEqual([d, 0, false, true]);
      expect(m.gaps).toEqual(["التخصّص"]); expect(m.parts).toHaveLength(1);   // experience and place were never weighed
    }
  });
  it("and the other way round: a mechanical job is nothing to a civil engineer", () => { expect(matchJob(job("mechanical"), member("civil"))!.score).toBe(0); expect(matchJob(job("electrical"), member("architecture"))!.score).toBe(0); });
  it("the lists that show «matching jobs» (score ≥ 40) therefore never contain another discipline", () => {
    const jobs = DISC.map((d: any) => job(d[0])); const shown = jobs.filter((j) => matchJob(j, member("civil"))!.score >= 40);
    expect(shown.map((j) => j.disc)).toEqual(["civil"]);
  });
  it("employer accounts have no match score at all", () => { expect(matchJob(job("civil"), { role: "hr", disc: "civil" })).toBeNull(); });
});
