// The updater against a fake plugin: what is downloaded, what is skipped, what is remembered — and that nothing can hang
// (v0.1.12: a download that never returned kept «تحقّق من التحديث» spinning forever on both phones).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const URL0 = "https://abc.supabase.co"; const sha = "b".repeat(64);
const manifest = (extra: any = {}) => ({ version: "0.25.0-2000", build: 2000, nativeLine: 1, url: `${URL0}/storage/v1/object/public/app-updates/preview/0.25.0-2000.zip`, sha256: sha, notes: "تحسينات", ...extra });
const P: any = { current: vi.fn(), download: vi.fn(), next: vi.fn(), set: vi.fn(), list: vi.fn(), notifyAppReady: vi.fn(), getFailedUpdate: vi.fn(), getNextBundle: vi.fn(), addListener: vi.fn() };
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => true, getPlatform: () => "android" } }));
vi.mock("../src/backend/config", () => ({ SUPABASE_URL: "https://abc.supabase.co" }));
vi.mock("@capgo/capacitor-updater", () => ({ CapacitorUpdater: P }));

let U: any; let served: any; let store: Record<string, string>; let progress: ((e: any) => void) | null; let toasts: string[];
const never = () => new Promise(() => {});
// fetch that honours AbortSignal like a browser
const fetchOk = () => vi.fn((_u: string, o: any) => new Promise((res, rej) => { if (o && o.signal) o.signal.addEventListener("abort", () => rej(Object.assign(new Error("aborted"), { name: "AbortError" }))); res({ ok: true, status: 200, json: async () => served }); }));
beforeEach(async () => {
  vi.resetModules(); store = {}; progress = null; toasts = [];
  (globalThis as any).localStorage = { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; } };
  (globalThis as any).navigator = { onLine: true };
  served = manifest(); (globalThis as any).fetch = fetchOk();
  (globalThis as any).document = { addEventListener() {}, visibilityState: "visible", body: { innerText: "" } };
  for (const f of Object.values(P) as any[]) f.mockReset();
  P.current.mockResolvedValue({ bundle: { id: "builtin", version: "builtin" }, native: "1.50" }); P.list.mockResolvedValue({ bundles: [] }); P.getFailedUpdate.mockResolvedValue(null); P.getNextBundle.mockResolvedValue(null);
  P.download.mockResolvedValue({ id: "b1", version: "0.25.0-2000", status: "pending" }); P.next.mockResolvedValue({}); P.notifyAppReady.mockResolvedValue({});
  P.addListener.mockImplementation(async (_e: string, f: any) => { progress = f; return { remove: async () => { progress = null; } }; });
  U = await import("../src/native/updater"); U.onOtaToast((t: string) => toasts.push(t));
});
afterEach(() => { vi.useRealTimers(); });

describe("checkForUpdate()", () => {
  it("downloads a newer bundle with its SHA-256, schedules it for the next start, and says so", async () => {
    const s = await U.checkForUpdate();
    expect(P.download).toHaveBeenCalledWith({ url: served.url, version: "0.25.0-2000", checksum: sha }); expect(P.next).toHaveBeenCalledWith({ id: "b1" });
    expect(s.status).toBe("ready"); expect(s.pending).toEqual({ id: "b1", version: "0.25.0-2000" });
  });
  it("applyUpdateNow() switches to the downloaded bundle", async () => { await U.checkForUpdate(); await U.applyUpdateNow(); expect(P.set).toHaveBeenCalledWith({ id: "b1" }); });
  it("an up-to-date app downloads nothing; a manual check says «أنت على أحدث إصدار بالفعل»", async () => {
    served = manifest({ build: 1 }); const s = await U.checkForUpdate({ manual: true }); await Promise.resolve();
    expect(P.download).not.toHaveBeenCalled(); expect(s.status).toBe("current"); expect(toasts).toEqual(["أنت على أحدث إصدار بالفعل"]);
  });
  it("an automatic check that finds nothing stays silent", async () => { served = manifest({ build: 1 }); await U.checkForUpdate(); await Promise.resolve(); expect(toasts).toEqual([]); });
  it("nothing published yet (404) is «up to date», not an error", async () => { (globalThis as any).fetch = vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })); expect((await U.checkForUpdate()).status).toBe("current"); });
  it("a bundle for another native line is not downloaded; the app says a new install is needed", async () => { served = manifest({ nativeLine: 2 }); const s = await U.checkForUpdate({ manual: true }); await Promise.resolve(); expect(P.download).not.toHaveBeenCalled(); expect(s.status).toBe("incompatible"); expect(toasts[0]).toContain("نسخة أحدث من التطبيق"); });
  it("a manifest pointing outside our bucket is refused with a clear message", async () => { served = manifest({ url: "https://evil.example/x.zip" }); const s = await U.checkForUpdate({ manual: true }); await Promise.resolve(); expect(P.download).not.toHaveBeenCalled(); expect(s.status).toBe("failed"); expect(s.error).toContain("غير صالحة"); expect(toasts[0]).toBe(s.error); });
  it("a server error and a failed download end in «failed» with a message, never a crash", async () => {
    (globalThis as any).fetch = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })); let s = await U.checkForUpdate(); expect(s.status).toBe("failed"); expect(s.error).toContain("خادم التحديثات");
    (globalThis as any).fetch = fetchOk(); P.download.mockRejectedValueOnce(new Error("Checksum failed")); s = await U.checkForUpdate(); expect(s.status).toBe("failed"); expect(s.error).toContain("تنزيل التحديث"); expect(P.next).not.toHaveBeenCalled();
  });
  it("offline is said plainly, without a network wait", async () => { (globalThis as any).navigator = { onLine: false }; const s = await U.checkForUpdate({ manual: true }); await Promise.resolve(); expect(s.error).toContain("لا يوجد اتصال"); expect((globalThis as any).fetch).not.toHaveBeenCalled(); });
  it("a bundle already downloaded (app closed before restarting) is reused, not downloaded again", async () => {
    P.list.mockResolvedValue({ bundles: [{ id: "b9", version: "0.25.0-2000", status: "pending" }] }); await U.checkForUpdate(); expect(P.download).not.toHaveBeenCalled(); expect(P.next).toHaveBeenCalledWith({ id: "b9" });
  });
  it("a check while another is running joins it (one network request)", async () => { const a = U.checkForUpdate(); const b = U.checkForUpdate({ manual: true }); await Promise.all([a, b]); expect((globalThis as any).fetch).toHaveBeenCalledTimes(1); });
});

describe("nothing hangs (the bug on both phones)", () => {
  it("a native download that never returns ends after the idle limit with an error — the spinner stops", async () => {
    vi.useFakeTimers(); P.download.mockImplementation(never);
    const p = U.checkForUpdate({ manual: true }); await vi.advanceTimersByTimeAsync(1000); expect(U.otaState().status).toBe("downloading");
    await vi.advanceTimersByTimeAsync(U.LIMITS.idle + 1000); const s = await p;
    expect(s.status).toBe("failed"); expect(s.error).toContain("تنزيل التحديث"); expect(toasts.at(-1)).toBe(s.error);
  });
  it("progress events keep a slow download alive; it still ends at the total limit", async () => {
    vi.useFakeTimers(); P.download.mockImplementation(never); const p = U.checkForUpdate();
    for (let t = 0; t < 4; t++) { await vi.advanceTimersByTimeAsync(U.LIMITS.idle - 5000); progress!({ percent: 20 + t * 10 }); }
    expect(U.otaState().status).toBe("downloading"); expect(U.otaState().progress).toBe(50);
    await vi.advanceTimersByTimeAsync(U.LIMITS.total); expect((await p).status).toBe("failed");
  });
  it("a download that finishes after we stopped waiting is still scheduled — the banner appears", async () => {
    vi.useFakeTimers(); let finish: any; P.download.mockImplementation(() => new Promise((r) => { finish = r; }));
    const p = U.checkForUpdate(); await vi.advanceTimersByTimeAsync(U.LIMITS.idle + 1000); expect((await p).status).toBe("failed");
    finish({ id: "late", version: "0.25.0-2000" }); await vi.advanceTimersByTimeAsync(10);
    expect(P.next).toHaveBeenCalledWith({ id: "late" }); expect(U.otaState()).toMatchObject({ status: "ready", pending: { id: "late" } });
  });
  it("a native call that never answers (current) fails after a few seconds", async () => {
    vi.useFakeTimers(); P.current.mockImplementation(never); const p = U.checkForUpdate({ manual: true });
    await vi.advanceTimersByTimeAsync(U.LIMITS.call + 500); const s = await p; expect(s.status).toBe("failed"); expect(s.error).toContain("خدمة التحديث");
  });
  it("a manifest request that never answers is aborted after the manifest limit", async () => {
    vi.useFakeTimers(); (globalThis as any).fetch = vi.fn((_u: string, o: any) => new Promise((_r, rej) => o.signal.addEventListener("abort", () => rej(Object.assign(new Error("aborted"), { name: "AbortError" })))));
    const p = U.checkForUpdate({ manual: true }); await vi.advanceTimersByTimeAsync(U.LIMITS.manifest + 500); const s = await p; expect(s.status).toBe("failed"); expect(s.error).toContain("انتهت مهلة");
  });
  it("after a stuck check, the next tap starts a fresh check (no permanent busy state)", async () => {
    vi.useFakeTimers(); P.download.mockImplementationOnce(never); const p = U.checkForUpdate(); await vi.advanceTimersByTimeAsync(U.LIMITS.idle + 1000); await p;
    const s = await U.checkForUpdate({ manual: true }); expect(s.status).toBe("ready"); expect((globalThis as any).fetch).toHaveBeenCalledTimes(2);
  });
  it("withTimeout settles with the value, or rejects at the deadline", async () => {
    vi.useFakeTimers(); await expect(U.withTimeout(Promise.resolve(5), 10)).resolves.toBe(5);
    const p = U.withTimeout(never(), 1000).catch((e: any) => e.kind); await vi.advanceTimersByTimeAsync(1001); expect(await p).toBe("timeout");
  });
});

describe("startUpdater(): confirm a healthy bundle, remember a rolled-back one, never block the checks", () => {
  const healthy = () => ({ rootHasContent: true, uncaughtErrors: 0, errorScreen: false });
  it("a healthy start tells the plugin the bundle works", async () => { await U.startUpdater(healthy); expect(P.notifyAppReady).toHaveBeenCalledTimes(1); });
  it("a start with an uncaught error is NOT confirmed — the plugin will roll back", async () => { await U.startUpdater(() => ({ ...healthy(), uncaughtErrors: 2 })); expect(P.notifyAppReady).not.toHaveBeenCalled(); });
  it("a bundle the plugin rolled back is remembered and never downloaded again", async () => {
    P.getFailedUpdate.mockResolvedValue({ bundle: { id: "bx", version: "0.25.0-2000" } }); await U.startUpdater(healthy); expect(U.otaState().rolledBack).toBe("0.25.0-2000"); expect(JSON.parse(store["engspace.ota.bad"])).toContain("0.25.0-2000");
    const s = await U.checkForUpdate(); expect(P.download).not.toHaveBeenCalled(); expect(s.status).toBe("current");
  });
  it("reports the running bundle: built-in vs downloaded", async () => {
    await U.startUpdater(healthy); expect(U.otaState().builtin).toBe(true);
    P.current.mockResolvedValue({ bundle: { id: "b1", version: "0.25.0-2000" }, native: "1.50" }); await U.startUpdater(healthy); expect(U.otaState()).toMatchObject({ builtin: false, bundle: "0.25.0-2000", native: "1.50" });
  });
  it("a pending download from an earlier run shows as ready", async () => { P.getNextBundle.mockResolvedValue({ id: "b2", version: "0.25.0-3000" }); await U.startUpdater(healthy); expect(U.otaState()).toMatchObject({ status: "ready", pending: { id: "b2", version: "0.25.0-3000" } }); });
  it("plugin calls that never answer cannot stall the start (each is bounded)", async () => {
    vi.useFakeTimers(); for (const k of ["notifyAppReady", "getFailedUpdate", "current", "getNextBundle"]) P[k].mockImplementation(never);
    let done = false; U.startUpdater(healthy).then(() => { done = true; }); await vi.advanceTimersByTimeAsync(4 * U.LIMITS.call + 1000); expect(done).toBe(true);
  });
});
