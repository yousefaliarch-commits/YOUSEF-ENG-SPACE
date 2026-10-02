# EngSpace — project memory

Anonymous career and salary network for Egyptian engineers. **Arabic-first, RTL**, English interface available; money in
**EGP**. Owner: Yousef (architect / BIM coordinator) — works on a Windows PC; GitHub `yousefaliarch-commits/YOUSEF-ENG-SPACE`.

## Roadmap and status
- Phase 1 ✅ single-file prototype → Vite + React 18 + TypeScript (docs/MIGRATION.md).
- Phase 2 ✅ Supabase (Frankfurt, eu-central-1) + Capacitor 8 (docs/PHASE2.md). Hosted project setup is a manual step there.
- Next: the brainstormed "high-impact features" (market transparency, daily engineering tools) — chosen with the owner
  AFTER Phase 2, on the real backend. Phase 3: admin console as its own web app behind MFA. Phase 4: store releases.

## Non-negotiables
- **Privacy model** (enforced in SQL, tested in supabase/tests): server-built author snapshots; no client-readable
  account id on content (`private.authorship`); anonymous snapshots carry no name/age/city/employer/grad year; threads
  only via functions; staff see `mod_ref`, never names behind anonymous items.
- Money by role: engineers individual figures; HR/owner aggregates (≥ 5 reports per cell); field staff none.
- Verification documents: private bucket, own folder only, deleted at decision/withdrawal, **7 days max** (pg_cron +
  `purge-verification` sweep). Employer accounts are never verified.
- Deleting an account deletes everything it wrote.
- Member-written text is never translated; every new Arabic UI string needs English in `i18n/en/*.tsv`
  (`npm run i18n`, then `node scripts/i18n/build.mjs todo`). CI fails if `i18n/keys.json` / `src/i18n/en.generated.json`
  are not committed and current.

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
CI: check, database (pgTAP + cloud e2e on local Supabase), android (debug APK artifact).

## Conventions
- Match the surrounding style: long single-line handlers, comments explaining *why*, Arabic product copy.
- Security-definer SQL functions: `set search_path = ''`, fully qualified names, explicit `grant execute ... to authenticated`.
- Policies use `(select auth.uid())`; index every column a policy filters on.
