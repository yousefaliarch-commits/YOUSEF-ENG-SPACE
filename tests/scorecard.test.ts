// src/domain/scorecard.ts — the demo applies the same privacy rules as public.company_scorecard()
import { describe, expect, it } from "vitest";
import { COMPANIES } from "../src/data/companies";
import { FACTORS, demoScorecard, nearest, scorecardOf } from "../src/domain/scorecard";

describe("scorecard", () => {
  it("a factor opens only from 5 different reviewers, each counted once (latest)", () => {
    const rows = [1, 2, 3, 4].map((i) => ({ by: "m" + i, at: i, scores: { pay: 4, site: 2 } }));
    expect(scorecardOf(rows).factors.pay).toEqual({ n: 4 });
    const twice = [...rows, { by: "m1", at: 9, scores: { pay: 1 } }];
    expect(scorecardOf(twice).n).toBe(4); expect(scorecardOf(twice).factors.pay.avg).toBeUndefined();
    const five = [...twice, { by: "m5", at: 10, scores: { pay: 5 } }];
    const s = scorecardOf(five); expect(s.factors.pay.avg).toBe(3.6); expect(s.factors.pay.good).toBe(80); expect(s.factors.site).toEqual({ n: 3 });
  });
  it("answers read worst → best and the average maps to the nearest answer", () => {
    expect(FACTORS.map((f) => f.id)).toEqual(["pay", "raises", "ontime", "overtime", "site"]); FACTORS.forEach((f) => expect(f.opts).toHaveLength(5));
    expect(nearest("pay", 3.2)).toBe("مثل السوق"); expect(nearest("ontime", 4.6)).toBe("دائمًا في موعده");
  });
  it("demo scorecards are deterministic and stay within 1–5", () => {
    const c = COMPANIES[0]; const a = demoScorecard(c), b = demoScorecard(c); expect(a).toEqual(b);
    for (const f of FACTORS) { const x = a.factors[f.id]; if (x.avg != null) { expect(x.avg).toBeGreaterThanOrEqual(1); expect(x.avg).toBeLessThanOrEqual(5); } }
  });
});
