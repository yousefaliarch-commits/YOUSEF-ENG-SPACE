# v0.40.0 — Omnisearch, disciplines, 1:1 exports, voice take-off

Architectural report for the milestone. Everything below is on-device and in the demo/local path; nothing was exercised against the hosted backend.

## 1. Tools by discipline
`src/tools/registry.ts` gives every tool a `group` (`GROUPS`, `GROUP_OF`): Site & Field · Technical Office · Design Verification · Health & Safety · Office Management. The Tools tab (`ToolPacks`), the landing page and the palette read the same table, so phone and desktop agree. Role gates are unchanged (`toolAllowed`): supervisors never reach a money tool; HR only the CV review. `tests/tool-groups.test.ts` pins it. Table cells wrap complete Arabic + English text (`tests/table-wrap.test.ts`).

## 2. Omnisearch (Ctrl/⌘K)
`src/tools/palette.ts` is a pure index over tools, documents, projects, screens, **community posts, jobs and companies**. Categories (الكل · الأدوات · المستندات · المجتمع · الوظائف · الشركات) with counts, badges and timestamps, relevance tiers (exact > keyword-prefix > word > substring), Tab cycles categories, arrows/Enter navigate. Posts / jobs / companies are passed in by `paletteContext` in `AppView` from what the member's role may already open (`blocked.stack`), so search never widens access.

## 3. Word and Excel mirror the PDF
`specDocx` and `specXlsx` now carry what the PDF's title block carries: revision table (`applyDocControls` history), code profile, fingerprint, status, signature boxes; long text wraps in every cell. `fingerprint()` is one shared helper. `tests/export-parity.test.ts` compares the three outputs on four sample sheets; live `SUM`/`PRODUCT` formulas stay (the bar-schedule sketch column is the one thing a spreadsheet cannot hold).

## 4. CV review (AI side)
On-device audit was already gender-aware and Syndicate-neutral. The AI panel now receives `facts.militaryRelevance`, the prompt (`PROMPT_VERSION 2026-11-10.1`) forbids military talk unless it is «yes», and the client drops any finding that mentions military service when it does not apply, or that penalises the Syndicate card (`forbiddenFinding`). **The prompt change reaches the hosted function when "Deploy database" runs after merge.**

## 5. Voice take-off
`src/domain/tools/voice-parse.ts` (pure, strict) reads Egyptian-Arabic and English dictation: element nouns, counts, `A في B` products, labelled dimensions, cm / mm / m, spoken numbers, Arabic digits, grade, waste. It lists exactly what is missing as questions — a dimension is never guessed; grade and waste show their defaults. `features/ai/VoiceTool.tsx` (assistant tab, for roles allowed `concrete`) shows what was understood, the engine's own net / order / formwork figures, then saves a concrete take-off document and opens it for the PDF / Word / Excel export.

Honest limits:
- **No AI call and no native speech plugin.** A plugin would need native line 3 and break line-2 OTA; iOS web views have no `SpeechRecognition`. The mic button uses the browser's recogniser where it exists; elsewhere the text box takes the keyboard's dictation key.
- It understands the concrete take-off vocabulary only, not free-form requests for other tools.

## Tests
`tests/voice-parse.test.ts` (the brief's sentence → 10 footings, 2 × 2.5 × 0.6 m), `e2e/voice.spec.ts` (phone + desktop), extended `tests/palette.test.ts`, `tests/export-parity.test.ts`, `tests/tool-groups.test.ts`, `tests/ai-cv.test.ts`.
