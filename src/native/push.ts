// =====================================================================
//  Push notifications on the phone (Capacitor PushNotifications → FCM on Android, APNs on iOS) and, in a browser, the
//  Notification API while the page is open.
//  · Nothing here asks the OS for permission by itself: the primer sheet (features/notifications/push-primer.tsx) explains
//    first, and only «تفعيل الإشعارات» calls enablePush().
//  · The device token goes to the server through register_push_token and is never read back (supabase/…_push_notifications.sql).
//  · A tapped notification carries { type, id, nid } — validated by openTarget() and then handled exactly like a shared link.
//  · Missing Firebase / Apple credentials are an expected state ("not available in this build"), never an error screen.
// =====================================================================
import { NATIVE, PLATFORM, setPendingOpen } from "./native";
import * as cloud from "../backend/cloud";
import { notifPref, openTarget } from "../domain/notifications";

export type PushPermission = "default" | "granted" | "denied" | "unsupported";
export type PushResult = { ok: boolean; permission: PushPermission; reason?: "denied" | "unavailable" | "unsupported" | "timeout" | "error"; detail?: string };

// the member's choices about being asked: how many times they said «not now», and when we last asked
const KEY = "engspace.push.v1";
export type AskState = { n: number; at: number };
export const readAsk = (): AskState => { try { const o = JSON.parse(localStorage.getItem(KEY) || "{}"); return { n: Number(o.n) || 0, at: Number(o.at) || 0 }; } catch { return { n: 0, at: 0 }; } };
export const writeAsk = (s: AskState) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ } };
// ask automatically at most twice, a week apart; the settings screen can always ask
export const mayAskAgain = (s: AskState, now = Date.now()) => s.n < 2 && now - s.at > 7 * 86_400_000;

export const pushSupported = () => NATIVE || (typeof window !== "undefined" && "Notification" in window);

let token: string | null = null;           // this device's current token (kept to drop it on sign-out)
let registered = false;                    // true once the server has this device
let lastError: string | null = null;
let lang: "ar" | "en" = "ar";
export const pushState = () => ({ registered, token: !!token, error: lastError });

const channels = (en: boolean) => [
  { id: "jobs", name: en ? "Job matches" : "الوظائف المطابقة", description: en ? "New jobs that fit your discipline, experience and city" : "وظائف جديدة تناسب تخصصك وخبرتك ومدينتك", importance: 4 },
  { id: "community", name: en ? "Community" : "المجتمع", description: en ? "Replies, mentions and private messages" : "الردود والإشارات والرسائل الخاصة", importance: 4 },
  { id: "support", name: en ? "Support" : "الدعم", description: en ? "Replies and updates from the EngSpace team" : "ردود وتحديثات من فريق EngSpace", importance: 4 },
  { id: "system", name: en ? "System" : "النظام", description: en ? "Salary and inflation updates, account notices" : "تحديثات الرواتب والتضخم وإشعارات الحساب", importance: 3 },
];

const mapPerm = (r?: string): PushPermission => (r === "granted" ? "granted" : r === "denied" ? "denied" : "default");

export async function pushPermission(): Promise<PushPermission> {
  if (NATIVE) { try { const { PushNotifications } = await import("@capacitor/push-notifications"); return mapPerm((await PushNotifications.checkPermissions()).receive); } catch { return "unsupported"; } }
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return mapPerm(Notification.permission === "default" ? "prompt" : Notification.permission);
}

// a tapped push: { type, id, nid } — validated, then opened like a shared link (an «update» notice: Home + the update check + the banner)
export function onPushTap(d: any) {
  const t = openTarget({ type: d && d.type, id: d && d.id }); if (!t) return;
  setPendingOpen({ ...(t.stack || { tab: t.tab }), update: !!t.update, nid: (d && d.nid) || null }); window.dispatchEvent(new CustomEvent("engspace:open"));
}
// development only (compiled out of production): e2e taps a push through the same path a phone uses
if (import.meta.env.DEV && typeof window !== "undefined") (window as any).__engspacePush = { tap: onPushTap };

let wired = false;
// listeners are attached once per app run
async function wire() {
  if (wired || !NATIVE) return; wired = true;
  const { PushNotifications } = await import("@capacitor/push-notifications");
  PushNotifications.addListener("registration", async (t) => {
    token = t.value; lastError = null;
    try { await cloud.registerPushToken(t.value, PLATFORM === "ios" ? "ios" : "android", lang); registered = true; window.dispatchEvent(new CustomEvent("engspace:push-registered")); }
    catch (e: any) { lastError = (e && e.message) || "register"; }
  });
  PushNotifications.addListener("registrationError", (e: any) => { lastError = (e && (e.error || e.message)) || "registration failed"; window.dispatchEvent(new CustomEvent("engspace:push-error", { detail: lastError })); });
  // while the app is open the in-app center already heard about it (realtime): just let the app refresh its counters
  PushNotifications.addListener("pushNotificationReceived", () => window.dispatchEvent(new CustomEvent("engspace:push")));
  // a tap: where to go (validated), and which notice to mark read
  PushNotifications.addListener("pushNotificationActionPerformed", (a: any) => onPushTap((a && a.notification && a.notification.data) || {}));
  if (PLATFORM === "android") { try { for (const c of channels(lang === "en")) await PushNotifications.createChannel({ ...c, visibility: 0, vibration: true } as any); } catch { /* channels exist already */ } }
}

// registers the device (asks the OS first when asked to). Called from the primer sheet and from the settings screen.
export async function enablePush(language: "ar" | "en", ask = true): Promise<PushResult> {
  lang = language;
  if (!NATIVE) {
    if (!pushSupported()) return { ok: false, permission: "unsupported", reason: "unsupported" };
    let p = await pushPermission();
    if (p === "default" && ask) { try { const r = await Notification.requestPermission(); p = r === "granted" ? "granted" : r === "denied" ? "denied" : "default"; } catch { /* old Safari: callback form */ } }
    return { ok: p === "granted", permission: p, reason: p === "denied" ? "denied" : undefined };
  }
  try {
    await wire(); const { PushNotifications } = await import("@capacitor/push-notifications");
    let perm = mapPerm((await PushNotifications.checkPermissions()).receive);
    if (perm === "default" && ask) perm = mapPerm((await PushNotifications.requestPermissions()).receive);
    if (perm !== "granted") return { ok: false, permission: perm, reason: perm === "denied" ? "denied" : undefined };
    // the token arrives through the "registration" listener; wait for it (or for the platform's refusal)
    const done = new Promise<PushResult>((resolve) => {
      const ok = () => { cleanup(); resolve({ ok: true, permission: "granted" }); };
      const bad = (e: any) => { cleanup(); resolve({ ok: false, permission: "granted", reason: "unavailable", detail: String(e && e.detail || "") }); };
      const t = setTimeout(() => { cleanup(); resolve({ ok: false, permission: "granted", reason: "timeout" }); }, 15000);
      const cleanup = () => { clearTimeout(t); window.removeEventListener("engspace:push-registered", ok); window.removeEventListener("engspace:push-error", bad); };
      window.addEventListener("engspace:push-registered", ok); window.addEventListener("engspace:push-error", bad);
    });
    await PushNotifications.register();   // rejects when Firebase is not set up in this build (no google-services.json)
    return await done;
  } catch (e: any) { lastError = (e && e.message) || String(e); return { ok: false, permission: "granted", reason: "unavailable", detail: lastError || "" }; }
}

// at app start for a signed-in member who already allowed pushes: refresh the token (it changes now and then)
export async function refreshPush(language: "ar" | "en") {
  lang = language; if (!NATIVE) return;
  try { if ((await pushPermission()) === "granted") { await wire(); const { PushNotifications } = await import("@capacitor/push-notifications"); await PushNotifications.register(); } } catch { /* not available in this build */ }
}

// sign-out: this phone stops receiving this member's notices
export async function dropPush() {
  const t = token; token = null; registered = false;
  if (t) { try { await cloud.unregisterPushToken(t); } catch { /* signed out already: the server drops it on the next registration */ } }
}

// web: a notice that arrived while the page is open, shown as a browser notification when the page is hidden
// (kind decides which preference applies; prefs come from the server)
export function webNotify(n: { kind?: string; title: string; body?: string }, prefs: Record<string, boolean> | null) {
  try {
    if (NATIVE || typeof Notification === "undefined" || Notification.permission !== "granted" || !document.hidden) return;
    if (prefs && prefs.notify === false) return; const key = notifPref(n.kind); if (key && prefs && prefs[key] === false) return;
    new Notification(n.title, { body: n.body || "", tag: n.kind || "engspace", icon: "./apple-touch-icon.png" });
  } catch { /* some mobile browsers only allow service-worker notifications */ }
}
