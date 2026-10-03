import { COMPANIES, ROOMS, company, room } from "../data/companies";
import { GOVS } from "../data/geo";
import { JOBS, POSTS0, THREADS0 } from "../data/seed";
import { accIdOf, authorKey, authorOf, cleanName, fnv, isSelf, memberAccId, normalizeAuthor, normalizeSeedPosts, normalizeThreads, pickAuthor, yearsText } from "./identity";
import { DISC, EXP, canVerifyRole, discTitle, isCompanyRole, label, roleTitle, trackLabel, tracksFor } from "./taxonomy";
import { UGC, uiLocale } from "../i18n/i18n";
import { hex4, marketFor, personaTitle, rand, reachFor, sampleSize, seedOf } from "../lib/helpers";
import { countComments, flatten } from "../lib/posts";

// =====================================================================
//  Reporting & moderation — the rules (pure functions shared by the app and the admin console)
//  · Any member can report a post, a reply, a company review, a job ad, a private message or a member profile. Reports are
//    anonymous: the author never learns who reported, and moderators see only the reporter's trust level.
//  · Reports on one item form one case. When distinct reporters reach the auto-hide threshold the item is hidden until a
//    moderator decides. A dismissed case doubles that threshold for the item, so a brigade cannot hide it again.
//  · Decisions (warn · hide · suspend · dismiss) go to the audit log, and every reporter hears the outcome.
//  · Moderation acts on an internal account id. The console never shows the name or e-mail behind an anonymous identity.
// =====================================================================
export const HOUR = 3600e3, DAY = 864e5;
 export const T0 = Date.now();

export const ckey = (kind?: any, id?: any) => `${kind}:${id}`;

export const REPORT_KINDS = { post: "منشور", comment: "رد", review: "تقييم شركة", job: "إعلان وظيفة", message: "رسالة خاصة", user: "حساب عضو" };

export const REPORT_KINDS_DEF = { post: "المنشور", comment: "الرد", review: "التقييم", job: "إعلان الوظيفة", message: "الرسالة الخاصة", user: "الحساب" };

export const ALL_KINDS = Object.keys(REPORT_KINDS);

// [id, label, severity 1–3, kinds it applies to]
export const REPORT_REASONS: any = [
  ["doxx", "يكشف هوية شخص أو بياناته الخاصة", 3, ["post", "comment", "review", "message"]],
  ["threat", "تهديد أو ابتزاز", 3, ALL_KINDS],
  ["harass", "تحرّش أو إيحاء", 3, ["post", "comment", "message", "user"]],
  ["scam", "احتيال أو طلب مال أو رسوم", 3, ["job", "message", "post", "user"]],
  ["abuse", "سباب أو إهانة أو كراهية", 2, ["post", "comment", "review", "message", "user"]],
  ["fakejob", "وظيفة وهمية أو جهة غير حقيقية", 2, ["job"]],
  ["discrim", "تمييز في الإعلان (السن، النوع، الدين…)", 2, ["job"]],
  ["fakereview", "تقييم مزيف أو مكتوب من داخل الشركة", 2, ["review"]],
  ["impersonate", "انتحال صفة مهندس أو شركة", 2, ["user", "post", "comment", "message", "job"]],
  ["misinfo", "أرقام أو معلومات مضللة", 1, ["post", "comment", "review", "job"]],
  ["spam", "إعلان تجاري أو سبام", 1, ["post", "comment", "message", "job", "user"]],
  ["other", "سبب آخر — أكتبه للمشرفين", 1, ALL_KINDS],
];

export const reasonOf = (id?: any) => REPORT_REASONS.find((r) => r[0] === id) || REPORT_REASONS[REPORT_REASONS.length - 1];

export const reasonsFor = (kind?: any) => REPORT_REASONS.filter((r) => r[3].includes(kind));

export const SEVERITY = { 1: ["عادي", "text-ink-2 bg-elevated/80 border-line"], 2: ["مهم", "text-warn bg-warn/15 border-warn/25"], 3: ["عاجل", "text-bad bg-bad/15 border-bad/25"] };

export const MOD_CONFIG0 = { autoHideAt: 3, strikeLimit: 3, slaHours: 24, dmDays: 7, readOnly: false, announce: { on: false, text: "", tone: "info" }, closedRooms: {} };

export const ACTION_LABELS = { hide: "إخفاء المحتوى", warn: "تحذير صاحبه", suspend: "إيقاف الحساب", "auto-suspend": "إيقاف تلقائي 7 أيام (بلغ حد المخالفات)", restore: "إعادة المحتوى" };

export const suspendText = (d?: any) => (!d ? "نهائيًا" : d === 1 ? "24 ساعة" : daysText(d));

export const daysText = (n?: any) => (n === 1 ? "يوم" : n === 2 ? "يومين" : n <= 10 ? `${n} أيام` : `${n} يومًا`);

export const agoText = (ms?: any, now: any = Date.now()) => {
  const m = Math.max(0, Math.round((now - ms) / 60000)); if (m < 1) return "الآن";
  if (m < 60) return m === 1 ? "منذ دقيقة" : m === 2 ? "منذ دقيقتين" : m <= 10 ? `منذ ${m} دقائق` : `منذ ${m} دقيقة`;
  const h = Math.round(m / 60); if (h < 24) return h === 1 ? "منذ ساعة" : h === 2 ? "منذ ساعتين" : h <= 10 ? `منذ ${h} ساعات` : `منذ ${h} ساعة`;
  const d = Math.round(h / 24); return d === 1 ? "منذ يوم" : d === 2 ? "منذ يومين" : d <= 10 ? `منذ ${d} أيام` : `منذ ${d} يومًا`;
};

export const fmtDay = (ms?: any) => { try { return new Date(ms).toLocaleDateString(uiLocale(), { day: "numeric", month: "long" }); } catch (e) { return new Date(ms).toISOString().slice(0, 10); } };

export const fmtClock = (ms?: any) => { try { return new Date(ms).toLocaleString(uiLocale(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); } catch (e) { return new Date(ms).toISOString().slice(0, 16).replace("T", " "); } };


// What a moderator sees: the reported text as it was at report time, its author snapshot, and where it lives in the app.
// The text is shown exactly as written (a moderator judges the original words, in any interface language); `sys` marks
// the app's own placeholder when there is no text to show.
export const snapUGC = (s?: any) => (s && !s.sys ? UGC : null);

export function snapshotFor(kind?: any, id?: any, src: any = {}, extra: any = {}) {
  const posts = src.posts || [], jobs = src.jobs || [], threads = src.threads || [], reviews = src.reviews || {};
  if (kind === "post") { const p = posts.find((x) => x.id === id); return p ? { text: p.body, image: p.image ? p.image.src : null, author: pickAuthor(p), self: !!p.mine, where: "منشور في " + ((room(p.room) || {}).name || "المجتمع"), link: { type: "post", id } } : null; }
  if (kind === "comment") { for (const p of posts) { const c = flatten(p.comments || []).find((x) => x.id === id); if (c) return { text: c.text, author: pickAuthor(c), self: !!c.mine, where: "رد على منشور:", on: String(p.body), link: { type: "post", id: p.id } }; } return null; }
  if (kind === "review") { const cid = String(id).split("#")[0]; const c = company(cid); if (!c) return null; const list: any = [...(reviews[cid] || []), ...c.reviews.map((r, i) => ({ ...r, id: r.id || `${cid}#${i}` }))]; const r = list.find((x) => x.id === id); return r ? { text: r.text, stars: r.stars, author: pickAuthor(normalizeAuthor(r)), self: !!r.mine, where: "تقييم " + c.name, link: { type: "company", id: cid } } : null; }
  if (kind === "job") { const j = jobs.find((x) => x.id === id); if (!j) return null; const co = company(j.co) || { name: j.coName || "شركة" }; return { text: `${j.title} — ${j.desc}`, author: j.mine && src.profile ? pickAuthor(authorOf(src.profile, "anon")) : { as: "anon", anon: hex4(seedOf(j.co)), userRole: "hr", verified: true, verifyKind: "company", level: 1, role: `موارد بشرية · ${co.name}` }, self: !!j.mine, where: "إعلان وظيفة · " + co.name, link: { type: "job", id } }; }
  if (kind === "message") { const t = threads.find((x) => x.id === id); if (!t) return null; const them = t.messages.filter((m) => m.from === "them").slice(-3).map((m) => m.text); return { text: them.join("\n") || "(لم يرسل الطرف الآخر شيئًا بعد)", sys: !them.length, author: pickAuthor({ ...t.with, userRole: t.with.role, role: t.with.title }), self: false, where: "رسالة خاصة · " + t.ctx.label, link: { type: "chat", id } }; }
  if (kind === "user") { const a = extra.author || {}; return { text: extra.text || "بلاغ عن الحساب نفسه — لا عن محتوى بعينه.", sys: !extra.text, author: pickAuthor(a), self: false, where: "ملف عضو", link: null }; }
  return null;
}


// A case = every report on one item. It is open while any of its reports is open.
export function casesOf(reports?: any) {
  const groups = new Map();
  reports.forEach((r) => { const g = groups.get(r.key) || { key: r.key, kind: r.kind, target: r.target, acc: r.acc, snapshot: null, reports: [] }; g.reports.push(r); if (!g.snapshot && r.snapshot) g.snapshot = r.snapshot; groups.set(r.key, g); });
  const cases = [...groups.values()].map((g) => {
    const open = g.reports.filter((r) => r.status === "open"); const done = g.reports.filter((r) => r.resolution).sort((a, b) => b.resolution.at - a.resolution.at);
    const live = open.length ? open : done.filter((r) => r.resolution.at === (done[0] && done[0].resolution.at)); const basis = live.length ? live : g.reports;
    const counts: any = {}; basis.forEach((r) => { counts[r.reason] = (counts[r.reason] || 0) + 1; });
    const top = Object.keys(counts).sort((a, b) => (counts[b] as number) - (counts[a] as number) || reasonOf(b)[2] - reasonOf(a)[2])[0];
    return { ...g, id: [...g.reports].sort((a, b) => a.at - b.at)[0].id, open: open.length, status: open.length ? "open" : (done[0] ? done[0].status : "open"), resolution: open.length ? null : (done[0] ? done[0].resolution : null),
      sev: Math.max(...basis.map((r) => reasonOf(r.reason)[2])), counts, top, reporters: new Set(basis.map((r) => r.by)).size, trust: basis.reduce((a, r) => a + (r.trust || 0), 0) / basis.length,
      first: Math.min(...basis.map((r) => r.at)), last: Math.max(...basis.map((r) => r.at)), mine: g.reports.some((r) => r.mine && r.status === "open") };
  });
  // open first; then the most severe; then the most distinct reporters; then the oldest (the service-level clock runs from the first report)
  return cases.sort((a, b) => Number(b.status === "open") - Number(a.status === "open") || (a.status === "open" ? b.sev - a.sev || b.reporters - a.reporters || a.first - b.first : (b.resolution ? b.resolution.at : 0) - (a.resolution ? a.resolution.at : 0)));
}

export const openReporters = (reports?: any, key?: any) => new Set(reports.filter((r) => r.key === key && r.status === "open").map((r) => r.by)).size;

// Filing a report: add it, then hide the item for everyone once enough DISTINCT members reported it (the same member twice counts once)
export function fileReport(state?: any, rep?: any) {
  const reports: any = [rep, ...state.reports]; const mod = state.mod; const cfg = state.config || MOD_CONFIG0; const cur = mod.content[rep.key];
  const need = cfg.autoHideAt * (cur && cur.cleared ? 2 : 1); const hide = cfg.autoHideAt > 0 && !(cur && cur.hidden) && openReporters(reports, rep.key) >= need;
  return { reports, mod: hide ? { ...mod, content: { ...mod.content, [rep.key]: { ...(cur || {}), hidden: true, by: "auto", at: rep.at } } } : mod, autoHidden: hide };
}

// A moderator's decision on a case. d = { accept, hide, warn: text | null, suspendDays: null (none) | 0 (permanent) | days, note }
export function decideCase(state?: any, key?: any, d?: any, now: any = Date.now()) {
  const { reports, mod } = state; const cfg = state.config || MOD_CONFIG0; const open = reports.filter((r) => r.key === key && r.status === "open"); if (!open.length) return null;
  const kind = open[0].kind; const acc = open[0].acc; const content: any = { ...mod.content }; const users: any = { ...mod.users }; const actions: any = [];
  if (d.accept) {
    const u: any = { warnings: 0, strikes: 0, ...(users[acc] || {}) };
    if (d.hide && kind !== "user") { content[key] = { ...(content[key] || {}), hidden: true, by: "mod", at: now, reason: reasonOf(open[0].reason)[1] }; actions.push("hide"); }
    if (d.warn) { u.warnings += 1; u.lastWarning = d.warn; if (u.status !== "suspended") u.status = "warned"; actions.push("warn"); }
    if (d.suspendDays != null) { u.status = "suspended"; u.permanent = !d.suspendDays; u.until = d.suspendDays ? now + d.suspendDays * DAY : null; actions.push("suspend"); }
    u.strikes += 1;
    const stillOn = u.status === "suspended" && (u.permanent || (u.until && u.until > now));
    if (cfg.strikeLimit > 0 && u.strikes >= cfg.strikeLimit && !stillOn) { u.status = "suspended"; u.permanent = false; u.until = now + 7 * DAY; actions.push("auto-suspend"); }
    if (acc) users[acc] = u;
  } else if (content[key] && content[key].hidden && content[key].by === "auto") { content[key] = { hidden: false, cleared: true, at: now }; actions.push("restore"); }
  else content[key] = { ...(content[key] || {}), cleared: true };
  const resolution: any = { at: now, accepted: !!d.accept, actions, note: d.note || "", warn: d.warn || null, suspendDays: d.suspendDays == null ? null : d.suspendDays, by: "moderator" };
  return { reports: reports.map((r) => (r.key === key && r.status === "open" ? { ...r, status: d.accept ? "actioned" : "dismissed", resolution } : r)), mod: { ...mod, content, users }, resolution, acc, kind, actions };
}

// Reopen the latest decision on a case (its reports go back to the queue; content and account state stay as they are)
export function reopenCase(reports?: any, key?: any) {
  const done = reports.filter((r) => r.key === key && r.resolution).sort((a, b) => b.resolution.at - a.resolution.at); if (!done.length) return reports; const at = done[0].resolution.at;
  return reports.map((r) => (r.key === key && r.resolution && r.resolution.at === at ? { ...r, status: "open", resolution: null } : r));
}

export const modUser = (mod?: any, acc?: any, patch?: any) => ({ ...mod, users: { ...mod.users, [acc]: { warnings: 0, strikes: 0, ...(mod.users[acc] || {}), ...patch } } });

export function standingOf(mod?: any, acc?: any, now: any = Date.now()) {
  const u = (mod && mod.users && mod.users[acc]) || {}; const suspended = u.status === "suspended" && (!!u.permanent || (!!u.until && u.until > now));
  return { suspended, until: suspended ? u.until || null : null, permanent: !!(suspended && u.permanent), warnings: u.warnings || 0, strikes: u.strikes || 0, lastWarning: u.lastWarning || null, status: suspended ? "suspended" : u.warnings > 0 || u.status === "warned" ? "warned" : "active" };
}

// What the member may do right now: read-only maintenance mode or an active suspension stop posting, replying, reviewing and messaging
export function actGate(standing?: any, config?: any) {
  if (config && config.readOnly) return { ok: false, why: "المنصة في وضع القراءة فقط مؤقتًا لأعمال صيانة — النشر والردود والرسائل متوقفة، والتصفح متاح." };
  if (standing && standing.suspended) return { ok: false, why: standing.permanent ? "حسابك موقوف نهائيًا بقرار من فريق المجتمع — يمكنك التصفح والقراءة فقط." : `حسابك موقوف حتى ${fmtDay(standing.until)} بقرار من فريق المجتمع — يمكنك التصفح والقراءة فقط.` };
  return { ok: true, why: "" };
}


// ---- seed moderation data: open cases across every report type, plus decided ones behind the audit log ----
// Items not in the member's feed: a private message between two other members, a scam job ad hidden on arrival,
// a reply exposing a colleague, an employer threatening a reviewer, an impostor account, and two closed cases.
export const MOD_SNAPS = {
  threat: { text: "إحنا عارفين مين كتب التقييم ده، ولو ما اتمسحش النهاردة هنتصرف معاه قانونيًا ومش هيشتغل في السوق تاني.", author: { as: "anon", anon: "c0de", userRole: "owner", gender: "male", verified: true, verifyKind: "company", level: 1, role: "صاحب شركة · مقاولات عامة · جهة عمل موثّقة" }, self: false, where: "رد على تقييم شركة", link: null },
  dm: { text: "ابعتي صورتك الأول وبعدين نكمّل كلام عن الوظيفة.", author: { as: "anon", anon: "9b1e", userRole: "hr", gender: "male", verified: false, level: 0, role: "موارد بشرية · شركة مقاولات" }, self: false, where: "رسالة خاصة · سؤال عن إعلان وظيفة", link: null },
  doxx: { text: "ده م. ح. س. مهندس الموقع رقم 4 في مشروع التجمع، ورقمه 01000000444 — اسألوه هو بياخد كام.", author: { as: "anon", anon: "2e9a", userRole: "engineer", gender: "male", verified: false, level: 0, role: "مهندس مدني · 3 سنوات خبرة" }, self: false, where: "رد على: حد يعرف مرتبات المهندس المدني في أوراسكوم…", link: { type: "post", id: "p1" } },
  scam: { text: "مطلوب مهندسين مدني حديثي التخرج للتعيين فورًا بمرتب 25,000 — رسوم تدريب وتأمين 1,500 ج.م تُحوَّل قبل الاستلام على فودافون كاش 01000000999.", author: { as: "anon", anon: "71c4", userRole: "hr", gender: "male", verified: false, level: 0, role: "موارد بشرية · «النور للمقاولات» — جهة غير موثّقة" }, self: false, where: "إعلان وظيفة · النور للمقاولات", link: null },
  impostor: { text: "يراسل المهندسين باسم الموارد البشرية في حسن علام، ويطلب السير الذاتية وصورة البطاقة على بريد شخصي.", author: { as: "anon", anon: "77aa", userRole: "hr", gender: "female", verified: false, level: 0, role: "موارد بشرية · يدّعي تمثيل حسن علام" }, self: false, where: "ملف عضو", link: null },
  promo: { text: "كورسات بريمافيرا وريفيت بخصم 70% لأعضاء الغرفة — كلمني واتساب وأبعتلك التفاصيل.", author: { as: "anon", anon: "0b7e", userRole: "engineer", gender: "male", verified: false, level: 0, role: "مهندس مدني · سنتان خبرة" }, self: false, where: "منشور في غرفة التقنية", link: null },
  harass2: { text: "لو مش هتردي عليا هعرف أوصلك بطريقتي.", author: { as: "anon", anon: "5f5f", userRole: "engineer", gender: "male", verified: false, level: 0, role: "مهندس ميكانيكا · 4 سنوات خبرة" }, self: false, where: "رسالة خاصة", link: null },
};

export function seedReports() {
  const src: any = { posts: normalizeSeedPosts(POSTS0), jobs: JOBS, threads: normalizeThreads(THREADS0.engineer) }; const snap = (kind?: any, id?: any) => snapshotFor(kind, id, src);
  const R = (id?: any, kind?: any, target?: any, reason?: any, mins?: any, trust?: any, s?: any, note: any = "", status: any = "open", resolution: any = null) => ({ id, kind, key: ckey(kind, target), target, reason, note, by: "acc-" + fnv("reporter:" + id).slice(0, 6), trust, at: T0 - mins * 60000, status, snapshot: s, acc: s ? accIdOf(authorKey(s.author)) : null, resolution });
  const done = (mins?: any, accepted?: any, actions?: any, note?: any) => ({ at: T0 - mins * 60000, accepted, actions, note, by: "moderator" });
  return [
    R("R-1044", "comment", "cx40", "threat", 25, 2, MOD_SNAPS.threat, "صاحب شركة بيهدد اللي كتب التقييم في الردود"),
    R("R-1043", "comment", "cx40", "threat", 18, 1, MOD_SNAPS.threat),
    R("R-1042", "message", "tx-9b1e", "harass", 95, 2, MOD_SNAPS.dm, "وصلتني بعد ما سألته عن تفاصيل الوظيفة"),
    R("R-1041", "comment", "cx31", "doxx", 160, 3, MOD_SNAPS.doxx), R("R-1040", "comment", "cx31", "doxx", 150, 1, MOD_SNAPS.doxx), R("R-1039", "comment", "cx31", "doxx", 140, 2, MOD_SNAPS.doxx),
    R("R-1038", "job", "jx7", "scam", 300, 1, MOD_SNAPS.scam, "طلبوا مني أحوّل 1,500 قبل المقابلة"), R("R-1037", "job", "jx7", "scam", 280, 0, MOD_SNAPS.scam), R("R-1036", "job", "jx7", "fakejob", 260, 2, MOD_SNAPS.scam), R("R-1035", "job", "jx7", "scam", 250, 1, MOD_SNAPS.scam),
    R("R-1034", "post", "p4", "misinfo", 320, 1, snap("post", "p4"), "الرقم ده أعلى من السوق بكتير"), R("R-1033", "post", "p4", "misinfo", 190, 0, snap("post", "p4")),
    R("R-1032", "user", "a:77aa", "impersonate", 420, 2, MOD_SNAPS.impostor, "راسلني من بريد gmail وقال إنه من حسن علام"), R("R-1031", "user", "a:77aa", "impersonate", 380, 1, MOD_SNAPS.impostor),
    R("R-1030", "comment", "c16", "spam", 40, 0, snap("comment", "c16")),
    R("R-1029", "review", "orascom#0", "fakereview", 600, 1, snap("review", "orascom#0"), "تقييمات إيجابية كثيرة نزلت في نفس اليوم"),
    R("R-1024", "post", "px2", "spam", 2 * 1440 + 200, 1, MOD_SNAPS.promo, "", "actioned", done(2 * 1440, true, ["hide", "warn"], "ترويج تجاري متكرر")),
    R("R-1022", "message", "tx-5f5f", "harass", 3 * 1440 + 120, 2, MOD_SNAPS.harass2, "", "actioned", done(3 * 1440 + 30, true, ["warn", "suspend"], "تهديد صريح في رسالة خاصة — إيقاف 7 أيام")),
    R("R-1020", "comment", "c7", "misinfo", 1440 + 300, 0, snap("comment", "c7"), "", "dismissed", done(1440 + 60, false, [], "سؤال عادي — لا مخالفة")),
    R("R-1018", "job", "j6", "discrim", 4 * 1440, 1, snap("job", "j6"), "شرط الإقامة بالموقع", "dismissed", done(4 * 1440 - 180, false, [], "الإقامة بالموقع متطلب عمل للمشروع وليست تمييزًا")),
  ];
}

export const MOD0 = () => ({
  content: { "job:jx7": { hidden: true, by: "auto", at: T0 - 250 * 60000 }, "comment:cx31": { hidden: true, by: "auto", at: T0 - 140 * 60000 }, "post:px2": { hidden: true, by: "mod", at: T0 - 2 * DAY, reason: "إعلان تجاري أو سبام" }, "comment:c7": { cleared: true }, "job:j6": { cleared: true } },
  users: { [accIdOf("a:0b7e")]: { status: "warned", warnings: 1, strikes: 1, lastWarning: "الترويج التجاري غير مسموح في الغرف." }, [accIdOf("a:5f5f")]: { status: "suspended", until: T0 + 4 * DAY, warnings: 1, strikes: 1, lastWarning: "التهديد في الرسائل الخاصة مخالفة جسيمة." } },
});

export const AUDIT0 = () => [
  { id: "L6", at: T0 - 140 * 60000, who: "النظام", action: "auto-hide", target: "comment:cx31", detail: "3 بلاغات من حسابات مختلفة — أُخفي الرد حتى المراجعة" },
  { id: "L5", at: T0 - 250 * 60000, who: "النظام", action: "auto-hide", target: "job:jx7", detail: "3 بلاغات من حسابات مختلفة — أُخفي الإعلان حتى المراجعة" },
  { id: "L4", at: T0 - (1440 + 60) * 60000, who: "م. سلمى (مشرفة)", action: "dismiss", target: "comment:c7", detail: "سؤال عادي — لا مخالفة" },
  { id: "L3", at: T0 - 2 * DAY, who: "م. سلمى (مشرفة)", action: "accept", target: "post:px2", detail: "إخفاء المحتوى · تحذير صاحبه — ترويج تجاري متكرر" },
  { id: "L2", at: T0 - (3 * 1440 + 30) * 60000, who: "م. طارق (مشرف)", action: "accept", target: "message:tx-5f5f", detail: "تحذير صاحبه · إيقاف الحساب 7 أيام — تهديد صريح في رسالة خاصة" },
  { id: "L1", at: T0 - (4 * 1440 - 180) * 60000, who: "م. طارق (مشرف)", action: "dismiss", target: "job:j6", detail: "الإقامة بالموقع متطلب عمل للمشروع وليست تمييزًا" },
];

export const AUDIT_ACTIONS = { accept: ["قبول بلاغ", "bad", "cases"], dismiss: ["رفض بلاغ", "default", "cases"], "auto-hide": ["إخفاء تلقائي", "warn", "cases"], reopen: ["إعادة فتح", "default", "cases"], hide: ["إخفاء يدوي", "warn", "content"], restore: ["إعادة محتوى", "good", "content"], delete: ["حذف نهائي", "bad", "content"], warn: ["تحذير", "warn", "users"], suspend: ["إيقاف حساب", "bad", "users"], unsuspend: ["رفع إيقاف", "good", "users"], verify: ["منح التوثيق", "good", "verify"], unverify: ["سحب التوثيق", "warn", "verify"], "verify-ok": ["اعتماد توثيق", "good", "verify"], "verify-no": ["رفض توثيق", "warn", "verify"], purge: ["حذف مستندات", "default", "verify"], "verify-out": ["إنهاء طلب توثيق", "default", "verify"], role: ["تغيير الدور", "default", "users"], config: ["تعديل إعداد", "default", "settings"], announce: ["إعلان عام", "default", "content"], room: ["إدارة غرفة", "default", "content"], reset: ["إعادة ضبط", "default", "settings"] };

export const WARN_TEMPLATES = { doxx: "نشرت بيانات تكشف هوية زميل. الخصوصية أساس المنصة — التكرار يعني إيقاف الحساب.", threat: "التهديد أو الضغط على من يكتب تقييمًا أو رأيًا ممنوع تمامًا على المنصة.", harass: "الرسائل ذات الإيحاء أو التحرّش ممنوعة — الشبكة مهنية.", scam: "طلب مال أو رسوم من المتقدمين احتيال ويُحذف فورًا.", abuse: "السباب والإهانة مخالفان لإرشادات المجتمع — ناقش الفكرة لا الشخص.", impersonate: "انتحال صفة شركة أو مهندس مخالفة جسيمة.", spam: "الترويج التجاري غير مسموح في الغرف.", misinfo: "الأرقام المنشورة يجب أن تكون حقيقية — راجع ما كتبته.", fakereview: "التقييم يجب أن يكون تجربة حقيقية لا دعاية للشركة.", fakejob: "الإعلان يجب أن يكون لوظيفة حقيقية بجهة حقيقية.", discrim: "التمييز بالسن أو النوع أو الدين ممنوع في الإعلانات.", other: "راجع إرشادات المجتمع — المحتوى خالفها." };


// ---- the account directory the console manages: every identity seen on the platform, plus the signed-in member ----
export const discFromText = (t?: any) => { const s = String(t || ""); return /معمار/.test(s) ? "architecture" : /ميكانيك/.test(s) ? "mechanical" : /كهرب/.test(s) ? "electrical" : /مساحة|مساحه/.test(s) ? "survey" : /مدني|مدنية|إنشائي|موقع|مكتب فني|تخطيط/.test(s) ? "civil" : null; };

export const govFromText = (t?: any) => { const g = GOVS.find((x) => String(t || "").includes(x[1])); return g ? g[0] : null; };

export const ROLE_GROUPS = [["engineer", "مهندس", ["engineer"]], ["hr", "موارد بشرية", ["hr"]], ["owner", "صاحب عمل", ["owner"]], ["field", "طاقم ميداني", ["supervisor"]]];

export const roleGroup = (r?: any) => (r === "supervisor" ? "field" : r === "hr" || r === "owner" ? r : "engineer");

export const maskEmail = (e?: any) => { const [u, d] = String(e || "").split("@"); return d ? `${u.slice(0, 1)}•••@${d}` : "—"; };

export const FIRST_M = ["عمر", "محمد", "إسلام", "خالد", "مصطفى", "أحمد", "حازم", "شريف", "ياسر", "بلال"], FIRST_F = ["سارة", "نورهان", "ريم", "دينا", "هبة", "مريم", "ياسمين", "آية", "رنا", "شيماء"], LAST = ["حسين", "عبد الرحمن", "ماهر", "نبيل", "رمضان", "جمال", "فتحي", "عبد الله", "سعيد", "فؤاد"];

export const memberAccount = (p?: any, now?: any) => ({ id: memberAccId(p), key: "member", as: "public", photo: p.photo && p.showPhoto !== false ? p.photo : null, name: cleanName(p.name) || "—", anon: null, role: p.role, gender: p.gender, title: personaTitle(p), verified: !!p.verified, verifyKind: p.verifyKind || null, division: p.division || null, gradYear: p.gradYear || null, disc: p.disc || "civil", gov: p.gov, level: 0, joined: now - 12 * DAY, last: now, items: 0, companyId: p.companyId || null, member: true, email: p.email || null });

export function buildAccounts({ posts = [], jobs = [], reviews = {}, reports = [], profile = null, mod = { users: {} }, now = Date.now() }: any) {
  const map = new Map();
  const add = (a?: any, extra: any = {}) => {
    if (!a || (!a.anon && !a.pid)) return; if (profile && isSelf(a, profile)) return; const key = authorKey(a); const cur = map.get(key); if (cur) { cur.items += extra.items || 0; return; } const h = fnv(key);
    map.set(key, { id: accIdOf(key), key, as: a.as === "public" ? "public" : "anon", name: a.as === "public" ? a.name : null, anon: a.as === "public" ? null : a.anon, role: a.userRole || "engineer", gender: a.gender, title: a.role || "", verified: !!a.verified, verifyKind: a.verifyKind || null, division: a.division || null, gradYear: a.gradYear || null,
      disc: extra.disc || discFromText(a.role) || "civil", gov: extra.gov || govFromText(a.role) || GOVS[parseInt(h.slice(0, 2), 16) % 8][0], level: a.level || 0, joined: now - (30 + (parseInt(h.slice(2, 5), 16) % 900)) * DAY, last: now - (parseInt(h.slice(5, 8), 16) % 200) * HOUR, items: extra.items || 0, companyId: a.companyId || extra.companyId || null, member: false });
  };
  posts.forEach((p) => { if (!p.mine) add(p, { items: 1 }); flatten(p.comments || []).forEach((c) => { if (!c.mine) add(c, { items: 1 }); }); });
  COMPANIES.forEach((c) => c.reviews.forEach((r) => add(normalizeAuthor(r), { items: 1 })));
  Object.values(reviews as Record<string, any>).forEach((list) => (list || []).forEach((r) => { if (!r.mine) add(r, { items: 1 }); }));
  normalizeThreads([...THREADS0.engineer, ...THREADS0.company]).forEach((t) => add({ ...t.with, userRole: t.with.role, role: t.with.title }));
  const seenCo = new Set(); jobs.forEach((j) => { if (j.mine || seenCo.has(j.co)) return; seenCo.add(j.co); const co = company(j.co); add({ as: "anon", anon: hex4(seedOf(j.co)), userRole: "hr", gender: "female", verified: false, verifyKind: null, level: 1, role: `موارد بشرية · ${co ? co.name : "شركة"}` }, { items: jobs.filter((x) => x.co === j.co && !x.mine).length, companyId: j.co }); });
  reports.forEach((r) => { if (r.snapshot && r.snapshot.author && !r.snapshot.self) add(r.snapshot.author); });
  for (let i = 0; i < 40; i++) {
    const h = fnv(fnv("filler-" + i) + ":" + i * 7919); const r = parseInt(h.slice(0, 2), 16) / 255; const role = r < 0.66 ? "engineer" : r < 0.78 ? "supervisor" : r < 0.92 ? "hr" : "owner"; const g = parseInt(h[2], 16) < 5 ? "female" : "male";
    const disc = DISC[parseInt(h[3], 16) % DISC.length][0]; const yrs = parseInt(h[7], 16) % 13; const co = COMPANIES[parseInt(h.slice(1, 3), 16) % COMPANIES.length];
    const title = role === "engineer" ? `${discTitle(disc, g)} · ${yearsText(yrs, g)}` : isCompanyRole(role) ? `${roleTitle(role, g)} · ${co.name}` : `${roleTitle(role, g)} · ${yearsText(yrs, g)}`;
    const pub = parseInt(h[4], 16) < 6; const name = `${(g === "female" ? FIRST_F : FIRST_M)[parseInt(h[5], 16) % 10]} ${LAST[parseInt(h[6], 16) % 10]}`;
    add({ ...(pub ? { as: "public", pid: "u-f" + i, name } : { as: "anon", anon: fnv("handle:" + h).slice(-4) }), gender: g, userRole: role, verified: !isCompanyRole(role) && parseInt(h[1], 16) < 10, verifyKind: isCompanyRole(role) ? null : role === "supervisor" ? "certificate" : "syndicate", level: parseInt(h[1], 16) % 4, role: title },
      { items: parseInt(h.slice(6, 8), 16) % 38, companyId: isCompanyRole(role) ? co.id : null, disc, gov: GOVS[parseInt(h.slice(5, 7), 16) % 10][0] });
  }
  const list: any = [...map.values()];
  if (profile) { const me = memberAccount(profile, now); me.items = posts.filter((p) => p.mine).length + posts.reduce((n, p) => n + flatten(p.comments || []).filter((c) => c.mine).length, 0); list.unshift(me); }
  return list.map((a) => { const u = (mod.users || {})[a.id] || {}; const st = standingOf(mod, a.id, now); const role = !a.member && u.role ? u.role : a.role; return { ...a, role, verified: canVerifyRole(role) && (!a.member && typeof u.verified === "boolean" ? u.verified : a.verified), status: st.status, until: st.until, permanent: st.permanent, warnings: st.warnings, strikes: st.strikes, lastWarning: st.lastWarning }; });
}


// ---- analytics: modeled platform series (deterministic per day) blended with the live app state ----
export const MEMBERS_BASE = 48212;

export function activitySeries(days?: any, now: any = Date.now()) {
  const today = Math.floor(now / DAY); const out: any = [];
  for (let i = days - 1; i >= 0; i--) {
    const k = today - i; const d = new Date(k * DAY); const dow = d.getUTCDay(); const wk = dow === 5 ? 0.7 : dow === 6 ? 0.83 : 1; const trend = 1 + (k % 1000) * 0.0004; const n = 0.93 + rand(k) * 0.14; const dau = Math.round(5200 * wk * trend * n);
    out.push({ k, label: `${d.getUTCDate()}/${d.getUTCMonth() + 1}`, dau, posts: Math.round(dau * (0.046 + rand(k + 7) * 0.012)), replies: Math.round(dau * (0.19 + rand(k + 11) * 0.04)), signups: Math.round(38 * wk * n), shares: Math.round(dau * (0.011 + rand(k + 13) * 0.004)) });
  }
  return out;
}

export function engagementOf(posts?: any) {
  const n = posts.length; const all = posts.flatMap((p) => flatten(p.comments || [])); const reacts = posts.reduce((a, p) => a + (p.reactions.agree || 0) + (p.reactions.disagree || 0) + (p.reactions.useful || 0), 0);
  return { posts: n, replies: all.length, perPost: n ? all.length / n : 0, answered: n ? posts.filter((p) => (p.comments || []).length > 0).length / n : 0, best: n ? posts.filter((p) => p.best).length / n : 0, reactsPerPost: n ? reacts / n : 0, numbers: all.filter((c) => c.type === "number").length,
    byRoom: ROOMS.map((r) => { const ps = posts.filter((p) => p.room === r.id); return { id: r.id, name: r.name, posts: ps.length, replies: ps.reduce((a, p) => a + countComments(p.comments || []), 0) }; }).filter((x) => x.posts > 0).sort((a, b) => b.posts + b.replies - (a.posts + a.replies)) };
}

// A salary sample drawn from the market model's quantiles for every discipline (the same model the app shows members)
export function salarySample(exp?: any, govKey?: any) {
  const at = (m?: any, q?: any) => (q < 0.1 ? m.p10 * (0.8 + 2 * q) : q < 0.25 ? m.p10 + (m.p25 - m.p10) * (q - 0.1) / 0.15 : q < 0.5 ? m.p25 + (m.p50 - m.p25) * (q - 0.25) / 0.25 : q < 0.75 ? m.p50 + (m.p75 - m.p50) * (q - 0.5) / 0.25 : q < 0.9 ? m.p75 + (m.p90 - m.p75) * (q - 0.75) / 0.15 : m.p90 * (1 + (q - 0.9) * 3));
  const out: any = []; DISC.forEach(([d]: any) => { const m = marketFor(d, exp, govKey); const n = sampleSize(d, exp, govKey); for (let i = 0; i < n; i++) out.push({ d, v: Math.round(at(m, rand(seedOf(d + exp + govKey) + i * 13.7))) }); });
  return out;
}

export function histogram(values?: any, bins: any = 14) {
  if (!values.length) return { bins: [], lo: 0, hi: 0, step: 0 }; const sorted = [...values].sort((a, b) => a - b); const lo = Math.floor(sorted[Math.floor(sorted.length * 0.01)] / 1000) * 1000; const hi = Math.ceil(sorted[Math.floor(sorted.length * 0.99)] / 1000) * 1000;
  const step = Math.max(500, Math.ceil((hi - lo) / bins / 500) * 500); const out = Array.from({ length: Math.ceil((hi - lo) / step) || 1 }, (_, i) => ({ from: lo + i * step, to: lo + (i + 1) * step, n: 0 }));
  values.forEach((v) => { const i = Math.min(out.length - 1, Math.max(0, Math.floor((v - lo) / step))); out[i].n++; }); return { bins: out, lo, hi: lo + out.length * step, step };
}

export function trendingDiscs(days?: any, posts?: any, jobs?: any) {
  return DISC.map(([id, l]: any) => { const h = fnv("trend:" + id + ":" + days); const prev = Math.round((180 + (parseInt(h.slice(0, 3), 16) % 420)) * days / 30); const g = (parseInt(h.slice(3, 5), 16) / 255) * 0.5 - 0.12; const livePosts = posts.filter((p) => discFromText(p.role) === id).length; const liveJobs = jobs.filter((j) => j.disc === id).length; const cur = Math.round(prev * (1 + g)) + livePosts + liveJobs * 3; return { id, label: l, prev, cur, growth: (cur - prev) / (prev || 1), posts: livePosts, jobs: liveJobs }; }).sort((a, b) => b.growth - a.growth);
}

export function trendingTracks(days?: any) {
  const out: any = []; DISC.forEach(([d]: any) => tracksFor(d).forEach(([t]: any) => { const h = fnv("track:" + d + t + days); out.push({ id: d + ":" + t, label: `${trackLabel(t, d)} · ${label(DISC, d)}`, growth: (parseInt(h.slice(0, 2), 16) / 255) * 0.7 - 0.15 }); }));
  return out.sort((a, b) => b.growth - a.growth).slice(0, 6);
}

export function jobAnalytics(jobs?: any, stats?: any) {
  const rows = jobs.map((j) => { const s = stats[j.id] || { views: 0, contacts: 0 }; const r = reachFor(j); return { j, views: s.views, contacts: s.contacts, rate: s.views ? s.contacts / s.views : 0, reach: r.exact + r.near }; });
  const views = rows.reduce((a, r) => a + r.views, 0), contacts = rows.reduce((a, r) => a + r.contacts, 0), reach = rows.reduce((a, r) => a + r.reach, 0);
  const byDisc = DISC.map(([d, l]: any) => { const rs = rows.filter((r) => r.j.disc === d); const v = rs.reduce((a, r) => a + r.views, 0), c = rs.reduce((a, r) => a + r.contacts, 0); return { d, l, jobs: rs.length, views: v, contacts: c, rate: v ? c / v : 0 }; }).filter((x) => x.jobs > 0);
  return { rows: rows.sort((a, b) => b.rate - a.rate || b.contacts - a.contacts), byDisc, totals: { jobs: rows.length, views, contacts, reach, rate: views ? contacts / views : 0 } };
}

// Salary transparency coverage: the share of (discipline × experience × governorate) cells with at least 30 reports
export const coverageOf = (min: any = 30) => { let ok = 0, all = 0; DISC.forEach(([d]: any) => EXP.forEach(([e]: any) => GOVS.forEach(([g]: any) => { all++; if (sampleSize(d, e, g) >= min) ok++; }))); return all ? ok / all : 0; };

export const jobStats0 = () => Object.fromEntries(JOBS.map((j) => [j.id, { views: 120 + (seedOf(j.id) % 640), contacts: 9 + (seedOf(j.id + "c") % 57) }]));

export const threadsKind = (p?: any) => (p.role === "supervisor" ? "supervisor" : isCompanyRole(p.role) ? "company" : "engineer");

export const threadsFor0 = (p?: any) => normalizeThreads(THREADS0[threadsKind(p)]).map((t) => ({ ...t, messages: [...t.messages] }));
