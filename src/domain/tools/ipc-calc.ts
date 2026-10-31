// =====================================================================
//  Interim payment certificate (المستخلص الجاري) — the pure engine. No React, no DOM; tests/tools-ipc.test.ts holds its vectors.
//  · The cumulative method Egyptian and FIDIC practice share: every figure is shown as previous · current · total (السابق ·
//    الحالي · الإجمالي), and every current figure is total − previous, so certificates always reconcile with each other.
//  · Item value = quantity × rate; a cumulative quantity above the contract quantity is flagged (a variation is needed first).
//  · Retention: rate × gross work done, capped at the retention limit (a % of the contract amount) when the contract sets one.
//  · Advance payment recovery, two methods: proportional (the advance's share of the contract recovered from each certificate's
//    gross, so it is fully recovered at completion) or FIDIC 1999 Sub-Clause 14.2 (starts in the certificate in which the total
//    certified exceeds a threshold — 10 % of the contract by default — then a rate of each certificate — 25 % by default —
//    until repaid; history-dependent, so the amount recovered before is carried from the previous certificate).
//  · VAT on the current gross work (14 % since Law 157/2025; 5 % for contracts kept on the old schedule tax; 0 % exempt) or on
//    the net after retention and advance — the contract decides. Other deductions: a % of the gross or a fixed amount.
//  Rates and rules are the contract's: every one is an input, none is assumed silently.
// =====================================================================

export const IPC_ENGINE = "ipc@1.0.0";

export type IpcItem = {
  id: string;
  ref: string;          // BOQ item number (رقم البند)
  desc: string;
  unit: string;
  qtyContract: number;  // BOQ quantity
  rate: number;         // unit rate, EGP
  qtyPrev: number;      // cumulative quantity in the previous certificate
  qtyCur: number;       // quantity executed this period (may be negative: a correction)
  section?: string;     // BOQ section heading
};

export type IpcDeduction = { id: string; name: string; mode: "pct" | "fixed"; pct: number; prev: number; cur: number };

export type IpcTerms = {
  contractAmount: number;               // accepted contract amount, excluding VAT
  retentionPct: number;                 // % of gross work done
  retentionLimitPct: number | null;     // cap, % of the contract amount; null = no cap
  advanceAmount: number;                // advance payment paid to the contractor
  advanceMethod: "proportional" | "fidic";
  fidicStartPct: number;                // FIDIC: recovery starts once total certified exceeds this % of the contract
  fidicRatePct: number;                 // FIDIC: % of each certificate's gross recovered
  advanceRecoveredPrev: number;         // FIDIC: advance recovered up to the previous certificate (carried)
  vatPct: number;
  vatOn: "gross" | "net";
  deductions: IpcDeduction[];
};

export type IpcLine = IpcItem & {
  qtyTotal: number; amtPrev: number; amtCur: number; amtTotal: number; progress: number | null; overrun: boolean;
};
export type Triple = { prev: number; cur: number; total: number };
export type IpcSummary = {
  gross: Triple;
  retention: Triple;
  advance: Triple;
  netBeforeVat: Triple;
  vat: Triple;
  deductions: { id: string; name: string; t: Triple }[];
  payable: Triple;            // what the employer pays: gross − retention − advance + VAT − other deductions
  retentionCapped: boolean;
  advanceRepaid: boolean;
};
export type IpcIssue = { level: "error" | "warn" | "info"; text: string; ref?: string };
export type IpcTrace = { label: string; expr: string; value: string; clause?: string };
export type IpcResult = { lines: IpcLine[]; s: IpcSummary; issues: IpcIssue[]; trace: IpcTrace[] };

const r2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;
const fin = (x: number) => (Number.isFinite(x) ? x : 0);
const fmt = (x: number) => x.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const triple = (prev: number, total: number): Triple => ({ prev: r2(prev), cur: r2(total - prev), total: r2(total) });

export function computeIpc(items: IpcItem[], t: IpcTerms): IpcResult {
  const issues: IpcIssue[] = [];
  const trace: IpcTrace[] = [];
  const lines: IpcLine[] = items.map((it) => {
    const qtyPrev = fin(it.qtyPrev), qtyCur = fin(it.qtyCur), rate = fin(it.rate), qtyContract = fin(it.qtyContract);
    const qtyTotal = qtyPrev + qtyCur;
    const overrun = qtyContract > 0 && qtyTotal > qtyContract * (1 + 1e-9);
    if (overrun) {
      const pct = ((qtyTotal - qtyContract) / qtyContract) * 100;
      issues.push({ level: "warn", ref: it.ref, text: `البند ${it.ref || "—"}: الكمية التراكمية ${fmt(qtyTotal)} ${it.unit} تتجاوز كمية العقد ${fmt(qtyContract)} ${it.unit} بنسبة ${pct.toFixed(1)}% — تُعتمد الزيادة بأمر تغيير (FIDIC 1999 بند 13) قبل صرفها.` });
    }
    if (qtyTotal < -1e-9) issues.push({ level: "error", ref: it.ref, text: `البند ${it.ref || "—"}: الكمية التراكمية سالبة (${fmt(qtyTotal)}) — راجع الكمية السابقة أو الحالية.` });
    else if (qtyCur < 0) issues.push({ level: "info", ref: it.ref, text: `البند ${it.ref || "—"}: كمية حالية سالبة (${fmt(qtyCur)}) — تصحيح لكمية سبق صرفها.` });
    if (rate <= 0 && (qtyPrev || qtyCur)) issues.push({ level: "warn", ref: it.ref, text: `البند ${it.ref || "—"}: لا توجد فئة سعر — قيمة البند صفر.` });
    return {
      ...it, qtyPrev, qtyCur, rate, qtyContract, qtyTotal,
      amtPrev: qtyPrev * rate, amtCur: qtyCur * rate, amtTotal: qtyTotal * rate,
      progress: qtyContract > 0 ? qtyTotal / qtyContract : null, overrun,
    };
  });

  const Gp = lines.reduce((a, l) => a + l.amtPrev, 0);
  const Gt = lines.reduce((a, l) => a + l.amtTotal, 0);
  const gross = triple(Gp, Gt);
  const C = Math.max(0, fin(t.contractAmount));
  if (C > 0 && Gt > C * (1 + 1e-9)) issues.push({ level: "warn", text: `إجمالي الأعمال ${fmt(Gt)} يتجاوز قيمة العقد ${fmt(C)} — تأكد من أوامر التغيير المعتمدة.` });

  // retention: cumulative, capped
  const rp = Math.max(0, fin(t.retentionPct)) / 100;
  const cap = t.retentionLimitPct != null && t.retentionLimitPct > 0 && C > 0 ? (t.retentionLimitPct / 100) * C : Infinity;
  const R = (g: number) => Math.min(Math.max(0, g) * rp, cap);
  const retention = triple(R(Gp), R(Gt));
  const retentionCapped = Number.isFinite(cap) && Gt * rp >= cap - 1e-9;
  trace.push({ label: "التأمين المحجوز", expr: Number.isFinite(cap) ? `min(${(rp * 100).toFixed(2)}% × ${fmt(Gt)} ، ${fmt(cap)})` : `${(rp * 100).toFixed(2)}% × ${fmt(Gt)}`, value: fmt(retention.total), clause: "FIDIC 1999 بند 14.3(c)" });
  if (retentionCapped) issues.push({ level: "info", text: `بلغ التأمين المحجوز حده الأقصى (${t.retentionLimitPct}% من قيمة العقد = ${fmt(cap)}) — لا يُحجز المزيد.` });

  // advance recovery
  const adv = Math.max(0, fin(t.advanceAmount));
  let advance: Triple;
  if (adv <= 0) advance = triple(0, 0);
  else if (t.advanceMethod === "fidic") {
    const start = (Math.max(0, fin(t.fidicStartPct)) / 100) * C;
    const rate = Math.max(0, fin(t.fidicRatePct)) / 100;
    const prev = Math.min(adv, Math.max(0, fin(t.advanceRecoveredPrev)));
    // recovery runs from the certificate in which the total certified exceeds the threshold: rate × this certificate's gross
    const cur = Gt > start + 1e-9 ? Math.min(adv - prev, Math.max(0, rate * gross.cur)) : 0;
    advance = triple(prev, prev + cur);
    trace.push({ label: "استهلاك الدفعة المقدمة (FIDIC)", expr: Gt > start ? `min(${(rate * 100).toFixed(0)}% × ${fmt(gross.cur)} ، ${fmt(adv)} − ${fmt(prev)})` : `الإجمالي ${fmt(Gt)} ≤ ${fmt(start)} (${t.fidicStartPct}% من العقد) ← لا استهلاك بعد`, value: fmt(advance.cur), clause: "FIDIC 1999 بند 14.2" });
  } else {
    const share = C > 0 ? adv / C : 0;
    const A = (g: number) => Math.min(adv, Math.max(0, g) * share);
    advance = triple(A(Gp), A(Gt));
    trace.push({ label: "استهلاك الدفعة المقدمة (بالتناسب)", expr: `min(${fmt(adv)} ÷ ${fmt(C)} × ${fmt(Gt)} ، ${fmt(adv)})`, value: fmt(advance.total) });
    if (C <= 0) issues.push({ level: "error", text: "أدخل قيمة العقد: استهلاك الدفعة المقدمة بالتناسب يحتاجها." });
  }
  const advanceRepaid = adv > 0 && advance.total >= adv - 0.005;
  if (advanceRepaid) issues.push({ level: "info", text: "اكتمل استهلاك الدفعة المقدمة." });

  const netBeforeVat = triple(gross.prev - retention.prev - advance.prev, gross.total - retention.total - advance.total);
  const vp = Math.max(0, fin(t.vatPct)) / 100;
  const vatBase = (g: Triple, key: "prev" | "total") => (t.vatOn === "net" ? netBeforeVat[key] : g[key]);
  const vat = triple(vatBase(gross, "prev") * vp, vatBase(gross, "total") * vp);
  trace.push({ label: "ضريبة القيمة المضافة", expr: `${(vp * 100).toFixed(0)}% × ${fmt(t.vatOn === "net" ? netBeforeVat.cur : gross.cur)} (${t.vatOn === "net" ? "الصافي بعد الاستقطاعات" : "إجمالي أعمال الفترة"})`, value: fmt(vat.cur), clause: vp === 0.14 ? "قانون 157 لسنة 2025" : undefined });

  const deductions = (t.deductions || []).map((d) => {
    if (d.mode === "pct") {
      const p = Math.max(0, fin(d.pct)) / 100;
      return { id: d.id, name: d.name, t: triple(gross.prev * p, gross.total * p) };
    }
    const prev = fin(d.prev), cur = fin(d.cur);
    return { id: d.id, name: d.name, t: triple(prev, prev + cur) };
  });
  const dSum = (k: "prev" | "total") => deductions.reduce((a, d) => a + d.t[k], 0);
  const payable = triple(netBeforeVat.prev + vat.prev - dSum("prev"), netBeforeVat.total + vat.total - dSum("total"));
  trace.push({ label: "صافي المستحق للمستخلص", expr: `${fmt(gross.cur)} − ${fmt(retention.cur)} − ${fmt(advance.cur)} + ${fmt(vat.cur)} − ${fmt(dSum("total") - dSum("prev"))}`, value: fmt(payable.cur) });
  if (payable.cur < -0.005) issues.push({ level: "warn", text: `صافي المستخلص سالب (${fmt(payable.cur)}) — الاستقطاعات تتجاوز أعمال الفترة.` });

  return { lines, s: { gross, retention, advance, netBeforeVat, vat, deductions, payable, retentionCapped, advanceRepaid }, issues, trace };
}

// the next certificate: this one's totals become the previous column, the period's quantities start at zero
export function nextCertificateItems(items: IpcItem[]): IpcItem[] {
  return items.map((it) => ({ ...it, qtyPrev: fin(it.qtyPrev) + fin(it.qtyCur), qtyCur: 0 }));
}
