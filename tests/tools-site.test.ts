// Site management engines (src/domain/tools/site-calc.ts): daily diary, toolbox talk, permit to work (§3.5–§3.7 vectors).
import { describe, expect, it } from "vitest";
import {
  diaryCarryOver, diaryDaysSince, diaryTotals, ptwExcavation, ptwFallClearance, ptwGas, ptwLadder, ptwLineClearance, ptwStatus, tbtSummary, type TbtAttendee,
} from "../src/domain/tools/site-calc";

describe("daily diary", () => {
  const man = [
    { company: "الرئيسي", trade: "مهندسين", n: 2, hours: 8 }, { company: "الرئيسي", trade: "نجارين", n: 6, hours: 8 },
    { company: "الرئيسي", trade: "حدادين", n: 8, hours: 8 }, { company: "الرئيسي", trade: "عمالة", n: 10, hours: 8 },
    { company: "باطن", trade: "بنائين", n: 4, hours: 8 },
  ];
  it("manpower: 30 heads, 240 man-h, carpenters 48 h, subcontractor 32 h", () => {
    const t = diaryTotals({ manpower: man, equipment: [], delays: [], pours: [] });
    expect(t.heads).toBe(30);
    expect(t.manHours).toBe(240);
    expect(t.byTrade["نجارين"].hours).toBe(48);
    expect(t.byCompany["باطن"].hours).toBe(32);
  });
  it("equipment: crane 80 %, mixer 75 %, fleet 77.8 %; all-zero hours is null, never 0", () => {
    const t = diaryTotals({ manpower: [], delays: [], pours: [], equipment: [
      { type: "ونش برجي", tag: "TC1", owner: "own", work: 8, idle: 1, down: 1 }, { type: "خلاطة", tag: "M1", owner: "hired", work: 6, idle: 2, down: 0 },
      { type: "لودر", tag: "L1", owner: "hired", work: 0, idle: 0, down: 0 },
    ] });
    expect(t.equipment.map((e) => e.util)).toEqual([0.8, 0.75, null]);
    expect(t.equipUtil! * 100).toBeCloseTo(77.8, 1);
  });
  it("38 days since the last LTI; carry-over copies crew and tags, not weather or quantities", () => {
    expect(diaryDaysSince("2026-09-01", "2026-10-09")).toBe(38);
    const prev = { manpower: man, equipment: [{ type: "ونش", tag: "TC1", owner: "own" as const, work: 8, idle: 1, down: 1 }], nextDay: "صب سقف الدور 3\nمباني الدور 2", work: [{ activity: "شدة" }], weather: "حر" };
    const blank = { manpower: [], equipment: [], nextDay: "", work: [], weather: "" };
    const t = diaryCarryOver(prev as any, blank as any) as any;
    expect(t.manpower).toHaveLength(5);
    expect(t.equipment[0]).toMatchObject({ tag: "TC1", work: 0, idle: 0, down: 0 });
    expect(t.work.map((w: any) => w.activity)).toEqual(["صب سقف الدور 3", "مباني الدور 2"]);
    expect(t.weather).toBe("");
  });
  it("weather loss 12:30–15:00 → 2.5 h; delays → 195 min", () => {
    const t = diaryTotals({ manpower: [], equipment: [], pours: [], stoppage: { from: "12:30", to: "15:00" }, delays: [{ from: "12:30", to: "15:00" }, { from: "09:00", to: "09:45" }] });
    expect(t.weatherLostH).toBe(2.5);
    expect(t.delayMin).toBe(195);
  });
});

describe("toolbox talk", () => {
  const ok = { helmet: true, shoes: true, vest: true, gloves: true, glasses: true };
  const people = (n: number): TbtAttendee[] => Array.from({ length: n }, (_, i) => ({ name: `W${i + 1}`, trade: "عامل", company: "ر", badge: `B-${i}`, ppe: { ...ok } }));
  it("23 × 15 min → 5.75 man-h; 21 fully equipped → 91.30 %", () => {
    const a = people(23);
    a[0].ppe.helmet = false;
    a[0].action = "sentOff";
    a[1].ppe.vest = false;
    a[1].action = "other";
    const s = tbtSummary({ attendees: a, durationMin: 15, presenter: "م. أحمد", startIso: "2026-10-10T07:00:00Z" }, "2026-10-10T08:00:00Z");
    expect(s.manHours).toBeCloseTo(5.75, 6);
    expect(s.ppePct).toBeCloseTo(91.3, 2);
    expect(s.errors).toEqual([]);
  });
  it("duplicate badges; a missing helmet needs an action; zero attendees; a future start", () => {
    const a = people(3);
    a[1].badge = "B-117";
    a[2].badge = "B-117";
    a[0].badge = undefined;
    a[0].ppe.helmet = false;
    const s = tbtSummary({ attendees: a, durationMin: 15, presenter: "x", startIso: "2026-10-10T07:00:00Z" }, "2026-10-10T08:00:00Z");
    expect(s.dupBadges).toEqual(["B-117"]);
    expect(s.missingNoAction).toEqual(["W1"]);
    expect(s.errors).toContain("missingAction");
    a[0].action = "issued";
    expect(tbtSummary({ attendees: a, durationMin: 15, presenter: "x", startIso: "2026-10-10T07:00:00Z" }, "2026-10-10T08:00:00Z").ppeOk).toBe(3);
    expect(tbtSummary({ attendees: [], durationMin: 15, presenter: "x", startIso: "2026-10-10T09:00:00Z" }, "2026-10-10T08:00:00Z").errors).toEqual(["noAttendee", "future"]);
  });
});

describe("permit to work", () => {
  it("excavation: D 3.0 type B → top 7.2 m, protection, 3 ladders, gas test; type C wet → 8.3 m; 6.5 m → PE, off", () => {
    const e = ptwExcavation({ depthM: 3, baseM: 1.2, lengthM: 40, soil: "B", gas: true });
    expect(e.topWidthM).toBeCloseTo(7.2, 6);
    expect(e.protectiveRequired).toBe(true);
    expect(e.ladders).toBe(3);
    expect(e.atmosphereTest).toBe(true);
    expect(ptwExcavation({ depthM: 2.5, baseM: 0.8, lengthM: 10, soil: "C", water: true }).topWidthM).toBeCloseTo(8.3, 6);
    const deep = ptwExcavation({ depthM: 6.5, baseM: 1, lengthM: 10, soil: "B" });
    expect(deep.peRequired && deep.off).toBe(true);
  });
  it("fall clearance: anchor at the D-ring → FF 2.0 (OSHA warning, EN ok), 4.75 m; at the feet → 3.5, 6.25 m, 5.5 available → srl", () => {
    const a = ptwFallClearance({ lanyardM: 2, absorberM: 1.75, anchorAboveFeetM: 1.5, profile: "en" });
    expect(a.freeFallM).toBeCloseTo(2, 6);
    expect(a.ffOshaOk).toBe(false);
    expect(a.ffEnOk).toBe(true);
    expect(a.requiredM).toBeCloseTo(4.75, 6);
    const b = ptwFallClearance({ lanyardM: 2, absorberM: 1.75, anchorAboveFeetM: 0, profile: "en", availableM: 5.5 });
    expect(b.freeFallM).toBeCloseTo(3.5, 6);
    expect(b.requiredM).toBeCloseTo(6.25, 6);
    expect(b.ok).toBe(false);
    expect(b.advice).toBe("srl");
  });
  it("ladder 4.0 m: base 1.00, length 4.123, minimum 5.12, 75.96°", () => {
    const l = ptwLadder(4, 1);
    expect(l.baseM).toBeCloseTo(1, 6);
    expect(l.lengthM).toBeCloseTo(4.123, 3);
    expect(l.minLadderM).toBeCloseTo(5.12, 2);
    expect(l.angleDeg).toBeCloseTo(75.96, 2);
  });
  it("gas tests, line clearances, validity", () => {
    expect(ptwGas({ o2: 20.9, lel: 0, h2s: 0, co: 3 }).ok).toBe(true);
    expect(ptwGas({ o2: 19.2, lel: 0, h2s: 0, co: 3 }).fails).toEqual(["o2Low"]);
    expect(ptwGas({ o2: 20.9, lel: 12, h2s: 0, co: 3 }).fails).toEqual(["lel"]);
    expect([66, 220, 500].map((kv) => (ptwLineClearance(kv) as any).minM)).toEqual([4.57, 6.1, 7.62]);
    expect(ptwLineClearance(null).blocked).toBe(true);
    expect(ptwStatus({ state: "authorised", startIso: "2026-10-10T07:00:00Z", hours: 8 }, "2026-10-10T15:30:00Z").reason).toBe("expired");
    expect(ptwStatus({ state: "draft", startIso: "2026-10-10T07:00:00Z", hours: 8 }, "2026-10-10T09:00:00Z")).toMatchObject({ valid: false, reason: "notAuthorised" });
    expect(ptwStatus({ state: "authorised", startIso: "2026-10-10T07:00:00Z", hours: 8, gasOk: false }, "2026-10-10T09:00:00Z").state).toBe("suspended");
    expect(ptwStatus({ state: "authorised", startIso: "2026-10-10T07:00:00Z", hours: 8 }, "2026-10-10T09:00:00Z")).toMatchObject({ state: "active", valid: true });
  });
});
