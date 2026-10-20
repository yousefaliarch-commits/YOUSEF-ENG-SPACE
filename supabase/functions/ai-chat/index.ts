// ai-chat — «المهندس الذكي», the only door to the model (docs/AI.md). The logic lives in ../_shared/ai-handler.ts (pure pieces in
// ../_shared/ai.ts, prompts in ../_shared/ai-prompts.ts), tested by tests/ai-proxy.test.ts. JWT verification happens inside
// (config.toml: verify_jwt = false) so a bad token gets the same bilingual answer as every other refusal.
import { handle } from "../_shared/ai-handler.ts";
import { restClient } from "../_shared/rest.ts";

const db = restClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
Deno.serve((req) => handle(req, { db, key: Deno.env.get("GEMINI_API_KEY") || undefined, base: Deno.env.get("GEMINI_BASE_URL") || undefined }));
