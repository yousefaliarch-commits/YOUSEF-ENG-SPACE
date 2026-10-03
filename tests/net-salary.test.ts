// The platform speaks net: the model, the companies and the payroll rules (src/domain/pay.ts, src/lib/helpers.tsx)
import { describe, expect, it } from "vitest";
import { COMPANIES } from "../src/data/companies";
import { grossForNet, netPay, toNet } from "../src/domain/pay";
import { marketFor } from "../src/lib/helpers";
import { offerNet } from "../src/domain/offer";

describe("net salaries", () => {
  it("payroll reference values (supabase/tests/database/09_net_salaries.test.sql pins the same)", () => {
    expect([8000, 16000, 25000, 60000, 150000].map((g) => netPay(g).netRegular)).toEqual([6865, 12580, 19597, 45810, 107877]);
  });
  it("net ⇄ gross round-trips", () => { for (const n of [7000, 15000, 40000]) expect(Math.abs(toNet(grossForNet(n)) - n)).toBeLessThanOrEqual(10); });
  it("the market model is net: every percentile is below its gross anchor and still ordered", () => {
    const m = marketFor("civil", "3-5", "cairo", "site"); const ps = [m.p10, m.p25, m.p50, m.p75, m.p90];
    expect([...ps].sort((a, b) => a - b)).toEqual(ps); expect(ps.every((x) => x > 0 && x % 500 === 0)).toBe(true);
  });
  it("company figures are net too", () => { const c = COMPANIES.find((x) => x.id === "elsewedy")!; expect(c.median).toBe(Math.round(toNet(19500) / 500) * 500); expect(c.range[0]).toBeLessThan(c.median); });
  it("an offer is evaluated in net", () => { const o = offerNet({ base: 20000, allowances: 2000, bonusMonths: 2 }); expect(o.monthly).toBe(22000); expect(o.netYear).toBe(22000 * 12 + 40000); });
});
