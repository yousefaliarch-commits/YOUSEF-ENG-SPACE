// The updater against a fake plugin: what is downloaded, what is skipped, what is remembered.
import { beforeEach, describe, expect, it, vi } from "vitest";

const URL0 = "https://abc.supabase.co"; const sha = "b".repeat(64);
const manifest = (extra: any = {}) => ({ version: "0.25.0-2000", build: 2000, nativeLine: 1, url: `${URL0}/storage/v1/object/public/app-updates/preview/0.25.0-2000.zip`, sha256: sha, notes: "تحسينات", ...extra });
const P: any = { current: vi.fn(), download: vi.fn(), next: vi.fn(), set: vi.fn(), list: vi.fn(), notifyAppReady: vi.fn(), getFailedUpdate: vi.fn(), getNextBundle: vi.fn() };
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => true, getPlatform: () => "android" } }));
vi.mock("../src/backend/config", () => ({ SUPABASE_URL: "https://abc.supabase.co" }));
vi.mock("@capgo/capacitor-updater", () => ({ CapacitorUpdater: P }));

let U: any; let served: any; let store: Record<string, string>;
beforeEach(async () => {
  vi.resetModules(); store = {};
  (globalThis as any).localStorage = { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; } };
  served = manifest(); (globalThis as any).fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => served }));
  (globalThis as any).document = { addEventListener() {}, visibilityState: "visible", body: { innerText: "" } };
  for (const f of Object.values(P) as any[]) f.mockReset();
  P.current.mockResolvedValue({ bundle: { id: "builtin", version: "builtin" }, native: "1.50" }); P.list.mockResolvedValue({ bundles: [] }); P.getFailedUpdate.mockResolvedValue(null); P.getNextBundle.mockResolvedValue(null);
  P.download.mockResolvedValue({ id: "b1", version: "0.25.0-2000", status: "pending" }); P.next.mockResolvedValue({}); P.notifyAppReady.mockResolvedValue({});
  U = await import("../src/native/updater");
});

describe("checkForUpdate()", () => {
  it("downloads a newer bundle with its SHA-256, schedules it for the next start, and says so", async () => {
    const s = await U.checkForUpdate();
    expect(P.download).toHaveBeenCalledWith({ url: served.url, version: "0.25.0-2000", checksum: sha }); expect(P.next).toHaveBeenCalledWith({ id: "b1" });
    expect(s.status).toBe("ready"); expect(s.pending).toEqual({ id: "b1", version: "0.25.0-2000" });
  });
  it("applyUpdateNow() switches to the downloaded bundle", async () => { await U.checkForUpdate(); await U.applyUpdateNow(); expect(P.set).toHaveBeenCalledWith({ id: "b1" }); });
  it("an up-to-date app downloads nothing", async () => { served = manifest({ build: 1 }); const s = await U.checkForUpdate(); expect(P.download).not.toHaveBeenCalled(); expect(s.status).toBe("current"); });
  it("a bundle for another native line is not downloaded; the app says a new install is needed", async () => { served = manifest({ nativeLine: 2 }); const s = await U.checkForUpdate(); expect(P.download).not.toHaveBeenCalled(); expect(s.status).toBe("incompatible"); });
  it("a manifest pointing outside our bucket is refused", async () => { served = manifest({ url: "https://evil.example/x.zip" }); const s = await U.checkForUpdate(); expect(P.download).not.toHaveBeenCalled(); expect(s.status).toBe("failed"); });
  it("an unreachable manifest or a failed download is an error state, not a crash", async () => {
    (globalThis as any).fetch = vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })); expect((await U.checkForUpdate()).status).toBe("failed");
    (globalThis as any).fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => served })); P.download.mockRejectedValueOnce(new Error("Checksum failed")); const s = await U.checkForUpdate(); expect(s.status).toBe("failed"); expect(P.next).not.toHaveBeenCalled();
  });
  it("a bundle already downloaded (app closed before restarting) is reused, not downloaded again", async () => {
    P.list.mockResolvedValue({ bundles: [{ id: "b9", version: "0.25.0-2000", status: "pending" }] }); await U.checkForUpdate(); expect(P.download).not.toHaveBeenCalled(); expect(P.next).toHaveBeenCalledWith({ id: "b9" });
  });
  it("a check while another is running does not start a second one", async () => { const a = U.checkForUpdate(); const b = U.checkForUpdate(); await Promise.all([a, b]); expect((globalThis as any).fetch).toHaveBeenCalledTimes(1); });
});

describe("startUpdater(): confirm a healthy bundle, remember a rolled-back one", () => {
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
});
