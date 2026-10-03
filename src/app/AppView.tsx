import { Suspense, lazy, memo, startTransition, useEffect, useLayoutEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import {
  CircleCheck, LockKeyhole, ShieldAlert
} from "lucide-react";
import { loadInspections, mergeInspections, storeInspections } from "../data/checklists";
import { SupportScreen, TicketScreen } from "../features/support/support";
import { loadDevice, storeDevice } from "../lib/device-store";
import { ROOMS, company } from "../data/companies";
import { TABS, govName } from "../data/geo";
import { JOBS, NOTIFS0, POSTS0, R0 } from "../data/seed";
import { TOOLS } from "../data/tools";
import { accIdOf, authorAccId, authorKey, authorOf, cleanName, hasSession, loadAccount, memberAccId, normalizeSeedPosts, sameAuthor, saveAccount, setSession } from "../domain/identity";
import { AUDIT0, MOD0, MOD_CONFIG0, REPORT_KINDS, actGate, ckey, fileReport, jobStats0, seedReports, standingOf, threadsFor0, threadsKind } from "../domain/moderation";
import { SUPERVISOR_NOTIFS, blockedFor, closedTitleFor, denyFor, dmRule, toolOpen, isCompanyRole, maskMoney, moneyAccess, repLevel, roleTitle, tabsFor } from "../domain/taxonomy";
import { screenLanguage } from "../domain/text-guard";
import { AuthScreen, Registration, Welcome } from "../features/auth/auth";
import { GuideScreen, LanguageScreen, SettingsScreen, Tour, tourSeen } from "../features/settings/settings";
import { ComposeSheet, ContributeSheet, LogoSheet, MethodologySheet, PrivacyBody, ReviewSheet, TOOL_VIEWS, UserSheet, VerifySheet } from "../features/sheets/sheets";
import { ChatScreen, CompanyScreen, JobScreen, PermissionsScreen, PostJobScreen, PostScreen, ProfileScreen, RoomScreen, RoomsScreen } from "../features/stack/stack";
import { CommunityScreen, HomeScreen, InboxScreen, JobsScreen, MarketScreen, ToolsScreen } from "../features/tabs/tabs";
import { dropOwnRequest, newVerifyRequest, purgeRequest, saveOwnRequest, verifs0, verifySummary } from "../features/verify/verify";
import { L2, say, tr } from "../i18n/i18n";
import { UpdateBanner } from "../ui/update-banner";
import { DEMO_PERSONA, estimateFor, loadPersona, reachFor, savePersona } from "../lib/helpers";
import { ImageViewer } from "../lib/media";
import { applyReaction, mergeLocalPosts } from "../lib/posts";
import { liveState, reducedMotion, storeFor, useStore } from "../lib/runtime";
import { AppHeader, Empty, Sheet, TabBar } from "../ui/chrome";
import { ReportSheet } from "../ui/moderation";
import { NotificationsScreen } from "../ui/notifications";
import { ArchMark } from "../ui/primitives";
import { NotificationPrefsScreen, PushPrimerSheet } from "../features/notifications/prefs";
import { fmt } from "../ui/theme";
import { ScreenLoading } from "./ScreenLoading";
import { isCloud } from "../backend/config";
import { profilePatch } from "../backend/map";
import { NATIVE, setBackHandler, setPendingOpen, shareContent, takePendingAuth, takePendingOpen } from "../native/native";
import { dropPush, enablePush, mayAskAgain, pushPermission, pushSupported, readAsk, refreshPush, webNotify, writeAsk } from "../native/push";
import { DEFAULT_PREFS, notifCategory, notifPref } from "../domain/notifications";
import { SHAREABLE, linkFor, snippet } from "../lib/share";
import * as cloud from "../backend/cloud";

// The CV review (parser, engineering knowledge base, audit, report) is the largest feature; it loads on first open, and
// pdf.js / mammoth only when a file is picked
const CVReviewScreen = lazy(() => import("../features/cv/CVReviewScreen").then((m) => ({ default: m.CVReviewScreen })));
const ChecklistsScreen = lazy(() => import("../features/qaqc/qaqc").then((m) => ({ default: m.ChecklistsScreen })));

// =====================================================================
//  App view — state, routing, gestures
// =====================================================================
// A kept-alive tab: an inactive pane is skipped with content-visibility:hidden, which keeps its computed style and layout
// (display:none would throw them away and showing the tab again would recompute the whole screen). Its content does not
// re-render while hidden, nor to be hidden; it renders again only as the visible tab.
const PaneBody = memo(({ render }: any) => render(), (a: any, b: any) => !b.active);
// a pane built in the background is laid out once (invisible) before it is skipped, so its first appearance is cheap too
const TabPane = ({ active, render }: any) => {
  const [warm, setWarm] = useState(active);
  useEffect(() => { if (warm) return; let id = requestAnimationFrame(() => { id = requestAnimationFrame(() => setWarm(true)); }); return () => cancelAnimationFrame(id); }, []);
  return <div className={`tab-pane ${active ? "" : warm ? "is-off" : "is-off is-warming"}`} {...(active ? {} : { inert: "", "aria-hidden": true })}><PaneBody active={active} render={render} /></div>;
};

export const STACK_TYPES = ["post", "company", "job", "room", "chat", "inspection", "ticket"];

export const PLAIN_TYPES = ["notifications", "notifprefs", "profile", "rooms", "permissions", "postjob", "cvreview", "settings", "guide", "checklists", "support"];

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
  const [notifPrefs, setNotifPrefs] = S("notifPrefs", DEFAULT_PREFS); const [pushStatus, setPushStatus] = S("pushStatus", { permission: "default", devices: 0, supported: pushSupported() });
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
  // QA/QC inspections live on this device first (sites often have no signal); on the live platform they also go to the member's own state row
  const [inspections, setInspections] = S("inspections", () => loadInspections(persona && persona.pid));
  useEffect(() => { setInspections(loadInspections(persona && persona.pid)); }, [persona && persona.pid]);
  // the salary history behind the raise tracker: private to the member (device first, then their own state row)
  const [salaryLog, setSalaryLog] = S("salaryLog", () => loadDevice("salarylog", persona && persona.pid, { at: 0, log: [] }));
  useEffect(() => { setSalaryLog(loadDevice("salarylog", persona && persona.pid, { at: 0, log: [] })); }, [persona && persona.pid]);
  // role scope: which tabs, screens and content this member may see, and how much of money
  const access = moneyAccess(profile); const blocked = blockedFor(profile); const tabs = tabsFor(profile); const curTab = tabs.some((t) => t.id === tab) ? tab : tabs[0].id;
  const deny = () => setMsg(denyFor(profile));
  const visiblePosts = blocked.posts.length || blocked.rooms.length ? posts.filter((x) => !blocked.posts.includes(x.type) && !blocked.rooms.includes(x.room)) : posts;
  const visibleNotifs = access === "none" ? notifs.filter((n) => SUPERVISOR_NOTIFS.includes(n.kind)) : notifs;
  const myAcc = memberAccId(profile); const standing = standingOf(mod, myAcc); const gate = actGate(standing, config); const isGone = (k?: any) => !!(mod.content[k] && mod.content[k].hidden);
  // Screen changes run as View Transitions in the standalone app (directional slides for push / pop, a lift for tabs); the device
  // previews and browsers without the API keep the class-based entrances. Reduced motion turns both off.
  const vtOK = !embed && typeof document !== "undefined" && typeof document.startViewTransition === "function" && !reducedMotion();
  const nav = (kind?: any, fn?: any) => {
    const root = document.documentElement; const L = liveState(); if (!vtOK || L.vtBusy || L.tourOn || kind === "tab") { fn(); return; } // under the tour the screen changes at once: a view transition behind the scrim only costs frames
    L.vtBusy = true; root.dataset.vt = kind; let t = null;
    const done = () => { L.vtBusy = false; if (root.dataset.vt === kind) delete root.dataset.vt; };
    try { t = document.startViewTransition(() => { ReactDOM.flushSync(fn); }); } catch (e) { done(); fn(); return; }
    [t.ready, t.updateCallbackDone].forEach((p) => p && p.catch(() => {})); t.finished.then(done, done);
  };
  const [viewer, setViewer] = useState<any>(null); // a post image open full screen
  const [scrolled, setScrolled] = useState(false); const onScroll = (e?: any) => { const y = e.currentTarget.scrollTop; if (shownKey.current) scrollMem.current[shownKey.current] = y; const s = y > 6; if (s !== scrolled) setScrolled(s); scrollingNow(); };
  // .is-scrolling while the list moves: idle animations hold still so every frame goes to the scroll (no React state)
  const scrollIdle = useRef<any>(null);
  // (on the scroller, not <html>: a class on the root would restyle the whole document twice per gesture)
  const scrollingNow = () => { const el = scroller.current; if (!el) return; if (!el.classList.contains("is-scrolling")) el.classList.add("is-scrolling"); clearTimeout(scrollIdle.current); scrollIdle.current = setTimeout(() => el.classList.remove("is-scrolling"), 180); };
  // pull-to-refresh is painted straight onto the indicator and the screen (GPU transforms, one write per frame):
  // a React state per touchmove re-rendered the whole app view dozens of times a second during the gesture
  const pull = useRef(0); const pullEl = useRef<any>(null); const pullIcon = useRef<any>(null); const pullRaf = useRef(0); const [refreshing, setRefreshing] = useState(false);
  const EASE = "cubic-bezier(.2,.7,.2,1)";
  const paintPull = (v?: any) => { pull.current = v; cancelAnimationFrame(pullRaf.current); pullRaf.current = requestAnimationFrame(() => {
    const ind = pullEl.current, sc = scroller.current, ic = pullIcon.current; if (!ind || !sc) return; const live = v > 0;
    ind.style.transition = live ? "none" : `transform .3s ${EASE}, opacity .3s`; sc.style.transition = live ? "none" : `transform .3s ${EASE}`;
    if (live) { ind.style.transform = `translate3d(0,${v - 44}px,0)`; ind.style.opacity = String(v / 70); if (ic) ic.style.transform = `rotate(${v * 3}deg)`; sc.style.transform = `translate3d(0,${v * 0.4}px,0)`; }
    else { ind.style.transform = ""; ind.style.opacity = ""; sc.style.transform = ""; }
  }); }; const touch = useRef<any>(null); const scroller = useRef<any>(null); const timers = useRef<any>([]);
  // Every screen shares one scroller, so each screen's position is remembered: a pushed screen (a post, a job…) always opens at
  // its top, going back returns to where the list was, and each tab keeps its own place. Applied before paint (and inside the
  // View Transition), so a screen never appears scrolled somewhere else first.
  const scrollMem = useRef<any>({}); const navKind = useRef<any>("tab"); const shownKey = useRef<any>(null);
  const [tourOn, setTourOn] = useState(false); liveState().tourOn = tourOn;
  // Tabs stay mounted once shown (hidden with display:none), so switching back only toggles visibility; after the first screen
  // has painted, the remaining tabs are built in an idle, interruptible render so even a first visit is instant.
  const [visited, setVisited] = useState<any>(() => [init.tab]);
  // the updater re-checks: two quick tab changes before the first commit used to append the same tab twice (two live panes, same React key)
  useEffect(() => { setVisited((v) => (v.includes(curTab) ? v : [...v, curTab])); }, [curTab]);
  useEffect(() => { if (!persona) return; const ric: any = (window as any).requestIdleCallback || ((f: any) => setTimeout(f, 1200)); const id = ric(() => startTransition(() => setVisited((v) => [...new Set([...v, ...tabs.map((x) => x.id)])])), { timeout: 2500 }); return () => { const c: any = (window as any).cancelIdleCallback || clearTimeout; c(id); }; }, [!!persona, tabs.length]);
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
  // Pull-to-refresh always lets go: when the data arrives, when it fails, or after 12 s on a connection that never answers (the spinner
  // used to wait on a request with no timeout). A late answer still updates the screen, it just no longer holds the spinner.
  useEffect(() => {
    if (!refreshing) return; let done = false;
    const finish = (m: any) => { if (done) return; done = true; clearTimeout(guard); setRefreshing(false); setMsg(m); };
    const guard = setTimeout(() => finish("تعذّر التحديث — تحقّق من اتصالك"), CLOUD ? 12000 : 1100);
    if (CLOUD) hydrate().then(() => finish("محدّث"), (e) => finish(e && e.message ? e.message : "تعذّر التحديث"));
    else setTimeout(() => finish("محدّث — لا جديد منذ آخر مرة"), 1000);
    return () => { done = true; clearTimeout(guard); };
  }, [refreshing]);
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
  // a browser tab that is hidden shows the notice as a system notification (when the member allowed it and the type is switched on)
  const pushNative = (title?: any, body?: any, kind?: any) => webNotify({ kind, title: tr(title), body: tr(body) }, { ...notifPrefs, notify: profile.notify !== false });
  // stored times keep the Arabic form with Latin digits («10:45 م»); the English view shows them as "10:45 PM"
  const clock = () => new Date().toLocaleTimeString("ar-EG-u-nu-latn", { hour: "2-digit", minute: "2-digit" });
  // ---- cloud: load the member's real data, keep it fresh, and send every change to the server ----
  // writes stay optimistic (the screen updates at once); a failure shows its reason and the next refresh restores the truth
  const sync = (call?: any, onOk?: any, onErr?: any) => { if (!CLOUD) return; Promise.resolve().then(call).then(onOk, (e) => { if (onErr) onErr(e); setMsg(e && e.message ? e.message : String(e)); }); };
  const hydrated = useRef(false); const contributing = useRef(false); const sharing = useRef(false); const shareOkAt = useRef(0);
  const hydrate = async () => {
    const d = await cloud.loadAll(); hydrated.current = false;
    setPosts(mergeLocal(d.posts)); setJobs(d.jobs); setJobStats(Object.fromEntries(d.jobs.map((j) => [j.id, j.stats]))); setNotifs(d.notifs); setThreads((ts) => d.threads.map((t) => { const old = ts.find((x) => x.id === t.id); return old ? { ...t, messages: old.messages } : t; }));
    // give-to-get comes from the server, so a fresh install or another phone is unlocked the same way (a share made seconds ago
    // may not be in a read that started before it — keep the local answer for a minute)
    if (d.contributed || Date.now() - shareOkAt.current > 60000) { setContributed((c) => (isCompanyRole(persona && persona.role) ? c || !!d.contributed : !!d.contributed)); updateProfileLocal({ contributed: !!d.contributed || (isCompanyRole(persona && persona.role) && !!profile.contributed) }); }
    if (d.prefs) setNotifPrefs({ ...DEFAULT_PREFS, ...d.prefs });
    setReviews(d.reviews); setReacts(d.reacts); setVotes(d.votes); setVoteAs(d.voteAs); setSaved(d.saved); setFollows(d.follows); setRoomFollows(d.roomFollows); setHidden(d.hidden); setContacted(d.contacted);
    setInspections((mine) => mergeInspections(mine, d.inspections));
    // the whole history is one value stamped with its last edit: the newer copy wins, so a deletion on one device sticks everywhere
    setSalaryLog((mine) => (d.salaryLog && d.salaryLog.at > (mine.at || 0) ? d.salaryLog : mine));
    if (d.config) setConfig({ ...MOD_CONFIG0, ...d.config });
    const v = d.verification; updateProfileLocal({ pending: !!v && v.status === "pending", verifyRef: v && v.status === "pending" ? v.ref : null, verifyReq: v ? { id: v.ref, kinds: v.kinds, status: v.status, at: Date.parse(v.created_at), decidedAt: v.decided_at ? Date.parse(v.decided_at) : null, purged: 0 } : null });
    setTimeout(() => { hydrated.current = true; }, 0);
  };
  const refreshMe = () => cloud.currentPersona().then((p) => { if (!p) { app.signOut(true); return; } savePersona(p); setPersona((pp) => ({ ...(pp || {}), ...p })); setProfileRaw((s) => ({ ...s, ...p })); });
  useEffect(() => { if (!CLOUD || !persona) return; refreshMe(); hydrate().catch((e) => setMsg(e.message)); }, [!!persona]);
  // ---- push notifications: this device's state, a silent token refresh, and the primer (never a raw OS prompt)
  const refreshPushStatus = async () => { const permission = await pushPermission(); const devices = CLOUD ? await cloud.myPushDevices().then((d) => d.length).catch(() => 0) : 0; setPushStatus({ permission, devices, supported: pushSupported() }); };
  useEffect(() => { if (!persona || embed) return; refreshPushStatus().catch(() => {}); if (CLOUD) refreshPush(lang).catch(() => {}); const on = () => refreshPushStatus().catch(() => {}); window.addEventListener("engspace:push-registered", on); return () => window.removeEventListener("engspace:push-registered", on); }, [!!persona]);
  const primerShown = useRef(false); const askRefs = useRef<any>({});
  // ask once the member has had a moment with the app (7 s on a screen, never during the tour or over a sheet), at most twice a week apart
  askRefs.current = { sheet: !!sheet, tour: tourOn, perm: pushStatus.permission, supported: pushStatus.supported };
  const askPush = () => { const r = askRefs.current; if (primerShown.current || r.sheet || r.tour || !r.supported || r.perm !== "default" || !mayAskAgain(readAsk())) return; primerShown.current = true; setSheet({ type: "pushprimer", payload: {} }); };
  useEffect(() => { if (!persona || embed || !CLOUD && !NATIVE || profile.onboarded === false) return; const t = setTimeout(askPush, 7000); return () => clearTimeout(t); }, [!!persona, curTab]);
  // a shared link: the phone app gets app.engspace://open/<type>/<id>; the web gets #app/<type>/<id>. Signed out, it waits for the sign-in.
  useEffect(() => { if (!persona && !embed && init.stack.length === 1 && init.stack[0].id && SHAREABLE.includes(init.stack[0].type)) setPendingOpen(init.stack[0]); }, []);
  useEffect(() => { if (!persona || embed) return; const go = () => { const o = takePendingOpen(); if (!o) return; if (o.nid) app.markRead(o.nid); if (o.tab) app.setTab(o.tab); else app.push({ type: o.type, id: o.id }); }; go(); window.addEventListener("engspace:open", go); return () => window.removeEventListener("engspace:open", go); }, [!!persona]);
  // An auth link finished (web: on load; app: the native URL handler): a reset link opens «new password»; otherwise a server
  // session without a member on this device (e-mail just confirmed, storage cleared) signs the member in.
  const authLink = (reset?: any) => cloud.currentPersona().then((p) => {
    if (!p) return; if (reset) { setPersona(null); setAuthView("newpw"); try { history.replaceState(null, "", location.pathname + "#app"); } catch (e) {} return; }
    if (!hasSession()) { savePersona(p); app.signIn(p); }
  });
  useEffect(() => {
    if (!CLOUD || embed) return;
    // a confirmation / reset / Google / Apple link landed on this page: finish it (any device), clean the address, then sign in
    cloud.finishAuthLink().then((r) => {
      if (r && r.error) setMsg(r.error);
      if (r && r.confirmedElsewhere && !hasSession()) { setMsg("تم تأكيد بريدك — سجّل الدخول للمتابعة"); setAuthView("signin"); }
      authLink(!!(r && r.reset) || cloud.resetLinkOpened());
    });
    // the native app: Google / Apple / e-mail links come back through app.engspace://auth-callback (src/native/native.ts)
    const take = () => { const r = takePendingAuth(); if (!r) return; if (r.error) { setMsg(r.error); return; } authLink(r.reset); };
    take(); window.addEventListener("engspace:auth", take); return () => window.removeEventListener("engspace:auth", take);
  }, []);
  // back to the app (tab switch, phone unlocked): fetch what changed
  useEffect(() => { if (!CLOUD) return; const on = () => { if (!document.hidden && persona) hydrate().catch(() => {}); }; document.addEventListener("visibilitychange", on); return () => document.removeEventListener("visibilitychange", on); }, [!!persona]);
  // Realtime: a new message or notification arrives at once over the member's private channel. While the socket is up an
  // open conversation needs no polling; if it drops, the conversation checks every 5 s until it is back.
  const chatTop = stack[stack.length - 1]; const chatId = CLOUD && chatTop && chatTop.type === "chat" ? chatTop.id : null;
  const chatRef = useRef<any>(null); chatRef.current = chatId; const [live, setLive] = useState(false);
  const loadChat = (tid?: any) => cloud.messages(tid).then((msgs) => setThreads((ts) => ts.map((t) => (t.id === tid ? { ...t, messages: msgs, unread: 0 } : t))));
  const refreshThreads = () => cloud.threads().then((ts) => setThreads((old) => ts.map((t) => { const o = old.find((x) => x.id === t.id); return o ? { ...t, messages: o.messages, unread: t.id === chatRef.current ? 0 : t.unread } : t; })));
  // the realtime handlers outlive a render: they always call the latest functions through this ref
  const rt = useRef<any>({}); const hydrateTimer = useRef<any>(null);
  const uniqById = (ps: any[]) => { const seen = new Set(); return ps.filter((p) => !seen.has(p.id) && seen.add(p.id)); };
  rt.current = {
    refreshMe: () => refreshMe().catch(() => {}),
    // moderation and other bulk changes: one refresh shortly after the last event
    hydrateSoon: () => { clearTimeout(hydrateTimer.current); hydrateTimer.current = setTimeout(() => hydrate().catch(() => {}), 600); },
    // a new post by someone else; mine is already on screen (give a post of mine still on its way a moment to finish first)
    pullPost: (id: any) => setTimeout(() => cloud.postById(id).then((p) => { if (p) setPosts((ps) => (ps.some((x) => x.id === p.id) || recentOwn.current[p.id] ? ps : uniqById([p, ...ps]))); }).catch(() => {}), Object.keys(pendingPosts.current).length ? 1500 : 0),
    // a post's text was edited (by its author, maybe on another device): take the new text and count
    pullEdit: (id: any) => { cloud.postById(id).then((p) => { if (p) setPosts((ps) => ps.map((x) => (x.id === p.id ? { ...x, body: p.body, edits: p.edits, editedAt: p.editedAt } : x))); }).catch(() => {}); },
    // a new comment under a post the feed holds: re-read that post (its counts and tree)
    pullComments: (postId: any) => { if (!posts.some((x) => x.id === postId)) return; cloud.postById(postId).then((p) => { if (p) setPosts((ps) => ps.map((x) => (x.id === p.id ? { ...x, comments: p.comments, reactions: p.reactions } : x))); }).catch(() => {}); },
  };
  useEffect(() => {
    if (!CLOUD || !persona) return; let off: any = null; let gone = false;
    cloud.subscribeLive((event, p) => {
      if (event === "profile") { rt.current.refreshMe(); rt.current.hydrateSoon(); }
      if (event === "post" && p) rt.current.pullPost(p.id);
      if (event === "edit" && p) rt.current.pullEdit(p.id);
      if (event === "comment" && p) rt.current.pullComments(p.post);
      if (event === "moderation") rt.current.hydrateSoon();
      if (event === "message") { refreshThreads().catch(() => {}); if (p && p.thread === chatRef.current) { loadChat(p.thread).catch(() => {}); cloud.readThread(p.thread).catch(() => {}); } }
      if (event === "notification" && p) { setNotifs((ns) => (ns.some((n) => n.id === p.id) ? ns : [{ id: p.id, kind: p.kind, title: p.title, body: p.body, target: p.target || undefined, read: false, when: "الآن", category: p.category || notifCategory(p.kind), ...(p.en && p.en.title ? { en: p.en } : {}) }, ...ns])); pushNative(p.title, p.body, p.kind); if (["verify", "mod", "warn", "suspend"].includes(p.kind)) rt.current.refreshMe(); }
    }, setLive, { staff: !!persona && (persona.staff === "moderator" || persona.staff === "admin") }).then((f) => { if (gone) f(); else off = f; }).catch(() => {});
    return () => { gone = true; if (off) off(); setLive(false); };
  }, [!!persona, persona && persona.pid, persona && persona.staff]);
  // a thread opened from the admin console may be new to this list: fetch the list first, then its messages
  useEffect(() => { if (!chatId) return; (threads.some((x) => x.id === chatId) ? loadChat(chatId) : refreshThreads().then(() => loadChat(chatId))).catch(() => {}); cloud.readThread(chatId).catch(() => {}); if (live) return; const i = setInterval(() => { if (!document.hidden) loadChat(chatId).catch(() => {}); }, 5000); return () => clearInterval(i); }, [chatId, live]);
  // saved items, follows, personal hiding, opened contacts: one row each, written a moment after the last change
  const saveLater = useRef<any>({});
  const persist = (key?: any, value?: any) => { if (!CLOUD || !hydrated.current) return; clearTimeout(saveLater.current[key]); saveLater.current[key] = setTimeout(() => sync(() => cloud.saveState(key, value)), 800); };
  useEffect(() => persist("saved", saved), [saved]); useEffect(() => persist("follows", follows), [follows]); useEffect(() => persist("roomFollows", roomFollows), [roomFollows]); useEffect(() => persist("hidden", hidden), [hidden]);
  useEffect(() => { storeInspections(inspections, persona && persona.pid); persist("inspections", inspections); }, [inspections]);
  useEffect(() => { storeDevice("salarylog", persona && persona.pid, salaryLog); persist("salaryLog", salaryLog); }, [salaryLog]);
  const swapId = (list?: any, tmp?: any, item?: any) => list.map((x) => (x.id === tmp ? { ...x, ...item, mine: true } : { ...x, ...(x.replies ? { replies: swapId(x.replies, tmp, item) } : {}), ...(x.comments ? { comments: swapId(x.comments, tmp, item) } : {}) }));
  // A post just published exists only here until the server answers, and for a moment after that a read may not include it yet.
  // A refresh (pull, focus, realtime) in that window used to replace the feed and drop it — «some posts only show after a reload».
  const pendingPosts = useRef<any>({}); const recentOwn = useRef<any>({});
  const mergeLocal = (server: any[]) => {
    const now = Date.now(); for (const [id, p] of Object.entries<any>(recentOwn.current)) if (now - p.keptAt > 120000) delete recentOwn.current[id];
    return mergeLocalPosts(server, [...Object.values<any>(pendingPosts.current), ...Object.values<any>(recentOwn.current)]);
  };
  const kindOf = (id?: any) => (posts.some((p) => p.id === id) ? "posts" : "comments");
  // Android back button: the open viewer, sheet or pushed screen closes first; on a tab other than home it goes home; then the app leaves
  const backRef = useRef<any>(null);
  backRef.current = () => { if (viewer) { setViewer(null); return true; } if (sheet) { setSheet(null); return true; } if (stack.length) { app.pop(); return true; } if (persona && curTab !== "home") { app.setTab("home"); return true; } return false; };
  useEffect(() => { if (NATIVE && !embed) setBackHandler(() => backRef.current()); }, []);
  const app: any = {
    tab: curTab, tabs, blocked, setTab: (t?: any) => { if (!tabs.some((x) => x.id === t)) { deny(); return; } if (t === curTab && !stack.length) { const el = scroller.current; if (el && el.scrollTop > 0) { try { el.scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" }); } catch (e) { el.scrollTop = 0; } } return; } navKind.current = "tab"; startTransition(() => { setDir("tab"); setTabRaw(t); setStack([]); }); }, stack, push: (s?: any) => { if (blocked.stack.includes(s.type) || (s.type === "room" && blocked.rooms.includes(s.id))) { deny(); return; } if (s.type === "postjob" && !gate.ok) { setMsg(gate.why); return; } navKind.current = "push"; nav("push", () => { setDir(vtOK ? "vt" : "push"); setStack((st) => [...st, s]); }); if (s.type === "job" && s.id && jobStats[s.id]) setJobStats((st) => ({ ...st, [s.id]: { ...st[s.id], views: st[s.id].views + 1 } })); if (s.type === "job" && s.id) sync(() => cloud.countJobView(s.id)); }, pop: () => { navKind.current = "pop"; nav("pop", () => { setDir(vtOK ? "vt" : "pop"); setStack((st) => st.slice(0, -1)); }); }, scrolled,
    lang, setLang, langChosen, startTour: () => { setSheet(null); setViewer(null); if (stack.length) { navKind.current = "tab"; setStack([]); } setTourOn(true); },
    market, setMarket, goMarket: (m?: any) => { if (!tabs.some((x) => x.id === "market")) { deny(); return; } nav("tab", () => { setDir(vtOK ? "vt" : "tab"); if (m === "tools") { setTabRaw("tools"); } else { setMarket(m); setTabRaw("market"); } setStack([]); }); },
    // the header's share button: the phone's share sheet (or the browser's), else the link is copied — with a toast that says which
    share: async (type?: any, id?: any) => {
      if (sharing.current || !SHAREABLE.includes(type)) return;
      const what: any = type === "post" ? (() => { const p = posts.find((x) => x.id === id); return p && !isGone(ckey("post", p.id)) ? { title: tr("منشور على EngSpace"), text: snippet(app.money(p.body)) } : null; })()
        : type === "job" ? (() => { const j = jobs.find((x) => x.id === id); return j ? { title: j.title, text: [(company(j.co) || { name: j.coName }).name, j.gov ? govName(j.gov) : ""].filter(Boolean).join(" · ") } : null; })()
        : type === "company" ? (() => { const c = company(id); return c ? { title: c.name, text: tr("تقييمات الموظفين ورواتبهم على EngSpace") } : null; })()
        : (() => { const r = ROOMS.find((x) => x.id === id); return r ? { title: r.name, text: tr("غرفة نقاش على EngSpace") } : null; })();
      if (!what) { setMsg("تعذّرت المشاركة — العنصر غير موجود"); return; }
      sharing.current = true;
      try {
        const r = await shareContent({ ...what, url: linkFor(type, id, { native: NATIVE, publicUrl: (import.meta as any).env.VITE_PUBLIC_URL, page: location.origin + location.pathname }) });
        if (r === "copied") setMsg("تم نسخ الرابط"); else if (r === "failed") setMsg("تعذّر نسخ الرابط");
      } finally { sharing.current = false; }
    },
    // notification preferences + push (the primer sheet and the preferences screen)
    notifPrefs, pushStatus, native: NATIVE, cloud: CLOUD, refreshPushStatus: () => refreshPushStatus().catch(() => {}),
    setNotifPref: (k?: any, v?: any) => { setNotifPrefs((p) => ({ ...p, [k]: v })); sync(() => cloud.setNotificationPrefs({ [k]: v } as any)); },
    enablePush: async () => {
      const r = await enablePush(lang); refreshPushStatus().catch(() => {});
      if (r.ok || r.reason === "denied") writeAsk({ n: 2, at: Date.now() });   // decided: stop asking by ourselves
      return r;
    },
    pushPrimerLater: () => writeAsk({ n: readAsk().n + 1, at: Date.now() }),
    askPush: () => askPush(),
    testPush: async () => { try { await cloud.sendTestPush(); setMsg("أُرسل الإشعار التجريبي — يصلك خلال ثوانٍ"); } catch (e: any) { setMsg(/wait a minute|54000/.test(String(e && e.message)) ? "انتظر دقيقة قبل التجربة التالية" : (e && e.message) || "تعذّر الإرسال"); } },
    viewImage: (image?: any) => setViewer(image || null), sheet, openSheet: (type?: any, payload: any = {}) => { if (blocked.sheets.includes(type) || (type === "tool" && !toolOpen(blocked, payload.id))) { deny(); return; } if (["compose", "review", "contribute"].includes(type) && !gate.ok) { setMsg(gate.why); return; } setSheet({ type, payload }); }, closeSheet: () => setSheet(null), toast: setMsg, pts, addPts,
    // A salary report: one at a time (a second tap while the first is on its way is ignored), and the member is only «unlocked»
    // once it is recorded — the sheet gets { ok, error } back and stays on the form when the server said no.
    contributed, contribute: async (share?: any) => {
      if (contributing.current) return { ok: false, error: "" }; contributing.current = true;
      try {
        if (share && CLOUD) { try { await cloud.contribute({ ...share, as: asOf(share.as) }); } catch (e: any) { return { ok: false, error: e && e.message ? e.message : String(e) }; } shareOkAt.current = Date.now(); }
        setContributed(true); addPts(50); setProfile((p) => ({ ...p, contributions: (p.contributions || 0) + 1, contributed: true }));
        if (share) setShares((x) => [{ id: "s" + Date.now(), when: "الآن", ...share, as: asOf(share.as) }, ...x]);
        if (share && CLOUD) setSalaryRev((r) => r + 1);
        return { ok: true, error: "" };
      } finally { contributing.current = false; }
    },
    // bumps after a share reaches the server, so the live explorer reloads (and unlocks — give-to-get)
    salaryRev,
    shares,
    salaryLog: salaryLog.log || [], saveSalaryLog: (log?: any) => setSalaryLog({ at: Date.now(), log: [...log].sort((a, b) => (a.month < b.month ? -1 : 1)).slice(-60) }),
    inspections, saveInspection: (x?: any) => setInspections((l) => [x, ...l.filter((i) => i.id !== x.id)].slice(0, 100)), deleteInspection: (id?: any) => setInspections((l) => l.filter((i) => i.id !== id)),
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
    addPost: (post?: any, as?: any) => {
      later(() => askPush(), 2500); const tmp: any = stamp({ comments: [], dm: !!profile.dm, best: null, at: Date.now(), ...post }, as);
      pendingPosts.current[tmp.id] = tmp; setPosts((ps) => [tmp, ...ps]); addPts(post.type === "reveal" ? 15 : 5);
      sync(() => cloud.addPost(post, asOf(as)), (srv: any) => {
        delete pendingPosts.current[tmp.id]; const full = { ...srv, comments: [], mine: true }; recentOwn.current[srv.id] = { ...full, keptAt: Date.now() };
        // swap the temporary post for the real one — or add it, when a refresh already replaced the feed
        setPosts((ps) => uniqById(ps.some((x) => x.id === tmp.id) ? swapId(ps, tmp.id, { ...srv, comments: [] }) : ps.some((x) => x.id === srv.id) ? ps : [full, ...ps]));
      }, () => { delete pendingPosts.current[tmp.id]; setPosts((ps) => ps.filter((x) => x.id !== tmp.id)); });   // refused: it never existed — the message says why
    },
    // the author's own post. Edit: the text changes at once and the server's count replaces the local guess; a refusal puts the old text
    // back. Delete: gone from the feed at once (and from the merge memory, or the next refresh would bring it back); a refusal restores it.
    editPost: (pid?: any, body?: any) => {
      const before = posts.find((x) => x.id === pid); const text = String(body || "").trim(); if (!before || !text || text === before.body) return; if (CLOUD && pendingPosts.current[pid]) { setMsg("انتظر لحظة حتى يكتمل نشر المنشور"); return; }
      recentOwn.current[pid] && (recentOwn.current[pid] = { ...recentOwn.current[pid], body: text });
      setPosts((ps) => ps.map((p) => p.id !== pid ? p : { ...p, body: text, edits: (p.edits || 0) + 1, editedAt: Date.now() }));
      sync(() => cloud.editPost(pid, text), (r: any) => { if (recentOwn.current[pid]) recentOwn.current[pid] = { ...recentOwn.current[pid], body: r.body, edits: r.edits, editedAt: r.editedAt }; setPosts((ps) => ps.map((p) => p.id !== pid ? p : { ...p, body: r.body, edits: r.edits, editedAt: r.editedAt })); },
        () => { if (recentOwn.current[pid]) recentOwn.current[pid] = { ...recentOwn.current[pid], body: before.body, edits: before.edits || 0, editedAt: before.editedAt || null }; setPosts((ps) => ps.map((p) => p.id !== pid ? p : { ...p, body: before.body, edits: before.edits || 0, editedAt: before.editedAt || null })); });
      setMsg("تم حفظ التعديل");
    },
    deletePost: (pid?: any) => {
      const before = posts.find((x) => x.id === pid); if (!before) return; if (CLOUD && pendingPosts.current[pid]) { setMsg("انتظر لحظة حتى يكتمل نشر المنشور"); return; } delete recentOwn.current[pid]; delete pendingPosts.current[pid];
      setPosts((ps) => ps.filter((p) => p.id !== pid)); setMsg("حُذف المنشور");
      sync(() => cloud.deletePost(pid), undefined, () => setPosts((ps) => (ps.some((p) => p.id === pid) ? ps : [before, ...ps])));
    },
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
    notifs: visibleNotifs, unread: visibleNotifs.filter((n) => !n.read).length, markRead: (id?: any) => { setNotifs((ns) => ns.map((n) => n.id === id ? { ...n, read: true } : n)); sync(() => cloud.markRead(id)); }, markAllRead: (cat?: any) => { setNotifs((ns) => ns.map((n) => (!cat || (n.category || notifCategory(n.kind)) === cat ? { ...n, read: true } : n))); sync(() => cloud.markRead(null, cat || null)); },
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
    sendMessage: (tid?: any, text?: any) => { later(() => askPush(), 2500); const g = screenLanguage(text); if (g.blocked) { setMsg("لم تُرسل — لغة غير لائقة"); return false; } setThreads((ts) => ts.map((t) => t.id === tid ? { ...t, messages: [...t.messages, { from: "me", text, at: `اليوم · ${clock()}` }] } : t)); sync(() => cloud.sendMessage(tid, text)); return true; },
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
    signOut: (already?: any) => { if (!already) sync(() => (CLOUD ? dropPush().catch(() => {}) : Promise.resolve()).then(() => cloud.signOut())); setSession(false); liveState().noDemo = true; setSheet(null); setStack([]); setEditing(false); setWelcome(false); setTabRaw("home"); setAuthView(loadAccount() ? "signin" : "signup"); setPersona(null); },
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
  // an account made with Google, Apple or a phone number fills the profile steps once, before anything else
  if (CLOUD && persona && profile.onboarded === false && !editing) return wrap(<div className={frameCls} style={frameStyle}><Registration app={app} mode="complete" initial={profile} /></div>);
  if (editing) return wrap(<div className={frameCls} style={frameStyle}><Registration app={app} mode="edit" initial={profile} /></div>);
  if (welcome) return wrap(<div className={frameCls} style={frameStyle}><Welcome app={app} /></div>);
  const top = stack[stack.length - 1];
  const screen = top && (blocked.stack.includes(top.type) || (top.type === "room" && blocked.rooms.includes(top.id))) ? <div className="pt-4"><Empty icon={LockKeyhole} title={closedTitleFor(profile)} body={denyFor(profile)} action="رجوع" onAction={app.pop} /></div>
    : top
    ? top.type === "post" ? <PostScreen app={app} id={top.id} /> : top.type === "company" ? <CompanyScreen app={app} id={top.id} /> : top.type === "job" ? <JobScreen app={app} id={top.id} /> : top.type === "room" ? <RoomScreen app={app} id={top.id} /> : top.type === "rooms" ? <RoomsScreen app={app} /> : top.type === "notifications" ? <NotificationsScreen app={app} /> : top.type === "notifprefs" ? <NotificationPrefsScreen app={app} /> : top.type === "chat" ? <ChatScreen app={app} id={top.id} /> : top.type === "cvreview" ? <Suspense fallback={<ScreenLoading />}><CVReviewScreen app={app} /></Suspense> : top.type === "support" ? <SupportScreen app={app} /> : top.type === "ticket" ? <TicketScreen key={top.id} app={app} id={top.id} /> : top.type === "checklists" || top.type === "inspection" ? <Suspense fallback={<ScreenLoading />}><ChecklistsScreen key={top.id || "list"} app={app} id={top.id} /></Suspense> : top.type === "permissions" ? <PermissionsScreen app={app} /> : top.type === "postjob" ? <PostJobScreen app={app} like={top.like} /> : top.type === "settings" ? <SettingsScreen app={app} /> : top.type === "guide" ? <GuideScreen app={app} /> : <ProfileScreen app={app} />
    : null;
  const tabScreen = (id?: any) => id === "home" ? <HomeScreen app={app} /> : id === "community" ? <CommunityScreen app={app} /> : id === "jobs" ? <JobsScreen app={app} /> : id === "market" ? <MarketScreen app={app} /> : id === "tools" ? <ToolsScreen app={app} /> : <InboxScreen app={app} />;
  const toolMeta = sheet?.type === "tool" && toolOpen(blocked, sheet.payload.id) ? TOOLS.find((t) => t.id === sheet.payload.id) : null; const ToolView = toolMeta ? TOOL_VIEWS[toolMeta.id] : null;
  const sheets: any = {
    pushprimer: ["الإشعارات", <PushPrimerSheet app={app} />],
    contribute: ["شارك راتبك", <ContributeSheet app={app} payload={sheet?.payload} />], compose: ["منشور جديد", <ComposeSheet app={app} payload={sheet?.payload} />], review: ["تقييم الشركة", <ReviewSheet app={app} payload={sheet?.payload} />],
    report: [`إبلاغ عن ${REPORT_KINDS[sheet?.payload?.kind] || "محتوى"}`, <ReportSheet app={app} payload={sheet?.payload} />], privacy: ["الخصوصية والأمان", <PrivacyBody />], methodology: ["المنهجية والمصادر", <MethodologySheet app={app} />], verify: ["التوثيق — اختياري", <VerifySheet app={app} />], user: [sheet?.payload?.as === "public" ? "الملف العلني" : "الملف المجهول", <UserSheet app={app} payload={sheet?.payload} />], logo: ["شعار الشركة", <LogoSheet app={app} payload={sheet?.payload} />],
    tool: [toolMeta?.name || "أداة", ToolView ? <ToolView app={app} payload={sheet?.payload || {}} /> : null],
  };
  const chatOpen = top && top.type === "chat"; const unreadThreads = threads.reduce((a, t) => a + (t.unread || 0), 0);
  // back swipe starts at the leading edge: the right edge in Arabic, the left edge in English
  const ltr = lang === "en";
  const onTouchStart = (e?: any) => { if (tourOn) return; const t = e.touches[0]; const el = scroller.current; const rect = el ? el.getBoundingClientRect() : { left: 0, width: 390 }; touch.current = { x: t.clientX, y: t.clientY, edge: ltr ? t.clientX < rect.left + 28 : t.clientX > rect.left + rect.width - 28, top: el ? el.scrollTop <= 0 : false, moved: false }; };
  const onTouchMove = (e?: any) => { const s = touch.current; if (!s) return; const t = e.touches[0]; const dx = t.clientX - s.x, dy = t.clientY - s.y; if (s.top && !top && dy > 0 && Math.abs(dy) > Math.abs(dx)) { paintPull(Math.min(96, dy * 0.6)); s.moved = true; } };
  const onTouchEnd = (e?: any) => { const s = touch.current; if (!s) return; const t = e.changedTouches[0]; const dx = t.clientX - s.x; if (s.edge && (ltr ? dx > 80 : dx < -80) && top) app.pop(); if (pull.current > 70) { if (typeof window !== "undefined" && typeof window.__engspaceBuildChanged === "function" && window.__engspaceBuildChanged()) { try { location.reload(); } catch (x) {} } else setRefreshing(true); } if (pull.current) paintPull(0); touch.current = null; };
  return wrap(
      <div className={frameCls} style={frameStyle} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        {/* while a sheet is open everything behind it is inert: no focus, no clicks, hidden from assistive tech */}
        <div className="contents" {...(sheet || viewer || tourOn ? { inert: "" } : {})}>
        <AppHeader app={app} />
        {!gate.ok && <div role="status" className="shrink-0 px-4 py-2 flex items-start gap-2 text-[11.5px] leading-snug bg-warn/10 text-warn border-b border-warn/20"><ShieldAlert size={14} className="shrink-0 mt-px" /><span>{gate.why}</span></div>}
        <UpdateBanner />
        <div className={`relative flex-1 min-h-0 ${top ? "pushed" : ""}`}>
          <div ref={pullEl} aria-hidden="true" className="absolute inset-x-0 top-0 z-[5] flex justify-center pointer-events-none will-change-transform" style={{ transform: `translate3d(0,${refreshing ? 12 : -44}px,0)`, opacity: refreshing ? 1 : 0, transition: `transform .3s ${EASE}, opacity .3s` }}><span ref={pullIcon} className={`grid place-items-center w-9 h-9 rounded-full bg-surface border border-line-2 shadow-float ${refreshing ? "spin" : ""}`}><ArchMark size={16} /></span></div>
          <div ref={scroller} onScroll={onScroll} className={`${chatOpen ? "h-full" : "scroll-area h-full"} relative px-4 pb-[var(--tabbar-space)] ${vtOK ? "vt-screen" : ""}`}>
            {top && <div key={`${top.type}-${top.id || ""}`} className={`screen-body ${chatOpen ? "h-full" : "min-h-full"} flex flex-col ${dir === "push" ? "screen-push" : dir === "pop" ? "screen-pop" : ""}`}>{screen}</div>}
            {visited.filter((id) => tabs.some((x) => x.id === id)).map((id) => <TabPane key={id} active={!top && id === curTab} render={() => tabScreen(id)} />)}
          </div>
          <TabBar tabs={tabs} active={curTab} onChange={app.setTab} badge={{ inbox: unreadThreads + app.unread }} off={!!top} />
        </div>
        </div>
        {viewer && <ImageViewer image={viewer} onClose={() => setViewer(null)} />}
        {tourOn && !sheet && !viewer && <Tour app={app} onClose={() => setTourOn(false)} />}
        {sheet && sheets[sheet.type] && <Sheet title={sheets[sheet.type][0]} onClose={app.closeSheet} tall={["compose", "contract", "methodology", "move", "contribute", "verify", "inflation"].includes(sheet.type === "tool" ? sheet.payload.id : sheet.type)}>{sheets[sheet.type][1]}</Sheet>}
        <div role="status" aria-live="polite" className={`absolute bottom-[calc(var(--tabbar-space)+8px)] inset-x-4 z-30 flex justify-center transition-all ${msg ? "opacity-100" : "opacity-0 translate-y-2 pointer-events-none"}`}>{msg && <span key={msg} className="toast-in inline-flex items-start gap-2 max-w-full px-4 py-2.5 rounded-2xl bg-elevated/95 backdrop-blur border border-line-2 text-[12.5px] leading-snug shadow-float"><CircleCheck size={15} className="react-pop text-accent shrink-0 mt-0.5" /><span>{msg}</span></span>}</div>
      </div>,
      <p className="hidden sm:block text-[11px] text-ink-3 text-center max-w-[48ch] leading-relaxed">معاينة تفاعلية كاملة · أنشئ حسابك (يُحفظ على جهازك فقط)، واختر في كل مشاركة: علنًا باسمك أو مجهولًا. اسحب من حافة البداية للرجوع.</p>
  );
}
