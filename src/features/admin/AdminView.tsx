import { useEffect, useMemo, useState } from "react";
import {
  Activity, BadgeCheck, Ban, Briefcase, ChartColumn, CheckCheck, CircleCheck, Copy, ExternalLink, Eye, EyeOff, 
  Flag, Gavel, Hourglass, IdCard, Layers, LayoutDashboard, LockKeyhole, Megaphone, MessageSquare, 
  MousePointerClick, RotateCcw, Scale, ScanSearch, ScrollText, Settings2, ShieldCheck, Siren, SlidersHorizontal, 
  Smartphone, TrendingUp, TriangleAlert, Undo2, UserCog, Users
} from "lucide-react";
import { COMPANIES, ROOMS, company, room } from "../../data/companies";
import { GOVS, govName } from "../../data/geo";
import { JOBS, NOTIFS0, POSTS0 } from "../../data/seed";
import { divOf } from "../../domain/division";
import { displayName, hasSession, loadAccount, memberAccId, normalizeAuthor, normalizeSeedPosts } from "../../domain/identity";
import { ACTION_LABELS, AUDIT0, AUDIT_ACTIONS, DAY, HOUR, MEMBERS_BASE, MOD0, MOD_CONFIG0, REPORT_KINDS, REPORT_KINDS_DEF, ROLE_GROUPS, WARN_TEMPLATES, activitySeries, agoText, buildAccounts, casesOf, ckey, coverageOf, daysText, decideCase, engagementOf, fmtClock, fmtDay, histogram, jobAnalytics, jobStats0, maskEmail, modUser, reasonOf, reopenCase, roleGroup, salarySample, seedReports, snapUGC, suspendText, threadsFor0, threadsKind, trendingDiscs, trendingTracks } from "../../domain/moderation";
import { DISC, EXP, REP_LEVELS, canVerifyRole, isCompanyRole, label, roleTitle, discTitle } from "../../domain/taxonomy";
import { detectContact, screenLanguage } from "../../domain/text-guard";
import { BoxRow, Choice, Columns, HBar, Kpi, PanelHead, STATUS_CHIP, SearchBox, SettingRow, SevChip, Stepper, ToneChip, accName, faceOf, usePeek } from "./kit";
import { VerifySection } from "./verify-admin";
import { credentialL2, dropOwnRequest, purgeRequest, rejectOf, seedVerifs, verifs0, verifySummary } from "../verify/verify";
import { L2, UGC, trIn } from "../../i18n/i18n";
import { DEMO_PERSONA, loadPersona, marketFor, savePersona } from "../../lib/helpers";
import { flatten } from "../../lib/posts";
import { liveState, storeFor, useStore } from "../../lib/runtime";
import { Empty, Seg, Stars } from "../../ui/chrome";
import { IdentityFace, IdentityTag, copyText } from "../../ui/identity";
import { Back, FilterChip, Num, Panel, Primary, Quiet, Secondary, Toggle } from "../../ui/primitives";
import { fmt } from "../../ui/theme";

import { isCloud } from "../../backend/config";
import { InflationPanel } from "./inflation-admin";
import * as cloud from "../../backend/cloud";
import { loadAdmin } from "./cloud-admin";
// =====================================================================
//  Admin console — moderation queue, members, analytics, content, settings, audit log
//  It reads and writes the app's own store: a report filed in the app lands here at once, and every decision shows up in the app.
// =====================================================================
export const ADMIN_SECTIONS = [["overview", "نظرة عامة", LayoutDashboard], ["queue", "البلاغات", Flag], ["verify", "طلبات التوثيق", IdCard], ["users", "الأعضاء", Users], ["analytics", "التحليلات", ChartColumn], ["content", "المحتوى", Layers], ["settings", "الإعدادات", SlidersHorizontal], ["audit", "سجل التدقيق", ScrollText]];


export function AdminView({ init, openApp }: any) {
  const store = storeFor("app"); const S = (k?: any, i?: any) => useStore(store, k, i);
  const [section, setSection] = useState<any>(ADMIN_SECTIONS.some((s) => s[0] === init.section) ? init.section : "overview");
  const [focus, setFocus] = useState<any>(null); const [focusUser, setFocusUser] = useState<any>(null); const [focusVerify, setFocusVerify] = useState<any>(null); const [msg, setMsg] = useState<any>("");
  const [reports, setReports] = S("reports", seedReports); const [mod, setMod] = S("mod", MOD0); const [audit, setAudit] = S("audit", AUDIT0); const [config, setConfigRaw] = S("config", () => ({ ...MOD_CONFIG0 }));
  const [verifs0_, setVerifs] = S("verifs", verifs0);
  const [posts0_] = S("posts", () => normalizeSeedPosts(POSTS0)); const [jobs0_] = S("jobs", JOBS); const [reviews0_] = S("reviews", {}); const [jobStats0_] = S("jobStats", jobStats0);
  // cloud: the console shows the live platform and acts through staff-only database functions; `live` is null while loading
  const CLOUD = isCloud(); const [live, setLive] = useState<any>(null); const [liveErr, setLiveErr] = useState<any>("");
  const reload = () => loadAdmin().then((d) => { setLive(d); setLiveErr(""); }, (e) => setLiveErr(e.message));
  // load only for a signed-in staff account (the server would refuse anyone else anyway)
  useEffect(() => { if (!CLOUD) return; cloud.currentPersona().then((p) => { if (!p) return; store.set("persona", (x) => ({ ...(x || {}), ...p })); if (store.has("profile")) store.set("profile", (x) => ({ ...(x || {}), ...p })); if (p.staff === "moderator" || p.staff === "admin") reload(); }); }, []);
  const act = (p?: any, done?: any) => Promise.resolve(p).then(() => { if (done) setMsg(done); return reload(); }, (e) => setMsg(e.message));
  const L: any = CLOUD ? live || { reports: [], mod: { users: {}, content: {} }, accounts: [], audit: [], verifs: [], posts: [], jobs: [], reviews: {}, config: null } : null;
  const reports_ = CLOUD ? L.reports : reports; const mod_ = CLOUD ? L.mod : mod; const audit_ = CLOUD ? L.audit : audit; const config_ = CLOUD ? { ...MOD_CONFIG0, ...(L.config || {}) } : config;
  const jobStats = CLOUD ? Object.fromEntries((L.jobs || []).map((j) => [j.id, j.stats])) : jobStats0_; const verifs = CLOUD ? L.verifs : verifs0_; const posts = CLOUD ? L.posts : posts0_; const jobs = CLOUD ? L.jobs : jobs0_; const reviews = CLOUD ? L.reviews : reviews0_;
  const [fallback] = useState<any>(() => (hasSession() && (CLOUD || loadAccount()) ? loadPersona() : null) || (CLOUD || liveState().noDemo ? null : DEMO_PERSONA));
  const persona = usePeek(store, "persona", fallback); const profile = usePeek(store, "profile", null) || persona;
  useEffect(() => { try { history.replaceState(null, "", "#admin/" + section); } catch (e) {} }, [section]);
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(""), 2800); return () => clearTimeout(t); }, [msg]);
  const now = Date.now(); const memberAcc = profile ? memberAccId(profile) : null;
  const cases = useMemo<any>(() => casesOf(reports_), [reports_]);
  const accounts = useMemo<any>(() => (CLOUD ? L.accounts : buildAccounts({ posts, jobs, reviews, reports, profile, mod, now })), [posts, jobs, reviews, reports, profile, mod, live]);
  const log = (action?: any, target?: any, detail: any = "") => setAudit((a) => [{ id: "L" + Date.now() + Math.floor(Math.random() * 1e3), at: Date.now(), who: "أنت (مشرف)", action, target, detail }, ...(a || [])]);
  const notifyMember = (n?: any) => store.set("notifs", (ns) => [{ id: "n" + Date.now() + Math.floor(Math.random() * 1e3), when: "الآن", read: false, target: { type: "profile" }, ...n }, ...(ns || NOTIFS0)]);
  // the signed-in member's own profile follows the console's decisions (badge, role) the same way a server push would
  const patchMember = (patch?: any) => { const base = persona || DEMO_PERSONA; const next: any = { ...base, ...patch }; const flip = patch.role && threadsKind({ role: patch.role }) !== threadsKind(base); store.set("persona", next); if (store.has("profile")) store.set("profile", (p) => ({ ...p, ...patch })); if (flip && store.has("threads")) store.set("threads", threadsFor0(next)); if (hasSession()) savePersona(next); };
  const A: any = {
    section, go: (s?: any, f: any = null) => { setSection(s); if (s === "queue") setFocus(f); if (s === "users") setFocusUser(f); if (s === "verify") setFocusVerify(f); }, toast: setMsg, now,
    reports: reports_, cases, mod: mod_, audit: audit_, config: config_, posts, jobs, reviews, jobStats, accounts, profile, memberAcc, cloud: CLOUD, live: L && L.live, focus, setFocus, focusUser, setFocusUser, verifs, focusVerify, setFocusVerify,
    // ---- verification: a reviewer's decision. The documents are purged in the same step — here and in the member's browser. ----
    decideVerify: (r?: any, d?: any) => {
      const now = Date.now(); const ok = !!d.approve; const n = (r.docs || []).length; const dv = ok && d.division ? divOf(d.division) : null;
      const done = purgeRequest(r, ok ? "approved" : "rejected", { decision: ok ? { by: "self", at: now, division: d.division || null, gradYear: d.gradYear || null, kind: d.kind } : { by: "self", at: now, reason: d.reason, note: d.note || "" } }, now);
      setVerifs((vs) => (vs || []).map((x) => (x.id === r.id ? done : x)));
      const cred = credentialL2(r.role, d.kind);
      log(ok ? "verify-ok" : "verify-no", r.acc, ok ? [r.id, cred.ar, dv ? dv.label : null, d.gradYear ? "دفعة " + d.gradYear : null].filter(Boolean).join(" · ") : `${r.id} · ${rejectOf(d.reason).ar}${d.note ? " — " + d.note : ""}`);
      log("purge", r.id, `حُذفت المستندات (${n}) نهائيًا فور القرار`);
      if (r.mine) {
        dropOwnRequest(); const sum = verifySummary(done, ok ? { division: d.division || null, gradYear: d.gradYear || null, kind: d.kind } : { reason: d.reason, note: d.note || "" });
        patchMember(ok ? { verified: true, pending: false, verifyKind: d.kind, division: d.division || null, ...(d.gradYear ? { gradYear: d.gradYear } : {}), verifyRef: r.id, verifyReq: sum } : { verified: false, pending: false, verifyKind: null, division: null, verifyRef: r.id, verifyReq: sum });
        const line = [cred, dv ? L2(dv.label, trIn("en", dv.label)) : null, d.gradYear ? L2("دفعة " + d.gradYear, "class of " + d.gradYear) : null].filter(Boolean);
        notifyMember(ok ? { kind: "verify", title: "وُثّق حسابك", body: `راجع فريق الإدارة مستنداتك واعتمدها: ${line.map((x) => x.ar).join(" · ")}. حُذفت المستندات نهائيًا فور المراجعة.`, en: { title: "Your account is verified", body: `Our administration team reviewed and approved your documents: ${line.map((x) => x.en).join(" · ")}. The documents were permanently deleted right after the review.` }, target: { type: "profile", sheet: "verify" } }
          : { kind: "verify", title: "لم يُعتمد طلب التوثيق", body: `السبب: ${rejectOf(d.reason).ar}.${d.note ? " ملاحظة المراجِع: " + d.note : ""} حُذفت المستندات نهائيًا فور المراجعة — يمكنك التقديم من جديد متى شئت.`, en: { title: "Verification request not approved", body: `Reason: ${rejectOf(d.reason).en}.${d.note ? " Reviewer's note: " + d.note : ""} The documents were permanently deleted right after the review — you can apply again any time.` }, target: { type: "profile", sheet: "verify" } });
      } else setMod((m) => modUser(m, r.acc, { verified: ok }));
      setMsg(ok ? `اعتُمد التوثيق — وحُذفت المستندات (${n}) نهائيًا` : `رُفض الطلب — وحُذفت المستندات (${n}) نهائيًا`);
    },
    openApp: (target?: any) => { if (target) { store.set("stack", [target]); store.set("dir", "push"); } openApp(); },
    decide: (c?: any, d?: any) => {
      const r = decideCase({ reports, mod, config }, c.key, d); if (!r) return; setReports(r.reports); setMod(r.mod);
      const what = r.actions.map((x) => ACTION_LABELS[x]).join(" · ");
      log(d.accept ? "accept" : "dismiss", c.key, (d.accept ? what : r.actions.includes("restore") ? "لا مخالفة · إعادة المحتوى" : "لا مخالفة") + (d.note ? " — " + d.note : ""));
      if (r.actions.includes("auto-suspend")) log("suspend", r.acc, `إيقاف تلقائي 7 أيام — ${config.strikeLimit} مخالفات مؤكدة`);
      if (c.mine) notifyMember(d.accept ? { kind: "report", title: "اتخذنا إجراءً بشأن بلاغك", body: `بلاغك عن ${REPORT_KINDS_DEF[c.kind]} («${reasonOf(c.top)[1]}») قُبل: ${what}. شكرًا لأنك تحمي المجتمع.` } : { kind: "report", title: "راجعنا بلاغك", body: `لم نجد مخالفة لإرشادات المجتمع في ${REPORT_KINDS_DEF[c.kind]} الذي أبلغت عنه.${d.note ? " ملاحظة المشرف: " + d.note : ""}` });
      if (d.accept && r.acc && r.acc === memberAcc) notifyMember({ kind: "mod", title: r.actions.some((x) => x.includes("suspend")) ? "أُوقف حسابك مؤقتًا" : d.warn ? "تحذير من فريق المجتمع" : "أُزيل محتوى نشرته", body: [d.warn ? `«${d.warn}»` : "", r.actions.includes("hide") ? `أُخفي ${REPORT_KINDS_DEF[c.kind]} بسبب: ${reasonOf(c.top)[1]}.` : "", r.actions.some((x) => x.includes("suspend")) ? "خلال الإيقاف يمكنك التصفح والقراءة فقط." : ""].filter(Boolean).join(" ") });
      setMsg(d.accept ? `نُفّذ القرار: ${what}` : "رُفض البلاغ — أُبلغ المُبلّغون بالنتيجة");
    },
    reopen: (c?: any) => { setReports((rs) => reopenCase(rs, c.key)); log("reopen", c.key, "أُعيدت القضية إلى قائمة البلاغات"); setMsg("أُعيد فتح القضية"); },
    setContent: (key?: any, hidden?: any, label?: any) => { setMod((m) => ({ ...m, content: { ...m.content, [key]: hidden ? { ...(m.content[key] || {}), hidden: true, by: "mod", at: Date.now(), reason: "قرار المشرف" } : { hidden: false, cleared: true, at: Date.now() } } })); log(hidden ? "hide" : "restore", key, label || ""); setMsg(hidden ? "أُخفي المحتوى عن الجميع" : "أُعيد المحتوى"); },
    warnUser: (acc?: any, text?: any) => { setMod((m) => { const u = (m.users || {})[acc.id] || {}; return modUser(m, acc.id, { warnings: (u.warnings || 0) + 1, lastWarning: text, status: u.status === "suspended" ? "suspended" : "warned" }); }); log("warn", acc.id, text); if (acc.member) notifyMember({ kind: "mod", title: "تحذير من فريق المجتمع", body: `«${text}»` }); setMsg(`أُرسل التحذير إلى ${accName(acc)}`); },
    suspend: (acc?: any, days?: any) => { setMod((m) => modUser(m, acc.id, { status: "suspended", permanent: !days, until: days ? Date.now() + days * DAY : null })); log("suspend", acc.id, `إيقاف ${suspendText(days)}`); if (acc.member) notifyMember({ kind: "mod", title: "أُوقف حسابك", body: days ? `أُوقف حسابك ${suspendText(days)} بقرار من فريق المجتمع — حتى ${fmtDay(Date.now() + days * DAY)}. يمكنك التصفح والقراءة فقط.` : "أُوقف حسابك نهائيًا بقرار من فريق المجتمع. يمكنك التصفح والقراءة فقط." }); setMsg(`أُوقف حساب ${accName(acc)}`); },
    unsuspend: (acc?: any) => { setMod((m) => modUser(m, acc.id, { status: (acc.warnings || 0) > 0 ? "warned" : "active", until: null, permanent: false })); log("unsuspend", acc.id, "رُفع الإيقاف"); if (acc.member) notifyMember({ kind: "mod", title: "رُفع الإيقاف عن حسابك", body: "يمكنك النشر والرد والمراسلة من جديد." }); setMsg(`رُفع الإيقاف عن ${accName(acc)}`); },
    // a badge is granted only by reviewing documents (decideVerify); here a moderator can only take one away
    setVerified: (acc?: any, on?: any) => {
      if (on || !canVerifyRole(acc.role)) return;
      if (acc.member) patchMember({ verified: false, pending: false, verifyKind: null, division: null });
      else setMod((m) => modUser(m, acc.id, { verified: false }));
      log("unverify", acc.id, "سُحبت شارة «موثّق»");
      if (acc.member) notifyMember({ kind: "verify", title: "سُحبت شارة «موثّق» من حسابك", body: "يمكنك التقديم من جديد من «حسابك» — يراجع فريق الإدارة المستندات يدويًا، ثم تُحذف نهائيًا فور المراجعة.", en: { title: "The “Verified” badge was removed from your account", body: "You can apply again from “Your account” — our administration team reviews the documents by hand, then deletes them permanently right after the review." }, target: { type: "profile", sheet: "verify" } });
      setMsg(`سُحبت الشارة من ${accName(acc)}`);
    },
    setRole: (acc?: any, role?: any) => { if (acc.member) patchMember({ role, ...(isCompanyRole(role) ? {} : { disc: profile.disc || "civil" }) }); else setMod((m) => modUser(m, acc.id, { role })); log("role", acc.id, `${roleTitle(acc.role)} ← ${roleTitle(role)}`); setMsg(`الدور الآن: ${roleTitle(role)}`); },
    setConfig: (patch?: any, what?: any) => { setConfigRaw((c) => ({ ...(c || MOD_CONFIG0), ...patch })); log(patch.announce ? "announce" : patch.closedRooms ? "room" : "config", "config", what); setMsg("حُفظ الإعداد — يسري في التطبيق فورًا"); },
    resetDemo: () => { setReports(seedReports()); setMod(MOD0()); setAudit(AUDIT0()); setConfigRaw({ ...MOD_CONFIG0 }); setVerifs((vs) => [...(vs || []).filter((r) => r.mine), ...seedVerifs()]); setFocus(null); setFocusUser(null); setFocusVerify(null); setMsg("أُعيدت بيانات الإشراف التجريبية"); },
  };
  if (CLOUD) Object.assign(A, {
    decide: (c?: any, d?: any) => act(cloud.admin.decide(c.kind, c.key.slice(c.kind.length + 1), { accept: !!d.accept, hide: d.hide !== false, warn: d.warn || null, suspendDays: d.suspendDays ?? null, note: d.note || "" }), d.accept ? "نُفّذ القرار — أُبلغ العضو والمُبلّغون" : "رُفض البلاغ — أُبلغ المُبلّغون بالنتيجة"),
    reopen: (c?: any) => act(cloud.admin.reopen(c.kind, c.key.slice(c.kind.length + 1)), "أُعيد فتح القضية"),
    setContent: (key?: any, hidden?: any) => { const [kind, ...rest] = String(key).split(":"); return act(cloud.admin.setHidden(kind, rest.join(":"), !!hidden), hidden ? "أُخفي المحتوى" : "أُعيد المحتوى"); },
    warnUser: (acc?: any, text?: any) => act(cloud.admin.warn(acc.id, text), "أُرسل التحذير"),
    suspend: (acc?: any, days?: any) => act(cloud.admin.setAccount(acc.id, { suspendDays: days || 0 }), `أُوقف الحساب ${suspendText(days)}`),
    unsuspend: (acc?: any) => act(cloud.admin.setAccount(acc.id, { lift: true }), "رُفع الإيقاف"),
    setVerified: (acc?: any, on?: any) => { if (on || !canVerifyRole(acc.role)) return; return act(cloud.admin.setAccount(acc.id, { verified: false }), "سُحبت الشارة"); },
    setRole: (acc?: any, role?: any) => act(cloud.admin.setAccount(acc.id, { role }), `الدور الآن: ${roleTitle(role)}`),
    setStaff: (acc?: any, staff?: any) => act(cloud.admin.setStaff(acc.id, staff), "حُفظت الصلاحية"),
    setConfig: (patch?: any) => act(cloud.admin.setConfig(patch), "حُفظ الإعداد — يسري في التطبيق فورًا"),
    decideVerify: (r?: any, d?: any) => { const why = d.approve ? null : [rejectOf(d.reason).ar, d.note].filter(Boolean).join(" — "); return act(cloud.admin.decideVerification(r.id, !!d.approve, { reason: why || undefined, division: d.division || undefined, kind: d.kind || undefined }), d.approve ? "اعتُمد التوثيق — وحُذفت المستندات نهائيًا" : "رُفض الطلب — وحُذفت المستندات نهائيًا"); },
    resetDemo: () => setMsg("غير متاح على المنصة الحية"),
  });
  // cloud: the console is for staff accounts only (the server enforces it on every call; this screen just says so)
  if (CLOUD && (!profile || !["moderator", "admin"].includes(profile.staff))) return (
    <main className="rise max-w-xl mx-auto px-4 py-16 text-center space-y-3">
      <ShieldCheck size={40} className="mx-auto text-accent" />
      <h1 className="text-[22px] font-medium">لوحة الإدارة لفريق المنصة فقط</h1>
      <p className="text-[13px] text-ink-2 leading-relaxed">{profile ? "حسابك ليس له صلاحية إشراف. يمنح المسؤول الصلاحيات من قسم «الأعضاء»." : "سجّل الدخول من التطبيق بحساب له صلاحية إشراف، ثم عُد إلى هذه الصفحة."}</p>
      <Secondary onClick={() => A.openApp()} className="h-10 text-[13px] mx-auto"><Smartphone size={15} /> افتح التطبيق</Secondary>
    </main>
  );
  if (CLOUD && !live) return <main className="rise max-w-xl mx-auto px-4 py-16 text-center text-[13px] text-ink-2">{liveErr || "جارٍ تحميل بيانات المنصة…"}</main>;
  const openCount = cases.filter((c) => c.status === "open").length; const verifyCount = verifs.filter((r) => r.status === "pending").length;
  const body = section === "queue" ? <QueueSection A={A} /> : section === "verify" ? <VerifySection A={A} /> : section === "users" ? <UsersSection A={A} /> : section === "analytics" ? <AnalyticsSection A={A} /> : section === "content" ? <ContentSection A={A} /> : section === "settings" ? <SettingsSection A={A} /> : section === "audit" ? <AuditSection A={A} /> : <OverviewSection A={A} />;
  return (
    <main className="rise max-w-7xl mx-auto px-4 md:px-8 py-5 md:py-8">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
        <div className="min-w-0"><h1 className="text-[22px] md:text-[26px] font-medium tracking-[-0.02em] flex items-center gap-2"><ShieldCheck size={24} className="text-accent" /> لوحة الإدارة</h1><p className="mt-1 text-[12.5px] text-ink-2 max-w-[74ch] leading-relaxed">لوحة فريق المنصة: البلاغات وطلبات التوثيق والأعضاء والتحليلات والمحتوى والإعدادات. تعمل على بيانات التطبيق نفسها — كل بلاغ ترسله من التطبيق يظهر هنا فورًا، وكل قرار هنا يظهر في التطبيق.</p></div>
        <div className="flex items-center gap-2 flex-wrap"><ToneChip tone="warn"><LockKeyhole size={12} /> للمشرفين فقط · مصادقة ثنائية في الإنتاج</ToneChip><Secondary onClick={() => A.openApp()} className="h-10 text-[13px]"><Smartphone size={15} /> افتح التطبيق</Secondary></div>
      </div>
      <div className="grid md:grid-cols-[200px_minmax(0,1fr)] gap-4 md:gap-6">
        <nav aria-label="أقسام لوحة الإدارة" className="md:sticky md:top-20 self-start min-w-0">
          <ul className="flex md:flex-col gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 pb-1">{ADMIN_SECTIONS.map(([id, l, I]: any) => { const on = section === id; return (
            <li key={id} className="shrink-0"><button type="button" aria-current={on ? "page" : undefined} onClick={() => A.go(id)} className={`press w-full inline-flex items-center gap-2.5 h-10 px-3 rounded-xl border text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${on ? "bg-wash border-accent/30 text-ink" : "border-transparent text-ink-2 hover:text-ink hover:bg-elevated/60"}`}><I size={16} className={on ? "text-accent" : ""} /><span className="whitespace-nowrap">{l}</span>{id === "queue" && openCount > 0 && <span className="ms-auto min-w-[20px] h-5 px-1.5 grid place-items-center rounded-full bg-bad text-white font-grotesk text-[10.5px] font-semibold">{openCount}</span>}{id === "verify" && verifyCount > 0 && <span className="ms-auto min-w-[20px] h-5 px-1.5 grid place-items-center rounded-full bg-warn text-white font-grotesk text-[10.5px] font-semibold">{verifyCount}</span>}</button></li>); })}</ul>
        </nav>
        <div key={section} className="min-w-0 screen-tab">{body}</div>
      </div>
      <div role="status" aria-live="polite" className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-[calc(100vw-2rem)] flex items-center gap-2 px-4 py-3 rounded-xl bg-elevated border border-line-2 text-[13px] shadow-float transition-all ${msg ? "opacity-100" : "opacity-0 translate-y-3 pointer-events-none"}`}>{msg && <><CircleCheck size={17} className="text-accent shrink-0" /><span>{msg}</span></>}</div>
    </main>
  );
}


export function OverviewSection({ A }: any) {
  const series = useMemo<any>(() => activitySeries(30), []); const today = series[series.length - 1]; const avg7 = Math.round(series.slice(-8, -1).reduce((a, d) => a + d.dau, 0) / 7);
  const open = A.cases.filter((c) => c.status === "open"); const urgent = open.filter((c) => c.sev === 3).length; const closed = A.cases.filter((c) => c.status !== "open" && c.resolution);
  const mttr = closed.length ? closed.reduce((a, c) => a + (c.resolution.at - c.first), 0) / closed.length / HOUR : 0; const late = open.filter((c) => A.now - c.first > A.config.slaHours * HOUR).length;
  const eligible = A.accounts.filter((a) => canVerifyRole(a.role)); const verified = eligible.filter((a) => a.verified).length / (eligible.length || 1);
  const waiting = A.verifs.filter((r) => r.status === "pending"); const oldest = waiting.reduce((m, r) => Math.min(m, r.at), Infinity); const cov = useMemo<any>(() => coverageOf(100), []); const ja = jobAnalytics(A.jobs.filter((j) => !(A.mod.content[ckey("job", j.id)] || {}).hidden), A.jobStats);
  const suspended = A.accounts.filter((a) => a.status === "suspended").length; const delta = Math.round(((today.dau - avg7) / avg7) * 100);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {A.live ? <>
          <Kpi icon={Users} label="الأعضاء المسجّلون" value={<Num>{fmt(A.live.members)}</Num>} sub={<>+<Num>{fmt(A.live.newMembers)}</Num> خلال 30 يومًا</>} />
          <Kpi icon={Activity} label="نشطون خلال 30 يومًا" value={<Num>{fmt(A.live.activeMembers)}</Num>} sub="نشروا أو ردّوا مرة على الأقل" />
        </> : <>
        <Kpi icon={Users} label="الأعضاء المسجّلون" value={<Num>{fmt(MEMBERS_BASE + A.accounts.length)}</Num>} sub={<>+<Num>{fmt(series.slice(-7).reduce((a, d) => a + d.signups, 0))}</Num> هذا الأسبوع</>} />
        <Kpi icon={Activity} label="نشطون اليوم" value={<Num>{fmt(today.dau)}</Num>} sub={<><Num className={delta >= 0 ? "text-good" : "text-warn"}>{delta >= 0 ? "+" : ""}{delta}%</Num> عن متوسط الأسبوع</>} />
        </>}
        <Kpi icon={Flag} tone="text-bad" label="بلاغات مفتوحة" value={<Num>{open.length}</Num>} sub={<><Num>{urgent}</Num> عاجلة · <Num>{late}</Num> تجاوزت <Num>{A.config.slaHours}</Num> ساعة</>} />
        <Kpi icon={Hourglass} label="متوسط زمن الحل" value={<><Num>{mttr.toFixed(1)}</Num> <span className="text-[14px] text-ink-2">ساعة</span></>} sub={<><Num>{closed.length}</Num> قضية مغلقة · <Num>{suspended}</Num> حساب موقوف</>} />
        <Kpi icon={IdCard} tone="text-warn" label="طلبات توثيق تنتظر المراجعة" value={<Num>{waiting.length}</Num>} sub={<>{waiting.length > 0 && <span className="block">أقدمها: {agoText(oldest, A.now)}</span>}<span className="block"><Num>{Math.round(verified * 100)}%</Num> من المهندسين والمشرفين موثّقون</span></>} />
        {A.live ? <Kpi icon={Scale} label="مشاركات الرواتب" value={<Num>{fmt(A.live.salaryShares)}</Num>} sub="خلال 30 يومًا — تظهر في السوق من 5 تقارير لكل خلية" />
          : <Kpi icon={Scale} label="تغطية شفافية الرواتب" value={<Num>{Math.round(cov * 100)}%</Num>} sub="خلايا (تخصص × خبرة × محافظة) بجودة «موثّق»: 100 تقرير أو أكثر" />}
        <Kpi icon={Briefcase} label="إعلانات وظائف نشطة" value={<Num>{ja.totals.jobs}</Num>} sub={<><Num>{fmt(ja.totals.contacts)}</Num> فتحوا بيانات التواصل</>} />
        <Kpi icon={MousePointerClick} label="معدل التواصل مع الشركات" value={<Num>{(ja.totals.rate * 100).toFixed(1)}%</Num>} sub="من مشاهدة الإعلان إلى فتح البريد أو الهاتف" />
      </div>
      <div className="grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-4">
        <Panel className="p-4"><PanelHead icon={Activity} title={A.live ? "المنشورات يوميًا — آخر 30 يومًا" : "النشطون يوميًا — آخر 30 يومًا"}><button type="button" onClick={() => A.go("analytics")} className="text-[12px] text-accent hover:underline underline-offset-4">كل التحليلات</button></PanelHead>{A.live ? <Columns data={liveDays(A.live)} value={(d) => d.posts} label="المنشورات يوميًا خلال 30 يومًا" h={140} /> : <><Columns data={series} value={(d) => d.dau} label="النشطون يوميًا خلال 30 يومًا" h={140} /><p className="mt-2 text-[11px] text-ink-3">الجمعة والسبت أقل نشاطًا — عطلة نهاية الأسبوع في مصر. سلسلة نموذجية ثابتة لكل يوم.</p></>}</Panel>
        <Panel className="p-4"><PanelHead icon={Siren} title="تحتاج قرارك الآن"><button type="button" onClick={() => A.go("queue")} className="text-[12px] text-accent hover:underline underline-offset-4">كل البلاغات</button></PanelHead>
          {open.length === 0 ? <p className="text-[12.5px] text-ink-2">لا بلاغات مفتوحة — القائمة نظيفة.</p> : <ul className="space-y-2">{open.slice(0, 4).map((c) => <li key={c.key}><button type="button" onClick={() => A.go("queue", c.key)} className="press w-full text-start p-3 rounded-xl border border-line hover:border-line-3 bg-canvas/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><div className="flex items-center gap-1.5 flex-wrap"><SevChip n={c.sev} /><ToneChip>{REPORT_KINDS[c.kind]}</ToneChip><span className="ms-auto text-[10.5px] text-ink-3">{agoText(c.first, A.now)}</span></div><p className="mt-1 text-[12.5px] leading-snug">{reasonOf(c.top)[1]} <span className="text-ink-3">· <Num>{c.reporters}</Num> مُبلّغ</span></p></button></li>)}</ul>}</Panel>
      </div>
      <Panel className="p-4"><PanelHead icon={ScrollText} title="آخر القرارات"><button type="button" onClick={() => A.go("audit")} className="text-[12px] text-accent hover:underline underline-offset-4">سجل التدقيق</button></PanelHead><AuditList items={A.audit.slice(0, 5)} now={A.now} /></Panel>
    </div>
  );
}


// ---- moderation queue ----
export function QueueSection({ A }: any) {
  const [st, setSt] = useState<any>("open"); const [kind, setKind] = useState<any>("all");
  const list = A.cases.filter((c) => (st === "all" || c.status === st) && (kind === "all" || c.kind === kind)); const sel = A.cases.find((c) => c.key === A.focus) || null;
  const count = (s?: any) => A.cases.filter((c) => s === "all" || c.status === s).length;
  return (
    <div className="grid xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-4">
      <div className={`space-y-3 min-w-0 ${sel ? "hidden xl:block" : ""}`}>
        <Choice label="حالة البلاغ" value={st} onChange={setSt} items={[["open", <>مفتوحة <Num>{count("open")}</Num></>], ["actioned", <>مقبولة <Num>{count("actioned")}</Num></>], ["dismissed", <>مرفوضة <Num>{count("dismissed")}</Num></>], ["all", "الكل"]]} />
        <div className="-mx-4 px-4 xl:mx-0 xl:px-0 flex xl:flex-wrap gap-1.5 overflow-x-auto no-scrollbar">{[["all", "كل الأنواع"], ...Object.entries(REPORT_KINDS)].map(([k, l]: any) => <FilterChip key={k} on={kind === k} onClick={() => setKind(k)}>{l}</FilterChip>)}</div>
        {list.length === 0 ? <Empty icon={CheckCheck} title="لا شيء هنا" body="لا بلاغات تطابق هذا المرشح." /> : <ul className="space-y-2">{list.map((c) => { const on = sel && sel.key === c.key; const hid = (A.mod.content[c.key] || {}).hidden; return (
          <li key={c.key}><button type="button" aria-current={on ? "true" : undefined} onClick={() => A.setFocus(c.key)} className={`press w-full text-start p-3.5 rounded-2xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${on ? "bg-wash border-accent/40" : "bg-surface border-line hover:border-line-3"}`}>
            <div className="flex items-center gap-1.5 flex-wrap">{c.status === "open" ? <SevChip n={c.sev} /> : <ToneChip tone={c.status === "actioned" ? "bad" : "default"}>{c.status === "actioned" ? "قُبل" : "رُفض"}</ToneChip>}<ToneChip>{REPORT_KINDS[c.kind]}</ToneChip>{hid && <ToneChip tone="warn"><EyeOff size={11} /> مخفي</ToneChip>}{c.mine && <ToneChip tone="accent">بلاغك</ToneChip>}<span className="ms-auto text-[10.5px] text-ink-3">{agoText(c.status === "open" ? c.first : c.resolution.at, A.now)}</span></div>
            <p className="mt-1.5 text-[13px] leading-snug">{reasonOf(c.top)[1]} <span className="text-ink-3">· <Num>{c.reporters}</Num> {c.reporters === 1 ? "مُبلّغ" : "مُبلّغين"}</span></p>
            <p {...snapUGC(c.snapshot)} className="mt-1 text-[12px] text-ink-2 leading-relaxed line-clamp-2 text-start">{c.snapshot ? c.snapshot.text : "—"}</p>
          </button></li>); })}</ul>}
      </div>
      <div className={`min-w-0 ${sel ? "" : "hidden xl:block"}`}>{sel ? <CaseDetail key={sel.key + sel.status} A={A} c={sel} /> : <Panel className="p-8 text-center text-[13px] text-ink-2"><Gavel size={28} className="mx-auto text-accent mb-2" />اختر بلاغًا لعرض المحتوى والإشارات الآلية واتخاذ القرار.</Panel>}</div>
    </div>
  );
}

export const SUSPEND_OPTS = [[null, "بدون إيقاف"], [1, "24 ساعة"], [7, "7 أيام"], [30, "30 يومًا"], [0, "دائم"]];

export function CaseDetail({ A, c }: any) {
  const s = c.snapshot || {}; const a = s.author || {}; const acc = A.accounts.find((x) => x.id === c.acc) || null; const lang = screenLanguage(s.text || ""); const contact = detectContact(s.text || ""); const cstate = A.mod.content[c.key] || {};
  const [hide, setHide] = useState(c.sev >= 2 && c.kind !== "user"); const [warn, setWarn] = useState(c.sev >= 2); const [warnText, setWarnText] = useState(WARN_TEMPLATES[c.top] || WARN_TEMPLATES.other); const [susp, setSusp] = useState<any>(null); const [note, setNote] = useState<any>("");
  const any = (hide && c.kind !== "user") || (warn && warnText.trim()) || susp !== null; const strikes = acc ? acc.strikes : 0;
  const signals = [
    lang.blocked && ["bad", `فلتر اللغة يحجب هذا النص: ${lang.hits.map((h) => h.label).join("، ")}`], !lang.blocked && lang.warnings.length > 0 && ["warn", `تنبيه لهجة: ${lang.warnings.join("، ")}`],
    contact.found && [c.top === "doxx" ? "bad" : "default", `يحتوي ${contact.hits.map((h) => h.label).join(" و")}${c.top === "doxx" ? " — يدعم بلاغ كشف الهوية" : " — مسموح عادةً على المنصة"}`],
    c.reporters >= 2 && ["warn", `${c.reporters} مُبلّغين من حسابات مختلفة · متوسط الثقة: ${REP_LEVELS[Math.round(c.trust)][0]}`],
    cstate.hidden && ["warn", cstate.by === "auto" ? `مخفي تلقائيًا ${agoText(cstate.at, A.now)} — بلغ حد الإخفاء (${A.config.autoHideAt} مُبلّغين)` : "مخفي بقرار مشرف"],
    cstate.cleared && !cstate.hidden && ["default", "سبق رفض بلاغ على هذا المحتوى — حد الإخفاء التلقائي مضاعف له"],
    acc && (acc.warnings || acc.strikes) ? ["warn", `سجل الحساب: ${acc.warnings} تحذير · ${acc.strikes} مخالفة مؤكدة${acc.status === "suspended" ? " · موقوف حاليًا" : ""}`] : acc ? ["good", "لا مخالفات سابقة لهذا الحساب"] : null,
    a.userRole && isCompanyRole(a.userRole) && ["accent", "صاحب المحتوى حساب شركة — الشكاوى ضد أصحاب العمل تُراجع بنفس المعايير دون محاباة"],
  ].filter(Boolean);
  return (
    <div className="space-y-3">
      <button type="button" onClick={() => A.setFocus(null)} className="xl:hidden inline-flex items-center gap-1.5 min-h-9 text-[12.5px] text-accent"><Back size={15} /> كل البلاغات</button>
      <Panel className="p-4">
        <div className="flex items-center gap-1.5 flex-wrap"><SevChip n={c.sev} /><ToneChip>{REPORT_KINDS[c.kind]}</ToneChip><Num className="text-[11px] text-ink-3">{c.id}</Num>{c.status !== "open" && <ToneChip tone={c.status === "actioned" ? "bad" : "default"}>{c.status === "actioned" ? "قُبل" : "رُفض"}</ToneChip>}<span className="ms-auto text-[11px] text-ink-3">أول بلاغ {agoText(c.first, A.now)}</span></div>
        <div className="mt-3 flex items-center gap-2.5"><IdentityFace a={a} size={38} /><div className="min-w-0"><div className="text-[13.5px] font-medium flex items-center gap-1.5 flex-wrap">{a.as === "public" ? displayName(a) : <Num>#{a.anon}</Num>}<IdentityTag as={a.as} />{a.verified && <BadgeCheck size={14} className="text-good" />}</div><div className="text-[11.5px] text-ink-2 leading-snug">{a.role}</div></div>{acc && <button type="button" onClick={() => A.go("users", acc.id)} className="ms-auto shrink-0 text-[11.5px] text-accent hover:underline underline-offset-4"><Num>{acc.id}</Num></button>}</div>
        <blockquote {...snapUGC(s)} className="mt-3 p-3.5 rounded-xl bg-canvas/60 border border-line text-[14px] leading-[1.85] whitespace-pre-line break-words text-start">{s.text || "—"}</blockquote>
        {s.image && <img src={s.image} alt="صورة المحتوى المُبلَّغ عنه" draggable={false} className="mt-2 w-full max-h-72 object-contain rounded-xl border border-line bg-canvas" />}
        {s.stars && <div className="mt-2"><Stars n={s.stars} /></div>}
        <p className="mt-2 text-[11px] text-ink-3">{s.where}{s.on && <> <bdi {...UGC} className="line-clamp-1">{s.on}</bdi></>}{s.link && <> · <button type="button" onClick={() => A.openApp(s.link)} className="text-accent hover:underline underline-offset-4">افتحه في التطبيق</button></>}</p>
      </Panel>
      <Panel className="p-4"><PanelHead icon={ScanSearch} title="إشارات آلية" /><ul className="space-y-1.5">{signals.map(([tone, t]: any, i) => <li key={i} className="flex items-start gap-2 text-[12.5px] leading-relaxed"><span className={`mt-2 w-1.5 h-1.5 rounded-full shrink-0 ${tone === "bad" ? "bg-bad" : tone === "warn" ? "bg-warn" : tone === "good" ? "bg-good" : tone === "accent" ? "bg-accent" : "bg-ink-4"}`} /><span className="text-ink-2">{t}</span></li>)}</ul><p className="mt-2 text-[10.5px] text-ink-3">الإشارات تساعد ولا تقرر — القرار بشري دائمًا ويُسجَّل باسم المشرف.</p></Panel>
      <Panel className="p-4"><PanelHead icon={Flag} title={<>البلاغات (<Num>{c.reports.length}</Num>)</>} /><ul className="divide-y divide-line">{c.reports.map((r) => <li key={r.id} className="py-2.5 text-[12.5px]"><div className="flex items-center gap-2 flex-wrap"><Num className="text-[11px] text-ink-3">{r.id}</Num><span>{reasonOf(r.reason)[1]}</span><span className="ms-auto text-[10.5px] text-ink-3">{agoText(r.at, A.now)}</span></div><div className="mt-0.5 text-[11px] text-ink-3">مُبلّغ مجهول · الثقة: {REP_LEVELS[Math.min(3, r.trust || 0)][0]}{r.mine ? " · بلاغك من التطبيق" : ""}{r.status !== "open" ? ` · ${r.status === "actioned" ? "قُبل" : "رُفض"}` : ""}</div>{r.note && <p className="mt-1 text-ink-2 leading-relaxed">«<span {...UGC}>{r.note}</span>»</p>}</li>)}</ul><p className="mt-2 text-[10.5px] text-ink-3 flex items-start gap-1.5"><LockKeyhole size={11} className="shrink-0 mt-0.5" /> هوية المُبلّغين لا تظهر للمشرفين ولا لصاحب المحتوى — مستوى الثقة فقط.</p></Panel>
      {c.status === "open" ? (
        <Panel className="p-4 border-accent/25"><PanelHead icon={Gavel} title="القرار" />
          <div className="space-y-3">
            {c.kind !== "user" && <label className="flex items-start gap-3 text-[13px] cursor-pointer"><input type="checkbox" checked={hide} onChange={(e) => setHide(e.target.checked)} className="mt-0.5 w-5 h-5 shrink-0 rounded accent-[rgb(var(--solid))]" /><span>إخفاء {REPORT_KINDS_DEF[c.kind]} عن الجميع<span className="block text-[11px] text-ink-3">يظهر مكانه «أُزيل بقرار فريق المجتمع»، ويعرف صاحبه السبب.</span></span></label>}
            <label className="flex items-start gap-3 text-[13px] cursor-pointer"><input type="checkbox" checked={warn} onChange={(e) => setWarn(e.target.checked)} className="mt-0.5 w-5 h-5 shrink-0 rounded accent-[rgb(var(--solid))]" /><span>تحذير صاحب المحتوى<span className="block text-[11px] text-ink-3">يصله إشعار بنص التحذير.</span></span></label>
            {warn && <textarea value={warnText} onChange={(e) => setWarnText(e.target.value.slice(0, 240))} rows={2} aria-label="نص التحذير" className="w-full p-3 rounded-xl bg-canvas border border-line-2 text-[13px] leading-[1.7] focus:outline-none focus:ring-2 focus:ring-accent resize-none" />}
            <div><p className="text-[12px] text-ink-2 mb-1.5">إيقاف الحساب</p><Choice label="مدة الإيقاف" value={susp} onChange={setSusp} items={SUSPEND_OPTS} /></div>
            <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 240))} rows={2} placeholder="ملاحظة داخلية — تُسجَّل في سجل التدقيق، وتصل للمُبلّغ عند الرفض" aria-label="ملاحظة المشرف" className="w-full p-3 rounded-xl bg-canvas border border-line-2 text-[13px] leading-[1.7] placeholder:text-ink-4 focus:outline-none focus:ring-2 focus:ring-accent resize-none" />
            {acc && <p className="text-[11px] text-ink-3">القبول يسجّل المخالفة المؤكدة رقم <Num>{strikes + 1}</Num> لهذا الحساب{A.config.strikeLimit > 0 ? <> — الإيقاف التلقائي 7 أيام عند <Num>{A.config.strikeLimit}</Num></> : ""}.</p>}
            <div className="flex gap-2 flex-wrap"><Primary disabled={!any} onClick={() => A.decide(c, { accept: true, hide: hide && c.kind !== "user", warn: warn && warnText.trim() ? warnText.trim() : null, suspendDays: susp, note: note.trim() })} className="flex-1 min-w-[200px] h-11 press"><Gavel size={15} /> قبول البلاغ وتنفيذ الإجراءات</Primary><Secondary onClick={() => A.decide(c, { accept: false, note: note.trim() })} className="flex-1 min-w-[160px] h-11">رفض — لا مخالفة{cstate.hidden && cstate.by === "auto" ? " وإعادة المحتوى" : ""}</Secondary></div>
          </div>
        </Panel>
      ) : (
        <Panel className="p-4"><PanelHead icon={Gavel} title="القرار المتخذ" /><p className="text-[13px] leading-relaxed">{c.resolution.accepted ? `قُبل البلاغ: ${c.resolution.actions.map((x) => ACTION_LABELS[x]).join(" · ") || "مخالفة مسجلة"}` : `رُفض البلاغ — لا مخالفة${c.resolution.actions.includes("restore") ? " · أُعيد المحتوى" : ""}`}</p>{c.resolution.note && <p className="mt-1 text-[12px] text-ink-2">«{c.resolution.note}»</p>}<p className="mt-1 text-[11px] text-ink-3">{fmtClock(c.resolution.at)}</p><Secondary onClick={() => A.reopen(c)} className="mt-3 h-10 text-[13px]"><Undo2 size={15} /> إعادة فتح القضية</Secondary></Panel>
      )}
    </div>
  );
}


// ---- members ----
export function UsersSection({ A }: any) {
  const [q, setQ] = useState<any>(""); const [grp, setGrp] = useState<any>("all"); const [st, setSt] = useState<any>("all"); const [ver, setVer] = useState<any>("all"); const [limit, setLimit] = useState(24);
  const nq = q.trim().replace(/^#/, "").toLowerCase();
  const list = A.accounts.filter((a) => (grp === "all" || roleGroup(a.role) === grp) && (st === "all" || a.status === st) && (ver === "all" || (ver === "yes") === !!a.verified) && (!nq || [a.id, a.name, a.anon, a.title].some((x) => x && String(x).toLowerCase().includes(nq))))
    .sort((x, y) => (y.member ? 1 : 0) - (x.member ? 1 : 0) || ["suspended", "warned", "active"].indexOf(x.status) - ["suspended", "warned", "active"].indexOf(y.status) || y.last - x.last);
  const sel = A.accounts.find((a) => a.id === A.focusUser) || null;
  return (
    <div className="grid xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-4">
      <div className={`space-y-3 min-w-0 ${sel ? "hidden xl:block" : ""}`}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{ROLE_GROUPS.map(([id, l]: any) => { const n = A.accounts.filter((a) => roleGroup(a.role) === id).length; return <button key={id} type="button" aria-pressed={grp === id} onClick={() => setGrp(grp === id ? "all" : id)} className={`press p-3 rounded-xl border text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${grp === id ? "bg-wash border-accent/40" : "bg-surface border-line hover:border-line-3"}`}><Num className="block text-[18px] font-semibold">{n}</Num><span className="text-[11.5px] text-ink-2">{l}</span></button>; })}</div>
        <SearchBox value={q} onChange={(v) => { setQ(v); setLimit(24); }} placeholder="ابحث برقم الحساب أو الاسم العلني أو المعرّف المجهول" />
        <div className="flex flex-wrap gap-x-4 gap-y-2"><Choice label="حالة الحساب" value={st} onChange={setSt} items={[["all", "كل الحالات"], ["active", "نشط"], ["warned", "تحذير"], ["suspended", "موقوف"]]} /><Choice label="التوثيق" value={ver} onChange={setVer} items={[["all", "الكل"], ["yes", "موثّق"], ["no", "غير موثّق"]]} /></div>
        <p className="text-[11.5px] text-ink-3"><Num>{list.length}</Num> حسابًا</p>
        <ul className="space-y-2">{list.slice(0, limit).map((a) => { const on = sel && sel.id === a.id; const [sl, stone] = STATUS_CHIP[a.status]; return (
          <li key={a.id}><button type="button" aria-current={on ? "true" : undefined} onClick={() => A.setFocusUser(a.id)} className={`press w-full grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-3 rounded-2xl border text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${on ? "bg-wash border-accent/40" : "bg-surface border-line hover:border-line-3"}`}>
            <IdentityFace a={faceOf(a)} size={36} />
            <span className="min-w-0"><span className="flex items-center gap-1.5 text-[13px] font-medium">{a.name ? <span className="truncate">{a.name}</span> : <Num>#{a.anon}</Num>}{a.verified && <BadgeCheck size={14} className="text-good shrink-0" />}{a.member && <ToneChip tone="accent" className="h-5 px-1.5 text-[10px]">حسابك</ToneChip>}</span><span className="block text-[11px] text-ink-2 truncate">{ROLE_GROUPS.find((g) => g[0] === roleGroup(a.role))[1]} · {a.title}</span></span>
            <span className="text-end"><ToneChip tone={stone}>{sl}</ToneChip><Num className="block mt-0.5 text-[10px] text-ink-3">{a.id}</Num></span>
          </button></li>); })}</ul>
        {list.length > limit && <Secondary onClick={() => setLimit((n) => n + 24)} className="w-full h-10 text-[13px]">عرض المزيد (<Num>{list.length - limit}</Num>)</Secondary>}
      </div>
      <div className={`min-w-0 ${sel ? "" : "hidden xl:block"}`}>{sel ? <UserDetail key={sel.id} A={A} acc={sel} /> : <Panel className="p-8 text-center text-[13px] text-ink-2"><UserCog size={28} className="mx-auto text-accent mb-2" />اختر حسابًا لإدارة التوثيق والدور والتحذيرات والإيقاف.</Panel>}</div>
    </div>
  );
}

export function UserDetail({ A, acc }: any) {
  const [warnText, setWarnText] = useState<any>(""); const [days, setDays] = useState(7); const grp = roleGroup(acc.role); const cases = A.cases.filter((c) => c.acc === acc.id);
  const [sl, stone] = STATUS_CHIP[acc.status]; const cred = !canVerifyRole(acc.role) ? "بلا توثيق — شارة الدور" : acc.verified ? (acc.role === "supervisor" ? "مؤهل موثّق" : acc.verifyKind === "certificate" ? "شهادة هندسية موثّقة" : "عضوية نقابة موثّقة") : "غير موثّق";
  const pendingReq = A.verifs.find((r) => r.acc === acc.id && r.status === "pending") || null;
  const facts: any = [["رقم الحساب", <Num>{acc.id}</Num>], ["الهوية المعروضة", acc.as === "public" ? "علنية بالاسم" : "مجهولة فقط"], ["الدور", roleTitle(acc.role, acc.gender)], ["التخصص", label(DISC, acc.disc)], ["المحافظة", govName(acc.gov)], ["الانضمام", fmtDay(acc.joined)], ["آخر نشاط", agoText(acc.last, A.now)], ["مشاركات", <Num>{acc.items}</Num>], ["تحذيرات", <Num>{acc.warnings}</Num>], ["مخالفات مؤكدة", <Num>{acc.strikes}</Num>]];
  return (
    <div className="space-y-3">
      <button type="button" onClick={() => A.setFocusUser(null)} className="xl:hidden inline-flex items-center gap-1.5 min-h-9 text-[12.5px] text-accent"><Back size={15} /> كل الأعضاء</button>
      <Panel className="p-4">
        <div className="flex items-center gap-3"><IdentityFace a={faceOf(acc)} size={52} /><div className="min-w-0 flex-1"><h3 className="text-[17px] font-medium leading-snug flex items-center gap-1.5 flex-wrap">{acc.name ? acc.name : <Num>#{acc.anon}</Num>}{acc.member && <ToneChip tone="accent">حسابك في التطبيق</ToneChip>}</h3><p className="text-[12px] text-ink-2 leading-snug">{acc.title}</p><div className="mt-1.5 flex flex-wrap gap-1.5"><ToneChip tone={stone}>{sl}{acc.status === "suspended" ? (acc.permanent ? " · دائم" : ` حتى ${fmtDay(acc.until)}`) : ""}</ToneChip><ToneChip tone={acc.verified ? "good" : "default"}>{acc.verified ? <BadgeCheck size={11} /> : null}{cred}</ToneChip></div></div></div>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 text-[11.5px]">{facts.map(([k, v]: any) => <div key={k} className="flex justify-between gap-2 border-b border-line py-1.5"><dt className="text-ink-3 shrink-0">{k}</dt><dd className="text-ink text-end leading-snug">{v}</dd></div>)}</dl>
        {acc.lastWarning && <p className="mt-2 text-[11.5px] text-warn leading-relaxed">آخر تحذير: «{acc.lastWarning}»</p>}
        <p className="mt-2 text-[10.5px] text-ink-3 leading-relaxed flex items-start gap-1.5"><LockKeyhole size={11} className="shrink-0 mt-0.5" />{acc.member ? <>البريد: <Num>{maskEmail(acc.email)}</Num> — مخفي جزئيًا. </> : null}لا يعرض هذا الملف الاسم أو البريد خلف هوية مجهولة، ولا يربط الهويتين — الإيقاف يُطبَّق على الحساب آليًا دون كشفه.</p>
      </Panel>
      <Panel className="p-4"><PanelHead icon={BadgeCheck} title="شارة «موثّق»">{acc.verified && canVerifyRole(acc.role) && <Secondary onClick={() => A.setVerified(acc, false)} className="h-9 px-3 text-[12.5px] text-bad">سحب الشارة</Secondary>}</PanelHead>
        <p className="text-[12px] text-ink-2 leading-relaxed">{!canVerifyRole(acc.role) ? "حسابات جهات العمل لا توثَّق ولا ترفع مستندات — تظهر بشارة دورها «صاحب عمل» أو «موارد بشرية»." : acc.verified ? [cred, acc.division && divOf(acc.division) ? divOf(acc.division).label : null, acc.gradYear ? "دفعة " + acc.gradYear : null].filter(Boolean).join(" · ") : "الحساب غير موثّق. تُمنح الشارة فقط بعد مراجعة المستندات يدويًا في «طلبات التوثيق»."}</p>
        <p className="mt-1.5 text-[11.5px] text-ink-3 leading-relaxed">لا تُحفظ صورة أي مستند بعد المراجعة: تُحذف نهائيًا لحظة القرار، ويبقى فقط الحالة والشعبة وسنة التخرج ورقم الطلب.</p>
        {pendingReq && <button type="button" onClick={() => A.go("verify", pendingReq.id)} className="mt-2 inline-flex items-center gap-1.5 min-h-9 text-[12.5px] text-accent hover:underline underline-offset-4"><IdCard size={14} /> طلب توثيق ينتظر المراجعة — افتحه</button>}</Panel>
      {A.cloud && A.profile && A.profile.staff === "admin" && <Panel className="p-4"><PanelHead icon={ShieldCheck} title="صلاحية الإدارة" /><Choice label="صلاحية الإدارة" value={acc.staff || "member"} onChange={(v) => { if (v !== (acc.staff || "member")) A.setStaff(acc, v); }} items={[["member", "عضو"], ["moderator", "مشرف"], ["admin", "مسؤول"]]} /><p className="mt-2 text-[11px] text-ink-3">المشرف يراجع البلاغات وطلبات التوثيق؛ المسؤول يدير الإعدادات والصلاحيات أيضًا.</p></Panel>}
      <Panel className="p-4"><PanelHead icon={UserCog} title="الدور" /><Choice label="الدور" value={grp} onChange={(g) => { if (g === grp) return; A.setRole(acc, g === "field" ? "supervisor" : g); }} items={ROLE_GROUPS.map(([id, l]: any) => [id, l])} />
        <p className="mt-2 text-[11px] text-ink-3 leading-relaxed">الدور يحدد الصلاحيات في التطبيق: المهندس يشارك الرواتب ويقيّم الشركات؛ مشرف الموقع للمجتمع فقط؛ الموارد البشرية وأصحاب العمل ينشرون الوظائف ولا يقيّمون ولا يوثَّقون.{acc.member ? " تغيير دور حسابك يظهر في التطبيق فورًا." : ""}</p></Panel>
      <Panel className="p-4"><PanelHead icon={TriangleAlert} title="تحذير" /><textarea value={warnText} onChange={(e) => setWarnText(e.target.value.slice(0, 240))} rows={2} placeholder="نص التحذير كما سيصل للعضو" aria-label="نص التحذير" className="w-full p-3 rounded-xl bg-canvas border border-line-2 text-[13px] leading-[1.7] placeholder:text-ink-4 focus:outline-none focus:ring-2 focus:ring-accent resize-none" />
        <div className="mt-2 flex gap-2 flex-wrap"><Secondary onClick={() => setWarnText(WARN_TEMPLATES.abuse)} className="h-9 px-3 text-[12px]">قالب: لغة</Secondary><Secondary onClick={() => setWarnText(WARN_TEMPLATES.spam)} className="h-9 px-3 text-[12px]">قالب: ترويج</Secondary><Primary disabled={warnText.trim().length < 8} onClick={() => { A.warnUser(acc, warnText.trim()); setWarnText(""); }} className="ms-auto h-9 px-4 text-[13px]">إرسال التحذير</Primary></div></Panel>
      <Panel className={`p-4 ${acc.status === "suspended" ? "border-bad/30" : ""}`}><PanelHead icon={Ban} title="الإيقاف" />
        {acc.status === "suspended" ? <div className="flex items-center justify-between gap-3 flex-wrap"><p className="text-[12.5px] text-ink-2">{acc.permanent ? "موقوف نهائيًا." : <>موقوف حتى {fmtDay(acc.until)}.</>} يستطيع التصفح والقراءة فقط.</p><Primary onClick={() => A.unsuspend(acc)} className="h-10 text-[13px]"><Undo2 size={15} /> رفع الإيقاف</Primary></div>
          : <><Choice label="مدة الإيقاف" value={days} onChange={setDays} items={SUSPEND_OPTS.filter((o) => o[0] !== null)} /><div className="mt-2 flex items-center justify-between gap-3 flex-wrap"><p className="text-[11px] text-ink-3">يمنع النشر والرد والتقييم والرسائل — والتصفح يبقى متاحًا.</p><Primary onClick={() => A.suspend(acc, days)} className="h-10 text-[13px] !bg-bad !text-white"><Ban size={15} /> إيقاف الحساب</Primary></div></>}</Panel>
      <Panel className="p-4"><PanelHead icon={Flag} title={<>بلاغات على هذا الحساب (<Num>{cases.length}</Num>)</>} />{cases.length === 0 ? <p className="text-[12.5px] text-ink-2">لا بلاغات.</p> : <ul className="space-y-1.5">{cases.map((c) => <li key={c.key}><button type="button" onClick={() => A.go("queue", c.key)} className="press w-full flex items-center gap-2 p-2.5 rounded-xl border border-line text-start text-[12.5px] hover:border-line-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><SevChip n={c.sev} /><span className="min-w-0 flex-1 truncate">{reasonOf(c.top)[1]} · {REPORT_KINDS[c.kind]}</span><ToneChip tone={c.status === "open" ? "accent" : c.status === "actioned" ? "bad" : "default"}>{c.status === "open" ? "مفتوح" : c.status === "actioned" ? "قُبل" : "رُفض"}</ToneChip></button></li>)}</ul>}</Panel>
    </div>
  );
}


// ---- analytics ----
// ---- live analytics (cloud): real counts from admin_analytics; the reference salary model stays as it is in the app ----
export const liveDays = (lv?: any) => (lv.daily || []).map((d) => ({ ...d, label: String(d.day).slice(5) }));
export function LiveAnalytics({ A }: any) {
  const lv = A.live; const days = liveDays(lv); const discs = Object.entries(lv.trendingDiscs || {}).sort((a: any, b: any) => b[1] - a[1]);
  const sal = Object.entries(lv.salaryByDisc || {}).sort((a: any, b: any) => b[1].median - a[1].median); const maxSal = Math.max(1, ...sal.map(([, v]: any) => v.median));
  const kpis = [["الأعضاء", lv.members], ["جدد (30 يومًا)", lv.newMembers], ["نشطون (30 يومًا)", lv.activeMembers], ["موثّقون", lv.verified], ["منشورات", lv.posts], ["ردود", lv.comments], ["مشاركات رواتب", lv.salaryShares], ["تقييمات شركات", lv.reviews], ["إعلانات وظائف", lv.jobs], ["فتحوا بيانات التواصل", lv.jobContacts], ["بلاغات مفتوحة", lv.openCases], ["توثيق ينتظر", lv.pendingVerifications]];
  return (
    <div className="space-y-4">
      <p className="text-[11px] text-ink-3">أرقام حية من قاعدة البيانات — آخر 30 يومًا ما لم يُذكر غير ذلك.</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">{kpis.map(([l, v]: any) => <Panel key={l} className="p-3"><p className="text-[11px] text-ink-2">{l}</p><p className="text-[20px] font-medium"><Num>{fmt(v || 0)}</Num></p></Panel>)}</div>
      <Panel className="p-4"><PanelHead icon={Activity} title="المنشورات والأعضاء الجدد يوميًا" /><Columns data={days} value={(d) => d.posts} label="المنشورات يوميًا" h={140} /><div className="mt-3"><Columns data={days} value={(d) => d.members} label="الأعضاء الجدد يوميًا" h={80} tone="bg-good" /></div></Panel>
      <div className="grid lg:grid-cols-2 gap-4">
        <Panel className="p-4"><PanelHead icon={TrendingUp} title="التخصصات الأكثر نشاطًا" />{discs.length ? <div className="space-y-2.5">{discs.map(([d, n]: any) => <HBar key={d} label={d === "other" ? "أخرى" : discTitle(d)} value={n} max={discs[0][1]} shown={<Num>{fmt(n)}</Num>} />)}</div> : <p className="text-[12px] text-ink-2">لا منشورات بعد.</p>}</Panel>
        <Panel className="p-4"><PanelHead icon={Scale} title="وسيط الرواتب المُبلّغ عنها" />{sal.length ? <div className="space-y-2.5">{sal.map(([d, v]: any) => <HBar key={d} label={`${discTitle(d)} · ${v.n} تقرير`} value={v.median} max={maxSal} shown={<><Num>{fmt(v.median)}</Num> ج.م</>} />)}</div> : <p className="text-[12px] text-ink-2">لا مشاركات رواتب بعد.</p>}</Panel>
      </div>
      <Panel className="p-4"><PanelHead icon={Users} title="الأعضاء حسب الدور" /><div className="flex flex-wrap gap-1.5">{Object.entries(lv.byRole || {}).map(([r, n]: any) => <ToneChip key={r} tone="info">{roleTitle(r)} <Num>{fmt(n)}</Num></ToneChip>)}</div></Panel>
    </div>
  );
}

export function AnalyticsSection({ A }: any) { return A.live ? <LiveAnalytics A={A} /> : <ModelAnalytics A={A} />; }
function ModelAnalytics({ A }: any) {
  const [days, setDays] = useState(30); const [exp, setExp] = useState<any>("3-5"); const [g, setG] = useState<any>("cairo");
  const series = useMemo<any>(() => activitySeries(days), [days]); const avg = Math.round(series.reduce((a, d) => a + d.dau, 0) / series.length); const mau = Math.round(avg * 3.9); const signups = series.reduce((a, d) => a + d.signups, 0); const shares = series.reduce((a, d) => a + d.shares, 0);
  const eng = useMemo<any>(() => engagementOf(A.posts), [A.posts]); const trend = useMemo<any>(() => trendingDiscs(days, A.posts, A.jobs), [days, A.posts, A.jobs]); const tracks = useMemo<any>(() => trendingTracks(days), [days]);
  const boxes = DISC.map(([d, l]: any) => ({ d, l, m: marketFor(d, exp, g) })); const lo = Math.min(...boxes.map((b) => b.m.p10)) * 0.9, hi = Math.max(...boxes.map((b) => b.m.p90)) * 1.05;
  const sample = useMemo<any>(() => salarySample(exp, g), [exp, g]); const hist = useMemo<any>(() => histogram(sample.map((x) => x.v)), [sample]);
  const ja = jobAnalytics(A.jobs.filter((j) => !(A.mod.content[ckey("job", j.id)] || {}).hidden), A.jobStats); const maxGrowth = Math.max(...trend.map((t) => Math.abs(t.growth)), 0.01);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap"><Choice label="الفترة" value={days} onChange={setDays} items={[[7, "7 أيام"], [30, "30 يومًا"], [90, "90 يومًا"]]} /><p className="text-[11px] text-ink-3">السلاسل الزمنية نموذجية وثابتة لكل يوم؛ المنشورات والوظائف والبلاغات حيّة من التطبيق.</p></div>
      <Panel className="p-4"><PanelHead icon={Activity} title="الأعضاء النشطون" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">{[["متوسط النشطين يوميًا", fmt(avg)], ["نشطون شهريًا (تقدير)", fmt(mau)], ["الالتصاق (يومي ÷ شهري)", `${Math.round((avg / mau) * 100)}%`], ["تسجيلات جديدة", fmt(signups)]].map(([k, v]: any) => <div key={k} className="px-3 py-2 rounded-xl bg-canvas/60 border border-line"><div className="text-[10.5px] text-ink-3">{k}</div><Num className="block text-[17px] font-semibold">{v}</Num></div>)}</div>
        <Columns data={series} value={(d) => d.dau} label={`النشطون يوميًا خلال ${days} يومًا`} h={150} /></Panel>
      <div className="grid lg:grid-cols-2 gap-4">
        <Panel className="p-4"><PanelHead icon={MessageSquare} title="التفاعل" />
          <div className="grid grid-cols-2 gap-2">{[["ردود لكل منشور", eng.perPost.toFixed(1)], ["منشورات تلقت ردًا", `${Math.round(eng.answered * 100)}%`], ["أسئلة لها إجابة معتمدة", `${Math.round(eng.best * 100)}%`], ["تفاعلات لكل منشور", eng.reactsPerPost.toFixed(1)], ["ردود بالأرقام", fmt(eng.numbers)], ["رواتب شاركها الأعضاء في الفترة", fmt(shares)]].map(([k, v]: any) => <div key={k} className="px-3 py-2 rounded-xl bg-canvas/60 border border-line"><div className="text-[10.5px] text-ink-3 leading-snug">{k}</div><Num className="block text-[17px] font-semibold">{v}</Num></div>)}</div>
          <p className="mt-3 mb-1.5 text-[11.5px] text-ink-2">المنشورات والردود حسب الغرفة</p><div className="space-y-2">{eng.byRoom.slice(0, 6).map((r) => <HBar key={r.id} label={r.name} value={r.posts + r.replies} max={eng.byRoom[0].posts + eng.byRoom[0].replies} shown={<><Num>{r.posts}</Num> منشور · <Num>{r.replies}</Num> رد</>} />)}</div></Panel>
        <Panel className="p-4"><PanelHead icon={TrendingUp} title="التخصصات الأكثر صعودًا" />
          <div className="space-y-2.5">{trend.map((t) => <HBar key={t.id} label={t.label} value={t.growth} max={maxGrowth} tone={t.growth >= 0 ? "bg-good" : "bg-warn"} shown={<Num className={t.growth >= 0 ? "text-good" : "text-warn"}>{t.growth >= 0 ? "+" : ""}{Math.round(t.growth * 100)}%</Num>} note={<>نشاط <Num>{fmt(t.cur)}</Num> مقابل <Num>{fmt(t.prev)}</Num> في الفترة السابقة · <Num>{t.jobs}</Num> وظيفة</>} />)}</div>
          <p className="mt-3 mb-1.5 text-[11.5px] text-ink-2">المسارات الأسرع نموًا</p><div className="flex flex-wrap gap-1.5">{tracks.map((t) => <ToneChip key={t.id} tone={t.growth >= 0 ? "good" : "warn"}>{t.label} <Num>{t.growth >= 0 ? "+" : ""}{Math.round(t.growth * 100)}%</Num></ToneChip>)}</div></Panel>
      </div>
      <Panel className="p-4"><PanelHead icon={Scale} title="توزيع الرواتب المرجعية"><select value={g} onChange={(e) => setG(e.target.value)} aria-label="المحافظة" className="h-9 px-3 rounded-xl bg-canvas border border-line-2 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-accent">{GOVS.map(([k, n]: any) => <option key={k} value={k}>{n}</option>)}</select></PanelHead>
        <div className="-mx-4 px-4 flex gap-1.5 overflow-x-auto no-scrollbar mb-2">{EXP.map(([id, l]: any) => <FilterChip key={id} on={exp === id} onClick={() => setExp(id)}>{l}</FilterChip>)}</div>
        <div className="grid lg:grid-cols-2 gap-5">
          <div>{boxes.map((b) => <BoxRow key={b.d} label={b.l} m={b.m} lo={lo} hi={hi} />)}<p className="mt-1 text-[10.5px] text-ink-3">الصندوق: الربع الأدنى إلى الأعلى · الخط: الوسط · الذراعان: P10–P90 — بالجنيه شهريًا، من نفس النموذج الذي يراه الأعضاء.</p></div>
          <div><p className="text-[11.5px] text-ink-2 mb-2">كل التقارير في هذه الخلية (<Num>{fmt(sample.length)}</Num> تقرير، كل التخصصات)</p><Columns data={hist.bins} value={(b) => b.n} label="توزيع تقارير الرواتب" h={150} tone="bg-info" xLabel={(b) => fmt(b.from)} /></div>
        </div></Panel>
      <Panel className="p-4"><PanelHead icon={Briefcase} title="التقديم على الوظائف" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">{[["وصل الإعلانات (إشعار أو «لك»)", fmt(ja.totals.reach)], ["مشاهدات الإعلانات", fmt(ja.totals.views)], ["فتحوا بيانات التواصل", fmt(ja.totals.contacts)], ["معدل التواصل", `${(ja.totals.rate * 100).toFixed(1)}%`]].map(([k, v]: any) => <div key={k} className="px-3 py-2 rounded-xl bg-canvas/60 border border-line"><div className="text-[10.5px] text-ink-3 leading-snug">{k}</div><Num className="block text-[17px] font-semibold">{v}</Num></div>)}</div>
        <div className="grid lg:grid-cols-2 gap-5">
          <div><p className="text-[11.5px] text-ink-2 mb-2">حسب التخصص</p><div className="space-y-2.5">{ja.byDisc.map((x) => <HBar key={x.d} label={`${x.l} · ${x.jobs} إعلان`} value={x.contacts} max={Math.max(...ja.byDisc.map((y) => y.contacts), 1)} shown={<><Num>{fmt(x.contacts)}</Num> تواصل · <Num>{(x.rate * 100).toFixed(1)}%</Num></>} />)}</div></div>
          <div><p className="text-[11.5px] text-ink-2 mb-2">أعلى الإعلانات معدل تواصل</p><ul className="divide-y divide-line text-[12px]">{ja.rows.slice(0, 6).map((r) => <li key={r.j.id} className="py-2 flex items-center justify-between gap-2"><span className="min-w-0"><span className="block truncate">{r.j.title}</span><span className="text-[10.5px] text-ink-3">{(company(r.j.co) || { name: r.j.coName || "شركة" }).name} · <Num>{fmt(r.views)}</Num> مشاهدة</span></span><Num className="shrink-0 font-semibold">{(r.rate * 100).toFixed(1)}%</Num></li>)}</ul></div>
        </div>
        <p className="mt-2 text-[10.5px] text-ink-3">التقديم نفسه خارج المنصة (بريد الشركة أو هاتفها): نقيس فتح بيانات التواصل فقط، ولا نعرف ولا نخزّن هوية من تقدّم.</p></Panel>
    </div>
  );
}


// ---- content & rooms & announcements ----
export function ContentSection({ A }: any) {
  const [tab, setTab] = useState<any>("posts"); const [q, setQ] = useState<any>(""); const [limit, setLimit] = useState(20);
  const items = useMemo<any>(() => {
    if (tab === "posts") return A.posts.map((p) => ({ key: ckey("post", p.id), text: p.body, a: p, meta: (room(p.room) || {}).name || "", link: { type: "post", id: p.id } }));
    if (tab === "comments") return A.posts.flatMap((p) => flatten(p.comments || []).map((c) => ({ key: ckey("comment", c.id), text: c.text, a: c, meta: "على:", on: String(p.body), link: { type: "post", id: p.id } })));
    if (tab === "reviews") return [...Object.entries(A.reviews).flatMap(([cid, list]: any) => (list || []).map((r) => ({ cid, r }))), ...COMPANIES.flatMap((c) => c.reviews.map((r, i) => ({ cid: c.id, r: { ...normalizeAuthor(r), id: `${c.id}#${i}` } })))].map(({ cid, r }) => ({ key: ckey("review", r.id), text: r.text, a: r, meta: `${company(cid).name} · ${r.stars}★`, link: { type: "company", id: cid } }));
    if (tab === "jobs") return A.jobs.map((j) => ({ key: ckey("job", j.id), text: `${j.title} — ${j.desc}`, a: null, meta: (company(j.co) || { name: j.coName || "شركة" }).name, link: { type: "job", id: j.id } }));
    return [];
  }, [tab, A.posts, A.reviews, A.jobs]);
  const nq = q.trim().toLowerCase(); const list = items.filter((x) => !nq || x.text.toLowerCase().includes(nq) || x.meta.toLowerCase().includes(nq) || (x.on || "").toLowerCase().includes(nq));
  const ann = A.config.announce || MOD_CONFIG0.announce; const [annText, setAnnText] = useState(ann.text || ""); const [annTone, setAnnTone] = useState(ann.tone || "info");
  return (
    <div className="space-y-4">
      <Seg value={tab} onChange={(t) => { setTab(t); setLimit(20); setQ(""); }} items={[["posts", "المنشورات"], ["comments", "الردود"], ["reviews", "التقييمات"], ["jobs", "الوظائف"], ["rooms", "الغرف والإعلانات"]]} />
      {tab !== "rooms" ? <>
        <SearchBox value={q} onChange={(v) => { setQ(v); setLimit(20); }} placeholder="ابحث في النص" />
        <p className="text-[11.5px] text-ink-3"><Num>{list.length}</Num> عنصر · <Num>{list.filter((x) => (A.mod.content[x.key] || {}).hidden).length}</Num> مخفي</p>
        <ul className="space-y-2">{list.slice(0, limit).map((x) => { const st = A.mod.content[x.key] || {}; return (
          <li key={x.key}><Panel className={`p-3.5 ${st.hidden ? "border-warn/30" : ""}`}>
            <div className="flex items-center gap-1.5 flex-wrap text-[11px]">{st.hidden ? <ToneChip tone="warn"><EyeOff size={11} /> {st.by === "auto" ? "مخفي تلقائيًا" : "أزاله مشرف"}</ToneChip> : <ToneChip tone="good">ظاهر</ToneChip>}{x.a && <span className="text-ink-2">{x.a.as === "public" ? displayName(x.a) : <Num>#{x.a.anon}</Num>}</span>}{x.a && x.a.mine && <ToneChip tone="accent">حسابك</ToneChip>}<span className="text-ink-3 truncate">· {x.meta}{x.on && <> <bdi {...UGC}>{x.on}</bdi></>}</span></div>
            <p {...UGC} className="mt-1.5 text-[13px] leading-relaxed line-clamp-2 text-start">{x.text}</p>
            <div className="mt-2 flex gap-2 flex-wrap">{st.hidden ? <Secondary onClick={() => A.setContent(x.key, false, x.text.slice(0, 60))} className="h-9 px-3 text-[12.5px]"><Eye size={14} /> إعادة إظهار</Secondary> : <Secondary onClick={() => A.setContent(x.key, true, x.text.slice(0, 60))} className="h-9 px-3 text-[12.5px]"><EyeOff size={14} /> إخفاء عن الجميع</Secondary>}<Quiet onClick={() => A.openApp(x.link)} className="h-9 px-2 text-[12.5px] text-accent"><ExternalLink size={14} /> افتحه في التطبيق</Quiet></div>
          </Panel></li>); })}</ul>
        {list.length > limit && <Secondary onClick={() => setLimit((n) => n + 20)} className="w-full h-10 text-[13px]">عرض المزيد (<Num>{list.length - limit}</Num>)</Secondary>}
      </> : <div className="grid lg:grid-cols-2 gap-4">
        <Panel className="p-4"><PanelHead icon={Megaphone} title="إعلان عام في رئيسية التطبيق"><Toggle on={!!ann.on} onChange={(v) => A.setConfig({ announce: { on: v, text: annText.trim(), tone: annTone } }, v ? "تشغيل الإعلان العام" : "إيقاف الإعلان العام")} label="إظهار الإعلان" /></PanelHead>
          <textarea value={annText} onChange={(e) => setAnnText(e.target.value.slice(0, 200))} rows={3} placeholder="مثال: تحديث بيانات الرواتب للربع الثالث متاح الآن — شارك رقمك ليدخل المتوسطات." aria-label="نص الإعلان" className="w-full p-3 rounded-xl bg-canvas border border-line-2 text-[13px] leading-[1.7] placeholder:text-ink-4 focus:outline-none focus:ring-2 focus:ring-accent resize-none" />
          <div className="mt-2 flex items-center justify-between gap-2 flex-wrap"><Choice label="نوع الإعلان" value={annTone} onChange={setAnnTone} items={[["info", "معلومة"], ["good", "خبر جيد"], ["warn", "تنبيه"]]} /><Primary disabled={annText.trim().length < 8} onClick={() => A.setConfig({ announce: { on: true, text: annText.trim(), tone: annTone } }, "نشر إعلان عام: " + annText.trim().slice(0, 50))} className="h-10 text-[13px]"><Megaphone size={15} /> نشر في التطبيق</Primary></div>
          <p className="mt-2 text-[11px] text-ink-3">{ann.on && ann.text ? <>يظهر الآن: «{ann.text}»</> : "لا إعلان ظاهر الآن."}</p></Panel>
        <Panel className="p-4"><PanelHead icon={Layers} title="الغرف — النشر فيها" /><ul className="divide-y divide-line">{ROOMS.map((r) => { const closed = !!(A.config.closedRooms || {})[r.id]; return <li key={r.id} className="py-2.5 flex items-center justify-between gap-3"><span className="min-w-0 flex items-center gap-2.5"><span className="grid place-items-center w-8 h-8 rounded-lg bg-wash text-accent shrink-0"><r.icon size={15} /></span><span className="min-w-0"><span className="block text-[13px] leading-snug">{r.name}</span><span className="block text-[10.5px] text-ink-3"><Num>{fmt(r.members)}</Num> عضو · {closed ? "مغلقة للنشر الجديد" : "مفتوحة"}</span></span></span><Toggle on={!closed} onChange={(v) => A.setConfig({ closedRooms: { ...(A.config.closedRooms || {}), [r.id]: !v } }, `${v ? "فتح" : "إغلاق"} النشر في ${r.name}`)} label={`النشر في ${r.name}`} /></li>; })}</ul><p className="mt-2 text-[11px] text-ink-3">الغرفة المغلقة تبقى مقروءة ويُسمح فيها بالردود — يتوقف فقط فتح نقاشات جديدة.</p></Panel>
      </div>}
    </div>
  );
}

export function SettingsSection({ A }: any) {
  const c = A.config; const [confirm, setConfirm] = useState(false); const Row = SettingRow;
  return (
    <div className="space-y-4">
      <Panel className="p-4"><PanelHead icon={Gavel} title="الإشراف" />
        <Row title="حد الإخفاء التلقائي" desc="عدد المُبلّغين المختلفين الذي يُخفي المحتوى حتى يقرر المشرف. صفر = إيقاف الإخفاء التلقائي. بعد رفض بلاغ على نفس المحتوى يتضاعف الحد."><Stepper label="حد الإخفاء التلقائي" value={c.autoHideAt} min={0} max={10} unit="مُبلّغين" onChange={(v) => A.setConfig({ autoHideAt: v }, `حد الإخفاء التلقائي: ${v}`)} /></Row>
        <Row title="حد المخالفات للإيقاف التلقائي" desc="عند بلوغ عدد المخالفات المؤكدة هذا الحد يُوقف الحساب 7 أيام تلقائيًا. صفر = إيقاف القاعدة."><Stepper label="حد المخالفات" value={c.strikeLimit} min={0} max={10} unit="مخالفات" onChange={(v) => A.setConfig({ strikeLimit: v }, `حد المخالفات: ${v}`)} /></Row>
        <Row title="مهلة مراجعة البلاغ" desc="الوعد الظاهر للمُبلّغ في التطبيق، ومؤشر «تجاوزت المهلة» في النظرة العامة."><Choice label="مهلة المراجعة" value={c.slaHours} onChange={(v) => A.setConfig({ slaHours: v }, `مهلة المراجعة: ${v} ساعة`)} items={[[12, "12 ساعة"], [24, "24 ساعة"], [48, "48 ساعة"]]} /></Row>
      </Panel>
      <Panel className="p-4"><PanelHead icon={Settings2} title="المنصة" />
        <Row title="مدة الاحتفاظ بالرسائل الخاصة" desc="تُمسح المحادثات تلقائيًا بعد هذه المدة. تظهر في رأس كل محادثة."><Choice label="مدة الاحتفاظ" value={c.dmDays} onChange={(v) => A.setConfig({ dmDays: v }, `الاحتفاظ بالرسائل: ${daysText(v)}`)} items={[[3, "3 أيام"], [7, "7 أيام"], [14, "14 يومًا"], [30, "30 يومًا"]]} /></Row>
        <Row title="وضع القراءة فقط" desc="للصيانة أو الطوارئ: يتوقف النشر والردود والتقييمات والرسائل لكل الأعضاء، ويظهر شريط توضيحي في التطبيق."><Toggle on={!!c.readOnly} onChange={(v) => A.setConfig({ readOnly: v }, v ? "تشغيل وضع القراءة فقط" : "إيقاف وضع القراءة فقط")} label="وضع القراءة فقط" /></Row>
      </Panel>
      <InflationPanel A={A} />
      <Panel className="p-4 border-bad/20"><PanelHead icon={RotateCcw} title="بيانات المعاينة" /><p className="text-[12px] text-ink-2 leading-relaxed">تعيد البلاغات والقرارات والإعدادات إلى البيانات التجريبية الأولى. لا تمس حسابك أو منشوراتك.</p>
        {!confirm ? <Secondary onClick={() => setConfirm(true)} className="mt-3 h-10 text-[13px]"><RotateCcw size={15} /> إعادة ضبط بيانات الإشراف</Secondary> : <div className="mt-3 flex gap-2 flex-wrap"><Primary onClick={() => { A.resetDemo(); setConfirm(false); }} className="h-10 text-[13px] !bg-bad !text-white">تأكيد إعادة الضبط</Primary><Secondary onClick={() => setConfirm(false)} className="h-10 text-[13px]">تراجع</Secondary></div>}</Panel>
    </div>
  );
}


// ---- audit log ----
export function AuditList({ items, now }: any) {
  if (!items.length) return <p className="text-[12.5px] text-ink-2">لا شيء في السجل.</p>;
  return <ul className="divide-y divide-line">{items.map((e) => { const [l, tone] = AUDIT_ACTIONS[e.action] || [e.action, "default"]; return <li key={e.id} className="py-2.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-[12.5px]"><ToneChip tone={tone} className="row-span-2 self-start">{l}</ToneChip><span className="min-w-0 leading-relaxed">{e.detail || "—"}</span><span className="text-[10.5px] text-ink-3">{e.who} · <Num>{e.target}</Num> · {agoText(e.at, now)}</span></li>; })}</ul>;
}

export function AuditSection({ A }: any) {
  const [f, setF] = useState<any>("all"); const list = A.audit.filter((e) => f === "all" || (AUDIT_ACTIONS[e.action] || [])[2] === f);
  return (
    <Panel className="p-4"><PanelHead icon={ScrollText} title="سجل التدقيق"><Secondary onClick={() => { copyText(list.map((e) => [fmtClock(e.at), e.who, (AUDIT_ACTIONS[e.action] || [e.action])[0], e.target, e.detail].join(" | ")).join("\n")); A.toast("نُسخ السجل"); }} className="h-9 px-3 text-[12.5px]"><Copy size={14} /> نسخ السجل</Secondary></PanelHead>
      <div className="mb-2"><Choice label="نوع الإجراء" value={f} onChange={setF} items={[["all", "الكل"], ["cases", "قرارات البلاغات"], ["verify", "التوثيق"], ["users", "الأعضاء"], ["content", "المحتوى"], ["settings", "الإعدادات"]]} /></div>
      <AuditList items={list} now={A.now} /><p className="mt-3 text-[10.5px] text-ink-3">كل إجراء في اللوحة يُسجَّل هنا باسم المشرف ووقته، ولا يمكن حذفه من اللوحة.</p></Panel>
  );
}
