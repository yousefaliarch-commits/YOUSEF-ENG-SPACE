// Delivers queued push notifications (private.push_outbox) to phones: FCM for Android, APNs for iOS.
// Called by the database (private.kick_push, through pg_net, whenever something is queued) and by pg_cron every minute as a
// sweep; safe to call any time and by several callers at once (the SQL claim uses FOR UPDATE SKIP LOCKED).
// Secrets (supabase secrets set …) — see docs/PUSH.md:
//   PUSH_SECRET        shared with the database (Vault «push_secret»); JWT verification is off for this function, see config.toml
//   FCM_SERVICE_ACCOUNT  the Firebase service-account JSON (one line)
//   APNS_KEY_P8, APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID (default app.engspace), APNS_ENV=sandbox for development builds
// A platform without credentials is skipped, never an error: the rest of the queue still goes out.
import { createClient } from "npm:@supabase/supabase-js@2";
import { apnsConfig, apnsSender, deliver, fcmSender, parseServiceAccount, type ClaimedPush, type Platform, type Sender } from "../_shared/push.ts";

Deno.serve(async (req) => {
  const secret = Deno.env.get("PUSH_SECRET");
  if (!secret) return new Response("PUSH_SECRET is not set", { status: 500 });
  if (req.headers.get("x-push-secret") !== secret) return new Response("forbidden", { status: 403 });

  const senders: Partial<Record<Platform, Sender>> = {};
  const sa = parseServiceAccount(Deno.env.get("FCM_SERVICE_ACCOUNT")); if (sa) senders.android = fcmSender(sa);
  const apns = apnsConfig((k) => Deno.env.get(k)); if (apns) senders.ios = apnsSender(apns);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const totals = { claimed: 0, sent: 0, pending: 0, failed: 0, skipped: 0, deadTokens: 0, platforms: Object.keys(senders) };
  // up to 10 batches of 100 per call; a fan-out of a thousand members is one call
  for (let i = 0; i < 10; i++) {
    const { data, error } = await db.rpc("push_claim", { p_limit: 100 });
    if (error) return Response.json({ error: error.message, ...totals }, { status: 500 });
    const rows = (data || []) as ClaimedPush[]; if (rows.length === 0) break;
    const outcomes = await deliver(rows, senders);
    const { error: e2 } = await db.rpc("push_finish", { p_results: outcomes });
    if (e2) return Response.json({ error: e2.message, ...totals }, { status: 500 });
    totals.claimed += rows.length;
    for (const o of outcomes) { totals[o.status]++; totals.deadTokens += o.dead.length; }
    if (rows.length < 100) break;
  }
  return Response.json(totals);
});
