// =====================================================================
//  Offer evaluation and net pay — pure functions (tests/offer.test.ts)
//  · Tax is computed on the YEAR's income (12 salaries + bonus months), the way the employer withholds it over the year,
//    so a 13th/14th salary is taxed at the member's real marginal rate, not at a monthly approximation.
//  · Law 175/2023 brackets with the 20,000 personal exemption. High earners lose the lower brackets: from 600,000 a year the
//    0% band no longer applies, from 700,000 the 10% band, and so on (see BRACKET_LOSS). Approximate — the screens say so.
//  · Social insurance: 11% of the monthly wage up to the insurable cap; bonus months carry no insurance here.
//  Nothing here leaves the device: an offer a member types is never sent to the server.
// =====================================================================

import { netPay } from "./pay";
export { BRACKET_LOSS, annualTax, grossForNet, netPay } from "./pay";

// where a monthly figure sits in a distribution { p10, p25, p50, p75, p90 } — a percentile from 1 to 99
export function percentileOf(v: number, m: any) {
  const pts: [number, number][] = ([[10, m && m.p10], [25, m && m.p25], [50, m && m.p50], [75, m && m.p75], [90, m && m.p90]] as any).filter(([, x]) => Number.isFinite(x) && x > 0);
  if (pts.length < 2 || !v) return null;
  if (v <= pts[0][1]) return Math.max(1, Math.round((v / pts[0][1]) * pts[0][0]));
  for (let i = 1; i < pts.length; i++) { const [pa, a] = pts[i - 1], [pb, b] = pts[i]; if (v <= b) return Math.round(pa + ((v - a) / Math.max(1, b - a)) * (pb - pa)); }
  const [pl, l] = pts[pts.length - 1]; return Math.min(99, Math.round(pl + ((v - l) / l) * 40));
}

export const round500 = (n: number) => Math.round(n / 500) * 500;

// the verdict and a counter worth defending: under the middle → ask for the median; fair → aim between P50 and P75;
// strong → keep the number and negotiate the rest
export function evaluateOffer(monthly: number, m: any) {
  const p = percentileOf(monthly, m); if (p == null) return null;
  const tone = p < 25 ? "bad" : p < 45 ? "warn" : p <= 75 ? "good" : "great";
  const label = p < 25 ? "أقل من السوق بوضوح" : p < 45 ? "أقل من الوسط" : p <= 75 ? "عرض عادل" : "عرض قوي";
  const target = p < 45 ? m.p50 : p <= 75 ? (m.p50 + m.p75) / 2 : monthly;
  const counter = Math.max(monthly, round500(target));
  return { p, tone, label, counter, gap: counter - monthly };
}

// an offer's whole package: basic + monthly allowances (taxable), bonus months paid on the basic, private medical cover
export function offerPackage(o: { base?: any; allowances?: any; bonusMonths?: any; medical?: boolean }) {
  const base = Number(o.base) || 0, alw = Number(o.allowances) || 0, months = Number(o.bonusMonths) || 0;
  const monthly = base + alw; const pay = netPay(monthly, base * months);
  return { monthly, base, allowances: alw, bonusMonths: months, ...pay, medicalValue: o.medical ? MEDICAL_VALUE : 0 };
}
// The same offer as engineers discuss it — in NET: net basic + net monthly allowances; bonus months at the net basic
// (approximation: a bonus is taxed at the marginal rate, so its net is somewhat lower — the screen says so)
export function offerNet(o: { base?: any; allowances?: any; bonusMonths?: any; medical?: boolean }) {
  const base = Number(o.base) || 0, alw = Number(o.allowances) || 0, months = Number(o.bonusMonths) || 0; const monthly = base + alw;
  return { monthly, base, allowances: alw, bonusMonths: months, netYear: monthly * 12 + base * months, medicalValue: o.medical ? MEDICAL_VALUE : 0 };
}
// what private family medical cover is worth a month, roughly, when comparing offers
export const MEDICAL_VALUE = 1200;
