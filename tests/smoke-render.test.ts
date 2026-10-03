// Smoke render: executes every component the app reaches, once, against the stub React — catches undefined element types,
// ReferenceErrors and bad prop access on each screen. The crawl then calls every onClick / onChange / onSubmit / touch
// handler it finds with a fake event. Ported from the prototype's smoke-render.js (same walk, same fake event).
import { test, expect, beforeAll, beforeEach } from "vitest";
import * as React from "react";
import * as H from "./harness";
const { C, store } = H;

let count = 0; const seen = new Set<string>();
function render(node: any, depth = 0, path = "root") {
  if (node == null || typeof node === "boolean" || typeof node === "string" || typeof node === "number") return;
  if (Array.isArray(node)) { node.forEach((n, i) => render(n, depth, path + "[" + i + "]")); return; }
  if (!node.$el) return;
  if (depth > 200) throw new Error("depth exceeded at " + path);
  const { type, props } = node;
  if (typeof type === "function") {
    const name = type.displayName || type.name || "anon"; seen.add(name); count++;
    let out; try { out = type.prototype && type.prototype.render ? new type(props).render() : type(props); } catch (e) { e.message = `<${name}> (${path}): ` + e.message; throw e; }
    render(out, depth + 1, path + ">" + name);
  } else render(props.children, depth + 1, path + ">" + (typeof type === "string" ? type : "Fragment"));
}

let handlers = 0; const handlerErrors: string[] = [];
const fakeEvent = { preventDefault() {}, stopPropagation() {}, key: "Escape", target: { value: "12345", checked: true }, touches: [{ clientX: 380, clientY: 10 }], changedTouches: [{ clientX: 100, clientY: 10 }] };
function crawl(node: any, path = "root") {
  if (node == null || typeof node !== "object") return;
  if (Array.isArray(node)) { node.forEach((n, i) => crawl(n, path + "[" + i + "]")); return; }
  if (!node.$el) return;
  const { type, props } = node;
  const name = typeof type === "function" ? type.displayName || type.name : typeof type === "string" ? type : "Fragment";
  for (const k of ["onClick", "onChange", "onSubmit", "onTouchStart", "onTouchMove", "onTouchEnd"]) {
    if (typeof props[k] === "function") { handlers++; try { props[k](fakeEvent); } catch (e) { handlerErrors.push(`${path}>${name}.${k}: ${e.message}`); } }
  }
  if (typeof type === "function") { let out; try { out = type.prototype && type.prototype.render ? new type(props).render() : type(props); } catch (e) { return; } crawl(out, path + ">" + name); }
  else crawl(props.children, path + ">" + name);
}

const el = (type: any, props = {}) => ({ $el: true, type, props: { ...props, children: [] } });
// storage + address for each starting point: first launch, the registration screen, a signed-in member (both languages),
// deep links, and the admin console
// and the component each one must reach
const setups: [string, string, () => void, string][] = [
  ["first launch (language screen)", "", () => {}, "LanguageScreen"],
  ["registration", "", () => { store["engspace.lang"] = "ar"; C.storeFor("app").set("authView", "signup"); }, "AuthScreen"],
  ["member home (Arabic)", "#app", () => signIn("ar"), "HomeScreen"],
  ["member home (English)", "#app", () => signIn("en"), "HomeScreen"],
  ["settings deep link", "#app/settings", () => signIn("ar"), "SettingsScreen"],
  ["CV review deep link (lazy chunk)", "#app/cvreview", () => signIn("ar"), "CVReviewScreen"],
  ["admin console (lazy chunk)", "#admin", () => signIn("ar"), "AdminView"],
  // company accounts carry no discipline — the post screen's reply box once read TITLES[undefined][0] and crashed for them
  ["notification preferences", "#app/notifprefs", () => signIn("ar"), "NotificationPrefsScreen"],
  ["notification center", "#app/notifications", () => signIn("ar"), "NotificationsScreen"],
  ["notification preferences (English)", "#app/notifprefs", () => signIn("en"), "NotificationPrefsScreen"],
  ["notification center (English)", "#app/notifications", () => signIn("en"), "NotificationsScreen"],
  ["a post, as HR", "#app/post/p1", () => signInAs({ role: "hr", disc: null, companyName: "ريدكون" }), "ReplyBox"],
  ["a post, as an employer", "#app/post/p1", () => signInAs({ role: "owner", disc: null, companyName: "ريدكون" }), "ReplyBox"],
];
// a stored session: account record (test values) + profile + session flag
const signIn = (lang: string) => { localStorage.setItem("engspace.lang", lang); C.saveAccount({ email: "demo@example.test", hash: "test-hash", salt: "test-salt" }); C.savePersona({ ...C.DEMO_PERSONA }); C.setSession(true); };
const signInAs = (over: any) => { signIn("ar"); C.savePersona({ ...C.DEMO_PERSONA, ...over }); };
// each starting point is a fresh page: empty storage, no address, Arabic, and none of the app's state stores
const freshPage = () => { for (const k of Object.keys(store)) delete store[k]; location.hash = ""; C.I18N.lang = "ar"; C.liveState().stores = {}; };

beforeAll(() => (React as any).__preloadLazy()); // the admin console and the CV review are lazy chunks in the app
beforeEach(freshPage);

test.each(setups)("renders every component reached from: %s", (_, hash, setup, reaches) => {
  setup(); location.hash = hash; count = 0; seen.clear();
  render(el(C.App));
  expect(count).toBeGreaterThan(10);
  expect([...seen]).toContain(reaches);
});

test("every handler reached from those screens runs without throwing", () => {
  handlers = 0; handlerErrors.length = 0;
  for (const [, hash, setup] of setups) { freshPage(); setup(); location.hash = hash; crawl(el(C.App)); }
  expect(handlers).toBeGreaterThan(50);
  expect(handlerErrors).toEqual([]);
});

test("the push primer renders for each role, in each state, and its handlers run", () => {
  for (const role of ["engineer", "supervisor", "hr"]) {
    const app: any = { profile: { role }, native: false, enablePush: async () => ({ ok: true }), pushPrimerLater() {}, closeSheet() {}, push() {} };
    count = 0; seen.clear(); render(el(C.PushPrimerSheet, { app })); expect(seen.has("PushPrimerSheet")).toBe(true);
    const errs: string[] = []; handlers = 0; const before = handlerErrors.length; crawl(el(C.PushPrimerSheet, { app })); expect(handlerErrors.length).toBe(before); void errs;
  }
});

test("a job from an employer whose company is not in the registry renders (no id, no English name) — it once crashed every member's feed", () => {
  const job = { id: "j9", title: "مهندس موقع أول", co: null, coName: "ريدكون", gov: "cairo", city: "nasr", disc: "civil", sub: null, years: [5, 8], mode: null, desc: "وصف", reqs: [], skills: [], contact: { email: "j@example.com" }, when: "الآن" };
  const app: any = { saved: {}, contacted: {}, logos: {}, profile: { role: "engineer", disc: "civil", gov: "cairo" }, push() {}, moneyAccess: "full", jobStats: {}, toast() {} };
  count = 0; seen.clear(); render(el(C.JobCard, { job, app })); expect(seen.has("CompanyLogo")).toBe(true);
  render(el(C.CompanyLogo, { c: { name: "ريدكون" } })); expect(C.hueOf(undefined)).toBe(7);
});
