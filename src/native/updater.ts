// Live web updates (docs/OTA.md): the app checks our own manifest in Supabase Storage, downloads a newer web bundle in the background,
// verifies its SHA-256 and applies it on the next start (or at once from the update banner). A bundle that does not prove itself healthy
// within seconds is rolled back by the plugin and never tried again. Native shells only; the web build is always the latest deploy.
//
// Nothing here may wait forever (v0.1.12): the plugin's own download waits for its background worker with no deadline, and that worker
// retries network errors indefinitely — so the check showed a spinner until the app was closed. Every native call now has a deadline,
// the download a watchdog that resets on each progress event, and a stuck check never blocks the next one.
import { Capacitor } from "@capacitor/core";
import { SUPABASE_URL } from "../backend/config";
import { decide, looksHealthy, manifestUrl, nativeLineOf, parseManifest } from "./updater-core";

const BAD_KEY = "engspace.ota.bad"; const CHANNEL: string = (import.meta as any).env.VITE_UPDATE_CHANNEL || "preview";
export const OTA = Capacitor.isNativePlatform() && !!SUPABASE_URL;
// deadlines (ms): the manifest, each quick plugin call, the whole check, and the download (no progress for IDLE, or longer than TOTAL)
export const LIMITS = { manifest: 10000, call: 6000, idle: 30000, total: 180000, check: 200000 };

export type OtaState = {
  supported: boolean; bundle: string; builtin: boolean; native: string; running: number;   // what runs now
  status: "idle" | "checking" | "downloading" | "ready" | "current" | "failed" | "incompatible";
  pending?: { id: string; version: string }; lastCheck?: number; note?: string; rolledBack?: string; progress?: number; error?: string;
  plugin?: boolean;   // Capacitor.isPluginAvailable("CapacitorUpdater") on this phone — shown in Settings for diagnosis
  asked?: number;     // when the member opened an «تحديث جديد متاح» notice: the banner then shows the check and download too
};
const state: OtaState = { supported: OTA, bundle: __BUILD__.version, builtin: true, native: "", running: __BUILD__.ts || 0, status: "idle" };
const listeners = new Set<(s: OtaState) => void>(); const toasts = new Set<(t: string) => void>();
const emit = (patch: Partial<OtaState>) => { Object.assign(state, patch); listeners.forEach((f) => f({ ...state })); };
const toast = (t: string) => toasts.forEach((f) => f(t));
export const otaState = () => ({ ...state });
export const onOtaState = (f: (s: OtaState) => void) => { listeners.add(f); return () => { listeners.delete(f); }; };
// messages for a check the member started themselves (the automatic ones stay silent unless an update arrives)
export const onOtaToast = (f: (t: string) => void) => { toasts.add(f); return () => { toasts.delete(f); }; };

// what went wrong, in words a member can act on
export const OTA_ERRORS: Record<string, string> = {
  offline: "لا يوجد اتصال بالإنترنت — حاول مرة أخرى",
  timeout: "انتهت مهلة فحص التحديث — تحقّق من اتصالك وحاول مرة أخرى",
  server: "تعذّر الوصول إلى خادم التحديثات — حاول لاحقًا",
  manifest: "بيانات التحديث على الخادم غير صالحة — أبلغ فريق EngSpace",
  download: "تعذّر تنزيل التحديث — سنحاول مجددًا تلقائيًا",
  plugin: "خدمة التحديث غير متاحة في هذه النسخة — ثبّت أحدث نسخة من التطبيق",
};
class OtaError extends Error { constructor(public kind: keyof typeof OTA_ERRORS, detail = "") { super(detail || kind); } }
export function withTimeout<T>(p: Promise<T>, ms: number, kind: keyof typeof OTA_ERRORS = "timeout"): Promise<T> {
  return new Promise<T>((res, rej) => { const t = setTimeout(() => rej(new OtaError(kind, `timeout after ${ms} ms`)), ms); p.then((v) => { clearTimeout(t); res(v); }, (e) => { clearTimeout(t); rej(e); }); });
}

// NEVER resolve a promise with a Capacitor plugin object (v0.1.13): the plugin is a Proxy that answers every property — `then` too — with a
// native method wrapper, so `async () => plugin` / `.then((m) => m.Plugin)` makes the promise call a native «then» that does not exist and
// the promise never settles. That was the endless spinner (v0.1.11) and «خدمة التحديث غير متاحة» after the 6 s deadline (v0.1.12) on both
// phones. Promises carry the MODULE (a namespace object has no `then`); the plugin is only ever read from it synchronously.
type UpdaterModule = { CapacitorUpdater: any };
let modP: Promise<UpdaterModule> | null = null;
const mod = () => (modP = modP || withTimeout(import("@capgo/capacitor-updater") as Promise<UpdaterModule>, LIMITS.call, "plugin").catch((e) => { modP = null; throw e; }));
// the native side is really there (Capacitor knows the plugin from the shell's registration) — checked before any call
export const pluginAvailable = () => { try { return Capacitor.isPluginAvailable("CapacitorUpdater"); } catch (e) { return false; } };
const call = <T>(f: (P: any) => Promise<T>): Promise<T> => { if (!pluginAvailable()) return Promise.reject(new OtaError("plugin", "CapacitorUpdater not registered")); return mod().then((m) => withTimeout(f(m.CapacitorUpdater), LIMITS.call, "plugin")); };
const bad = (): string[] => { try { return JSON.parse(localStorage.getItem(BAD_KEY) || "[]"); } catch (e) { return []; } };
const markBad = (v: string) => { try { localStorage.setItem(BAD_KEY, JSON.stringify([...new Set([...bad(), v])].slice(-20))); } catch (e) {} };

// Called once after the first render: tells the plugin this bundle is alive (or lets it roll back), then reads what is installed.
// Each step is bounded; a failure here never stops the update checks.
export async function startUpdater(health: () => Parameters<typeof looksHealthy>[0]) {
  if (!OTA) return;
  emit({ plugin: pluginAvailable() });
  try { if (looksHealthy(health())) await call((P) => P.notifyAppReady()); } catch (e) {}
  try { const failed: any = await call((P) => P.getFailedUpdate()); if (failed && failed.bundle) { markBad(failed.bundle.version); emit({ rolledBack: failed.bundle.version }); } } catch (e) {}
  try { const cur: any = await call((P) => P.current()); emit({ bundle: cur.bundle.version === "builtin" ? __BUILD__.version : cur.bundle.version, builtin: cur.bundle.version === "builtin", native: cur.native }); } catch (e) {}
  try { const cur = state.bundle; const next: any = await call((P) => P.getNextBundle()); if (next && next.version && next.version !== cur && next.status !== "error") emit({ status: "ready", pending: { id: next.id, version: next.version } }); } catch (e) {}
}

// The download, watched: progress events reset the idle timer; no progress for LIMITS.idle or longer than LIMITS.total ends the wait.
// If the plugin finishes later anyway, the bundle is still scheduled (lateReady) — nothing is lost, the member just was not kept waiting.
function watchedDownload(P: any, m: { url: string; version: string; sha256: string }, lateReady: (b: any) => void): Promise<any> {
  return new Promise((res, rej) => {
    let done = false, idle: any, total: any, handle: any = null;
    const finish = (f: () => void) => { if (done) return; done = true; clearTimeout(idle); clearTimeout(total); if (handle) handle.remove().catch(() => {}); f(); };
    const arm = () => { clearTimeout(idle); idle = setTimeout(() => finish(() => rej(new OtaError("download", "no progress"))), LIMITS.idle); };
    Promise.resolve(P.addListener("download", (e: any) => { if (done) return; if (e && typeof e.percent === "number") emit({ progress: Math.max(0, Math.min(100, Math.round(e.percent))) }); arm(); })).then((h) => { handle = h; if (done) h.remove().catch(() => {}); }, () => {});
    arm(); total = setTimeout(() => finish(() => rej(new OtaError("download", "too slow"))), LIMITS.total);
    P.download({ url: m.url, version: m.version, checksum: m.sha256 }).then((b: any) => { if (done) lateReady(b); else finish(() => res(b)); }, (e: any) => finish(() => rej(new OtaError("download", String((e && e.message) || e)))));
  });
}

let inflight: Promise<OtaState> | null = null; let inflightAt = 0;
// One check: manifest → decision → download → next(). Never throws and never hangs; the outcome is in the state.
// A check already running is joined (a tap during the automatic check shows the same progress) unless it is older than LIMITS.check.
export function checkForUpdate(opts: { manual?: boolean } = {}): Promise<OtaState> {
  if (!OTA) return Promise.resolve(otaState());
  if (inflight && Date.now() - inflightAt < LIMITS.check) { if (opts.manual) inflight.then((s) => report(s, true)); return inflight; }
  inflightAt = Date.now();
  const run = withTimeout(runCheck(), LIMITS.check).catch((e) => fail(e));
  inflight = run.finally(() => { inflight = null; }) as Promise<OtaState>;
  if (opts.manual) inflight.then((s) => report(s, false));
  return inflight;
}
function fail(e: any): OtaState { const kind = e instanceof OtaError ? e.kind : (typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "server"); emit({ status: "failed", lastCheck: Date.now(), error: OTA_ERRORS[kind], note: String((e && e.message) || e).slice(0, 120), progress: undefined }); return otaState(); }
function report(s: OtaState, joined: boolean) {
  if (s.status === "current") toast("أنت على أحدث إصدار بالفعل");
  else if (s.status === "incompatible") toast("يتوفر تحديث يحتاج نسخة أحدث من التطبيق — ثبّتها من صفحة الإصدارات");
  else if (s.status === "failed") toast(s.error || OTA_ERRORS.server);
  else if (s.status === "ready" && joined) toast("التحديث جاهز — اضغط «تحديث الآن» في الشريط العلوي");
}
async function runCheck(): Promise<OtaState> {
  emit({ status: "checking", error: undefined, progress: undefined });
  if (!pluginAvailable()) throw new OtaError("plugin", "CapacitorUpdater not registered");
  if (typeof navigator !== "undefined" && navigator.onLine === false) throw new OtaError("offline");
  let raw: any;
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), LIMITS.manifest);
  try {
    const r = await fetch(`${manifestUrl(SUPABASE_URL, CHANNEL)}?t=${Date.now()}`, { cache: "no-store", signal: ctl.signal });
    if (r.status === 404) { emit({ status: "current", lastCheck: Date.now(), note: "no manifest" }); return otaState(); }   // nothing published yet
    if (!r.ok) throw new OtaError("server", `manifest ${r.status}`);
    raw = await r.json();
  } catch (e: any) { throw e instanceof OtaError ? e : new OtaError(e && e.name === "AbortError" ? "timeout" : (typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "server"), String((e && e.message) || e)); }
  finally { clearTimeout(t); }
  const m = parseManifest(raw, SUPABASE_URL); if (!m) throw new OtaError("manifest");
  const cur: any = await call((P) => P.current());
  const d = decide(m, { runningBuild: __BUILD__.ts || 0, nativeVersion: cur.native, badVersions: bad() });
  if (d.go === false) { emit({ status: d.why === "newer-native" ? "incompatible" : "current", lastCheck: Date.now(), note: d.why }); return otaState(); }
  // already downloaded earlier (e.g. the app was closed before it restarted)?
  const list: any = await call((P) => P.list()).catch(() => ({ bundles: [] }));
  const have = ((list && list.bundles) || []).find((b: any) => b.version === m.version && b.status !== "error" && b.status !== "downloading");
  emit({ status: "downloading", note: m.version, progress: have ? 100 : 0 });
  const P = (await mod()).CapacitorUpdater;   // read from the module, never awaited itself (see mod())
  const schedule = async (b: any) => { await withTimeout(P.next({ id: b.id }), LIMITS.call, "plugin"); emit({ status: "ready", pending: { id: b.id, version: m.version }, lastCheck: Date.now(), note: m.notes, progress: undefined, error: undefined }); };
  const b = have || await watchedDownload(P, m, (late) => { schedule(late).catch(() => {}); });
  await schedule(b);
  return otaState();
}

// «تحديث جديد متاح» was tapped (push or notification center): check now and let the top banner show it from the first moment —
// checking, downloading with progress, then «تحديث الآن». A check that finds nothing ends in the usual toast.
export function requestUpdate() {
  emit({ asked: Date.now() });
  if (import.meta.env.DEV && typeof window !== "undefined" && (window as any).__engspaceOta && !OTA) { (window as any).__engspaceOta.requested++; return; }
  checkForUpdate({ manual: true });
}

// Apply the downloaded bundle now (reloads the app on it)
export async function applyUpdateNow() {
  const p = state.pending; if (!OTA || !p) { if (import.meta.env.DEV && (window as any).__engspaceOta) (window as any).__engspaceOta.applied++; return; }
  try { const P = (await mod()).CapacitorUpdater; await withTimeout(P.set({ id: p.id }), 15000, "plugin"); } catch (e) { emit({ status: "failed", error: OTA_ERRORS.download }); toast("تعذّر تطبيق التحديث الآن — سيُطبَّق عند الفتح التالي"); }
}

// launch + coming back to the app (at most every 30 minutes)
let lastAuto = 0; let scheduled = false;
export function scheduleChecks() {
  if (!OTA || scheduled) return; scheduled = true;
  const run = () => { if (Date.now() - lastAuto < 30 * 60 * 1000) return; lastAuto = Date.now(); checkForUpdate(); };
  setTimeout(run, 4000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") run(); });
}
export { nativeLineOf };

// Development only (compiled out of production builds): lets the e2e tests drive the update banner in a browser, where there is no plugin
if (import.meta.env.DEV && typeof window !== "undefined") (window as any).__engspaceOta = { applied: 0, requested: 0, downloading: (progress = 40) => emit({ supported: true, status: "downloading", progress }), ready: (version = "0.25.0-test") => emit({ supported: true, status: "ready", pending: { id: "t1", version } }), reset: () => emit({ status: "idle", pending: undefined, asked: undefined }) };
