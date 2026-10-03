// Push delivery (supabase/functions/_shared/push.ts): the JWTs Google and Apple verify, the FCM and APNs requests, the way
// each failure is classified, and the per-row outcome the database records. No network: fetch is a stub.
import { beforeAll, describe, expect, it, vi } from "vitest";
import { apnsBody, apnsConfig, apnsSender, b64url, deliver, fcmMessage, fcmSender, parseServiceAccount, payloadFor, signJwt, type ClaimedPush, type Payload } from "../supabase/functions/_shared/push";

const pem = (der: ArrayBuffer, label: string) => `-----BEGIN ${label}-----\n${btoa(String.fromCharCode(...new Uint8Array(der))).replace(/(.{64})/g, "$1\n")}\n-----END ${label}-----`;
let rsa: { pem: string; pub: CryptoKey }, ec: { pem: string; pub: CryptoKey };
beforeAll(async () => {
  const r = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  rsa = { pem: pem(await crypto.subtle.exportKey("pkcs8", r.privateKey), "PRIVATE KEY"), pub: r.publicKey };
  const e = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  ec = { pem: pem(await crypto.subtle.exportKey("pkcs8", e.privateKey), "PRIVATE KEY"), pub: e.publicKey };
});

const un = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const payload: Payload = { title: "عنوان", body: "نص", data: { type: "job", id: "j1", nid: "n1" }, collapseKey: "j1", category: "jobs" };
const res = (status: number, body: any = {}) => ({ ok: status >= 200 && status < 300, status, json: async () => body, text: async () => JSON.stringify(body) });

describe("JWTs", () => {
  it("RS256 (Google): header, claims and a signature the public key verifies", async () => {
    const jwt = await signJwt("RS256", {}, { iss: "sa@x.iam", iat: 1 }, rsa.pem); const [h, c, s] = jwt.split(".");
    expect(JSON.parse(atob(h.replace(/-/g, "+").replace(/_/g, "/")))).toEqual({ alg: "RS256", typ: "JWT" });
    expect(JSON.parse(new TextDecoder().decode(un(c)))).toEqual({ iss: "sa@x.iam", iat: 1 });
    expect(await crypto.subtle.verify("RSASSA-PKCS1-v1_5", rsa.pub, un(s), new TextEncoder().encode(h + "." + c))).toBe(true);
  });
  it("ES256 (Apple): kid in the header, a raw 64-byte signature the public key verifies", async () => {
    const jwt = await signJwt("ES256", { kid: "KEY123" }, { iss: "TEAM", iat: 5 }, ec.pem); const [h, c, s] = jwt.split(".");
    expect(JSON.parse(new TextDecoder().decode(un(h)))).toMatchObject({ alg: "ES256", kid: "KEY123" });
    expect(un(s).length).toBe(64);
    expect(await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, ec.pub, un(s), new TextEncoder().encode(h + "." + c))).toBe(true);
  });
  it("base64url has no padding or +/", () => { expect(b64url("??>>")).toBe("Pz8-Pg"); });
});

describe("FCM (Android)", () => {
  const sa = () => ({ project_id: "eng-space", client_email: "sa@eng-space.iam.gserviceaccount.com", private_key: rsa.pem });
  it("reads the service account and refuses a broken one", () => {
    expect(parseServiceAccount(JSON.stringify(sa()))?.project_id).toBe("eng-space");
    expect(parseServiceAccount("{")).toBeNull(); expect(parseServiceAccount(undefined)).toBeNull(); expect(parseServiceAccount('{"project_id":"x"}')).toBeNull();
  });
  it("the message: notification + string data + channel and collapse key", () => {
    expect(fcmMessage("tok", payload)).toEqual({ message: { token: "tok", notification: { title: "عنوان", body: "نص" }, data: { type: "job", id: "j1", nid: "n1" },
      android: { priority: "HIGH", collapse_key: "j1", notification: { channel_id: "jobs", tag: "j1" } } } });
  });
  it("gets one access token, reuses it, and sends to the project's endpoint", async () => {
    const f = vi.fn(async (url: string) => (url.includes("oauth2") ? res(200, { access_token: "AT", expires_in: 3600 }) : res(200, { name: "m" })));
    const send = fcmSender(sa(), f as any, () => 1_000_000);
    expect(await send("t1", payload)).toEqual({ ok: true }); expect(await send("t2", payload)).toEqual({ ok: true });
    const oauth = f.mock.calls.filter((c) => String(c[0]).includes("oauth2")); expect(oauth.length).toBe(1);
    expect(String((oauth[0] as any[])[1].body)).toContain("grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer");
    const call = f.mock.calls.find((c) => String(c[0]).includes("/v1/projects/eng-space/messages:send"))!;
    expect((call as any[])[1].headers.authorization).toBe("Bearer AT");
  });
  it("an uninstalled app (UNREGISTERED / 404) is a dead token", async () => {
    const f = vi.fn(async (url: string) => (url.includes("oauth2") ? res(200, { access_token: "AT", expires_in: 3600 }) : res(404, { error: { status: "NOT_FOUND", details: [{ errorCode: "UNREGISTERED" }] } })));
    expect(await fcmSender(sa(), f as any)("t", payload)).toMatchObject({ ok: false, dead: true });
  });
  it("a malformed token (400 INVALID_ARGUMENT) is dead; quota and server errors are retried", async () => {
    const f = (code: number, body: any) => vi.fn(async (url: string) => (url.includes("oauth2") ? res(200, { access_token: "AT", expires_in: 3600 }) : res(code, body)));
    expect(await fcmSender(sa(), f(400, { error: { status: "INVALID_ARGUMENT" } }) as any)("t", payload)).toMatchObject({ dead: true });
    expect(await fcmSender(sa(), f(429, { error: { status: "RESOURCE_EXHAUSTED" } }) as any)("t", payload)).toMatchObject({ ok: false, retry: true });
    expect(await fcmSender(sa(), f(503, {}) as any)("t", payload)).toMatchObject({ ok: false, retry: true });
    expect(await fcmSender(sa(), f(403, { error: { status: "PERMISSION_DENIED" } }) as any)("t", payload)).toMatchObject({ ok: false, retry: false });
  });
  it("a stale access token (401) is renewed once", async () => {
    let n = 0; const f = vi.fn(async (url: string) => (url.includes("oauth2") ? res(200, { access_token: "AT" + ++n, expires_in: 3600 }) : res((f.mock.calls.filter((c) => String(c[0]).includes("messages:send")).length === 1 ? 401 : 200), {})));
    expect(await fcmSender(sa(), f as any)("t", payload)).toEqual({ ok: true }); expect(n).toBe(2);
  });
  it("a network failure is retried, not lost", async () => {
    expect(await fcmSender(sa(), (async () => { throw new Error("socket hang up"); }) as any)("t", payload)).toMatchObject({ ok: false, retry: true });
  });
});

describe("APNs (iOS)", () => {
  const key = () => ({ keyP8: ec.pem, keyId: "KEY123", teamId: "TEAM456", bundleId: "app.engspace" });
  it("reads its configuration from the environment, or says there is none", () => {
    const env: any = { APNS_KEY_P8: "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----", APNS_KEY_ID: "K", APNS_TEAM_ID: "T", APNS_ENV: "sandbox" };
    expect(apnsConfig((k) => env[k])).toMatchObject({ keyId: "K", teamId: "T", bundleId: "app.engspace", sandbox: true });
    expect(apnsConfig((k) => env[k])!.keyP8).toContain("\nabc\n"); expect(apnsConfig(() => undefined)).toBeNull();
  });
  it("the body: alert, thread id by category, and the data beside aps", () => {
    expect(apnsBody(payload)).toEqual({ aps: { alert: { title: "عنوان", body: "نص" }, sound: "default", "thread-id": "jobs", "mutable-content": 1 }, type: "job", id: "j1", nid: "n1" });
  });
  it("posts to the device with the topic, a signed bearer token and the collapse id", async () => {
    const f = vi.fn(async () => res(200)); expect(await apnsSender(key(), f as any)("devtoken", payload)).toEqual({ ok: true });
    const [url, init] = f.mock.calls[0] as any; expect(url).toBe("https://api.push.apple.com/3/device/devtoken");
    expect(init.headers).toMatchObject({ "apns-topic": "app.engspace", "apns-push-type": "alert", "apns-collapse-id": "j1" });
    expect(init.headers.authorization).toMatch(/^bearer [\w-]+\.[\w-]+\.[\w-]+$/);
  });
  it("development builds go to the sandbox host", async () => {
    const f = vi.fn(async () => res(200)); await apnsSender({ ...key(), sandbox: true }, f as any)("d", payload);
    expect((f.mock.calls[0] as any)[0]).toBe("https://api.sandbox.push.apple.com/3/device/d");
  });
  it("410 / Unregistered / BadDeviceToken are dead tokens; 429 and 5xx retry; an expired provider token is renewed once", async () => {
    const one = (status: number, body: any) => apnsSender(key(), (async () => res(status, body)) as any)("d", payload);
    expect(await one(410, { reason: "Unregistered" })).toMatchObject({ dead: true });
    expect(await one(400, { reason: "BadDeviceToken" })).toMatchObject({ dead: true });
    expect(await one(429, { reason: "TooManyRequests" })).toMatchObject({ retry: true });
    expect(await one(500, {})).toMatchObject({ retry: true });
    expect(await one(400, { reason: "PayloadTooLarge" })).toMatchObject({ ok: false, retry: false });
    let calls = 0; const f = vi.fn(async () => (++calls === 1 ? res(403, { reason: "ExpiredProviderToken" }) : res(200)));
    expect(await apnsSender(key(), f as any)("d", payload)).toEqual({ ok: true }); expect(calls).toBe(2);
  });
});

describe("deliver(): one claimed row → the outcome the database records", () => {
  const row = (tokens: any[], over: Partial<ClaimedPush> = {}): ClaimedPush => ({ id: 1, account_id: "a", category: "jobs", title_ar: "عنوان", body_ar: "نص", title_en: "Title", body_en: "Body",
    data: { type: "job", id: "j1" }, collapse_key: "j1", tokens, ...over });
  const ok = vi.fn(async () => ({ ok: true as const })); const dead = vi.fn(async () => ({ ok: false as const, dead: true, error: "unregistered" }));
  const later = vi.fn(async () => ({ ok: false as const, retry: true, error: "503" })); const bad = vi.fn(async () => ({ ok: false as const, error: "403" }));

  it("picks each device's language", async () => {
    const seen: string[] = []; const s = async (_t: string, p: Payload) => { seen.push(p.title); return { ok: true as const }; };
    await deliver([row([{ token: "a", platform: "android", lang: "ar" }, { token: "b", platform: "android", lang: "en" }])], { android: s });
    expect(seen.sort()).toEqual(["Title", "عنوان"]); expect(payloadFor(row([]), "en").data).toEqual({ type: "job", id: "j1" });
  });
  it("sent when any device took it, and dead tokens are still reported", async () => {
    const out = await deliver([row([{ token: "a", platform: "android", lang: "ar" }, { token: "b", platform: "ios", lang: "ar" }])], { android: ok, ios: dead });
    expect(out).toEqual([{ id: 1, status: "sent", error: null, dead: ["b"] }]);
  });
  it("no device → skipped; no credentials for the only platform → skipped, never an error", async () => {
    expect((await deliver([row([])], { android: ok }))[0]).toMatchObject({ status: "skipped", error: "no device" });
    expect((await deliver([row([{ token: "a", platform: "ios", lang: "ar" }])], { android: ok }))[0]).toMatchObject({ status: "skipped", error: "no credentials for ios" });
  });
  it("transient failure → pending (retried); permanent → failed; all dead → failed with the tokens listed", async () => {
    expect((await deliver([row([{ token: "a", platform: "android", lang: "ar" }])], { android: later }))[0].status).toBe("pending");
    expect((await deliver([row([{ token: "a", platform: "android", lang: "ar" }])], { android: bad }))[0]).toMatchObject({ status: "failed", error: "403" });
    expect((await deliver([row([{ token: "a", platform: "android", lang: "ar" }])], { android: dead }))[0]).toMatchObject({ status: "failed", dead: ["a"] });
  });
  it("handles a big batch in slices without losing a row", async () => {
    const rows = Array.from({ length: 95 }, (_, i) => row([{ token: "t" + i, platform: "android", lang: "ar" }], { id: i + 1 }));
    const out = await deliver(rows, { android: ok }, 20); expect(out.length).toBe(95); expect(out.every((o) => o.status === "sent")).toBe(true);
  });
});
