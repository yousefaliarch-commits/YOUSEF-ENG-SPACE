// Seeds (or removes) the test accounts for every role: five disciplines, a site supervisor, HR, an employer / owner, a moderator and
// a super admin — all @engspace.test (an address that cannot receive mail, so nobody can reset one of these passwords).
//   seed:    SEED_API_URL=… SEED_SERVICE_KEY=… node scripts/seed/test-accounts.mjs
//   remove:  … node scripts/seed/test-accounts.mjs --remove
// Passwords: with SEED_PASSWORD / SEED_ADMIN_PASSWORD (local, CI) the accounts get those; without them the committed bcrypt hashes
// in test-accounts.json are used (hosted: the plaintext is not in the repository). Safe to run again: it updates what exists.
// The service key never leaves this process: it is read from the environment and never printed.
import { readFileSync } from "node:fs";
const def = JSON.parse(readFileSync(new URL("./test-accounts.json", import.meta.url), "utf8"));
const API = (process.env.SEED_API_URL || "").replace(/\/$/, ""), KEY = process.env.SEED_SERVICE_KEY || "";
if (!API || !KEY) { console.error("SEED_API_URL and SEED_SERVICE_KEY are required"); process.exit(1); }
if (/^https:\/\/[a-z0-9]+\.supabase\.co/.test(API) === false && !/127\.0\.0\.1|localhost/.test(API)) { console.error("refusing an unknown API host: " + API); process.exit(1); }
const remove = process.argv.includes("--remove");
const h = { apikey: KEY, authorization: `Bearer ${KEY}`, "content-type": "application/json" };
const call = async (path, init = {}) => { const r = await fetch(API + path, { ...init, headers: { ...h, ...(init.headers || {}) } }); const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch { /* not json */ } return { ok: r.ok, status: r.status, body: j, text: t }; };
const email = (a) => `${a.local}@${def.domain}`;
const year = new Date().getFullYear();

async function findId(addr) {
  for (let page = 1; page <= 20; page++) {
    const r = await call(`/auth/v1/admin/users?page=${page}&per_page=200`); if (!r.ok) throw new Error("list users: " + r.status);
    const users = (r.body && r.body.users) || []; const u = users.find((x) => (x.email || "").toLowerCase() === addr); if (u) return u.id; if (users.length < 200) return null;
  }
  return null;
}
const meta = (a) => { const p = a.profile; return { name: a.name, role: a.role, ...p, ...(p.gradYear != null ? { gradYear: String(year + p.gradYear) } : {}), age: p.age != null ? String(p.age) : undefined, identity: "anon" }; };
const secret = (a) => {
  const plain = a.passwordGroup === "admin" ? process.env.SEED_ADMIN_PASSWORD : process.env.SEED_PASSWORD;
  if (plain) return { password: plain }; const hash = def.hashes[a.passwordGroup]; if (!hash) throw new Error("no password for " + a.key); return { password_hash: hash };
};

const results = [];
for (const a of def.accounts) {
  const addr = email(a); let id = await findId(addr);
  if (remove) { if (id) { const d = await call(`/auth/v1/admin/users/${id}`, { method: "DELETE" }); results.push([addr, d.ok ? "removed" : "FAILED " + d.status]); } else results.push([addr, "not there"]); continue; }
  const body = { email: addr, email_confirm: true, user_metadata: meta(a), ...secret(a) };
  if (!id) { const c = await call("/auth/v1/admin/users", { method: "POST", body: JSON.stringify(body) }); if (!c.ok) { results.push([addr, "FAILED create " + c.status + " " + c.text.slice(0, 120)]); continue; } id = c.body.id; }
  else { const u = await call(`/auth/v1/admin/users/${id}`, { method: "PUT", body: JSON.stringify(body) }); if (!u.ok) { results.push([addr, "FAILED update " + u.status + " " + u.text.slice(0, 120)]); continue; } }
  // the profile: made by the sign-up trigger from the metadata; make sure it matches the definition and carries the staff role
  const p = a.profile; const patch = { name: a.name, role: a.role, disc: p.disc ?? null, track: p.track ?? null, pos: p.pos ?? null, gov: p.gov ?? null, city: p.city ?? null, gender: p.gender, age: p.age ?? null,
    grad_year: p.gradYear != null ? year + p.gradYear : null, company_name: p.companyName ?? null, staff: a.staff || "member", onboarded: true };
  const pr = await call(`/rest/v1/profiles?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(patch), headers: { prefer: "return=minimal" } });
  results.push([addr, pr.ok ? (a.staff ? `ready (${a.staff})` : "ready") : "profile FAILED " + pr.status + " " + pr.text.slice(0, 120)]);
}
for (const [e, s] of results) console.log(`${s.startsWith("FAILED") || s.includes("FAILED") ? "✗" : "✓"} ${e.padEnd(34)} ${s}`);
if (results.some(([, s]) => s.includes("FAILED"))) process.exit(1);
