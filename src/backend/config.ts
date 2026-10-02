// =====================================================================
//  Which backend the app runs on
//  · "cloud": Supabase (Frankfurt) — real accounts, shared data, row-level security. Chosen when the build has
//    VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (.env.local for development, CI/app-store builds via their env).
//  · "demo": everything in this browser with the seed data, exactly as in Phase 1 — no network, nothing shared.
//  `?backend=demo` in the address forces the demo on a cloud build (handy for showing the app without an account).
// =====================================================================
const env: any = (import.meta as any).env || {};

export const SUPABASE_URL: string = env.VITE_SUPABASE_URL || "";
export const SUPABASE_KEY: string = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || "";

const forcedDemo = () => { try { return new URLSearchParams(location.search || "").get("backend") === "demo"; } catch (e) { return false; } };

export const BACKEND: "cloud" | "demo" = SUPABASE_URL && SUPABASE_KEY && !forcedDemo() ? "cloud" : "demo";
export const isCloud = () => BACKEND === "cloud";

// where the links in auth e-mails (confirm, reset password) come back to: the native app's scheme, or this page
export const AUTH_REDIRECT_NATIVE = "app.engspace://auth-callback";
