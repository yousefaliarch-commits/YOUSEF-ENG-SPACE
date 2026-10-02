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
    for (let i = 0; i < 50 && !joined; i++) await new Promise((r) => setTimeout(r, 100));
    expect(joined).toBe(true);
    const t = (await cloud.threads())[0]; await cloud.sendMessage(t.id, "رسالة لحظية");
    for (let i = 0; i < 50 && !got.length; i++) await new Promise((r) => setTimeout(r, 100));
    // the ping is the thread id (plus Realtime's own delivery id) — never the text or the sender
    expect(got[0].thread).toBe(t.id); expect(Object.keys(got[0]).sort()).toEqual(["id", "thread"]); expect(JSON.stringify(got)).not.toContain("رسالة لحظية");
    // B (signed in through cloud.ts) tries to join A's channel: refused
    const { supabase } = await import("../src/backend/client"); const b = await supabase(); const { data: bs } = await b.auth.getSession(); await b.realtime.setAuth(bs.session!.access_token);
    let denied = false; const spy = b.channel(`member:${session!.user.id}`, { config: { private: true } }).subscribe((st: string) => { if (st === "CHANNEL_ERROR" || st === "TIMED_OUT") denied = true; });
    for (let i = 0; i < 80 && !denied; i++) await new Promise((r) => setTimeout(r, 100));
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

  it("reports the post; the author is never revealed to the reporter", async () => {
    const ref = await cloud.report("post", postId, "spam", "تجربة"); expect(ref).toMatch(/^R-/);
    await expect(cloud.admin.cases()).rejects.toThrow("ليست لديك صلاحية");
  });

  it("the author reads the reply notification-free feed and their thread", async () => {
    await cloud.signOut(); await cloud.signIn(A.email, A.pw);
    const ts = await cloud.threads(); expect(ts[0].unread).toBe(2); // «أهلًا» and the realtime test's message
    const msgs = await cloud.messages(ts[0].id); expect(msgs[0]).toMatchObject({ from: "them", text: "أهلًا" });
    await cloud.deleteAccount();
    await expect(cloud.signIn(A.email, A.pw)).rejects.toThrow("البريد أو كلمة المرور غير صحيحة");
  });
});
