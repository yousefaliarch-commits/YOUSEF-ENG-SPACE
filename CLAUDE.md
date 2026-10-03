# EngSpace — project memory

Anonymous career and salary network for Egyptian engineers. **Arabic-first, RTL**, English interface available; money in
**EGP**. Owner: Yousef (architect / BIM coordinator) — works on a Windows PC; GitHub `yousefaliarch-commits/YOUSEF-ENG-SPACE`.

## Roadmap and status
- Phase 1 ✅ single-file prototype → Vite + React 18 + TypeScript (docs/MIGRATION.md).
- Phase 2 ✅ Supabase (Frankfurt, eu-central-1, project cyziykbqldtxyquqvvkr) + Capacitor 8 (docs/PHASE2.md). Migrations deploy via
  the "Deploy database" workflow (secrets SUPABASE_ACCESS_TOKEN / SUPABASE_DB_PASSWORD). Owner is the first admin.
- Sprint 1 ✅ live salary explorer + give-to-get. Feature 2 ✅ offer evaluator + yearly net calculator. Features 13/15 ✅ realtime,
  branded icons/splash. Features 6/7 ✅ site tools (concrete, rebar, masonry, units) + QA/QC checklists with PDF export.
  Features 3/4 ✅ company scorecards (`company_ratings`, unreadable; `company_scorecard()` ≥ 5 distinct reviewers per factor) +
  raise & inflation tracker (`raise_reports`, unreadable; `market_raises()` ≥ 5; `inflation_rates` — staff add each CAPMAS month
  in Admin → Settings; `src/data/inflation.ts` must match the migration seed).
- Auth: e-mail, Google, Apple, phone (SMS); accounts without the form complete their profile once (profiles.onboarded).
- Next: the brainstormed "high-impact features" (market transparency, daily engineering tools) — chosen with the owner
  AFTER Phase 2, on the real backend. Phase 3: admin console as its own web app behind MFA. Phase 4: store releases.

## Non-negotiables
- **Privacy model** (enforced in SQL, tested in supabase/tests): server-built author snapshots; no client-readable
  account id on content (`private.authorship`); anonymous snapshots carry no name/age/city/employer/grad year; threads
  only via functions; staff see `mod_ref`, never names behind anonymous items.
- **Salaries are NET (الصافي) everywhere** — model (`marketFor` converts gross anchors with `src/domain/pay.ts`), companies,
  shares (`salary_shares.salary` is net; pre-net rows converted, `gross_original` kept), tools, labels. Gross appears only in
  the net ⇄ gross calculator. `private.net_of_gross()` mirrors `netPay()` (tests pin both).
- Money by role: engineers individual figures; HR/owner aggregates (≥ 5 reports per cell); field staff none — their Tools tab
  shows only the site tools + checklists (`blockedFor(...).toolsOnly`, `toolOpen`). HR's Tools tab: CV review only.
- Staff (`profiles.staff` moderator/admin; `role` stays engineer) reach the console from the header on every device.
  Moderators hide/restore; only admins delete for good (`admin_delete_content` — replies, reactions, authorship and the
  post image go too). Every member can answer a team thread and reach the team from Messages (support tickets).
- Admin member directory (`admin_directory`, admins only) is keyed by pid and NEVER shows mod_ref or moderation state; the
  mod_ref list (`admin_accounts`) carries only moderation fields — so names can't be joined to anonymous reports. Team messages
  (`admin_message`) arrive as «فريق EngSpace». Support tickets: `support_tickets`/`ticket_messages`, private `support` bucket.
- Verification documents: private bucket, own folder only, deleted at decision/withdrawal, **7 days max** (pg_cron +
  `purge-verification` sweep). Employer accounts are never verified.
- Deleting an account deletes everything it wrote.
- One tap = one salary report: the client sends once (button locked, `contribute` guarded) and the server refuses an identical
  report from the same member within 10 minutes (23505, treated as «already recorded»). Give-to-get (`contributed`) is read
  from `my_salary_status()` on every hydrate, so a new phone or install is unlocked like the old one.
- Brand: the E+S mark lives in `src/ui/brand-mark.json` (polygons in the 1024 space of `assets/icon-only.png`, the owner's master
  icon — never redraw it). `scripts/brand/render.mjs` (adaptive layers, splash) + `web.mjs` (favicon, apple-touch) +
  `npx @capacitor/assets generate` (delete the `icons/` and `public/manifest.webmanifest` it also writes) make every size.
- Push (docs/PUSH.md): notices are written by SQL triggers (replies/mentions, DMs, tickets, job matches, inflation, salary cells), then
  queued in `private.push_outbox` only if the member's master + type switch is on and a device exists; `send-push` (Edge Function,
  shared code in `supabase/functions/_shared/push.ts`) delivers through FCM / APNs. Reply / mention / message pushes carry NO
  text and NO sender. Tokens live in `user_push_tokens` — never readable by a client. Categories (jobs · community · support ·
  system) and preference keys are pinned to the SQL by `tests/push-notifications.test.ts`. Credentials only as function secrets /
  GitHub secrets; absent credentials mean "not ready in this build", never an error screen.
- Sharing (header button on post/job/company/room): `shareContent()` in native.ts — phone share sheet → `navigator.share` → copy
  link. Links: `https://<VITE_PUBLIC_URL>/#app/<type>/<id>` when set, else the web hash route, else `app.engspace://open/<type>/<id>`
  (Android filter host `open`); a link opened signed-out waits for the sign-in (`takePendingOpen`).
- Member-written text is never translated; every new Arabic UI string needs English in `i18n/en/*.tsv`
  (`npm run i18n`, then `node scripts/i18n/build.mjs todo`). CI fails if `i18n/keys.json` / `src/i18n/en.generated.json`
  are not committed and current.

- v0.1.8: **zoom is locked** (viewport meta, `touch-action`, gesture listeners, Android `MainActivity.disableZoom()`, iOS `EngViewController`).
  Member text (posts, comments, chat) is `translate="no" dir="auto"` with `unicode-bidi: isolate` and numbers in `<bdi dir="ltr">` (`ui/bidi.tsx`).
  Feeds merge the member's own in-flight / just-confirmed posts into every hydrate (`mergeLocalPosts`) so nothing vanishes or doubles.
  Realtime: private channels `member:<id>` (verification, profile, notices), `feed` (post/moderation changes), `staff` (console reload).
  Job matching is **discipline-first**: SQL filter + client `matchJob` gate (experience / city only count after the discipline matches);
  `jobs.co_name` links an ad to its company scorecard. Salary shares keep the employer type in `salary_shares.employer`
  (مقاولات / استشاري / مالك), never in `company`. Pull-to-refresh always lets go (12 s guard).
- Test accounts (`scripts/seed/`, `@engspace.test`, no mailbox): civil, architect, mep, electrical, survey, supervisor, hr, owner, moderator, admin.
  Hosted: Actions → **Seed test accounts** (`seed` / `remove` — remove them before launch); local/CI: `npm run db:seed`. Passwords are never in the repo
  (bcrypt hashes only). E2E: `npm run e2e` (Playwright, iPhone 15 + Pixel 7 profiles; `E2E_LIVE=1` adds the signed-in suite; `E2E_WEBKIT=1` real WebKit).

- v0.1.9: **author controls on posts** — `edit_my_post()` (own post only, not hidden / suspended, counts only real text changes in the server-set
  `posts.edit_count` / `edited_at`) and `delete_my_post()` (replies, reactions, authorship go too; the image is removed from Storage — `media: read own`
  select policy makes that work). Which posts are mine comes from `my_posts()` on every hydrate (`mine` is never guessed from the client). Every edited
  post shows «معدّل · مرة / مرتان / N مرات» (`EditedBadge`); the feed gets an `edit` event (id only). Delete always asks first. Tests: pgTAP 16,
  `tests/post-author.test.ts`, the cloud suite, `e2e/posts.spec.ts` (every seeded role + cross-role live checks).

- v0.1.11: **live web updates** (docs/OTA.md). `@capgo/capacitor-updater` in manual mode (no Capgo endpoints); `src/native/updater.ts` +
  `updater-core.ts` read `app-updates/<channel>/manifest.json` from Supabase Storage, download a newer bundle (SHA-256 checked) and apply it at the next
  launch; an unhealthy bundle is rolled back and never retried. Publish with the **Publish web update** workflow (`scripts/ota/publish.mjs`).
  **`ota.config.json → nativeLine` must be bumped for any change that needs a new APK / IPA** (plugins, manifest / Info.plist, MainActivity,
  google-services); shells only take bundles of their own line. Settings → التحديثات الفورية shows the active bundle. A downloaded update shows the top `UpdateBanner` (تحديث الآن / ✕); e2e drives it through the dev-only `window.__engspaceOta`.

## How the code is organised
- `src/app/AppView.tsx` holds member-app state (one store, keys like posts/jobs/threads) and every handler; handlers update
  locally, then `sync(() => cloud.x())` in cloud mode. Demo mode (no `VITE_SUPABASE_*`) must keep working unchanged.
- `src/backend/` config · client (lazy supabase-js) · map (pure row⇄shape) · cloud (all server calls, Arabic errors).
- `src/features/admin/` console; `cloud-admin.ts` adapts live data to the console's demo shapes.
- `src/native/native.ts` Capacitor glue. `supabase/migrations/` schema + RLS (add new files; never edit applied ones
  once the hosted project exists). `tests/` Vitest with stub React (`tests/harness.ts`).

## Commands
`npm run check` (typecheck + tests + build = CI gate) · `npm run live` (laptop + phone preview, rebuild on save) ·
`npm run db:start | db:reset | db:test | db:env | db:admin -- email` · `npm run test:cloud` · `npm run cap:sync`.
CI: check, database (pgTAP + cloud e2e on local Supabase), android (debug APK artifact). Phone builds: Actions → "Release
  preview builds" (APK + unsigned IPA for Sideloadly). `android/app/debug.keystore` is committed on purpose: one fixed debug key so
  each preview APK installs over the last (a random CI key makes Android refuse the update). Settings shows the build stamp.

## Performance rules (120 Hz target — see docs/PHASE2.md → Performance)
- No infinite/idle animation below 64 px or inside bars and lists; no backdrop blur over scrolling content.
- Animate transform/opacity only; gestures write styles directly, never React state per touchmove.
- Long lists render through `ui/windowed.tsx`.
- Pushed screens (post, chat, forms) hide the tab bar (`.pushed`, `--tabbar-space: 0`); a bottom action bar carries `.foot`
  and pads for the home indicator itself.
- Glass (`.glass`): only the floating tab bar; Android without headroom gets `html[data-glass=lite]` (no live blur). The tour
  animates opacity/transform only and suppresses view transitions (`liveState().tourOn`).

## Conventions
- Match the surrounding style: long single-line handlers, comments explaining *why*, Arabic product copy.
- Security-definer SQL functions: `set search_path = ''`, fully qualified names, explicit `grant execute ... to authenticated`.
- Policies use `(select auth.uid())`; index every column a policy filters on.
