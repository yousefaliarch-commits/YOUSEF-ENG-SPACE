// Live web updates: which manifests are trusted and when a bundle is installed (src/native/updater-core.ts), plus the pinned plumbing.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { decide, looksHealthy, manifestUrl, nativeLineOf, parseManifest, publicBase } from "../src/native/updater-core";

const URL0 = "https://abc.supabase.co"; const sha = "a".repeat(64);
const good = (extra: any = {}) => ({ version: "0.25.0-1790000000", build: 1790000000, nativeLine: 1, url: `${publicBase(URL0)}preview/0.25.0-1790000000.zip`, sha256: sha, notes: "x", ...extra });
const file = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

describe("manifest", () => {
  it("lives at a fixed public address per channel", () => { expect(manifestUrl(URL0 + "/", "preview")).toBe("https://abc.supabase.co/storage/v1/object/public/app-updates/preview/manifest.json"); });
  it("a well-formed manifest is accepted", () => { expect(parseManifest(good(), URL0)).toMatchObject({ version: "0.25.0-1790000000", build: 1790000000, nativeLine: 1, sha256: sha }); });
  it("anything off is refused: junk, bad hash, bad numbers, bad version", () => {
    for (const bad of [null, "x", {}, good({ sha256: "zz" }), good({ sha256: "A".repeat(64) }), good({ build: 0 }), good({ build: 1.5 }), good({ nativeLine: "1" }), good({ version: "../x" }), good({ version: "" })]) expect(parseManifest(bad, URL0)).toBeNull();
  });
  it("a bundle URL must be a zip inside OUR bucket — another host, another bucket, a non-zip or a traversal is refused", () => {
    for (const url of ["https://evil.example/app.zip", "https://abc.supabase.co/storage/v1/object/public/media/x.zip", `${publicBase(URL0)}preview/x.js`, `${publicBase(URL0)}../media/x.zip`, "http://abc.supabase.co/storage/v1/object/public/app-updates/p/x.zip"]) expect(parseManifest(good({ url }), URL0)).toBeNull();
  });
});

describe("native line", () => {
  it("is the first number of the shell's versionName", () => { expect(nativeLineOf("1.123")).toBe(1); expect(nativeLineOf("2.0")).toBe(2); });
  it("unreadable → null (no update is applied)", () => { for (const v of [null, undefined, "", "builtin", "abc", "1"]) expect(nativeLineOf(v as any)).toBeNull(); });
});

describe("decide()", () => {
  const ctx = (extra: any = {}) => ({ runningBuild: 1000, nativeVersion: "1.50", badVersions: [] as string[], ...extra });
  const m = (extra: any = {}) => parseManifest(good({ build: 2000, ...extra }), URL0)!;
  it("a newer bundle for this native line is installed", () => { expect(decide(m(), ctx())).toEqual({ go: true }); });
  it("the same or an older bundle is not", () => { expect(decide(m({ build: 1000 }), ctx())).toEqual({ go: false, why: "up-to-date" }); expect(decide(m({ build: 5 }), ctx())).toEqual({ go: false, why: "up-to-date" }); });
  it("a bundle for another native line waits for a new APK / IPA (newer or older)", () => { expect(decide(m({ nativeLine: 2 }), ctx())).toEqual({ go: false, why: "newer-native" }); expect(decide(m({ nativeLine: 1 }), ctx({ nativeVersion: "2.7" }))).toEqual({ go: false, why: "newer-native" }); });
  it("a version that was rolled back here is never retried", () => { expect(decide(m(), ctx({ badVersions: ["0.25.0-1790000000"] }))).toEqual({ go: false, why: "failed-before" }); });
  it("an unknown native version applies nothing", () => { expect(decide(m(), ctx({ nativeVersion: null }))).toEqual({ go: false, why: "unknown-native" }); });
});

describe("health check before confirming a bundle", () => {
  it("rendered, no uncaught errors, no error screen → healthy", () => { expect(looksHealthy({ rootHasContent: true, uncaughtErrors: 0, errorScreen: false })).toBe(true); });
  it("an empty root, an uncaught error or the error screen → not confirmed (the plugin rolls back)", () => {
    for (const s of [{ rootHasContent: false, uncaughtErrors: 0, errorScreen: false }, { rootHasContent: true, uncaughtErrors: 1, errorScreen: false }, { rootHasContent: true, uncaughtErrors: 0, errorScreen: true }]) expect(looksHealthy(s)).toBe(false);
  });
});

describe("plumbing is pinned", () => {
  const cfg = file("../capacitor.config.ts"), mig = file("../supabase/migrations/20261014000022_app_updates_bucket.sql"), wf = file("../.github/workflows/publish-update.yml"), pub = file("../scripts/ota/publish.mjs"), rel = file("../.github/workflows/release-preview.yml");
  it("the plugin runs in manual mode with every third-party endpoint switched off, and rolls back after 15 s", () => {
    expect(cfg).toMatch(/CapacitorUpdater: \{[^}]*autoUpdate: false/); expect(cfg).toMatch(/updateUrl: ""/); expect(cfg).toMatch(/statsUrl: ""/); expect(cfg).toMatch(/channelUrl: ""/); expect(cfg).toMatch(/appReadyTimeout: 15000/); expect(cfg).toMatch(/resetWhenUpdate: true/);
  });
  it("the bucket is public-read with no client write policy", () => { expect(mig).toMatch(/'app-updates', 'app-updates', true/); expect(mig).not.toMatch(/create policy/i); expect(mig).toMatch(/52428800/); });
  it("publishing: index.html at the zip root, hash re-checked from the public URL, service key masked and never echoed", () => {
    expect(pub).toMatch(/index\.html is not at the zip root/); expect(pub).toMatch(/does not match its hash/); expect(wf).toMatch(/::add-mask::\$key/); expect(wf).not.toMatch(/echo "\$key"/); expect(wf).toMatch(/workflow_dispatch/);
  });
  it("every release build raises the native build number, so a newer APK / IPA drops an older downloaded bundle", () => { expect(file("../android/app/build.gradle")).toMatch(/versionCode\(Integer\.parseInt\(System\.getenv\("GITHUB_RUN_NUMBER"\)/); expect(rel).toMatch(/CURRENT_PROJECT_VERSION="\$GITHUB_RUN_NUMBER"/); expect(rel).toMatch(/MARKETING_VERSION="\$line\.\$GITHUB_RUN_NUMBER"/); });
  it("the shell's versionName starts with the native line from ota.config.json", () => { expect(file("../android/app/build.gradle")).toMatch(/ota\.config\.json[\s\S]*nativeLine/); expect(JSON.parse(file("../ota.config.json")).nativeLine).toBeGreaterThan(0); });
});

describe("native plugin registration is committed (cap sync)", () => {
  it("Android: the updater module is included and linked", () => { expect(file("../android/capacitor.settings.gradle")).toMatch(/include ':capgo-capacitor-updater'/); expect(file("../android/app/capacitor.build.gradle")).toMatch(/implementation project\(':capgo-capacitor-updater'\)/); });
  it("iOS: the updater package is in the Swift package list", () => { expect(file("../ios/App/CapApp-SPM/Package.swift")).toMatch(/CapgoCapacitorUpdater/); });
  it("the publish workflow checks the manifest as a phone reads it (public + CORS for the WebView origins)", () => {
    const wf = file("../.github/workflows/publish-update.yml"); for (const o of ["https://localhost", "capacitor://localhost"]) expect(wf).toContain(o); expect(wf).toMatch(/access-control-allow-origin/);
  });
});
