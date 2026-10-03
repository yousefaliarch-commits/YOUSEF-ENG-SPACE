// End-to-end through src/backend/cloud.ts against a running local Supabase (npx supabase start), as real members.
// Skipped unless the run has VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY: `npm run test:cloud` sets them from `supabase status`.
import { beforeAll, describe, expect, it } from "vitest";

const run = (import.meta as any).env.VITE_SUPABASE_URL && process.env.ENGSPACE_CLOUD_TEST === "1" ? describe : describe.skip;
// a 1×1 JPEG
const JPEG = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

run("cloud backend (local Supabase)", () => {
  let cloud: any; const tag = Date.now().toString(36);
  const A = { email: `a-${tag}@example.com`, pw: "Str0ng!pass-" + tag }, B = { email: `b-${tag}@example.com`, pw: "Str0ng!pass-" + tag };
  const persona = (name: string, extra: any = {}) => ({ name, gender: "male", age: 30, gradYear: 2018, role: "engineer", disc: "civil", track: "tech", pos: "mid", gov: "cairo", city: "nasr", identity: "anon", ...extra });
  let postId = "", anonA = "";

  beforeAll(async () => {
    cloud = await import("../src/backend/cloud");
  });

  it("signs up two members; the profile comes from the form", async () => {
    const b = await cloud.signUp(B.email, B.pw, persona("منى خالد", { gender: "female" }));
    expect(b.persona.name).toBe("منى خالد");
    await cloud.signOut();
    const a = await cloud.signUp(A.email, A.pw, persona("أحمد سامي"));
    expect(a.confirm).toBe(false); expect(a.persona.anon).toMatch(/^[0-9a-f]{6}$/); expect(a.persona.staff).toBe("member");
    anonA = a.persona.anon;
  });

  it("posts anonymously with an image in Storage, not inline", async () => {
    const p = await cloud.addPost({ room: "tech", type: "question", body: "سؤال تجريبي عن المرتبات", image: { src: JPEG, w: 1, h: 1, alt: "" } }, "anon");
    postId = p.id;
    expect(p.anon).toBe(anonA); expect(p.name).toBeUndefined(); expect(p.ref).toBe(`posts:${p.id}`);
    expect(p.role).toContain("مهندس"); expect(p.image.src).toMatch(/\/storage\/v1\/object\/public\/media\//);
    const res = await fetch(p.image.src); expect(res.status).toBe(200);
  });

  it("another member sees it, replies, reacts; counts exclude their own reaction", async () => {
    await cloud.signOut(); await cloud.signIn(B.email, B.pw);
    await cloud.addComment(postId, { text: "رد تجريبي" }, null, "public");
    await cloud.react("posts", postId, { agree: true, useful: true });
    const all = await cloud.loadAll();
    const p = all.posts.find((x: any) => x.id === postId);
    expect(p.comments[0].name).toBe("منى خالد");
    expect(p.reactions).toEqual({ agree: 0, disagree: 0, useful: 0 }); expect(all.reacts[postId]).toEqual({ agree: true, disagree: false, useful: true });
  });

  it("messages the anonymous author without learning who they are", async () => {
    const all = await cloud.loadAll(); const p = all.posts.find((x: any) => x.id === postId);
    const t = await cloud.startThread({ ref: p.ref }, { type: "post", id: postId, label: "من نقاش" }, "anon", "زميل فتح باب الرسائل");
    await cloud.sendMessage(t, "أهلًا");
    const ts = await cloud.threads(); expect(ts[0].with.anon).toBe(anonA); expect(JSON.stringify(ts)).not.toContain(A.email);
  });

  it("realtime: the recipient hears about a new message at once, without its text; nobody else can listen", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const env = (import.meta as any).env; const opts = { auth: { persistSession: false, autoRefreshToken: false } };
    const a = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, opts);
    const { data: { session } } = await a.auth.signInWithPassword({ email: A.email, password: A.pw }); await a.realtime.setAuth(session!.access_token);
    const got: any[] = []; let joined = false;
    const ch = a.channel(`member:${session!.user.id}`, { config: { private: true } }).on("broadcast", { event: "message" }, (m: any) => got.push(m.payload))
      .subscribe((st: string) => { if (st === "SUBSCRIBED") joined = true; });
    for (let i = 0; i < 200 && !joined; i++) await new Promise((r) => setTimeout(r, 100));
    expect(joined).toBe(true);
    const t = (await cloud.threads())[0]; await cloud.sendMessage(t.id, "رسالة لحظية");
    for (let i = 0; i < 200 && !got.length; i++) await new Promise((r) => setTimeout(r, 100));
    // the ping is the thread id (plus Realtime's own delivery id) — never the text or the sender
    expect(got[0].thread).toBe(t.id); expect(Object.keys(got[0]).sort()).toEqual(["id", "thread"]); expect(JSON.stringify(got)).not.toContain("رسالة لحظية");
    // B (signed in through cloud.ts) tries to join A's channel: refused
    const { supabase } = await import("../src/backend/client"); const b = await supabase(); const { data: bs } = await b.auth.getSession(); await b.realtime.setAuth(bs.session!.access_token);
    let denied = false; const spy = b.channel(`member:${session!.user.id}`, { config: { private: true } }).subscribe((st: string) => { if (st === "CHANNEL_ERROR" || st === "TIMED_OUT") denied = true; });
    for (let i = 0; i < 200 && !denied; i++) await new Promise((r) => setTimeout(r, 100));
    expect(denied).toBe(true);
    await a.removeChannel(ch); await b.removeChannel(spy);
  });

  it("cannot upload into someone else's verification folder", async () => {
    const { supabase } = await import("../src/backend/client"); const db = await supabase();
    const blob = await (await fetch(JPEG)).blob();
    const r = await db.storage.from("verification").upload(`00000000-0000-0000-0000-000000000000/x.jpg`, blob, { contentType: "image/jpeg" });
    expect(r.error).toBeTruthy();
  });

  it("submits verification documents; withdrawing deletes them", async () => {
    const ref = await cloud.submitVerification([{ kind: "card", src: JPEG }]); expect(ref).toMatch(/^V-/);
    const { supabase } = await import("../src/backend/client"); const db = await supabase();
    const { data: { user } } = await db.auth.getUser();
    expect(((await db.storage.from("verification").list(user!.id)).data || []).length).toBe(1);
    await cloud.withdrawVerification();
    expect(((await db.storage.from("verification").list(user!.id)).data || []).length).toBe(0);
  });

  it("give-to-get: the explorer shows a teaser until the member shares", async () => {
    const before = await cloud.salaryExplorer("civil", "3-5", "cairo"); expect(["teaser", "full"]).toContain(before.access);
    expect(before).not.toHaveProperty("p25");
    await cloud.contribute({ disc: "civil", exp: "3-5", salary: 18000, gov: "cairo", track: "tech", as: "anon" });
    expect((await cloud.salaryExplorer("civil", "3-5", "cairo")).access).toBe("full");
    expect((await cloud.latestShares("civil", "3-5", "cairo")).some((r: any) => r.salary === 18000)).toBe(true);
  });

  it("a double tap is one report: the repeat is accepted as «already recorded», and the status says unlocked", async () => {
    expect(await cloud.salaryUnlocked()).toBe(true);
    const share = { disc: "civil", exp: "3-5", salary: 20000 + (Date.now() % 997), gov: "cairo", track: "tech", as: "anon" };
    await cloud.contribute(share);
    await expect(cloud.contribute(share)).resolves.toBeUndefined();
    expect((await cloud.latestShares("civil", "3-5", "cairo")).filter((r: any) => r.salary === share.salary).length).toBe(1);
  });


  it("push: a device is registered, never read back; a notice is queued, claimed by the service role, delivered, finished", async () => {
    const service = (import.meta as any).env.ENGSPACE_SERVICE_KEY || process.env.ENGSPACE_SERVICE_KEY; if (!service) return;   // only with `npm run test:cloud`
    const { createClient } = await import("@supabase/supabase-js"); const { deliver } = await import("../supabase/functions/_shared/push");
    const dev = "fcm-integration-" + tag + "-0000000000000000"; await cloud.registerPushToken(dev, "android", "ar");
    expect((await cloud.myPushDevices()).length).toBeGreaterThan(0); expect(JSON.stringify(await cloud.myPushDevices())).not.toContain(dev);
    await cloud.setNotificationPrefs({ salary: false }); expect((await cloud.myNotificationPrefs()).salary).toBe(false); await cloud.setNotificationPrefs({ salary: true });
    await cloud.sendTestPush();
    const svc = createClient((import.meta as any).env.VITE_SUPABASE_URL, service, { auth: { persistSession: false } });
    const { data: rows, error } = await svc.rpc("push_claim", { p_limit: 100 }); expect(error).toBeNull();
    const mine = (rows as any[]).filter((r) => r.tokens.some((t: any) => t.token === dev)); expect(mine.length).toBe(1);
    expect(mine[0]).toMatchObject({ category: "system", title_ar: "إشعار تجريبي", title_en: "Test notification" });
    const seen: any[] = []; const out = await deliver(mine, { android: async (t, p) => { seen.push([t, p]); return { ok: true }; } });
    expect(seen[0][1]).toMatchObject({ title: "إشعار تجريبي", category: "system", data: { type: "notifications" } });
    expect((await svc.rpc("push_finish", { p_results: out })).error).toBeNull();
    expect((await svc.rpc("push_claim", { p_limit: 100 })).data.filter((r: any) => r.tokens.some((t: any) => t.token === dev))).toEqual([]);
    const anon = createClient((import.meta as any).env.VITE_SUPABASE_URL, (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
    expect((await anon.rpc("push_claim", { p_limit: 1 })).error).not.toBeNull();   // the queue is not reachable from a client
    await cloud.unregisterPushToken(dev);
  });

  it("company scorecard: factor ratings stay private; under 5 reviewers only counts come back", async () => {
    const co = "cloudtest-" + tag;
    await cloud.addReview(co, { stars: 4, text: "تقييم تجريبي للشركة من الاختبار", as: "anon", scores: { pay: 3, ontime: 5 } });
    const sc = await cloud.companyScorecard(co); expect(sc.n).toBe(1); expect(sc.factors.pay).toEqual({ n: 1 }); expect(sc.factors.site).toEqual({ n: 0 });
    const { supabase } = await import("../src/backend/client"); const db = await supabase();
    expect((await db.from("company_ratings").select("*")).error).toBeTruthy(); // nobody reads individual ratings, not even their own
  });

  it("raises: a report carries a percentage and a month; the market rate needs 5; inflation is readable", async () => {
    const d = new Date(); d.setMonth(d.getMonth() - 1); const last = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    await cloud.reportRaise({ disc: "civil", track: "tech", pos: "mid", pct: 17.5, kind: "annual", month: last });
    const m = await cloud.marketRaises("civil", "tech"); expect(m.access).toBe("full"); expect(m.n).toBeGreaterThanOrEqual(1);
    if (m.n < 5) expect(m).not.toHaveProperty("p50");
    const s = await cloud.inflationSeries(); expect(s[0]).toEqual(["2022-01", 7.3]); expect(s.length).toBeGreaterThanOrEqual(45);
  });

  it("support tickets: a member opens one with an image, reads it back; the member directory is refused to non-admins", async () => {
    const id = await cloud.openTicket({ category: "technical", subject: "تجربة تذكرة", body: "رسالة اختبار للتذكرة من الاختبار الآلي", image: new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: "image/jpeg" }) });
    const mine = await cloud.myTickets(); expect(mine.find((t: any) => t.id === id).status).toBe("open");
    const msgs = await cloud.ticketMessages(id); expect(msgs[0].attachment).toMatch(/^[0-9a-f-]{36}\/.+\.jpg$/); expect(await cloud.supportFileUrl(msgs[0].attachment)).toMatch(/^http/);
    await cloud.closeTicket(id); expect((await cloud.myTickets()).find((t: any) => t.id === id).status).toBe("closed");
    await expect(cloud.admin.directory()).rejects.toThrow("ليست لديك صلاحية");
  });

  it("reports the post; the author is never revealed to the reporter", async () => {
    const ref = await cloud.report("post", postId, "spam", "تجربة"); expect(ref).toMatch(/^R-/);
    await expect(cloud.admin.cases()).rejects.toThrow("ليست لديك صلاحية");
  });

  it("live web updates: the publish script puts a verifiable bundle + manifest in the public bucket; clients cannot write there", async () => {
    const env = (import.meta as any).env; const service = env.ENGSPACE_SERVICE_KEY || process.env.ENGSPACE_SERVICE_KEY; if (!service) return;
    const { execFileSync } = await import("node:child_process"); const { mkdtempSync, writeFileSync, mkdirSync } = await import("node:fs"); const { tmpdir } = await import("node:os"); const { join } = await import("node:path"); const { createHash } = await import("node:crypto");
    const { parseManifest, decide } = await import("../src/native/updater-core");
    const dist = mkdtempSync(join(tmpdir(), "dist-")); writeFileSync(join(dist, "index.html"), "<html><body>EngSpace test bundle</body></html>"); mkdirSync(join(dist, "assets")); writeFileSync(join(dist, "assets", "a.js"), "console.log(1)");
    const ts = String(Math.floor(Date.now() / 1000));
    const out = JSON.parse(execFileSync("node", ["scripts/ota/publish.mjs"], { env: { ...process.env, SUPABASE_URL: env.VITE_SUPABASE_URL, SERVICE_KEY: service, CHANNEL: "citest", BUILD_TS: ts, DIST: dist, NOTES: "اختبار" }, encoding: "utf8" }).trim());
    // what a phone sees: the public manifest (no key), validated by the app's own parser, and a bundle that matches its hash
    const m = parseManifest(await (await fetch(`${env.VITE_SUPABASE_URL}/storage/v1/object/public/app-updates/citest/manifest.json`)).json(), env.VITE_SUPABASE_URL);
    expect(m).toMatchObject({ version: out.version, build: Number(ts), nativeLine: 1, notes: "اختبار" });
    const zip = Buffer.from(await (await fetch(m!.url)).arrayBuffer()); expect(createHash("sha256").update(zip).digest("hex")).toBe(m!.sha256);
    expect(decide(m!, { runningBuild: Number(ts) - 10, nativeVersion: "1.77", badVersions: [] })).toEqual({ go: true });
    // no client role may write to the bucket
    const anon = await fetch(`${env.VITE_SUPABASE_URL}/storage/v1/object/app-updates/citest/evil.zip`, { method: "POST", headers: { apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY, authorization: `Bearer ${env.VITE_SUPABASE_PUBLISHABLE_KEY}`, "content-type": "application/zip" }, body: "x" });
    expect(anon.ok).toBe(false);
  });

  it("author controls: only the author edits (and the count is the server's), edits show to others, delete takes everything with it", async () => {
    await cloud.signOut(); await cloud.signIn(A.email, A.pw);
    let mine = (await cloud.loadAll()).posts.find((x: any) => x.id === postId);
    expect(mine.mine).toBe(true); expect(mine.edits).toBe(0); expect(mine.editedAt).toBeNull();
    const e1 = await cloud.editPost(postId, "سؤال تجريبي بعد التعديل"); expect(e1).toMatchObject({ body: "سؤال تجريبي بعد التعديل", edits: 1 }); expect(e1.editedAt).toBeGreaterThan(0);
    expect((await cloud.editPost(postId, " سؤال تجريبي بعد التعديل ")).edits).toBe(1);   // same text: not an edit
    expect((await cloud.editPost(postId, "سؤال تجريبي بعد التعديل الثاني")).edits).toBe(2);
    await expect(cloud.editPost(postId, "   ")).rejects.toThrow("نص المنشور");
    // another member: sees the edit and the count, is not the owner, cannot edit or delete
    await cloud.signOut(); await cloud.signIn(B.email, B.pw);
    const seen = (await cloud.loadAll()).posts.find((x: any) => x.id === postId);
    expect(seen.body).toBe("سؤال تجريبي بعد التعديل الثاني"); expect(seen.edits).toBe(2); expect(seen.mine).toBeUndefined();
    await expect(cloud.editPost(postId, "سطو")).rejects.toThrow("ليس منشورك"); await expect(cloud.deletePost(postId)).rejects.toThrow("ليس منشورك");
    // the author deletes it: post, replies and the image go
    await cloud.signOut(); await cloud.signIn(A.email, A.pw);
    const img = (await cloud.loadAll()).posts.find((x: any) => x.id === postId).image; expect(img).toBeTruthy();
    await cloud.deletePost(postId);
    const after = await cloud.loadAll(); expect(after.posts.find((x: any) => x.id === postId)).toBeUndefined();
    expect((await fetch(img.src)).headers.get("content-type") || "").not.toMatch(/^image\//);
  });

  it("the author reads the reply notification-free feed and their thread", async () => {
    await cloud.signOut(); await cloud.signIn(A.email, A.pw);
    const ts = await cloud.threads(); expect(ts[0].unread).toBe(2); // «أهلًا» and the realtime test's message
    const msgs = await cloud.messages(ts[0].id); expect(msgs[0]).toMatchObject({ from: "them", text: "أهلًا" });
    await cloud.deleteAccount();
    await expect(cloud.signIn(A.email, A.pw)).rejects.toThrow("البريد أو كلمة المرور غير صحيحة");
  });
});
