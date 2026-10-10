// =====================================================================
//  What every tool engine returns besides its numbers: checks (each with its limit and clause) and the working
//  (TraceStep), shown under «طريقة الحساب» and printed in the PDF's basis block. Engines are pure and versioned.
// =====================================================================
export type { TraceStep } from "../../doc/model";

export type Check = {
  id: string;
  label: string;
  value: string;
  limit: string;
  ok: boolean | null;            // null: not applicable / information
  level?: "error" | "warn";      // error blocks issue, warn is printed
  clause?: string;
  unverified?: boolean;          // the limit is a [L] default: printed with ⚑
};

// fixed decimals for the working (Latin digits)
export const r = (x: number, dp = 3) => (Number.isFinite(x) ? Number(x.toFixed(dp)).toString() : "—");

// round up to a step (25 mm laps, 5 mm cut lengths…)
export const ceilTo = (x: number, step: number) => Math.ceil(x / step - 1e-9) * step;

// a number from a form field: "" → null, never zero
export const num = (s: unknown): number | null => {
  if (typeof s === "number") return Number.isFinite(s) ? s : null;
  if (typeof s !== "string" || !s.trim()) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

export const addDays = (iso: string, d: number) => {
  const t = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + d);
  return t.toISOString().slice(0, 10);
};
