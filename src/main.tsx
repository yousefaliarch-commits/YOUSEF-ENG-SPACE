import { createRoot } from "react-dom/client";
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/500.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "@fontsource/ibm-plex-sans-arabic/700.css";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "./styles/app.css";
import { App, ErrorBoundary, installPressFeedback } from "./app/App";
import { initNative } from "./native/native";

installPressFeedback();
const el = document.getElementById("root")!;
let root = null;
const mount = () => { root = createRoot(el); root.render(<ErrorBoundary><App /></ErrorBoundary>); };
// uncaught errors in the first seconds: a web bundle that throws on start must not be confirmed to the live-update plugin (it rolls back)
let startErrors = 0; window.addEventListener("error", () => { startErrors++; });
mount();
initNative();
// Live web updates (native shells only): after the first render, confirm this bundle is healthy, then check for a newer one in the background
setTimeout(() => import("./native/updater").then((u) => {
  if (!u.OTA) return;
  u.startUpdater(() => ({ rootHasContent: !!el.firstElementChild, uncaughtErrors: startErrors, errorScreen: document.body.innerText.includes("حدث خطأ غير متوقع") })).finally(() => u.scheduleChecks());
}).catch(() => {}), 2000);

// Development only (compiled out of production builds): lets the in-page UI crawler (tools/crawl-ui.js) restart the app from a
// clean state on a new deep link without reloading the page
// (`supabase` hands the cloud crawler the live client, so a remount can adopt a fresh test session without a page reload)
if (import.meta.env.DEV) window.__engspaceDev = { mount, unmount: () => { if (root) root.unmount(); root = null; }, supabase: () => import("./backend/client").then((m) => m.supabase()) };

// iOS (Safari and WKWebView) ignores user-scalable=no for accessibility and sends gesture events for a pinch: cancel them.
// A second finger on the screen never zooms either.
if (typeof document !== "undefined") {
  for (const ev of ["gesturestart", "gesturechange", "gestureend"]) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
  document.addEventListener("touchmove", (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
}
