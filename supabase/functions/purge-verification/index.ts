// Deletes verification documents that must no longer exist: decided, withdrawn or expired requests, uploads never attached to
// a request, and anything older than 7 days. Scheduled hourly (see docs/PHASE2.md); safe to run any time.
// Runs with the service role inside Supabase — the key never reaches a client.
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  // only the scheduler, which knows the secret, may run it (JWT verification is off for this function: see config.toml)
  const secret = Deno.env.get("PURGE_SECRET");
  if (!secret) return new Response("PURGE_SECRET is not set", { status: 500 });
  if (req.headers.get("x-purge-secret") !== secret) return new Response("forbidden", { status: 403 });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  await db.rpc("expire_verifications_now");
  const { data: names, error } = await db.rpc("verification_orphans");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  let removed = 0;
  for (let i = 0; i < (names?.length ?? 0); i += 100) {
    const batch = (names as string[]).slice(i, i + 100);
    const { error: e } = await db.storage.from("verification").remove(batch);
    if (e) return Response.json({ error: e.message, removed }, { status: 500 });
    removed += batch.length;
  }
  return Response.json({ removed });
});
