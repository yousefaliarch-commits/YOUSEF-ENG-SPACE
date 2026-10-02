// =====================================================================
//  Company scorecards (Feature 3) — the five factors, the answers a reviewer picks, and the demo's scorecard.
//  On the live platform the scorecard comes only from public.company_scorecard(): each factor from 5 different reviewers
//  up, each member counted once (their latest rating), and no member ever reads anyone's individual ratings. The demo
//  applies the same rules to a modeled base plus what this browser rated.
// =====================================================================
import { fnv } from "./identity";

export const SCORE_MIN = 5;
export type FactorId = "pay" | "raises" | "ontime" | "overtime" | "site";
// answers run worst → best, so 1–5 always means "higher is better for the engineer"
export const FACTORS: { id: FactorId; label: string; q: string; opts: string[] }[] = [
  { id: "pay", label: "الراتب مقارنة بالسوق", q: "الراتب هنا مقارنة بالسوق لنفس الخبرة", opts: ["أقل بكثير", "أقل", "مثل السوق", "أعلى", "أعلى بكثير"] },
  { id: "raises", label: "انتظام الزيادات", q: "الزيادات السنوية", opts: ["لا زيادات", "نادرة وغير منتظمة", "سنوية أقل من التضخم", "سنوية تواكب التضخم", "أكثر من مرة في السنة"] },
  { id: "ontime", label: "صرف الراتب في موعده", q: "هل يُصرف الراتب في موعده؟", opts: ["يتأخر شهورًا", "يتأخر كثيرًا", "يتأخر أحيانًا", "نادرًا ما يتأخر", "دائمًا في موعده"] },
  { id: "overtime", label: "الساعات الإضافية", q: "الساعات الإضافية", opts: ["طويلة وبلا مقابل", "كثيرة وبلا مقابل", "أحيانًا", "لها مقابل عادل", "نادرة"] },
  { id: "site", label: "ظروف العمل والموقع", q: "ظروف العمل (الموقع، السكن، المواصلات، الأمان)", opts: ["سيئة جدًا", "سيئة", "مقبولة", "جيدة", "ممتازة"] },
];
export const factorOf = (id: string) => FACTORS.find((f) => f.id === id);
// the answer an average sits closest to — "مثل السوق" for 3.2
export const nearest = (id: string, avg: number) => { const f = factorOf(id); return f ? f.opts[Math.min(4, Math.max(0, Math.round(avg) - 1))] : ""; };

type Agg = { n: number; avg?: number; good?: number };
const agg = (vals: number[]): Agg => (vals.length < SCORE_MIN ? { n: vals.length } : { n: vals.length, avg: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10, good: Math.round((100 * vals.filter((v) => v >= 4).length) / vals.length) });

// rows: [{ by, at, scores }] — one member counts once (their latest), exactly like the SQL
export function scorecardOf(rows: { by: string; at: number; scores: Partial<Record<FactorId, number>> }[]) {
  const latest = new Map<string, any>(); for (const r of rows) { const o = latest.get(r.by); if (!o || r.at > o.at) latest.set(r.by, r); }
  const xs = [...latest.values()]; const factors: any = {};
  for (const f of FACTORS) factors[f.id] = agg(xs.map((r) => r.scores && r.scores[f.id]).filter((v) => v >= 1 && v <= 5));
  return { n: xs.length, min: SCORE_MIN, factors };
}

// Demo: a modeled base per company (deterministic from its id, leaning on how many recommend it) plus this browser's ratings
export function demoScorecard(c: any, mine: any[] = []) {
  if (!c) return scorecardOf([]);
  const base = Math.max(0, Math.min(36, Math.round((c.reports || 0) / 4))); const rec = (c.recommend || 60) / 100; const rows: any[] = [];
  for (let i = 0; i < base; i++) {
    const h = fnv(c.id + ":" + i); const pick = (k: number, lean: number) => Math.max(1, Math.min(5, Math.round(1 + 4 * (lean * 0.75 + (parseInt(h.slice(k, k + 2), 16) / 255) * 0.45) - 0.4)));
    rows.push({ by: "m" + i, at: i, scores: { pay: pick(0, rec), raises: pick(2, rec * 0.9), ontime: pick(4, Math.min(1, rec + 0.1)), overtime: pick(6, rec * 0.8), ...(i % 4 ? { site: pick(1, rec) } : {}) } });
  }
  mine.filter((r) => r && r.scores).forEach((r, i) => rows.push({ by: "me", at: 1e12 + (r.at || i), scores: r.scores }));
  return scorecardOf(rows);
}
