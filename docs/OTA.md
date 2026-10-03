# Live web updates (OTA) — how daily UI changes reach the phones without a new APK / IPA

The phone apps are a native shell around the web app. Since v0.1.11 the shell can swap its web bundle for a newer one downloaded
from our own Supabase project, so frontend / styling / logic changes arrive at the next launch.

## The flow
```
Actions → "Publish web update"  (npm run check → build with the live keys → zip dist/ → upload)
   → Supabase Storage, public bucket app-updates:  <channel>/<version>.zip  +  <channel>/manifest.json
phone app, 4 s after launch and when it returns to the foreground (at most every 30 min), or Settings → «تحقّق من التحديث»:
   → reads manifest.json (8 s timeout, no cache) → parseManifest() → decide() → download() with the SHA-256 → next()
   → «تم تنزيل تحديث جديد» → applied at the next launch (or «طبّق الآن» in Settings)
```
Settings → **التحديثات الفورية** shows which bundle runs (built in / updated over the internet), the status, and a manual check.

## The rules (src/native/updater-core.ts, pinned by tests/updater-core.test.ts)
- The manifest must be well-formed and its URL must be a `.zip` inside **our** bucket (`…/storage/v1/object/public/app-updates/…`).
- **Native line**: `ota.config.json → nativeLine`. The shell's versionName is `<nativeLine>.<build>`; a bundle is installed only if its
  `nativeLine` equals the shell's. **Bump `nativeLine` whenever a change needs a new shell** (a Capacitor plugin, AndroidManifest,
  Info.plist, google-services, MainActivity / AppDelegate …) and ship a new APK / IPA; older shells then ignore the new bundles.
- **Newer only**: `manifest.build` (seconds, the build time) must be greater than the running bundle's `__BUILD__.ts`.
- **Integrity**: the plugin verifies the downloaded zip against `sha256` and refuses a mismatch; the publish script re-checks that the
  public URL serves exactly the hashed bytes. (Manifest signing is not enabled — HTTPS + our bucket + the hash are the chain for now.)
- **Rollback**: after the first render the app tells the plugin «this bundle is alive» (`notifyAppReady`) only if the root rendered, no
  uncaught error happened and the error screen is not showing. Otherwise the plugin reverts to the previous bundle within 15 s and the
  failed version is remembered (`engspace.ota.bad`) and never downloaded again. Settings says when that happened.
- **New shell wins**: every release build raises the native build number (Android `versionCode` = run number; iOS `CURRENT_PROJECT_VERSION`),
  and the plugin drops any downloaded bundle when a newer shell is installed over it — so a fresh APK is never stuck on an old bundle.
- Nothing goes to Capgo: manual mode, and `updateUrl` / `statsUrl` / `channelUrl` are empty in `capacitor.config.ts`.

## Publishing
Actions → **Publish web update** → Run workflow (channel `preview`, optional one-line note). Needs the repository secrets of the release
builds (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) and `SUPABASE_ACCESS_TOKEN` (the workflow reads the project's service key
with it at run time — masked, never printed). Locally against a local Supabase:
`SUPABASE_URL=http://127.0.0.1:54321 SERVICE_KEY=<service role> node scripts/ota/publish.mjs` (after `npm run build`).
A bundle is ~10 MB (the OCR data dominates); the bucket limit is 50 MB. Old bundles stay in the bucket (cheap) — delete them in the Supabase dashboard if wanted.

## What OTA cannot do
Anything native: new Capacitor plugins, permissions, push configuration, the zoom lock in `MainActivity`, icons / splash. Those need a
new APK / IPA, and `nativeLine` bumped. Store policy: updating the web content that runs inside the app's WebView is allowed (Google Play
and Apple 3.3.2 / 2.5.2) as long as the app does not change its purpose; keep updates to fixes and improvements of the same product.
