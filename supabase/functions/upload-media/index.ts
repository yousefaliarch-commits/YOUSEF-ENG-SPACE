// upload-media — the only way an image reaches Storage (Phase 1.3, docs/SECURITY.md). The logic lives in
// ../_shared/media-handler.ts (byte checks in ../_shared/media.ts), tested by tests/upload-media.test.ts.
// JWT verification happens inside (config.toml: verify_jwt = false) so the janitor can call with its secret instead.
import { handle } from "../_shared/media-handler.ts";
import { restClient } from "../_shared/rest.ts";

Deno.serve((req) => handle(req, restClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!), Deno.env.get("MEDIA_SECRET")));
