-- «المهندس الذكي» — the fast model (docs/AI.md → Models). Measured on the live key (2026-10-21): gemini-3.8-flash took ~38 s to
-- its first word, then hit its per-minute quota (429) and "high demand" (503); gemini-3.5-flash-lite starts in ~0.5 s, ends an
-- assistant answer in ~2 s and a full CV review in ~8.5 s with the same rubric output. The proxy falls back to another fast
-- model by itself when this one is busy or over quota (`FALLBACK_MODELS` in supabase/functions/_shared/ai.ts).
-- Only rows still on the old default change, so a model an admin chose with admin_ai_set is kept.
update private.ai_config set value = '"gemini-3.5-flash-lite"', updated_at = now()
 where key in ('model', 'model_light') and value = '"gemini-3.8-flash"';
