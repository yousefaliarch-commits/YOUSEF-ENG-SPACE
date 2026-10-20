# «المهندس الذكي» — the Smart Engineer (v0.29.0)

Google Gemini (Flash) inside EngSpace, behind a Supabase Edge Function. Web-only change: native line 2, ships as an OTA bundle.

## Architecture

```
app (any screen) ──ask()/askJson()──▶ ai-chat Edge Function ──▶ Gemini streamGenerateContent (SSE)
  src/services/ai-service.ts            supabase/functions/ai-chat + _shared/ai*.ts
  member JWT, never a key               GEMINI_API_KEY (function secret) · prompts · schemas · quota
```

- **The key never reaches the client.** It is a function secret (`GEMINI_API_KEY`), set by the *Deploy database* workflow from
  the repo secret of the same name; absent → every call answers «غير مفعّل في هذه النسخة بعد» (`not_ready`) and takes no unit.
  The key goes to Google in the `x-goog-api-key` header, never a URL.
- **Prompts and schemas live on the server** (`_shared/ai-prompts.ts`, `_shared/ai-schemas.ts`); changing one is a function deploy,
  not an app update. `PROMPT_VERSION` is bumped with every change.
- **Order of a request** (`_shared/ai-handler.ts`): auth (`db.user(jwt)`) → shape / size validation (`validate`, per-feature
  `LIMITS`) → key present → salary aggregates fetched as the member → `ai_take` (one unit) → Gemini → SSE to the app →
  `ai_refund` if the model failed before the first word → `ai_tokens` (counts only).
- **SSE protocol to the app**: `{"t":"d","x":text}` deltas, `{"t":"end","remaining":N}`; errors as `{"t":"err",code,ar,en}` mid-stream
  or JSON `{error, ar, en}` with a status. The model's thought parts are never forwarded.
- **Allowance**: 25 / Cairo day per member across all features (`private.ai_config.daily_limit`, admins change it with
  `admin_ai_set`); `ai_quota()` for the chip; `admin_ai_usage(days)` gives staff aggregates only (never who asked what).
- **Usage logging**: `private.ai_usage` (account, day, feature, n, tokens) — no text, ever. `ai_rate()` stores 👍 / 👎 per feature.
- **Model**: `gemini-3.8-flash` (config `model`, `model_light`). Thinking levels `low` / `medium` only — `minimal` is refused (400).
- **Dev / e2e**: `window.__engspaceAi = { fake: (req) => string | {error}, delay?, remaining? }` replaces the network, only in
  `import.meta.env.DEV` / mode `test`. Every AI e2e test drives it (`e2e/assistant.spec.ts`, `e2e/ai-tools.spec.ts`).

## Privacy rules

- **CV review**: name, e-mail, phones, LinkedIn, street address and national ID become `{{TOKENS}}` on the phone
  (`src/services/ai-redact.ts`) before anything is sent; the model writes the rebuilt CV with the tokens and the app restores the
  real values. The proxy scrubs again (`scrub`). The CV text is not stored anywhere. Consent once (`engspace.ai.cvConsent`).
- **Salary insights**: the proxy calls `salary_explorer` **as the member** (`rpcAs`), so give-to-get and the 5-report floor apply,
  then `marketOnly` keeps percentiles, `n` and track / governorate rows of 5+ — company rows are dropped. The member's own net
  salary travels only when they tick «قارن براتبي». Site supervisors are refused (`blocked`).
- **Supervisors never get pay talk**: `ai_take` returns `money:false` for a supervisor account and the proxy sets
  `context.noMoney` itself — the app's flag is never trusted.
- **Tool tips** send the tool's own one-screen summary (quantities, counts, closure error) — never names.
- **Assistant**: the profile's discipline / track / level and the list of tools the role may open; never the name. History is on
  the phone only (`engspace.ai.chat:<pid>`, last 60 messages; the last 12 turns / ~18k characters travel).

## Features

| Feature | Where | Server feature | Notes |
|---|---|---|---|
| Assistant | new **«المساعد»** tab (all roles, supervisors included) | `assistant` | streaming Markdown (`ui/markdown.tsx`, no HTML), starters by role, tool chips limited to the role's tools, 7-day cache for a repeated first question |
| AI CV review | Tools → CV review | `cv-review` (JSON schema) | the on-device engine stays the instant result and the offline fallback; the AI result is laid over the same cards; number guard on the rebuilt CV |
| Smart forms | Tools → RFI · material submittal · custody handover (new, «المكتب الفني» pack) and the toolbox talk / permit | `form-fill` (JSON schema per form) | missing facts come back as `[أضف: …]`; the permit stays a draft — the AI never authorises; PDF + new **Word** export for every tool document (`src/doc/docx.ts`) |
| Salary insights | Market → salaries, under the live explorer | `salary-insights` | aggregates only, sample size quoted, 24 h cache per cell |
| 💡 Tool tips | concrete, BBS, site diary, level book | `tool-tip` (light model) | asked only on a tap, ✕ / «لا تظهر في هذه الأداة», 7-day cache |

Every AI surface degrades gracefully: offline or in the demo it says so in one line and the tool keeps working by hand.

## Operations

1. Repo secret **GEMINI_API_KEY** (GitHub → Settings → Secrets and variables → Actions). Rotate the key if it was ever pasted
   anywhere outside that screen.
2. Merge → **Deploy database** (migration `20261020000026_ai.sql`, the `ai-chat` function, the key as a function secret).
3. **Publish web update** (preview channel) — native line 2, no new native permissions or plugins.
4. Turn it off instantly: `select public.admin_ai_set('enabled', 'false')` as an admin (or change `daily_limit`).

## Proposed next steps (for the owner's review)

- Admin console panel over `admin_ai_usage` / `admin_ai_set` (usage per feature, 👍 / 👎 rate, the off switch).
- Prompt A/B by `PROMPT_VERSION`, judged on the 👍 / 👎 feedback.
- Proactive tips (shown once a result is complete) once the per-tap rate shows members value them.
- Photo → NCR / site observation (needs the camera pipeline and a vision model; a separate, reviewed step).
