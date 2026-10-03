// Page-level globals the app keeps on window: the shared stores (lib/runtime), the i18n debug handle, and the phone preview's
// live-reload hook (set by the local phone server during device testing, absent otherwise), and the development-only remount
// hook the UI crawler uses (src/main.tsx).
export {};
declare global {
  // build stamp injected by vite.config.ts (define)
  const __BUILD__: { version: string; sha: string; run: string; date: string };
  interface Window {
    __LIVE?: any;
    __i18n?: any;
    __engspaceBuildChanged?: () => boolean;
    __engspaceDev?: { mount: () => void; unmount: () => void; supabase?: () => Promise<any> };
  }
}
