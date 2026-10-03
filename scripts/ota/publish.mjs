// Publishes a built web app (dist/) as a live update — used by the "Publish web update" workflow and by the local / cloud tests.
//   SUPABASE_URL=… SERVICE_KEY=… CHANNEL=preview BUILD_TS=<seconds> [NOTES=…] [DIST=dist] node scripts/ota/publish.mjs
// zips dist (index.html at the zip root), uploads <channel>/<version>.zip, checks the public URL serves exactly those bytes, then
// uploads <channel>/manifest.json. The service key is read from the environment and never printed.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const env = process.env; const base = (env.SUPABASE_URL || "").replace(/\/$/, ""), key = env.SERVICE_KEY || "", channel = env.CHANNEL || "preview";
const dist = resolve(env.DIST || "dist"), ts = Number(env.BUILD_TS) || Math.floor(Date.now() / 1000);
if (!base || !key) { console.error("SUPABASE_URL and SERVICE_KEY are required"); process.exit(1); }
if (!/^[a-z0-9-]{1,32}$/.test(channel)) { console.error("bad channel name"); process.exit(1); }
if (!existsSync(join(dist, "index.html"))) { console.error(`no index.html in ${dist} — build first`); process.exit(1); }
const line = JSON.parse(readFileSync(new URL("../../ota.config.json", import.meta.url), "utf8")).nativeLine;
const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
const version = `${pkg.version}-${ts}`;

const zip = join(mkdtempSync(join(tmpdir(), "ota-")), "bundle.zip");
execFileSync("zip", ["-qr", zip, "."], { cwd: dist });
const listing = execFileSync("unzip", ["-l", zip], { encoding: "utf8" });
if (!/\sindex\.html$/m.test(listing)) { console.error("index.html is not at the zip root"); process.exit(1); }
const bytes = readFileSync(zip); const sha256 = createHash("sha256").update(bytes).digest("hex");
if (statSync(zip).size > 50 * 1024 * 1024) { console.error("bundle is over the 50 MB bucket limit"); process.exit(1); }

const put = async (path, type, body) => {
  const r = await fetch(`${base}/storage/v1/object/app-updates/${path}`, { method: "POST", headers: { authorization: `Bearer ${key}`, apikey: key, "content-type": type, "x-upsert": "true", "cache-control": "max-age=0, no-cache" }, body });
  if (!r.ok) throw new Error(`upload ${path}: ${r.status} ${(await r.text()).slice(0, 200)}`);
};
const url = `${base}/storage/v1/object/public/app-updates/${channel}/${version}.zip`;
await put(`${channel}/${version}.zip`, "application/zip", bytes);
const served = createHash("sha256").update(Buffer.from(await (await fetch(url)).arrayBuffer())).digest("hex");
if (served !== sha256) { console.error("the uploaded bundle does not match its hash"); process.exit(1); }
const manifest = { version, build: ts, nativeLine: line, url, sha256, notes: env.NOTES || "", published: new Date().toISOString() };
await put(`${channel}/manifest.json`, "application/json", JSON.stringify(manifest, null, 1));
console.log(JSON.stringify({ ...manifest, size: bytes.length }));
