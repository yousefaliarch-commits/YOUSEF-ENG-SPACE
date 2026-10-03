// =====================================================================
//  Inside the iOS / Android apps (Capacitor 8). In a browser every function here is a no-op.
//  · Android back button: closes the open sheet / screen first, then leaves the app (AppView registers the handler).
//  · Auth links (confirm e-mail, reset password) open the app through app.engspace://auth-callback and finish there.
//  · Status bar follows the light / dark mode; the web view draws under it (safe-area insets are already in the CSS).
//  · The splash screen hides once the first screen has painted.
// =====================================================================
import { parseOpenLink } from "../lib/share";
import { Capacitor } from "@capacitor/core";
import { handleAuthUrl } from "../backend/cloud";

export const NATIVE = Capacitor.isNativePlatform();
export const PLATFORM: "ios" | "android" | "web" = Capacitor.getPlatform() as any;

let back: () => boolean = () => false;
let pendingAuth: any = null;
// AppView takes the latest finished auth link once (on mount, and on each engspace:auth event)
export const takePendingAuth = () => { const r = pendingAuth; pendingAuth = null; return r; };
export const setBackHandler = (fn: () => boolean) => { back = fn; };

// a shared link (app.engspace://open/post/<id>) waits here until a signed-in member can be taken to it
let pendingOpen: any = null;
export const setPendingOpen = (o: any) => { pendingOpen = o; };
export const takePendingOpen = () => { const o = pendingOpen; pendingOpen = null; return o; };

// copies text; resolves true only when it really reached the clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); return true; } } catch (e) { /* denied or insecure page: try the old way */ }
  try { const t = document.createElement("textarea"); t.value = text; t.setAttribute("readonly", ""); t.style.cssText = "position:fixed;top:0;opacity:0"; document.body.appendChild(t); t.select(); t.setSelectionRange(0, text.length); const ok = document.execCommand("copy"); t.remove(); return !!ok; } catch (e) { return false; }
}

// The phone's own share sheet (Capacitor Share) → the browser's (navigator.share) → copy the link.
// "cancelled" = the member closed the sheet: nothing to say.
export type ShareResult = "shared" | "copied" | "cancelled" | "failed";
const closed = (e: any) => !!e && (e.name === "AbortError" || /cancel/i.test(String(e.message || e)));
export async function shareContent(c: { title: string; text: string; url: string }): Promise<ShareResult> {
  if (NATIVE) {
    try { const { Share } = await import("@capacitor/share"); const can = await Share.canShare(); if (can.value) { await Share.share({ title: c.title, text: c.text, url: c.url, dialogTitle: c.title }); return "shared"; } }
    catch (e) { if (closed(e)) return "cancelled"; }
  }
  const nav: any = navigator;
  if (typeof nav.share === "function" && (typeof nav.canShare !== "function" || nav.canShare({ title: c.title, text: c.text, url: c.url }))) {
    try { await nav.share({ title: c.title, text: c.text, url: c.url }); return "shared"; } catch (e) { if (closed(e)) return "cancelled"; }
  }
  return (await copyToClipboard(c.url)) ? "copied" : "failed";
}

export async function initNative() {
  if (!NATIVE) return;
  // liquid glass: iPhones always get the live blur; an Android phone only when it has the headroom (8+ cores, 6+ GB) —
  // otherwise the same glass with a denser fill and no backdrop blur, so scrolling stays at the panel's refresh rate
  const nav: any = navigator; const strong = (nav.hardwareConcurrency || 4) >= 8 && (nav.deviceMemory || 4) >= 6;
  if (PLATFORM === "android" && !strong) document.documentElement.dataset.glass = "lite";
  const [{ App }, { SplashScreen }, { StatusBar }] = await Promise.all([import("@capacitor/app"), import("@capacitor/splash-screen"), import("@capacitor/status-bar")]);
  App.addListener("backButton", () => { if (!back()) App.minimizeApp(); });
  // auth links: while the app runs (appUrlOpen) and when the link itself started the app (Android may have closed it while the
  // member was in Google's page). The result waits in pendingAuth until AppView takes it, so it is never lost to timing.
  const finish = async (url?: string) => {
    const open = parseOpenLink(url); if (open) { pendingOpen = open; window.dispatchEvent(new CustomEvent("engspace:open", { detail: open })); return; }
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

// a light tap under the finger when the member changes tab (no-op in a browser)
export function tapHaptic() {
  if (!NATIVE) return;
  import("@capacitor/haptics").then(({ Haptics, ImpactStyle }) => Haptics.impact({ style: ImpactStyle.Light })).catch(() => {});
}
