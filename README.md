# EngSpace

An anonymous career and salary network for Egyptian engineers. It is Arabic-first (right-to-left), with an English interface,
and shows money in EGP.

This repository is the production codebase. It was migrated from the single-file prototype in Phase 1 of the native app
roadmap ([docs/MIGRATION.md](docs/MIGRATION.md)). Phase 2 added the Supabase backend (Frankfurt) and the Capacitor 8 iOS and
Android shells ([docs/PHASE2.md](docs/PHASE2.md)). Without Supabase keys the app runs as a self-contained demo.

## Requirements

- Node.js 24 (the version CI uses). On the development PC, a portable Node is installed at `C:\Users\youse\.local\node` but
  is not on the system `PATH`. Put it first on `PATH` in the shell you use:
  - PowerShell: `$env:Path = "C:\Users\youse\.local\node;" + $env:Path`
  - Git Bash: `export PATH="/c/Users/youse/.local/node:$PATH"`

## Scripts

| Command | What it does |
| --- | --- |
| `npm install` | Installs dependencies |
| `npm run dev` | Dev server at http://localhost:5173 with hot reload |
| `npm run build` | Production build into `dist/` (relative paths, so it also runs inside Capacitor) |
| `npm run preview` | Serves `dist/` at http://localhost:4173 |
| `npm test` | All test suites (Vitest) |
| `npm run typecheck` | TypeScript for the app (`tsconfig.json`), then for the tests and config (`tsconfig.node.json`) |
| `npm run i18n` | Regenerates the English dictionary from the source and `i18n/` (runs before dev, build and test) |
| `npm run check` | Typecheck + tests + build, the same gate as CI |
| `npm run live` | Preview on the laptop and the phone at once; rebuilds and reloads both on every save ([details](docs/PHASE2.md#previewing-on-the-laptop-and-the-phone-at-the-same-time)) |
| `npm run phone` | Serves the last build to the phone on the Wi-Fi (read-only, live sync) |
| `npm run db:start` · `db:reset` · `db:test` | Local Supabase (Docker Desktop), recreate it from the migrations, run the RLS tests |
| `npm run db:env` | Points `.env.local` at the local Supabase (`-- --lan` for a phone) |
| `npm run test:cloud` | The app's cloud layer end to end against the local Supabase |
| `npm run cap:sync` | Builds and copies the web app into `android/` and `ios/` |

`dev` and `build` first copy the Tesseract worker and WASM core into `public/vendor/` (`scripts/copy-vendor.mjs`). That
folder is generated and not committed.

## Layout

```
src/
  main.tsx            entry: fonts, styles, press feedback, <App/>
  app/                root (theme, language, error boundary), top bar, the member app's state and routing (AppView)
  features/           auth · tabs · stack (pushed screens) · sheets · settings · verify · cv (lazy) · admin (lazy)
  ui/                 shared components: chrome, feed, identity, moderation, notifications, characters, primitives, theme
  domain/             rules without UI: taxonomy, identity, moderation, text guard, Syndicate divisions
  lib/                runtime stores, helpers, search, media, OCR, posts, time, lazily loaded vendor libraries
  data/               seed data: companies, jobs, posts, regions, tools
  i18n/               translator + en.generated.json (generated, do not edit by hand)
  styles/app.css      Tailwind layers + design tokens + motion
i18n/                 translation sources: en/*.tsv (by id), extra.tsv (patterns), keys.json (extracted)
public/ocr/           Tesseract language models (Arabic, English)
tests/                Vitest suites + harness (stub React; see docs/MIGRATION.md)
scripts/              copy-vendor, i18n extract/build, migrate/ (Phase 1 record)
tools/crawl-ui.js     in-browser click-everything crawler for the dev server (see docs/MIGRATION.md)
prototype/            the v24 prototype's source, for reference
```

## Translations

English is the system's language only. What members write (posts, comments, messages, reviews) is never translated. To
translate new interface text:

1. Run `npm run i18n`.
2. List the Arabic strings that have no English with `node scripts/i18n/build.mjs todo`.
3. Add `<id>\t<English>` lines to a file in `i18n/en/`.

Placeholders `{0}`, `{n}` and `{t}` must match the Arabic.

## Privacy rules the code keeps

- Verification documents are held only until an administrator decides the request, and for 7 days at most. Then they are
  deleted permanently. See `features/verify` and `features/admin/verify-admin`.
- OCR runs on the device, and nothing is uploaded.
- The built app loads nothing from outside its own origin: no CDN and no web fonts.
