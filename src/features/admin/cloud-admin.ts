// =====================================================================
//  The admin console on the live backend: server data → the shapes the console already renders
//  (reports → cases, account directory, moderation state, audit log, verification queue, analytics).
//  Every action goes to a staff-only database function that re-checks the caller's role; the console then reloads.
// =====================================================================
import { flatten } from "../../lib/posts";
import { admin, loadAll } from "../../backend/cloud";
import { authorFields } from "../../backend/map";
import { discTitle, roleTitle } from "../../domain/taxonomy";

const ms = (iso: any) => (iso ? Date.parse(iso) : null);

// one row per case from mod_cases → the per-report objects casesOf() groups (each report is a distinct member)
export function reportsOf(rows: any[]) {
  const out: any[] = [];
  for (const c of rows) {
    const key = `${c.kind}:${c.item_id}`;
    const snap = c.snapshot || {};
    const snapshot = { text: snap.text ?? null, sys: snap.sys, author: snap.author ? authorFields(snap.author) : null, where: snap.where || "", link: snap.link || null, self: false };
    for (const r of c.reports || []) {
      const res = r.resolution;
      out.push({ id: r.ref, kind: c.kind, key, target: c.item_id, reason: r.reason, note: r.note || "", by: r.ref, trust: r.trust || 0, at: ms(r.at), status: r.status,
        snapshot, acc: c.account_ref || null, mine: false,
        resolution: res ? { accept: !!res.accept, actions: [res.hide ? "hide" : null, res.warn ? "warn" : null, res.suspendDays != null ? "suspend" : null].filter(Boolean), note: res.note || "", by: res.by, at: ms(res.at) } : null });
    }
  }
  return out;
}

export function modOf(cases: any[], accounts: any[]) {
  const content: any = {}; for (const c of cases) if (c.hidden) content[`${c.kind}:${c.item_id}`] = { hidden: true, by: c.status === "open" ? "auto" : "mod", at: ms(c.last_at) };
  const users: any = {}; for (const a of accounts) users[a.id] = { status: a.status, until: a.until, permanent: a.permanent, strikes: a.strikes, warnings: a.warnings };
  return { content, users };
}

export function accountsOf(rows: any[], now = Date.now()) {
  return rows.map((a) => {
    const until = ms(a.suspended_until); const suspended = a.suspended_forever || (until != null && until > now);
    // the moderation list carries only what moderation needs (no e-mail, place or join date) so it cannot be matched to the directory
    return { id: a.mod_ref, key: a.mod_ref, as: "anon", name: null, anon: null, email: null, role: a.role, staff: a.staff, gender: "male",
      title: a.role === "engineer" && a.disc ? discTitle(a.disc) : roleTitle(a.role), verified: !!a.verified, verifyKind: null, division: null, gradYear: null,
      disc: a.disc || null, gov: a.gov || null, level: 0, joined: a.created_at ? ms(a.created_at) : null, last: null, items: a.contributions || 0, companyId: null, member: false,
      status: suspended ? "suspended" : a.strikes > 0 ? "warned" : "active", until: suspended && !a.suspended_forever ? until : null, permanent: !!a.suspended_forever,
      warnings: a.strikes || 0, strikes: a.strikes || 0, lastWarning: null };
  });
}

const DETAIL: Record<string, (d: any) => string> = {
  accept: (d) => ["قُبل البلاغ", d.hide ? "إخفاء" : null, d.warn ? `تحذير: «${d.warn}»` : null, d.suspendDays === 0 ? "إيقاف دائم" : d.suspendDays ? `إيقاف ${d.suspendDays} يوم` : null, d.note].filter(Boolean).join(" · "),
  dismiss: (d) => ["لا مخالفة", d.note].filter(Boolean).join(" · "),
  config: (d) => Object.keys(d || {}).join("، "),
  staff: (d) => `الصلاحية: ${d.staff}`,
  account: (d) => Object.entries(d || {}).map(([k, v]) => `${k}: ${v}`).join(" · "),
  warn: (d) => d.text || "",
};
export const auditOf = (rows: any[]) => rows.map((r) => ({ id: "L" + r.id, at: ms(r.at), who: r.actor, action: r.action, target: r.target, detail: (DETAIL[r.action] || ((d: any) => (d && Object.keys(d).length ? JSON.stringify(d) : "")))(r.detail) }));

// pending requests carry their documents as links that expire after 5 minutes (signed on every load)
export async function verifsOf(rows: any[]) {
  return Promise.all(rows.map(async (r) => {
    const docs = r.status === "pending" ? await Promise.all((r.doc_paths || []).map(async (p: string, i: number) => ({ kind: (r.kinds || [])[i] || "card", src: await admin.docUrl(p).catch(() => null) }))) : [];
    return { id: r.ref, acc: null, pid: null, mine: false, name: r.name, gender: r.gender, role: r.role, disc: r.disc, gradYear: r.grad_year, gov: r.gov, city: null,
      docs, kinds: r.kinds || [], at: ms(r.created_at), status: r.status, decision: r.decision ? { ...r.decision, at: ms(r.decided_at) } : null,
      purged: r.status === "pending" ? 0 : (r.kinds || []).length, purgedAt: ms(r.purged_at) };
  }));
}

export async function loadAdmin() {
  const [cases, accounts, audit, verifs, analytics, config, app] = await Promise.all([admin.cases("all"), admin.accounts(), admin.audit(), admin.verifQueue(), admin.analytics(30), admin.config(), loadAll()]);
  const accs = accountsOf(accounts); const mod = modOf(cases, accs);
  // an item hidden by hand (no report behind it) is hidden too — read the flag from the rows so the console offers «إظهار»
  const flag = (key: string, on: boolean) => { if (on && !mod.content[key]) mod.content[key] = { hidden: true, by: "mod", at: null }; };
  for (const p of app.posts) { flag(`post:${p.id}`, p.hiddenByMod); for (const c of flatten(p.comments || [])) flag(`comment:${c.id}`, c.hiddenByMod); }
  for (const j of app.jobs) flag(`job:${j.id}`, j.hiddenByMod);
  for (const list of Object.values(app.reviews || {}) as any[]) for (const r of list) flag(`review:${r.id}`, r.hiddenByMod);
  return { reports: reportsOf(cases), mod, accounts: accs, audit: auditOf(audit), verifs: await verifsOf(verifs), live: analytics, config,
    posts: app.posts, jobs: app.jobs, reviews: app.reviews };
}
