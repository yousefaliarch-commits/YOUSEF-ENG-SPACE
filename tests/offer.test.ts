// src/domain/offer.ts — net pay on the year's income, the reverse calculator, market position and the counter-offer
import { describe, expect, it } from "vitest";
import { annualTax, evaluateOffer, grossForNet, netPay, offerPackage, percentileOf } from "../src/domain/offer";
import { egyptNet } from "../src/lib/helpers";

describe("net pay", () => {
  it("matches the existing monthly calculator below the high-earner threshold (600,000 a year)", () => {
    for (const g of [8000, 16700, 25000, 45000]) expect(Math.abs(netPay(g).netRegular - egyptNet(g).net)).toBeLessThanOrEqual(1);
  });
  it("taxes nothing under the 40,000 band after the exemption", () => { expect(annualTax(40000)).toBe(0); expect(annualTax(45000)).toBe(500); });
  it("high earners lose the lower bands", () => {
    // just over 600,000: the 0% band is gone, so the first 40,000 are taxed at 10%
    expect(annualTax(600001) - annualTax(600000)).toBeGreaterThan(3999);
    expect(annualTax(2000000)).toBeGreaterThan(2000000 * 0.25);
  });
  // the law has a real cliff at each threshold (crossing 600,000 adds ~4,000 of tax at once); tax itself never falls
  it("tax never falls as income rises across the band edges", () => {
    let prev = 0; for (let t = 2500; t <= 1500000; t += 2500) { const n = t - annualTax(t); expect(annualTax(t)).toBeGreaterThanOrEqual(prev); prev = annualTax(t); expect(n).toBeGreaterThan(0); }
  });
  it("a bonus is taxed at the marginal rate, not added at the monthly average", () => {
    const p = netPay(30000, 60000); expect(p.bonusNet).toBeLessThan(60000); expect(p.bonusNet).toBeGreaterThan(60000 * 0.7);
    expect(p.netYear).toBe(netPay(30000).netYear + p.bonusNet);
  });
});

describe("reverse calculator", () => {
  it("finds the gross for a wanted net", () => {
    for (const net of [10000, 20000, 45000]) { const g = grossForNet(net); expect(netPay(g).netRegular).toBeGreaterThanOrEqual(net); expect(netPay(g - 20).netRegular).toBeLessThan(net + 20); }
  });
});

describe("offer evaluation", () => {
  const m = { p10: 12000, p25: 15000, p50: 18000, p75: 22000, p90: 27000 };
  it("places an offer in the distribution", () => {
    expect(percentileOf(18000, m)).toBe(50); expect(percentileOf(15000, m)).toBe(25); expect(percentileOf(20000, m)).toBe(63);
    expect(percentileOf(18000, { p50: 18000 })).toBeNull(); // a teaser (median only) cannot place an offer
  });
  it("counters a low offer at the median and a fair one between P50 and P75", () => {
    expect(evaluateOffer(14000, m)).toMatchObject({ tone: "bad", counter: 18000, gap: 4000 });
    expect(evaluateOffer(19000, m)).toMatchObject({ tone: "good", counter: 20000 });
    expect(evaluateOffer(26000, m)).toMatchObject({ tone: "great", counter: 26000, gap: 0 });
  });
  it("bonus months are paid on the basic only", () => {
    const o = offerPackage({ base: 20000, allowances: 3000, bonusMonths: 2 });
    expect(o.monthly).toBe(23000); expect(o.yearGross).toBe(23000 * 12 + 40000);
  });
});
