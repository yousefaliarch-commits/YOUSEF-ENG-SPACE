// Continuous dual preview — the laptop browser and the phone show the same build, and both reload on every save.
//   npm run live                 → rebuild on save (vite build --watch) + the read-only phone server on the Wi-Fi
//   npm run live -- --android    → also installs the Android app on the connected phone / emulator, loading from this server
//                                  (needs Android Studio's SDK and USB debugging; the app reloads with the others)
//   npm run live -- --tunnel     → prints the HTTPS tunnel command, for a phone that is not on this Wi-Fi
// Backend: with .env.local pointing at the hosted Supabase project, every device shares the same real data. With the LOCAL
// Supabase (npm run db:start), run `npm run db:env -- --lan` first so the phone reaches it at this PC's address, not 127.0.0.1.
import { spawn, spawnSync } from "node:child_process";
import { networkInterfaces } from "node:os";
import { existsSync } from "node:fs";

const args = process.argv.slice(2);
const win = process.platform === "win32";
const run = (cmd, a, opts = {}) => spawn(cmd, a, { stdio: "inherit", shell: win, ...opts });
const ip = Object.values(networkInterfaces()).flat().find((n) => n && n.family === "IPv4" && !n.internal && !n.address.startsWith("169.254."))?.address;
const PORT = 8770, URL = `http://${ip || "localhost"}:${PORT}`;

// one full build first (vendor files, dictionary), then incremental rebuilds on save
const first = spawnSync("npm", ["run", "build"], { stdio: "inherit", shell: win });
if (first.status !== 0) process.exit(first.status || 1);
const kids = [run("npx", ["vite", "build", "--watch", "--emptyOutDir", "false"]), run("node", ["scripts/phone-server.mjs", "--lan", String(PORT)])];

if (args.includes("--android")) {
  const env = { ...process.env, CAP_SERVER_URL: URL };
  const sync = spawnSync("npx", ["cap", "sync", "android"], { stdio: "inherit", shell: win, env });
  if (sync.status === 0) kids.push(run("npx", ["cap", "run", "android"], { env }));
}

setTimeout(() => {
  console.log(`\n  EngSpace live preview`);
  console.log(`  laptop:  http://localhost:${PORT}/#app      (admin console: http://localhost:${PORT}/#admin)`);
  console.log(`  phone:   ${URL}/#app   — same Wi-Fi; both reload a moment after every save`);
  if (args.includes("--tunnel")) console.log(`  outside this Wi-Fi:  ssh -R 80:localhost:${PORT} nokey@localhost.run   (open the https address it prints)`);
  const env = existsSync(".env.local") ? "cloud (.env.local)" : "demo (no .env.local — everything stays in each browser)";
  console.log(`  backend: ${env}\n`);
}, 1500);

const stop = () => { kids.forEach((k) => { try { k.kill(); } catch (e) {} }); process.exit(0); };
process.on("SIGINT", stop); process.on("SIGTERM", stop);
