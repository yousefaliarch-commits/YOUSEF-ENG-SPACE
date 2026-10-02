// Runs tools/crawl-ui.js against the app in CLOUD mode (dev server + local Supabase), signed in as real test accounts.
// Needs: `npx supabase start`, `node scripts/db/env-local.mjs`, `npm run dev`, and Playwright (not a project dependency:
// `npm i -g playwright` or run from a folder that has it). Usage: node tools/crawl-cloud.mjs [maxTests]
// Before every remount the crawler calls __CRAWL_BEFORE: it checks the stored session and signs in again (or re-creates the
// account) when the crawl signed out or deleted it, so one run exercises sign-out and account deletion too.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(process.cwd() + "/");
const { chromium } = require("playwright");

const env = Object.fromEntries(readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => l.split("=")));
const API = env.VITE_SUPABASE_URL, KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY, APP = process.env.APP_URL || "http://127.0.0.1:5173/";
const MAX = Number(process.argv[2] || 2500);
const PW = "Crawl!Passw0rd-1";
const ACCOUNTS = {
  eng: { email: "crawl-eng@example.com", meta: { name: "مهندس الزحف", gender: "male", age: 31, gradYear: 2017, role: "engineer", disc: "civil", track: "tech", pos: "mid", gov: "cairo", city: "nasr", identity: "anon" } },
  pub: { email: "crawl-pub@example.com", meta: { name: "مهندسة علنية", gender: "female", age: 28, gradYear: 2020, role: "engineer", disc: "architecture", track: "bim", pos: "junior", gov: "giza", city: "dokki", identity: "public" } },
  hr: { email: "crawl-hr@example.com", meta: { name: "موارد بشرية", gender: "female", age: 35, gradYear: 2012, role: "hr", companyName: "ريدكون", gov: "cairo", identity: "public" } },
};

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto(APP + "#app");
const ids = await page.evaluate(async ({ API, KEY }) => {
  const r = await fetch(`${API}/rest/v1/posts?select=id&order=created_at.desc&limit=3`, { headers: { apikey: KEY } }); return r.ok ? (await r.json()).map((x) => x.id) : [];
}, { API, KEY });
await page.evaluate(({ API, KEY, PW, ACCOUNTS, MAX }) => {
  const h = { apikey: KEY, "content-type": "application/json" };
  const login = async (a) => {
    let r = await fetch(`${API}/auth/v1/token?grant_type=password`, { method: "POST", headers: h, body: JSON.stringify({ email: a.email, password: PW }) });
    if (r.status === 400) { await fetch(`${API}/auth/v1/signup`, { method: "POST", headers: h, body: JSON.stringify({ email: a.email, password: PW, data: a.meta }) });
      r = await fetch(`${API}/auth/v1/token?grant_type=password`, { method: "POST", headers: h, body: JSON.stringify({ email: a.email, password: PW }) }); }
    return r.json();
  };
  const cache = {};
  window.__CRAWL_MAX_TESTS = MAX; window.__CRAWL_SETTLE = 2500;
  window.__CRAWL_BEFORE = async (start) => {
    const who = start.tag === "hr" || start.tag === "welcome-hr" ? "hr" : start.tag === "public-default" || start.tag === "welcome" ? "pub" : start.account ? null : "eng";
    localStorage.removeItem("engspace.auth"); localStorage.removeItem("engspace.persona.v6"); localStorage.removeItem("engspace.session.v1");
    if (!who) return; // the sign-in screen
    let s = cache[who];
    if (s) { const ok = await fetch(`${API}/auth/v1/user`, { headers: { apikey: KEY, authorization: "Bearer " + s.access_token } }); if (!ok.ok) s = null; }
    if (!s) s = cache[who] = await login(ACCOUNTS[who]);
    localStorage.setItem("engspace.auth", JSON.stringify(s));
    localStorage.setItem("engspace.persona.v6", JSON.stringify({ ...ACCOUNTS[who].meta, email: ACCOUNTS[who].email }));
    localStorage.setItem("engspace.session.v1", "1");
  };
}, { API, KEY, PW, ACCOUNTS, MAX });
await page.evaluate((ids) => {
  const P = ids.map((id) => ({ hash: `#app/post/${id}` }));
  window.__CRAWL_STARTS = [
    { hash: "#app" }, { hash: "#app/home" }, { hash: "#app/community" }, { hash: "#app/jobs" }, { hash: "#app/market/salaries" }, { hash: "#app/market/companies" },
    { hash: "#app/tools" }, { hash: "#app/inbox" }, { hash: "#app/profile" }, { hash: "#app/notifications" }, { hash: "#app/rooms" }, { hash: "#app/room/tech" },
    { hash: "#app/company/dar" }, ...P,
    { hash: "#app/home", tag: "public-default" }, { hash: "#app/community", tag: "public-default" },
    { hash: "#app/home", tag: "hr" }, { hash: "#app/jobs", tag: "hr" }, { hash: "#app/postjob", tag: "hr" },
    { hash: "#app", account: true, tag: "sign-in" },
  ];
}, ids);
await page.addScriptTag({ path: new URL("./crawl-ui.js", import.meta.url).pathname });
const t0 = Date.now();
while (true) {
  await page.waitForTimeout(5000);
  const r = await page.evaluate(() => { const c = window.__CRAWL; return c && { done: c.done, tests: c.tests, states: c.states, errors: c.errors.length }; });
  if (r && r.done) break;
  if (Date.now() - t0 > 40 * 60e3) { console.log("time limit"); break; }
}
const out = await page.evaluate(() => { const c = window.__CRAWL; return { summary: c.summary, errors: c.errors.slice(0, 30), dead: c.dead.slice(0, 20), noHandler: c.noHandler.slice(0, 20), hook: c.log.filter((l) => /before-hook|unreachable/.test(l)).slice(0, 10) }; });
console.log(JSON.stringify(out, null, 1));
await browser.close();
