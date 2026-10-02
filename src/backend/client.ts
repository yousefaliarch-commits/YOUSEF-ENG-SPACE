// The Supabase client, created on first use and loaded as its own chunk, so the demo build never downloads it.
// Inside the iOS / Android apps the session lives in Capacitor Preferences (UserDefaults / SharedPreferences), which
// survives WebView storage clean-ups; in a browser it lives in localStorage, as supabase-js does by default.
import { Capacitor } from "@capacitor/core";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "./config";

const nativeStorage = {
  async getItem(key: string) { const { Preferences } = await import("@capacitor/preferences"); return (await Preferences.get({ key })).value; },
  async setItem(key: string, value: string) { const { Preferences } = await import("@capacitor/preferences"); await Preferences.set({ key, value }); },
  async removeItem(key: string) { const { Preferences } = await import("@capacitor/preferences"); await Preferences.remove({ key }); },
};

let pending: Promise<SupabaseClient> | null = null;

export function supabase(): Promise<SupabaseClient> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return Promise.reject(new Error("EngSpace runs in demo mode: no Supabase project configured"));
  if (!pending) {
    pending = import("@supabase/supabase-js").then(({ createClient }) => createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        storageKey: "engspace.auth",
        storage: Capacitor.isNativePlatform() ? nativeStorage : undefined,
        persistSession: true,
        autoRefreshToken: true,
        // auth links open the app through its URL scheme; the app hands the code over itself (see cloud.ts → handleAuthUrl)
        detectSessionInUrl: !Capacitor.isNativePlatform(),
        flowType: "pkce",
      },
    }));
  }
  return pending;
}
