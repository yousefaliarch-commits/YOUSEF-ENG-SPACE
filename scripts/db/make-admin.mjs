// Local development: make an existing account the platform's first administrator.  npm run db:admin -- you@example.com
// (On the hosted project run `select public.bootstrap_admin('you@example.com');` in the Supabase SQL editor.)
import { execFileSync } from "node:child_process";
const email = process.argv[2]; if (!email) { console.error("usage: npm run db:admin -- <email>"); process.exit(1); }
const out = execFileSync("psql", [process.env.DB_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres", "-XAt", "-v", "ON_ERROR_STOP=1", "-c", `select public.bootstrap_admin('${email.replace(/'/g, "''")}')`], { encoding: "utf8" });
console.log(`${email} is now an administrator (${out.trim()})`);
