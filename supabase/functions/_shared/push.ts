// Push delivery, in plain TypeScript (no Deno-only APIs) so the same code runs in the send-push Edge Function and in the Vitest
// suite: Google OAuth + FCM HTTP v1 for Android, APNs (token auth, HTTP/2) for iOS, and the orchestration that turns one
// claimed outbox row into per-device sends and reports back what to retry, what to drop and which tokens are dead.
// Credentials are only ever passed in by the caller (function secrets) — nothing here reads or stores a key.

// ---------------------------------------------------------------- types
export type Platform = "android" | "ios" | "web";
export type DeviceToken = { token: string; platform: Platform; lang: "ar" | "en" };
export type ClaimedPush = {
  id: number; account_id: string; category: string; title_ar: string; body_ar: string; title_en: string; body_en: string;
  data: Record<string, unknown>; collapse_key: string | null; tokens: DeviceToken[];
};
export type Payload = { title: string; body: string; data: Record<string, string>; collapseKey: string | null; category: string };
export type SendResult = { ok: true } | { ok: false; dead?: boolean; retry?: boolean; error: string };
export type Sender = (token: string, payload: Payload) => Promise<SendResult>;
export type Outcome = { id: number; status: "sent" | "failed" | "skipped" | "pending"; error: string | null; dead: string[] };
type Fetch = (url: string, init?: any) => Promise<{ ok: boolean; status: number; json(): Promise<any>; text(): Promise<string> }>;

// ---------------------------------------------------------------- JWT (RS256 for Google, ES256 for Apple)
const enc = new TextEncoder();
export const b64url = (data: ArrayBuffer | Uint8Array | string) => {
  const bytes = typeof data === "string" ? enc.encode(data) : data instanceof Uint8Array ? data : new Uint8Array(data);
  let s = ""; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
export function pemToDer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----(BEGIN|END)[^-]+-----/g, "").replace(/\s+/g, "");
  const bin = atob(b64); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}
export async function signJwt(alg: "RS256" | "ES256", header: Record<string, unknown>, claims: Record<string, unknown>, pem: string): Promise<string> {
  const algo = alg === "RS256" ? { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" } : { name: "ECDSA", namedCurve: "P-256" };
  const key = await crypto.subtle.importKey("pkcs8", pemToDer(pem), algo as any, false, ["sign"]);
  const input = b64url(JSON.stringify({ alg, typ: "JWT", ...header })) + "." + b64url(JSON.stringify(claims));
  const sig = await crypto.subtle.sign(alg === "RS256" ? "RSASSA-PKCS1-v1_5" : { name: "ECDSA", hash: "SHA-256" }, key, enc.encode(input));
  return input + "." + b64url(sig);   // WebCrypto returns ECDSA as raw r||s, which is what JWS wants
}

// ---------------------------------------------------------------- FCM HTTP v1 (Android)
export type ServiceAccount = { project_id: string; client_email: string; private_key: string; token_uri?: string };
export function parseServiceAccount(json: string | undefined | null): ServiceAccount | null {
  if (!json) return null;
  try { const o = JSON.parse(json); return o && o.project_id && o.client_email && o.private_key ? o : null; } catch { return null; }
}

export function fcmMessage(token: string, p: Payload) {
  return {
    message: {
      token,
      notification: { title: p.title, body: p.body },
      data: p.data,   // strings only; the app reads where to go from here when the notification is tapped
      android: {
        priority: "HIGH",
        ...(p.collapseKey ? { collapse_key: p.collapseKey } : {}),
        notification: { channel_id: p.category, ...(p.collapseKey ? { tag: p.collapseKey } : {}) },
      },
    },
  };
}

// the OAuth access token for the service account, reused until a minute before it expires
export function fcmSender(sa: ServiceAccount, fetchFn: Fetch = fetch as any, now: () => number = Date.now): Sender {
  let cached: { token: string; exp: number } | null = null;
  const access = async (force = false) => {
    if (!force && cached && cached.exp - 60_000 > now()) return cached.token;
    const iat = Math.floor(now() / 1000); const uri = sa.token_uri || "https://oauth2.googleapis.com/token";
    const jwt = await signJwt("RS256", {}, { iss: sa.client_email, scope: "https://www.googleapis.com/auth/firebase.messaging", aud: uri, iat, exp: iat + 3600 }, sa.private_key);
    const r = await fetchFn(uri, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "grant_type=" + encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer") + "&assertion=" + jwt });
    if (!r.ok) throw new Error("google oauth " + r.status);
    const j = await r.json(); cached = { token: j.access_token, exp: now() + (Number(j.expires_in) || 3600) * 1000 }; return cached.token;
  };
  const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;
  return async (token, payload) => {
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        const r = await fetchFn(url, { method: "POST", headers: { authorization: "Bearer " + await access(attempt > 0), "content-type": "application/json" }, body: JSON.stringify(fcmMessage(token, payload)) });
        if (r.ok) return { ok: true };
        if (r.status === 401 && attempt === 0) continue;   // the access token went stale: fetch a new one once
        const text = await r.text(); let code = ""; try { code = JSON.parse(text).error?.details?.find((d: any) => d.errorCode)?.errorCode || JSON.parse(text).error?.status || ""; } catch { /* not json */ }
        // the app was uninstalled or the token is malformed: this token is dead
        if (r.status === 404 || code === "UNREGISTERED" || (r.status === 400 && (code === "INVALID_ARGUMENT" || /registration token/i.test(text)))) return { ok: false, dead: true, error: "fcm " + (code || r.status) };
        return { ok: false, retry: r.status === 429 || r.status >= 500, error: "fcm " + r.status + " " + code };
      }
      return { ok: false, retry: true, error: "fcm 401" };
    } catch (e: any) { return { ok: false, retry: true, error: "fcm " + (e && e.message || e) }; }
  };
}

// ---------------------------------------------------------------- APNs (iOS)
export type ApnsKey = { keyP8: string; keyId: string; teamId: string; bundleId: string; sandbox?: boolean };
export function apnsConfig(env: (k: string) => string | undefined): ApnsKey | null {
  const keyP8 = env("APNS_KEY_P8"), keyId = env("APNS_KEY_ID"), teamId = env("APNS_TEAM_ID"), bundleId = env("APNS_BUNDLE_ID") || "app.engspace";
  return keyP8 && keyId && teamId ? { keyP8: keyP8.replace(/\\n/g, "\n"), keyId, teamId, bundleId, sandbox: env("APNS_ENV") === "sandbox" } : null;
}
export function apnsBody(p: Payload) {
  return { aps: { alert: { title: p.title, body: p.body }, sound: "default", "thread-id": p.category, "mutable-content": 1 }, ...p.data };
}
export function apnsSender(k: ApnsKey, fetchFn: Fetch = fetch as any, now: () => number = Date.now): Sender {
  let jwt: { v: string; at: number } | null = null;   // Apple wants the token refreshed between 20 and 60 minutes
  const bearer = async (force = false) => {
    if (!force && jwt && now() - jwt.at < 40 * 60_000) return jwt.v;
    jwt = { v: await signJwt("ES256", { kid: k.keyId }, { iss: k.teamId, iat: Math.floor(now() / 1000) }, k.keyP8), at: now() }; return jwt.v;
  };
  const host = k.sandbox ? "https://api.sandbox.push.apple.com" : "https://api.push.apple.com";
  return async (token, payload) => {
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        const r = await fetchFn(`${host}/3/device/${token}`, { method: "POST", headers: {
          authorization: "bearer " + await bearer(attempt > 0), "apns-topic": k.bundleId, "apns-push-type": "alert", "apns-priority": "10",
          ...(payload.collapseKey ? { "apns-collapse-id": payload.collapseKey.slice(0, 64) } : {}), "content-type": "application/json" }, body: JSON.stringify(apnsBody(payload)) });
        if (r.ok) return { ok: true };
        let reason = ""; try { reason = (await r.json()).reason || ""; } catch { /* empty body */ }
        if (r.status === 403 && reason === "ExpiredProviderToken" && attempt === 0) continue;
        if (r.status === 410 || reason === "Unregistered" || reason === "BadDeviceToken" || reason === "DeviceTokenNotForTopic") return { ok: false, dead: true, error: "apns " + (reason || r.status) };
        return { ok: false, retry: r.status === 429 || r.status >= 500, error: "apns " + r.status + " " + reason };
      }
      return { ok: false, retry: true, error: "apns 403" };
    } catch (e: any) { return { ok: false, retry: true, error: "apns " + (e && e.message || e) }; }
  };
}

// ---------------------------------------------------------------- orchestration
const strings = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]));
export function payloadFor(row: ClaimedPush, lang: "ar" | "en"): Payload {
  return { title: lang === "en" ? row.title_en : row.title_ar, body: lang === "en" ? row.body_en : row.body_ar, data: strings(row.data || {}), collapseKey: row.collapse_key, category: row.category };
}

// One claimed row → what push_finish should record. Rules:
//  · no device at all, or only platforms without credentials → skipped (final: a late push is worse than none)
//  · at least one device accepted it → sent (dead tokens are still reported for deletion)
//  · only transient failures → pending (retried by the next sweep, up to the attempt limit in SQL) · otherwise failed
export async function deliver(rows: ClaimedPush[], senders: Partial<Record<Platform, Sender>>, concurrency = 20): Promise<Outcome[]> {
  const out: Outcome[] = [];
  const one = async (row: ClaimedPush): Promise<Outcome> => {
    const dead: string[] = []; let sent = 0, retry = 0, hard = 0, skipped = 0; let error: string | null = null;
    if (!row.tokens || row.tokens.length === 0) return { id: row.id, status: "skipped", error: "no device", dead };
    await Promise.all(row.tokens.map(async (t) => {
      const send = senders[t.platform]; if (!send) { skipped++; error = error || "no credentials for " + t.platform; return; }
      const r = await send(t.token, payloadFor(row, t.lang));
      if (r.ok) { sent++; return; }
      const f = r as { ok: false; dead?: boolean; retry?: boolean; error: string };   // (narrowing by `ok` needs strictNullChecks)
      if (f.dead) { dead.push(t.token); error = f.error; } else if (f.retry) { retry++; error = f.error; } else { hard++; error = f.error; }
    }));
    if (sent > 0) return { id: row.id, status: "sent", error: null, dead };
    if (retry > 0) return { id: row.id, status: "pending", error, dead };
    if (hard > 0) return { id: row.id, status: "failed", error, dead };
    return { id: row.id, status: skipped > 0 ? "skipped" : "failed", error: error || "all devices were dead", dead };
  };
  for (let i = 0; i < rows.length; i += concurrency) out.push(...await Promise.all(rows.slice(i, i + concurrency).map(one)));
  return out;
}
