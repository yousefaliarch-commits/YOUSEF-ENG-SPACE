// =====================================================================
//  Site management engines — daily diary, toolbox talk, permit to work (pure, versioned).
//  docs/TOOLS-BLUEPRINT.md §3.5–§3.7. No money field anywhere (instruction impact is yes/no only).
//  · Permits follow an explicit state machine: draft → authorised → active → suspended → closed | cancelled. Nothing but an
//    authorised or active permit ever reads «ساري»; validity is computed, never assumed.
//  · Calculators: OSHA 1926.651/652 excavations, fall clearance (OSHA / EN 355), ladder 4:1, gas test limits, OSHA
//    1926.1408 Table A line clearances (unknown voltage blocks lifting).
// =====================================================================
export const DIARY_ENGINE = "siteDiary@1.0.0";
export const TBT_ENGINE = "toolboxTalk@1.0.0";
export const PTW_ENGINE = "workPermit@1.0.0";

// ---------------------------------------------------------------------
//  Daily diary
// ---------------------------------------------------------------------
export type DiaryManRow = { company: string; trade: string; n: number; hours: number };
export type DiaryEquipRow = { type: string; tag: string; owner: "own" | "hired"; work: number; idle: number; down: number };

export const minutesBetween = (from: string, to: string) => {
  const m = (t: string) => {
    const [h, mm] = (t || "").split(":").map(Number);
    return (h || 0) * 60 + (mm || 0);
  };
  const d = m(to) - m(from);
  return d >= 0 ? d : d + 1440;
};

export function diaryTotals(d: { manpower: DiaryManRow[]; equipment: DiaryEquipRow[]; delays: { from: string; to: string }[]; stoppage?: { from: string; to: string } | null; pours: { m3: number }[] }) {
  const byTrade: Record<string, { heads: number; hours: number }> = {};
  const byCompany: Record<string, { heads: number; hours: number }> = {};
  let heads = 0, manHours = 0;
  for (const r of d.manpower) {
    heads += r.n;
    manHours += r.n * r.hours;
    (byTrade[r.trade] ||= { heads: 0, hours: 0 }).heads += r.n;
    byTrade[r.trade].hours += r.n * r.hours;
    (byCompany[r.company] ||= { heads: 0, hours: 0 }).heads += r.n;
    byCompany[r.company].hours += r.n * r.hours;
  }
  const util = (e: DiaryEquipRow) => (e.work + e.idle + e.down > 0 ? e.work / (e.work + e.idle + e.down) : null);
  const all = d.equipment.reduce((a, e) => ({ w: a.w + e.work, t: a.t + e.work + e.idle + e.down }), { w: 0, t: 0 });
  return {
    heads, manHours, byTrade, byCompany,
    equipment: d.equipment.map((e) => ({ tag: e.tag, util: util(e) })), equipUtil: all.t > 0 ? all.w / all.t : null,
    weatherLostH: d.stoppage ? minutesBetween(d.stoppage.from, d.stoppage.to) / 60 : 0,
    delayMin: d.delays.reduce((a, x) => a + minutesBetween(x.from, x.to), 0),
    poursM3: d.pours.reduce((a, p) => a + (p.m3 || 0), 0),
  };
}

export function diaryDaysSince(lastIso: string | null | undefined, dateIso: string) {
  if (!lastIso) return null;
  const a = Date.parse(`${lastIso.slice(0, 10)}T00:00:00Z`), b = Date.parse(`${dateIso.slice(0, 10)}T00:00:00Z`);
  return Number.isFinite(a) && Number.isFinite(b) ? Math.round((b - a) / 86400000) : null;
}

// yesterday → today: crew and equipment tags carry over (hours reset), tomorrow's plan becomes today's suggestions;
// weather, photos, quantities, delays and visitors never do
export function diaryCarryOver<T extends { manpower: DiaryManRow[]; equipment: DiaryEquipRow[]; nextDay: string; work: { activity: string }[] }>(prev: T | null, blank: T): T {
  if (!prev) return blank;
  return {
    ...blank,
    manpower: prev.manpower.map((r) => ({ ...r })),
    equipment: prev.equipment.map((e) => ({ ...e, work: 0, idle: 0, down: 0 })),
    work: prev.nextDay.split(/\n|،|;/).map((s) => s.trim()).filter(Boolean).map((activity) => ({ ...((blank.work[0] as any) || {}), activity })),
  };
}

// ---------------------------------------------------------------------
//  Toolbox talk & PPE muster
// ---------------------------------------------------------------------
export const PPE_ITEMS = ["helmet", "shoes", "vest", "gloves", "glasses", "harness"] as const;
export type PpeItem = (typeof PPE_ITEMS)[number];
export type TbtAttendee = { name: string; trade: string; company: string; badge?: string; ppe: Partial<Record<PpeItem, boolean>>; action?: "issued" | "sentOff" | "other" | ""; needsHarness?: boolean };

export function tbtSummary(t: { attendees: TbtAttendee[]; durationMin: number; presenter: string; startIso: string }, nowIso: string) {
  const n = t.attendees.length;
  const missing = (a: TbtAttendee) => PPE_ITEMS.filter((k) => (k !== "harness" || a.needsHarness) && a.ppe[k] === false);
  const ppeOk = t.attendees.filter((a) => missing(a).length === 0 || a.action === "issued").length;
  const missingNoAction = t.attendees.filter((a) => missing(a).length > 0 && !a.action).map((a) => a.name);
  const seen = new Map<string, number>();
  t.attendees.forEach((a) => a.badge && seen.set(a.badge, (seen.get(a.badge) || 0) + 1));
  const dupBadges = [...seen].filter(([, c]) => c > 1).map(([b]) => b);
  const errors: string[] = [];
  if (!n) errors.push("noAttendee");
  if (!t.presenter.trim()) errors.push("noPresenter");
  if (Date.parse(t.startIso) > Date.parse(nowIso)) errors.push("future");
  if (dupBadges.length) errors.push("dupBadge");
  if (missingNoAction.length) errors.push("missingAction");
  return { n, manHours: (n * t.durationMin) / 60, ppeOk, ppePct: n ? (ppeOk / n) * 100 : null, missingNoAction, dupBadges, errors };
}

// ---------------------------------------------------------------------
//  Permit to work
// ---------------------------------------------------------------------
export type PtwState = "draft" | "authorised" | "active" | "suspended" | "closed" | "cancelled";

export function ptwExcavation(i: { depthM: number; baseM: number; lengthM: number; soil: "rock" | "A" | "B" | "C"; water?: boolean; gas?: boolean }) {
  const soil = i.water && i.soil !== "rock" ? "C" : i.soil;
  const hv = soil === "rock" ? 0 : soil === "A" ? 0.75 : soil === "B" ? 1 : 1.5;
  const pe = i.depthM > 6.1;
  return {
    slopeHV: hv, topWidthM: i.baseM + 2 * i.depthM * hv, protectiveRequired: i.depthM >= 1.5 && soil !== "rock", peRequired: pe,
    ladders: i.depthM >= 1.22 ? Math.ceil(i.lengthM / 15.24 - 1e-9) : 0, spoilSetbackM: 0.61, atmosphereTest: i.depthM > 1.22 && !!i.gas, off: pe,
  };
}

export function ptwFallClearance(i: { lanyardM: number; absorberM: number; anchorAboveFeetM: number; profile: "osha" | "en"; availableM?: number | null; marginM?: number }) {
  const ff = Math.max(0, i.lanyardM + 1.5 - i.anchorAboveFeetM);
  const ffLimit = i.profile === "osha" ? 1.8 : 4.0;
  const absLimit = i.profile === "osha" ? 1.07 : 1.75;
  const required = i.lanyardM + i.absorberM + 1.5 + (i.marginM ?? 1.0) - i.anchorAboveFeetM;
  const ok = i.availableM == null ? null : i.availableM >= required - 1e-9;
  return {
    freeFallM: ff, freeFallOk: ff <= ffLimit + 1e-9, ffOshaOk: ff <= 1.8 + 1e-9, ffEnOk: ff <= 4.0 + 1e-9, absorberOk: i.absorberM <= absLimit + 1e-9,
    requiredM: required, ok, advice: ok === false ? ("srl" as const) : undefined,
  };
}

export function ptwLadder(heightM: number, extensionM = 1.0) {
  const base = heightM / 4;
  const length = Math.sqrt(heightM * heightM + base * base);
  return { baseM: base, lengthM: length, minLadderM: length + extensionM, angleDeg: (Math.atan(4) * 180) / Math.PI };
}

export function ptwGas(t: { o2: number; lel: number; h2s: number; co: number }) {
  const fails: string[] = [];
  if (t.o2 < 19.5) fails.push("o2Low");
  if (t.o2 > 23.5) fails.push("o2High");
  if (t.lel >= 10) fails.push("lel");
  if (t.h2s >= 1) fails.push("h2s");
  if (t.co >= 25) fails.push("co");
  return { ok: !fails.length, fails };
}

export function ptwLineClearance(kv: number | null | undefined) {
  if (kv == null || !Number.isFinite(kv)) return { blocked: true as const, planningM: 15.24 };
  const m = kv <= 50 ? 3.05 : kv <= 200 ? 4.57 : kv <= 350 ? 6.1 : kv <= 500 ? 7.62 : kv <= 750 ? 10.67 : 13.72;
  return { blocked: false as const, minM: m, verify: kv > 350 };
}

// the state shown now: authorised permits become active inside their window and expire after it
export function ptwStatus(p: { state: PtwState; startIso: string; hours: number; gasDueIso?: string | null; gasOk?: boolean | null }, nowIso: string) {
  if (p.state === "draft" || p.state === "closed" || p.state === "cancelled") return { state: p.state, valid: false, reason: p.state === "draft" ? "notAuthorised" : p.state };
  const now = Date.parse(nowIso), start = Date.parse(p.startIso), end = start + p.hours * 3600000;
  if (p.gasOk === false || (p.gasDueIso && Date.parse(p.gasDueIso) < now)) return { state: "suspended" as PtwState, valid: false, reason: p.gasOk === false ? "gasFailed" : "gasDue" };
  if (now > end) return { state: p.state, valid: false, reason: "expired", untilIso: new Date(end).toISOString() };
  if (now < start) return { state: "authorised" as PtwState, valid: false, reason: "notStarted", untilIso: new Date(end).toISOString() };
  return { state: "active" as PtwState, valid: true, reason: "ok", untilIso: new Date(end).toISOString(), leftMin: Math.round((end - now) / 60000) };
}
