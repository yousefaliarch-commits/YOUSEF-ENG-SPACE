// =====================================================================
//  Raise & inflation arithmetic (Feature 4) — pure functions, no UI.
//  A month's y/y rate r becomes a monthly factor (1 + r)^(1/12); prices between two months grow by the product of the
//  monthly factors in between. After the last published month the latest rate is carried forward, and the result says so.
// =====================================================================
export type Series = [string, number][]; // ["YYYY-MM", y/y %], ascending

export const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
export const addMonths = (m: string, n: number) => { const [y, mo] = m.split("-").map(Number); const t = y * 12 + (mo - 1) + n; return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`; };
export const monthsBetween = (a: string, b: string) => { const [ya, ma] = a.split("-").map(Number), [yb, mb] = b.split("-").map(Number); return (yb - ya) * 12 + (mb - ma); };

// price growth from the end of month `from` to the end of month `to` (to > from), as a fraction (0.25 = +25%)
export function cumulative(series: Series, from: string, to: string) {
  const by = new Map(series); const first = series[0], last = series[series.length - 1]; let f = 1, assumed = 0;
  for (let m = addMonths(from, 1); monthsBetween(m, to) >= 0; m = addMonths(m, 1)) {
    let r = by.get(m);
    if (r == null) { r = monthsBetween(m, first[0]) > 0 ? first[1] : last[1]; assumed++; }
    f *= Math.pow(1 + r / 100, 1 / 12);
  }
  return { pct: (f - 1) * 100, assumed, lastPublished: last[0] };
}

// A salary history [{ month, salary }] → each change, its real value against inflation, and where you stand today
export function realHistory(series: Series, log: { month: string; salary: number }[], today = monthKey()) {
  const xs = [...log].filter((x) => x && x.month && x.salary > 0).sort((a, b) => monthsBetween(b.month, a.month));
  const steps = xs.slice(1).map((x, i) => {
    const prev = xs[i]; const nominal = (x.salary / prev.salary - 1) * 100; const inf = monthsBetween(prev.month, x.month) > 0 ? cumulative(series, prev.month, x.month).pct : 0;
    return { from: prev.month, to: x.month, salary: x.salary, nominal, inflation: inf, real: ((1 + nominal / 100) / (1 + inf / 100) - 1) * 100 };
  });
  const lastX = xs[xs.length - 1];
  if (!lastX) return { steps, now: null };
  const since = monthsBetween(lastX.month, today) > 0 ? cumulative(series, lastX.month, today) : { pct: 0, assumed: 0, lastPublished: series[series.length - 1][0] };
  // what the salary is worth today in the money of the month it started, and what keeps it level
  return { steps, now: { since: lastX.month, months: Math.max(0, monthsBetween(lastX.month, today)), salary: lastX.salary, inflation: since.pct, assumed: since.assumed, lastPublished: since.lastPublished,
    realNow: lastX.salary / (1 + since.pct / 100), keepLevel: lastX.salary * (1 + since.pct / 100), lost: (1 - 1 / (1 + since.pct / 100)) * 100 } };
}

// the latest 12 published months, for the chart
export const lastYear = (series: Series) => series.slice(-12);
