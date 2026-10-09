// «التقاط صورة» inside the phone apps (src/native/camera.ts) against a fake camera plugin: the camera never opens before its
// permission is granted, every outcome comes back as a value (photo / cancelled / denied / fallback), and nothing can hang.
// The crash this pins: iOS ended the app when the camera was requested without NSCameraUsageDescription (tests/native-camera-config.test.ts).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const P: any = { checkPermissions: vi.fn(), requestPermissions: vi.fn(), getPhoto: vi.fn() };
let native = true, linked = true;
vi.mock("@capacitor/core", () => ({ Capacitor: {
  isNativePlatform: () => native, getPlatform: () => "android", isPluginAvailable: (n: string) => linked && n === "Camera",
  convertFileSrc: (p: string) => `https://localhost/_capacitor_file_${p}`,
} }));
// Like Capacitor's registerPlugin proxy: every property is a native-method wrapper — `then` too, which never answers.
// Resolving a promise with this object hangs, so camera.ts may only ever await its methods (docs/OTA.md).
const capacitorLike = (target: any) => new Proxy(target, { get: (t, k) => (k === "then" ? () => {} : t[k]) });
vi.mock("@capacitor/camera", () => ({
  Camera: capacitorLike(P),
  CameraResultType: { Uri: "uri", Base64: "base64", DataUrl: "dataUrl" },
  CameraSource: { Prompt: "PROMPT", Camera: "CAMERA", Photos: "PHOTOS" },
}));

let C: typeof import("../src/native/camera");
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
beforeEach(async () => {
  vi.resetModules(); native = true; linked = true;
  for (const f of Object.values(P) as any[]) f.mockReset();
  P.checkPermissions.mockResolvedValue({ camera: "granted", photos: "granted" });
  P.requestPermissions.mockResolvedValue({ camera: "granted", photos: "granted" });
  P.getPhoto.mockResolvedValue({ format: "jpeg", webPath: "https://localhost/_capacitor_file_/cache/x.jpg", saved: false });
  (globalThis as any).fetch = vi.fn(async () => ({ ok: true, status: 200, blob: async () => new Blob([jpeg], { type: "image/jpeg" }) }));
  C = await import("../src/native/camera");
});
afterEach(() => { vi.useRealTimers(); });

describe("taking a photo", () => {
  it("permission granted → the camera, scaled to 1600 px with the orientation applied, read back as a File", async () => {
    const r: any = await C.nativePhoto("camera");
    expect(P.getPhoto).toHaveBeenCalledWith(expect.objectContaining({ source: "CAMERA", resultType: "uri", width: 1600, height: 1600, correctOrientation: true, saveToGallery: false }));
    expect(r.file).toBeInstanceOf(File); expect(r.file.type).toBe("image/jpeg"); expect(r.file.size).toBe(4);
    expect(P.requestPermissions).not.toHaveBeenCalled();
  });
  it("not asked yet → the permission dialog FIRST, then the camera", async () => {
    P.checkPermissions.mockResolvedValue({ camera: "prompt", photos: "prompt" });
    const order: string[] = [];
    P.requestPermissions.mockImplementation(async (a: any) => { order.push("request"); expect(a).toEqual({ permissions: ["camera"] }); return { camera: "granted" }; });
    P.getPhoto.mockImplementation(async () => { order.push("camera"); return { format: "jpeg", webPath: "https://localhost/x.jpg" }; });
    const r: any = await C.nativePhoto("camera");
    expect(order).toEqual(["request", "camera"]); expect(r.file).toBeInstanceOf(File);
  });
  it("the member says no → the camera never opens; the answer is «denied»", async () => {
    P.checkPermissions.mockResolvedValue({ camera: "prompt-with-rationale" }); P.requestPermissions.mockResolvedValue({ camera: "denied" });
    expect(await C.nativePhoto("camera")).toEqual({ denied: "camera" }); expect(P.getPhoto).not.toHaveBeenCalled();
  });
  it("refused before (denied for good) → no dialog, no camera, «denied»", async () => {
    P.checkPermissions.mockResolvedValue({ camera: "denied" });
    expect(await C.nativePhoto("camera")).toEqual({ denied: "camera" });
    expect(P.requestPermissions).not.toHaveBeenCalled(); expect(P.getPhoto).not.toHaveBeenCalled();
  });
  it("a permission check that never answers ends in the fallback after its deadline (nothing hangs)", async () => {
    vi.useFakeTimers(); P.checkPermissions.mockReturnValue(new Promise(() => {}));
    const p = C.nativePhoto("camera"); await vi.advanceTimersByTimeAsync(6100);
    expect(await p).toEqual({ fallback: "permissions" }); expect(P.getPhoto).not.toHaveBeenCalled();
  });
  it("closing the camera is «cancelled»; the plugin's own refusal is «denied»; anything else is the fallback", async () => {
    P.getPhoto.mockRejectedValueOnce(new Error("User cancelled photos app")); expect(await C.nativePhoto("camera")).toEqual({ cancelled: true });
    P.getPhoto.mockRejectedValueOnce(new Error("User denied access to camera")); expect(await C.nativePhoto("camera")).toEqual({ denied: "camera" });
    P.getPhoto.mockRejectedValueOnce(new Error("Unable to resolve camera activity")); expect(await C.nativePhoto("camera")).toEqual({ fallback: "Unable to resolve camera activity" });
  });
  it("a photo the web view cannot read is the fallback, not a crash", async () => {
    (globalThis as any).fetch = vi.fn(async () => ({ ok: false, status: 404 }));
    expect(await C.nativePhoto("camera")).toEqual({ fallback: "read 404" });
    P.getPhoto.mockResolvedValueOnce({ format: "jpeg" }); expect(await C.nativePhoto("camera")).toEqual({ fallback: "no file" });
  });
});

describe("the gallery", () => {
  it("asks no camera permission and scales the same way", async () => {
    const r: any = await C.nativePhoto("photos");
    expect(P.checkPermissions).not.toHaveBeenCalled(); expect(P.requestPermissions).not.toHaveBeenCalled();
    expect(P.getPhoto).toHaveBeenCalledWith(expect.objectContaining({ source: "PHOTOS", width: 1600, height: 1600 })); expect(r.file).toBeInstanceOf(File);
  });
  it("no access to the photos (iOS) → «denied» photos: the caller offers the file picker", async () => {
    P.getPhoto.mockRejectedValueOnce(new Error("User denied access to photos")); expect(await C.nativePhoto("photos")).toEqual({ denied: "photos" });
  });
});

describe("when the plugin is not there", () => {
  it("a browser, or a shell built before the plugin → the plain input (no plugin call at all)", async () => {
    native = false; expect(C.nativePhotosReady()).toBe(false); expect(await C.nativePhoto("camera")).toEqual({ fallback: "unavailable" });
    native = true; linked = false; expect(C.nativePhotosReady()).toBe(false);
    expect(P.checkPermissions).not.toHaveBeenCalled(); expect(P.getPhoto).not.toHaveBeenCalled();
  });
  it("once the plugin failed, this run uses the input from then on", async () => {
    expect(C.nativePhotosReady()).toBe(true); C.markCameraBroken(); expect(C.nativePhotosReady()).toBe(false);
  });
  it("the plugin's error words are read the same on both platforms", () => {
    expect(C.isCancel(new Error("User cancelled photos app"))).toBe(true); expect(C.isCancel({ message: "No image picked" })).toBe(true);
    expect(C.isDenied(new Error("User denied access to photos"))).toBe(true); expect(C.isDenied("Unable to resolve camera activity")).toBe(false);
  });
});
