// Interactive crawler for the EngSpace app — runs inside the real page (real React, real DOM) on the dev server (npm run dev):
// paste it into the browser console, or inject it with a browser automation tool, and read window.__CRAWL when .done is true.
// For every start state it soft-resets the app (stores cleared, storage seeded, root remounted on a deep link), then exercises
// EVERY visible interactive element one at a time from a clean state: buttons/links/role widgets are clicked, text fields typed
// into, checkboxes toggled, selects and ranges changed. Each action is judged by: a React handler exists on the element (or its
// label/form), something observable happened (DOM, route, focus/selection, or a recorded side effect such as clipboard/file
// picker/external link), and no console error/warning/exception/unhandled rejection appeared. Actions that open a new context
// (route, sheet, form step) or reveal new controls are replayed and crawled recursively.
// Password inputs are never typed into (policy): they are recorded as skipped. External effects are intercepted, not performed.
(() => {
  if (window.__CRAWL && window.__CRAWL.running) return;
  const R = (window.__CRAWL = { running: true, started: Date.now(), tests: 0, states: 0, results: [], errors: [], dead: [], noHandler: [], skipped: [], missingCss: {}, arabic: {}, lang: window.__CRAWL_LANG || "ar", log: [], done: false });
  // timing runs on MessageChannel ticks, not setTimeout: hidden pages throttle chained timers to once a minute
  const tick = () => new Promise((r) => { const c = new MessageChannel(); c.port1.onmessage = () => { c.port1.close(); r(); }; c.port2.postMessage(0); });
  const sleep = async (ms) => { const t = performance.now() + ms; while (performance.now() < t) await tick(); };
  const root = () => document.getElementById("root");

  // ---- capture every console error/warning, exception and unhandled rejection ----
  let current = "setup";
  const push = (kind, msg) => { const m = String(msg && (msg.stack || msg.message) || msg).slice(0, 400); R.errors.push({ kind, msg: m, during: current }); };
  const oe = console.error.bind(console), ow = console.warn.bind(console);
  console.error = (...a) => { push("console.error", a.map((x) => (x && x.message) || String(x)).join(" ")); oe(...a); };
  console.warn = (...a) => { push("console.warn", a.map(String).join(" ")); ow(...a); };
  window.addEventListener("error", (e) => push("exception", e.error || e.message));
  window.addEventListener("unhandledrejection", (e) => push("unhandledrejection", e.reason));

  // ---- intercept external effects; count them as observable side effects ----
  let effects = 0; const effect = (what) => { effects++; R.log.length < 400 && R.log.push(current + " → " + what); };
  try { navigator.clipboard.writeText = async (v) => { effect("clipboard"); }; } catch (e) {}
  const oclick = HTMLInputElement.prototype.click;
  HTMLInputElement.prototype.click = function () { if (this.type === "file") { effect("file-picker"); return; } return oclick.call(this); };
  window.open = () => { effect("window.open"); return null; };
  // scroll requests are real effects even when a hidden pane freezes smooth scrolling
  const osi = Element.prototype.scrollIntoView; Element.prototype.scrollIntoView = function (...a) { if (current !== "setup" && !/reset/.test(current)) effect("scrollIntoView"); return osi.apply(this, a); };
  const ost = window.scrollTo.bind(window); window.scrollTo = (...a) => { effect("scrollTo"); return ost(...a); };
  try { if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = () => Promise.reject(Object.assign(new Error("camera blocked by crawler"), { name: "NotAllowedError" })); } catch (e) {}
  document.addEventListener("click", (e) => { const a = e.target && e.target.closest && e.target.closest("a[href]"); if (a && /^(mailto:|tel:|https?:)/i.test(a.getAttribute("href"))) { e.preventDefault(); effect("link " + a.getAttribute("href").split(/[?#]/)[0].slice(0, 60)); } }, true);
  const oreload = location.reload.bind(location);

  // ---- state reset: clear stores + storage, seed an account when asked, remount on the start hash ----
  const ACC = { email: "crawler@example.com", salt: "00", hash: "not-a-password-hash", algo: "PBKDF2-SHA256", iter: 1, createdAt: 0 };
  async function reset(start) {
    const L = window.__LIVE; if (!L) throw new Error("no __LIVE");
    // unmount first: a mounted view would re-initialise the cleared stores from its old deep link before the new one mounts
    const dev = window.__engspaceDev; if (!dev) throw new Error("run the crawler on the dev server (npm run dev): it needs window.__engspaceDev");
    try { dev.unmount(); } catch (e) {}
    Object.values(L.stores).forEach((s) => s.reset()); Object.assign(L, { noDemo: false, design: null, panel: null, mirror: true, zoom: "fit", devMode: { ios: "follow", android: "follow" }, draft: null, lastGood: null, log: [], history: [], caret: null, baseTokens: null });
    try { Object.keys(localStorage).filter((k) => k.startsWith("engspace.")).forEach((k) => localStorage.removeItem(k)); } catch (e) {}
    // language chosen and tour seen, so neither the first-launch picker nor the tour covers the crawl (a start may ask for them)
    if (!start.freshLang) localStorage.setItem("engspace.lang", start.lang || R.lang); if (!start.tour) localStorage.setItem("engspace.tour", "done");
    if (start.persona || start.account) localStorage.setItem("engspace.account.v1", JSON.stringify(ACC));
    if (start.persona) { localStorage.setItem("engspace.persona.v6", JSON.stringify(start.persona)); localStorage.setItem("engspace.session.v1", "1"); }
    // optional async hook run before every remount (cloud runs restore the backend session here: the crawl signs out and deletes accounts too)
    if (window.__CRAWL_BEFORE) { try { await window.__CRAWL_BEFORE(start); } catch (e) { R.log.push("before-hook failed: " + e); } }
    history.replaceState(null, "", start.hash); dev.mount(); await settle(window.__CRAWL_SETTLE || 1800);
    if (start.store) { Object.entries(start.store).forEach(([k, v]) => L.stores.app.set(k, v)); await settle(); }
  }
  async function settle(max = 1200, quiet = 80) {
    const t0 = performance.now(); let last = t0; const mo = new MutationObserver(() => { last = performance.now(); }); mo.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
    while (true) { await tick(); const now = performance.now(); if (now - last >= quiet || now - t0 >= max) break; } mo.disconnect();
  }

  // ---- interactive elements, keyed so they can be found again after a reset ----
  const SEL = "button, a[href], [role=button], [role=radio], [role=tab], [role=switch], [role=checkbox], input, select, textarea, summary";
  // inert subtrees (behind an open sheet or modal) are unreachable for people, so they are not "controls" in that state
  const visible = (el) => { if (el.closest("[inert]")) return false; if (el.closest("[aria-hidden=true]") && !el.matches("input,select,textarea")) return false; const r = el.getClientRects(); if (!r.length) return el.type === "file"; const cs = getComputedStyle(el); return cs.visibility !== "hidden" && cs.display !== "none"; };
  const labelOf = (el) => (el.getAttribute("aria-label") || el.getAttribute("title") || (el.matches("input,textarea,select") ? el.getAttribute("placeholder") || el.id || el.name || el.type : "") || el.textContent || el.id || el.type || "").replace(/[\d٠-٩,.%:·×]+/g, "#").replace(/\s+/g, " ").trim().slice(0, 50);
  function elements() {
    const r = root(); if (!r) return []; const seen = {}; const out = [];
    for (const el of r.querySelectorAll(SEL)) {
      if (!visible(el)) continue; if (el.type === "file" || el.type === "hidden") continue;
      const role = el.getAttribute("role") || ""; const base = [el.tagName.toLowerCase(), el.type || "", role, labelOf(el)].join("|"); const n = (seen[base] = (seen[base] || 0) + 1);
      out.push({ el, key: base + "#" + n });
    }
    return out;
  }
  const find = (key) => elements().find((x) => x.key === key);
  const reactProps = (el) => { const k = Object.keys(el).find((x) => x.startsWith("__reactProps")); return k ? el[k] : null; };
  function handled(el) {
    const p = reactProps(el) || {}; if (el.disabled) return true;
    if (el.matches("input,textarea,select")) return !!(p.onChange || p.onInput || p.readOnly || (el.type === "checkbox" && (el.closest("label") && reactProps(el.closest("label"))?.onClick)));
    if (p.onClick || p.onMouseDown || p.onPointerDown) return true;
    if (el.type === "submit") { const f = el.closest("form"); return !!(f && (reactProps(f) || {}).onSubmit); }
    if (el.tagName === "A" && el.getAttribute("href")) return true;
    return false;
  }
  const scrolls = () => { let n = Math.round(window.scrollY || 0); for (const el of document.querySelectorAll(".scroll-area, .overflow-auto, .overflow-y-auto, .overflow-x-auto, .dev-stage")) n += Math.round(el.scrollTop * 3 + el.scrollLeft); return n; };
  const snap = () => { const r = root(); const ae = document.activeElement; return [r ? r.innerHTML.length + ":" + hash(r.innerHTML) : "", location.hash, scrolls(), [...document.documentElement.attributes].map((a) => a.name + "=" + a.value).join(","), effects, ae ? ae.tagName + (ae.id || "") + (ae.selectionStart != null ? ":" + ae.selectionStart + "-" + ae.scrollTop : "") : ""].join("|"); };
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i += 3) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  // context = route pattern (entity ids collapsed: every company page is the same component) + open dialog + the step title of
  // full-screen flows (auth, registration, profile edit, welcome — screens without the tab bar)
  const context = () => { const r = root() || document; const d = [...r.querySelectorAll("[role=dialog]")].map((x) => x.getAttribute("aria-label") || "dialog").join("+"); const full = !r.querySelector('nav[data-tour="tabbar"]'); const h1 = full ? [...r.querySelectorAll("h1")].map((x) => x.textContent.trim().slice(0, 30)).join("/") : ""; return location.hash.replace(/\/(post|company|job|room|chat)\/[^/|]+/, "/$1/*") + "|" + d + "|" + h1; };

  // ---- one action ----
  const nativeSet = (el, v) => { const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : el.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v); };
  function valueFor(el) {
    const t = el.type, im = el.getAttribute("inputmode") || "", ph = el.getAttribute("placeholder") || "";
    if (t === "email" || /@/.test(ph)) return "crawler@example.com";
    if (t === "number" || im === "numeric" || im === "decimal") return /20\d\d/.test(ph) ? "2019" : "29";
    if (t === "tel" || im === "tel") return "01001234567";
    if (t === "search" || im === "search") return "مرتب";
    if (el.tagName === "TEXTAREA") return "نص اختبار من الزاحف الآلي للتحقق من أن الحقل يستجيب ويحدّث الحالة";
    if (el.getAttribute("autocomplete") === "name" || /اسم/.test(ph)) return "منى أحمد الشريف";
    return "اختبار";
  }
  async function act(el) {
    const tag = el.tagName;
    if (tag === "INPUT" && el.type === "password") return { skip: "password — never typed by the crawler (policy)" };
    if (tag === "SELECT") { const opts = [...el.options].filter((o) => !o.disabled); const o = opts.find((x) => x.value !== el.value); if (!o) return { skip: "select with one option" }; nativeSet(el, o.value); el.dispatchEvent(new Event("change", { bubbles: true })); return { expect: () => true }; }
    if (tag === "INPUT" && el.type === "range") { const v = String((Number(el.min || 0) + Number(el.max || 100)) / 2); nativeSet(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); return { expect: () => el.isConnected && el.value === v }; }
    if (tag === "INPUT" && (el.type === "checkbox" || el.type === "radio")) { const before = el.checked; el.click(); return { expect: () => !el.isConnected || el.checked !== before }; }
    if (tag === "TEXTAREA" || (tag === "INPUT" && !["button", "submit", "reset", "image"].includes(el.type))) { const v = valueFor(el); el.focus(); nativeSet(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); return { expect: () => !el.isConnected || el.value !== "" }; }
    el.click(); return { expect: null };
  }

  // ---- the crawl ----
  const PERSONA_HR = { name: "سارة محمود", email: "hr@hassanallam.example", gender: "female", age: 34, gradYear: 2013, role: "hr", verified: true, verifyKind: "company", disc: "civil", track: "site", pos: "senior", gov: "cairo", city: "newcairo", goal: "hire", companyName: "حسن علام للإنشاءات", companyId: "hassanallam", identity: "anon", anon: "c0de", pid: "u-crawl-hr", avatar: null, openToRecruiters: true };
  const PERSONA_PUB = { name: "منى أحمد الشريف", email: "mona@example.com", gender: "female", age: 31, gradYear: 2017, role: "engineer", verified: false, disc: "civil", track: "bim", pos: "senior", gov: "giza", city: "zayed", goal: "raise", identity: "public", anon: "b1e5", pid: "u-crawl-pub", avatar: null, openToRecruiters: true };
  const STARTS = (window.__CRAWL_STARTS || [
    { hash: "#app" }, { hash: "#app/home" }, { hash: "#app/community" }, { hash: "#app/jobs" }, { hash: "#app/market/salaries" }, { hash: "#app/market/companies" }, { hash: "#app/tools" }, { hash: "#app/inbox" },
    { hash: "#app/profile" }, { hash: "#app/notifications" }, { hash: "#app/rooms" }, { hash: "#app/room/tech" }, { hash: "#app/permissions" }, { hash: "#app/cvreview" },
    { hash: "#app/post/p1" }, { hash: "#app/post/p14" }, { hash: "#app/post/p4" }, { hash: "#app/post/p8" }, { hash: "#app/post/p7" }, { hash: "#app/company/dar" }, { hash: "#app/company/hassanallam" }, { hash: "#app/job/j2" }, { hash: "#app/chat/t1" }, { hash: "#app/chat/t2" },
    { hash: "#app/home", persona: PERSONA_PUB, tag: "public-default" }, { hash: "#app/profile", persona: PERSONA_PUB, tag: "public-default" }, { hash: "#app/community", persona: PERSONA_PUB, tag: "public-default" },
    { hash: "#app/home", persona: PERSONA_HR, tag: "hr" }, { hash: "#app/jobs", persona: PERSONA_HR, tag: "hr" }, { hash: "#app/postjob", persona: PERSONA_HR, tag: "hr" }, { hash: "#app/job/j2", persona: PERSONA_HR, tag: "hr" }, { hash: "#app/inbox", persona: PERSONA_HR, tag: "hr" },
    { hash: "#app", account: true, tag: "sign-in" }, { hash: "#app/home", persona: PERSONA_PUB, store: { welcome: true }, tag: "welcome" }, { hash: "#app/home", persona: PERSONA_HR, store: { welcome: true }, tag: "welcome-hr" },
  ]).map((s) => ({ ...s }));
  const MAXD = window.__CRAWL_MAXD || 5, MAX_TESTS = window.__CRAWL_MAX_TESTS || 9000;
  const visited = new Set();
  async function reach(state) { await reset(state.start); for (const step of state.path) { const x = find(step.key); if (!x) return false; current = step.key; await act(x.el); await settle(); } return true; }
  async function crawlState(state) {
    const tr = performance.now(); if (!(await reach(state))) { R.log.push("unreachable " + state.path.map((s) => s.key).join(" > ")); return; } R.reachMs = (R.reachMs || []).concat(Math.round(performance.now() - tr)).slice(-20);
    R.states++; if (!state.path.length) visited.add("ctx:" + context()); const where = state.start.hash + (state.start.tag ? "[" + state.start.tag + "]" : "") + (state.path.length ? " > " + state.path.map((s) => s.key.split("|")[3]).join(" > ") : "");
    const baseKeys = new Set(elements().map((x) => x.key)); let todo = state.only ? [...baseKeys].filter((k) => state.only.has(k)) : [...baseKeys];
    // optional cap per state (__CRAWL_PER_STATE): an even spread over the controls, for quick audits of screens with many similar cards
    const PER = window.__CRAWL_PER_STATE || Infinity; if (todo.length > PER) { const step = todo.length / PER; todo = Array.from({ length: PER }, (_, i) => todo[Math.floor(i * step)]); }
    auditArabic(where);
    // missing-CSS audit for this state
    for (const el of (root() || document).querySelectorAll("[class]")) for (const c of el.classList) if (!CSS_CLASSES.has(c) && !/^lucide/.test(c)) R.missingCss[c] = (R.missingCss[c] || 0) + 1;
    for (let i = 0; i < todo.length; i++) {
      if (R.tests >= MAX_TESTS) return; const key = todo[i]; const tIter = performance.now();
      if (i > 0 && !(await reach(state))) { R.log.push("lost state at " + where); return; }
      const x = find(key); if (!x) { R.skipped.push({ where, key, why: "not found after reset" }); continue; }
      const el = x.el; current = where + " :: " + key; const errBefore = R.errors.length; const tStart = performance.now();
      if (el.disabled || el.getAttribute("aria-disabled") === "true") { R.skipped.push({ where, key, why: "disabled" }); continue; }
      if (!handled(el)) R.noHandler.push({ where, key });
      const ctx0 = context(); const s0 = snap(); const r = await act(el); if (r.skip) { R.skipped.push({ where, key, why: r.skip }); continue; }
      await settle(); R.tests++; auditArabic(where + " > " + key.split("|")[3]);
      let s1 = snap(); if (s1 === s0 && !(r.expect && r.expect())) { await sleep(1500); await settle(); s1 = snap(); } // async handlers (canvas, file reads) get a second look
      const changed = s0 !== s1; const ok = r.expect ? r.expect() || changed : changed;
      const selected = el.getAttribute("aria-pressed") === "true" || el.getAttribute("aria-checked") === "true" || el.getAttribute("aria-selected") === "true" || el.getAttribute("aria-current") === "page";
      const errs = R.errors.slice(errBefore);
      const ms = Math.round(performance.now() - tIter); R.results.push({ where, key, ok, changed, errs: errs.length, ms }); if (ms > 1500) (R.slow = R.slow || []).push({ where, key, ms });
      if (!ok && !selected) R.dead.push({ where, key });
      // recurse into what this action opened: a new context, or new controls in the same context
      // optional focus (__CRAWL_FOLLOW, a RegExp on the control's label): from a start state, only follow what it names — for audits of one flow
      if (changed && state.path.length < MAXD && (!window.__CRAWL_FOLLOW || state.path.length > 0 || window.__CRAWL_FOLLOW.test(key.split("|")[3] || ""))) {
        const ctx1 = context(); const now = elements().map((y) => y.key); const fresh = now.filter((k) => !baseKeys.has(k));
        const sig = ctx1 !== ctx0 ? "ctx:" + ctx1 : fresh.length ? "new:" + ctx1 + ":" + fresh.map((k) => k.split("#")[0]).sort().join(",").slice(0, 600) : null;
        if (sig && !visited.has(sig)) { visited.add(sig); queue.push({ start: state.start, path: [...state.path, { key }], only: ctx1 !== ctx0 ? null : new Set(fresh) }); }
      }
      if (R.tests % 25 === 0) report(false);
    }
  }
  const AR = /[ء-ي]/; const AR_SKIP = 'script,style,textarea,code,pre,[translate="no"]';
  function auditArabic(where) {
    if (R.lang !== "en" || document.documentElement.lang !== "en") return; /* a crawl step may switch to Arabic on purpose */ const r = root(); if (!r) return; const seen = new Set();
    const add = (t, kind) => { t = t.replace(/\s+/g, " ").trim().slice(0, 160); if (!t || seen.has(t)) return; seen.add(t); const e = R.arabic[t] || (R.arabic[t] = { n: 0, kind, where }); e.n++; };
    const tw = document.createTreeWalker(r, 4); let n; while ((n = tw.nextNode())) if (AR.test(n.nodeValue) && n.parentElement && !n.parentElement.closest(AR_SKIP) && visible(n.parentElement)) add(n.parentElement.textContent, "text");
    for (const el of r.querySelectorAll("[placeholder],[aria-label],[title],[alt]")) { if (el.closest(AR_SKIP)) continue; for (const a of ["placeholder", "aria-label", "title", "alt"]) { const v = el.getAttribute(a); if (v && AR.test(v)) add(v, a); } }
  }
  let CSS_CLASSES = new Set();
  function cssClasses() { const out = new Set(); const walk = (rules) => { for (const r of rules) { if (r.selectorText) { const m = r.selectorText.match(/\.((?:\\.|[^\s.,:>+~()\[\]#*])+)/g) || []; m.forEach((x) => out.add(x.slice(1).replace(/\\(.)/g, "$1"))); } if (r.cssRules) walk(r.cssRules); } }; for (const s of document.styleSheets) { try { walk(s.cssRules); } catch (e) {} } return out; }
  const queue = [];
  // the results stay on window.__CRAWL (report.summary is a JSON digest without the per-action list)
  function report(final) { R.done = final; R.summary = { tests: R.tests, states: R.states, errors: R.errors.length, dead: R.dead.length, noHandler: R.noHandler.length, skipped: R.skipped.length, okCount: R.results.filter((x) => x.ok).length, queue: queue.length, secs: Math.round((Date.now() - R.started) / 1000) }; }
  (async () => {
    try {
      CSS_CLASSES = cssClasses();
      for (const start of STARTS) queue.push({ start, path: [] });
      while (queue.length && R.tests < MAX_TESTS) { const st = queue.shift(); try { await crawlState(st); } catch (e) { push("crawler", e); } }
    } finally { R.running = false; current = "done"; try { await reset({ hash: "#app/home" }); } catch (e) {} report(true); }
  })();
})();
