// «التقاط صورة» crashed the phone apps (v0.26.0): iOS ends an app that asks for the camera without NSCameraUsageDescription,
// and Android ended the whole app when the web view's page process died. These pins keep the native side of the fix in place.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const file = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const plist = (key: string) => { const m = new RegExp(`<key>${key}</key>\\s*<string>([^<]*)</string>`).exec(file("../ios/App/App/Info.plist")); return m ? m[1] : ""; };

describe("iOS: the privacy texts the camera and the photo library need", () => {
  it("camera, photo library and saving each have a real text, in Arabic and English", () => {
    for (const key of ["NSCameraUsageDescription", "NSPhotoLibraryUsageDescription", "NSPhotoLibraryAddUsageDescription"]) {
      const text = plist(key); expect(text.length, key).toBeGreaterThan(40);
      expect(text, key).toMatch(/[؀-ۿ]/); expect(text, key).toMatch(/EngSpace .*[a-z]/);
    }
  });
  it("the camera plugin is linked into the iOS app", () => {
    expect(file("../ios/App/CapApp-SPM/Package.swift")).toMatch(/\.product\(name: "CapacitorCamera", package: "CapacitorCamera"\)/);
  });
});

describe("Android: camera permission, the camera app's visibility, the file it writes, and a page process that may die", () => {
  const manifest = file("../android/app/src/main/AndroidManifest.xml");
  it("CAMERA is declared (asked at the moment it's needed), a camera is optional, and the camera app can be found (Android 11+)", () => {
    expect(manifest).toMatch(/<uses-permission android:name="android\.permission\.CAMERA" \/>/);
    expect(manifest).toMatch(/<uses-feature android:name="android\.hardware\.camera" android:required="false" \/>/);
    expect(manifest).toMatch(/<queries>[\s\S]*android\.media\.action\.IMAGE_CAPTURE[\s\S]*<\/queries>/);
    expect(manifest).toMatch(/android:authorities="\$\{applicationId\}\.fileprovider"/);
  });
  it("the FileProvider covers where the camera writes (getExternalFilesDir) and the cache", () => {
    const paths = file("../android/app/src/main/res/xml/file_paths.xml");
    expect(paths).toMatch(/<external-files-path /); expect(paths).toMatch(/<cache-path /);
  });
  it("MainActivity survives the page process: the dead web view is dropped and the screen rebuilt, never the app ended", () => {
    const java = file("../android/app/src/main/java/app/engspace/MainActivity.java");
    expect(java).toMatch(/addWebViewListener/); expect(java).toMatch(/public boolean onRenderProcessGone\(WebView view, RenderProcessGoneDetail detail\)/);
    expect(java).toMatch(/view\.destroy\(\)/); expect(java).toMatch(/recreate\(\)/); expect(java).toMatch(/return true;/);
  });
  it("the camera plugin is in the Gradle build", () => {
    expect(file("../android/capacitor.settings.gradle")).toMatch(/include ':capacitor-camera'/);
    expect(file("../android/app/capacitor.build.gradle")).toMatch(/implementation project\(':capacitor-camera'\)/);
  });
});

describe("the web side", () => {
  it("the plugin version is pinned, and a shell without it never takes these bundles (new native line)", () => {
    const pkg = JSON.parse(file("../package.json")); expect(pkg.dependencies["@capacitor/camera"]).toMatch(/^\d+\.\d+\.\d+$/);
    expect(JSON.parse(file("../ota.config.json")).nativeLine).toBeGreaterThanOrEqual(2);
  });
  it("every photo point goes through the guarded picker (or the verify screen's camera shot)", () => {
    for (const f of ["features/sheets/sheets.tsx", "features/stack/stack.tsx", "features/auth/auth.tsx", "features/qaqc/qaqc.tsx", "features/support/support.tsx"]) expect(file(`../src/${f}`), f).toMatch(/useImagePicker\(/);
    expect(file("../src/features/verify/verify.tsx")).toMatch(/useCameraShot\(/);
    // the camera is only ever reached through camera.ts (permission first)
    expect(file("../src/lib/media.tsx")).not.toMatch(/Camera\.getPhoto/);
  });
});
