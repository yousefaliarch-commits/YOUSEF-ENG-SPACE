// Local development / CI: seed the test accounts into the local Supabase (npx supabase start) with a known local-only password.
//   npm run db:seed            →  test.civil@engspace.test … test.admin@engspace.test, password EngSpace-Local-Test-2026
import { execSync, spawnSync } from "node:child_process";
const st = JSON.parse(execSync("npx supabase status -o json", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
const env = { ...process.env, SEED_API_URL: st.API_URL, SEED_SERVICE_KEY: st.SERVICE_ROLE_KEY || st.SECRET_KEY, SEED_PASSWORD: process.env.SEED_PASSWORD || "EngSpace-Local-Test-2026", SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD || "EngSpace-Local-Admin-2026" };
const r = spawnSync("node", ["scripts/seed/test-accounts.mjs", ...process.argv.slice(2)], { stdio: "inherit", env });
process.exit(r.status ?? 1);
