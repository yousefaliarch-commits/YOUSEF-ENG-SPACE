# The editable workstation (v0.39) — architectural report

The brief: every tool fully editable, a drafting-board look with a split-pane studio, a public page with a working tool in
its hero, a command palette, strict types and hardened input — on native line 2 (everything here ships over the air).

## What changed, by layer

| Layer | Change | Where |
|---|---|---|
| Kit | Rows reorder («أعلى / أسفل»); `Advanced` folds rarely-touched parameters and counts the changed ones; figures roll to new values (the text stays exactly the value); an element draws as an isometric box with live dimension lines on millimetre paper, moving on the app's own spring | `ui/kit.tsx`, `ui/roll.tsx`, `ui/drafting.tsx`, `ui/draft-geometry.ts` |
| Document | Revision schemes (00 · A · P01 · C01 — «مراجعة جديدة» continues the pattern) and issued history printed as the title block's revision table; custom signature boxes (≤ 6, any titles); scale and reference cells; per-project numbering pattern (`{code} {type} {nnnn} {yy} {yyyy} {orig}`); every signature role typed once on the project | `data/doc-controls.ts`, `features/tools/doc-settings.tsx`, `features/tools/host.tsx` |
| Templates | A firm template is a tool document of kind `tpl.<tool>` in the existing store (phone first, account backup, merge, live sync); each tool clears what must never carry over; a template travels as a JSON file through one validated door | `data/tool-templates.ts`, `data/template-file.ts`, `features/tools/templates.tsx` |
| Tools | Nothing a calculation used is fixed any more: concrete grade, site mix, bag, allowances, truck times; custom rebar fy; the trade kit's joint, wastes, layers, sheet size…; certificate VAT rate and lines *added* as well as deducted (`ipc@1.1.0`, live Excel included) | `features/tools/*`, `domain/tools/ipc-calc.ts` |
| Studio | Command palette (Ctrl / ⌘ K): role-gated index, Arabic-normalised ranking, combobox/listbox, lazy; the desktop sidebar carries its door | `tools/palette.ts`, `app/palette*.tsx` |
| Public page | `engspace.org` with nothing after it shows a page to a signed-out visitor: a working slab estimator (same engines as the app, pinned to the pour tool's document), real sample sheets drawn by the export engine, the tool registry, downloads. Never intercepts a sign-in return; never in the phone apps | `app/entry.ts`, `features/landing/*` |
| Safety | Typing ratchet in CI; hostile text through Excel/Word; sync reads before it trusts; dialogs mount inside the app root | `scripts/strict-check.mjs`, `tests/hardening.test.ts`, `ui/portal.ts` |

## Decisions worth knowing

- **Defaults are the old constants.** Every new field blank/absent computes exactly what the document computed before; a
  document saved in v0.38 reprints identically (tests compare against the engines and the old values). The fingerprint of an
  issued document only covers new controls when they were set.
- **No new table, function or bucket.** Templates ride on `member_state` shards behind the same RLS and size caps. Nothing in
  the database changed; the only server-side surface is unchanged.
- **Customization lives at the envelope, not in each tool.** Revisions, signatures, scale and numbering are applied by the host
  over whatever a tool builds (`applyDocControls`), so all 19 tools — and any future one — gain them with no per-tool code.
- **Honest scope vs. the brief.** Delivered as specified: custom grades / yield / waste / thresholds, editable grids (add,
  duplicate, delete, *reorder*), title-block and signature control, firm templates, the export triad with live formulas,
  split-pane studio, command palette, WBS, marketing page with a live mini-tool, strict types in new code, hardened input.
  **Deliberately not done:** Framer Motion (the app already has real spring physics at zero bundle cost — `ui/motion.ts`);
  a folder reshuffle into `src/components/ui` / `src/hooks` (churn without benefit; the existing `features` / `ui` / `lib`
  split stays); `strict` on for the whole legacy codebase (1,381 errors in 50 files — the ratchet freezes it and makes every
  new file strict, the baseline only shrinks); Zod everywhere (used at the one untrusted door, lazily loaded); new RLS (no new
  tables). The marketing page's engspace.org address needs the Cloudflare domain step in `docs/WEB.md`.
- **Typing ratchet numbers** (baseline at this release): 1,381 strict errors in 50 files and 2,437 explicit `any` in 119 files;
  all 18 new modules are clean.

## Verification

`npm run check` (typecheck incl. the ratchet, 742 unit tests, build); `e2e/workstation.spec.ts` on the phone and desktop
profiles; browser screenshots of every new surface (sketch, settings card, templates, palette, landing in light/dark, Arabic
and English, phone and desktop). Native line stays **2** (`ota.config.json` unchanged): no plugin, manifest or native change.
