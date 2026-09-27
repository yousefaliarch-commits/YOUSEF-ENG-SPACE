# Phase 1 — from the single-file prototype to this codebase

The prototype (v24) was one HTML page, assembled by Python scripts from 27 script parts that shared one global scope. Its JSX
and Tailwind were precompiled by those scripts, but React, lucide, pdf.js, mammoth, Tesseract and the fonts came from CDNs at
runtime. Phase 1 turns it into a bundled Vite + React + TypeScript
project with no runtime CDN dependency, without changing what the app does. A reference copy of the prototype's source is
kept in [`prototype/engspace-v24-source.html`](../prototype/engspace-v24-source.html).

## How the code was split

`scripts/migrate/analyze.cjs` read the 27 parts with the TypeScript compiler API: 888 top-level names, 40 forward references
between parts, none evaluated at load time. `scripts/migrate/generate.cjs` assigned every top-level declaration to a module
(its part's module, with a few moves to break cycles), wrote the exact imports each module needs, and checked the module graph
for cycles (none). The result is recorded in [`docs/migration-report.json`](migration-report.json). Those two scripts and
`port-tests.cjs` are kept as a record; they read the prototype's part files, which are not in this repository.

| Module | Prototype part(s) |
| --- | --- |
| `src/app/AppView.tsx` | `_app_5_root.txt` |
| `src/data/companies.tsx` | `_app_1c_companies.txt` |
| `src/data/geo.ts` | `_app_1a_geo.txt` |
| `src/data/seed.ts` | `_app_1d_jobs.txt` |
| `src/data/tools.ts` | `_app_4_sheets.txt` |
| `src/domain/division.ts` | `_app_1h_division.txt` |
| `src/domain/identity.ts` | `_app_1g_identity.txt`, `_app_4c_moderation.txt` |
| `src/domain/moderation.ts` | `_app_4c_moderation.txt` |
| `src/domain/taxonomy.ts` | `_app_1b_taxonomy.txt`, `_app_1e_helpers.txt`, `_app_2e_verify.txt` |
| `src/domain/text-guard.ts` | `_app_1b_taxonomy.txt` |
| `src/features/admin/AdminView.tsx` | `_app_4c_moderation.txt` |
| `src/features/admin/kit.tsx` | `_app_4c_moderation.txt` |
| `src/features/admin/verify-admin.tsx` | `_app_4d_verify_admin.txt` |
| `src/features/auth/auth.tsx` | `_app_2d_auth.txt` |
| `src/features/cv/audit.ts` | `_app_3c2_cvaudit.txt` |
| `src/features/cv/CVReviewScreen.tsx` | `_app_3d_cvui.txt` |
| `src/features/cv/extract.ts` | `_app_3c_cv.txt` |
| `src/features/settings/settings.tsx` | `_app_3e_settings.txt` |
| `src/features/sheets/sheets.tsx` | `_app_4_sheets.txt` |
| `src/features/stack/stack.tsx` | `_app_3b_stack.txt` |
| `src/features/tabs/tabs.tsx` | `_app_3_screens.txt` |
| `src/features/verify/verify.tsx` | `_app_2e_verify.txt` |
| `src/lib/helpers.tsx` | `_app_1e_helpers.txt` |
| `src/lib/media.tsx` | `_app_1i_media.txt`, `_app_2b_onboarding.txt` |
| `src/lib/posts.ts` | `_app_2b_onboarding.txt`, `_app_3b_stack.txt` |
| `src/lib/runtime.ts` | `_app_1e_helpers.txt` |
| `src/lib/search.ts` | `_app_1f_search.txt` |
| `src/lib/time.ts` | `_app_3_screens.txt` |
| `src/ui/characters.tsx` | `_app_1e_helpers.txt`, `_app_1e2_characters.txt` |
| `src/ui/chrome.tsx` | `_app_2_chrome.txt`, `_app_3e_settings.txt` |
| `src/ui/feed.tsx` | `_app_2b_onboarding.txt` |
| `src/ui/identity.tsx` | `_app_2c_identity_ui.txt` |
| `src/ui/moderation.tsx` | `_app_4c_moderation.txt` |
| `src/ui/notifications.tsx` | `_app_3b_stack.txt` |
| `src/ui/primitives.tsx` | `_brand_part.txt` |
| `src/ui/theme.ts` | `_brand_part.txt` |

Written or rewritten by hand in Phase 1: `src/main.tsx`, `src/app/App.tsx` (root, error boundary, press feedback),
`src/app/TopBar.tsx`, `src/app/ScreenLoading.tsx`, `src/lib/vendor.ts` and `src/lib/ocr.ts` (bundled libraries in place of
CDN loaders), `src/i18n/i18n.ts` (dictionary as a JSON import), `src/styles/app.css`, `src/types/global.d.ts`.

### Left in the prototype

These existed only to present the prototype and are not part of the product: the brand board (`HeroArt`, `BrandView`,
palette/type panels…), the side-by-side iPhone/Android device previews and their design panel (`DevicesView`,
`DeviceFrame`, status bars, `DESIGN_DEFAULT`…), the in-page live code editor (`CodePanel`, `loadBabel`, `applyLiveSource`,
`LiveBoundary`…), the generic `Modal` and `mountApp`. About 170 dictionary strings went with them.

## Types

The prototype was JavaScript. `scripts/migrate/gradual-types.cjs` added explicit gradual types so `tsc` checks every file
without rewriting logic: `any` on destructured props and untyped parameters, `<any>` on loosely seeded `useState` /
`useRef` / `useMemo` / `createContext`. `scripts/migrate/type-fixes.cjs` fixed what that cannot infer: mixed-type lookup
tables, boolean arithmetic in sort comparators, and DOM element casts. `tsc` reports 0 errors with `strict` off.

**Follow-up:** turn on `strictNullChecks` and then `strict`, module by module, replacing `any` with real types, starting
with `domain/` and `lib/`.

## Runtime dependencies: CDN → bundle

| Prototype (CDN, runtime) | Now |
| --- | --- |
| React 18 UMD (cdnjs); JSX precompiled by the prototype's own script, Babel standalone for its live editor | `react` / `react-dom` 18.3, compiled by Vite |
| Tailwind 3.4, precompiled into the page by the prototype's own script | Tailwind 3.4 + PostCSS in the Vite build (`tailwind.config.js`) |
| lucide-react UMD (jsDelivr) | `lucide-react`, tree-shaken |
| IBM Plex Sans Arabic + Space Grotesk (Google Fonts) | `@fontsource/*` packages, served with the app |
| pdf.js 3.11 + its worker (cdnjs) | `pdfjs-dist` 3.11, lazy chunk; the worker is a bundled asset |
| mammoth 1.8 (cdnjs) | `mammoth`, lazy chunk |
| Tesseract.js 5 + WASM core (jsDelivr), language models embedded as base64 | `tesseract.js`; worker and core copied to `public/vendor/tesseract` by `scripts/copy-vendor.mjs`; models in `public/ocr` |
| Company logos as `logos/<id>.png` files next to the page | `src/assets/logos/*.png`, hashed by Vite |
| English dictionary in a `<script type="application/json">` | `src/i18n/en.generated.json`, generated at build |

The built app makes no request outside its own origin.

## Code splitting

The member app loads first. The admin console (`features/admin`) and the CV review (`features/cv`) are separate chunks,
loaded the first time they are opened. pdf.js, mammoth and Tesseract load only when a file is read.

## Tests

The prototype's 13 suites ran the compiled page in `new Function` with a stub React. They are ported unchanged in intent:
`tests/harness.ts` imports every module into one lookup object `C` (the old shared scope), `tests/setup-globals.ts`
provides the page globals, and `tests/stubs/` gives the same stub React (components run as plain functions, elements are
inspectable objects). `vitest.config.ts` aliases `react`, `react/jsx-runtime`, `react-dom` and `lucide-react` to the
stubs for tests only. Changes to the checks themselves:

- v14 ran the page a second time without `crypto.subtle`; it now swaps `globalThis.crypto` around that one check.
- v21's dictionary-size floor went from 3,000 to 2,900 exact strings, because the brand board and device previews stayed behind.
- v24's static checks read the app source (`H.src`) where they used to read the page's Babel block.
- smoke-render now renders seven starting points, including both lazy chunks. For each, it asserts that the expected screen
  was reached, then invokes every handler it finds.

## i18n

`scripts/i18n/extract.mjs` (formerly `i18n-extract.js`) and `scripts/i18n/build.mjs` (formerly `i18n_build.py`) are the
same rules in Node, reading `src/` instead of the page. On the migrated code, the rebuilt dictionary matches the prototype's
exactly: no entry added or changed, and the same order. The only entries removed belonged to the parts left behind.

## Fixes made along the way

- **pdf.js (CVE-2024-4367).** pdf.js 3.11 can run script from a crafted PDF's font program. Both `getDocument` calls (CV
  import and verification preview) now pass `isEvalSupported: false`, the fix published with the advisory. `npm audit`
  still lists pdfjs-dist because it checks only the version.
- **mammoth.** Upgraded 1.8 → 1.13 for GHSA-rmjr-87wv-gf87 (external file access from a crafted .docx).
- **tar.** Overridden to a patched version. It is only reached through pdf.js's optional Node `canvas` dependency, and is
  never part of the app.
- **Dead controls.** The in-browser crawl found two controls with nothing left to do after the brand board was removed: the
  member header's logo button, which went back to the brand board, and the top bar's logo while already in the app. Both are
  now plain marks, and the top-bar logo is a link only from the admin console.

- **Tailwind from any folder.** Tailwind 3 resolves its `content` globs and its config file from the working directory. A dev
  server started from outside the project produced almost no utility classes. `tailwind.config.js` now uses
  `content.relative` and `postcss.config.js` names the config explicitly, so the CSS is the same (byte for byte) wherever
  the build starts.

## In-browser crawl

`tools/crawl-ui.js` is the prototype's click-everything crawler. It runs inside the real app on the dev server (real React,
real DOM) and exercises every visible control from every start state, recording console errors, controls that change
nothing, and controls without a handler. The dev build exposes `window.__engspaceDev` (mount/unmount; compiled out of
production) so the crawler can restart the app on each deep link.

## Follow-ups (not in Phase 1)

- TypeScript `strictNullChecks`, then `strict`, module by module.
- pdf.js 4.x/5.x. Its API and worker are ES modules, so the import in `lib/vendor.ts` changes. Test in the Capacitor
  WebViews (Phase 4) before switching.
- Load the English dictionary (~250 KB, about a quarter of the main chunk) only when English is chosen.
- The admin console is still bundled with the member app as a lazy chunk. Phase 3 moves it to its own web app, behind real
  authentication.
