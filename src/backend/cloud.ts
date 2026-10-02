// =====================================================================
//  The cloud backend (Supabase) — every call the app and the admin console make when BACKEND === "cloud".
//  AppView keeps its optimistic local updates; each handler also calls the matching function here, and `loadAll`
//  replaces the seed data with the member's real data after sign-in. In demo mode nothing here runs.
//  Errors come back as Error objects whose message is ready to show (Arabic; the i18n layer translates it).
// =====================================================================
import { Capacitor } from "@capacitor/core";
import { AUTH_REDIRECT_NATIVE, SUPABASE_KEY, SUPABASE_URL } from "./config";
import { supabase } from "./client";
import {
  ballotOf, choiceOf, commentTree, jobOf, jobRow, notifOf, personaFromProfile, postOf, postRow, profilePatch, reviewOf, reviewRow,
  shareOf, shareRow, signupMeta, threadOf, yearsRange,
} from "./map";

const FEED_LIMIT = 60;

// Supabase / Postgres errors → a sentence a member can act on
export function friendly(e: any): Error {
  const m = String((e && (e.message || e.error_description || e.msg)) || e || "");
  const code = e && (e.code || e.status);
  const out =
    /Invalid login credentials/i.test(m) ? "البريد أو كلمة المرور غير صحيحة"
    : /Email not confirmed/i.test(m) ? "أكّد بريدك أولًا — أرسلنا لك رابط التأكيد"
    : /User already registered|already been registered/i.test(m) ? "هذا البريد مسجّل بالفعل — سجّل الدخول"
    : /Password should be|weak password/i.test(m) ? "كلمة المرور ضعيفة — اختر كلمة أقوى"
    : /rate limit|too many/i.test(m) || code === 429 ? "محاولات كثيرة — انتظر دقيقة ثم أعد المحاولة"
    : /room closed/i.test(m) ? "هذه الغرفة مغلقة مؤقتًا بقرار من الإدارة"
    : /share limit/i.test(m) ? "شاركت 3 رواتب خلال آخر 30 يومًا — يمكنك المشاركة مجددًا لاحقًا"
    : /cannot post|cannot message/i.test(m) ? "حسابك موقوف مؤقتًا — لا يمكنك النشر أو المراسلة الآن"
    : /does not accept messages/i.test(m) ? "هذا العضو أغلق باب الرسائل"
    : /Failed to fetch|NetworkError|network/i.test(m) ? "تعذّر الاتصال — تحقّق من الإنترنت وأعد المحاولة"
    : /staff only|admins only|42501|permission denied/i.test(m) || code === "42501" ? "ليست لديك صلاحية لهذا الإجراء"
    : "حدث خطأ غير متوقع — أعد المحاولة";
  const err: any = new Error(out); err.cause = e; return err;
}
const ok = <T>(r: { data: T; error: any }): T => { if (r.error) throw friendly(r.error); return r.data; };

// ---------------------------------------------------------------- auth
async function myProfile() {
  const db = await supabase();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;
  const p = ok(await db.from("profiles").select("*").eq("id", user.id).maybeSingle());
  return p ? personaFromProfile(p, user.email || "") : null;
}

export async function currentPersona() { try { return await myProfile(); } catch (e) { return null; } }

export async function signUp(email: string, password: string, persona: any) {
  const db = await supabase();
  const r = await db.auth.signUp({ email: email.trim().toLowerCase(), password,
    options: { data: signupMeta(persona), emailRedirectTo: Capacitor.isNativePlatform() ? AUTH_REDIRECT_NATIVE : location.origin + location.pathname } });
  if (r.error) throw friendly(r.error);
  // projects that require e-mail confirmation return a user without a session
  if (!r.data.session) return { persona: null, confirm: true };
  return { persona: await myProfile(), confirm: false };
}

export async function signIn(email: string, password: string) {
  const db = await supabase();
  ok(await db.auth.signInWithPassword({ email: email.trim().toLowerCase(), password }));
  const p = await myProfile(); if (!p) throw friendly("profile missing");
  return p;
}

export async function signOut() { const db = await supabase(); await db.auth.signOut(); }

export async function resetPassword(email: string) {
  const db = await supabase();
  ok(await db.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: (Capacitor.isNativePlatform() ? AUTH_REDIRECT_NATIVE : location.origin + location.pathname) + "?reset=1" }));
}

export async function deleteAccount() { const db = await supabase(); ok(await db.rpc("delete_my_account")); await db.auth.signOut(); }

// ---------------------------------------------------------------- Google, Apple, phone
// which sign-in methods the project has switched on (Dashboard → Authentication → Providers): a button shows only when it works
export async function authMethods() {
  try { const r = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_KEY } }); const s = await r.json(); const e = s.external || {};
    return { google: !!e.google, apple: !!e.apple, phone: !!e.phone };
  } catch (e) { return { google: false, apple: false, phone: false }; }
}

// Google / Apple: the browser goes to the provider and comes back here (web), or the system browser comes back to the app
// through app.engspace://auth-callback (native: Google refuses sign-in inside an embedded web view)
export async function signInWithProvider(provider: "google" | "apple") {
  const db = await supabase();
  if (!Capacitor.isNativePlatform()) { ok(await db.auth.signInWithOAuth({ provider, options: { redirectTo: location.origin + location.pathname } })); return; }
  const r = ok(await db.auth.signInWithOAuth({ provider, options: { redirectTo: AUTH_REDIRECT_NATIVE, skipBrowserRedirect: true } })) as any;
  const { Browser } = await import("@capacitor/browser"); await Browser.open({ url: r.url, presentationStyle: "popover" });
}

// Egyptian mobile numbers as typed (010…, 0020…, +20…) → E.164 (+201…)
export const e164 = (raw: string) => { const d = String(raw || "").replace(/[^\d+]/g, ""); if (d.startsWith("+")) return d; if (d.startsWith("00")) return "+" + d.slice(2); if (d.startsWith("0")) return "+20" + d.slice(1); return "+" + d; };
export async function sendPhoneCode(phone: string) { const db = await supabase(); ok(await db.auth.signInWithOtp({ phone: e164(phone) })); }
export async function verifyPhoneCode(phone: string, code: string) {
  const db = await supabase(); ok(await db.auth.verifyOtp({ phone: e164(phone), token: String(code).trim(), type: "sms" }));
  const p = await myProfile(); if (!p) throw friendly("profile missing"); return p;
}

// ---------------------------------------------------------------- confirming an e-mail from any device
// the 6-digit code in the confirmation e-mail, typed on the device that signed up
export async function verifyEmailCode(email: string, code: string) {
  const db = await supabase(); ok(await db.auth.verifyOtp({ email: email.trim().toLowerCase(), token: String(code).trim(), type: "signup" }));
  return myProfile();
}
// the device that signed up keeps trying quietly: once the link is opened anywhere, this succeeds and the member is in
export async function trySignIn(email: string, password: string) {
  const db = await supabase(); const r = await db.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (r.error) return null; return myProfile();
}
export async function resendConfirmation(email: string) { const db = await supabase(); ok(await db.auth.resend({ type: "signup", email: email.trim().toLowerCase() })); }

// A link opened on THIS page: ?token_hash=…&type=… (the e-mail templates in supabase/templates — works on any device),
// or ?code=… (PKCE — works only on the device that started it). Returns what happened, and always cleans the address so
// a reload never replays the link. { signedIn, reset, confirmedElsewhere, error }
export async function finishAuthLink(): Promise<any> {
  let q: URLSearchParams; try { q = new URLSearchParams(location.search); } catch (e) { return null; }
  const th = q.get("token_hash"), type = q.get("type"), code = q.get("code"), err = q.get("error_description"), reset = q.get("reset") === "1" || type === "recovery";
  if (!th && !code && !err) return null;
  const clean = () => { try { history.replaceState(null, "", location.pathname + (location.hash || "#app")); } catch (e) {} };
  const db = await supabase();
  try {
    if (th) { ok(await db.auth.verifyOtp({ token_hash: th, type: (type || "email") as any })); clean(); return { signedIn: true, reset }; }
    if (err) { clean(); return { error: err }; }
    // ?code= — the client already tried it on load (detectSessionInUrl); a session means it worked here
    const { data } = await db.auth.getSession(); clean();
    return data.session ? { signedIn: true, reset } : { confirmedElsewhere: !reset, error: reset ? "افتح رابط إعادة التعيين على الجهاز الذي طلبته منه" : null };
  } catch (e) { clean(); return { error: friendly(e).message }; }
}

// an auth link opened the native app (app.engspace://auth-callback?code=…[&reset=1]): finish the sign-in it carries
export async function handleAuthUrl(url: string) {
  const q = new URL(url.replace(/^app\.engspace:\/\//, "https://x/")).searchParams; const code = q.get("code");
  try { const { Browser } = await import("@capacitor/browser"); await Browser.close(); } catch (e) { /* not open */ }
  const db = await supabase(); const th = q.get("token_hash");
  if (th) { ok(await db.auth.verifyOtp({ token_hash: th, type: (q.get("type") || "email") as any })); return { reset: q.get("reset") === "1" || q.get("type") === "recovery" }; }
  if (!code) return null; ok(await db.auth.exchangeCodeForSession(code)); return { reset: q.get("reset") === "1" };
}
// on the web the client finishes the link itself (detectSessionInUrl); the reset link is marked with ?reset=1
export const resetLinkOpened = () => { try { return new URLSearchParams(location.search).get("reset") === "1"; } catch (e) { return false; } };

export async function setPassword(password: string) {
  const db = await supabase(); ok(await db.auth.updateUser({ password }));
  const p = await myProfile(); if (!p) throw friendly("profile missing"); return p;
}

export async function onAuthChange(cb: (signedIn: boolean) => void) {
  const db = await supabase(); const { data } = db.auth.onAuthStateChange((ev, s) => { if (ev === "SIGNED_OUT" || ev === "SIGNED_IN") cb(!!s); });
  return () => data.subscription.unsubscribe();
}

export async function saveProfile(persona: any) {
  const db = await supabase(); const { data: { user } } = await db.auth.getUser(); if (!user) throw friendly("not signed in");
  ok(await db.from("profiles").update(profilePatch(persona)).eq("id", user.id));
  return myProfile();
}

// ---------------------------------------------------------------- everything the member's app shows
export async function loadAll() {
  const db = await supabase(); const now = Date.now();
  const [posts, reacts, ballots, jobs, notifs, threads, reviews, cfg, state, reports, verif, contacts] = await Promise.all([
    db.from("posts").select("*").order("created_at", { ascending: false }).limit(FEED_LIMIT),
    db.from("reactions").select("kind,item_id,agree,disagree,useful"),
    db.from("ballots").select("post_id,choice,author_mode"),
    db.from("jobs").select("*").order("created_at", { ascending: false }).limit(100),
    db.from("notifications").select("*").order("created_at", { ascending: false }).limit(100),
    db.rpc("my_threads"),
    db.from("company_reviews").select("*").order("created_at", { ascending: false }).limit(200),
    db.from("app_config").select("value").eq("key", "mod").maybeSingle(),
    db.from("member_state").select("key,value"),
    db.from("reports").select("ref,kind,item_id,status,created_at"),
    db.from("verification_requests").select("ref,kinds,status,decision,created_at,decided_at").order("created_at", { ascending: false }).limit(1),
    db.from("job_contacts").select("job_id"),
  ]);
  for (const r of [posts, reacts, ballots, jobs, notifs, threads, reviews, cfg, state, reports, verif, contacts]) if (r.error) throw friendly(r.error);
  const postRows = posts.data || [];
  const comments = postRows.length ? ok(await db.from("comments").select("*").in("post_id", postRows.map((p: any) => p.id))) as any[] : [];

  const myReacts: Record<string, any> = {}; for (const r of reacts.data || []) myReacts[r.item_id] = r;
  const myBallot: Record<string, any> = {}; for (const b of ballots.data || []) myBallot[b.post_id] = b;
  const byPost: Record<string, any[]> = {}; for (const c of comments) (byPost[c.post_id] = byPost[c.post_id] || []).push(c);

  const outPosts = postRows.map((r: any) => postOf(r, commentTree(byPost[r.id] || [], myReacts, now), { reacts: myReacts[r.id], ballot: myBallot[r.id] ? myBallot[r.id].choice : null }, now));
  const votes: Record<string, any> = {}, voteAs: Record<string, any> = {};
  for (const r of postRows) { const b = myBallot[r.id]; if (b) { votes[r.id] = choiceOf(r.type, b.choice); voteAs[r.id] = b.author_mode; } }
  const reactsOut: Record<string, any> = {}; for (const [id, r] of Object.entries(myReacts)) reactsOut[id] = { agree: r.agree, disagree: r.disagree, useful: r.useful };
  const reviewsOut: Record<string, any[]> = {}; for (const r of reviews.data || []) (reviewsOut[r.company_id] = reviewsOut[r.company_id] || []).push(reviewOf(r, now));
  const st: Record<string, any> = {}; for (const r of state.data || []) st[r.key] = r.value;
  const contacted: Record<string, boolean> = { ...(st.contacted || {}) }; for (const c of contacts.data || []) contacted[c.job_id] = true;
  return {
    posts: outPosts, reacts: reactsOut, votes, voteAs,
    jobs: (jobs.data || []).map((j: any) => jobOf(j, now)),
    notifs: (notifs.data || []).map((n: any) => notifOf(n, now)),
    threads: (threads.data || []).map((t: any) => threadOf(t, null, now)),
    reviews: reviewsOut, config: cfg.data ? cfg.data.value : null,
    saved: st.saved || {}, follows: st.follows || {}, roomFollows: st.roomFollows || {}, hidden: st.hidden || {}, inspections: st.inspections || [], contacted,
    myReports: reports.data || [], verification: (verif.data || [])[0] || null,
  };
}

// ---------------------------------------------------------------- writing
async function upload(bucket: string, blob: Blob, ext = "jpg") {
  const db = await supabase(); const { data: { user } } = await db.auth.getUser(); if (!user) throw friendly("not signed in");
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
  ok(await db.storage.from(bucket).upload(path, blob, { contentType: blob.type || "image/jpeg", upsert: false }));
  return path;
}
const dataUrlBlob = async (src: string) => (await fetch(src)).blob();

export async function addPost(post: any, as: string) {
  const db = await supabase(); const row: any = postRow(post, as);
  if (post.image && post.image.src && post.image.src.startsWith("data:")) {
    const path = await upload("media", await dataUrlBlob(post.image.src));
    row.data.image = { ...post.image, src: db.storage.from("media").getPublicUrl(path).data.publicUrl, path };
  }
  const r: any = ok(await db.from("posts").insert(row).select("*").single());
  return postOf(r, []);
}

export async function addComment(postId: string, c: any, parentId: string | null, as: string) {
  const db = await supabase();
  const data = c.data || {};
  const r: any = ok(await db.from("comments").insert({ post_id: postId, parent_id: parentId || null, type: c.type || "text", text: c.text || "", data, author_mode: as === "public" ? "public" : "anon" }).select("*").single());
  return commentTree([r])[0];
}

export async function setBest(postId: string, commentId: string | null) { const db = await supabase(); ok(await db.rpc("mark_best", { post: postId, comment: commentId })); }

export async function react(kind: "posts" | "comments", id: string, state: any) {
  const db = await supabase(); const { data: { user } } = await db.auth.getUser(); if (!user) return;
  const s = { agree: !!(state && state.agree), disagree: !!(state && state.disagree), useful: !!(state && state.useful) };
  if (!s.agree && !s.disagree && !s.useful) ok(await db.from("reactions").delete().match({ account_id: user.id, kind, item_id: id }));
  else ok(await db.from("reactions").upsert({ account_id: user.id, kind, item_id: id, ...s }));
}

export async function vote(postId: string, type: string, choice: any, as: string) {
  const db = await supabase(); const { data: { user } } = await db.auth.getUser(); if (!user) return;
  ok(await db.from("ballots").upsert({ account_id: user.id, post_id: postId, choice: ballotOf(type, choice), author_mode: as === "public" ? "public" : "anon" }));
}

export async function contribute(share: any) { const db = await supabase(); ok(await db.from("salary_shares").insert(shareRow(share))); }
// The live explorer (supabase/migrations/…_salary_explorer.sql): one cell and its breakdowns, shaped by give-to-get
export async function salaryExplorer(disc: string, exp: string, gov: string | null, track: string | null = null) {
  const db = await supabase(); const [lo, hi] = yearsRange(exp);
  return ok(await db.rpc("salary_explorer", { p_disc: disc, p_track: track, p_years_min: lo, p_years_max: hi, p_gov: gov })) as any;
}
// the newest individual reports in a cell — the table's RLS returns rows only to engineers who shared (give-to-get)
export async function latestShares(disc: string, exp: string, gov: string | null, limit = 8) {
  const db = await supabase(); const [lo, hi] = yearsRange(exp);
  let q = db.from("salary_shares").select("id,title,years,salary,company,gov,track,author,created_at").eq("disc", disc).gte("years", lo).lte("years", hi).order("created_at", { ascending: false }).limit(limit);
  if (gov) q = q.eq("gov", gov);
  return ((ok(await q) as any[]) || []).map((r) => shareOf(r));
}
export async function salaryBands(disc: string, gov: string | null = null) { const db = await supabase(); return ok(await db.rpc("salary_bands", { p_disc: disc, p_gov: gov })) as any[]; }

export async function addReview(companyId: string, r: any) {
  const db = await supabase(); const row: any = ok(await db.from("company_reviews").insert(reviewRow(companyId, r)).select("*").single()); return reviewOf(row);
}

export async function postJob(j: any) { const db = await supabase(); const r: any = ok(await db.from("jobs").insert(jobRow(j)).select("*").single()); return jobOf(r); }
export async function deleteItem(table: "posts" | "comments" | "jobs" | "company_reviews" | "salary_shares", id: string) { const db = await supabase(); ok(await db.from(table).delete().eq("id", id)); }

export async function countJobView(jobId: string) { const db = await supabase(); await db.rpc("count_job_view", { p_job: jobId }); }
export async function markContacted(jobId: string) { const db = await supabase(); const { error } = await db.from("job_contacts").insert({ job_id: jobId }); if (error && error.code !== "23505") throw friendly(error); }

export async function saveState(key: string, value: any) {
  const db = await supabase(); const { data: { user } } = await db.auth.getUser(); if (!user) return;
  ok(await db.from("member_state").upsert({ account_id: user.id, key, value, updated_at: new Date().toISOString() }));
}

export async function markRead(id: string | null) {
  const db = await supabase(); const q = db.from("notifications").update({ read: true });
  ok(await (id ? q.eq("id", id) : q.eq("read", false)));
}

export async function report(kind: string, id: string, reason: string, note?: string) {
  const db = await supabase(); return ok(await db.rpc("file_report", { p_kind: kind, p_item: id, p_reason: reason, p_note: note || null })) as string;
}

// ---------------------------------------------------------------- messages
const refOf = (them: any, ctx: any) => {
  if (them && them.ref) { const [table, id] = String(them.ref).split(":"); return { kind: table, id }; }
  if (ctx && ctx.type === "job" && ctx.id) return { kind: "job", id: ctx.id };
  return null;
};
export async function startThread(them: any, ctx: any, meAs: string, rule: string) {
  const t = refOf(them, ctx); if (!t) throw friendly("no such author");
  const db = await supabase();
  return ok(await db.rpc("start_thread", { target_kind: t.kind, target_id: t.id, me_as: meAs === "public" ? "public" : "anon", ctx: { type: ctx.type || "post", id: ctx.id || null, label: ctx.label || "" }, rule })) as string;
}
export async function threads() { const db = await supabase(); return ((ok(await db.rpc("my_threads")) as any[]) || []).map((t) => threadOf(t)); }
export async function messages(threadId: string) {
  const db = await supabase(); const rows = (ok(await db.rpc("thread_messages", { t: threadId })) as any[]) || [];
  return threadOf({ id: threadId }, rows).messages;
}
export async function sendMessage(threadId: string, text: string) { const db = await supabase(); return ok(await db.rpc("send_message", { t: threadId, body: text })) as string; }
export async function readThread(threadId: string) { const db = await supabase(); ok(await db.rpc("mark_thread_read", { t: threadId })); }
export async function setThreadIdentity(threadId: string, as: string) { const db = await supabase(); ok(await db.rpc("set_thread_identity", { t: threadId, me_as: as === "public" ? "public" : "anon" })); }

// ---------------------------------------------------------------- realtime
// One private channel per member ("member:<auth id>", supabase/migrations/…_realtime.sql): a ping with a thread id when a
// message arrives (the text is then read through thread_messages), and the member's own new notifications.
// onEvent("message", { thread }) · onEvent("notification", row) · onStatus(true | false) when the socket connects / drops.
export async function subscribeLive(onEvent: (event: string, payload: any) => void, onStatus: (live: boolean) => void = () => {}) {
  const db = await supabase(); const { data: { session } } = await db.auth.getSession(); if (!session) return () => {};
  await db.realtime.setAuth(session.access_token);
  const ch = db.channel(`member:${session.user.id}`, { config: { private: true } })
    .on("broadcast", { event: "message" }, (m: any) => onEvent("message", m.payload))
    .on("broadcast", { event: "notification" }, (m: any) => onEvent("notification", m.payload))
    .subscribe((status: string) => onStatus(status === "SUBSCRIBED"));
  return () => { db.removeChannel(ch); };
}

// ---------------------------------------------------------------- verification
// docs: [{ kind: "card" | "cert" | "letter", src: data URL (already re-encoded on this device: JPEG, no EXIF, ≤ 1600 px) }]
export async function submitVerification(docs: { kind: string; src: string }[]) {
  const paths: string[] = [];
  try {
    for (const d of docs) paths.push(await upload("verification", await dataUrlBlob(d.src)));
    const db = await supabase();
    return ok(await db.rpc("submit_verification", { p_kinds: docs.map((d) => d.kind), p_paths: paths })) as string;
  } catch (e) { await removeDocs(paths); throw e; }
}
async function removeDocs(paths: string[]) { if (!paths || !paths.length) return; try { const db = await supabase(); await db.storage.from("verification").remove(paths); } catch (e) { /* the hourly sweep deletes them */ } }
export async function withdrawVerification() { const db = await supabase(); const paths = ok(await db.rpc("withdraw_verification")) as string[]; await removeDocs(paths); }

// ---------------------------------------------------------------- admin console (staff; every function re-checks the role on the server)
export const admin = {
  async cases(status = "open") { const db = await supabase(); return (ok(await db.rpc("mod_cases", { p_status: status })) as any[]) || []; },
  async decide(kind: string, id: string, d: { accept: boolean; hide?: boolean; warn?: string | null; suspendDays?: number | null; note?: string }) {
    const db = await supabase(); ok(await db.rpc("decide_case", { p_kind: kind, p_item: id, p_accept: d.accept, p_hide: d.hide !== false, p_warn: d.warn || null, p_suspend_days: d.suspendDays ?? null, p_note: d.note || null }));
  },
  async reopen(kind: string, id: string) { const db = await supabase(); ok(await db.rpc("reopen_case", { p_kind: kind, p_item: id })); },
  async accounts(search: string | null = null) { const db = await supabase(); return (ok(await db.rpc("admin_accounts", { p_search: search })) as any[]) || []; },
  async setStaff(ref: string, staff: "member" | "moderator" | "admin") { const db = await supabase(); ok(await db.rpc("admin_set_staff", { p_ref: ref, p_staff: staff })); },
  async setAccount(ref: string, patch: { role?: string; verified?: boolean; suspendDays?: number | null; lift?: boolean }) {
    const db = await supabase(); ok(await db.rpc("admin_set_account", { p_ref: ref, p_role: patch.role ?? null, p_verified: patch.verified ?? null, p_suspend_days: patch.suspendDays ?? null, p_lift: !!patch.lift }));
  },
  async warn(ref: string, text: string) { const db = await supabase(); ok(await db.rpc("admin_warn", { p_ref: ref, p_text: text })); },
  async setHidden(kind: string, id: string, hidden: boolean) { const db = await supabase(); ok(await db.rpc("admin_set_hidden", { p_kind: kind, p_item: id, p_hidden: hidden })); },
  async config() { const db = await supabase(); const r = ok(await db.from("app_config").select("value").eq("key", "mod").maybeSingle()) as any; return r ? r.value : null; },
  async setConfig(patch: any) { const db = await supabase(); return ok(await db.rpc("admin_set_config", { p_patch: patch })); },
  async analytics(days = 30) { const db = await supabase(); return ok(await db.rpc("admin_analytics", { p_days: days })) as any; },
  async audit(limit = 200) { const db = await supabase(); return (ok(await db.from("audit_log").select("*").order("at", { ascending: false }).limit(limit)) as any[]) || []; },
  async verifQueue() { const db = await supabase(); return (ok(await db.from("verification_requests").select("*").order("created_at", { ascending: true }).limit(200)) as any[]) || []; },
  // a document is shown through a link that works for 5 minutes, then expires
  async docUrl(path: string) { const db = await supabase(); const r = ok(await db.storage.from("verification").createSignedUrl(path, 300)) as any; return r.signedUrl as string; },
  async decideVerification(ref: string, approve: boolean, o: { reason?: string; division?: string; kind?: string } = {}) {
    const db = await supabase();
    const paths = ok(await db.rpc("decide_verification", { p_ref: ref, p_approve: approve, p_reason: o.reason || null, p_division: o.division || null, p_kind: o.kind || null })) as string[];
    await removeDocs(paths);
  },
};
