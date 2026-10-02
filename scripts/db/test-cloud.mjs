// Runs tests/cloud.integration.test.ts against the local Supabase (`npx supabase start` first).
import { execSync, spawnSync } from "node:child_process";
const st = JSON.parse(execSync("npx supabase status -o json", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
const env = { ...process.env, ENGSPACE_CLOUD_TEST: "1", VITE_SUPABASE_URL: st.API_URL, VITE_SUPABASE_PUBLISHABLE_KEY: st.PUBLISHABLE_KEY || st.ANON_KEY };
const r = spawnSync("npx", ["vitest", "run", "tests/cloud.integration.test.ts"], { stdio: "inherit", env, shell: process.platform === "win32" });
process.exit(r.status ?? 1);
