// =====================================================================
//  Registers (W7) — the technical office's logs, built from the documents themselves (one RFI, submittal or variation order =
//  one row): status, the date a reply is due, days open or the turnaround, days late, and the counts a weekly meeting asks
//  for. A draft is listed but never «late» (it has not been sent). Pure: the documents and «today» go in, rows come out.
// =====================================================================
import { addDays, num } from "./common";
import { computeVo } from "./vo-calc";

export const REG_ENGINE = "registers@1";
export type RegKind = "rfi" | "submittal" | "vo";
export const REG_KINDS: RegKind[] = ["rfi", "submittal", "vo"];

export type RegStatus =
  | "draft" | "open" | "overdue" | "answered" | "closed"              // RFI
  | "pending" | "approved" | "approvedNoted" | "revise" | "rejected"  // submittal (consultant codes A · B · C · D)
  | "submitted" | "partial";                                            // variation order

export const STATUS_LABEL: Record<RegStatus, string> = {
  draft: "مسودة", open: "بانتظار الرد", overdue: "متأخر", answered: "تم الرد", closed: "مغلق",
  pending: "تحت المراجعة", approved: "معتمد (A)", approvedNoted: "معتمد بملاحظات (B)", revise: "يُعدَّل ويُعاد (C)", rejected: "مرفوض (D)",
  submitted: "مقدَّم", partial: "معتمد جزئيًا",
};
export const STATUS_TONE: Record<RegStatus, "good" | "bad" | "warn" | "muted"> = {
  draft: "muted", open: "warn", overdue: "bad", answered: "good", closed: "muted",
  pending: "warn", approved: "good", approvedNoted: "good", revise: "bad", rejected: "bad",
  submitted: "warn", partial: "good",
};
// what «done» means per register (turnaround is measured on these)
const DONE: RegStatus[] = ["answered", "closed", "approved", "approvedNoted", "revise", "rejected", "partial"];

export type RegDoc = { id: string; kind: string; title: string; docNo: string | null; dateIso: string; status: string; wbs?: { zone?: string; level?: string; element?: string }; body: any };
export type RegRow = {
  id: string; no: string; title: string; date: string; due: string | null; doneOn: string | null;
  status: RegStatus; days: number | null; late: number; extra: Record<string, string | number | null>;
};

export const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b.slice(0, 10)}T12:00:00Z`) - Date.parse(`${a.slice(0, 10)}T12:00:00Z`)) / 864e5);
const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}/.test(s);

export function rfiRow(d: RegDoc, today: string): RegRow {
  const b = d.body || {};
  const sent = d.status !== "draft";
  const due = sent ? addDays(d.dateIso, Math.round(num(b.days) ?? 7)) : null;
  const answered = String(b.answer || "").trim().length > 0;
  const doneOn = answered && isDate(b.answeredOn) ? b.answeredOn.slice(0, 10) : null;
  const status: RegStatus = !sent ? "draft" : b.closed ? "closed" : answered ? "answered" : due && due < today ? "overdue" : "open";
  const end = answered ? doneOn || today : today;
  const late = status === "overdue" && due ? daysBetween(due, today) : doneOn && due && doneOn > due ? daysBetween(due, doneOn) : 0;
  return {
    id: d.id, no: d.docNo || "—", title: d.title, date: d.dateIso, due, doneOn, status,
    days: sent ? Math.max(0, daysBetween(d.dateIso, end)) : null, late,
    extra: { to: b.to || "", discipline: b.discipline || "", priority: b.priority || "", location: b.location || "" },
  };
}

export function submittalRow(d: RegDoc, today: string): RegRow {
  const b = d.body || {};
  const sent = d.status !== "draft";
  const due = sent ? addDays(d.dateIso, Math.round(num(b.days) ?? 14)) : null;
  const code = String(b.code || "");
  const coded: Record<string, RegStatus> = { A: "approved", B: "approvedNoted", C: "revise", D: "rejected" };
  const doneOn = coded[code] && isDate(b.codeOn) ? b.codeOn.slice(0, 10) : null;
  const status: RegStatus = !sent ? "draft" : coded[code] || (due && due < today ? "overdue" : "pending");
  const end = coded[code] ? doneOn || today : today;
  const late = status === "overdue" && due ? daysBetween(due, today) : doneOn && due && doneOn > due ? daysBetween(due, doneOn) : 0;
  return {
    id: d.id, no: d.docNo || "—", title: d.title, date: d.dateIso, due, doneOn, status,
    days: sent ? Math.max(0, daysBetween(d.dateIso, end)) : null, late,
    extra: { material: b.material || "", manufacturer: b.manufacturer || "", code },
  };
}

export function voRow(d: RegDoc, today: string): RegRow {
  const b = d.body || {};
  const items = (Array.isArray(b.items) ? b.items : []).map((i: any) => ({ item: i.item || "", desc: i.desc || "", unit: i.unit || "", qty: num(i.qty) ?? 0, rate: num(i.rate) ?? 0, omit: !!i.omit }));
  const vo = computeVo(items, { contract: num(b.contract) ?? 0, alertPct: num(b.alertPct) ?? 0, approved: num(b.approvedValue) });
  const st = String(b.status || "draft");
  const status: RegStatus = d.status === "draft" && st === "draft" ? "draft" : st === "approved" ? "approved" : st === "partial" ? "partial" : st === "rejected" ? "rejected" : "submitted";
  const decided = status === "approved" || status === "partial" || status === "rejected";
  const doneOn = decided && isDate(b.approvedOn) ? b.approvedOn.slice(0, 10) : null;
  const approved = status === "approved" ? num(b.approvedValue) ?? vo.net : status === "partial" ? num(b.approvedValue) ?? 0 : status === "rejected" ? 0 : null;
  return {
    id: d.id, no: d.docNo || "—", title: d.title, date: d.dateIso, due: null, doneOn, status,
    days: status === "draft" ? null : Math.max(0, daysBetween(d.dateIso, decided ? doneOn || today : today)), late: 0,
    extra: { claimed: vo.net, approved, daysAsked: num(b.daysReq) ?? 0, daysApproved: decided ? num(b.approvedDays) ?? 0 : null, origin: b.origin || "" },
  };
}

const ROW: Record<RegKind, (d: RegDoc, today: string) => RegRow> = { rfi: rfiRow, submittal: submittalRow, vo: voRow };

export function registerOf(kind: RegKind, docs: RegDoc[], today: string) {
  const rows = docs.filter((d) => d && d.kind === kind).map((d) => ROW[kind](d, today))
    .sort((a, b) => (a.date === b.date ? a.no.localeCompare(b.no) : a.date < b.date ? -1 : 1));
  const counts = {} as Record<RegStatus, number>;
  rows.forEach((x) => (counts[x.status] = (counts[x.status] || 0) + 1));
  const done = rows.filter((x) => DONE.includes(x.status) && x.days != null);
  const avgTurnaround = done.length ? Math.round((done.reduce((s, x) => s + (x.days || 0), 0) / done.length) * 10) / 10 : null;
  const sent = rows.filter((x) => x.status !== "draft");
  const money = kind === "vo"
    ? {
        claimed: sent.reduce((s, x) => s + Number(x.extra.claimed || 0), 0),
        approved: sent.reduce((s, x) => s + Number(x.extra.approved || 0), 0),
        pending: sent.filter((x) => x.status === "submitted").reduce((s, x) => s + Number(x.extra.claimed || 0), 0),
      }
    : null;
  return { rows, counts, total: rows.length, sent: sent.length, overdue: counts.overdue || 0, avgTurnaround, money };
}
