// =====================================================================
//  أمر تغيير — variation order (W7): priced additions and omissions (an omission is a negative line, printed in brackets),
//  the net change and its share of the contract, the time asked for, and what the engineer approved. Contract limits on
//  variations differ by contract (FIDIC clause 13, the particular conditions, public-contract rules): the alert threshold is
//  the contract's figure typed by the engineer, never a number this tool claims for a law. Pure, versioned (VO_ENGINE).
// =====================================================================
import { r, type Check } from "./common";

export const VO_ENGINE = "vo-calc@1";

export type VoItem = { item: string; desc: string; unit: string; qty: number; rate: number; omit: boolean };
export type VoTerms = { contract: number; alertPct: number; approved: number | null };
export type VoLine = VoItem & { signedQty: number; amount: number };

export function computeVo(items: VoItem[], t: VoTerms) {
  const lines: VoLine[] = items.map((i) => {
    const signedQty = i.omit ? -Math.abs(i.qty) : Math.abs(i.qty);
    return { ...i, signedQty, amount: Math.round(signedQty * i.rate * 100) / 100 };
  });
  const additions = lines.filter((l) => l.amount > 0).reduce((s, l) => s + l.amount, 0);
  const omissions = lines.filter((l) => l.amount < 0).reduce((s, l) => s + l.amount, 0);
  const net = Math.round((additions + omissions) * 100) / 100;
  const pct = t.contract > 0 ? (net / t.contract) * 100 : null;
  const checks: Check[] = [];
  lines.forEach((l, i) => {
    if (!(l.rate > 0) && l.qty) checks.push({ id: `rate${i}`, label: `البند ${l.item || i + 1}: بدون فئة`, value: "0", limit: "> 0", ok: false, level: "warn" });
  });
  if (pct != null && t.alertPct > 0) {
    checks.push({
      id: "limit", label: "صافي التغيير من قيمة العقد", value: `${r(pct, 2)} %`, limit: `≤ ${t.alertPct} % (حد العقد)`,
      ok: Math.abs(pct) <= t.alertPct + 1e-9, level: "warn", clause: "حد التنبيه كما في شروط العقد",
    });
  }
  if (t.approved != null && t.approved > net + 0.005 && net >= 0) {
    checks.push({ id: "approved", label: "القيمة المعتمدة أكبر من المطلوبة", value: r(t.approved, 2), limit: `≤ ${r(net, 2)}`, ok: false, level: "warn" });
  }
  return { lines, additions, omissions, net, pct, checks };
}
