// =====================================================================
//  Offer evaluation and net pay — pure functions (tests/offer.test.ts)
//  · Tax is computed on the YEAR's income (12 salaries + bonus months), the way the employer withholds it over the year,
//    so a 13th/14th salary is taxed at the member's real marginal rate, not at a monthly approximation.
//  · Law 175/2023 brackets with the 20,000 personal exemption. High earners lose the lower brackets: from 600,000 a year the
//    0% band no longer applies, from 700,000 the 10% band, and so on (see BRACKET_LOSS). Approximate — the screens say so.
//  · Social insurance: 11% of the monthly wage up to the insurable cap; bonus months carry no insurance here.
//  Nothing here leaves the device: an offer a member types is never sent to the server.
// =====================================================================
import { TAX } from "../lib/helpers";

// annual taxable income above `over` → tax starts from bracket index `from` (the lower bands are not granted)
export const BRACKET_LOSS: [number, number][] = [[1200000, 6], [900000, 4], [800000, 3], [700000, 2], [600000, 1]];

export function annualTax(taxable: number) {
  if (taxable <= 0) return 0;
  const loss = BRACKET_LOSS.find(([over]) => taxable > over); const from = loss ? loss[1] : 0;
  let tax = 0, prev = 0;
  TAX.brackets.forEach(([lim, r]: any, i: number) => {
    if (taxable > prev) tax += (Math.min(taxable, lim) - prev) * (i < from ? (TAX.brackets[from] as any)[1] : r);
    prev = lim;
  });
  return tax;
}

// monthly gross (+ a yearly bonus amount) → what reaches the account
export function netPay(monthlyGross: number, bonusYear = 0) {
  const g = Math.max(0, Number(monthlyGross) || 0); const bonus = Math.max(0, Number(bonusYear) || 0);
  const insMonthly = Math.min(g, TAX.cap) * TAX.ins;
  const yearGross = g * 12 + bonus;
  const taxable = Math.max(0, yearGross - insMonthly * 12 - TAX.exempt);
  const taxYear = annualTax(taxable);
  const netYear = yearGross - insMonthly * 12 - taxYear;
  // a regular month carries its share of the year's tax on the salary alone; the bonus carries the rest
  const taxSalaryOnly = annualTax(Math.max(0, g * 12 - insMonthly * 12 - TAX.exempt));
  return {
    gross: g, ins: Math.round(insMonthly), tax: Math.round(taxSalaryOnly / 12), taxYear: Math.round(taxYear), yearGross: Math.round(yearGross),
    netYear: Math.round(netYear), netRegular: Math.round(g - insMonthly - taxSalaryOnly / 12), bonusNet: Math.round(bonus - (taxYear - taxSalaryOnly)),
    rate: yearGross ? (yearGross - netYear) / yearGross : 0,
  };
}

// the gross a member must ask for to take home `net` in a regular month (bisection: the net rises with the gross)
export function grossForNet(net: number) {
  const target = Math.max(0, Number(net) || 0); if (!target) return 0;
  let lo = target, hi = target * 2 + 50000;
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (netPay(mid).netRegular < target) lo = mid; else hi = mid; }
  return Math.ceil(hi / 10) * 10;
}

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
// what private family medical cover is worth a month, roughly, when comparing offers
export const MEDICAL_VALUE = 1200;
