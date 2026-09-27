// Read-only server for testing the production build (dist/) on a phone. It serves ONLY files inside dist/ — no directory
// listing, no uploads (GET/HEAD only), no dotfiles, nothing outside dist/ — so it is safe to reach from the Wi-Fi or through
// an HTTPS tunnel. The dev server (npm run dev) is never exposed that way.
//   node scripts/phone-server.mjs              → 127.0.0.1:8770 only (enough for a tunnel: ssh -R 80:localhost:8770 nokey@localhost.run)
//   node scripts/phone-server.mjs --lan        → every interface: a phone on the same Wi-Fi opens http://<this PC's IP>:8770/#app
//   node scripts/phone-server.mjs --lan 8771   → another port
//
// Live sync: every response is no-store, and index.html carries a small watcher (added here, never part of the build) that asks
// /__build for the build stamp every 1.5 s. After `npm run build` the phone reloads itself on the same screen (the route is in
// the URL; account, language and theme are in local storage) — or, while you are typing, shows a "tap to reload" pill.
import { createServer } from "node:http";
import { readFileSync, statSync, realpathSync } from "node:fs";
import { extname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { networkInterfaces } from "node:os";

const DIST = fileURLToPath(new URL("../dist/", import.meta.url));
const args = process.argv.slice(2);
const LAN = args.includes("--lan");
const PORT = Number(args.find((a) => /^\d+$/.test(a)) || 8770);

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon",
  ".woff2": "font/woff2", ".woff": "font/woff", ".wasm": "application/wasm", ".gz": "application/octet-stream", ".txt": "text/plain; charset=utf-8",
};
const COMPRESS = new Set([".html", ".js", ".mjs", ".css", ".json", ".svg", ".txt"]);
const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0", Pragma: "no-cache", Expires: "0", "X-Content-Type-Options": "nosniff" };

const LIVE = `<script>/* phone-server live sync: not part of the app */
(function () {
  var cur = null, busy = false, pending = false, pill = null;
  function typing() { var a = document.activeElement; if (!a) return false; var t = a.tagName; var ed = t === "TEXTAREA" || a.isContentEditable || (t === "INPUT" && /^(text|search|email|password|number|tel|url)$/i.test(a.type || "text")); return ed && ((a.value || a.textContent || "").length > 0); }
  function reload() { try { location.reload(); } catch (e) {} }
  function show() {
    if (pill) return; var en = (document.documentElement.lang || "ar") === "en";
    pill = document.createElement("button"); pill.type = "button"; pill.setAttribute("translate", "no"); pill.dir = en ? "ltr" : "rtl";
    pill.textContent = en ? "New build ready \\u2014 tap to reload" : "\\u062a\\u062d\\u062f\\u064a\\u062b \\u062c\\u062f\\u064a\\u062f \\u062c\\u0627\\u0647\\u0632 \\u2014 \\u0627\\u0636\\u063a\\u0637 \\u0644\\u0625\\u0639\\u0627\\u062f\\u0629 \\u0627\\u0644\\u062a\\u062d\\u0645\\u064a\\u0644";
    pill.style.cssText = "position:fixed;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 10px);z-index:2147483647;padding:10px 16px;border-radius:999px;border:0;background:#7060D2;color:#fff;font:600 13px/1.2 system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.35)";
    pill.onclick = reload; document.body.appendChild(pill);
  }
  function apply() { if (document.hidden) return; if (typing()) show(); else reload(); }
  function check() {
    if (busy) return; busy = true;
    fetch("__build?t=" + Date.now(), { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      busy = false; if (!j || !j.v) return; if (cur == null) { cur = j.v; return; } if (j.v !== cur) { pending = true; apply(); }
    }, function () { busy = false; });
  }
  window.__engspaceBuildChanged = function () { return pending; };
  document.addEventListener("visibilitychange", function () { if (!document.hidden) { if (pending) apply(); else check(); } });
  document.addEventListener("focusout", function () { if (pending) setTimeout(function () { if (!typing()) apply(); }, 300); });
  window.addEventListener("pageshow", function (e) { if (e.persisted) reload(); });
  setInterval(check, 1500); check();
})();
</script>
`;

// the build's version, reported only once dist/index.html has stopped changing (never in the middle of a build)
const stamp = { v: null, raw: null, since: 0 };
function buildStamp() {
  let raw;
  try { const st = statSync(join(DIST, "index.html")); raw = `${st.mtimeMs}-${st.size}`; } catch { return stamp.v; }
  const now = Date.now();
  if (raw !== stamp.raw) { stamp.raw = raw; stamp.since = now; }
  if (stamp.v === null || (raw !== stamp.v && now - stamp.since >= 600)) stamp.v = raw;
  return stamp.v;
}

// a request path → a regular file inside dist/, or null
function resolveFile(urlPath) {
  let p;
  try { p = decodeURIComponent(urlPath); } catch { return null; }
  if (p === "/" || p === "") p = "/index.html";
  if (p.includes("\0") || p.includes("\\") || p.split("/").some((s) => s.startsWith("."))) return null; // no dotfiles, no ../, no \
  try {
    const root = realpathSync(DIST);
    const file = realpathSync(join(root, ...p.split("/").filter(Boolean)));
    if (!file.startsWith(root + sep) || !statSync(file).isFile()) return null;
    return file;
  } catch { return null; }
}

const server = createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405, { Allow: "GET, HEAD", ...NO_STORE }).end(); return; }
  const path = (req.url || "/").split("?")[0].split("#")[0];
  const send = (status, body, type, gz = false) => {
    const headers = { "Content-Type": type, ...NO_STORE };
    if (gz && body.length > 1400 && /\bgzip\b/.test(req.headers["accept-encoding"] || "")) { body = gzipSync(body, { level: 6 }); headers["Content-Encoding"] = "gzip"; headers.Vary = "Accept-Encoding"; }
    headers["Content-Length"] = String(body.length);
    res.writeHead(status, headers); res.end(req.method === "HEAD" ? undefined : body);
  };
  if (path === "/__build") { send(200, Buffer.from(JSON.stringify({ v: buildStamp() })), TYPES[".json"]); return; }
  const file = resolveFile(path);
  if (!file) { send(404, Buffer.from("Not found"), TYPES[".txt"]); return; }
  const ext = extname(file).toLowerCase();
  let body = readFileSync(file);
  if (ext === ".html") { buildStamp(); const s = body.toString("utf8"); const i = s.lastIndexOf("</body>"); body = Buffer.from(i >= 0 ? s.slice(0, i) + LIVE + s.slice(i) : s + LIVE); }
  send(200, body, TYPES[ext] || "application/octet-stream", COMPRESS.has(ext));
  if (!path.startsWith("/assets/")) console.log(`${new Date().toTimeString().slice(0, 8)}  ${req.socket.remoteAddress}  ${req.method} ${path}`);
});

server.listen(PORT, LAN ? "0.0.0.0" : "127.0.0.1", () => {
  // a routable LAN address (skips 169.254.x.x link-local ones, e.g. VPN adapters)
  const ip = Object.values(networkInterfaces()).flat().find((n) => n && n.family === "IPv4" && !n.internal && !n.address.startsWith("169.254."))?.address;
  console.log(`EngSpace phone server — serving dist/ only (read-only, no-store, live sync)`);
  console.log(`  on this PC:     http://localhost:${PORT}/#app`);
  if (LAN) console.log(`  on your phone:  http://${ip || "<this PC's IPv4>"}:${PORT}/#app   (same Wi-Fi)`);
  else console.log(`  for a tunnel:   ssh -R 80:localhost:${PORT} nokey@localhost.run`);
});
