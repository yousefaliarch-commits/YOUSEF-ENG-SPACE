// =====================================================================
//  Egyptian payroll — the one implementation (no imports, so the salary model and every tool can use it)
//  · Tax is computed on the YEAR's income (12 salaries + bonus months), the way the employer withholds it over the year.
//  · Law 175/2023 brackets with the 20,000 personal exemption; high earners lose the lower brackets (BRACKET_LOSS).
//  · Social insurance: 11% of the monthly wage up to the insurable cap; bonus months carry no insurance here. Approximate.
//  The platform speaks NET (الصافي — what reaches the account), the way Egyptian engineers discuss pay. The reference
//  model is calibrated on gross anchors (minimum wage, insurable cap) and converted to net with toNet(); gross appears
//  only inside the net ⇄ gross calculator.
// =====================================================================
export const TAX = { cap: 16700, ins: 0.11, exempt: 20000, brackets: [[40000, 0], [55000, 0.10], [70000, 0.15], [200000, 0.20], [400000, 0.225], [1200000, 0.25], [Infinity, 0.275]] };

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

// gross monthly → the net of a regular month
export const toNet = (gross: number) => netPay(gross).netRegular;
