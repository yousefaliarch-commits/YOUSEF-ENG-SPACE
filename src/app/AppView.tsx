import { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import {
  CircleCheck, LockKeyhole, ShieldAlert
} from "lucide-react";
import { ROOMS } from "../data/companies";
import { TABS } from "../data/geo";
import { JOBS, NOTIFS0, POSTS0, R0 } from "../data/seed";
import { TOOLS } from "../data/tools";
import { accIdOf, authorAccId, authorKey, authorOf, cleanName, hasSession, loadAccount, memberAccId, normalizeSeedPosts, sameAuthor, saveAccount, setSession } from "../domain/identity";
import { AUDIT0, MOD0, MOD_CONFIG0, REPORT_KINDS, actGate, ckey, fileReport, jobStats0, seedReports, standingOf, threadsFor0, threadsKind } from "../domain/moderation";
import { SUPERVISOR_DENY, SUPERVISOR_NOTIFS, blockedFor, dmRule, isCompanyRole, maskMoney, moneyAccess, repLevel, roleTitle, tabsFor } from "../domain/taxonomy";
import { screenLanguage } from "../domain/text-guard";
import { AuthScreen, Registration, Welcome } from "../features/auth/auth";
import { GuideScreen, LanguageScreen, SettingsScreen, Tour, tourSeen } from "../features/settings/settings";
import { ComposeSheet, ContributeSheet, LogoSheet, MethodologySheet, PrivacyBody, ReviewSheet, TOOL_VIEWS, UserSheet, VerifySheet } from "../features/sheets/sheets";
import { ChatScreen, CompanyScreen, JobScreen, PermissionsScreen, PostJobScreen, PostScreen, ProfileScreen, RoomScreen, RoomsScreen } from "../features/stack/stack";
import { CommunityScreen, HomeScreen, InboxScreen, JobsScreen, MarketScreen, ToolsScreen } from "../features/tabs/tabs";
import { dropOwnRequest, newVerifyRequest, purgeRequest, saveOwnRequest, verifs0, verifySummary } from "../features/verify/verify";
import { L2, say, tr } from "../i18n/i18n";
import { DEMO_PERSONA, estimateFor, loadPersona, reachFor, savePersona } from "../lib/helpers";
import { ImageViewer } from "../lib/media";
import { applyReaction } from "../lib/posts";
import { liveState, reducedMotion, storeFor, useStore } from "../lib/runtime";
import { AppHeader, Empty, Sheet, TabBar } from "../ui/chrome";
import { ReportSheet } from "../ui/moderation";
import { NotificationsScreen } from "../ui/notifications";
import { ArchMark } from "../ui/primitives";
import { fmt } from "../ui/theme";
import { ScreenLoading } from "./ScreenLoading";
import { isCloud } from "../backend/config";
import { profilePatch } from "../backend/map";
import { NATIVE, setBackHandler } from "../native/native";
import * as cloud from "../backend/cloud";

// The CV review (parser, engineering knowledge base, audit, report) is the largest feature; it loads on first open, and
// pdf.js / mammoth only when a file is picked
const CVReviewScreen = lazy(() => import("../features/cv/CVReviewScreen").then((m) => ({ default: m.CVReviewScreen })));

// =====================================================================
//  App view — state, routing, gestures
// =====================================================================
export const STACK_TYPES = ["post", "company", "job", "room", "chat"];

export const PLAIN_TYPES = ["notifications", "profile", "rooms", "permissions", "postjob", "cvreview", "settings", "guide"];

export function parseHash() {
  const parts = (location.hash || "").replace(/^#/, "").split("/").filter(Boolean);
  const view = parts[0] === "admin" ? "admin" : "app"; let tab = "home", stack: any = [], market = "salaries";
  if (TABS.some((t) => t.id === parts[1])) { tab = parts[1]; if (tab === "market" && ["salaries", "companies"].includes(parts[2])) market = parts[2]; if (tab === "market" && parts[2] === "tools") tab = "tools"; }
  else if (STACK_TYPES.includes(parts[1]) && parts[2]) stack = [{ type: parts[1], id: parts[2] }];
  else if (PLAIN_TYPES.includes(parts[1])) stack = [{ type: parts[1] }];
  else if (parts[1] === "companies") { tab = "market"; market = "companies"; } else if (parts[1] === "salaries") { tab = "market"; market = "salaries"; }
  return { view, tab, stack, market, skipOnboarding: parts[1] != null, section: view === "admin" ? parts[1] || null : null };
}

export const isWorker = (p?: any) => !isCompanyRole(p.role);


// `store`: external state store (see liveState) — the device previews pass a shared one so both phones mirror each other, and
// every store outlives hot code updates. `embed`: { platform, hash } when rendered inside a device mockup (no outer frame, no caption).
export function AppView({ onAdmin = null, init, theme, setTheme, mode, lang = "ar", setLang = () => {}, langChosen = true, store: storeProp = null, embed = null }: any) {
  const store = storeProp || storeFor("app"); const S = (key?: any, initial?: any) => useStore(store, key, initial);
  // cloud: real data replaces the seed after sign-in (see hydrate); the demo keeps the seed and everything in this browser
  const CLOUD = isCloud() && !embed; const seed = (v?: any, empty?: any) => (CLOUD ? empty : v);
  // The signed-in member: a stored session → its account profile. Deep links and the device previews fall back to a demo member,
  // unless this page has signed out or deleted the account (then the auth screens show).
  const [persona, setPersona] = S("persona", () => { const saved = hasSession() && (CLOUD || loadAccount()) ? loadPersona() : null; return saved || (init.skipOnboarding && !CLOUD && !liveState().noDemo ? DEMO_PERSONA : null); });
  // Signed out, the app opens on the language screen; «Continue» leads to the e-mail screen (sign-in when this device has an account)
  const authNext = () => (CLOUD || loadAccount() ? "signin" : "signup");
  const [authView, setAuthView] = S("authView", "lang"); const [welcome, setWelcome] = S("welcome", false);
  const [editing, setEditing] = S("editing", false);
  const [tab, setTabRaw] = S("tab", init.tab); const [stack, setStack] = S("stack", init.stack); const [dir, setDir] = S("dir", "tab"); const [market, setMarket] = S("market", init.market);
  const [sheet, setSheet] = S("sheet", null); const [msg, setMsg] = S("msg", "");
  const [contributed, setContributed] = S("contributed", false); const [salaryRev, setSalaryRev] = S("salaryRev", 0); const [pts, setPts] = S("pts", 0);
  const [saved, setSaved] = S("saved", {}); const [reacts, setReacts] = S("reacts", {}); const [votes, setVotes] = S("votes", {}); const [follows, setFollows] = S("follows", () => seed({ dar: true }, {})); const [roomFollows, setRoomFollows] = S("roomFollows", () => seed({ tech: true, nego: true, grads: true }, {}));
  const [posts, setPosts] = S("posts", () => seed(normalizeSeedPosts(POSTS0), [])); const [voteAs, setVoteAs] = S("voteAs", {}); const [shares, setShares] = S("shares", []); const [jobs, setJobs] = S("jobs", () => seed(JOBS, [])); const [logos, setLogos] = S("logos", {}); const [notifs, setNotifs] = S("notifs", () => seed(NOTIFS0, [])); const [reviews, setReviews] = S("reviews", {}); const [hidden, setHidden] = S("hidden", {});
  const profileOf = (p?: any) => ({ contributions: 0, notify: true, dm: true, hide: true, rotate: true, ...(p || DEMO_PERSONA) });
  const [profile, setProfileRaw] = S("profile", () => profileOf(persona));
  const threadsFor = (p?: any) => (CLOUD ? [] : threadsFor0(p));
  const [threads, setThreads] = S("threads", () => threadsFor(profile));
  // off-platform applications: the app only remembers which ads the member opened contact details for, and per-ad reach counters for the employer
  const [contacted, setContacted] = S("contacted", {}); const [jobStats, setJobStats] = S("jobStats", () => seed(jobStats0, {}));
  // moderation: reports and decisions are shared with the admin console through this same store
  const [reports, setReports] = S("reports", () => seed(seedReports(), [])); const [mod, setMod] = S("mod", () => seed(MOD0(), { users: {}, content: {} })); const [config, setConfig] = S("config", () => ({ ...MOD_CONFIG0 }));
  // verification: the member's own request and the admin console's review queue are the same list
  const [verifs, setVerifs] = S("verifs", () => seed(verifs0(), []));
  // role scope: which tabs, screens and content this member may see, and how much of money
  const access = moneyAccess(profile); const blocked = blockedFor(profile); const tabs = tabsFor(profile); const curTab = tabs.some((t) => t.id === tab) ? tab : tabs[0].id;
  const deny = () => setMsg(SUPERVISOR_DENY);
  const visiblePosts = blocked.posts.length || blocked.rooms.length ? posts.filter((x) => !blocked.posts.includes(x.type) && !blocked.rooms.includes(x.room)) : posts;
  const visibleNotifs = access === "none" ? notifs.filter((n) => SUPERVISOR_NOTIFS.includes(n.kind)) : notifs;
  const myAcc = memberAccId(profile); const standing = standingOf(mod, myAcc); const gate = actGate(standing, config); const isGone = (k?: any) => !!(mod.content[k] && mod.content[k].hidden);
  // Screen changes run as View Transitions in the standalone app (directional slides for push / pop, a lift for tabs); the device
  // previews and browsers without the API keep the class-based entrances. Reduced motion turns both off.
  const vtOK = !embed && typeof document !== "undefined" && typeof document.startViewTransition === "function" && !reducedMotion();
  const nav = (kind?: any, fn?: any) => {
    const root = document.documentElement; const L = liveState(); if (!vtOK || L.vtBusy) { fn(); return; }
    L.vtBusy = true; root.dataset.vt = kind; let t = null;
    const done = () => { L.vtBusy = false; if (root.dataset.vt === kind) delete root.dataset.vt; };
    try { t = document.startViewTransition(() => { ReactDOM.flushSync(fn); }); } catch (e) { done(); fn(); return; }
    [t.ready, t.updateCallbackDone].forEach((p) => p && p.catch(() => {})); t.finished.then(done, done);
  };
  const [viewer, setViewer] = useState<any>(null); // a post image open full screen
  const [scrolled, setScrolled] = useState(false); const onScroll = (e?: any) => { const y = e.currentTarget.scrollTop; if (shownKey.current) scrollMem.current[shownKey.current] = y; const s = y > 6; if (s !== scrolled) setScrolled(s); };
  const [pull, setPull] = useState(0); const [refreshing, setRefreshing] = useState(false); const touch = useRef<any>(null); const scroller = useRef<any>(null); const timers = useRef<any>([]);
  // Every screen shares one scroller, so each screen's position is remembered: a pushed screen (a post, a job…) always opens at
  // its top, going back returns to where the list was, and each tab keeps its own place. Applied before paint (and inside the
  // View Transition), so a screen never appears scrolled somewhere else first.
  const scrollMem = useRef<any>({}); const navKind = useRef<any>("tab"); const shownKey = useRef<any>(null);
  const [tourOn, setTourOn] = useState(false);
  useEffect(() => { if (!persona || welcome || editing || embed || !langChosen || tourSeen()) return; const t = setTimeout(() => setTourOn(true), 900); return () => clearTimeout(t); }, [!!persona, welcome, editing, langChosen]);
  const topNow = stack[stack.length - 1]; const screenKey = topNow ? `${topNow.type}-${topNow.id || ""}#${stack.length}` : "tab:" + curTab;
  useLayoutEffect(() => {
    const el = scroller.current; const prev = shownKey.current; shownKey.current = screenKey; if (!el || prev === screenKey || prev == null) return;
    const kind = navKind.current; navKind.current = "push"; // anything that is not an explicit back / tab switch opens at the top
    const saved = scrollMem.current[screenKey]; el.scrollTop = (kind === "pop" || kind === "tab") && saved ? saved : 0;
    if (kind === "push") delete scrollMem.current[screenKey];
  }, [screenKey]);
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(""), 2600); return () => clearTimeout(t); }, [msg]);
  // the route lives in the hash; signed out it is just #app, so a reload of the sign-up/sign-in screens never lands in the demo member
  useEffect(() => { if (embed && !embed.hash) return; const top = stack[stack.length - 1]; try { history.replaceState(null, "", !persona ? (embed ? "#devices" : "#app") : (embed ? "#devices/" : "#app/") + (top ? (top.id ? `${top.type}/${top.id}` : top.type) : curTab === "market" ? `market/${market}` : curTab)); } catch (e) {} }, [curTab, stack, market, persona]);
  useEffect(() => { if (!refreshing) return; if (CLOUD) { hydrate().then(() => { setRefreshing(false); setMsg("محدّث"); }, (e) => { setRefreshing(false); setMsg(e.message); }); return; } const t = setTimeout(() => { setRefreshing(false); setMsg("محدّث — لا جديد منذ آخر مرة"); }, 1100); return () => clearTimeout(t); }, [refreshing]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn?: any, ms?: any) => { timers.current.push(setTimeout(fn, ms)); };
  const toggleIn = (set?: any) => (id) => set((s) => ({ ...s, [id]: !s[id] }));
  const setProfile = (fn?: any) => setProfileRaw(typeof fn === "function" ? fn : () => fn);
  const addPts = (n?: any) => setPts((p) => p + n);
  // Every new item carries the author snapshot of the identity chosen for it — public (name + full title) or anonymous (hash + high-level role)
  const asOf = (as?: any) => (as === "public" || (as == null && profile.identity === "public") ? "public" : "anon");
  const stamp = (extra?: any, as?: any) => ({ id: "u" + Date.now() + Math.floor(Math.random() * 1e4), ...authorOf(profile, asOf(as), repLevel(pts).i), when: "الآن", reactions: R0(), mine: true, ...extra });
  const updateProfileLocal = (patch?: any) => setProfileRaw((s) => ({ ...s, ...patch }));
  const updateProfile = (patch?: any) => { setProfileRaw((s) => ({ ...s, ...patch })); setPersona((pp) => { const n: any = { ...(pp || DEMO_PERSONA), ...patch }; if (hasSession()) savePersona(n); return n; }); };
  const attach = (list?: any, parentId?: any, node?: any) => list.map((c) => c.id === parentId ? { ...c, replies: [...(c.replies || []), node] } : { ...c, replies: attach(c.replies || [], parentId, node) });
  const notify = (n?: any) => setNotifs((ns) => [{ id: "n" + Date.now() + Math.floor(Math.random() * 1e3), when: "الآن", read: false, ...n }, ...ns]);
  // Ends the member's open verification request without a review (withdrawn by the member, or expired): the images are purged
  // from the queue and from this browser, the audit log records it, and the profile keeps only the summary. Returns that summary.
  const purgeOwn = (status?: any, apply: any = true) => {
    const id = profile.verifyRef; const now = Date.now(); const cur = verifs.find((r) => r.id === id);
    const done = cur ? (cur.status === "pending" ? purgeRequest(cur, status, { decision: { by: status === "expired" ? "system" : "member", at: now } }, now) : cur) : null;
    if (cur && cur.status === "pending") setVerifs((vs) => vs.map((r) => (r.id === id ? done : r)));
    dropOwnRequest();
    const sum = done ? verifySummary(done) : { ...(profile.verifyReq || { id, kinds: [], purged: 0 }), status, purgedAt: now, decidedAt: now };
    store.set("audit", (a) => [{ id: "L" + now + Math.floor(Math.random() * 1e3), at: now, who: status === "expired" ? "النظام" : "العضو", action: "verify-out", target: id || "—", detail: `${status === "expired" ? "انتهت مهلة الطلب (7 أيام)" : "سحب العضو طلبه"} — حُذفت المستندات (${done ? done.purged : 0}) نهائيًا` }, ...(a || AUDIT0())]);
    if (apply) updateProfile({ pending: false, verifyReq: sum });
    return sum;
  };
  // A request that ended while the app was closed (expired unreviewed) or that this browser no longer holds: tell the member once
  useEffect(() => {
    if (CLOUD || embed || !persona || !profile.pending) return; const r = verifs.find((x) => x.id === profile.verifyRef);
    if (r && r.status === "pending") return;
    purgeOwn("expired");
    notify({ kind: "verify", title: "انتهت مهلة طلب التوثيق", body: "لم يُراجَع طلبك خلال 7 أيام، فحُذفت مستنداته نهائيًا. يمكنك التقديم من جديد متى شئت.", en: { title: "Verification request expired", body: "Your request wasn't reviewed within 7 days, so its documents were permanently deleted. You can apply again any time." }, target: { type: "profile", sheet: "verify" } });
  }, [profile.pending, profile.verifyRef, verifs, !!persona]);
  const pushNative = (title?: any, body?: any) => { try { if (profile.notify && "Notification" in window && Notification.permission === "granted") new Notification(tr(title), { body: tr(body) }); } catch (e) {} };
  // stored times keep the Arabic form with Latin digits («10:45 م»); the English view shows them as "10:45 PM"
  const clock = () => new Date().toLocaleTimeString("ar-EG-u-nu-latn", { hour: "2-digit", minute: "2-digit" });
  // ---- cloud: load the member's real data, keep it fresh, and send every change to the server ----
  // writes stay optimistic (the screen updates at once); a failure shows its reason and the next refresh restores the truth
  const sync = (call?: any, onOk?: any) => { if (!CLOUD) return; Promise.resolve().then(call).then(onOk, (e) => setMsg(e && e.message ? e.message : String(e))); };
  const hydrated = useRef(false);
  const hydrate = async () => {
    const d = await cloud.loadAll(); hydrated.current = false;
    setPosts(d.posts); setJobs(d.jobs); setJobStats(Object.fromEntries(d.jobs.map((j) => [j.id, j.stats]))); setNotifs(d.notifs); setThreads((ts) => d.threads.map((t) => { const old = ts.find((x) => x.id === t.id); return old ? { ...t, messages: old.messages } : t; }));
    setReviews(d.reviews); setReacts(d.reacts); setVotes(d.votes); setVoteAs(d.voteAs); setSaved(d.saved); setFollows(d.follows); setRoomFollows(d.roomFollows); setHidden(d.hidden); setContacted(d.contacted);
    if (d.config) setConfig({ ...MOD_CONFIG0, ...d.config });
    const v = d.verification; updateProfileLocal({ pending: !!v && v.status === "pending", verifyRef: v && v.status === "pending" ? v.ref : null, verifyReq: v ? { id: v.ref, kinds: v.kinds, status: v.status, at: Date.parse(v.created_at), decidedAt: v.decided_at ? Date.parse(v.decided_at) : null, purged: 0 } : null });
    setTimeout(() => { hydrated.current = true; }, 0);
  };
  const refreshMe = () => cloud.currentPersona().then((p) => { if (!p) { app.signOut(true); return; } savePersona(p); setPersona((pp) => ({ ...(pp || {}), ...p })); setProfileRaw((s) => ({ ...s, ...p })); });
  useEffect(() => { if (!CLOUD || !persona) return; refreshMe(); hydrate().catch((e) => setMsg(e.message)); }, [!!persona]);
  // An auth link finished (web: on load; app: the native URL handler): a reset link opens «new password»; otherwise a server
  // session without a member on this device (e-mail just confirmed, storage cleared) signs the member in.
  const authLink = (reset?: any) => cloud.currentPersona().then((p) => {
    if (!p) return; if (reset) { setPersona(null); setAuthView("newpw"); try { history.replaceState(null, "", location.pathname + "#app"); } catch (e) {} return; }
    if (!hasSession()) { savePersona(p); app.signIn(p); }
  });
  useEffect(() => {
    if (!CLOUD || embed) return; authLink(cloud.resetLinkOpened());
    const on = (e?: any) => authLink(e.detail && e.detail.reset); window.addEventListener("engspace:auth", on); return () => window.removeEventListener("engspace:auth", on);
  }, []);
  // back to the app (tab switch, phone unlocked): fetch what changed
  useEffect(() => { if (!CLOUD) return; const on = () => { if (!document.hidden && persona) hydrate().catch(() => {}); }; document.addEventListener("visibilitychange", on); return () => document.removeEventListener("visibilitychange", on); }, [!!persona]);
  // an open conversation checks for new messages every 5 seconds
  const chatTop = stack[stack.length - 1]; const chatId = CLOUD && chatTop && chatTop.type === "chat" ? chatTop.id : null;
  const loadChat = (tid?: any) => cloud.messages(tid).then((msgs) => setThreads((ts) => ts.map((t) => (t.id === tid ? { ...t, messages: msgs, unread: 0 } : t))));
  useEffect(() => { if (!chatId) return; loadChat(chatId).catch(() => {}); cloud.readThread(chatId).catch(() => {}); const i = setInterval(() => { if (!document.hidden) loadChat(chatId).catch(() => {}); }, 5000); return () => clearInterval(i); }, [chatId]);
  // saved items, follows, personal hiding, opened contacts: one row each, written a moment after the last change
  const saveLater = useRef<any>({});
  const persist = (key?: any, value?: any) => { if (!CLOUD || !hydrated.current) return; clearTimeout(saveLater.current[key]); saveLater.current[key] = setTimeout(() => sync(() => cloud.saveState(key, value)), 800); };
  useEffect(() => persist("saved", saved), [saved]); useEffect(() => persist("follows", follows), [follows]); useEffect(() => persist("roomFollows", roomFollows), [roomFollows]); useEffect(() => persist("hidden", hidden), [hidden]);
  const swapId = (list?: any, tmp?: any, item?: any) => list.map((x) => (x.id === tmp ? { ...x, ...item, mine: true } : { ...x, ...(x.replies ? { replies: swapId(x.replies, tmp, item) } : {}), ...(x.comments ? { comments: swapId(x.comments, tmp, item) } : {}) }));
  const kindOf = (id?: any) => (posts.some((p) => p.id === id) ? "posts" : "comments");
  // Android back button: the open viewer, sheet or pushed screen closes first; on a tab other than home it goes home; then the app leaves
  const backRef = useRef<any>(null);
  backRef.current = () => { if (viewer) { setViewer(null); return true; } if (sheet) { setSheet(null); return true; } if (stack.length) { app.pop(); return true; } if (persona && curTab !== "home") { app.setTab("home"); return true; } return false; };
  useEffect(() => { if (NATIVE && !embed) setBackHandler(() => backRef.current()); }, []);
  const app: any = {
    tab: curTab, tabs, blocked, setTab: (t?: any) => { if (!tabs.some((x) => x.id === t)) { deny(); return; } if (t === curTab && !stack.length) { const el = scroller.current; if (el && el.scrollTop > 0) { try { el.scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" }); } catch (e) { el.scrollTop = 0; } } return; } navKind.current = "tab"; nav("tab", () => { setDir(vtOK ? "vt" : "tab"); setTabRaw(t); setStack([]); }); }, stack, push: (s?: any) => { if (blocked.stack.includes(s.type) || (s.type === "room" && blocked.rooms.includes(s.id))) { deny(); return; } if (s.type === "postjob" && !gate.ok) { setMsg(gate.why); return; } navKind.current = "push"; nav("push", () => { setDir(vtOK ? "vt" : "push"); setStack((st) => [...st, s]); }); if (s.type === "job" && s.id && jobStats[s.id]) setJobStats((st) => ({ ...st, [s.id]: { ...st[s.id], views: st[s.id].views + 1 } })); if (s.type === "job" && s.id) sync(() => cloud.countJobView(s.id)); }, pop: () => { navKind.current = "pop"; nav("pop", () => { setDir(vtOK ? "vt" : "pop"); setStack((st) => st.slice(0, -1)); }); }, scrolled,
    lang, setLang, langChosen, startTour: () => { setSheet(null); setViewer(null); if (stack.length) { navKind.current = "tab"; setStack([]); } setTourOn(true); },
    market, setMarket, goMarket: (m?: any) => { if (!tabs.some((x) => x.id === "market")) { deny(); return; } nav("tab", () => { setDir(vtOK ? "vt" : "tab"); if (m === "tools") { setTabRaw("tools"); } else { setMarket(m); setTabRaw("market"); } setStack([]); }); },
    viewImage: (image?: any) => setViewer(image || null), sheet, openSheet: (type?: any, payload: any = {}) => { if (blocked.sheets.includes(type)) { deny(); return; } if (["compose", "review", "contribute"].includes(type) && !gate.ok) { setMsg(gate.why); return; } setSheet({ type, payload }); }, closeSheet: () => setSheet(null), toast: setMsg, pts, addPts,
    contributed, contribute: (share?: any) => { setContributed(true); addPts(50); setProfile((p) => ({ ...p, contributions: (p.contributions || 0) + 1, contributed: true })); if (share) { setShares((x) => [{ id: "s" + Date.now(), when: "الآن", ...share, as: asOf(share.as) }, ...x]); sync(() => cloud.contribute({ ...share, as: asOf(share.as) }), () => setSalaryRev((r) => r + 1)); } },
    // bumps after a share reaches the server, so the live explorer reloads (and unlocks — give-to-get)
    salaryRev,
    shares,
    saved, toggleSaved: toggleIn(setSaved), follows, toggleFollow: toggleIn(setFollows), roomFollows, toggleRoom: toggleIn(setRoomFollows),
    // Reactions: «أوافق» and «لا أوافق» exclude each other (picking one clears the other); «مفيد» toggles independently and may sit with either
    reacts, react: (id?: any, k?: any) => { const next = applyReaction(reacts[id], k); setReacts((r) => ({ ...r, [id]: next })); sync(() => cloud.react(kindOf(id), id, next)); },
    votes, voteAs, vote: (pid?: any, choice?: any, as?: any) => { setVotes((v) => ({ ...v, [pid]: choice })); setVoteAs((v) => ({ ...v, [pid]: asOf(as) })); addPts(2); const p = posts.find((x) => x.id === pid); sync(() => cloud.vote(pid, p ? p.type : "poll", choice, asOf(as))); },
    posts: visiblePosts, rooms: ROOMS.filter((r) => !blocked.rooms.includes(r.id)),
    // money in member-written text: engineers see it; company accounts never see an individual figure; supervisors see no money at all.
    // Member text is masked as written (it is never translated); system notices are translated first, so the English swap never
    // meets a masked Arabic string it can't look up.
    moneyAccess: access, money: (t?: any) => (access === "full" ? t : maskMoney(t)), moneyDM: (t?: any) => (access === "none" ? maskMoney(t) : t),
    moneyNote: (t?: any) => (access === "none" ? maskMoney(tr(t)) : t),
    addPost: (post?: any, as?: any) => { const tmp = stamp({ comments: [], dm: !!profile.dm, best: null, ...post }, as); setPosts((ps) => [tmp, ...ps]); addPts(post.type === "reveal" ? 15 : 5); sync(() => cloud.addPost(post, asOf(as)), (srv) => setPosts((ps) => swapId(ps, tmp.id, { ...srv, comments: [] }))); },
    addComment: (pid?: any, c?: any, parentId?: any, as?: any) => { const node = stamp({ replies: [], dm: !!profile.dm, ...c }, as); setPosts((ps) => ps.map((p) => p.id !== pid ? p : { ...p, comments: parentId ? attach(p.comments, parentId, node) : [...p.comments, node] })); addPts(10); sync(() => cloud.addComment(pid, c, parentId, asOf(as)), (srv) => setPosts((ps) => swapId(ps, node.id, { ...srv, replies: undefined }))); },
    setBest: (pid?: any, cid?: any) => { setPosts((ps) => ps.map((p) => p.id === pid ? { ...p, best: cid } : p)); sync(() => cloud.setBest(pid, cid)); },
    // personal hiding (after my own report) and moderation removal are both keyed by ckey(kind, id)
    hidden, hide: (k?: any) => setHidden((h) => ({ ...h, [k]: true })), unhide: (k?: any) => setHidden((h) => ({ ...h, [k]: false })),
    removed: isGone, removedInfo: (k?: any) => mod.content[k] || null,
    reviews, addReview: (cid?: any, r?: any) => { const tmp = `${cid}#u${Date.now()}`; setReviews((rs) => ({ ...rs, [cid]: [{ id: tmp, ...r }, ...(rs[cid] || [])] })); addPts(15); sync(() => cloud.addReview(cid, r), (srv) => setReviews((rs) => ({ ...rs, [cid]: (rs[cid] || []).map((x) => (x.id === tmp ? { ...srv, mine: true } : x)) }))); },
    // ---- reporting & moderation: the member's side ----
    config, standing, canAct: gate, reports, openAdmin: onAdmin,
    report: ({ kind, id, reason, note, hide, snapshot }: any) => {
      const rep: any = { id: "R-" + (1045 + reports.length), kind, key: ckey(kind, id), target: id, reason, note: note || "", by: myAcc, mine: true, trust: repLevel(pts).i, at: Date.now(), status: "open", snapshot, acc: authorAccId(snapshot.author, snapshot.self, profile), resolution: null };
      const r = fileReport({ reports, mod, config }, rep); setReports(r.reports); if (r.mod !== mod) setMod(r.mod); if (hide) setHidden((h) => ({ ...h, [rep.key]: true }));
      sync(() => cloud.report(kind, id, reason, note));
      return { id: rep.id, autoHidden: r.autoHidden };
    },
    blockThread: (tid?: any, on?: any) => setThreads((ts) => ts.map((t) => (t.id === tid ? { ...t, blocked: !!on } : t))),
    notifs: visibleNotifs, unread: visibleNotifs.filter((n) => !n.read).length, markRead: (id?: any) => { setNotifs((ns) => ns.map((n) => n.id === id ? { ...n, read: true } : n)); sync(() => cloud.markRead(id)); }, markAllRead: () => { setNotifs((ns) => ns.map((n) => ({ ...n, read: true }))); sync(() => cloud.markRead(null)); },
    profile, setProfile, theme, setTheme, mode, isCo: isCompanyRole(profile.role),
    logos, setLogo: (id?: any, url?: any) => setLogos((l) => ({ ...l, [id]: url || undefined })),
    // removed ads (moderation) and ads I reported and hid disappear from every list; my own ads always stay visible to me
    jobs: jobs.filter((j) => j.mine || !(isGone(ckey("job", j.id)) || hidden[ckey("job", j.id)])), jobsAll: jobs,
    // ---- messaging: rule check → find or create the thread → open it. Every outgoing/incoming message passes the contact filter. ----
    threads, readThread: (tid?: any) => { setThreads((ts) => ts.map((t) => t.id === tid ? { ...t, unread: 0 } : t)); sync(() => cloud.readThread(tid)); },
    startThread: (them?: any, ctx: any = {}) => {
      const rule = dmRule(profile, them, ctx.type === "job" ? { job: ctx.id } : {});
      if (!rule.ok) { setMsg(rule.why); return null; } if (standingOf(mod, accIdOf(authorKey(them))).suspended) { setMsg("هذا الحساب موقوف مؤقتًا بقرار من فريق المجتمع — لا يستقبل رسائل الآن"); return null; }
      const existing = threads.find((t) => sameAuthor(t.with, them)); if (existing) { setDir("push"); setStack((st) => [...st, { type: "chat", id: existing.id }]); return existing.id; }
      if (CLOUD) { sync(() => cloud.startThread(them, ctx, asOf(), rule.why.split(" — ")[0]).then((tid) => cloud.threads().then((ts) => { setThreads((old) => ts.map((t) => { const o = old.find((x) => x.id === t.id); return o ? { ...t, messages: o.messages } : t; })); setDir("push"); setStack((st) => [...st, { type: "chat", id: tid }]); }))); return null; }
      const pub = them.as === "public"; const id = "t" + Date.now();
      const t: any = { id, meAs: asOf(), with: { as: pub ? "public" : "anon", ...(pub ? { pid: them.pid, name: them.name } : { anon: them.anon, avatar: them.avatar }), role: them.role, gender: them.gender, verified: !!them.verified, level: them.level || 0, title: them.title || roleTitle(them.role, them.gender), dm: true, companyId: them.companyId }, ctx: { type: ctx.type || "post", id: ctx.id || null, job: ctx.job, label: ctx.label || "محادثة" }, rule: rule.why.split(" — ")[0], unread: 0, messages: [] };
      setThreads((ts) => [t, ...ts]); setDir("push"); setStack((st) => [...st, { type: "chat", id }]); return id;
    },
    // my identity in a thread can change only before my first message — afterwards it is fixed so the two identities never meet
    setThreadIdentity: (tid?: any, as?: any) => { setThreads((ts) => ts.map((t) => (t.id === tid && !t.messages.some((m) => m.from === "me") ? { ...t, meAs: as === "public" ? "public" : "anon" } : t))); sync(() => cloud.setThreadIdentity(tid, as)); },
    sendMessage: (tid?: any, text?: any) => { const g = screenLanguage(text); if (g.blocked) { setMsg("لم تُرسل — لغة غير لائقة"); return false; } setThreads((ts) => ts.map((t) => t.id === tid ? { ...t, messages: [...t.messages, { from: "me", text, at: `اليوم · ${clock()}` }] } : t)); sync(() => cloud.sendMessage(tid, text)); return true; },
    // The other side is simulated: it answers in-app and, like any member, may share a number or an e-mail — that is allowed by design
    simulated: !CLOUD, simulateReply: (tid?: any) => !CLOUD && setThreads((ts) => ts.map((t) => { if (t.id !== tid) return t; const mine = t.messages.filter((m) => m.from === "me").length; const co = isCompanyRole(t.with.role); const canned = co ? ["أهلًا. سؤالك وصل لفريق التوظيف — نرد هنا خلال يوم عمل.", "لو حابب تقدّم، ابعت سيرتك على البريد المكتوب في الإعلان واكتب EngSpace في العنوان — أو اتصل بنا على 01000000102.", "تمام. لو محتاج أي توضيح تاني اكتب لنا هنا أو على البريد."] : ["أهلًا. ابعتلي التفاصيل وأنا أقولك رأيي بصراحة.", "الرقم اللي قلته منطقي. لو الشركة نفسها اللي عرضت عليك، فاوض على بدل الانتقال.", "لو أسهل نتكلم صوت، ده رقمي 01000000909 — وخد وقتك في القرار."]; return { ...t, messages: [...t.messages, { from: "them", text: canned[Math.min(mine - 1, 2)], at: `اليوم · ${clock()}` }] }; })),
    // ---- applying happens off-platform: remember that this member opened the employer's contact, and count it for the employer ----
    contacted, markContacted: (jobId?: any) => { if (!contacted[jobId]) { setContacted((c) => ({ ...c, [jobId]: true })); setJobStats((st) => ({ ...st, [jobId]: { ...(st[jobId] || { views: 0, contacts: 0 }), contacts: ((st[jobId] || {}).contacts || 0) + 1 } })); addPts(2); sync(() => cloud.markContacted(jobId)); } },
    jobStats,
    // ---- posting a job: mandatory classification → EngSpace estimate → instant notification to exact matches (the current member included when they match) ----
    postJob: (j?: any, editId: any = null) => {
      if (editId) { setJobs((js) => js.map((x) => x.id === editId ? { ...x, ...j } : x)); setMsg("حُفظت تعديلات الإعلان"); return editId; }
      if (CLOUD) { const tmp = "uj" + Date.now(); setJobs((js) => [{ id: tmp, when: "الآن", mine: true, co: profile.companyId || null, coName: profile.companyName, ...j }, ...js]); addPts(5); setContributed(true); setMsg("نُشر الإعلان — وصل إشعار فوري للأعضاء المطابقين"); sync(() => cloud.postJob({ co: profile.companyId || null, ...j }), (srv) => setJobs((js) => js.map((x) => (x.id === tmp ? { ...srv, mine: true } : x)))); return tmp; }
      const id = "uj" + Date.now(); const job: any = { id, when: "الآن", mine: true, co: profile.companyId || "orascom", coName: profile.companyName, ...j }; setJobs((js) => [job, ...js]); addPts(5);
      setJobStats((st) => ({ ...st, [id]: { views: 0, contacts: 0 } })); setProfile((p) => ({ ...p, contributed: true })); setContributed(true);
      const reach = reachFor(job); const e = estimateFor(job); setMsg(`نُشرت — وصل إشعار فوري إلى ${fmt(reach.exact)} عضوًا مطابقًا`);
      later(() => { notify({ kind: "job", title: "إعلانك يعمل", body: `«${job.title}»: ${fmt(reach.exact)} إشعار فوري للمطابقين تمامًا · النطاق المعروض ${fmt(e.lo)}–${fmt(e.hi)} ج.م.`, target: { type: "job", id } }); }, 1200);
      later(() => { setJobStats((st) => ({ ...st, [id]: { views: 37, contacts: 3 } })); notify({ kind: "contact", title: "أول من فتحوا بيانات التواصل", body: `3 مهندسين مطابقين تمامًا فتحوا بريدك وهاتفك في «${job.title}» — راقب صندوق بريدك.`, target: { type: "job", id } }); pushNative("EngSpace", "أول تواصل على إعلانك"); }, 9000);
      return id;
    },
    // ---- account: register → welcome, sign in, edit, sign out, delete. The password never reaches this object — only its PBKDF2 hash. ----
    authView, setAuthView, authNext,
    // a new account starts from a clean slate; persona/profile are set directly so sign-up also works where storage is blocked
    register: (p?: any, acc?: any) => { if (acc) saveAccount(acc); savePersona(p); setSession(true); liveState().noDemo = false; store.reset(); store.set("persona", p); store.set("profile", profileOf(p)); store.set("welcome", true); },
    dismissWelcome: () => { setWelcome(false); setDir("tab"); setTabRaw("home"); setStack([]); setMsg(`أهلًا ${cleanName(profile.name).split(" ")[0] || ""} — رتّبنا التطبيق على تخصصك ومكانك`); },
    signIn: (p?: any) => { setSession(true); liveState().noDemo = false; setPersona(p); setProfileRaw(profileOf(p)); setThreads(threadsFor(p)); setWelcome(false); setEditing(false); setStack([]); setSheet(null); setDir("tab"); setTabRaw("home"); setMsg(`أهلًا بعودتك، ${cleanName(p.name).split(" ")[0]}`); },
    signOut: (already?: any) => { if (!already) sync(() => cloud.signOut()); setSession(false); liveState().noDemo = true; setSheet(null); setStack([]); setEditing(false); setWelcome(false); setTabRaw("home"); setAuthView(loadAccount() ? "signin" : "signup"); setPersona(null); },
    deleteAccount: () => { if (CLOUD && persona) { cloud.deleteAccount().then(() => { savePersona(null); setSession(false); liveState().noDemo = true; store.reset(); }, (e) => setMsg(e.message)); return; } dropOwnRequest(); saveAccount(null); savePersona(null); setSession(false); liveState().noDemo = true; store.reset(); },
    editPersona: () => { setStack([]); setSheet(null); setEditing(true); }, cancelEdit: () => setEditing(false),
    saveProfile: (p0?: any) => { const p = profile.pending && !p0.pending ? { ...p0, verifyReq: purgeOwn("withdrawn", false) } : p0; const roleChanged = threadsKind(p) !== threadsKind(profile); if (hasSession()) savePersona(p); setPersona(p); setProfileRaw((s) => ({ ...s, ...p })); if (roleChanged) setThreads(threadsFor(p)); setEditing(false); setMsg("حُفظت بياناتك"); sync(() => cloud.saveProfile(p), (srv) => srv && setProfileRaw((s) => ({ ...s, ...srv }))); },
    updateProfile: (patch?: any) => { updateProfile(patch); if (Object.keys(profilePatch(patch)).length) sync(() => cloud.saveProfile(patch)); }, savePersonaNow: updateProfile, setIdentity: (as?: any) => { updateProfile({ identity: as === "public" ? "public" : "anon" }); sync(() => cloud.saveProfile({ identity: as === "public" ? "public" : "anon" })); },
    // ---- optional verification: the documents go to the admin review queue; the member only ever sees plain states ----
    verifs,
    submitVerification: (docs?: any) => {
      const r = newVerifyRequest(profile, docs); const now = Date.now();
      // cloud: the documents go to the private bucket and the reviewers' queue; this device keeps no copy of them
      if (CLOUD) { updateProfile({ pending: true, verified: false, verifyRef: r.id, verifyReq: verifySummary(r) }); sync(() => cloud.submitVerification((docs || []).map((d) => ({ kind: d.kind, src: d.src }))), (ref) => updateProfile({ verifyRef: ref, verifyReq: { ...verifySummary(r), id: ref } })); return r.id; }
      setVerifs((vs) => [r, ...(vs || []).map((x) => (x.mine && x.status === "pending" ? purgeRequest(x, "withdrawn", { decision: { by: "member", at: now } }, now) : x))]); saveOwnRequest(r);
      updateProfile({ pending: true, verified: false, verifyRef: r.id, verifyReq: verifySummary(r) });
      return r.id;
    },
    withdrawVerification: () => { if (CLOUD) { updateProfile({ pending: false, verifyRef: null }); sync(() => cloud.withdrawVerification()); setMsg(say({ lang, profile }, L2("سُحب الطلب وحُذفت المستندات نهائيًا", "Request withdrawn — the documents were permanently deleted"))); return; } purgeOwn("withdrawn"); setMsg(say({ lang, profile }, L2("سُحب الطلب وحُذفت المستندات نهائيًا", "Request withdrawn — the documents were permanently deleted"))); },
  };
  // Frame: the standalone preview draws its own phone-like frame; inside a device mockup the app simply fills the screen
  const frameVars: any = { "--tabh": embed && embed.platform === "android" ? "80px" : "68px" };
  const frameCls = embed ? "relative w-full h-full flex flex-col overflow-hidden bg-canvas" : NATIVE ? "relative w-full h-dvh flex flex-col overflow-hidden bg-canvas" : "relative w-full h-dvh sm:max-w-[390px] sm:h-[min(100dvh_-_9rem,820px)] sm:min-h-[640px] flex flex-col overflow-hidden bg-canvas sm:rounded-[2.5rem] sm:border sm:border-line-2";
  const frameStyle = embed ? frameVars : { boxShadow: "var(--frame-shadow)", ...frameVars };
  const wrap = (node?: any, caption: any = null) => embed || NATIVE ? node : <main className="rise sm:px-4 sm:py-6 md:py-10 flex flex-col items-center sm:gap-5">{node}{caption}</main>;
  if (!persona) return wrap(<div className={frameCls} style={frameStyle}>{authView === "lang" ? <LanguageScreen app={app} next={authNext()} onContinue={() => setAuthView(authNext())} /> : <AuthScreen app={app} />}</div>);
  if (!langChosen && !embed) return wrap(<div className={frameCls} style={frameStyle}><LanguageScreen app={app} next="home" onContinue={() => {}} /></div>);
  if (editing) return wrap(<div className={frameCls} style={frameStyle}><Registration app={app} mode="edit" initial={profile} /></div>);
  if (welcome) return wrap(<div className={frameCls} style={frameStyle}><Welcome app={app} /></div>);
  const top = stack[stack.length - 1];
  const screen = top && (blocked.stack.includes(top.type) || (top.type === "room" && blocked.rooms.includes(top.id))) ? <div className="pt-4"><Empty icon={LockKeyhole} title="غير متاح لحساب مشرف الموقع" body={SUPERVISOR_DENY} action="رجوع" onAction={app.pop} /></div>
    : top
    ? top.type === "post" ? <PostScreen app={app} id={top.id} /> : top.type === "company" ? <CompanyScreen app={app} id={top.id} /> : top.type === "job" ? <JobScreen app={app} id={top.id} /> : top.type === "room" ? <RoomScreen app={app} id={top.id} /> : top.type === "rooms" ? <RoomsScreen app={app} /> : top.type === "notifications" ? <NotificationsScreen app={app} /> : top.type === "chat" ? <ChatScreen app={app} id={top.id} /> : top.type === "cvreview" ? <Suspense fallback={<ScreenLoading />}><CVReviewScreen app={app} /></Suspense> : top.type === "permissions" ? <PermissionsScreen app={app} /> : top.type === "postjob" ? <PostJobScreen app={app} like={top.like} /> : top.type === "settings" ? <SettingsScreen app={app} /> : top.type === "guide" ? <GuideScreen app={app} /> : <ProfileScreen app={app} />
    : curTab === "home" ? <HomeScreen app={app} /> : curTab === "community" ? <CommunityScreen app={app} /> : curTab === "jobs" ? <JobsScreen app={app} /> : curTab === "market" ? <MarketScreen app={app} /> : curTab === "tools" ? <ToolsScreen app={app} /> : <InboxScreen app={app} />;
  const toolMeta = sheet?.type === "tool" ? TOOLS.find((t) => t.id === sheet.payload.id) : null; const ToolView = toolMeta ? TOOL_VIEWS[toolMeta.id] : null;
  const sheets: any = {
    contribute: ["شارك راتبك", <ContributeSheet app={app} payload={sheet?.payload} />], compose: ["منشور جديد", <ComposeSheet app={app} payload={sheet?.payload} />], review: ["تقييم الشركة", <ReviewSheet app={app} payload={sheet?.payload} />],
    report: [`إبلاغ عن ${REPORT_KINDS[sheet?.payload?.kind] || "محتوى"}`, <ReportSheet app={app} payload={sheet?.payload} />], privacy: ["الخصوصية والأمان", <PrivacyBody />], methodology: ["المنهجية والمصادر", <MethodologySheet app={app} />], verify: ["التوثيق — اختياري", <VerifySheet app={app} />], user: [sheet?.payload?.as === "public" ? "الملف العلني" : "الملف المجهول", <UserSheet app={app} payload={sheet?.payload} />], logo: ["شعار الشركة", <LogoSheet app={app} payload={sheet?.payload} />],
    tool: [toolMeta?.name || "أداة", ToolView ? <ToolView app={app} payload={sheet?.payload || {}} /> : null],
  };
  const chatOpen = top && top.type === "chat"; const unreadThreads = threads.reduce((a, t) => a + (t.unread || 0), 0);
  // back swipe starts at the leading edge: the right edge in Arabic, the left edge in English
  const ltr = lang === "en";
  const onTouchStart = (e?: any) => { if (tourOn) return; const t = e.touches[0]; const el = scroller.current; const rect = el ? el.getBoundingClientRect() : { left: 0, width: 390 }; touch.current = { x: t.clientX, y: t.clientY, edge: ltr ? t.clientX < rect.left + 28 : t.clientX > rect.left + rect.width - 28, top: el ? el.scrollTop <= 0 : false, moved: false }; };
  const onTouchMove = (e?: any) => { const s = touch.current; if (!s) return; const t = e.touches[0]; const dx = t.clientX - s.x, dy = t.clientY - s.y; if (s.top && !top && dy > 0 && Math.abs(dy) > Math.abs(dx)) { setPull(Math.min(96, dy * 0.6)); s.moved = true; } };
  const onTouchEnd = (e?: any) => { const s = touch.current; if (!s) return; const t = e.changedTouches[0]; const dx = t.clientX - s.x; if (s.edge && (ltr ? dx > 80 : dx < -80) && top) app.pop(); if (pull > 70) { if (typeof window !== "undefined" && typeof window.__engspaceBuildChanged === "function" && window.__engspaceBuildChanged()) { try { location.reload(); } catch (x) {} } else setRefreshing(true); } setPull(0); touch.current = null; };
  return wrap(
      <div className={frameCls} style={frameStyle} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        {/* while a sheet is open everything behind it is inert: no focus, no clicks, hidden from assistive tech */}
        <div className="contents" {...(sheet || viewer || tourOn ? { inert: "" } : {})}>
        <AppHeader app={app} />
        {!gate.ok && <div role="status" className="shrink-0 px-4 py-2 flex items-start gap-2 text-[11.5px] leading-snug bg-warn/10 text-warn border-b border-warn/20"><ShieldAlert size={14} className="shrink-0 mt-px" /><span>{gate.why}</span></div>}
        <div className="relative flex-1 min-h-0">
          <div aria-hidden="true" className="absolute inset-x-0 top-0 z-[5] flex justify-center pointer-events-none" style={{ transform: `translateY(${(refreshing ? 56 : pull) - 44}px)`, opacity: refreshing ? 1 : pull / 70, transition: pull ? "none" : "transform .3s cubic-bezier(.2,.7,.2,1), opacity .3s" }}><span className={`grid place-items-center w-9 h-9 rounded-full bg-surface border border-line-2 shadow-float ${refreshing ? "spin" : ""}`} style={{ transform: refreshing ? undefined : `rotate(${pull * 3}deg)` }}><ArchMark size={16} /></span></div>
          <div ref={scroller} onScroll={onScroll} className={`${chatOpen ? "h-full" : "scroll-area h-full"} px-4 ${vtOK ? "vt-screen" : ""}`} style={{ transform: pull ? `translateY(${pull * 0.4}px)` : undefined, transition: pull ? "none" : "transform .3s cubic-bezier(.2,.7,.2,1)" }}>
            <div key={top ? `${top.type}-${top.id || ""}` : curTab} className={`${chatOpen ? "h-full" : "min-h-full"} flex flex-col ${dir === "push" ? "screen-push" : dir === "pop" ? "screen-pop" : dir === "vt" ? "" : "screen-tab"}`}>{screen}</div>
          </div>
        </div>
        <TabBar tabs={tabs} active={curTab} onChange={app.setTab} badge={{ inbox: unreadThreads + app.unread }} />
        </div>
        {viewer && <ImageViewer image={viewer} onClose={() => setViewer(null)} />}
        {tourOn && !sheet && !viewer && <Tour app={app} onClose={() => setTourOn(false)} />}
        {sheet && sheets[sheet.type] && <Sheet title={sheets[sheet.type][0]} onClose={app.closeSheet} tall={["compose", "contract", "methodology", "move", "contribute", "verify"].includes(sheet.type === "tool" ? sheet.payload.id : sheet.type)}>{sheets[sheet.type][1]}</Sheet>}
        <div role="status" aria-live="polite" className={`absolute bottom-[calc(var(--tabh,68px)+var(--sab)+16px)] inset-x-4 z-30 flex justify-center transition-all ${msg ? "opacity-100" : "opacity-0 translate-y-2 pointer-events-none"}`}>{msg && <span key={msg} className="toast-in inline-flex items-start gap-2 max-w-full px-4 py-2.5 rounded-2xl bg-elevated/95 backdrop-blur border border-line-2 text-[12.5px] leading-snug shadow-float"><CircleCheck size={15} className="react-pop text-accent shrink-0 mt-0.5" /><span>{msg}</span></span>}</div>
      </div>,
      <p className="hidden sm:block text-[11px] text-ink-3 text-center max-w-[48ch] leading-relaxed">معاينة تفاعلية كاملة · أنشئ حسابك (يُحفظ على جهازك فقط)، واختر في كل مشاركة: علنًا باسمك أو مجهولًا. اسحب من حافة البداية للرجوع.</p>
  );
}
