// Live web updates — the decisions, as pure functions (the plugin calls live in updater.ts). docs/OTA.md.
// A bundle is installed only when: the manifest is well-formed and points into OUR bucket, it is for the native line this shell runs,
// it is newer than the web code running now, and it is not a version that already failed here.

export type Manifest = { version: string; build: number; nativeLine: number; url: string; sha256: string; notes?: string; published?: string };
export const BUCKET = "app-updates";

export const publicBase = (supabaseUrl: string) => `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/`;
export const manifestUrl = (supabaseUrl: string, channel: string) => `${publicBase(supabaseUrl)}${channel}/manifest.json`;

// "1.123" (native versionName) → 1; anything unreadable → null (then no update is applied: better safe than a mismatched bundle)
export function nativeLineOf(nativeVersion: string | null | undefined): number | null {
  const m = /^(\d+)\./.exec(String(nativeVersion || "")); return m ? Number(m[1]) : null;
}

export function parseManifest(raw: any, supabaseUrl: string): Manifest | null {
  if (!raw || typeof raw !== "object") return null;
  const { version, build, nativeLine, url, sha256 } = raw;
  if (typeof version !== "string" || !/^[0-9A-Za-z._+-]{1,64}$/.test(version)) return null;
  if (!Number.isInteger(build) || build <= 0 || !Number.isInteger(nativeLine) || nativeLine <= 0) return null;
  if (typeof sha256 !== "string" || !/^[0-9a-f]{64}$/.test(sha256)) return null;
  if (typeof url !== "string" || !url.startsWith(publicBase(supabaseUrl)) || !/\.zip$/.test(url) || url.includes("..")) return null;
  return { version, build, nativeLine, url, sha256, notes: typeof raw.notes === "string" ? raw.notes.slice(0, 300) : undefined, published: typeof raw.published === "string" ? raw.published : undefined };
}

export type Decision = { go: true } | { go: false; why: "newer-native" | "unknown-native" | "up-to-date" | "failed-before" };
export function decide(m: Manifest, ctx: { runningBuild: number; nativeVersion: string | null; badVersions: string[] }): Decision {
  const line = nativeLineOf(ctx.nativeVersion);
  if (line == null) return { go: false, why: "unknown-native" };
  if (m.nativeLine !== line) return { go: false, why: "newer-native" };   // needs (or is older than) a native build: a new APK / IPA is the way
  if (ctx.badVersions.includes(m.version)) return { go: false, why: "failed-before" };
  if (m.build <= ctx.runningBuild) return { go: false, why: "up-to-date" };
  return { go: true };
}

// the health check before telling the plugin "this bundle works" (otherwise it rolls back to the previous one after the timeout)
export const looksHealthy = (state: { rootHasContent: boolean; uncaughtErrors: number; errorScreen: boolean }) => state.rootHasContent && state.uncaughtErrors === 0 && !state.errorScreen;
