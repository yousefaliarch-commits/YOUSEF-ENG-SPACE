import type { CapacitorConfig } from "@capacitor/cli";

// The iOS and Android apps wrap the same build as the web app (dist/, relative asset paths — see vite.config.ts).
// Live reload on a phone: CAP_SERVER_URL=http://<this PC's LAN IP>:8770 npx cap run android  (see docs/PHASE2.md → Previewing).
// Without it the app runs the bundled build, as a store build does.
const live = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: "app.engspace",
  appName: "EngSpace",
  webDir: "dist",
  // Arabic-first: the system decides the layout direction from the document (dir="rtl"), the native shell stays neutral
  backgroundColor: "#09090b",
  ...(live ? { server: { url: live, cleartext: true } } : {}),
  android: {
    allowMixedContent: false,
    // debugging the WebView from chrome://inspect only in debug builds
    webContentsDebuggingEnabled: !!live,
  },
  ios: { contentInset: "never", scrollEnabled: false },
  plugins: {
    SplashScreen: { launchAutoHide: false, backgroundColor: "#09090b", showSpinner: false },
    Keyboard: { resize: "native" as any, resizeOnFullScreen: true },
    StatusBar: { overlaysWebView: true },
  },
};

export default config;
