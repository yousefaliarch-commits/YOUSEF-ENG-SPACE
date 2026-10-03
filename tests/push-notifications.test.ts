// The client side of push notifications, and the pins that keep it in step with the SQL (supabase/migrations/…_push_notifications.sql).
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DISC, ROLE } from "../src/domain/taxonomy";
import { GOVS } from "../src/data/geo";
import { DEFAULT_PREFS, NOTIF_CATEGORIES, notifCategory, notifPref, openTarget } from "../src/domain/notifications";
import { notifOf } from "../src/backend/map";
import { mayAskAgain, webNotify } from "../src/native/push";
import { benefitsFor } from "../src/features/notifications/prefs";
import { SUPERVISOR_NOTIFS } from "../src/domain/taxonomy";

const sql = readFileSync(new URL("../supabase/migrations/20261009000017_push_notifications.sql", import.meta.url), "utf8");
const fn = (name: string) => { const i = sql.indexOf(`function private.${name}(`); return sql.slice(i, sql.indexOf("$$;", i)); };
const kindLists = (src: string) => [...src.matchAll(/(?:when )?kind (?:in \(([^)]*)\)|= '([a-z]+)')\s+then '([a-z]+)'/g)].flatMap((m) => (m[1] ? m[1].match(/'([a-z]+)'/g)!.map((k) => k.slice(1, -1)) : [m[2]]).map((k) => [k, m[3]]));

describe("categories and preferences match the SQL", () => {
  it("notif_category: every kind the database knows lands in the same category as in the app", () => {
    const pairs = kindLists(fn("notif_category")); expect(pairs.length).toBeGreaterThan(10);
    for (const [kind, cat] of pairs) expect([kind, notifCategory(kind)]).toEqual([kind, cat]);
    expect(notifCategory("verify")).toBe("system"); expect(notifCategory("anything-else")).toBe("system");
  });
  it("notif_pref: the same switch for the same kind", () => {
    const pairs = kindLists(fn("notif_pref")); expect(pairs.length).toBeGreaterThan(6);
    for (const [kind, pref] of pairs) expect([kind, notifPref(kind)]).toEqual([kind, pref]);
    expect(notifPref("mod")).toBeNull(); expect(notifPref("verify")).toBeNull();
  });
  it("the four categories of the center", () => { expect(NOTIF_CATEGORIES.map((c) => c[0])).toEqual(["jobs", "community", "support", "system"]); expect(NOTIF_CATEGORIES.map((c) => c[1])).toEqual(["الوظائف", "المجتمع", "الدعم", "النظام"]); });
  it("every preference the screen edits is one the server accepts", () => {
    const accepted = /k not in \(([^)]*)\)/.exec(sql)![1].match(/'(\w+)'/g)!.map((x) => x.slice(1, -1)); expect(accepted.sort()).toEqual(Object.keys(DEFAULT_PREFS).sort());
  });
});

describe("the names the matching engine prints are the app's own", () => {
  const rows = (name: string) => [...fn(name).matchAll(/\('(\w+)', '([^']+)', '([^']+)'\)/g)].map((m) => [m[1], m[2], m[3]]);
  it("disciplines (Arabic, from taxonomy ROLE)", () => { expect(rows("disc_title").map((r) => [r[0], r[1]])).toEqual(DISC.map((d: any) => [d[0], ROLE[d[0]]])); });
  it("governorates (Arabic, from geo GOVS)", () => { expect(rows("gov_name").map((r) => [r[0], r[1]])).toEqual(GOVS.map((g: any) => [g[0], g[1]])); });
  it("the job notification reads as specified", () => {
    const m = fn("job_match_notify");
    expect(m).toContain("'فرصة هندسية جديدة تناسب تخصصك: ' || new.title");
    expect(m).toContain("co || ' تبحث عن ' || d_ar || ' في ' || g_ar || '. اضغط للاطلاع على التفاصيل والتقديم.'");
    expect(m).toContain("jsonb_build_object('type', 'job', 'id', new.id)");
  });
});

describe("opening what a notification points at", () => {
  it("screens by id, and the market tab", () => {
    expect(openTarget({ type: "job", id: "7c19818f-1f8e" })).toEqual({ stack: { type: "job", id: "7c19818f-1f8e" } });
    expect(openTarget({ type: "ticket", id: "abc" })).toEqual({ stack: { type: "ticket", id: "abc" } });
    expect(openTarget({ type: "chat", id: "t1" })?.stack?.type).toBe("chat");
    expect(openTarget({ type: "market" })).toEqual({ tab: "market" }); expect(openTarget({ type: "notifications" })).toEqual({ tab: "inbox" });
  });
  it("nothing else — a payload is data, not a command", () => {
    for (const t of [null, {}, { type: "admin", id: "1" }, { type: "job" }, { type: "job", id: "../../x" }, { type: "job", id: "<script>" }, { type: 5, id: "x" }, { type: "post", id: "a".repeat(200) }]) expect(openTarget(t)).toBeNull();
  });
});

describe("what the app does with a notice", () => {
  it("a server row keeps its category and English text", () => {
    const n = notifOf({ id: "1", kind: "match", title: "ت", body: "ب", target: { type: "job", id: "j" }, read: false, created_at: new Date().toISOString(), category: "jobs", en: { title: "T", body: "B" } });
    expect(n).toMatchObject({ category: "jobs", en: { title: "T", body: "B" } });
    expect(notifOf({ id: "2", kind: "reply", title: "ت", body: "", created_at: new Date().toISOString() }).category).toBe("community");   // an older row without the column
  });
  it("site supervisors keep the notices that concern them, and never job or salary alerts", () => {
    for (const k of ["reply", "mention", "message", "team", "support", "mod", "verify"]) expect(SUPERVISOR_NOTIFS).toContain(k);
    for (const k of ["match", "salary", "inflation"]) expect(SUPERVISOR_NOTIFS).not.toContain(k);
  });
  it("benefits by role: engineers get all four, others only what applies to them", () => {
    expect(benefitsFor("engineer").map((b) => b.id)).toEqual(["jobs", "salary", "community", "support"]);
    expect(benefitsFor("supervisor").map((b) => b.id)).toEqual(["community", "support"]); expect(benefitsFor("hr").map((b) => b.id)).toEqual(["community", "support"]);
  });
});

describe("asking for permission", () => {
  const day = 86_400_000;
  it("at most twice, a week apart — never a raw prompt out of the blue", () => {
    const now = 100 * day;
    expect(mayAskAgain({ n: 0, at: 0 }, now)).toBe(true);
    expect(mayAskAgain({ n: 1, at: now - 3 * day }, now)).toBe(false);
    expect(mayAskAgain({ n: 1, at: now - 8 * day }, now)).toBe(true);
    expect(mayAskAgain({ n: 2, at: 0 }, now)).toBe(false);
  });
});

describe("browser notifications while the page is hidden", () => {
  afterEach(() => vi.unstubAllGlobals());
  const stub = (permission: string) => { const made: any[] = []; const N: any = function (title: string, o: any) { made.push([title, o]); }; N.permission = permission; vi.stubGlobal("Notification", N); vi.stubGlobal("document", { hidden: true }); return made; };
  it("shows one when allowed, the page is hidden and the type is on", () => { const made = stub("granted"); webNotify({ kind: "match", title: "ت", body: "ب" }, { ...DEFAULT_PREFS }); expect(made.length).toBe(1); expect(made[0][1].body).toBe("ب"); });
  it("respects the master switch and the per-type switch", () => {
    let made = stub("granted"); webNotify({ kind: "match", title: "ت" }, { ...DEFAULT_PREFS, jobs: false }); expect(made.length).toBe(0);
    made = stub("granted"); webNotify({ kind: "reply", title: "ت" }, { ...DEFAULT_PREFS, notify: false }); expect(made.length).toBe(0);
    made = stub("granted"); webNotify({ kind: "verify", title: "ت" }, { ...DEFAULT_PREFS, jobs: false, replies: false }); expect(made.length).toBe(1);   // account notices have no switch
  });
  it("does nothing without permission or while the tab is in front", () => {
    let made = stub("denied"); webNotify({ kind: "match", title: "ت" }, DEFAULT_PREFS); expect(made.length).toBe(0);
    made = stub("granted"); vi.stubGlobal("document", { hidden: false }); webNotify({ kind: "match", title: "ت" }, DEFAULT_PREFS); expect(made.length).toBe(0);
  });
});
