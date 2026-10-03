// Live web updates (docs/OTA.md): the app checks our own manifest in Supabase Storage, downloads a newer web bundle in the background,
// verifies its SHA-256 and applies it on the next start (or at once from Settings). A bundle that does not prove itself healthy within
// seconds is rolled back by the plugin and never tried again. Native shells only; the web build is always the latest deploy.
import { Capacitor } from "@capacitor/core";
import { SUPABASE_URL } from "../backend/config";
import { decide, looksHealthy, manifestUrl, nativeLineOf, parseManifest } from "./updater-core";

const BAD_KEY = "engspace.ota.bad"; const CHANNEL: string = (import.meta as any).env.VITE_UPDATE_CHANNEL || "preview";
export const OTA = Capacitor.isNativePlatform() && !!SUPABASE_URL;

export type OtaState = {
  supported: boolean; bundle: string; builtin: boolean; native: string; running: number;   // what runs now
  status: "idle" | "checking" | "downloading" | "ready" | "current" | "failed" | "incompatible";
  pending?: { id: string; version: string }; lastCheck?: number; note?: string; rolledBack?: string;
};
const state: OtaState = { supported: OTA, bundle: __BUILD__.version, builtin: true, native: "", running: __BUILD__.ts || 0, status: "idle" };
const listeners = new Set<(s: OtaState) => void>();
const emit = (patch: Partial<OtaState>) => { Object.assign(state, patch); listeners.forEach((f) => f({ ...state })); };
export const otaState = () => ({ ...state });
export const onOtaState = (f: (s: OtaState) => void) => { listeners.add(f); return () => { listeners.delete(f); }; };

const plugin = async () => (await import("@capgo/capacitor-updater")).CapacitorUpdater;
const bad = (): string[] => { try { return JSON.parse(localStorage.getItem(BAD_KEY) || "[]"); } catch (e) { return []; } };
const markBad = (v: string) => { try { localStorage.setItem(BAD_KEY, JSON.stringify([...new Set([...bad(), v])].slice(-20))); } catch (e) {} };

// Called once after the first render: tells the plugin this bundle is alive (or lets it roll back), then reads what is installed.
export async function startUpdater(health: () => Parameters<typeof looksHealthy>[0]) {
  if (!OTA) return;
  try {
    const P = await plugin();
    const failed = await P.getFailedUpdate().catch(() => null);   // the plugin rolled a bundle back since the last run: remember it, never retry it
    if (failed && failed.bundle) { markBad(failed.bundle.version); emit({ rolledBack: failed.bundle.version }); }
    if (looksHealthy(health())) await P.notifyAppReady();
    const cur = await P.current(); emit({ bundle: cur.bundle.version === "builtin" ? __BUILD__.version : cur.bundle.version, builtin: cur.bundle.version === "builtin", native: cur.native });
    const next = await P.getNextBundle().catch(() => null); if (next && next.version && next.version !== cur.bundle.version) emit({ status: "ready", pending: { id: next.id, version: next.version } });
  } catch (e) { /* the plugin is not there (old shell): the app simply never updates over the air */ }
}

// One check: manifest → decision → download → next(). Never throws; the outcome is in the state.
export async function checkForUpdate(): Promise<OtaState> {
  if (!OTA || state.status === "checking" || state.status === "downloading") return otaState();
  emit({ status: "checking" });
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 8000);
    const r = await fetch(`${manifestUrl(SUPABASE_URL, CHANNEL)}?t=${Date.now()}`, { cache: "no-store", signal: ctl.signal }).finally(() => clearTimeout(t));
    if (!r.ok) throw new Error("manifest " + r.status);
    const m = parseManifest(await r.json(), SUPABASE_URL); if (!m) throw new Error("bad manifest");
    const P = await plugin(); const cur = await P.current();
    const d = decide(m, { runningBuild: __BUILD__.ts || 0, nativeVersion: cur.native, badVersions: bad() });
    if (d.go === false) { emit({ status: d.why === "newer-native" ? "incompatible" : "current", lastCheck: Date.now(), note: d.why }); return otaState(); }
    // already downloaded earlier (e.g. the app was closed before it restarted)?
    const have = (await P.list().catch(() => ({ bundles: [] as any[] }))).bundles.find((b: any) => b.version === m.version && b.status !== "error");
    emit({ status: "downloading", note: m.version });
    const b = have || await P.download({ url: m.url, version: m.version, checksum: m.sha256 });
    await P.next({ id: b.id });
    emit({ status: "ready", pending: { id: b.id, version: m.version }, lastCheck: Date.now(), note: m.notes });
  } catch (e: any) { emit({ status: "failed", lastCheck: Date.now(), note: String((e && e.message) || e).slice(0, 120) }); }
  return otaState();
}

// Apply the downloaded bundle now (reloads the app on it)
export async function applyUpdateNow() { const p = state.pending; if (!OTA || !p) { if (import.meta.env.DEV && (window as any).__engspaceOta) (window as any).__engspaceOta.applied++; return; }  try { await (await plugin()).set({ id: p.id }); } catch (e) { emit({ status: "failed", note: "apply" }); } }

// launch + coming back to the app (at most every 30 minutes)
let lastAuto = 0;
export function scheduleChecks() {
  if (!OTA) return;
  const run = () => { if (Date.now() - lastAuto < 30 * 60 * 1000) return; lastAuto = Date.now(); checkForUpdate(); };
  setTimeout(run, 4000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") run(); });
}
export { nativeLineOf };

// Development only (compiled out of production builds): lets the e2e tests drive the update banner in a browser, where there is no plugin
if (import.meta.env.DEV && typeof window !== "undefined") (window as any).__engspaceOta = { applied: 0, ready: (version = "0.25.0-test") => emit({ supported: true, status: "ready", pending: { id: "t1", version } }), reset: () => emit({ status: "idle", pending: undefined }) };
