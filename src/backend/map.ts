// =====================================================================
//  Server rows → the shapes the app already renders (pure functions; tests/cloud-map.test.ts)
//  · The server stores structured author snapshots (supabase/migrations/…_core.sql → author_snapshot); the display title is
//    built here with the same anonTitle / publicTitle the app uses, so a title can never claim more than the snapshot.
//  · The UI shows "count + my own reaction / vote", so the member's own reaction or ballot is taken out of the server totals.
// =====================================================================
import { notifCategory } from "../domain/notifications";
import { agoText } from "../domain/moderation";
import { THIS_YEAR, anonTitle, publicTitle } from "../domain/identity";
import { specOfPersona } from "../ui/characters";

export type Row = Record<string, any>;
const R0 = () => ({ agree: 0, disagree: 0, useful: 0 });

// a structured snapshot → the persona-like object the title functions read
const personaOf = (a: Row) => ({
  role: a.userRole, gender: a.gender, disc: a.disc, track: a.track, pos: a.pos, gov: a.gov, city: a.city, companyName: a.companyName,
  verified: !!a.verified, verifyKind: a.verifyKind || null, division: a.division || null,
  gradYear: a.gradYear || (a.years != null ? THIS_YEAR - Number(a.years) : null),
});

// the author fields every app item carries at its top level (AUTHOR_FIELDS in domain/identity.ts)
// ref: "<table>:<id>" of the item the snapshot came from — the server resolves the author from it (messages, reports)
export function authorFields(a: Row | null | undefined, ref?: string): Row {
  if (!a) return { as: "anon", anon: "----", role: "", level: 0 };
  const p = personaOf(a); const pub = a.as === "public";
  const base: Row = { ...(ref ? { ref } : {}), as: pub ? "public" : "anon", gender: a.gender, userRole: a.userRole, spec: specOfPersona(p), look: a.look, verified: !!a.verified,
    verifyKind: a.verifyKind || null, division: a.division || null, level: a.level || 0, dm: a.dm !== false };
  return pub
    ? { ...base, pid: a.pid, name: a.name, age: a.age ?? null, gradYear: a.gradYear ?? null, photo: a.photo, role: publicTitle(p) }
    : { ...base, anon: a.anon, avatar: a.avatar, role: anonTitle(p) };
}

const minus = (counts: Row | null | undefined, mine: Row | null | undefined) => {
  const c: Row = { ...R0(), ...(counts || {}) };
  if (mine) for (const k of ["agree", "disagree", "useful"]) if (mine[k]) c[k] = Math.max(0, (c[k] || 0) - 1);
  return c;
};

export const when = (iso: string | number, now = Date.now()) => agoText(typeof iso === "number" ? iso : Date.parse(iso), now);

export function commentTree(rows: Row[], myReacts: Row = {}, now = Date.now()) {
  const nodes = new Map<string, Row>();
  const sorted = [...rows].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  for (const r of sorted) nodes.set(r.id, { id: r.id, type: r.type || "text", text: r.text, ...(r.data && Object.keys(r.data).length ? { data: r.data } : {}),
    ...authorFields(r.author, `comments:${r.id}`), when: when(r.created_at, now), reactions: minus(r.reactions, myReacts[r.id]), replies: [], hiddenByMod: !!r.hidden });
  const top: Row[] = [];
  for (const r of sorted) { const n = nodes.get(r.id)!; const parent = r.parent_id && nodes.get(r.parent_id); if (parent) parent.replies.push(n); else top.push(n); }
  return top;
}

// a vote post stores { vote: true } and its ballots 0 = yes, 1 = no; a poll stores { poll: { options: [text…] } }
export function postOf(r: Row, comments: Row[] = [], mine: { reacts?: Row; ballot?: number | null } = {}, now = Date.now()) {
  const data = r.data || {}; const tally: Row = { ...(r.tally || {}) };
  if (mine.ballot != null) tally[mine.ballot] = Math.max(0, (tally[mine.ballot] || 0) - 1);
  const p: Row = { id: r.id, room: r.room, type: r.type, body: r.body, ...authorFields(r.author, `posts:${r.id}`), dm: r.dm !== false, best: r.best_comment || null,
    when: when(r.created_at, now), at: Date.parse(r.created_at), reactions: minus(r.reactions, mine.reacts), comments, hiddenByMod: !!r.hidden, edits: r.edit_count || 0, editedAt: r.edited_at ? Date.parse(r.edited_at) : null };
  if (data.reveal) p.reveal = data.reveal;
  if (data.image) p.image = data.image;
  if (r.type === "vote") p.vote = { ...(data.vote || {}), yes: tally[0] || 0, no: tally[1] || 0 };
  if (r.type === "poll") p.poll = { ...(data.poll || {}), options: ((data.poll && data.poll.options) || data.options || []).map((o: any, i: number) => [Array.isArray(o) ? o[0] : o, tally[i] || 0]) };
  return p;
}

// the app's post → the insert row (author and counters are server-set)
export function postRow(post: Row, as: string) {
  const data: Row = {};
  if (post.reveal) data.reveal = post.reveal;
  if (post.image) data.image = post.image;
  if (post.vote) data.vote = { ends: post.vote.ends };
  if (post.poll) data.poll = { ...post.poll, options: (post.poll.options || []).map((o: any) => (Array.isArray(o) ? o[0] : o)) };
  return { room: post.room, type: post.type, body: post.body || "", data, author_mode: as === "public" ? "public" : "anon", dm: post.dm !== false };
}

export const ballotOf = (type: string, choice: any) => (type === "vote" ? (choice === "yes" ? 0 : 1) : Number(choice));
export const choiceOf = (type: string, ballot: number) => (type === "vote" ? (ballot === 0 ? "yes" : "no") : ballot);

export function jobOf(r: Row, now = Date.now()) {
  const yrs = r.years ? String(r.years).replace(/[[\]()]/g, "").split(",").map(Number) : null;
  return { id: r.id, title: r.title, co: r.co, gov: r.gov, city: r.city, disc: r.disc, sub: r.sub, pos: r.pos,
    years: yrs ? [yrs[0], String(r.years).endsWith(")") ? yrs[1] - 1 : yrs[1]] : null, mode: r.mode, type: r.type, desc: r.descr, reqs: r.reqs || [], skills: r.skills || [],
    contact: r.contact || {}, when: when(r.created_at, now), coName: r.co_name || (r.author && r.author.companyName), hiddenByMod: !!r.hidden,
    stats: { views: r.view_count || 0, contacts: r.contact_count || 0 } };
}
export function jobRow(j: Row) {
  const y = Array.isArray(j.years) ? `[${j.years[0]},${j.years[1]}]` : null;
  return { title: j.title, co: j.co || null, co_name: (j.coName || "").trim() || null, gov: j.gov, city: j.city || null, disc: j.disc, sub: j.sub || null, pos: j.pos || null, years: y, mode: j.mode || null,
    type: j.type || null, descr: j.desc || "", reqs: j.reqs || [], skills: j.skills || [], contact: j.contact || {}, author_mode: "public" };
}

export const reviewRow = (companyId: string, r: Row) => ({ company_id: companyId, rating: Math.min(5, Math.max(1, Number(r.stars) || 1)), text: r.text || "",
  data: Object.fromEntries(["pros", "cons", "tags", "title"].filter((k) => r[k] != null).map((k) => [k, r[k]])), author_mode: r.as === "public" ? "public" : "anon" });

// a salary share from the contribute sheet: experience is a band ("3-5", "12+"); the share keeps its lower bound in years
export const yearsOfBand = (exp: any) => { const m = /\d+/.exec(String(exp ?? "")); return m ? Math.min(50, Number(m[0])) : 0; };
export const shareRow = (s: Row) => ({ disc: s.disc, track: s.track || null, pos: s.pos || null, gov: s.gov || null, years: s.years != null ? Number(s.years) : yearsOfBand(s.exp),
  salary: Math.round(Number(s.salary)), company: s.company || null, employer: s.employer || null, title: s.title || null, extras: s.extras || null, author_mode: s.as === "public" ? "public" : "anon" });

// an experience band of the market screen ("3-5", "12+") → the years range the explorer filters on
export const yearsRange = (exp: any): [number, number] => { const m = /^(\d+)(?:-(\d+)|\+)$/.exec(String(exp || "")); return m ? [Number(m[1]), m[2] ? Number(m[2]) : 50] : [0, 50]; };
// one individual report, as the market screen lists them (the author stays anonymous: handle only)
export const shareOf = (r: Row, now = Date.now()) => ({ id: r.id, anon: (r.author && r.author.anon) || "----", title: r.title || "", years: r.years, salary: r.salary,
  company: r.company || "", employer: r.employer || null, coId: null, gov: r.gov, track: r.track, verified: !!(r.author && r.author.verified), when: when(r.created_at, now) });

export const notifOf = (r: Row, now = Date.now()) => ({ id: r.id, kind: r.kind, title: r.title, body: r.body, target: r.target || undefined, read: !!r.read, when: when(r.created_at, now),
  category: r.category || notifCategory(r.kind), ...(r.en && r.en.title ? { en: { title: r.en.title, body: r.en.body || "" } } : {}) });

export function reviewOf(r: Row, now = Date.now()) {
  return { id: r.id, stars: r.rating, text: r.text, ...(r.data || {}), ...authorFields(r.author, `company_reviews:${r.id}`), when: when(r.created_at, now), hiddenByMod: !!r.hidden };
}

export function threadOf(r: Row, messages: Row[] | null = null, now = Date.now()) {
  const w = authorFields(r.with_author);
  // a team thread: the other side is the platform (no person, no discipline — nothing to default)
  const team = !!(r.with_author && r.with_author.team);
  return { id: r.id, meAs: r.me_as, with: team ? { ...w, team: true, title: "فريق إدارة المنصة", role: "staff" } : { ...w, title: w.role, role: w.userRole }, ctx: r.ctx || {}, rule: r.rule || "", unread: Number(r.unread || 0),
    lastText: r.last_text || "", when: when(r.last_at, now),
    messages: messages ? messages.map((m) => ({ id: m.id, from: m.from_me ? "me" : "them", text: m.text, at: when(m.at, now) })) : [] };
}

// the profile row → the app's persona (the fields Registration and the settings screens read and write)
export function personaOf_(p: Row, email: string) {
  const s = p.settings || {};
  return {
    name: p.name, email, gender: p.gender, age: p.age, gradYear: p.grad_year, role: p.role, disc: p.disc, track: p.track, pos: p.pos, gov: p.gov, city: p.city,
    goal: p.goal, companyName: p.company_name, companyId: p.company_id, avatar: p.avatar, look: p.look, photo: p.photo_path, identity: p.default_identity,
    verified: !!p.verified, verifyKind: p.verify_kind, division: p.division, pending: false, verifyRef: null, verifyReq: null,
    anon: p.anon, pid: p.pid, modRef: p.mod_ref, staff: p.staff, contributions: p.contributions || 0, strikes: p.strikes || 0,
    suspendedUntil: p.suspended_until, suspendedForever: !!p.suspended_forever, onboarded: p.onboarded !== false,
    notify: s.notify !== false, dm: s.dm !== false, hide: s.hide !== false, rotate: s.rotate !== false, openToRecruiters: s.openToRecruiters !== false, showPhoto: s.showPhoto !== false,
  };
}
export { personaOf_ as personaFromProfile };

// the persona → the profile columns a member may write (server-set columns are never sent)
export function profilePatch(p: Row) {
  const out: Row = {};
  const map: Row = { name: "name", gender: "gender", age: "age", gradYear: "grad_year", role: "role", disc: "disc", track: "track", pos: "pos", gov: "gov", city: "city",
    goal: "goal", companyName: "company_name", companyId: "company_id", avatar: "avatar", look: "look", identity: "default_identity" };
  for (const [k, col] of Object.entries(map)) if (k in p) out[col] = p[k] === "" ? null : p[k];
  if (p.onboarded === true) out.onboarded = true; // the «complete your profile» steps finish here (never set back to false)
  if (out.age != null) out.age = Number(out.age); if (out.grad_year != null) out.grad_year = Number(out.grad_year);
  const st = ["notify", "dm", "hide", "rotate", "openToRecruiters", "showPhoto"].filter((k) => k in p);
  if (st.length) out.settings = Object.fromEntries(st.map((k) => [k, !!p[k]]));
  return out;
}

// sign-up: the registration form → user metadata (read by the database's new-user trigger)
export const signupMeta = (p: Row) => ({ name: p.name, gender: p.gender, age: p.age, gradYear: p.gradYear, role: p.role, disc: p.disc, track: p.track, pos: p.pos,
  gov: p.gov, city: p.city, goal: p.goal, companyName: p.companyName, identity: p.identity });
