// =====================================================================
//  Photos inside the phone apps (@capacitor/camera) — «التقاط صورة» and «اختيار من الصور»
//  · The camera opens only after its permission is granted: checkPermissions → requestPermissions(["camera"]) → getPhoto.
//    A refusal never reaches the camera (with CAMERA declared Android refuses to start it; without its Info.plist text iOS
//    ends the app — the crash this module was written for).
//  · The plugin hands back a JPEG already scaled to ≤ 1600 px with the orientation applied (resultType uri), read here as a
//    File: the web view never decodes the 50-megapixel original, the memory spike that took the page process down on
//    smaller Android phones. src/lib/compress.ts then does what it does for every image (WebP / JPEG, no metadata).
//  · Every outcome is a value, never a throw: a photo, cancelled, denied (the member said no: say how to allow it) or
//    fallback (no plugin in an older shell, a rejection we don't know, a dead bridge): the caller opens the plain
//    <input type="file">, which works in every web view.
//  · Never awaits a plugin object (docs/OTA.md): the plugin is imported once, only its methods are awaited. The quick calls
//    have a deadline; the ones that wait for the member (permission dialog, camera, gallery) do not — the chooser stays
//    closable, and a late answer to an abandoned request is ignored by the caller.
// =====================================================================
import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import type { Photo } from "@capacitor/camera";

export type PhotoSource = "camera" | "photos";
export type PhotoResult = { file: File } | { cancelled: true } | { denied: PhotoSource } | { fallback: string };

const QUICK = 6000;   // checkPermissions answers at once on a healthy bridge
// the long side the plugin scales to: the same ceiling as the on-device pipeline (compress.ts PROFILES.photo.max)
export const NATIVE_MAX = 1600;

// a plugin call that went wrong once stays wrong for this run (an older shell, a broken camera app): the input from then on
let broken = false;
export const markCameraBroken = () => { broken = true; };

// e2e drives the chooser through this development-only stand-in (like window.__engspaceOta): { photo(source) → PhotoResult }.
// Never present in a production build.
const stand = (): { photo: (s: PhotoSource) => Promise<PhotoResult> } | null =>
  (import.meta.env.DEV && typeof window !== "undefined" && (window as any).__engspaceCamera) || null;

// is the plugin in this shell at all (Settings shows it next to the updater, for diagnosis)
export const cameraLinked = () => { try { return Capacitor.isPluginAvailable("Camera"); } catch (e) { return false; } };

// true only in the phone apps whose shell links the camera plugin (shells built before it fall back to the input)
export function nativePhotosReady(): boolean {
  if (broken) return false;
  if (stand()) return true;
  try { return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("Camera"); } catch (e) { return false; }
}

const timeout = <T,>(p: Promise<T>, ms: number): Promise<T> => new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error("timeout")), ms);
  p.then((v) => { clearTimeout(t); res(v); }, (e) => { clearTimeout(t); rej(e); });
});

const said = (e: any) => String((e && (e.message || e.errorMessage)) || e || "");
// the plugin's words for "the member closed it" (Android: «User cancelled photos app»; iOS the same, and «No image picked»)
export const isCancel = (e: any) => /cancel|no image picked|no photo|dismiss/i.test(said(e));
// … and for "not allowed" (iOS and Android: «User denied access to camera / photos»)
export const isDenied = (e: any) => /denied|permission|not authorized|restricted/i.test(said(e));

// Camera permission, asked only now. granted → open the camera; denied → tell the member where to allow it.
export async function cameraAccess(): Promise<"granted" | "denied" | "fallback"> {
  let st: any;
  try { st = await timeout(Camera.checkPermissions(), QUICK); } catch (e) { return "fallback"; }
  const now = st && st.camera;
  if (now === "granted" || now === "limited") return "granted";
  if (now === "denied") return "denied";
  // prompt / prompt-with-rationale: the system dialog, which waits for the member (no deadline)
  try { st = await Camera.requestPermissions({ permissions: ["camera"] }); } catch (e) { return isDenied(e) ? "denied" : "fallback"; }
  return st && (st.camera === "granted" || st.camera === "limited") ? "granted" : "denied";
}

// the photo the plugin wrote (a local file URL the web view may read) → a File for the usual pipeline
export async function photoFile(p: Photo): Promise<File> {
  const src = p.webPath || (p.path ? Capacitor.convertFileSrc(p.path) : "");
  if (!src) throw new Error("no file");
  const r = await timeout(fetch(src), 15000); if (!r.ok) throw new Error(`read ${r.status}`);
  const blob = await r.blob();
  const type = blob.type && /^image\//.test(blob.type) ? blob.type : `image/${p.format === "png" ? "png" : "jpeg"}`;
  return new File([blob], `photo.${p.format === "png" ? "png" : "jpg"}`, { type });
}

export async function nativePhoto(source: PhotoSource): Promise<PhotoResult> {
  if (!nativePhotosReady()) return { fallback: "unavailable" };
  const s = stand(); if (s) return s.photo(source);
  if (source === "camera") {
    const access = await cameraAccess();
    if (access === "denied") return { denied: "camera" };
    if (access === "fallback") return { fallback: "permissions" };
  }
  let photo: Photo;
  try {
    photo = await Camera.getPhoto({
      source: source === "camera" ? CameraSource.Camera : CameraSource.Photos,
      resultType: CameraResultType.Uri,
      quality: 90, width: NATIVE_MAX, height: NATIVE_MAX, correctOrientation: true,
      saveToGallery: false, allowEditing: false, webUseInput: true,
    });
  } catch (e) {
    if (isCancel(e)) return { cancelled: true };
    if (isDenied(e)) return { denied: source };
    return { fallback: said(e).slice(0, 120) || "camera" };
  }
  try { return { file: await photoFile(photo) }; } catch (e) { return { fallback: said(e).slice(0, 120) || "read" }; }
}

// Android keeps the camera app's full-size original next to the scaled copy (app-private, but with its GPS): clear what is
// older than a day at launch. Best effort, a few seconds at most.
export async function sweepCaptures() {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return;
  try {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const dir = await timeout(Filesystem.readdir({ path: "Pictures", directory: Directory.External }), QUICK);
    const old = Date.now() - 24 * 3600e3;
    for (const f of dir.files || []) {
      if (!/^JPEG_.*\.jpg$/i.test(f.name) || Number(f.mtime || 0) > old) continue;
      await timeout(Filesystem.deleteFile({ path: `Pictures/${f.name}`, directory: Directory.External }), QUICK).catch(() => {});
    }
  } catch (e) { /* no folder yet, or no external storage */ }
}
