# Phase 2 — Supabase (Frankfurt) and Capacitor 8

Phase 2 gives EngSpace a real backend and native shells without changing what the app does. The same build now runs in
three ways:

| Mode | When | Data |
| --- | --- | --- |
| **Demo** | no `VITE_SUPABASE_*` variables (or `?backend=demo` in the address) | the seed data, in each browser — exactly Phase 1 |
| **Cloud** | `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` set | the Supabase project: real accounts, shared data, RLS |
| **Native** | the same build inside the iOS / Android apps (`android/`, `ios/`) | demo or cloud, by the same variables |

## Architecture

```
src/backend/config.ts     which backend (demo / cloud), from the build's environment
src/backend/client.ts     the Supabase client — its own lazy chunk; the session lives in Capacitor Preferences on phones
src/backend/map.ts        server rows ⇄ the shapes the app already renders (pure; tests/cloud-map.test.ts)
src/backend/cloud.ts      every call the app and the admin console make in cloud mode
src/features/admin/cloud-admin.ts   the console's live data (cases, accounts, audit, verification queue, analytics)
src/native/native.ts      back button, auth links (app.engspace://auth-callback), status bar, splash screen
supabase/migrations/      the schema, RLS and server functions (8 files, applied in order)
supabase/tests/           pgTAP suites — 89 checks of the privacy and permission rules
supabase/functions/purge-verification/   hourly sweep that deletes verification documents (Edge Function)
capacitor.config.ts, android/, ios/     the native projects
```

`AppView` keeps its optimistic local updates: each handler updates the screen at once and, in cloud mode, sends the same
change to the server (`sync(() => cloud.…)`). After sign-in, on pull-to-refresh and when the app comes back to the
foreground, `loadAll()` replaces local state with the server's. An open conversation checks for new messages every 5 s.

## The privacy model, enforced by the database

- **No readable account ids on content.** Every authored row carries an author *snapshot* that the server builds from
  the author's profile (`private.author_snapshot`). Clients cannot write it, so nobody can claim a badge, a role or
  another member's name. Who wrote what lives in `private.authorship`, which no client role can read.
- **Anonymous means anonymous.** An anonymous snapshot carries the handle, the high-level role, years of experience and
  the credential — no name, age, city, employer or graduation year. The app renders the title from these fields.
- **Messages without identities meeting.** Threads and messages live in the `private` schema and are reached only through
  functions (`start_thread`, `my_threads`, `send_message`…). Neither side ever receives the other's account id.
- **Money by role.** Engineers read individual salary shares; HR and owners get aggregate bands only (`salary_bands`,
  a cell needs ≥ 5 reports); field staff get no money.
- **Moderation by reference.** Staff see `mod_ref` ("acc-xxxxxx"), never the name or e-mail behind an anonymous item.
  Reports are anonymous; distinct reporters reaching the threshold hide an item; a dismissed case doubles its threshold.
- **Verification documents expire.** Uploads go to the private `verification` bucket, only into the member's own folder.
  A decision or a withdrawal returns the file paths and the app deletes them at once; an unreviewed request expires after
  7 days (`pg_cron`, hourly); the `purge-verification` function sweeps anything left, including files older than 7 days.
- **Deleting an account deletes what it wrote**, then the account (profile, threads, reactions and requests cascade).
- **Signed-out visitors reach nothing** (`20261002000006_lockdown.sql`); every function the app calls is granted to
  `authenticated` explicitly.

`supabase/tests/database/*.test.sql` checks each of these rules as real members (JWT claims), and
`tests/cloud.integration.test.ts` checks them again through `cloud.ts` and the Storage API.

## Setting up the Frankfurt project (one time)

1. **Create the project** at supabase.com → New project → Region **Central EU (Frankfurt) — eu-central-1**.
2. **Push the schema** from the PC (Docker Desktop is not needed for this):
   ```
   npx supabase login
   npx supabase link --project-ref <project ref>
   npx supabase db push
   ```
3. **Auth settings** (Dashboard → Authentication → URL Configuration):
   - Site URL: where the web app is hosted (until then, `http://localhost:8770`).
   - Redirect URLs: `http://localhost:5173/**`, `http://localhost:8770/**`, `app.engspace://auth-callback**`, and the hosted
     address with `/**`.
   - Email → "Confirm email" on. Set up custom SMTP before launch (the built-in sender is rate-limited).
4. **The document sweep**: `npx supabase functions deploy purge-verification`, then set a secret
   (`npx supabase secrets set PURGE_SECRET=<random>`) and schedule it hourly from the SQL editor:
   ```sql
   select cron.schedule('engspace-purge-verification', '17 * * * *', $$
     select net.http_post(url := 'https://<project ref>.supabase.co/functions/v1/purge-verification',
       headers := jsonb_build_object('x-purge-secret', '<the same secret>'))
   $$);
   ```
   (`pg_net` must be enabled: Dashboard → Database → Extensions.)
5. **The app's keys**: copy the Project URL and the *publishable* key (Dashboard → Project Settings → API) into
   `.env.local` on the PC (never committed), and into the GitHub repository secrets `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_PUBLISHABLE_KEY` so CI's Android build uses the hosted project. The publishable key is designed to ship
   inside apps; the service-role / secret key must never be put in the app or the repository.
6. **The first administrator**: sign up in the app, then in the SQL editor run
   `select public.bootstrap_admin('your@email');` — it works only while there is no administrator. Further moderators and
   administrators are granted from the console (Members → a member → Admin permission).

## Local development

| Command | What it does |
| --- | --- |
| `npm run db:start` | Local Supabase in Docker (database, auth, storage, API; e-mails go to Mailpit at http://127.0.0.1:54324) |
| `npm run db:env` | Writes `.env.local` for the local stack (`-- --lan` so a phone on the Wi-Fi can reach it) |
| `npm run db:reset` | Recreates the local database from the migrations |
| `npm run db:test` | The pgTAP suites (`supabase test db`) |
| `npm run test:cloud` | `cloud.ts` end to end against the local stack |
| `npm run db:admin -- <email>` | Makes an account the first administrator (local) |
| `node tools/crawl-cloud.mjs` | The click-everything crawler in cloud mode, signed in as test accounts (needs Playwright) |

Delete `.env.local` to return to the demo. Unit tests never read `.env.local` (`vitest.config.ts → envDir`).

## Previewing on the laptop and the phone at the same time

`npm run live` builds, then rebuilds on every save (`vite build --watch`), and serves the build read-only on the Wi-Fi
(`scripts/phone-server.mjs`). It prints two addresses:

- laptop: `http://localhost:8770/#app` (and `#admin` for the console)
- phone: `http://<this PC's IP>:8770/#app`, same Wi-Fi

Both pages reload by themselves about two seconds after a save (or show a "tap to reload" pill while you are typing).
With the hosted project in `.env.local`, the laptop and the phone share the same real data, so a post made on one appears
on the other after a refresh. Other ways in:

- **Native app with live reload**: `npm run live -- --android` installs the app on a phone connected by USB (Android
  Studio's SDK and USB debugging needed); it loads from the same server and reloads with the others. For a store-like
  build, `npm run cap:sync` then open `android/` in Android Studio, or `ios/` in Xcode on a Mac.
- **No cable, no Android Studio**: every push builds an installable APK in GitHub Actions (Actions → the run →
  Artifacts → `engspace-debug-apk`). Install it on the phone (allow "install unknown apps" once).
- **Phone not on the same Wi-Fi**: `npm run live -- --tunnel` prints the `localhost.run` command for an HTTPS address.

`npm run dev` (hot reload, port 5173) still works alongside for the laptop.

## Follow-ups

- Realtime (Supabase Realtime on notifications) instead of the 5-second message polling and refresh-on-focus.
- Push notifications (FCM / APNs) — needs the store accounts.
- Sweep `media` images of deleted posts and accounts (the verification sweep covers documents only).
- Pagination past the newest 60 posts; full-text search on the server.
- iOS build in CI needs a macOS runner and signing; Android release signing and store listings (Phase 4).
- The admin console as its own web app behind MFA (Phase 3), as planned.
