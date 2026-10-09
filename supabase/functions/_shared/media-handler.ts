// upload-media request handling, independent of Deno so Vitest drives it with a fake client (tests/upload-media.test.ts).
//   POST (member JWT)  x-media-kind: post | avatar | support | verification | inspection   body: the image bytes
//        → type, size and dimensions read from the bytes, metadata stripped, path reserved in SQL (rate limit + quota), file
//          stored with the service role → { path, bucket, w, h, bytes, mime }
//   POST (member JWT)  x-media-action: remove   body { paths: [...] }  → the member's own inspection photos or unused uploads
//   POST x-media-secret (pg_cron every 10 minutes) → the janitor: old files to random names, orphans deleted
import { CORS, KINDS, check, hasMetadata, isKind, pathFor } from "./media.ts";
import type { Verdict } from "./media.ts";
import type { RestClient } from "./rest.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "content-type": "application/json" } });

export async function handle(req: Request, db: RestClient, secret: string | undefined, uuid: () => string = () => crypto.randomUUID()): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  // ---- the janitor
  const given = req.headers.get("x-media-secret");
  if (given !== null) {
    if (!secret || given !== secret) return json({ error: "forbidden" }, 403);
    return json(await sweep(db, uuid));
  }

  // ---- a member
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const user = await db.user(token); if (!user) return json({ error: "auth" }, 401);

  if (req.headers.get("x-media-action") === "remove") {
    let paths: string[] = [];
    try { const b = await req.json(); paths = Array.isArray(b && b.paths) ? b.paths.filter((p: unknown) => typeof p === "string").slice(0, 50) : []; } catch { /* no body */ }
    if (!paths.length) return json({ removed: 0 });
    const { data, error } = await db.rpc<{ bucket: string; path: string }[]>("media_removable", { p_owner: user.id, p_paths: paths });
    if (error) return json({ error: "server" }, 500);
    return json({ removed: await removeAll(db, data || []) });
  }

  const kind = req.headers.get("x-media-kind");
  if (!isKind(kind)) return json({ error: "kind" }, 400);
  const rule = KINDS[kind];
  if (Number(req.headers.get("content-length") || 0) > rule.maxBytes) return json({ error: "too_big" }, 413);
  const v = check(kind, new Uint8Array(await req.arrayBuffer()));
  if (v.ok === false) { const f = v as Extract<Verdict, { ok: false }>; return json({ error: f.error }, f.status); }
  if (hasMetadata(v.bytes)) return json({ error: "metadata" }, 422);   // never store a file that still carries metadata

  const path = pathFor(kind, user.id, uuid(), v.info.mime);
  const reg = await db.rpc("media_register", { p_owner: user.id, p_kind: kind, p_bucket: rule.bucket, p_path: path, p_mime: v.info.mime,
    p_bytes: v.bytes.length, p_w: v.info.w, p_h: v.info.h });
  if (reg.error) {
    const m = reg.error.message || ""; const quota = /quota/.test(m), limited = /rate limited/.test(m);
    return json({ error: quota ? "quota" : limited ? "rate_limited" : "server" }, quota || limited ? 429 : 500);
  }
  const up = await db.upload(rule.bucket, path, v.bytes, v.info.mime, rule.cache);
  if (up.error) { await db.rpc("media_unregister", { p_bucket: rule.bucket, p_path: path }); return json({ error: "storage" }, 502); }
  return json({ path, bucket: rule.bucket, w: v.info.w, h: v.info.h, bytes: v.bytes.length, mime: v.info.mime });
}

async function removeAll(db: RestClient, rows: { bucket: string; path: string }[]) {
  const byBucket = new Map<string, string[]>(); for (const r of rows) byBucket.set(r.bucket, [...(byBucket.get(r.bucket) || []), r.path]);
  let n = 0;
  for (const [bucket, paths] of byBucket) {
    for (let i = 0; i < paths.length; i += 100) {
      const batch = paths.slice(i, i + 100);
      const { error } = await db.remove(bucket, batch);
      if (error) continue;   // the next sweep tries again
      await db.rpc("media_forget", { p_bucket: bucket, p_paths: batch }); n += batch.length;
    }
  }
  return n;
}

// files from before Phase 1.3 move to random names (a missing file is renamed too: the old path is never handed out again);
// then everything orphaned is deleted
export async function sweep(db: RestClient, uuid: () => string = () => crypto.randomUUID()) {
  let moved = 0;
  const { data: legacy } = await db.rpc<{ path: string }[]>("media_legacy", { p_limit: 100 });
  for (const row of legacy || []) {
    const next = `p/${uuid()}.${/\.webp$/i.test(row.path) ? "webp" : "jpg"}`;
    const { error } = await db.move("media", row.path, next);
    if (!error || error.status === 404 || /not found|does not exist/i.test(error.message)) { await db.rpc("media_rename", { p_old: row.path, p_new: next }); moved++; }
  }
  const { data: orphans } = await db.rpc<{ bucket: string; path: string }[]>("media_orphans", { p_limit: 500 });
  const removed = await removeAll(db, orphans || []);
  return { moved, removed };
}
