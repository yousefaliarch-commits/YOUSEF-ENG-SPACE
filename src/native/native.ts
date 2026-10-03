// =====================================================================
//  Inside the iOS / Android apps (Capacitor 8). In a browser every function here is a no-op.
//  · Android back button: closes the open sheet / screen first, then leaves the app (AppView registers the handler).
//  · Auth links (confirm e-mail, reset password) open the app through app.engspace://auth-callback and finish there.
//  · Status bar follows the light / dark mode; the web view draws under it (safe-area insets are already in the CSS).
//  · The splash screen hides once the first screen has painted.
// =====================================================================
import { Capacitor } from "@capacitor/core";
import { handleAuthUrl } from "../backend/cloud";

export const NATIVE = Capacitor.isNativePlatform();
export const PLATFORM: "ios" | "android" | "web" = Capacitor.getPlatform() as any;

let back: () => boolean = () => false;
let pendingAuth: any = null;
// AppView takes the latest finished auth link once (on mount, and on each engspace:auth event)
export const takePendingAuth = () => { const r = pendingAuth; pendingAuth = null; return r; };
export const setBackHandler = (fn: () => boolean) => { back = fn; };

export async function initNative() {
  if (!NATIVE) return;
  const [{ App }, { SplashScreen }, { StatusBar }] = await Promise.all([import("@capacitor/app"), import("@capacitor/splash-screen"), import("@capacitor/status-bar")]);
  App.addListener("backButton", () => { if (!back()) App.minimizeApp(); });
  // auth links: while the app runs (appUrlOpen) and when the link itself started the app (Android may have closed it while the
  // member was in Google's page). The result waits in pendingAuth until AppView takes it, so it is never lost to timing.
  const finish = async (url?: string) => {
    if (!url || !/^app\.engspace:\/\/auth-callback/.test(url)) return;
    let r: any; try { r = await handleAuthUrl(url); } catch (e: any) { r = { error: (e && e.message) || "تعذّر إكمال تسجيل الدخول — أعد المحاولة" }; }
    if (!r) return; pendingAuth = r; window.dispatchEvent(new CustomEvent("engspace:auth", { detail: r }));
  };
  App.addListener("appUrlOpen", ({ url }) => { finish(url); });
  App.getLaunchUrl().then((l) => finish(l && l.url)).catch(() => {});
  try { await StatusBar.setOverlaysWebView({ overlay: true }); } catch (e) { /* iOS always overlays */ }
  requestAnimationFrame(() => setTimeout(() => SplashScreen.hide({ fadeOutDuration: 200 }).catch(() => {}), 50));
}

export async function setNativeMode(mode: "light" | "dark") {
  if (!NATIVE) return;
  const { StatusBar, Style } = await import("@capacitor/status-bar");
  StatusBar.setStyle({ style: mode === "dark" ? Style.Dark : Style.Light }).catch(() => {});
}
